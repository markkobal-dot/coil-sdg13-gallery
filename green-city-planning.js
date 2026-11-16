/* Read-only planning reports. Forecasts use the same rules as confirmed city actions. */
(function(host){
  'use strict';
  function forecast(C,state,action,before=C.analyse(state)){
    const {mode,type,i,rotation=0,source,start}=action;
    let result;
    if(mode==='build')result=C.place(state,type,i,rotation);
    else if(mode==='move'&&source!==null)result=C.relocate(state,source,i,rotation);
    else if(mode==='upgrade')result=C.upgrade(state,i);
    else if(mode==='road'&&start!==null)result=C.buildLine(state,start,i);
    else return null;
    if(result.error)return {error:result.error,homes:[],coverage:[]};
    const after=C.analyse(result.state),oldHomes=new Map(before.homeProfiles.map(h=>[h.i,h]));
    const homes=after.homeProfiles.flatMap(home=>{
      const old=oldHomes.get(home.i);if(!old)return [];
      const changes=['shade','mobility','health','safety','services','noise','commute'].flatMap(key=>{
        const delta=home[key]-old[key];return delta?[{key,delta,benefit:['noise','commute'].includes(key)?-delta:delta}]:[];
      });
      if(home.linked!==old.linked)changes.push({key:'connection',delta:home.linked?1:-1,benefit:home.linked?1:-1});
      if(!changes.length)return [];
      const positive=changes.some(c=>c.benefit>0),negative=changes.some(c=>c.benefit<0);
      return [{i:home.i,kind:positive&&negative?'mixed':negative?'worse':'better',changes}];
    });
    const meta=C.upgrades[type],radius=mode==='build'?(C.greenTypes.has(type)?4:meta?.transportRadius||(['bus','ev','tram','bikeshare'].includes(type)?type==='tram'?7:6:meta?.radius||(['school','clinic'].includes(type)?6:0))):0;
    const coverage=radius?C.terrain.flatMap((t,j)=>t==='land'&&C.distance(i,j)<radius?[j]:[]):[];
    return {error:'',cost:state.cash-result.state.cash,upkeep:after.budget.assetUpkeep-before.budget.assetUpkeep,
      net:after.net,netChange:after.net-before.net,happiness:after.happiness,happinessChange:after.happiness-before.happiness,
      cleanPowerChange:after.cleanPower-before.cleanPower,homes,coverage,
      better:homes.filter(h=>h.kind==='better').length,worse:homes.filter(h=>h.kind==='worse'||h.kind==='mixed').length};
  }
  function resident(C,state,analysis,actor){
    if(!actor||!state.cells[actor.from]||!state.cells[actor.to])return null;
    const home=analysis.neighbourhoods.find(h=>h.i===actor.from),conditions=analysis.homeProfiles.find(h=>h.i===actor.from);
    if(!home||!conditions)return null;
    const purpose={house:'Visiting neighbours',apartment:'Visiting neighbours',park:'Visiting a park',garden:'Visiting the community garden',plaza:'Meeting neighbours',playground:'Visiting the playground',market:'Shopping locally',school:'Going to the learning centre',library:'Visiting the library',office:'Going to work',clinic:'Visiting the clinic',hospital:'Visiting the hospital',bus:'Walking to a bus stop',tram:'Walking to the tram',metro:'Walking to the metro',bikeshare:'Picking up a bicycle',ferry:'Walking to the ferry',stadium:'Visiting the sports grounds',marina:'Visiting the waterfront'};
    const priority=home.needs[0];
    return {name:['Alex','Maya','Sam','Robin','Leo','Charlie','Noor','Jamie'][(actor.from+actor.id)%8],
      from:actor.from,to:actor.to,purpose:actor.activity==='work'?'Going to work':purpose[actor.purpose]||'Travelling locally',destination:C.types[state.cells[actor.to].type].name,
      links:Math.max(0,actor.path.length-1),priority:priority?C.localNeeds[priority.id].label:'Well-supported neighbourhood',
      detail:priority?C.localNeeds[priority.id].message:'Local roads, shade and services are meeting this neighbourhood’s needs.',
      shade:conditions.shade,transport:conditions.mobility,noise:conditions.noise,happiness:analysis.happiness};
  }
  const districts=[['OLD TOWN',-7.8,.6,-8.5],['CENTRAL NEIGHBOURHOODS',1,.6,-5],['SOUTHERN MEADOWS',5,.6,7],['WEST BAY',-12,.6,-3]];
  function district(C,i){const r=Math.floor(i/C.size),c=i%C.size;return c<4&&r>=8&&r<=15?'West Bay':r>=18?'Southern Meadows':r<9&&c<10?'Old Town':'Central Neighbourhoods';}
  function groundColour(C,i){
    if(C.neighbours(i).some(j=>C.terrain[j]==='water'))return '#d4c9a3';
    const name=district(C,i),patch=Math.sin(i*.38+Math.floor(i/C.size)*.8)>0;
    return name==='Southern Meadows'?(patch?'#7fa16b':'#8bab74'):name==='Old Town'?(patch?'#b5b097':'#bdb69c'):(patch?'#99b18b':'#a2ba92');
  }
  const api={forecast,resident,district,districts,groundColour};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityPlanning=api;
})(globalThis);
