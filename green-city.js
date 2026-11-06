/* Build Your Green City — local, accessible city builder. */
(() => {
  'use strict';
  const C=globalThis.GreenCity,A=globalThis.GreenCityArt;
  const root=document.querySelector('.green-city-section');
  if(!root||!C||!A)return;
  const $=id=>document.getElementById('gc-'+id);
  const storageKey='coil-green-city-v1';
  let state=C.fresh(),selected='tree',category='Nature',focus=2,last=-1,pendingChallenge=null,storageOK=true;
  let restored=false;
  try {const raw=localStorage.getItem(storageKey);if(raw){state=C.restore(JSON.parse(raw));restored=true;}} catch {storageOK=false;}
  const names={land:'Open paved plot',road:'Road',building:'Building roof'};
  function announce(text){$('message').textContent=text;}
  function save(){try {localStorage.setItem(storageKey,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}}
  function icon(type){return `<svg viewBox="-38 -92 76 114" aria-hidden="true" focusable="false">${A.piece(type,C.upgrades[type].terrain,1)}</svg>`;}
  $('metrics').innerHTML=C.metrics.map((name,i)=>`<div class="gc-metric"><div><span>${name}</span><strong id="gc-metric-value-${i}"></strong></div><div id="gc-meter-${i}" class="gc-meter" role="progressbar" aria-label="${name}" aria-valuemin="0" aria-valuemax="100"><span></span></div></div>`).join('');
  function renderCatalogue(){
    const active=document.activeElement?.dataset?.upgrade;
    $('catalogue').innerHTML=Object.entries(C.upgrades).filter(([,item])=>item.category===category).map(([id,item])=>`<button type="button" data-upgrade="${id}" class="gc-upgrade${selected===id?' is-selected':''}${C.remaining(state)<item.cost?' gc-unaffordable':''}" aria-pressed="${selected===id}" title="${item.description}"><span class="gc-upgrade-art">${icon(id)}</span><span class="gc-upgrade-name">${item.name}<small>${item.terrain==='building'?'Building roof':item.terrain==='land'?'Open plot':'Road tile'}</small></span><strong>${item.cost}<small>EP</small></strong></button>`).join('');
    if(active)$('catalogue').querySelector(`[data-upgrade="${active}"]`)?.focus({preventScroll:true});
    root.querySelectorAll('[data-gc-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gcCategory===category)));
    const item=C.upgrades[selected];
    $('selected-name').textContent=item?item.name:'Choose an upgrade';
    $('selected-description').textContent=item?item.description:'Choose a card, then a highlighted tile to build.';
    $('selected-effects').innerHTML=item?item.effect.map((n,i)=>n?`<span>+${n} ${C.metrics[i].toLowerCase()}</span>`:'').join(''):'';
  }
  function renderBoard(keyboard=false){
    const valid=C.terrain.flatMap((_,i)=>!C.canPlace(state,selected,i)?[i]:[]);
    $('board').innerHTML=A.city(C.board(state),C.terrain,focus,valid,last);last=-1;
    $('tile-label').textContent=C.label(focus)+' · '+(C.board(state)[focus]?C.upgrades[C.board(state)[focus]].name:names[C.terrain[focus]]);
    const error=C.canPlace(state,selected,focus);
    $('build').disabled=!!error;
    $('build').textContent=C.upgrades[selected]?'Build · '+C.upgrades[selected].cost+' EP':'Build here';
    $('build').title=error||'Place '+C.upgrades[selected].name+' on tile '+C.label(focus);
    if(keyboard)$('board').querySelector(`[data-cell="${focus}"]`)?.focus({preventScroll:true});
  }
  function requirements(s){
    if(state.challenge==='revolution')return [{done:s.overall>=80,text:'Overall sustainability '+s.overall+' / 80'}];
    if(state.challenge==='carbon')return [{done:s.pollution<=15,text:'Pollution '+s.pollution+' / target ≤15'},{done:s.scores[1]>=70,text:'Renewable energy '+s.scores[1]+' / 70'},{done:s.scores[3]>=70,text:'Sustainable transport '+s.scores[3]+' / 70'}];
    return [{done:(s.counts.park||0)>=5,text:'Parks '+(s.counts.park||0)+' / 5'},{done:(s.counts.solar||0)>=3,text:'Solar roofs '+(s.counts.solar||0)+' / 3'},{done:((s.counts.bus||0)+(s.counts.tram||0))>=1,text:'Public transport '+((s.counts.bus||0)+(s.counts.tram||0))+' / 1'},{done:s.overall>=80,text:'Overall sustainability '+s.overall+' / 80'}];
  }
  function render(){
    const s=C.score(state),challenge=C.challenges[state.challenge];
    $('challenge').value=state.challenge;
    $('budget').innerHTML=C.remaining(state).toLocaleString('en-GB')+' <small>EP</small>';
    $('map-budget').textContent=C.remaining(state).toLocaleString('en-GB')+' EP';
    $('map-score').textContent=s.overall+'/100';
    $('built-count').textContent=state.moves.length+' '+(state.moves.length===1?'upgrade':'upgrades');
    $('undo').disabled=state.moves.length===0;
    $('overall').innerHTML=s.overall+'<small>/100</small>';
    $('rating').textContent=s.overall>=80?'A greener future':s.overall>=55?'Green city in progress':s.overall>=30?'Change is taking root':'A new beginning';
    C.metrics.forEach((_,i)=>{$('metric-value-'+i).textContent=s.scores[i]+'/100';$('meter-'+i).setAttribute('aria-valuenow',String(s.scores[i]));$('meter-'+i).firstElementChild.style.width=s.scores[i]+'%';});
    $('pollution').textContent=s.pollution+' / 100';
    $('mission-name').textContent=challenge.name;$('mission-detail').textContent=challenge.detail;
    $('mission-progress').innerHTML=requirements(s).map(r=>`<li class="${r.done?'gc-done':''}"><span aria-hidden="true">${r.done?'✓':'○'}</span> ${r.text}</li>`).join('');
    $('mission-status').textContent=s.completed?'✓ Mission completed':'Mission in progress';$('mission-status').classList.toggle('gc-done',s.completed);
    $('save-status').textContent=storageOK?'Saved automatically on this device.':'Saving is unavailable. Your city will last until this page is closed.';
    renderCatalogue();renderBoard();
  }
  function choose(type){
    selected=type;category=C.upgrades[type].category;
    if(C.canPlace(state,selected,focus)){const first=C.terrain.findIndex((_,i)=>!C.canPlace(state,selected,i));if(first>=0)focus=first;}
    render();
    announce(C.remaining(state)<C.upgrades[type].cost?'You need '+C.upgrades[type].cost+' EP for '+C.upgrades[type].name+'. Choose a cheaper upgrade or undo a move.':C.upgrades[type].name+' selected. Click a highlighted '+names[C.upgrades[type].terrain].toLowerCase()+' to build.');
  }
  function build(cell,keyboard=false){
    focus=cell;const before=C.score(state).overall,result=C.place(state,selected,cell);
    if(result.error){renderBoard(keyboard);announce(result.error);return;}
    state=result.state;last=cell;save();render();const s=C.score(state),gain=s.overall-before;
    announce(C.upgrades[selected].name+' built on '+C.label(cell)+'. '+C.remaining(state)+' EP remaining. Sustainability '+(gain>=0?'+':'')+gain+'.'+(s.completed?' Mission complete! Evaluate your city to see your report.':''));
    if(keyboard)$('board').querySelector(`[data-cell="${focus}"]`)?.focus({preventScroll:true});
  }
  function move(direction,keyboard=false){
    const row=Math.floor(focus/6),column=focus%6;
    focus=direction==='up'?Math.max(0,row-1)*6+column:direction==='down'?Math.min(5,row+1)*6+column:direction==='left'?row*6+Math.max(0,column-1):row*6+Math.min(5,column+1);
    renderBoard(keyboard);announce('Tile '+C.label(focus)+': '+(C.board(state)[focus]?C.upgrades[C.board(state)[focus]].name:names[C.terrain[focus]])+'. '+(C.canPlace(state,selected,focus)||'Ready to build.'));
  }
  $('catalogue').addEventListener('click',event=>{const button=event.target.closest('[data-upgrade]');if(button)choose(button.dataset.upgrade);});
  root.querySelectorAll('[data-gc-category]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.gcCategory;renderCatalogue();}));
  $('board').addEventListener('click',event=>{const tile=event.target.closest('[data-cell]');if(tile)build(Number(tile.dataset.cell));});
  $('board').addEventListener('keydown',event=>{
    const tile=event.target.closest('[data-cell]');
    if(tile)focus=Number(tile.dataset.cell);
    const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
    if(directions[event.key]){event.preventDefault();move(directions[event.key],true);}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();build(focus,true);}
  });
  root.querySelectorAll('[data-gc-move]').forEach(button=>button.addEventListener('click',()=>move(button.dataset.gcMove)));
  $('build').addEventListener('click',()=>build(focus));
  $('undo').addEventListener('click',()=>{
    if(!state.moves.length)return;
    const item=state.moves[state.moves.length-1];state={...state,moves:state.moves.slice(0,-1)};focus=item.cell;save();render();announce('Undid '+C.upgrades[item.type].name+'. '+C.upgrades[item.type].cost+' EP refunded.');
  });
  function newCity(challenge){state=C.fresh(challenge);selected='tree';category='Nature';focus=2;save();render();announce('Welcome, Mayor. '+C.challenges[challenge].budget+' EP available. '+C.challenges[challenge].goal);}
  function askReset(challenge){if(!state.moves.length){newCity(challenge);return;}pendingChallenge=challenge;$('challenge').value=state.challenge;$('confirm').showModal();}
  $('reset').addEventListener('click',()=>askReset(state.challenge));
  $('challenge').addEventListener('change',()=>askReset($('challenge').value));
  $('confirm-start').addEventListener('click',()=>{const next=pendingChallenge||state.challenge;$('confirm').close();pendingChallenge=null;newCity(next);});
  $('confirm-cancel').addEventListener('click',()=>{$('confirm').close();pendingChallenge=null;$('challenge').value=state.challenge;});
  $('confirm').addEventListener('cancel',()=>{pendingChallenge=null;$('challenge').value=state.challenge;});
  function evaluate(){
    const s=C.score(state),rank=s.completed?'Green City Master':s.overall>=60?'City in transition':s.overall>=30?'A promising start':'Your first city plan';
    $('results-title').textContent=rank;$('result-score').innerHTML=s.overall+'<span>/100</span>';
    $('result-message').textContent=s.completed?'Mission completed! Your choices are helping this neighbourhood build a more sustainable future.':'Your city is taking shape. Complete the remaining mission goals or keep experimenting with your budget.';
    const awards=[{name:'Green City Designer',earned:s.scores[2]>=70},{name:'Renewable Energy Expert',earned:s.scores[1]>=70},{name:'Sustainable Transport Champion',earned:s.scores[3]>=70},{name:'Climate Action Hero',earned:s.completed}];
    $('achievements').innerHTML=awards.map(a=>`<div class="${a.earned?'gc-award-earned':''}"><span aria-hidden="true">${a.earned?'✓':'○'}</span><span>${a.name}<small>${a.earned?'Achievement earned':'Still to unlock'}</small></span></div>`).join('');
    const lowest=s.scores.indexOf(Math.min(...s.scores));
    const advice=['Air quality needs attention. Trees and lower-emission travel can help balance your plan.','Your city still depends on conventional power. Try a solar roof or a wind turbine.','Make room for nature. Parks and trees add green space, while green roofs use existing buildings.','Residents still need better travel options. Try an E-Bus, a tram stop, or connected bike lanes.','Prepare for hot days. Put trees and parks beside buildings, or add green roofs.'][lowest];
    $('advice').innerHTML=`<h4>Your next decision</h4><p>${s.completed&&s.overall>=95?'You have built a very balanced city. Try another mission with a different budget and strategy.':advice}</p><p class="gc-report-bonuses">Placement bonuses: +${s.bonuses.shade} resilience from shade · +${s.bonuses.network} transport from connected bike lanes · +${s.bonuses.power} energy and transport from clean-power links.</p><p class="gc-report-note">These are simplified game scores, not measured emissions or a prediction of real-world climate outcomes.</p>`;
    $('results').showModal();
  }
  $('evaluate').addEventListener('click',evaluate);
  [$('continue'),$('results-close')].forEach(button=>button.addEventListener('click',()=>$('results').close()));
  // Retain the site's local music, with no autoplay or Web Audio dependency.
  const music=new Audio('assets/audio/climate-mission.wav');music.loop=true;music.preload='none';music.volume=.4;music.id='gc-music';music.hidden=true;root.append(music);
  const sound=document.getElementById('game-sound');let musicEnabled=false,musicGeneration=0;
  function syncMusic(){
    const token=++musicGeneration;
    if(!musicEnabled||document.hidden||document.body.dataset.view!=='game'){music.pause();return;}
    music.play().then(()=>{if(token!==musicGeneration&&(!musicEnabled||document.hidden||document.body.dataset.view!=='game'))music.pause();}).catch(()=>{if(token!==musicGeneration)return;musicEnabled=false;sound.textContent='Music off';sound.setAttribute('aria-pressed','false');announce('Music is unavailable in this browser. You can continue building.');});
  }
  sound.addEventListener('click',()=>{musicEnabled=!musicEnabled;sound.textContent=musicEnabled?'Music on':'Music off';sound.setAttribute('aria-pressed',String(musicEnabled));syncMusic();});
  window.addEventListener('app:view',event=>{syncMusic();if(event.detail?.id!=='game'){if($('results').open)$('results').close();if($('confirm').open)$('confirm').close();}});
  document.addEventListener('visibilitychange',syncMusic);window.addEventListener('pagehide',()=>music.pause());
  const preview=document.getElementById('gc-preview');
  if(preview){const demo=Array(36).fill(null);[[2,'park'],[7,'tree'],[8,'wind'],[11,'park'],[26,'park'],[29,'tree'],[1,'solar'],[4,'roof'],[28,'solar'],[13,'bus'],[15,'bike'],[21,'tram']].forEach(([i,type])=>demo[i]=type);preview.innerHTML=A.city(demo,C.terrain,-1,[],-1,false);}
  render();announce(restored?'Welcome back, Mayor. Your saved city is ready.':'Welcome, Mayor. A tree is selected. Choose a highlighted open plot, or explore the other upgrades.');
})();
