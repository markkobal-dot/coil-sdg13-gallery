import './green-city-planning.js?v=91314a0454';
import './green-city-life.js?v=acc9a6f5a0';
const C=globalThis.GreenCity,P=globalThis.GreenCityPlanning,L=globalThis.GreenCityLife;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>(n>0?'+':'')+Math.round(n);
export function createPlanning(api){
  const shell=document.getElementById('gc-shell'),summary=document.createElement('div');summary.id='gc-build-forecast';summary.className='gc-build-forecast';summary.hidden=true;
  document.getElementById('gc-placement-detail').after(summary);
  const panel=document.createElement('section');panel.className='gc-person-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','gc-person-title');
  panel.innerHTML='<header><div><small>RESIDENT JOURNEY</small><h3 id="gc-person-title">Meet a resident</h3></div><button type="button" data-person-close aria-label="Close resident journey">×</button></header><label for="gc-person-select">Choose a resident</label><select id="gc-person-select"></select><div id="gc-person-detail"></div><p class="gc-person-building-status" role="status" hidden></p><div class="gc-person-actions"><button type="button" data-person-back hidden>Back to resident</button><button type="button" data-person-follow aria-pressed="false">Follow resident</button><button type="button" data-person-home>Show home</button><button type="button" data-person-work>Show workplace</button><button type="button" data-person-needs>Local feedback ↗</button></div><p class="gc-person-note">A representative journey through your city. Local needs come from the home’s neighbourhood.</p>';
  shell.querySelector('.gc-world-wrap').append(panel);
  const browse=document.createElement('button');browse.id='gc-meet-residents';browse.type='button';browse.className='gc-meet-residents';browse.textContent='Meet residents · follow a journey ↗';
  document.getElementById('gc-inspector').before(browse);
  let cacheState=null,cache=new Map(),actor=null,journeys=[],following=false;
  const key=p=>p.from+':'+p.to+':'+p.id;
  function refreshJourneys(){journeys=api.getWorld()?.life.people||L.plan(C,api.getState(),api.getAnalysis(),{walkers:32}).walkers;}
  function close(){delete panel.dataset.mapFocus;api.getWorld()?.clearResidentBuilding();panel.hidden=true;following=false;api.getWorld()?.selectResident(null);panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');}
  function detail(){
    const report=P.resident(C,api.getState(),api.getAnalysis(),actor,api.getWorld()?.residentActivity(actor));if(!report){close();return;}
    panel.querySelector('h3').textContent=report.name+' · '+C.label(report.from);
    panel.querySelector('#gc-person-detail').innerHTML=`<div class="gc-person-happiness" data-mood="${report.mood.toLowerCase()}"><div><span>Happiness · ${report.mood}</span><strong>${report.happiness}<small>/100</small></strong></div><meter min="0" max="100" value="${report.happiness}" aria-label="Resident happiness">${report.happiness}/100</meter><p>${escape(report.happinessDetail)}</p></div><p class="gc-person-purpose">${escape(report.purpose)}</p><dl><div><dt>Home</dt><dd>${C.label(report.from)} · ${P.district(C,report.from)}</dd></div><div><dt>Housing</dt><dd>${escape(report.housing)} · ${report.homeResidents} / ${report.homeCapacity} residents</dd></div><div><dt>Job</dt><dd>${escape(report.profession)}</dd></div><div><dt>Income band</dt><dd>${escape(report.income)}</dd></div><div><dt>Employment</dt><dd>${escape(report.employment)}${report.workplace?' · '+escape(report.workplace.name)+' at '+C.label(report.workplace.i)+' · '+report.workplace.filled+' / '+report.workplace.positions+' jobs filled':''}</dd></div><div><dt>Destination</dt><dd data-person-destination>${escape(report.destination)} · ${C.label(report.to)}</dd></div><div><dt>Activity</dt><dd data-person-route>${report.routeDetail||report.links+' road links · out and back'}</dd></div></dl><div class="gc-person-need"><strong>${escape(report.priority)}</strong><p>${escape(report.detail)}</p></div><div class="gc-person-metrics"><span>Shade <b>${report.shade}/100</b></span><span>Transit <b>${report.transport}/100</b></span><span>Noise <b>${report.noise}/100</b></span><span>Pollution <b>${report.pollution}/100</b></span></div>`;
    panel.querySelector('#gc-person-select').value=key(actor);panel.querySelector('[data-person-work]').disabled=!report.workplace;
    panel.querySelector('[data-person-follow]').disabled=!api.getWorld()?.life.enabled;
    api.getWorld()?.selectResident(actor,following);
  }
  function openResident(person){
    delete panel.dataset.mapFocus;api.getWorld()?.clearResidentBuilding();refreshJourneys();actor=person||journeys[0];if(!actor){api.announce('Connect homes to parks, services or other homes to create walking journeys.');return;}
    if(api.getMode()!=='inspect')api.setMode('inspect');
    api.closePanels();
    following=false;panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');panel.querySelector('[data-person-follow]').textContent='Follow resident';
    const select=panel.querySelector('#gc-person-select');select.innerHTML=journeys.map(p=>{const r=P.resident(C,api.getState(),api.getAnalysis(),p);return r?`<option value="${key(p)}">${r.name} · ${r.profession} · Home ${C.label(p.from)}</option>`:'';}).join('');
    panel.hidden=false;detail();api.getWorld()?.showResident(actor);select.focus({preventScroll:true});
    if(!shell.classList.contains('gc-expanded')){const rect=panel.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight)panel.scrollIntoView({block:'center',behavior:'instant'});}
  }
  browse.addEventListener('click',()=>openResident());panel.querySelector('[data-person-close]').addEventListener('click',close);
  const reportTabs=document.querySelector('#gc-residents .gc-resident-tabs');
  if(reportTabs){const journeysButton=document.createElement('button');journeysButton.type='button';journeysButton.textContent='Resident journeys';journeysButton.addEventListener('click',()=>{document.getElementById('gc-residents').close();openResident();});reportTabs.append(journeysButton);}
  panel.querySelector('#gc-person-select').addEventListener('change',e=>{delete panel.dataset.mapFocus;api.getWorld()?.clearResidentBuilding();actor=journeys.find(p=>key(p)===e.target.value);detail();api.getWorld()?.showResident(actor);});
  panel.querySelector('[data-person-follow]').addEventListener('click',e=>{following=!following;e.currentTarget.setAttribute('aria-pressed',String(following));e.currentTarget.textContent=following?'Stop following':'Follow resident';api.getWorld()?.selectResident(actor,following);});
  function showBuilding(kind){
    const target=P.residentBuilding(C,api.getState(),api.getAnalysis(),actor,kind);if(!target)return;
    following=false;panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');panel.querySelector('[data-person-follow]').textContent='Follow resident';api.inspectTile?.(target.i);
    if(api.getWorld()){api.getWorld().showResidentBuilding(actor,kind);panel.dataset.mapFocus=kind;panel.querySelector('[data-person-back]').hidden=false;const status=panel.querySelector('.gc-person-building-status');status.hidden=false;status.textContent=target.name+' · '+C.label(target.i)+' · highlighted on the map';}
    api.announce(target.resident+'’s '+(kind==='home'?'home':'workplace')+' highlighted: '+target.name+' at '+C.label(target.i)+'.');
  }
  panel.querySelector('[data-person-home]').addEventListener('click',()=>showBuilding('home'));
  panel.querySelector('[data-person-work]').addEventListener('click',()=>showBuilding('work'));
  panel.querySelector('[data-person-back]').addEventListener('click',()=>{delete panel.dataset.mapFocus;panel.querySelector('.gc-person-building-status').hidden=true;api.getWorld()?.clearResidentBuilding();detail();api.getWorld()?.showResident(actor);});
  panel.querySelector('[data-person-needs]').addEventListener('click',()=>{const home=actor.from;close();api.openNeighbourhood(home);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopImmediatePropagation();close();browse.focus({preventScroll:true});}},true);
  return {
    openResident,close,
    refreshDaily(){if(panel.hidden||!actor)return;const report=P.resident(C,api.getState(),api.getAnalysis(),actor,api.getWorld()?.residentActivity(actor));if(!report)return;panel.querySelector('.gc-person-purpose').textContent=report.purpose;panel.querySelector('[data-person-destination]').textContent=report.destination+' · '+C.label(report.to);panel.querySelector('[data-person-route]').textContent=report.routeDetail||report.links+' road links · out and back';},
    stopFollowing(){following=false;panel.querySelector('[data-person-follow]').setAttribute('aria-pressed','false');panel.querySelector('[data-person-follow]').textContent='Follow resident';},
    preview(action){
      if(action.mode!=='inspect'&&!panel.hidden)close();
      if(!['build','move','upgrade','road','land'].includes(action.mode)){summary.hidden=true;api.getWorld()?.setForecast(null);return;}
      const state=api.getState();if(state!==cacheState){cacheState=state;cache.clear();}
      const id=JSON.stringify(action);let report=cache.get(id);
      if(report===undefined){report=P.forecast(C,state,action,api.getAnalysis());if(cache.size>40)cache.clear();cache.set(id,report);}
      summary.hidden=!report||!!report.error;api.getWorld()?.setForecast(report?.error?null:report);
      if(summary.hidden)return;
      const effect=report.homes.flatMap(home=>home.changes.map(change=>({...change,i:home.i}))).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0];
      const metricNames={shade:'Shade',mobility:'Transit access',health:'Healthcare',safety:'Emergency cover',services:'Services',noise:'Noise',pollution:'Local pollution',commute:'Congestion',connection:'Road link'};
      summary.innerHTML=`<div><span>Upfront <b>${report.cost} EP</b></span><span>Upkeep change <b>${signed(report.upkeep)} EP/mo</b></span><span>Monthly balance <b class="${report.net<0?'is-negative':''}">${signed(report.net)} EP <small>(${signed(report.netChange)})</small></b></span></div><p>${report.better} homes improved${report.worse?' · '+report.worse+' with trade-offs':''}${effect?' · '+metricNames[effect.key]+' '+signed(effect.delta)+' at '+C.label(effect.i):''} · City happiness ${signed(report.happinessChange)}${report.cleanPowerChange?' · Clean power '+signed(report.cleanPowerChange):''}</p>${report.jobsChange||report.capacityChange?`<p>Jobs ${signed(report.jobsChange)} · Housing capacity ${signed(report.capacityChange)}</p>`:''}${report.connection?`<p class="${report.connection.revenue<report.connection.upkeep?'is-negative':''}">${Math.round(report.connection.utilisation*100)}% used · Revenue ${report.connection.revenue} EP / upkeep ${report.connection.upkeep} EP per month${report.connection.revenue<report.connection.upkeep?' · Demand does not cover running costs.':''}</p>`:''}${action.mode==='build'&&C.types[action.type]?.need==='health'?`<p>Healthcare reach: ${C.types[action.type].radius} tiles · ${api.getAnalysis().homeProfiles.filter(h=>C.distance(action.i,h.i)<C.types[action.type].radius).length} home plots in range · ${report.homes.filter(h=>h.changes.some(c=>c.key==='health'&&c.delta>0)).length} improved</p>`:''}${C.types[action.type]?.localPollution?`<p class="gc-industry-tradeoff">Business taxes ${signed(report.businessTaxChange)} EP/mo · Air quality ${signed(report.airChange)} points · Power demand ${signed(report.powerDemandChange)} units. Tax income depends on available workers; nearby homes face pollution and noise.</p>`:''}<p class="gc-preview-key"><i></i>Area of influence <i></i>Improved home <i></i>Trade-off · forecast, before grants</p><span class="sr-only">Affected homes: ${report.homes.map(home=>C.label(home.i)+' '+home.kind).join(', ')||'none'}.</span>`;
    },
    render(){if(!panel.hidden){refreshJourneys();const current=journeys.find(p=>key(p)===key(actor));if(current){actor=current;detail();}else{close();api.announce('This journey changed as the city developed. Choose another resident.');}}}
  };
}
