/* Local resident feedback. Every value comes from the current simulation. */
import {needIcon} from './green-city-neighbourhood-icons.js?v=98db9558ad';
const C=globalThis.GreenCity;
export function createNeighbourhoods(api,dialog){
 const $=id=>document.getElementById('gc-'+id),number=n=>Math.round(n).toLocaleString('en-GB');
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let selected=null,filter='attention',current=null,currentMission=null;
 const view=document.createElement('div');view.id='gc-neighbourhood-view';view.hidden=true;
 view.innerHTML=`<div class="gc-neighbourhood-intro"><div><span class="gc-overline">RESIDENTS / CLOSE TO HOME</span><h4>What this neighbourhood needs</h4><p>Choose a home, review a suggested improvement, then confirm it on the map.</p></div><span id="gc-local-count"></span></div><div class="gc-neighbourhood-layout"><aside class="gc-neighbourhood-browser"><label>Explore homes<select id="gc-local-filter"><option value="attention">Needs attention first</option><option value="all">All homes</option></select></label><label>Jump to a home<select id="gc-local-picker"></select></label><div id="gc-local-list" class="gc-local-list" aria-label="Neighbourhood locations"></div><p id="gc-local-list-note"></p></aside><section id="gc-local-detail" class="gc-local-detail" aria-label="Selected neighbourhood"></section></div>`;
 dialog.querySelector('.gc-resident-footer').before(view);
 function render(target){
  if(Number.isInteger(target))selected=target;
  const state=api.getState(),a=api.getAnalysis(),all=[...a.neighbourhoods].sort((x,y)=>y.urgency-x.urgency||x.i-y.i);
  if(!all.some(h=>h.i===selected))selected=all[0]?.i??null;
  const attention=all.filter(h=>h.needs.length),list=filter==='attention'?all.filter(h=>h.needs.length||h.i===selected):all;
  $('local-count').textContent=attention.length+' / '+all.length+' home plots have unmet needs';
  const shown=list.slice(0,24);if(!shown.some(h=>h.i===selected)&&list.some(h=>h.i===selected))shown.push(list.find(h=>h.i===selected));
  $('local-picker').innerHTML=all.map(h=>`<option value="${h.i}" ${h.i===selected?'selected':''}>${C.label(h.i)} · ${h.needs.length?C.localNeeds[h.primary].label:'Well supported'}</option>`).join('');
  $('local-list-note').textContent=list.length>24?'Showing the first 24 priority locations. Use Jump to a home to explore any location.':'';
  $('local-list').innerHTML=shown.length?shown.map(h=>`<button type="button" data-gc-local-home="${h.i}" aria-pressed="${h.i===selected}" aria-label="${C.label(h.i)}. ${h.needs.length?C.localNeeds[h.primary].label:'Well supported'}. ${h.needs.length} local needs."><span class="gc-local-symbol ${h.urgency>=70?'is-urgent':h.needs.length?'':'is-supported'}">${needIcon(h.primary)}</span><span><strong>${C.label(h.i)} <small>${number(h.residents)} residents</small></strong><span>${h.needs.length?C.localNeeds[h.primary].label:'Well supported'}</span></span><b aria-hidden="true">↗</b></button>`).join(''):'<p class="gc-local-empty">No homes need attention. Switch to All homes to explore your neighbourhoods.</p>';
  currentMission=C.neighbourhoodMissions(state,a).find(m=>m.active?.home===selected)||null;
  const home=a.homeProfiles.find(h=>h.i===selected);
  const focusNeed=currentMission&&(home?.[currentMission.metric]<currentMission.target||currentMission.id==='transit'&&currentMission.checks.some(c=>c.name==='Nearby public transport'&&!c.done))?currentMission.metric:null;
  current=selected===null?null:C.neighbourhoodInfo(state,selected,a,focusNeed);renderDetail();
 }
 function renderDetail(){
  if(!current){$('local-detail').innerHTML='<div class="gc-local-empty">Build connected homes to start a neighbourhood.</div>';return;}
  const h=current.conditions;
  const otherNeeds=current.needs.filter(need=>!current.priorities.some(plan=>plan.id===need.id));
  const missionHint=currentMission?.id==='care'&&h.health>=currentMission.target?'Healthcare target reached. Open the treasury and make monthly income cover costs.':currentMission?.hint;
  const missionNote=currentMission?`<div class="gc-local-mission"><strong>${currentMission.name}</strong><span>${{shade:'Shade',mobility:'Transport access',health:'Healthcare'}[currentMission.metric]} ${h[currentMission.metric]} / ${currentMission.target}</span><p>${escape(missionHint)}</p></div>`:'';
  const metrics=[['shade','Shade',h.shade],['mobility','Transport access',h.mobility],['health','Healthcare',h.health],['safety','Emergency cover',h.safety],['services','Shared services',h.services],['noise','Quiet streets',Math.max(0,100-h.noise)]];
  $('local-detail').innerHTML=`<header class="gc-local-heading"><div><span class="gc-overline">${current.status.toUpperCase()}</span><h4>${current.name}</h4><p>${current.building} · about ${number(current.residents)} residents</p></div><button type="button" id="gc-local-locate">Show on map ↗</button></header><div class="gc-local-connection ${h.linked?'':'is-disconnected'}">${h.linked?'● Connected to regional roads':'○ No connection to regional roads'}<span>${h.routeRiders||0} named-line riders · Journey congestion ${h.commute}%</span></div><div class="gc-local-metrics">${metrics.map(([id,name,value])=>`<div><span>${needIcon(id)}${name}</span><strong>${value}<small>/100</small></strong><i aria-hidden="true"><span style="width:${value}%"></span></i></div>`).join('')}</div>${missionNote}<div class="gc-local-priorities-heading"><h4>${current.needs.length?'What would help here':'A well-supported neighbourhood'}</h4><span>${current.needs.length?'YOUR NEXT PRIORITIES':'KEEP IT ACCESSIBLE'}</span></div>${current.priorities.length?current.priorities.map((need,n)=>renderNeed(need,n)).join(''):'<p class="gc-local-success">Local roads, shade, transport and services are supporting these homes. Keep them available as your city grows.</p>'}${otherNeeds.length?`<p class="gc-local-other">Also worth improving: ${otherNeeds.map(n=>C.localNeeds[n.id].label.toLowerCase()).join(', ')}.</p>`:''}<p class="gc-local-explainer">Plan selects a building and a nearby plot. Confirm with Build on the map; planning alone spends no Eco Points.</p>`;
  $('local-locate').addEventListener('click',()=>{dialog.close();api.focusTile(current.i,'neighbourhood');});
 }
 function renderNeed(need,n){
  const a=need.action,metricNames={shade:'Shade',mobility:'Transport access',health:'Healthcare',safety:'Emergency cover',services:'Shared services'};
  let detail=need.message,label='',extra='';
  if(need.source)detail+=' Main source: '+C.types[need.source.type].name+' at '+C.label(need.source.i)+', contributing about '+need.source.value+' noise points.';
  if(a?.kind==='build'){
   label=({park:'Plan a park',tree:'Plan trees',bus:'Plan a bus stop',clinic:'Plan a clinic',firestation:'Plan fire station',library:'Plan a library'})[a.type]||'Plan '+C.upgrades[a.type].name.toLowerCase();
   extra=`<div class="gc-local-plan-facts"><span>${a.cost} EP to build · ${a.upkeep} EP base upkeep / month</span><span>Suggested plot ${C.label(a.target)} · ${a.affordable?'Within your treasury':'Save more Eco Points before building'}</span></div>`;
   if(need.forecast)extra+=`<div class="gc-local-forecast">${metricNames[need.forecast.metric]} here: <strong>${need.forecast.before} → ${need.forecast.after}<small>/100</small></strong><span>Forecast if built at ${C.label(a.target)}.</span></div>`;
  }else if(a?.kind==='inspect')label='Inspect source';
  else if(a?.kind==='road')label='Connect roads';
  else if(a?.kind==='transport')label='Review routes';
  return `<article class="gc-local-need${currentMission?.metric===need.id?' is-mission-priority':''}" data-local-need="${need.id}"><span class="gc-local-symbol ${need.severity>=70?'is-urgent':''}">${needIcon(need.id)}</span><div><h5>${need.label}</h5><p>${escape(detail)}</p>${extra}${a?`<button type="button" data-gc-local-plan="${n}">${label} <span aria-hidden="true">↗</span></button>`:'<p class="gc-local-limited">Space nearby is limited. Inspect neighbouring plots to make room for a service.</p>'}</div></article>`;
 }
 $('local-list').addEventListener('click',event=>{const b=event.target.closest('[data-gc-local-home]');if(b)render(Number(b.dataset.gcLocalHome));});
 $('local-filter').addEventListener('change',()=>{filter=$('local-filter').value;render();});
 $('local-picker').addEventListener('change',()=>render(Number($('local-picker').value)));
 $('local-detail').addEventListener('click',event=>{
  const b=event.target.closest('[data-gc-local-plan]');if(!b||!current)return;
  const need=current.priorities[Number(b.dataset.gcLocalPlan)],a=need?.action;if(!a)return;
  dialog.close();
  if(a.kind==='build'){api.choose(a.type);api.focusPlan(a.target);api.announce(C.upgrades[a.type].name+' planned at '+C.label(a.target)+' near '+C.label(current.i)+'. '+a.cost+' EP to build. '+(a.affordable?'Choose Build at '+C.label(a.target)+' to confirm.':'Earn more Eco Points before building.'));}
  else if(a.kind==='road'){api.focusTile(a.target,'neighbourhood');api.setMode('road');api.announce('Connect roads near '+C.label(a.target)+' to the regional gateway. Choose a start and end on clear land or existing roads.');}
  else if(a.kind==='inspect')api.focusTile(a.target,a.overlay);
  else if(a.kind==='transport')api.openTransport();
 });
 return {view,render};
}
