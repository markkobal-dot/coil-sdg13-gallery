/* Read-only planning reports. Forecasts use the same rules as confirmed city actions. */
(function(host){
  'use strict';
  function forecast(C,state,action,before=C.analyse(state)){
    const {mode,type,i,rotation=0,source,start}=action;
    let result;
    if(mode==='land')result=C.reclaimLand(state,i);
    else if(mode==='build')result=C.place(state,type,i,rotation);
    else if(mode==='move'&&source!==null)result=C.relocate(state,source,i,rotation);
    else if(mode==='upgrade')result=C.upgrade(state,i);
    else if(mode==='road'&&start!==null)result=C.buildLine(state,start,i);
    else return null;
    if(result.error)return {error:result.error,homes:[],coverage:[]};
    const after=C.analyse(result.state),oldHomes=new Map(before.homeProfiles.map(h=>[h.i,h]));
    const homes=after.homeProfiles.flatMap(home=>{
      const old=oldHomes.get(home.i);if(!old)return [];
      const changes=['shade','mobility','health','safety','services','noise','commute','pollution'].flatMap(key=>{
        const delta=(home[key]||0)-(old[key]||0);return delta?[{key,delta,benefit:['noise','commute','pollution'].includes(key)?-delta:delta}]:[];
      });
      if(home.linked!==old.linked)changes.push({key:'connection',delta:home.linked?1:-1,benefit:home.linked?1:-1});
      if(!changes.length)return [];
      const positive=changes.some(c=>c.benefit>0),negative=changes.some(c=>c.benefit<0);
      return [{i:home.i,kind:positive&&negative?'mixed':negative?'worse':'better',changes}];
    });
    const meta=C.upgrades[type],radius=mode==='build'?(C.greenTypes.has(type)?4:meta?.transportRadius||(['bus','ev','tram','bikeshare'].includes(type)?type==='tram'?7:6:meta?.radius||(['school','clinic'].includes(type)?6:0))):0;
    const coverage=radius?C.terrainFor(state).flatMap((t,j)=>t==='land'&&C.distance(i,j)<radius?[j]:[]):[];
    return {error:'',cost:state.cash-result.state.cash,upkeep:after.budget.assetUpkeep-before.budget.assetUpkeep,
      net:after.net,netChange:after.net-before.net,happiness:after.happiness,happinessChange:after.happiness-before.happiness,
      airChange:after.scores[0]-before.scores[0],powerDemandChange:after.demand-before.demand,businessTaxChange:after.budget.businessRevenue-before.budget.businessRevenue,cleanPowerChange:after.cleanPower-before.cleanPower,homes,coverage,jobsChange:after.jobs-before.jobs,capacityChange:after.capacity-before.capacity,connection:after.connections.find(c=>c.i===i),
      better:homes.filter(h=>h.kind==='better').length,worse:homes.filter(h=>h.kind==='worse'||h.kind==='mixed').length};
  }
  function resident(C,state,analysis,actor,current=null){
    if(!actor||!state.cells[actor.from]||!state.cells[actor.to])return null;
    const home=analysis.neighbourhoods.find(h=>h.i===actor.from),conditions=analysis.homeProfiles.find(h=>h.i===actor.from);
    if(!home||!conditions||conditions.residents<=0)return null;
    const purpose={luxuryhouse:'Visiting neighbours',luxuryapartment:'Visiting neighbours',regionalhospital:'Visiting the regional hospital',officepark:'Going to work',internationalairport:'Going to work',containerport:'Going to work',house:'Visiting neighbours',apartment:'Visiting neighbours',park:'Visiting a park',garden:'Visiting the community garden',plaza:'Meeting neighbours',playground:'Visiting the playground',market:'Shopping locally',school:'Going to the learning centre',library:'Visiting the library',office:'Going to work',clinic:'Visiting the clinic',hospital:'Visiting the hospital',bus:'Walking to a bus stop',tram:'Walking to the tram',metro:'Walking to the metro',bikeshare:'Picking up a bicycle',ferry:'Walking to the ferry',stadium:'Visiting the sports grounds',marina:'Visiting the waterfront'};
    const priority=home.needs[0];
    const workplace=analysis.workplaces?.find(w=>w.i===actor.workplace&&w.linked&&w.filled>0);
    const wealthSeed=(Math.sin(actor.from*31+actor.id*17)*43758.5453)%1;
    const income=(wealthSeed+1)%1<(conditions.affluentShare||0)?'Affluent':workplace?(['office','officepark','ecofactory','gamestudio','ailab','geothermal','hospital','regionalhospital','internationalairport'].includes(workplace.type)?'Comfortable':'Working income'):'Limited income';
    const roles=workplace&&(C.types[workplace.type].professions||({office:['Software engineer','Energy consultant'],officepark:['Research engineer','Software developer'],hospital:['Nurse','Doctor'],regionalhospital:['Doctor','Nurse','Medical technician'],clinic:['Nurse','Community doctor'],factory:['Factory technician'],school:['Teacher'],library:['Librarian'],airport:['Ground crew'],internationalairport:['Air traffic controller','Airport technician'],cargoport:['Port worker'],containerport:['Logistics specialist'],solarfarm:['Solar technician'],wind:['Turbine technician'],recycling:['Recycling technician'],market:['Market trader']}[workplace.type]||['City worker']));
    const profession=actor.student?'Student':roles?roles[(actor.from+actor.id)%roles.length]:'Looking for work';
    const factors=[{name:'City life',score:analysis.happiness,weight:.4},{name:'Shade',score:conditions.shade,weight:.12},{name:'Healthcare',score:conditions.health,weight:.12},{name:'Services',score:conditions.services,weight:.1},{name:'Getting around',score:conditions.mobility,weight:.12},{name:'Quiet surroundings',score:100-conditions.noise,weight:.14}];
    const happiness=C.homeHappiness(conditions,analysis,actor.student?undefined:!!workplace);
    const mood=happiness>=75?'Thriving':happiness>=60?'Content':happiness>=40?'Uneasy':'Unhappy';
    const positive=[...factors].filter(f=>f.score>=60).sort((a,b)=>b.score-a.score)[0],negative=[...factors].filter(f=>f.score<40).sort((a,b)=>a.score-b.score)[0];
    const good={'City life':'Feels good about city life.',Shade:'Enjoys shade near home.',Healthcare:'Has good access to healthcare.',Services:'Has useful services nearby.','Getting around':'Can get around easily.','Quiet surroundings':'Lives on a quiet street.'};
    const bad={'City life':'Citywide conditions are weighing on them.',Shade:'Wants more shade near home.',Healthcare:'Needs better healthcare nearby.',Services:'Needs better local services.','Getting around':'Wants better transport near home.','Quiet surroundings':'Noise near home is a problem.'};
    return {name:['Alex','Maya','Sam','Robin','Leo','Charlie','Noor','Jamie'][(actor.from+actor.id)%8],
      from:actor.from,to:current?.location??actor.to,purpose:current?.label||(actor.activity==='work'?'Going to work':purpose[actor.purpose]||'Travelling locally'),destination:C.types[state.cells[current?.location??actor.to].type].name,routeDetail:current?(actor.beachCar?current.label+' · '+(current.at==='home'?'home':C.label(actor.beachCar.lot)+' parking'):['waiting','aboard'].includes(current.at)?current.label:current.visible?'Walking · '+(current.trip?.path.length-1||0)+' road links':current.at==='home'?'At home':'Inside the building'):null,
      links:Math.max(0,actor.path.length-1),priority:priority?C.localNeeds[priority.id].label:'Well-supported neighbourhood',
      detail:priority?C.localNeeds[priority.id].message:'Local roads, shade and services are meeting this neighbourhood’s needs.',
      shade:conditions.shade,health:conditions.health,safety:conditions.safety,transport:conditions.mobility,noise:conditions.noise,pollution:conditions.pollution||0,happiness,mood,profession,
      happinessDetail:[positive&&good[positive.name],conditions.pollution>=15?'Industrial pollution near home is a problem.':negative&&bad[negative.name],!workplace&&!actor.student&&'Looking for a job.'].filter(Boolean).join(' '),
      homeResidents:conditions.residents,homeCapacity:conditions.capacity,homeDemand:conditions.housingDemand,housing:C.types[state.cells[actor.from].type].name,income:actor.student?'Household support':income,workplace:workplace?{i:workplace.i,name:C.types[workplace.type].name,filled:workplace.filled,positions:workplace.positions}:null,employment:actor.student?'In education':workplace?'Employed':'Not currently employed'};
  }
  const districts=[['OLD TOWN',-7.8,.6,-8.5],['CENTRAL NEIGHBOURHOODS',1,.6,-5],['SOUTHERN MEADOWS',0,.6,9],['WEST BAY',-12,.6,-3],['EASTERN WATERFRONT',9,.6,1]];
  function district(C,i){const r=Math.floor(i/C.size),c=i%C.size;return c>=19?'Eastern Waterfront':c<4&&r>=8&&r<=15?'West Bay':r>=19?'Southern Meadows':r<9&&c<10?'Old Town':'Central Neighbourhoods';}
  function groundColour(C,i,state){
    if(C.neighbours(i).some(j=>C.terrainAt(state,j)==='water'))return '#d4c9a3';
    const name=district(C,i),patch=Math.sin(i*.38+Math.floor(i/C.size)*.8)>0;
    return name==='Southern Meadows'?(patch?'#7fa16b':'#8bab74'):name==='Old Town'?(patch?'#b5b097':'#bdb69c'):(patch?'#99b18b':'#a2ba92');
  }
  function healthcare(C,state,analysis,i){
    i=C.anchorAt(state,i);const cell=state.cells[i],meta=cell&&C.types[cell.type];if(meta?.need!=='health')return null;
    return {radius:meta.radius,homes:analysis.homeProfiles.filter(h=>h.linked&&C.footprint(cell.type,i,cell.rotation).some(j=>C.distance(j,h.i)<meta.radius)).length,linked:C.tileInfo(state,i,analysis).linked};
  }
  function priorities(C,state,a){
    const items=[],disconnected=a.homeProfiles.filter(h=>!h.linked),lowCare=a.homeProfiles.filter(h=>h.health<20),lowShade=a.homeProfiles.filter(h=>h.shade<25);
    if(a.net<0)items.push({id:'budget',title:'Bring the budget back into balance',detail:Math.abs(a.net)+' EP more is going out than coming in each month. Check running costs before another major project.',action:'budget'});
    if(disconnected.length)items.push({id:'roads',title:'Reconnect homes',detail:disconnected.length+' home plots have lost road access.',home:disconnected[0].i});
    if(state.population>=a.capacity*.85)items.push({id:'housing',title:'Make room for residents',detail:state.population+' residents / '+Math.round(a.capacity)+' housing capacity. Add homes before the city becomes crowded.',type:a.tier>=2?'apartment':'house'});
    if(a.employment<85)items.push({id:'jobs',title:'Create local jobs',detail:a.employment+'% employment. Match new workplaces to your budget and electricity supply.',type:a.tier>=2?'gamestudio':'market'});
    if(a.cleanPower<a.demand*.65)items.push({id:'power',title:'Supply more clean electricity',detail:Math.round(a.cleanPower)+' clean power units / '+a.demand+' needed. Imported power adds to the monthly bill.',type:'solar'});
    if(lowCare.length)items.push({id:'health',title:'Bring care closer to homes',detail:lowCare.length+' home plots have healthcare below 20/100. Start with a clinic near a connected street.',type:'clinic',home:lowCare[0].i});
    if(lowShade.length)items.push({id:'shade',title:'Cool the neighbourhood',detail:lowShade.length+' home plots have shade below 25/100. Nearby trees and parks will help.',type:'tree',home:lowShade[0].i});
    return items.slice(0,3).map(item=>({...item,...(item.type?{cost:C.upgrades[item.type].cost,affordable:state.cash>=C.upgrades[item.type].cost}:{})}));
  }
  function residentBuilding(C,state,analysis,actor,kind='home'){
    const report=resident(C,state,analysis,actor);if(!report||!['home','work'].includes(kind))return null;
    const i=kind==='home'?report.from:report.workplace?.i;if(i===undefined)return null;
    const anchor=C.anchorAt(state,i),cell=state.cells[anchor];if(!cell)return null;
    return {i:anchor,kind,name:C.types[cell.type].name,resident:report.name,label:(kind==='home'?'Home':'Workplace')+' · '+C.label(anchor),plots:C.footprint(cell.type,anchor,cell.rotation),dimensions:C.dimensions(cell.type,cell.rotation)};
  }

  // Visual time is separate from the monthly financial simulation.
  function daylight(seconds){
    const phase=((seconds%180)+180)%180/180,raw=(1-Math.cos(phase*Math.PI*2))/2;
    const t=Math.max(0,Math.min(1,(raw-.28)/.52)),darkness=t*t*(3-2*t);
    const hour=Math.floor((12+phase*24)%24);
    return {darkness,hour,label:darkness>.85?'Night':darkness<.15?'Day':phase<.5?'Sunset':'Sunrise'};
  }
  function buildingActivity(C,state,a,i){
    i=C.anchorAt(state,i);const home=a.homeProfiles.find(h=>h.i===i),work=a.workplaces.find(w=>w.i===i);
    const housing=home?Math.max(0,Math.min(1,home.residents/Math.max(1,home.capacity))):null;
    const staffing=work?Math.max(0,Math.min(1,work.filled/Math.max(1,work.positions))):0;
    return {housing,staffing,lit:Math.max(housing??0,staffing)};
  }
  function occupancyMap(C,state,a,i,mode){
    i=C.anchorAt(state,i);const item=mode==='housing'?a.homeProfiles.find(h=>h.i===i):a.workplaces.find(w=>w.i===i);
    if(!item)return null;
    return Math.max(0,Math.min(100,Math.round(100*(mode==='housing'?item.residents/Math.max(1,item.capacity):item.filled/Math.max(1,item.positions)))));
  }
  function unlocks(C,before,after){
    const from=C.analyse(before).tier,to=C.analyse(after).tier;
    const levels=C.developmentLevels.filter(d=>d.level>from&&d.level<=to);
    const grants=C.grantDefs.filter(g=>!before.grants.includes(g.id)&&after.grants.includes(g.id));
    return {levels,grants,buildings:Object.values(C.types).filter(t=>t.unlock>from&&t.unlock<=to).map(t=>t.name)};
  }

  // Attribute city tax and maintenance totals exactly, including their rounding.
  function budgetShare(total,items,i){
    const sum=items.reduce((s,x)=>s+x.weight,0);if(!sum)return 0;
    const rows=items.map(x=>{const exact=total*x.weight/sum;return {...x,value:Math.floor(exact),fraction:exact-Math.floor(exact)};});
    let left=total-rows.reduce((s,x)=>s+x.value,0);rows.sort((a,b)=>b.fraction-a.fraction||a.i-b.i);for(const row of rows)if(left-->0)row.value++;
    return rows.find(x=>x.i===i)?.value||0;
  }
  function business(C,state,a,i){
    i=C.anchorAt(state,i);const cell=state.cells[i];if(!cell)return null;const meta=C.types[cell.type],work=a.workplaces.find(w=>w.i===i),connection=a.connections.find(c=>c.i===i);
    const defaults={factory:48,coal:24,apartment:18,school:20,clinic:18,recycling:24,waterworks:18,wind:6,battery:6,heat:12,garden:4,tree:2,park:2,forest:2,wetland:2};
    const factor=1+(cell.level-1)*.5,positions=work?.positions??Math.round(((meta.jobs??defaults[cell.type]??0)+(cell.roof==='solar'?2:0))*factor);
    if(!positions&&!connection)return null;
    const tax=budgetShare(a.budget.businessRevenue-Math.round(a.budget.specialistTax),a.workplaces.map(w=>({i:w.i,weight:w.filled})),i)+budgetShare(a.budget.specialistTax,a.workplaces.map(w=>({i:w.i,weight:w.filled*Math.max(0,(C.types[w.type].taxMultiplier||1)-1)})),i);
    const assets=state.cells.flatMap((c,j)=>!c||c.anchor!==undefined?[]:[{i:j,weight:((C.types[c.type].upkeep||0)+(c.roof?C.upgrades[c.roof].upkeep:0))*(1+(c.level-1)*.5)}]);
    const visitor=a.tourism?.hotels.find(h=>h.i===i)||a.tourism?.bars.find(b=>b.i===i);
    const maintenance=budgetShare(a.budget.assetUpkeep,assets,i),regionalIncome=(connection?.revenue||0)+(visitor?.revenue||0),filled=work?.filled||0;
    return {visitor,i,positions,filled,vacancies:positions-filled,staffing:Math.round(100*filled/Math.max(1,positions)),tax,regionalIncome,maintenance,contribution:tax+regionalIncome-maintenance,linked:C.tileInfo(state,i,a).linked,status:cell.type==='beachbar'&&!C.tileInfo(state,i,a).linked?'No walking access':meta.road&&!C.tileInfo(state,i,a).linked?'No road access':!filled?'No staff':filled<positions?'Hiring':'Fully staffed',roles:meta.professions||[],utilisation:connection?Math.round(connection.utilisation*100):null};
  }
  const api={business,forecast,resident,district,districts,groundColour,healthcare,priorities,residentBuilding,daylight,buildingActivity,occupancyMap,unlocks};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityPlanning=api;
})(globalThis);
