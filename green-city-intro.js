/* Guided introduction helpers; city actions and rewards remain owned by the simulation. */
(function(host){
  'use strict';
  function entry(C,state,a,walkers=[]){
    const report=C.neighbourhoodMissions(state,a).find(m=>m.id==='shade');
    if(report.completed)return {kind:'completed',record:report.completed};
    if(state.missions?.active&&state.missions.active.id!=='shade')return {kind:'busy'};
    const home=report.active?.home??report.candidates.find(h=>walkers.some(p=>p.from===h.i))?.i??report.candidates[0]?.i;
    if(home===undefined)return {kind:'unavailable'};
    const profile=a.homeProfiles.find(h=>h.i===home);
    return {kind:report.active?'resume':'start',home,baseline:report.active?.baseline??profile.shade,started:report.active?.started??state.month,actor:walkers.find(p=>p.from===home)||null};
  }
  function status(C,state,session,a=C.analyse(state)){
    if(!session)return {kind:'inactive'};
    const record=state.missions?.completed.find(m=>m.id==='shade'&&m.home===session.home&&m.baseline===session.baseline);
    if(record)return {kind:'completed',record,reward:C.neighbourhoodMissionDefs.find(m=>m.id==='shade').reward};
    const active=state.missions?.active;
    if(active?.id!=='shade'||active.home!==session.home||active.baseline!==session.baseline||active.started!==session.started)return {kind:'detached'};
    const home=a.homeProfiles.find(h=>h.i===session.home);
    if(!home)return {kind:'missing'};
    return {kind:'active',home,value:home.shade,target:40};
  }
  function nextPlan(C,state,home,a=C.analyse(state)){
    const profile=a.homeProfiles.find(h=>h.i===home);
    if(!profile?.linked)return {error:'Reconnect this home to the regional roads before continuing.'};
    const need=C.neighbourhoodInfo(state,home,a,'shade')?.priorities.find(p=>p.id==='shade');
    if(need?.action?.kind==='build'&&need.forecast?.after>profile.shade){
      return {...need.action,kind:'build',before:profile.shade,after:need.forecast.after};
    }
    // A dense city can improve an existing green space rather than requiring a free plot.
    const options=[];
    state.cells.forEach((cell,i)=>{
      if(!cell||cell.anchor!==undefined||!C.greenTypes.has(cell.type)||cell.level>=3||C.distance(home,i)>=4)return;
      const cost=C.upgradeCost(cell),result=C.upgrade({...state,cash:Math.max(state.cash,cost)},i);if(result.error)return;
      const after=C.analyse(result.state).homeProfiles.find(h=>h.i===home)?.shade;
      if(after>profile.shade)options.push({kind:'upgrade',type:cell.type,target:i,level:cell.level,cost,affordable:state.cash>=cost,before:profile.shade,after});
    });
    options.sort((x,y)=>x.cost-y.cost||y.after-x.after||x.target-y.target);
    return options[0]||{error:'There is no suitable green-space improvement here. Use local feedback to review the neighbourhood, or skip the introduction.'};
  }
  function restore(C,state,raw,a=C.analyse(state)){
    if(!raw||raw.status!=='active'||!Number.isInteger(raw.home)||raw.home<0||raw.home>=C.size*C.size||!Number.isInteger(raw.baseline)||raw.baseline<0||raw.baseline>=40||!Number.isInteger(raw.started)||raw.started<1||raw.started>state.month||![1,2,3,4].includes(raw.stage))return null;
    const session={home:raw.home,baseline:raw.baseline,started:raw.started,stage:raw.stage===3?2:raw.stage};
    const report=status(C,state,session,a);return ['active','completed','missing'].includes(report.kind)?session:null;
  }
  const ownsReward=(session,reward)=>!!session&&reward?.id==='shade'&&reward.home===session.home&&reward.baseline===session.baseline;
  const api={entry,status,nextPlan,restore,ownsReward};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityIntro=api;
})(globalThis);
