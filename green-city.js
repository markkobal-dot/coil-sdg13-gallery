import { createExperience, glyph } from './green-city-experience.js?v=e6351edf41';
let experience=null;
/* New Terra: city tools, simulation clock, local saves and responsive game UI. */
const C=globalThis.GreenCity, A=globalThis.GreenCityArt;
const root=document.querySelector('.green-city-section');
const $=id=>document.getElementById(id==='game-sound'?id:'gc-'+id);
const shell=$('shell'), storageKey='coil-green-city-v2';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=n=>Math.round(n).toLocaleString('en-GB');
let state=C.fresh(),undo=[],redo=[],saved=true,restored=false,saveWarning='',world=null,worldPromise=null,fallback=false;
let selected='tree',category='Nature',mode='inspect',focus=168,source=null,lineStart=null,tab='city',playing=false,speed=1,timer=null,pending=null;
try{
  const raw=localStorage.getItem(storageKey);
  if(raw){const data=JSON.parse(raw);state=C.restore(data.state||data);restored=true;for(const item of (data.undo||[]).slice(-16)){try{undo.push(C.restore(item));}catch{}}}
}catch{saveWarning='The saved expanded city could not be read. A fresh city is ready; the earlier game’s save is untouched.';}
let analysis=C.analyse(state);
function announce(text){$('message').textContent=text;experience?.toast();}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({state,undo:undo.slice(-16)}));saved=true;}catch{saved=false;}}
function icon(type){return `<svg viewBox="-38 -92 76 114" aria-hidden="true" focusable="false">${A.piece(type,C.upgrades[type]?.site==='roof'?'building':C.upgrades[type]?.site==='road'?'road':'land',1)}</svg>`;}
function setPanel(panel){shell.dataset.panel=shell.dataset.panel===panel&&panel!=='none'?'none':panel;root.querySelectorAll('.gc-mobile-panels [data-gc-panel], .gc-panel-toggles [data-gc-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gcPanel===shell.dataset.panel)));if(['city','goals','help'].includes(panel))setTab(panel);}
function setTab(value){tab=value;for(const name of ['city','goals','help']){$('tab-'+name).hidden=name!==tab;root.querySelector(`[data-gc-tab="${name}"]`).setAttribute('aria-pressed',String(name===tab));}}
function meta(){return C.upgrades[selected];}
function renderCatalogue(){
  const query=$('search').value.trim().toLowerCase(),active=document.activeElement?.dataset?.upgrade;
  const entries=Object.entries(C.upgrades).filter(([,item])=>query?(item.name+' '+item.description+' '+item.category).toLowerCase().includes(query):item.category===category);
  $('catalogue').innerHTML=entries.length?entries.map(([type,item])=>{
    const locked=item.unlock&&analysis.tier<item.unlock;
    return `<button type="button" class="gc-building-card${selected===type?' is-selected':''}${state.cash<item.cost?' gc-unaffordable':''}${locked?' gc-locked':''}" data-upgrade="${type}" aria-pressed="${selected===type}" title="${escape(item.description)}"><span class="gc-building-art">${icon(type)}</span><span class="gc-building-name">${item.name}<small>${locked?'MONTH 3 / 35 POINTS':item.site==='roof'?'ROOFTOP RETROFIT':item.site==='road'?'ROAD UPGRADE':item.road?'NEEDS ROAD ACCESS':'OPEN LAND'}</small></span><strong>${item.cost}<small>EP</small></strong></button>`;
  }).join(''):'<p class="gc-no-results">No buildings match. Try “park”, “energy” or “homes”.</p>';
  if(active)$('catalogue').querySelector(`[data-upgrade="${active}"]`)?.focus({preventScroll:true});
  root.querySelectorAll('[data-gc-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gcCategory===category)));
  $('selected-name').textContent=meta().name;$('selected-description').textContent=meta().description;
  $('selected-effects').innerHTML=`<span>${escape(meta().effect)}</span><span>${meta().upkeep} EP upkeep / month</span>`;
  $('tier').textContent=analysis.tier===2?'CITY LEVEL 2 / ALL TOOLS UNLOCKED':'CITY LEVEL 1 / STARTING OUT';$('tier').nextElementSibling.hidden=analysis.tier===2;
}
function actionInfo(){
  const cell=state.cells[focus];
  if(mode==='build')return {label:'Build · '+meta().cost+' EP',error:C.canPlace(state,selected,focus,analysis)};
  if(mode==='upgrade')return {label:cell?'Upgrade · '+C.upgradeCost(cell)+' EP':'Select a building',error:!cell?'Choose a building to upgrade.':cell.level>=3?'Maximum level reached.':['road','factory','coal'].includes(cell.type)?'Use the build catalogue to retrofit this tile.':state.cash<C.upgradeCost(cell)?'Not enough Eco Points.':''};
  if(mode==='demolish')return {label:cell?'Remove · +'+Math.floor(cell.paid*.5)+' EP':'Select a building',error:cell?'':'Select an occupied tile.'};
  if(mode==='move')return {label:source===null?'Choose building':'Move · '+C.moveCost(state.cells[source])+' EP',error:source===null?(!cell?'Choose a building.':C.roadTypes.has(cell.type)?'Roads cannot be relocated.':''):C.relocate(state,source,focus).error};
  if(mode==='road'){
    if(lineStart===null)return {label:'Start road path',error:C.terrain[focus]==='water'?'Choose land.':state.cells[focus]&&!C.roadTypes.has(state.cells[focus].type)?'Start on clear land or an existing road.':''};
    const route=C.line(lineStart,focus),cost=route.filter(i=>!state.cells[i]).length*C.upgrades.road.cost;
    return {label:'Build route · '+cost+' EP',error:C.buildLine(state,lineStart,focus).error};
  }
  return {label:'Inspect '+C.label(focus),error:''};
}
function renderSelection(){
  const item=actionInfo(),labels={inspect:'Inspect city',build:meta().name,road:lineStart===null?'Road path · pick start':'Road path · pick end',upgrade:'Upgrade to next level',move:source===null?'Relocate a building':'Choose its new plot',demolish:'Remove & salvage'};
  const symbols={inspect:'↖',build:'＋',road:'⌁',upgrade:'↥',move:'✥',demolish:'⌫'};
  $('current-icon').innerHTML=mode==='build'?icon(selected):glyph(mode);$('current-tool').textContent=labels[mode];
  $('build').textContent=item.label;$('build').disabled=!!item.error;$('build').title=item.error||'Apply the tool at '+C.label(focus);
  $('row').value=String(Math.floor(focus/20));$('col').value=String(focus%20);
  root.querySelectorAll('[data-gc-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gcTool===mode)));
  world?.setTool(mode,selected,focus,source,lineStart);
  renderInspector();
}
function renderInspector(){
  const info=C.tileInfo(state,focus,analysis),cell=info.cell;
  $('inspector').innerHTML=`<div class="gc-inspector-heading"><span class="gc-overline">SELECTED / ${info.label}</span><h4>${info.name}</h4>${cell?`<span class="gc-level">LEVEL ${cell.level}${cell.roof?' · '+escape(C.upgrades[cell.roof].name):''}</span>`:''}</div><p>${cell?escape(C.types[cell.type].description||'An improvement in your city.'):C.terrain[focus]==='water'?'The waterfront is protected. Plan your city around it.':'A place for your next idea. Choose a building from the catalogue.'}</p>${C.terrain[focus]==='land'?`<div class="gc-tile-facts"><span>${info.linked?'● Connected to main roads':'○ No connected road nearby'}</span><span>Local heat exposure: ${info.heat}/100</span><span>Transit coverage: ${info.transit}/100</span></div>`:''}${cell?`<div class="gc-inspector-actions"><button type="button" data-gc-inspect="upgrade" ${['road','factory','coal'].includes(cell.type)||cell.level>=3?'disabled':''}>Upgrade</button><button type="button" data-gc-inspect="move" ${C.roadTypes.has(cell.type)?'disabled':''}>Move</button><button type="button" data-gc-inspect="demolish">Remove</button>${cell.roof?'<button type="button" data-gc-inspect="roof">Remove roof retrofit</button>':''}</div>`:''}`;
}
function renderGoals(){
  const challenge=C.challenges[state.challenge];$('mission-name').textContent=challenge.name;$('mission-detail').textContent=challenge.detail;
  $('mission-progress').innerHTML=C.goals(state,analysis).map(goal=>{
    const done=goal.lower?goal.value<=goal.target:goal.value>=goal.target,progress=Math.min(100,goal.lower?(100-goal.value)/(100-goal.target)*100:goal.value/goal.target*100);
    return `<div class="gc-goal${done?' gc-goal-done':''}"><div><span>${done?'✓ ':''}${goal.name}</span><strong>${format(goal.value)} / ${goal.lower?'≤':''}${format(goal.target)}</strong></div><i><span style="width:${Math.max(0,progress)}%"></span></i></div>`;
  }).join('');
  $('mission-status').textContent=state.challenge==='sandbox'?'Creative mode · build at your own pace':analysis.completed?'✓ Mission completed':'Mission in progress';
  $('mission-status').classList.toggle('gc-mission-complete',analysis.completed);
  $('grants').innerHTML=C.grantDefs.filter(g=>state.challenge!=='sandbox'||g.id!=='mission').map(g=>`<div class="gc-grant${state.grants.includes(g.id)?' gc-grant-earned':''}"><span>${state.grants.includes(g.id)?'✓':'○'}</span><div><strong>${g.name}</strong><small>${g.detail}</small></div><b>+${format(g.reward)}<small>EP</small></b></div>`).join('');
  $('journal').innerHTML=state.log.slice(0,8).map(text=>`<li>${escape(text)}</li>`).join('');
  const next=C.grantDefs.find(g=>!state.grants.includes(g.id)&&(state.challenge!=='sandbox'||g.id!=='mission'));
  $('milestone').textContent=next?next.detail+' → +'+format(next.reward)+' EP':'All development grants earned. Keep shaping your city.';
}
function renderEvent(){
  const event=state.event&&C.events[state.event.type];$('event').hidden=!event;if(!event)return;
  $('event').innerHTML='<span class="gc-overline">CITY COUNCIL</span><h4>'+event.name+'</h4>'+(state.event.choice?'<strong class="gc-event-answered">✓ Council decision recorded</strong>':'<p>Your council needs a decision. Review the costs and forecast before choosing a response.</p><button type="button" data-gc-review-council>Review decision ↗</button>');
}
function minimap(){
  const canvas=$('minimap'),ctx=canvas.getContext('2d');ctx.fillStyle='#79a6a5';ctx.fillRect(0,0,120,120);
  state.cells.forEach((cell,i)=>{const x=i%20*6,y=Math.floor(i/20)*6;if(C.terrain[i]==='water')return;ctx.fillStyle=cell?C.roadTypes.has(cell.type)?'#e2ddc2':C.greenTypes.has(cell.type)?'#4e825d':['factory','coal'].includes(cell.type)?'#9d7963':cell.roof==='solar'?'#376a7f':'#e7cfa6':'#a7b98b';ctx.fillRect(x+.25,y+.25,5.5,5.5);});
  ctx.strokeStyle='#fff1b6';ctx.lineWidth=1.5;ctx.strokeRect(focus%20*6+.5,Math.floor(focus/20)*6+.5,5,5);
}
function render(){
  analysis=C.analyse(state);
  $('budget').innerHTML=format(state.cash)+' <small>EP</small>';$('balance').textContent=(analysis.net>=0?'+':'')+format(analysis.net)+' EP / month';$('balance').classList.toggle('gc-negative',analysis.net<0);
  $('population').textContent=format(state.population);$('capacity').textContent=format(analysis.capacity)+' housing capacity';
  $('date').textContent='Month '+state.month;$('season').textContent=['Spring','Summer','Autumn','Winter'][Math.floor((state.month-1)%12/3)]+' / Year '+(Math.floor((state.month-1)/12)+1);
  $('challenge').value=state.challenge;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
  $('overall').innerHTML=analysis.overall+'<small>/100</small>';$('rating').textContent=analysis.overall>=75?'A greener future':analysis.overall>=45?'A city in transition':analysis.overall>=25?'Change is taking root':'A new beginning';
  C.metrics.forEach((_,i)=>{$('metric-value-'+i).textContent=analysis.scores[i]+'/100';$('meter-'+i).setAttribute('aria-valuenow',analysis.scores[i]);$('meter-'+i).firstElementChild.style.width=analysis.scores[i]+'%';});
  $('wellbeing').textContent=analysis.wellbeing+'/100';$('employment').textContent=analysis.employment+'%';$('power').textContent=analysis.cleanPower+' / '+analysis.demand+' units';$('income').textContent=format(analysis.income)+' EP';$('expenses').textContent=format(analysis.expenses)+' EP';

  const history=[...state.history.map(h=>h.score),analysis.overall],points=history.map((s,i)=>(i/(Math.max(1,history.length-1))*220).toFixed(1)+','+(33-s*.3).toFixed(1)).join(' ');
  $('sparkline').innerHTML=`<path d="M0 35 ${history.map((s,i)=>'L'+(i/Math.max(1,history.length-1)*220).toFixed(1)+' '+(33-s*.3).toFixed(1)).join(' ')} L220 35Z" fill="#accf8c1c"/><polyline points="${points}" fill="none" stroke="#b7ce98" stroke-width="1.6"/>`;
  $('save-status').textContent=saved?'Saved automatically on this device':'Saving unavailable. Export a city save before closing.';
  renderCatalogue();renderSelection();renderGoals();renderEvent();minimap();world?.setState(state,analysis);if(fallback)renderFallback();renderClock();experience?.render();
}
function commit(result){
  if(result.error){announce(result.error);return false;}
  const awarded=C.grant(result.state);undo.push(state);undo=undo.slice(-28);redo=[];state=awarded.state;save();render();
  announce(result.notice+(awarded.rewards.length?' Development grant +'+format(awarded.rewards.reduce((sum,g)=>sum+g.reward,0))+' EP!':''));
  return true;
}
function choose(type){selected=type;category=C.upgrades[type].category;mode='build';source=null;lineStart=null;renderCatalogue();renderSelection();if(innerWidth<=1000)shell.dataset.panel='none';$('onboarding').hidden=true;announce(meta().name+' selected. '+meta().description);}
function setMode(next){mode=next;source=null;lineStart=null;$('onboarding').hidden=true;renderSelection();announce({inspect:'Select a tile to inspect its building and local conditions.',build:meta().name+' selected. Choose a suitable plot.',road:'Choose the start of your road route, then its end. The full cost is shown before you build.',upgrade:'Select a building to upgrade. Each improvement has up to three levels.',move:'Select the building you want to relocate.',demolish:'Select an improvement to remove. You receive 50% salvage; Undo can reverse the action.'}[mode]);}
function selectTile(i,apply=true){
  focus=i;renderSelection();minimap();if(!apply)return;
  if(mode==='inspect'){if((innerWidth<=1000||shell.classList.contains('gc-expanded'))&&shell.dataset.panel!=='city')setPanel('city');return;}
  if(mode==='build'){commit(C.place(state,selected,i));return;}
  if(mode==='upgrade'){commit(C.upgrade(state,i));return;}
  if(mode==='demolish'){commit(C.demolish(state,i));return;}
  if(mode==='move'){
    if(source===null){if(!state.cells[i]||C.roadTypes.has(state.cells[i].type)){announce('Choose a building or green-space improvement. Roads cannot be moved.');return;}source=i;renderSelection();announce('Now choose an empty plot. Relocation costs '+C.moveCost(state.cells[i])+' EP.');}
    else if(commit(C.relocate(state,source,i))){source=null;renderSelection();}return;
  }
  if(mode==='road'){
    if(lineStart===null){if(C.terrain[i]==='water'||(state.cells[i]&&!C.roadTypes.has(state.cells[i].type))){announce('Start your route on clear land or an existing road.');return;}lineStart=i;renderSelection();announce('Road start: '+C.label(i)+'. Select an end tile to build the complete route.');}
    else if(commit(C.buildLine(state,lineStart,i))){lineStart=null;renderSelection();}
  }
}
function undoAction(){if(!undo.length)return;redo.push(state);state=undo.pop();source=null;lineStart=null;save();render();announce('Last city action undone. Budget and city state restored.');}
function redoAction(){if(!redo.length)return;undo.push(state);state=redo.pop();source=null;lineStart=null;save();render();announce('City action restored.');}
function step(){if(state.event&&!state.event.choice){playing=false;syncClock();experience?.openDecision();return;}source=null;lineStart=null;if(commit(C.advance(state))&&state.event&&!state.event.choice){playing=false;syncClock();experience?.openDecision();}}
function hasOverlay(){return ['results','confirm','finance','decision','commands'].some(name=>$(name)?.open);}
function visibleGame(){return document.body.dataset.view==='game'&&!document.hidden;}
function renderClock(){const running=playing&&visibleGame()&&!hasOverlay();$('play').innerHTML=glyph(playing?'pause':'play');$('play').setAttribute('aria-pressed',String(playing));$('play').setAttribute('aria-label',playing?'Pause the monthly simulation':'Run the monthly simulation');$('speed').textContent=speed+'×';$('city-status').innerHTML='<i></i> CITY SIMULATION '+(running?'RUNNING':'PAUSED');$('city-status').classList.toggle('gc-running',running);}
function syncClock(){clearInterval(timer);timer=null;if(playing&&visibleGame()&&!hasOverlay())timer=setInterval(step,12000/speed);renderClock();}
function confirmAction(title,text,action){pending=action;$('confirm-title').textContent=title;$('confirm-message').textContent=text;$('confirm').showModal();syncClock();}
function reset(challenge){experience?.closeOverlays();playing=false;syncClock();state=C.fresh(challenge);undo=[];redo=[];selected='tree';category='Nature';mode='inspect';focus=168;source=null;lineStart=null;$('search').value='';$('onboarding').hidden=false;save();render();world?.resetView();announce('A new city is ready. '+C.challenges[challenge].goal);}
function download(name,blob){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function evaluate(){
  const a=analysis,goals=C.goals(state,a),completed=goals.filter(g=>g.lower?g.value<=g.target:g.value>=g.target).length;
  $('results-title').textContent=a.completed?'Green City Master':a.overall>=60?'A city with a future':a.overall>=30?'Your transition is taking shape':'Your first city plan';$('result-score').innerHTML=a.overall+'<span>/100</span>';
  $('result-message').textContent=(a.completed?'Mission completed. ':state.challenge==='sandbox'?'Creative mode. ':completed+' of '+goals.length+' mission goals reached. ')+format(state.population)+' residents call New Terra home. Wellbeing is '+a.wellbeing+'/100, with a '+(a.net>=0?'positive':'negative')+' monthly operating balance of '+format(a.net)+' EP.';
  const awards=[['Urban Nature Designer',a.scores[2]>=70],['Clean Energy Expert',a.scores[1]>=75],['Sustainable Travel Champion',a.scores[3]>=65],['Climate Action Hero',a.completed]];
  $('achievements').innerHTML=awards.map(([name,earned])=>`<div class="${earned?'gc-award-earned':''}"><span>${earned?'✓':'○'}</span><span>${name}<small>${earned?'Achievement earned':'Keep developing your city'}</small></span></div>`).join('');
  const lowest=a.scores.indexOf(Math.min(...a.scores));
  const advice=['Replace polluting industry gradually, protect homes with trees, and reduce fossil energy dependence. Keep enough clean jobs for your residents.','Add solar roofs or wind power. Track demand as your population grows; batteries help renewable power go further.','Bring green space close to residents. A park beside homes improves wellbeing more than a remote decorative plot.','Serve homes with connected bus and tram stops, then link bike lanes into a network. The transit overlay reveals gaps.','Prepare for extreme weather with rain gardens near water, green roofs, water recycling and dependable local power.'][lowest];
  $('advice').innerHTML='<h4>Your next planning decision</h4><p>'+advice+'</p><p class="gc-report-note">Game indicators and financial rules are simplified learning mechanics, not real-world emissions, costs or climate predictions.</p>';
  $('results').showModal();syncClock();
}
async function initWorld(){
  if(world){world.setActive(visibleGame());return;}if(worldPromise||!visibleGame()||fallback)return;
  worldPromise=import('./green-city-world.js?v=6ed4c61023').then(({CityWorld})=>{
    world=new CityWorld($('board'),{onSelect:i=>selectTile(i),onHover:i=>{if(i<0)return;const cell=state.cells[i];$('hover').textContent=C.label(i)+' / '+(cell?C.types[cell.type].name:C.terrain[i]==='water'?'Protected waterfront':'Open land');},onError:announce});
    world.setState(state,analysis);world.setTool(mode,selected,focus,source,lineStart);world.setActive(visibleGame());$('loading').hidden=true;
  }).catch(()=>{fallback=true;$('loading').hidden=true;$('board').hidden=true;$('fallback').hidden=false;renderFallback();announce('3D graphics are unavailable in this browser. The planning grid is ready; all city tools and simulation features still work.');});
}
function renderFallback(){
  $('fallback').innerHTML='<p>Planning grid · 3D unavailable in this browser</p><div>'+state.cells.map((cell,i)=>`<button type="button" data-cell="${i}" title="${C.label(i)} · ${cell?C.types[cell.type].name:C.terrain[i]}" aria-label="Tile ${C.label(i)}, ${cell?C.types[cell.type].name:C.terrain[i]}" class="gc-grid-${C.terrain[i]==='water'?'water':cell?C.roadTypes.has(cell.type)?'road':C.greenTypes.has(cell.type)?'green':'building':'land'}${i===focus?' gc-grid-focus':''}">${cell?cell.roof==='solar'?'▧':C.roadTypes.has(cell.type)?'·':C.greenTypes.has(cell.type)?'♧':'▥':''}</button>`).join('')+'</div>';
}
// Interface bindings.
$('metrics').innerHTML=C.metrics.map((name,i)=>`<div class="gc-metric"><div><span>${name}</span><strong id="gc-metric-value-${i}"></strong></div><div id="gc-meter-${i}" class="gc-meter" role="progressbar" aria-label="${name}" aria-valuemin="0" aria-valuemax="100"><span></span></div></div>`).join('');
$('row').innerHTML=Array.from({length:20},(_,i)=>`<option value="${i}">${String.fromCharCode(65+i)}</option>`).join('');$('col').innerHTML=Array.from({length:20},(_,i)=>`<option value="${i}">${i+1}</option>`).join('');
$('catalogue').addEventListener('click',e=>{const button=e.target.closest('[data-upgrade]');if(button)choose(button.dataset.upgrade);});
$('search').addEventListener('input',renderCatalogue);
root.querySelectorAll('[data-gc-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.gcCategory;$('search').value='';renderCatalogue();}));
root.querySelectorAll('[data-gc-tool]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.gcTool);if(b.dataset.gcTool==='build'&&(innerWidth<=1000||shell.classList.contains('gc-expanded')))setPanel('build');}));
root.querySelectorAll('[data-gc-panel]').forEach(b=>b.addEventListener('click',()=>setPanel(b.dataset.gcPanel)));
root.querySelectorAll('[data-gc-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.gcTab)));
$('open-build').addEventListener('click',()=>{if(innerWidth<=1000||shell.classList.contains('gc-expanded'))setPanel('build');else{$('search').focus();}});
$('build').addEventListener('click',()=>selectTile(focus));$('undo').addEventListener('click',undoAction);$('redo').addEventListener('click',redoAction);
$('row').addEventListener('change',()=>selectTile(Number($('row').value)*20+focus%20,false));$('col').addEventListener('change',()=>selectTile(Math.floor(focus/20)*20+Number($('col').value),false));$('focus').addEventListener('click',()=>world?.focusCell(focus));
$('fallback').addEventListener('click',e=>{const button=e.target.closest('[data-cell]');if(button)selectTile(Number(button.dataset.cell));});
$('board').addEventListener('keydown',e=>{const dirs={ArrowUp:-20,ArrowDown:20,ArrowLeft:-1,ArrowRight:1};if(e.key in dirs){e.preventDefault();const row=Math.floor(focus/20),col=focus%20;const next=e.key==='ArrowUp'?Math.max(0,row-1)*20+col:e.key==='ArrowDown'?Math.min(19,row+1)*20+col:e.key==='ArrowLeft'?row*20+Math.max(0,col-1):row*20+Math.min(19,col+1);selectTile(next,false);announce('Selected '+C.label(focus)+'. '+(actionInfo().error||'Ready to use '+mode+'.'));}else if(e.key==='Enter'||e.key===' '){e.preventDefault();selectTile(focus);}});
$('inspector').addEventListener('click',e=>{const button=e.target.closest('[data-gc-inspect]');if(!button)return;const action=button.dataset.gcInspect;if(action==='roof')commit(C.demolish(state,focus,true));else{setMode(action);if(action==='move'){source=focus;renderSelection();announce('Choose the new plot. Relocation costs '+C.moveCost(state.cells[source])+' EP.');}else selectTile(focus);}});
$('event').addEventListener('click',e=>{if(e.target.closest('[data-gc-review-council]'))experience?.openDecision();});
$('next').addEventListener('click',step);$('play').addEventListener('click',()=>{if(!playing&&state.event&&!state.event.choice){experience?.openDecision();return;}playing=!playing;syncClock();});$('speed').addEventListener('click',()=>{speed=speed===1?3:1;syncClock();});
$('reset').addEventListener('click',()=>confirmAction('Start a new city?','This replaces the expanded city saved on this device. Export a save first if you want to keep this city.',()=>reset(state.challenge)));
$('challenge').addEventListener('change',()=>{const next=$('challenge').value;$('challenge').value=state.challenge;confirmAction('Start '+C.challenges[next].name+'?','Your current city will be replaced. Its earlier 6 × 6 save is kept separately. Export the expanded city first to keep it.',()=>reset(next));});
$('confirm-start').addEventListener('click',()=>{const action=pending;pending=null;$('confirm').close();action?.();});$('confirm-cancel').addEventListener('click',()=>{$('confirm').close();pending=null;});$('confirm').addEventListener('cancel',()=>pending=null);
for(const name of ['confirm','results'])$(name).addEventListener('close',syncClock);
$('evaluate').addEventListener('click',evaluate);$('continue').addEventListener('click',()=>$('results').close());$('results-close').addEventListener('click',()=>$('results').close());
$('export').addEventListener('click',()=>download('new-terra-month-'+state.month+'.json',new Blob([JSON.stringify({game:'New Terra',state},null,2)],{type:'application/json'})));
$('import').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>2000000)throw new Error('File too large');const raw=JSON.parse(await file.text()),city=C.restore(raw.state||raw);confirmAction('Open this city save?','This replaces the expanded city on this device. Your current city can be exported before you open another.',()=>{playing=false;state=city;undo=[];redo=[];mode='inspect';source=null;lineStart=null;syncClock();save();render();announce('City save opened successfully.');});}catch{announce('That file is not a valid expanded city save. Your current city is unchanged.');}$('import-file').value='';});
$('photo').addEventListener('click',()=>{if(!world){announce('City photos are available once the 3D view is ready.');return;}const link=document.createElement('a');link.download='new-terra-month-'+state.month+'.png';link.href=world.photo();link.click();});
function setExpanded(value){return experience?.setExpanded(value);}
$('expand').addEventListener('click',()=>setExpanded(!shell.classList.contains('gc-expanded')));
root.querySelectorAll('[data-gc-camera]').forEach(button=>button.addEventListener('click',()=>{if(!world)return;const action=button.dataset.gcCamera;if(action==='zoom-in')world.zoomBy(1.25);if(action==='zoom-out')world.zoomBy(.8);if(action==='rotate-left')world.rotateBy(-1);if(action==='rotate-right')world.rotateBy(1);if(action==='reset')world.resetView();if(action==='night'){button.setAttribute('aria-pressed',String(world.toggleNight()));}if(action==='grid')button.setAttribute('aria-pressed',String(world.toggleGrid()));}));
$('overlay').addEventListener('change',()=>{const value=$('overlay').value;world?.setOverlay(value);$('overlay-legend').hidden=value==='city';$('overlay-name').textContent=$('overlay').selectedOptions[0].textContent;$('overlay-scale').textContent=value==='power'?'Imported grid power → Local clean supply':'Needs attention → Better prepared';});
$('minimap').addEventListener('click',event=>{const rect=$('minimap').getBoundingClientRect(),col=Math.min(19,Math.floor((event.clientX-rect.left)/rect.width*20)),row=Math.min(19,Math.floor((event.clientY-rect.top)/rect.height*20));selectTile(row*20+col,false);world?.focusCell(focus);});$('minimap').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();world?.focusCell(focus);}});
$('dismiss-tutorial').addEventListener('click',()=>{$('onboarding').hidden=true;try{localStorage.setItem('coil-green-city-guide-dismissed','1');}catch{}});
try{$('onboarding').hidden=restored||localStorage.getItem('coil-green-city-guide-dismissed')==='1';}catch{}
// Local music remains opt-in and stops when the game or document is hidden.
const music=new Audio('assets/audio/climate-mission.wav');music.id='gc-music';music.hidden=true;music.loop=true;music.preload='none';music.volume=.32;root.append(music);
let musicEnabled=false,musicToken=0;
function syncMusic(){const token=++musicToken;if(!musicEnabled||!visibleGame()){music.pause();return;}music.play().catch(()=>{if(token!==musicToken)return;musicEnabled=false;$('game-sound').textContent='Music off';$('game-sound').setAttribute('aria-pressed','false');announce('Music is unavailable in this browser. You can continue building.');});}
$('game-sound').addEventListener('click',()=>{musicEnabled=!musicEnabled;$('game-sound').textContent=musicEnabled?'Music on':'Music off';$('game-sound').setAttribute('aria-pressed',String(musicEnabled));syncMusic();});
function syncView(){if(document.body.dataset.view!=='game'){experience?.closeOverlays();if($('results').open)$('results').close();if($('confirm').open)$('confirm').close();if(shell.classList.contains('gc-expanded'))setExpanded(false);}world?.setActive(visibleGame());syncClock();syncMusic();if(visibleGame())initWorld();}
window.addEventListener('app:view',syncView);document.addEventListener('visibilitychange',syncView);window.addEventListener('pagehide',()=>{music.pause();clearInterval(timer);world?.setActive(false);});
document.addEventListener('keydown',e=>{if(!visibleGame()||hasOverlay()||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){source=null;lineStart=null;shell.dataset.panel='none';if(shell.classList.contains('gc-expanded'))setExpanded(false);renderSelection();return;}if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redoAction():undoAction();}if(e.key.toLowerCase()==='y'){e.preventDefault();redoAction();}return;}const tools={i:'inspect',b:'build',r:'road',u:'upgrade',m:'move',x:'demolish'};if(tools[e.key.toLowerCase()]){e.preventDefault();setMode(tools[e.key.toLowerCase()]);}});
// Compact SVG teaser keeps the rest of the website lightweight; 3D loads only in the game.
const preview=document.getElementById('gc-preview');if(preview){const cells=Array(36).fill(null),terrain=Array.from({length:36},(_,i)=>Math.floor(i/6)===2||i%6===3?'road':[0,1,4,5,6,10,24,25,28,30,34,35].includes(i)?'building':'land');[[2,'park'],[7,'tree'],[8,'wind'],[11,'park'],[26,'park'],[29,'tree'],[1,'solar'],[4,'roof'],[28,'solar'],[13,'bus'],[15,'bike'],[21,'tram']].forEach(([i,type])=>cells[i]=type);preview.innerHTML=A.city(cells,terrain,-1,[],-1,false);}
experience=createExperience({getState:()=>state,getAnalysis:()=>analysis,commit,announce,setMode,choose,setPanel,openPanel:panel=>{if(shell.dataset.panel!==panel)setPanel(panel);},syncClock,hasOverlay,confirmAction,evaluate,step,undo:undoAction,redo:redoAction,resize:()=>world?.resize()});
render();announce(saveWarning||(restored?'Welcome back, Mayor. Your expanded city and recent undo history are ready.':'Welcome to New Terra. Explore your island, choose your first improvements, then advance a month.'));syncView();
