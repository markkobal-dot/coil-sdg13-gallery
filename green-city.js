let monthly=null;
import { createDevelopment, createMonthlyReport } from './green-city-development-ui.js?v=73edb1c3fb';
let development=null;
import { createExperience, glyph } from './green-city-experience.js?v=73071ee085';
import { createPlanning } from './green-city-planning-ui.js?v=4770b4ce7c';
import { createIntroduction } from './green-city-intro-ui.js?v=243a564fa4';
let experience=null;
let planning=null;
let introduction=null;
/* New Terra: city tools, simulation clock, local saves and responsive game UI. */
const C=globalThis.GreenCity, A=globalThis.GreenCityArt;
const root=document.querySelector('.green-city-section');
const $=id=>document.getElementById(id==='game-sound'?id:'gc-'+id);
const shell=$('shell'), storageKey='coil-green-city-v3';
function showWelcome(show){
  $('onboarding').hidden=!show;
  $('world-wrap').inert=show;
}
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=n=>Math.round(n).toLocaleString('en-GB');
const money=n=>n.toLocaleString('en-GB',{maximumFractionDigits:2});
let state=C.fresh(),undo=[],redo=[],saved=true,restored=false,saveWarning='',world=null,worldPromise=null,fallback=false;
let viewSettings={cycle:true,night:false};try{const savedView=JSON.parse(localStorage.getItem('coil-green-city-lighting'));if(typeof savedView?.cycle==='boolean')viewSettings.cycle=savedView.cycle;if(typeof savedView?.night==='boolean')viewSettings.night=savedView.night;}catch{}
function saveLighting(){try{localStorage.setItem('coil-green-city-lighting',JSON.stringify(viewSettings));}catch{}}
function renderDaylight({label,hour,night,enabled}){$('day-cycle').checked=enabled;$('day-clock').textContent=(enabled?label+' · '+String(hour).padStart(2,'0')+':00':night?'Night · Held':'Day · Held');const button=root.querySelector('[data-gc-camera=night]');button.setAttribute('aria-pressed',String(night));button.title='Switch to '+(night?'day':'night')+' and hold lighting';planning?.refreshDaily();}
let rotation=0;
let selected='tree',category='Nature',mode='inspect',focus=8*C.size+8,source=null,lineStart=null,tab='city',playing=false,speed=1,timer=null,pending=null;
let buildDraft=null,drawPrevious=null;
const cancelPlan=document.createElement('button');cancelPlan.type='button';cancelPlan.id='gc-cancel-plan';cancelPlan.textContent='Cancel';cancelPlan.title='Cancel this plan (Escape)';cancelPlan.hidden=true;$('placement').append(cancelPlan);
cancelPlan.addEventListener('click',()=>cancelBuildPlan());
function discardBuildDraft(){world?.cancelStroke?.(false);buildDraft=null;drawPrevious=null;lineStart=null;world?.setBuildDraft(null);}
function cancelBuildPlan(){discardBuildDraft();renderSelection();syncClock();announce('Plan cancelled. No Eco Points spent.');}
function confirmBuildDraft(){
 if(!buildDraft?.locked)return false;
 const result=C.buildTiles(state,buildDraft.type,buildDraft.cells);
 if(result.error){renderSelection();announce(result.error);return false;}
 discardBuildDraft();const built=commit(result);syncClock();return built;
}
function drawPlan(action){
 if(action.phase==='cancel'){
  if(drawPrevious){({draft:buildDraft,start:lineStart,focus}=drawPrevious);drawPrevious=null;renderSelection();syncClock();}return;
 }
 if(!drawPrevious)drawPrevious={draft:buildDraft,start:lineStart,focus};
 buildDraft={type:action.type,cells:action.cells,locked:action.phase==='ready'};
 if(action.type==='road')lineStart=action.cells[0];focus=action.cells.at(-1);
 if(action.phase==='ready'){drawPrevious=null;renderSelection();const r=C.planTiles(state,action.type,action.cells);announce(r.error||r.added.length+' new '+(action.type==='road'?'road tiles':'tree plots')+' · '+r.cost+' EP. Review the plan and choose Build to confirm.');}
 else {renderBuildDraft(C.planTiles(state,action.type,action.cells),false);}
 syncClock();
}
function renderBuildDraft(report,locked){
 world?.setBuildDraft(report);cancelPlan.hidden=!report&&lineStart===null;
 if(!report)return;
 const name=report.type==='road'?'Road':'Tree',hint=$('placement'),starting=report.type==='road'&&!buildDraft&&report.cells.length===1&&!report.blocked.length;hint.hidden=false;hint.dataset.valid=String(starting||!report.error);
 $('placement-title').textContent=starting?'Road start at '+C.label(report.cells[0]):name+' plan · '+report.added.length+' new · '+format(report.cost)+' EP';
 $('placement-detail').textContent=report.existing.length+' existing · '+report.blocked.length+' blocked. '+(starting?'Choose an endpoint or drag to extend your route.':report.error|| (locked?'Nothing purchased. Confirm Build or cancel.':'Release or select the endpoint to review.'))+' Green: new · Blue: existing · Red: blocked.';
 if(buildDraft){$('build').textContent=locked?'Build '+report.added.length+' '+(report.type==='road'?'roads':'tree plots')+' · '+format(report.cost)+' EP':'Release to review · '+format(report.cost)+' EP';$('build').disabled=!!report.error||!locked;$('build').title=report.error||'Confirm this complete plan';}
}
try{
  const raw=localStorage.getItem(storageKey)||localStorage.getItem('coil-green-city-v2');
  if(raw){const data=JSON.parse(raw);state=C.restore(data.state||data);restored=true;for(const item of (data.undo||[]).slice(-16)){try{undo.push(C.restore(item));}catch{}}}
}catch{saveWarning='The saved expanded city could not be read. A fresh city is ready; the earlier game’s save is untouched.';}
let analysis=C.analyse(state);
function announce(text){$('message').textContent=text;experience?.toast();}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({state,undo:undo.slice(-16)}));saved=true;}catch{saved=false;}}
function icon(type){return A.thumbnail(type);}
function setPanel(panel){shell.dataset.panel=shell.dataset.panel===panel&&panel!=='none'?'none':panel;root.querySelectorAll('.gc-mobile-panels [data-gc-panel], .gc-panel-toggles [data-gc-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gcPanel===shell.dataset.panel)));if(['city','goals','help'].includes(panel))setTab(panel);}
function setTab(value){tab=value;for(const name of ['city','goals','help']){$('tab-'+name).hidden=name!==tab;root.querySelector(`[data-gc-tab="${name}"]`).setAttribute('aria-pressed',String(name===tab));}}
function meta(){return C.upgrades[selected];}
function renderCatalogue(){
  const query=$('search').value.trim().toLowerCase(),active=document.activeElement?.dataset?.upgrade;
  const entries=Object.entries(C.upgrades).filter(([,item])=>query?(item.name+' '+item.description+' '+item.category).toLowerCase().includes(query):item.category===category);
  $('catalogue').innerHTML=entries.length?entries.map(([type,item])=>{
    const prerequisite=state.challenge!=='sandbox'&&(item.tourismPrerequisite==='gateway'&&!analysis.tourism.gateways.length?'PASSENGER CONNECTION REQUIRED':item.tourismPrerequisite==='beach'&&!analysis.tourism.beaches?'BUILD A PUBLIC BEACH FIRST':'');const locked=item.unlock&&analysis.tier<item.unlock||prerequisite;
    return `<button type="button" class="gc-building-card${selected===type?' is-selected':''}${state.cash<item.cost?' gc-unaffordable':''}${locked?' gc-locked':''}" data-upgrade="${type}" aria-pressed="${selected===type}" title="${escape(item.description)}"><span class="gc-building-art">${icon(type)}</span><span class="gc-building-name">${item.name}<small>${prerequisite||((item.unlock&&analysis.tier<item.unlock)?'CITY LEVEL '+item.unlock:'')|| (item.site==='roof'?'ROOFTOP RETROFIT':item.site==='road'?'ROAD UPGRADE':item.coast?'COASTAL · '+(item.footprint||[1,1]).join(' × '):item.footprint?item.footprint.join(' × ')+' PLOTS':item.road?'ROAD ACCESS':'OPEN LAND')}</small></span><span class="gc-building-facts"><small>${money(item.upkeep)} EP / month</small><strong>${money(item.cost)}<small>EP</small></strong></span></button>`;
  }).join(''):'<p class="gc-no-results">No buildings match. Try “park”, “energy” or “homes”.</p>';
  if(active)$('catalogue').querySelector(`[data-upgrade="${active}"]`)?.focus({preventScroll:true});
  root.querySelectorAll('[data-gc-category]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.gcCategory===category));const name={Nature:'Nature','Clean energy':'Energy',Transport:'Travel',Community:'Community'}[b.dataset.gcCategory],count=Object.values(C.upgrades).filter(item=>item.category===b.dataset.gcCategory).length;b.innerHTML=name+' <span class="gc-category-count">'+count+'</span>';});
  $('selected-name').textContent=meta().name;$('selected-description').textContent=meta().description;
  $('selected-effects').innerHTML=`<span>${escape(meta().effect)}</span><span>${money(meta().upkeep)} EP base upkeep / month</span>`;
  $('tier').textContent='CITY LEVEL '+analysis.tier+' / '+C.developmentLevels[analysis.tier-1].name.toUpperCase();$('tier').nextElementSibling.hidden=analysis.tier===4;$('tier').nextElementSibling.textContent=C.developmentLevels[analysis.tier]?.detail||'';
}
function actionInfo(){
  const cell=state.cells[focus];
  if(buildDraft){const r=C.planTiles(state,buildDraft.type,buildDraft.cells);return {label:'Build '+r.added.length+' plots · '+format(r.cost)+' EP',error:r.error};}
  if(mode==='land')return {label:'Create land · '+format(C.reclamationCost)+' EP',error:C.canReclaim(state,focus,analysis)};
  if(mode==='build')return {label:'Build at '+C.label(focus)+' · '+meta().cost+' EP',error:C.canPlace(state,selected,focus,analysis,rotation)};
  if(mode==='upgrade')return {label:cell?'Upgrade · '+C.upgradeCost(cell)+' EP':'Select a building',error:!cell?'Choose a building to upgrade.':cell.level>=3?'Maximum level reached.':['road','factory','coal'].includes(cell.type)?'Use the build catalogue to retrofit this tile.':state.cash<C.upgradeCost(cell)?'Not enough Eco Points.':''};
  if(mode==='demolish')return {label:cell?'Remove · +'+Math.floor(cell.paid*.5)+' EP':'Select a building',error:cell?'':'Select an occupied tile.'};
  if(mode==='move')return {label:source===null?'Choose building':'Move · '+C.moveCost(state.cells[source])+' EP',error:source===null?(!cell?'Choose a building.':C.roadTypes.has(cell.type)?'Roads cannot be relocated.':''):C.relocate(state,source,focus,rotation).error};
  if(mode==='road'){
    if(lineStart===null)return {label:'Start road path',error:C.terrainAt(state,focus)==='water'?'Choose land.':state.cells[focus]&&!C.roadTypes.has(state.cells[focus].type)?'Start on clear land or an existing road.':''};
    const r=C.planTiles(state,'road',C.line(lineStart,focus));
    return {label:'Preview route · '+format(r.cost)+' EP',error:r.error};
  }
  return {label:'Inspect '+C.label(focus),error:''};
}
function renderSelection(){
  const item=actionInfo(),labels={land:'Build new land',inspect:'Inspect city',build:meta().name,road:lineStart===null?'Road path · pick start':'Road path · pick end',upgrade:'Upgrade to next level',move:source===null?'Relocate a building':'Choose its new plot',demolish:'Remove & salvage'};
  const symbols={inspect:'↖',build:'＋',road:'⌁',upgrade:'↥',move:'✥',demolish:'⌫'};
  $('current-icon').innerHTML=mode==='build'?icon(selected):glyph(mode);$('current-tool').textContent=labels[mode];
  $('build').textContent=item.label;$('build').disabled=!!item.error;$('build').title=item.error||'Apply the tool at '+C.label(focus);
  $('row').value=String(Math.floor(focus/C.size));$('col').value=String(focus%C.size);
  root.querySelectorAll('[data-gc-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gcTool===mode)));
  world?.setTool(mode,selected,focus,source,lineStart,rotation);
  const painting=mode==='road'||mode==='build'&&selected==='tree';
  root.querySelector('.gc-world-caption>span').textContent=painting?'Drag to plan · Middle-drag to pan · Scroll to zoom':'Drag to pan · Scroll to zoom · Right-drag to orbit';
  $('board').setAttribute('aria-label',painting?'Interactive 3D city. Drag to plan '+(mode==='road'?'roads':'street trees')+'. Middle-drag to pan, right-drag to orbit; use two fingers to pan and zoom. Arrow keys select tiles; Enter previews or confirms the plan. Escape cancels without spending points.':'Interactive 3D city. Drag to pan, scroll or pinch to zoom, right-drag to orbit. Arrow keys select tiles, Enter applies the selected tool. Q and E rotate buildings and road improvements. Escape cancels a route or move.');
  renderPlacement(focus);
  renderInspector();
}
function renderPlacement(i){
  const plan=buildDraft?C.planTiles(state,buildDraft.type,buildDraft.cells):mode==='road'&&lineStart!==null?C.planTiles(state,'road',C.line(lineStart,i>=0?i:focus)):null;
  planning?.preview(buildDraft?.locked?{mode:'batch',type:buildDraft.type,cells:buildDraft.cells,i:focus}:mode==='road'||buildDraft?{mode:'inspect'}:{mode,type:selected,i:i>=0?i:focus,rotation,source,start:lineStart});
  if(plan){renderBuildDraft(plan,!!buildDraft?.locked);return;}world?.setBuildDraft(null);cancelPlan.hidden=lineStart===null;
  const type=mode==='build'?selected:mode==='move'&&source!==null?state.cells[source]?.type:mode==='inspect'&&C.upgrades[state.cells[focus]?.type]?.site==='road'?state.cells[focus].type:null;
  $('rotate').hidden=!type||!C.rotatable(type);
  $('rotate').textContent='↻ '+((mode==='inspect'?state.cells[focus]?.rotation||0:rotation)*90)+'°';
  const hint=$('placement');hint.hidden=!['build','move','road','land'].includes(mode);
  if(hint.hidden)return;
  i=i>=0?i:focus;
  const error=mode==='land'?C.canReclaim(state,i,analysis):mode==='build'?C.canPlace(state,selected,i,analysis,rotation):mode==='move'&&source!==null?C.relocate(state,source,i,rotation).error:mode==='road'&&lineStart!==null?C.buildLine(state,lineStart,i).error:'';
  hint.dataset.valid=String(!error);
  const [w,h]=C.dimensions(type,rotation);
  $('placement-title').textContent=error?'Choose another plot':mode==='land'?'New land · 1 tile':type?C.types[type].name+' · '+w+' × '+h:mode==='move'?'Choose a building to move':'Plan your route';
  $('placement-detail').textContent=error|| (mode==='land'?'Ready at '+C.label(i)+' · '+format(C.reclamationCost)+' EP. Select a water tile touching your owned shoreline.':type==='tree'?'Click or drag to plan tree plots. Middle-drag pans; right-drag orbits. Confirm the total with Build.':type?'Ready at '+C.label(i)+' · '+(mode==='build'?C.types[type].cost:C.moveCost(state.cells[source]))+' EP'+(C.rotatable(type)?' · Q / E to rotate':''):mode==='move'?'Select an existing building, then choose its new location.':lineStart===null?'Drag a road route, or select a start and endpoint. Middle-drag pans; right-drag orbits.':'Select the endpoint to review the complete price.');
}
function rotateBuilding(direction=1){
  if(mode==='inspect'&&C.upgrades[state.cells[focus]?.type]?.site==='road'){commit(C.rotateRoadItem(state,focus,direction));return;}
  const type=mode==='build'?selected:mode==='move'&&source!==null?state.cells[source]?.type:null;
  if(!C.rotatable(type))return;
  rotation=(rotation+direction+4)%4;renderSelection();announce(C.types[type].name+' rotated to '+rotation*90+' degrees.');
}
function homeFeedbackMarkup(report){
 if(!report)return '';
 const issueBody=issue=>'<p>'+escape(issue.evidence)+'</p><p class="gc-home-fix">'+escape(issue.fix)+'</p><button type="button" data-gc-home-fix="'+issue.id+'">'+escape(issue.action.label)+' ↗</button>';
 const issues=report.issues.map((issue,n)=>'<li data-home-issue="'+issue.id+'">'+(n?'<details><summary>'+escape(issue.title)+'</summary><span class="gc-home-scope">'+(issue.scope==='city'?'Across the city':'At this home')+'</span>'+issueBody(issue)+'</details>':'<span class="gc-home-scope">'+(issue.scope==='city'?'Across the city':'At this home')+'</span><h6>'+escape(issue.title)+'</h6>'+issueBody(issue))+'</li>').join('');
 return '<section class="gc-home-feedback" aria-label="Home happiness and next steps"><header><div><span class="gc-overline">HOME '+C.label(report.i)+' · '+(report.occupied?'LOCAL HAPPINESS':'FUTURE RESIDENTS')+'</span><h5>'+report.mood+'</h5></div><strong>'+report.happiness+'<small>/100</small></strong></header><meter min="0" max="100" value="'+report.happiness+'" aria-label="Local happiness">'+report.happiness+'/100</meter>'+(report.issues.length?'<p class="gc-home-start">Start here</p><ol>'+issues+'</ol>':'<p class="gc-home-clear">No major problems flagged. Keep services accessible as the city grows.</p>')+(report.strengths.length?'<p class="gc-home-strengths"><b>Working well</b> '+report.strengths.map(escape).join(' · ')+'</p>':'')+'</section>';
}
function actOnHomeIssue(id){
 const report=globalThis.GreenCityPlanning.homeReport(C,state,analysis,focus),issue=report?.issues.find(x=>x.id===id);if(!issue)return;
 const action=issue.action;
 if(action.kind==='finance'){experience?.openFinance();return;}
 if(action.kind==='decision'){experience?.openDecision();return;}
 if(action.kind==='transport'){experience?.openTransport();return;}
 if(action.kind==='neighbourhood'){experience?.openNeighbourhood(focus);return;}
 if(action.kind==='inspect'){setMode('inspect');selectTile(action.target);world?.focusCell(action.target);$('overlay').value=action.overlay;$('overlay').dispatchEvent(new Event('change'));announce(issue.fix);return;}
 if(action.kind==='upgrade'){setMode('upgrade');selectTile(action.target,false);world?.focusCell(action.target);announce('Review the upgrade at '+C.label(action.target)+' · '+C.upgradeCost(state.cells[action.target])+' EP. Confirm Upgrade to apply it.');return;}
 if(action.kind==='road'){setMode('road');world?.focusCell(focus);if(innerWidth<=1000)setPanel('none');return;}
 if(action.kind==='build'){choose(action.type);if(shell.dataset.panel!=='build')setPanel('build');return;}
 const home=focus,plan=C.neighbourhoodInfo(state,home,analysis,action.metric)?.priorities.find(x=>x.id===action.metric)?.action;
 if(plan?.kind==='build'){choose(plan.type);selectTile(plan.target,false);world?.focusCell(plan.target);announce(C.upgrades[plan.type].name+' planned near '+C.label(home)+' at '+C.label(plan.target)+' · '+plan.cost+' EP. '+(plan.affordable?'Review the forecast, then confirm Build.':'Save more Eco Points before building.'));}
 else if(plan?.kind==='inspect'){setMode('inspect');selectTile(plan.target);world?.focusCell(plan.target);}
 else if(plan?.kind==='transport')experience?.openTransport();
 else {experience?.openNeighbourhood(home);announce('No suitable nearby plot found. Review the neighbourhood to make space for an improvement.');}
}
function renderInspector(){
  const care=globalThis.GreenCityPlanning.healthcare(C,state,analysis,focus),business=globalThis.GreenCityPlanning.business(C,state,analysis,focus);
  const regional=globalThis.GreenCityLife?.regionalOperations(C,state,analysis,{only:focus})?.[0];
  const home=analysis.homeProfiles.find(h=>h.i===focus),workplace=analysis.workplaces.find(w=>w.i===focus);
  const beach=analysis.beachAccess.beaches.find(b=>b.i===focus),bar=analysis.beachAccess.bars.find(b=>b.i===focus),parking=analysis.beachAccess.parking.find(p=>p.i===focus);
  const info=C.tileInfo(state,focus,analysis),cell=info.cell,unowned=C.terrainAt(state,focus)==='land'&&!C.ownsLand(state,focus);if(unowned)info.name='Unpurchased district';
  $('inspector').innerHTML=`<div class="gc-inspector-heading"><span class="gc-overline">SELECTED / ${info.label}</span><h4>${info.name}</h4>${unowned?'<button type="button" data-gc-inspect="land">Development &amp; land ↗</button>':''}${cell?`<span class="gc-level">LEVEL ${cell.level}${C.rotatable(cell.type)?' · '+C.dimensions(cell.type,cell.rotation).join(' × ')+' · '+(cell.rotation||0)*90+'°':''}${cell.roof?' · '+escape(C.upgrades[cell.roof].name):''}</span>`:''}</div><p>${cell?escape(C.types[cell.type].description||'An improvement in your city.'):C.terrainAt(state,focus)==='water'?'Create land beside your owned shoreline, then extend roads and build on it.':unowned?'Purchase this district through Development & land before building.':'A place for your next idea. Choose a building from the catalogue.'}</p>${home?homeFeedbackMarkup(globalThis.GreenCityPlanning.homeReport(C,state,analysis,focus)):''}${C.terrainAt(state,focus)==='water'?`<button type="button" data-gc-inspect="reclaim">Build land here · ${format(C.reclamationCost)} EP ↗</button>`:''}${C.terrainAt(state,focus)==='land'?`<div class="gc-tile-facts"><span>${beach||bar?'Road access not required':info.linked?'● Connected to main roads':'○ No connected road nearby'}</span><span>Noise exposure: ${info.noise}/100</span><span>Local heat exposure: ${info.heat}/100</span><span>Transit coverage: ${info.transit}/100</span>${C.roadTypes.has(cell?.type)?`<span>Commute load: ${info.traffic} / ${cell.type==='bike'?22:18} · Congestion ${info.congestion}%</span>`:''}</div>`:''}${beach?`<div class="gc-facility-reach"><strong>${beach.accessible?'Foot access · '+beach.walkingDistance+' tile'+(beach.walkingDistance===1?'':'s'):'No walking access yet'}</strong><span>${beach.accessible?'Visitors can reach this beach across public land.':'Keep a clear route within six tiles of a connected road or parking lot.'}</span><span>${beach.parking.length} nearby parking lot${beach.parking.length===1?'':'s'}</span></div>`:''}${bar?`<div class="gc-facility-reach"><strong>${bar.accessible?bar.beach!==null?'Foot access via public beach':'Foot access from the road':'No walking access yet'}</strong><span>${bar.beach!==null?'Connected to the beach at '+C.label(bar.beach)+'.':'Keep a clear walking route to an accessible beach within six tiles.'}</span><span>No water frontage required.</span></div>`:''}${parking?`<div class="gc-facility-reach"><strong><span data-gc-parked="${parking.i}">${world?.life?.counts.parking[parking.i]||0}</span> / ${parking.capacity} spaces occupied</strong><span>${parking.connected?'Road connected':'Reconnect a road to open this lot'} · ${parking.beaches.length} beach${parking.beaches.length===1?'':'es'} within walking reach</span><span>Residents leave their cars here and walk to the shore.</span></div>`:''}${regional?`<section class="gc-facility-reach"><strong>${regional.kind==='air'?'Flight operations':'Dock operations'}</strong><span data-gc-regional="${regional.i}">${escape(world?.life?.counts.regional?.[regional.i]||(regional.active?'Services ready':regional.issue))}</span><span>${regional.filled} staff · ${regional.customers} ${regional.kind==='air'||regional.type==='ferry'?'passenger trips':regional.type==='marina'?'visitors':'freight loads'} / month</span></section>`:''}${home?`<div class="gc-building-occupancy"><header><span>RESIDENTS</span><strong>${home.residents} / ${home.capacity}</strong></header><progress max="${home.capacity}" value="${home.residents}" aria-label="Home occupancy">${home.residents} of ${home.capacity}</progress><p>${home.housingDemand>=65?'High':home.housingDemand>=40?'Steady':'Low'} housing demand · Local happiness ${home.localHappiness}/100</p><small>Next month: +${home.moveIns} move-ins · −${home.moveOuts} move-outs at current conditions.</small></div>`:''}${business?`<section class="gc-business-report" aria-label="Building operations"><header><strong>Building operations</strong><span>${escape(business.status)}</span></header><div class="gc-building-occupancy"><header><span>FILLED JOBS</span><strong>${business.filled} / ${business.positions}</strong></header><progress max="${business.positions||1}" value="${business.filled}" aria-label="Workplace occupancy">${business.filled} of ${business.positions}</progress><p>${business.vacancies} vacancies · ${business.staffing}% staffed</p>${business.roles.length?'<small>'+business.roles.map(escape).join(' · ')+'</small>':''}</div><h5>City budget / month</h5><dl><div><dt>Business tax</dt><dd>+${format(business.tax)} EP</dd></div>${business.visitor?`<div><dt>${business.visitor.rooms?business.visitor.guests+' / '+business.visitor.rooms+' guests':business.visitor.customers+' customers'}</dt><dd>+${format(business.visitor.revenue)} EP</dd></div>`:''}${business.utilisation!==null?`<div><dt>Connection income · ${business.utilisation}% used</dt><dd>+${format(business.regionalIncome)} EP</dd></div>`:''}<div><dt>Building &amp; roof maintenance</dt><dd>−${format(business.maintenance)} EP</dd></div><div class="gc-business-net"><dt>Direct contribution</dt><dd>${business.contribution>=0?'+':''}${format(business.contribution)} EP</dd></div></dl><small>Electricity, transport lines and shared city costs are in the overall budget.</small><button type="button" data-gc-inspect="finance">Open city budget ↗</button></section>`:''}${care?`<div class="gc-facility-reach"><strong>${care.radius}-tile healthcare reach</strong><span>${care.homes} home plots in range · ${care.linked?'Road connected':'Reconnect a road to restore care'}</span></div>`:''}${info.local?`<div class="gc-local-residents"><strong>THIS NEIGHBOURHOOD</strong><span>Healthcare ${info.local.health}/100 · Emergency cover ${info.local.safety}/100</span><span>Journey congestion ${info.local.commute}% · ${info.local.routeRiders||0} named-line riders</span><span>Services ${info.local.services}/100 · Shade ${info.local.shade}/100</span><button type="button" data-gc-inspect="neighbourhood">All local needs · Local feedback ↗</button></div>`:''}${cell?`<div class="gc-inspector-actions">${C.upgrades[cell.type]?.site==='road'?'<button type="button" data-gc-inspect="rotate">Rotate ↻</button>':''}<button type="button" data-gc-inspect="upgrade" ${['road','factory','coal'].includes(cell.type)||cell.level>=3?'disabled':''}>Upgrade</button><button type="button" data-gc-inspect="move" ${C.roadTypes.has(cell.type)?'disabled':''}>Move</button><button type="button" data-gc-inspect="demolish">Remove</button>${cell.roof?'<button type="button" data-gc-inspect="roof">Remove roof retrofit</button>':''}</div>`:''}`;
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
  const canvas=$('minimap'),ctx=canvas.getContext('2d'),step=canvas.width/C.size;ctx.fillStyle='#79a6a5';ctx.fillRect(0,0,canvas.width,canvas.height);
  state.cells.forEach((cell,i)=>{const x=i%C.size*step,y=Math.floor(i/C.size)*step;if(C.terrainAt(state,i)==='water')return;ctx.fillStyle=!C.ownsLand(state,i)?'#768a86':cell?C.roadTypes.has(cell.type)?'#e2ddc2':C.greenTypes.has(cell.type)?'#4e825d':['factory','coal','heavyindustry','refinery'].includes(cell.type)?'#9d7963':cell.roof==='solar'?'#376a7f':'#e7cfa6':'#a7b98b';ctx.fillRect(x+.2,y+.2,step-.4,step-.4);});
  ctx.strokeStyle='#fff1b6';ctx.lineWidth=1.5;ctx.strokeRect(focus%C.size*step+.3,Math.floor(focus/C.size)*step+.3,step-.6,step-.6);
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
  renderCatalogue();renderSelection();renderGoals();renderEvent();minimap();world?.setState(state,analysis);if(fallback)renderFallback();renderClock();experience?.render();planning?.render();introduction?.render();development?.render();monthly?.render();
}
function commit(result){
  if(result.error){announce(result.error);return false;}
  const previous=state;const awarded=C.grant(result.state),mission=C.awardNeighbourhoodMission(awarded.state);undo.push(state);undo=undo.slice(-28);redo=[];const advanced=mission.state.month!==state.month;state=mission.state;if(advanced&&mission.reward&&state.monthlyReport)state={...state,monthlyReport:{...state.monthlyReport,grants:state.monthlyReport.grants+mission.reward.reward,cashChange:state.monthlyReport.cashChange+mission.reward.reward}};save();render();development?.notify(globalThis.GreenCityPlanning.unlocks(C,previous,state));
  announce(result.notice+(awarded.rewards.length?' Development grant +'+format(awarded.rewards.reduce((sum,g)=>sum+g.reward,0))+' EP!':''));
  if(mission.reward){announce(mission.reward.name+' completed · +'+mission.reward.reward+' EP!');if(!introduction?.ownsReward(mission.reward))experience?.notifyMission(mission.reward);}
  return true;
}
function choose(type){discardBuildDraft();syncClock();rotation=0;selected=type;category=C.upgrades[type].category;mode='build';source=null;lineStart=null;renderCatalogue();renderSelection();if(innerWidth<=1000)setPanel('none');announce(meta().name+' selected. '+meta().description);}
function startLand(){
  const first=C.terrainFor(state).findIndex((t,i)=>t==='water'&&!C.canReclaim(state,i,analysis));
  setPanel('none');setMode('land');if(first>=0){selectTile(first,false);world?.focusCell(first);}
}
function setMode(next){discardBuildDraft();syncClock();mode=next;if(mode==='build'&&!C.rotatable(selected))rotation=0;source=null;lineStart=null;renderSelection();announce({land:'Build land · '+format(C.reclamationCost)+' EP per tile. Select water touching owned land, then confirm. Shortcut L. Undo restores the shoreline.',inspect:'Select a tile to inspect its building and local conditions.',build:meta().name+' selected. Choose a suitable plot.',road:'Choose the start of your road route, then its end. The full cost is shown before you build.',upgrade:'Select a building to upgrade. Each improvement has up to three levels.',move:'Select the building you want to relocate.',demolish:'Select an improvement to remove. You receive 50% salvage; Undo can reverse the action.'}[mode]);}
function selectTile(i,apply=true,confirm=false){
  focus=mode==='build'||mode==='road'||mode==='land'||(mode==='move'&&source!==null)?i:C.anchorAt(state,i);if(!apply&&buildDraft?.locked&&mode==='road')buildDraft={type:'road',cells:C.line(lineStart,i),locked:true};renderSelection();minimap();if(!apply)return;
  if(confirm&&buildDraft?.locked){confirmBuildDraft();return;}
  if(mode==='inspect'){if((innerWidth<=1000||shell.classList.contains('gc-expanded'))&&shell.dataset.panel!=='city')setPanel('city');if(analysis.homeProfiles.some(h=>h.i===focus))requestAnimationFrame(()=>$('inspector').querySelector('.gc-home-feedback')?.scrollIntoView({block:'start',behavior:'instant'}));return;}
  if(mode==='land'){commit(C.reclaimLand(state,i));return;}
  if(mode==='build'){if(selected==='tree'&&!confirm){buildDraft={type:'tree',cells:[i],locked:true};renderSelection();syncClock();announce('Tree plot selected. Review the price, then confirm Build.');return;}commit(C.place(state,selected,i,rotation));return;}
  if(mode==='upgrade'){commit(C.upgrade(state,i));return;}
  if(mode==='demolish'){commit(C.demolish(state,i));return;}
  if(mode==='move'){
    if(source===null){if(!state.cells[i]||C.roadTypes.has(state.cells[i].type)){announce('Choose a building or green-space improvement. Roads cannot be moved.');return;}source=i;rotation=state.cells[i].rotation||0;renderSelection();announce('Now choose an empty plot. Relocation costs '+C.moveCost(state.cells[i])+' EP.');}
    else if(commit(C.relocate(state,source,i,rotation))){source=null;renderSelection();}return;
  }
  if(mode==='road'){
    if(lineStart===null){if(C.terrainAt(state,i)==='water'||(state.cells[i]&&!C.roadTypes.has(state.cells[i].type))){announce('Start your route on clear land or an existing road.');return;}lineStart=i;syncClock();renderSelection();announce('Road start: '+C.label(i)+'. Select or drag to an endpoint, then review the price and confirm Build.');}
    else {buildDraft={type:'road',cells:C.line(lineStart,i),locked:true};renderSelection();syncClock();announce(C.planTiles(state,'road',buildDraft.cells).error||'Route ready. Review the total and confirm Build.');}
  }
}
function undoAction(){discardBuildDraft();syncClock();if(!undo.length){renderSelection();return;}redo.push(state);state=undo.pop();source=null;lineStart=null;save();render();announce('Last city action undone. Budget and city state restored.');}
function redoAction(){discardBuildDraft();syncClock();if(!redo.length){renderSelection();return;}undo.push(state);state=redo.pop();source=null;lineStart=null;save();render();announce('City action restored.');}
function step(){if(buildDraft||lineStart!==null){announce('Confirm or cancel your building plan before advancing the month.');return;}if(state.event&&!state.event.choice){playing=false;syncClock();experience?.openDecision();return;}source=null;lineStart=null;if(commit(C.advance(state))){monthly?.notify();if(state.event&&!state.event.choice){playing=false;syncClock();experience?.openDecision();}}}
function hasOverlay(){return !$('onboarding').hidden||['monthly-report','development','results','confirm','finance','decision','commands','residents','transport','mission-completion'].some(name=>$(name)?.open);}
function visibleGame(){return document.body.dataset.view==='game'&&!document.hidden;}
function renderClock(){const running=playing&&visibleGame()&&!hasOverlay()&&!buildDraft&&lineStart===null;$('play').innerHTML=glyph(playing?'pause':'play');$('play').setAttribute('aria-pressed',String(playing));$('play').setAttribute('aria-label',playing?'Pause the monthly simulation':'Run the monthly simulation');$('speed').textContent=speed+'×';$('city-status').innerHTML='<i></i> CITY SIMULATION '+(running?'RUNNING':'PAUSED');$('city-status').classList.toggle('gc-running',running);}
function syncClock(){clearInterval(timer);timer=null;if(playing&&visibleGame()&&!hasOverlay()&&!buildDraft&&lineStart===null)timer=setInterval(step,12000/speed);renderClock();}
function confirmAction(title,text,action){pending=action;$('confirm-title').textContent=title;$('confirm-message').textContent=text;$('confirm').showModal();syncClock();}
function reset(challenge){discardBuildDraft();development?.close();monthly?.close();introduction?.reset();experience?.closeOverlays();playing=false;syncClock();state=C.fresh(challenge);undo=[];redo=[];rotation=0;selected='tree';category='Nature';mode='inspect';focus=8*C.size+8;source=null;lineStart=null;$('search').value='';showWelcome(true);save();render();world?.resetView();$('welcome-start').focus();announce('A new city is ready. '+C.challenges[challenge].goal);}
function download(name,blob){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function evaluate(){
  const a=analysis,goals=C.goals(state,a),completed=goals.filter(g=>g.lower?g.value<=g.target:g.value>=g.target).length;
  $('results-title').textContent=a.completed?'Green City Master':a.overall>=60?'A city with a future':a.overall>=30?'Your transition is taking shape':'Your first city plan';$('result-score').innerHTML=a.overall+'<span>/100</span>';
  $('result-message').textContent=(a.completed?'Mission completed. ':state.challenge==='sandbox'?'Creative mode. ':completed+' of '+goals.length+' mission goals reached. ')+format(state.population)+' residents call New Terra home. Wellbeing is '+a.wellbeing+'/100, with a '+(a.net>=0?'positive':'negative')+' monthly operating balance of '+format(a.net)+' EP.';
  const awards=[['Urban Nature Designer',a.scores[2]>=70],['Clean Energy Expert',a.scores[1]>=75],['Sustainable Travel Champion',a.scores[3]>=65],['Climate Action Hero',a.completed]];
  $('achievements').innerHTML=awards.map(([name,earned])=>`<div class="${earned?'gc-award-earned':''}"><span>${earned?'✓':'○'}</span><span>${name}<small>${earned?'Achievement earned':'Keep developing your city'}</small></span></div>`).join('');
  const lowest=a.scores.indexOf(Math.min(...a.scores));
  const advice=['Replace polluting industry gradually, protect homes with trees, and reduce fossil energy dependence. Keep enough clean jobs for your residents.','Add solar roofs or wind power. Track demand as your population grows; batteries help renewable power go further.','Bring green space close to residents. A park beside homes improves wellbeing more than a remote decorative plot.','Serve homes with connected bus and tram stops, then link bike lanes into a network. The transit overlay reveals gaps.','Prepare for extreme weather with rain gardens near water, green roofs, water recycling and dependable local power.'][lowest];
  $('advice').innerHTML='<h4>Your next planning decision</h4><p>'+advice+'</p><details class="method-note gc-report-note"><summary>About these scores</summary><div><p>Game indicators and financial rules are simplified learning mechanics, not real-world emissions, costs or climate predictions.</p></div></details>';
  $('results').showModal();syncClock();
}
function renderLifeStatus({walkers,services,riding=0,driving=0,parked=0,parking={},regional={},enabled}){
  root.querySelectorAll('[data-gc-regional]').forEach(el=>{if(regional[el.dataset.gcRegional])el.textContent=regional[el.dataset.gcRegional];});
  root.querySelectorAll('[data-gc-parked]').forEach(el=>el.textContent=parking[el.dataset.gcParked]||0);
  $('life').disabled=false;$('life').setAttribute('aria-pressed',String(enabled));$('life').textContent='City life · '+(enabled?'On':'Off');
  $('life-status').textContent=enabled?(walkers+' outside · '+riding+' on board'+(driving||parked?' · '+driving+' driving · '+parked+' parked':'')+' · '+services+' service vehicle'+(services===1?'':'s')+(walkers+services?' · connected journeys':' · connect homes to local destinations')):'Pedestrians and service vehicles hidden.';
}
async function initWorld(){
  if(world){world.setActive(visibleGame());return;}if(worldPromise||!visibleGame()||fallback)return;
  worldPromise=import('./green-city-world.js?v=61e54362cb').then(({CityWorld})=>{
    world=new CityWorld($('board'),{onDraw:drawPlan,onSelect:(i,apply)=>{selectTile(i,apply||mode==='road'||mode==='build'&&selected==='tree');if(!apply)announce('Preview at '+C.label(i)+'. '+(actionInfo().error||'Check the forecast, then confirm below.'));},onResident:actor=>planning?.openResident(actor),onFollowStop:()=>planning?.stopFollowing(),onNeighbourhood:i=>experience?.openNeighbourhood(i),onHover:i=>{renderPlacement(i);if(i<0)return;const cell=state.cells[i];$('hover').textContent=C.label(i)+' / '+(cell?C.types[cell.type].name:C.terrainAt(state,i)==='water'?'Open water':globalThis.GreenCityPlanning.district(C,i));},onError:announce,onLife:renderLifeStatus,onDaylight:renderDaylight});
    world.setState(state,analysis);if(!viewSettings.cycle&&viewSettings.night)world.toggleNight();world.setCycle(viewSettings.cycle);world.setTool(mode,selected,focus,source,lineStart,rotation);world.setActive(visibleGame());$('loading').hidden=true;
  }).catch(()=>{fallback=true;$('loading').hidden=true;$('board').hidden=true;$('fallback').hidden=false;renderFallback();announce('3D graphics are unavailable in this browser. The planning grid is ready; all city tools and simulation features still work.');});
}
function renderFallback(){
  $('fallback').innerHTML='<p>Planning grid · 3D unavailable in this browser</p><div>'+state.cells.map((cell,i)=>`<button type="button" data-cell="${i}" title="${C.label(i)} · ${cell?C.types[cell.type].name:C.terrainAt(state,i)}" aria-label="Tile ${C.label(i)}, ${cell?C.types[cell.type].name:C.terrainAt(state,i)}" class="gc-grid-${C.terrainAt(state,i)==='water'?'water':cell?C.roadTypes.has(cell.type)?'road':C.greenTypes.has(cell.type)?'green':'building':'land'}${i===focus?' gc-grid-focus':''}">${cell?cell.roof==='solar'?'▧':C.roadTypes.has(cell.type)?'·':C.greenTypes.has(cell.type)?'♧':'▥':''}</button>`).join('')+'</div>';
}
// Interface bindings.
shell.style.setProperty('--gc-grid-size',String(C.size));
$('metrics').innerHTML=C.metrics.map((name,i)=>`<div class="gc-metric"><div><span>${name}</span><strong id="gc-metric-value-${i}"></strong></div><div id="gc-meter-${i}" class="gc-meter" role="progressbar" aria-label="${name}" aria-valuemin="0" aria-valuemax="100"><span></span></div></div>`).join('');
$('row').innerHTML=Array.from({length:C.size},(_,i)=>`<option value="${i}">${C.rowLabel(i)}</option>`).join('');$('col').innerHTML=Array.from({length:C.size},(_,i)=>`<option value="${i}">${i+1}</option>`).join('');
$('catalogue').addEventListener('click',e=>{const button=e.target.closest('[data-upgrade]');if(button)choose(button.dataset.upgrade);});
$('search').addEventListener('input',renderCatalogue);
root.querySelectorAll('[data-gc-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.gcCategory;$('search').value='';renderCatalogue();}));
root.querySelectorAll('[data-gc-tool]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.gcTool);if(b.dataset.gcTool==='build'&&(innerWidth<=1000||shell.classList.contains('gc-expanded')))setPanel('build');}));
root.querySelectorAll('[data-gc-panel]').forEach(b=>b.addEventListener('click',()=>setPanel(b.dataset.gcPanel)));
root.querySelectorAll('[data-gc-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.gcTab)));
$('open-build').addEventListener('click',()=>{if(innerWidth<=1000||shell.classList.contains('gc-expanded'))setPanel('build');else{$('search').focus();}});
$('build').addEventListener('click',()=>selectTile(focus,true,true));$('undo').addEventListener('click',undoAction);$('redo').addEventListener('click',redoAction);
$('row').addEventListener('change',()=>selectTile(Number($('row').value)*C.size+focus%C.size,false));$('col').addEventListener('change',()=>selectTile(Math.floor(focus/C.size)*C.size+Number($('col').value),false));$('focus').addEventListener('click',()=>world?.focusCell(focus));
$('fallback').addEventListener('click',e=>{const button=e.target.closest('[data-cell]');if(button)selectTile(Number(button.dataset.cell));});
$('rotate').addEventListener('click',()=>rotateBuilding());
$('board').addEventListener('keydown',e=>{const dirs={ArrowUp:-C.size,ArrowDown:C.size,ArrowLeft:-1,ArrowRight:1};if(e.key in dirs){e.preventDefault();const row=Math.floor(focus/C.size),col=focus%C.size;const next=e.key==='ArrowUp'?Math.max(0,row-1)*C.size+col:e.key==='ArrowDown'?Math.min(C.size-1,row+1)*C.size+col:e.key==='ArrowLeft'?row*C.size+Math.max(0,col-1):row*C.size+Math.min(C.size-1,col+1);selectTile(next,false);announce('Selected '+C.label(focus)+'. '+(actionInfo().error||'Ready to use '+mode+'.'));}else if(e.key==='Enter'||e.key===' '){e.preventDefault();selectTile(focus,true,true);}});
$('inspector').addEventListener('click',e=>{const fix=e.target.closest('[data-gc-home-fix]');if(fix){actOnHomeIssue(fix.dataset.gcHomeFix);return;}const button=e.target.closest('[data-gc-inspect]');if(!button)return;const action=button.dataset.gcInspect;if(action==='finance'){experience?.openFinance();return;}if(action==='land'){development?.open();return;}if(action==='reclaim'){setPanel('none');setMode('land');return;}if(action==='neighbourhood'){experience?.openNeighbourhood(focus);return;}if(action==='rotate'){commit(C.rotateRoadItem(state,focus));return;}if(action==='roof')commit(C.demolish(state,focus,true));else{setMode(action);if(action==='move'){source=focus;rotation=state.cells[source].rotation||0;renderSelection();announce('Choose the new plot. Relocation costs '+C.moveCost(state.cells[source])+' EP.');}else selectTile(focus);}});
$('event').addEventListener('click',e=>{if(e.target.closest('[data-gc-review-council]'))experience?.openDecision();});
$('next').addEventListener('click',step);$('play').addEventListener('click',()=>{if(!playing&&state.event&&!state.event.choice){experience?.openDecision();return;}playing=!playing;syncClock();});$('speed').addEventListener('click',()=>{speed=speed===1?3:1;syncClock();});
$('reset').addEventListener('click',()=>confirmAction('Start a new city?','This replaces the expanded city saved on this device. Export a save first if you want to keep this city.',()=>reset(state.challenge)));
$('challenge').addEventListener('change',()=>{const next=$('challenge').value;$('challenge').value=state.challenge;confirmAction('Start '+C.challenges[next].name+'?','Your current city will be replaced. Its earlier 6 × 6 save is kept separately. Export the expanded city first to keep it.',()=>reset(next));});
$('confirm-start').addEventListener('click',()=>{const action=pending;pending=null;$('confirm').close();action?.();});$('confirm-cancel').addEventListener('click',()=>{$('confirm').close();pending=null;});$('confirm').addEventListener('cancel',()=>pending=null);
for(const name of ['confirm','results'])$(name).addEventListener('close',syncClock);
$('evaluate').addEventListener('click',evaluate);$('continue').addEventListener('click',()=>$('results').close());$('results-close').addEventListener('click',()=>$('results').close());
$('export').addEventListener('click',()=>download('new-terra-month-'+state.month+'.json',new Blob([JSON.stringify({game:'New Terra',state},null,2)],{type:'application/json'})));
$('import').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>2000000)throw new Error('File too large');const raw=JSON.parse(await file.text()),city=C.restore(raw.state||raw);confirmAction('Open this city save?','This replaces the expanded city on this device. Your current city can be exported before you open another.',()=>{monthly?.close();introduction?.reset();planning?.close();playing=false;discardBuildDraft();state=city;undo=[];redo=[];mode='inspect';source=null;lineStart=null;syncClock();save();render();announce('City save opened successfully.');});}catch{announce('That file is not a valid expanded city save. Your current city is unchanged.');}$('import-file').value='';});
$('life').addEventListener('click',()=>world?.toggleLife());
$('day-cycle').checked=viewSettings.cycle;$('day-cycle').addEventListener('change',()=>{viewSettings={cycle:$('day-cycle').checked,night:world?.night||false};world?.setCycle(viewSettings.cycle);saveLighting();announce(viewSettings.cycle?'Automatic day and night on.':'Lighting held. Use the moon button to choose day or night.');});
$('photo').addEventListener('click',()=>{if(!world){announce('City photos are available once the 3D view is ready.');return;}const link=document.createElement('a');link.download='new-terra-month-'+state.month+'.png';link.href=world.photo();link.click();});
function setExpanded(value){return experience?.setExpanded(value);}
$('expand').addEventListener('click',()=>setExpanded(!shell.classList.contains('gc-expanded')));
root.querySelectorAll('[data-gc-camera]').forEach(button=>button.addEventListener('click',()=>{if(!world)return;const action=button.dataset.gcCamera;if(action==='zoom-in')world.zoomBy(1.25);if(action==='zoom-out')world.zoomBy(.8);if(action==='rotate-left')world.rotateBy(-1);if(action==='rotate-right')world.rotateBy(1);if(action==='reset')world.resetView();if(action==='night'){world.toggleNight();viewSettings={cycle:false,night:world.night};saveLighting();}if(action==='grid')button.setAttribute('aria-pressed',String(world.toggleGrid()));if(action==='needs')button.setAttribute('aria-pressed',String(world.toggleNeighbourhoodPins()));}));
$('overlay').addEventListener('change',()=>{const value=$('overlay').value;world?.setOverlay(value);$('overlay-legend').hidden=value==='city';$('overlay-name').textContent=$('overlay').selectedOptions[0].textContent;$('overlay-scale').textContent=value==='housing'?'Vacant → Occupied · grey: other plots':value==='staffing'?'Unstaffed → Filled · grey: other plots':value==='power'?'Imported grid power → Local clean supply':value==='noise'?'Louder places → Quieter streets':value==='traffic'?'Congested roads → Flowing traffic':value==='neighbourhood'?'Priority needs → Better supported homes':'Needs attention → Better prepared';});
$('minimap').addEventListener('click',event=>{const rect=$('minimap').getBoundingClientRect(),col=Math.min(C.size-1,Math.floor((event.clientX-rect.left)/rect.width*C.size)),row=Math.min(C.size-1,Math.floor((event.clientY-rect.top)/rect.height*C.size));selectTile(row*C.size+col,false);world?.focusCell(focus);});$('minimap').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();world?.focusCell(focus);}});
$('welcome-start').addEventListener('click',()=>introduction?.start());
function dismissWelcome(){
  showWelcome(false);
  try { localStorage.setItem('coil-green-city-guide-dismissed', '1'); } catch {}
}
$('dismiss-tutorial').addEventListener('click', () => {
  dismissWelcome();
  root.querySelector('[data-gc-tool="inspect"]').focus();
});
let welcomeDismissed=false;
try { welcomeDismissed=localStorage.getItem('coil-green-city-guide-dismissed')==='1'; } catch {}
showWelcome(!restored&&!welcomeDismissed);
// Local music remains opt-in and stops when the game or document is hidden.
const music=new Audio('assets/audio/climate-mission.wav');music.id='gc-music';music.hidden=true;music.loop=true;music.preload='none';music.volume=.32;root.append(music);
let musicEnabled=false,musicToken=0;
function syncMusic(){const token=++musicToken;if(!musicEnabled||!visibleGame()){music.pause();return;}music.play().catch(()=>{if(token!==musicToken)return;musicEnabled=false;$('game-sound').textContent='Music off';$('game-sound').setAttribute('aria-pressed','false');announce('Music is unavailable in this browser. You can continue building.');});}
$('game-sound').addEventListener('click',()=>{musicEnabled=!musicEnabled;$('game-sound').textContent=musicEnabled?'Music on':'Music off';$('game-sound').setAttribute('aria-pressed',String(musicEnabled));syncMusic();});
function syncView(){if(document.body.dataset.view!=='game'){monthly?.close();development?.close();experience?.closeOverlays();if($('results').open)$('results').close();if($('confirm').open)$('confirm').close();if(shell.classList.contains('gc-expanded'))setExpanded(false);}world?.setActive(visibleGame());syncClock();syncMusic();if(visibleGame())initWorld();}
window.addEventListener('app:view',syncView);document.addEventListener('visibilitychange',syncView);window.addEventListener('pagehide',()=>{music.pause();clearInterval(timer);world?.setActive(false);});
document.addEventListener('keydown',e=>{if(!visibleGame()||hasOverlay())return;if(e.key==='Escape'&&(buildDraft||lineStart!==null)){e.preventDefault();cancelBuildPlan();return;}if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){source=null;lineStart=null;shell.dataset.panel='none';if(shell.classList.contains('gc-expanded'))setExpanded(false);renderSelection();return;}if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redoAction():undoAction();}if(e.key.toLowerCase()==='y'){e.preventDefault();redoAction();}return;}if(['q','e'].includes(e.key.toLowerCase())){e.preventDefault();rotateBuilding(e.key.toLowerCase()==='q'?-1:1);return;}const tools={l:'land',i:'inspect',b:'build',r:'road',u:'upgrade',m:'move',x:'demolish'};if(tools[e.key.toLowerCase()]){e.preventDefault();setMode(tools[e.key.toLowerCase()]);}});
experience=createExperience({getState:()=>state,getAnalysis:()=>analysis,focusTile:(i,overlay)=>{setMode('inspect');selectTile(i,false);world?.focusCell(i);if(overlay){$('overlay').value=overlay;$('overlay').dispatchEvent(new Event('change'));}},focusPlan:i=>{selectTile(i,false);world?.focusCell(i);},commit,announce,setMode,choose,setPanel,openPanel:panel=>{if(shell.dataset.panel!==panel)setPanel(panel);},syncClock,hasOverlay,confirmAction,evaluate,step,undo:undoAction,redo:redoAction,resize:()=>world?.resize()});
planning=createPlanning({getState:()=>state,getAnalysis:()=>analysis,getWorld:()=>world,getMode:()=>mode,setMode,announce,inspectTile:i=>selectTile(i,false),closePanels:()=>setPanel('none'),openNeighbourhood:i=>experience?.openNeighbourhood(i)});
introduction=createIntroduction({getState:()=>state,getAnalysis:()=>analysis,planning:()=>planning,commit,setMode,announce,dismissWelcome,pause:()=>{playing=false;syncClock();},closePanels:()=>setPanel('none'),showHome:i=>{selectTile(i,false);world?.focusCell(i);},openGoals:()=>setPanel('goals'),openNeighbourhood:i=>experience?.openNeighbourhood(i),previewPlan:plan=>{if(plan.kind==='upgrade')setMode('upgrade');else choose(plan.type);selectTile(plan.target,false);world?.focusCell(plan.target);if(world&&world.camera.zoom<1.8)world.zoomBy(1.8/world.camera.zoom);},executePlan:plan=>{if(plan.kind==='upgrade')setMode('upgrade');else choose(plan.type);selectTile(plan.target,true,true);}});
window.addEventListener('app:view',()=>{if(document.body.dataset.view!=='game'){discardBuildDraft();planning.close();syncClock();}});
development=createDevelopment({getState:()=>state,getAnalysis:()=>analysis,commit,syncClock,announce,choose,startLand,openBuild:()=>setPanel('build'),openFinance:()=>experience.openFinance(),showHome:i=>experience.openNeighbourhood(i)});
monthly=createMonthlyReport({getState:()=>state,getAnalysis:()=>analysis,syncClock,inspect:i=>{setMode('inspect');selectTile(i,false);world?.focusCell(i);if(shell.dataset.panel!=='city')setPanel('city');}});
if(restored)save();
render();announce(saveWarning||(restored?'Welcome back, Mayor. Your expanded city and recent undo history are ready.':'Welcome to New Terra. Explore your island, choose your first improvements, then advance a month.'));syncView();
