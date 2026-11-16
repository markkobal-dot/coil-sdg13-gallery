import './green-city-planning.js?v=1f4559b487';
import './green-city-life.js?v=f60e6fe754';
const C=globalThis.GreenCity,P=globalThis.GreenCityPlanning,L=globalThis.GreenCityLife;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>(n>0?'+':'')+Math.round(n);
export function createPlanning(api){
  const shell=document.getElementById('gc-shell'),summary=document.createElement('div');summary.id='gc-build-forecast';summary.className='gc-build-forecast';summary.hidden=true;
  document.getElementById('gc-placement-detail').after(summary);
  const panel=document.createElement('section');panel.className='gc-person-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','gc-person-title');
  panel.innerHTML='<header><div><small>RESIDENT JOURNEY</small><h3 id="gc-person-title">Meet a resident</h3></div><button type="button" data-person-close aria-label="Close resident journey">×</button></header><label for="gc-person-select">Choose a resident</label><select id="gc-person-select"></select><div id="gc-person-detail"></div><div class="gc-person-actions"><button type="button" data-person-follow aria-pressed="false">Follow resident</button><button type="button" data-person-home>Show home</button><button type="button" data-person-needs>Local feedback ↗</button></div><p class="gc-person-note">A representative journey through your city. Local needs come from the home’s neighbourhood.</p>';
  shell.querySelector('.gc-world-wrap').append(panel);
  const browse=document.createElement('button');browse.id='gc-meet-residents';browse.type='button';browse.className='gc-meet-residents';browse.textContent='Meet residents · follow a journey ↗';
  document.getElementById('gc-inspector').before(browse);
  let cacheState=null,cache=new Map(),actor=null,journeys=[],following=false;
  const key=p=>p.from+':'+p.to+':'+p.id;
  function refreshJourneys(){journeys=api.getWorld()?.life.people||L.plan(C,api.getState(),api.getAnalysis(),{walkers:32}).walkers;}
  function close(){panel.hidden=true;following=false;api.getWorld()?.selectResident(null);panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');}
  function detail(){
    const report=P.resident(C,api.getState(),api.getAnalysis(),actor);if(!report){close();return;}
    panel.querySelector('h3').textContent=report.name+' · '+C.label(report.from);
    panel.querySelector('#gc-person-detail').innerHTML=`<p class="gc-person-purpose">${escape(report.purpose)}</p><dl><div><dt>Home</dt><dd>${C.label(report.from)} · ${P.district(C,report.from)}</dd></div><div><dt>Destination</dt><dd>${escape(report.destination)} · ${C.label(report.to)}</dd></div><div><dt>Walking route</dt><dd>${report.links} road links · out and back</dd></div></dl><div class="gc-person-need"><strong>${escape(report.priority)}</strong><p>${escape(report.detail)}</p></div><div class="gc-person-metrics"><span>Shade <b>${report.shade}/100</b></span><span>Transit <b>${report.transport}/100</b></span><span>Noise <b>${report.noise}/100</b></span></div>`;
    panel.querySelector('#gc-person-select').value=key(actor);
    panel.querySelector('[data-person-follow]').disabled=!api.getWorld()?.life.enabled;
    api.getWorld()?.selectResident(actor,following);
  }
  function openResident(person){
    refreshJourneys();actor=person||journeys[0];if(!actor){api.announce('Connect homes to parks, services or other homes to create walking journeys.');return;}
    if(api.getMode()!=='inspect')api.setMode('inspect');
    api.closePanels();
    following=false;panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');panel.querySelector('[data-person-follow]').textContent='Follow resident';
    const select=panel.querySelector('#gc-person-select');select.innerHTML=journeys.map(p=>{const r=P.resident(C,api.getState(),api.getAnalysis(),p);return r?`<option value="${key(p)}">${r.name} · ${C.label(p.from)} → ${C.label(p.to)}</option>`:'';}).join('');
    panel.hidden=false;detail();api.getWorld()?.showResident(actor);select.focus({preventScroll:true});
    if(!shell.classList.contains('gc-expanded')){const rect=panel.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)panel.scrollIntoView({block:'center',behavior:'instant'});}
  }
  browse.addEventListener('click',()=>openResident());panel.querySelector('[data-person-close]').addEventListener('click',close);
  const reportTabs=document.querySelector('#gc-residents .gc-resident-tabs');
  if(reportTabs){const journeysButton=document.createElement('button');journeysButton.type='button';journeysButton.textContent='Resident journeys';journeysButton.addEventListener('click',()=>{document.getElementById('gc-residents').close();openResident();});reportTabs.append(journeysButton);}
  panel.querySelector('#gc-person-select').addEventListener('change',e=>{actor=journeys.find(p=>key(p)===e.target.value);detail();api.getWorld()?.showResident(actor);});
  panel.querySelector('[data-person-follow]').addEventListener('click',e=>{following=!following;e.currentTarget.setAttribute('aria-pressed',String(following));e.currentTarget.textContent=following?'Stop following':'Follow resident';api.getWorld()?.selectResident(actor,following);});
  panel.querySelector('[data-person-home]').addEventListener('click',()=>{following=false;panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');panel.querySelector('[data-person-follow]').textContent='Follow resident';api.getWorld()?.selectResident(actor,false);api.getWorld()?.focusCell(actor.from);});
  panel.querySelector('[data-person-needs]').addEventListener('click',()=>{const home=actor.from;close();api.openNeighbourhood(home);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopImmediatePropagation();close();browse.focus({preventScroll:true});}},true);
  return {
    openResident,close,
    stopFollowing(){following=false;panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');panel.querySelector('[data-person-follow]').textContent='Follow resident';},
    preview(action){
      if(action.mode!=='inspect'&&!panel.hidden)close();
      if(!['build','move','upgrade','road'].includes(action.mode)){summary.hidden=true;api.getWorld()?.setForecast(null);return;}
      const state=api.getState();if(state!==cacheState){cacheState=state;cache.clear();}
      const id=JSON.stringify(action);let report=cache.get(id);
      if(report===undefined){report=P.forecast(C,state,action,api.getAnalysis());if(cache.size>40)cache.clear();cache.set(id,report);}
      summary.hidden=!report||!!report.error;api.getWorld()?.setForecast(report?.error?null:report);
      if(summary.hidden)return;
      const effect=report.homes.flatMap(home=>home.changes.map(change=>({...change,i:home.i}))).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0];
      const metricNames={shade:'Shade',mobility:'Transit access',health:'Healthcare',safety:'Emergency cover',services:'Services',noise:'Noise',commute:'Congestion',connection:'Road link'};
      summary.innerHTML=`<div><span>Upfront <b>${report.cost} EP</b></span><span>Upkeep change <b>${signed(report.upkeep)} EP/mo</b></span><span>Monthly balance <b class="${report.net<0?'is-negative':''}">${signed(report.net)} EP <small>(${signed(report.netChange)})</small></b></span></div><p>${report.better} homes improved${report.worse?' · '+report.worse+' with trade-offs':''}${effect?' · '+metricNames[effect.key]+' '+signed(effect.delta)+' at '+C.label(effect.i):''} · City happiness ${signed(report.happinessChange)}${report.cleanPowerChange?' · Clean power '+signed(report.cleanPowerChange):''}</p><p class="gc-preview-key"><i></i>Area of influence <i></i>Improved home <i></i>Trade-off · forecast, before grants</p><span class="sr-only">Affected homes: ${report.homes.map(home=>C.label(home.i)+' '+home.kind).join(', ')||'none'}.</span>`;
    },
    render(){if(!panel.hidden){refreshJourneys();const current=journeys.find(p=>key(p)===key(actor));if(current){actor=current;detail();}else{close();api.announce('This journey changed as the city developed. Choose another resident.');}}}
  };
}
