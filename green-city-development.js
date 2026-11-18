/* Land, development and household demand. Deterministic game rules, no remote services. */
(function(host){
  'use strict';
  const clamp=(n,lo=0,hi=1)=>Math.max(lo,Math.min(hi,n));
  const levels=[
    {level:1,name:'Starting neighbourhood',detail:'Essential homes, nature and services.'},
    {level:2,name:'Growing town',detail:'Month 3 or 35 sustainability.'},
    {level:3,name:'Established city',population:450,happiness:50,overall:30,detail:'450 residents · 50 happiness · 30 sustainability.'},
    {level:4,name:'Regional centre',population:1000,happiness:60,overall:50,detail:'1,000 residents · 60 happiness · 50 sustainability.'}
  ];
  const districts=[{id:'central',name:'Central island',cost:0,level:1,population:0,overall:0},
    {id:'meadows',name:'Southern Meadows',cost:3000,level:2,population:350,overall:30},
    {id:'east',name:'Eastern Waterfront',cost:6000,level:3,population:650,overall:45}];
  const district=(i,size)=>i%size>=19?'east':Math.floor(i/size)>=19?'meadows':'central';
  function ownedDistricts(state,size){return state.districts||[...new Set(['central',...state.cells.flatMap((cell,i)=>cell?[district(i,size)]:[])])];}
  const owned=(state,i,size)=>state.reclaimed?.includes(i)||state.challenge==='sandbox'||ownedDistricts(state,size).includes(district(i,size));
  function level(state,a){
    if(state.challenge==='sandbox')return 4;
    let result=state.month>=3||a.overall>=35?2:1;
    for(const def of levels.slice(2))if(result>=def.level-1&&state.population>=def.population&&a.happiness>=def.happiness&&a.overall>=def.overall)result=def.level;
    return Math.max(state.cityLevel||1,result);
  }
  function landReports(C,state,a){return districts.map(def=>({...def,owned:ownedDistricts(state,C.size).includes(def.id)||state.challenge==='sandbox',
    tiles:C.terrain.flatMap((t,i)=>t==='land'&&district(i,C.size)===def.id?[i]:[]),
    eligible:a.tier>=def.level&&state.population>=def.population&&a.overall>=def.overall,
    affordable:state.cash>=def.cost}));}
  function jobs(type,meta){return meta.jobs??({house:0,apartment:18,wind:6,battery:6,heat:12,factory:48,coal:24,recycling:24,waterworks:18,school:20,clinic:18,garden:4,tree:2,park:2,forest:2,wetland:2}[type]||0);}
  const highPay=new Set(['office','officepark','ecofactory','gamestudio','ailab','geothermal','hospital','regionalhospital','internationalairport']);
  function society({state,homes,homeProfiles,workplaces,air,happiness,employment,policy}){
    const total=Math.max(1,homes.filter(h=>h.linked).reduce((sum,h)=>sum+h.capacity,0));
    const luxury=homes.filter(h=>h.linked&&h.luxury),luxuryCapacity=luxury.reduce((sum,h)=>sum+h.capacity,0);
    const luxuryPeople=Math.min(state.population,luxury.reduce((sum,h)=>sum+(homeProfiles.find(p=>p.i===h.i)?.residents??state.population*h.capacity/total),0));
    const quality=luxuryCapacity?luxury.reduce((sum,h)=>{const p=homeProfiles.find(p=>p.i===h.i);return sum+h.capacity*(p.shade+p.health+p.services+Math.max(0,100-p.noise)+air)/500;},0)/luxuryCapacity:0;
    const specialistWorkplaces=workplaces.filter(w=>highPay.has(w.type));
    const highPayJobs=specialistWorkplaces.reduce((sum,w)=>sum+(w.filled||0),0),highPayCapacity=specialistWorkplaces.reduce((sum,w)=>sum+(w.positions||0),0);
    const affluent=Math.max(0,Math.min(state.affluentPopulation||0,Math.floor(luxuryPeople),state.population));
    const target=Math.floor(Math.min(luxuryPeople*.8,highPayJobs*1.5,state.population*.35)*quality*clamp((happiness-45)/25)*clamp(employment/80)*clamp((18-policy.residentialTax)/8));
    const change=target>=affluent?Math.min(target-affluent,Math.max(1,Math.min(Math.ceil((target-affluent)*.18),Math.round(state.population*.015)))):-Math.min(affluent-target,Math.max(1,Math.ceil((affluent-target)*.3)));
    homeProfiles.forEach(p=>{const home=homes.find(h=>h.i===p.i);p.housingType=home.type;p.residents??=home.linked?state.population*home.capacity/total:0;p.affluentShare=home.luxury&&luxuryPeople?affluent/luxuryPeople:0;});
    return {affluent,affluentTarget:target,nextAffluent:affluent+change,luxuryCapacity,highPayJobs:Math.round(highPayJobs),highPayCapacity,quality:Math.round(quality*100),
      premiumTax:Math.round(affluent*.038*policy.residentialTax),
      advice:!luxuryCapacity?'Provide connected luxury housing to attract affluent households.':!highPayJobs?(highPayCapacity?'Fill existing specialist vacancies with residents before adding more offices.':'Add well-paid jobs such as clean-tech offices and healthcare.'):happiness<50?'Improve resident happiness and local living conditions.':quality<.5?'Improve shade, healthcare, services and air quality around luxury homes.':'Affluent households can move in gradually each month. Higher household taxes reduce demand.'};
  }
  // Integer allocations conserve residents and jobs, including capped or very small buildings.
  function allocate(total,items){
    total=Math.max(0,Math.floor(total));const result=Object.fromEntries(items.map(x=>[x.i,0]));
    let remaining=Math.min(total,items.reduce((sum,x)=>sum+Math.max(0,Math.floor(x.cap)),0));
    while(remaining>0){
      const active=items.filter(x=>x.cap>result[x.i]&&x.weight>0),weight=active.reduce((sum,x)=>sum+x.weight,0);if(!weight)break;
      const shares=active.map(x=>{const exact=remaining*x.weight/weight,add=Math.min(x.cap-result[x.i],Math.floor(exact));return {x,add,fraction:exact-Math.floor(exact)};});
      let used=0;for(const s of shares){result[s.x.i]+=s.add;used+=s.add;}remaining-=used;
      shares.sort((a,b)=>b.fraction-a.fraction||a.x.i-b.x.i);
      for(const s of shares){if(!remaining)break;if(result[s.x.i]<s.x.cap){result[s.x.i]++;remaining--;used++;}}
      if(!used)break;
    }
    return result;
  }
  const housingCapacity=(C,cell)=>cell&&cell.anchor===undefined?(C.types[cell.type].housing||(cell.type==='house'?40:cell.type==='apartment'?100:0))*(1+(cell.level-1)*.5):0;
  function seedHousing(C,state){
    const homes=state.cells.flatMap((cell,i)=>{const cap=housingCapacity(C,cell);return cap?[{i,cap:Math.floor(cap),weight:cap}]:[];});
    return allocate(state.population,homes);
  }
  function housingSnapshot(state,homes){
    const stored=state.occupancy,items=homes.map(h=>({i:h.i,cap:Math.floor(h.capacity),weight:h.capacity}));
    let occupancy=stored?Object.fromEntries(items.map(h=>[h.i,Math.min(h.cap,Math.max(0,Math.floor(stored[h.i]||0)))])):allocate(state.population,items);
    let housed=Object.values(occupancy).reduce((sum,n)=>sum+n,0);
    if(housed>state.population){occupancy=allocate(state.population,items.map(h=>({...h,cap:occupancy[h.i],weight:occupancy[h.i]})));housed=Object.values(occupancy).reduce((sum,n)=>sum+n,0);}
    return {occupancy,housed,displaced:Math.max(0,state.population-housed)};
  }
  function staffing(workplaces,population){
    const positions=allocate(Math.round(workplaces.reduce((sum,w)=>sum+w.jobs,0)),workplaces.map(w=>({i:w.i,cap:Math.ceil(w.jobs),weight:w.jobs})));
    const total=Object.values(positions).reduce((sum,n)=>sum+n,0),workers=Math.floor(population*.42);
    const filled=allocate(Math.min(workers,total),workplaces.map(w=>({i:w.i,cap:positions[w.i],weight:positions[w.i]})));
    workplaces.forEach(w=>{w.positions=positions[w.i];w.filled=filled[w.i];w.vacancies=w.positions-w.filled;});
    return {jobs:total,workers,filled:Object.values(filled).reduce((sum,n)=>sum+n,0)};
  }
  function homeHappiness(profile,city,employed){
    const work=typeof employed==='boolean'?(employed?4:-6):city.employment/100*10-6;
    return Math.round(clamp((city.happiness*.4+profile.shade*.12+profile.health*.12+profile.services*.1+profile.mobility*.12+(100-profile.noise)*.14+work-(profile.linked?0:12)-Math.max(0,(profile.commute||0)-40)*.1-(profile.pollution||0)*.18)/100)*100);
  }
  const migrationReasons={roads:'Lost road access',pollution:'Industrial pollution',noise:'Too much noise',tax:'High household taxes',happiness:'Low happiness',city:'Difficult citywide conditions',newhome:'Housing became occupied',services:'Nearby services',shade:'Shade and green space',jobs:'Jobs and opportunity',housing:'Available housing'};
  function migration({state,homes,profiles,snapshot,city,growth,policy,maxPopulation=Infinity}){
    const rows=homes.map((h,n)=>{
      const p=profiles[n],before=snapshot.occupancy[h.i]||0,happiness=homeHappiness(p,city);
      const demand=Math.round(clamp((happiness+Math.max(-8,Math.min(8,(city.employment-70)*.15))-(policy.residentialTax-10)*1.4)/100)*100);
      let rate=0,reason=null;
      if(!p.linked){rate=.18;reason='roads';}
      else if(p.pollution>=30){rate=.025+(p.pollution-30)*.001;reason='pollution';}
      else if(p.noise>=60){rate=.025+(p.noise-60)*.001;reason='noise';}
      else if(policy.residentialTax>=16){rate=.015+(policy.residentialTax-16)*.005;reason='tax';}
      else if(demand<30){rate=.02+(30-demand)*.002;reason='happiness';}
      const out=before&&rate?Math.min(before,Math.max(1,Math.ceil(before*rate))):0;
      p.capacity=Math.floor(h.capacity);p.residents=before;p.localHappiness=happiness;p.housingDemand=demand;
      return {i:h.i,type:h.type,before,after:before-out,in:0,out,reasonOut:reason,reasonIn:null,happiness,demand,capacity:p.capacity,profile:p};
    });
    let forced=Math.min(Math.max(0,-growth),rows.reduce((sum,r)=>sum+r.after,0));const forcedTotal=forced;
    for(const r of [...rows].sort((a,b)=>a.demand-b.demand||a.i-b.i)){const n=Math.min(forced,r.after);r.after-=n;r.out+=n;if(n&&!r.reasonOut)r.reasonOut='city';forced-=n;}
    const localOut=rows.reduce((sum,r)=>sum+r.out,0)-forcedTotal,pool=localOut+snapshot.displaced;
    const targets=()=>rows.filter(r=>r.profile.linked&&r.demand>=32&&r.profile.pollution<30&&r.profile.noise<60&&!r.out).map(r=>({i:r.i,cap:Math.max(0,Math.min(r.capacity-r.after,Math.max(2,Math.ceil(r.capacity*.18))-r.in)),weight:Math.max(0,r.capacity-r.after)*Math.pow(.25+r.demand/100,2)}));
    function settle(total){const allocations=allocate(total,targets());let used=0;for(const r of rows){const n=allocations[r.i]||0;r.after+=n;r.in+=n;used+=n;if(n)r.reasonIn=r.before===0?'newhome':r.profile.health+r.profile.services>=110?'services':r.profile.shade>=40?'shade':city.employment>=80?'jobs':'housing';}return used;}
    const relocated=settle(pool),externalDemand=Math.round(Math.max(0,growth)*Math.max(.25,1-Math.max(0,policy.residentialTax-10)*.09));
    const arrivals=settle(Math.min(externalDemand,Math.max(0,maxPopulation-rows.reduce((sum,r)=>sum+r.after,0)))),departures=forcedTotal+pool-relocated;
    const nextOccupancy=Object.fromEntries(rows.map(r=>[r.i,r.after])),nextPopulation=Object.values(nextOccupancy).reduce((sum,n)=>sum+n,0);
    rows.forEach(r=>{r.profile.nextResidents=r.after;r.profile.moveIns=r.in;r.profile.moveOuts=r.out;});
    return {occupancy:snapshot.occupancy,housed:snapshot.housed,displaced:snapshot.displaced,nextOccupancy,nextPopulation,arrivals,departures,relocated,homes:rows.map(({profile,...r})=>r)};
  }
  function restoreOccupancy(C,raw){
    if(raw.occupancy===undefined)return undefined;
    if(!raw.occupancy||typeof raw.occupancy!=='object'||Array.isArray(raw.occupancy)||Object.keys(raw.occupancy).length>C.size*C.size)throw new Error('Invalid housing occupancy');
    const result={};let total=0;
    for(const[key,value]of Object.entries(raw.occupancy)){const i=Number(key),capacity=housingCapacity(C,raw.cells[i]);if(!/^(0|[1-9]\d*)$/.test(key)||!capacity||!Number.isInteger(value)||value<0||value>capacity)throw new Error('Invalid home population');result[i]=value;total+=value;}
    if(total>raw.population)throw new Error('Housing population exceeds the city population');return result;
  }
  function restoreMonthly(C,raw){
    const r=raw.monthlyReport;if(r===undefined)return undefined;
    const integer=(n,min=0,max=10000000)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!r||!integer(r.month,2,raw.month)||!Array.isArray(r.homes)||r.homes.length>C.size*C.size)throw new Error('Invalid monthly report');
    for(const k of ['populationBefore','populationAfter','arrivals','departures','relocated','unhousedBefore','income','expenses','grants'])if(!integer(r[k]))throw new Error('Invalid monthly totals');
    if(r.populationBefore+r.arrivals-r.departures!==r.populationAfter||r.income-r.expenses!==r.operatingNet||!integer(r.operatingNet,-10000000)||!integer(r.cashChange,-10000000))throw new Error('Inconsistent monthly totals');
    if(r.previousNet!==null&&!integer(r.previousNet,-10000000))throw new Error('Invalid previous budget');
    const seen=new Set(),homes=r.homes.map(h=>{if(!h||!integer(h.i,0,C.size*C.size-1)||C.terrainAt(raw,h.i)!=='land'||seen.has(h.i)||!C.types[h.type]||!housingCapacity(C,{type:h.type,level:1})||!integer(h.before)||!integer(h.after)||!integer(h.in)||!integer(h.out)||h.before+h.in-h.out!==h.after||!integer(h.happiness,0,100)||!integer(h.demand,0,100)||!integer(h.capacity)||h.before>h.capacity||h.after>h.capacity||![null,...Object.keys(migrationReasons)].includes(h.reasonIn)||![null,...Object.keys(migrationReasons)].includes(h.reasonOut))throw new Error('Invalid monthly housing record');seen.add(h.i);return {i:h.i,type:h.type,before:h.before,after:h.after,in:h.in,out:h.out,reasonIn:h.reasonIn,reasonOut:h.reasonOut,happiness:h.happiness,demand:h.demand,capacity:h.capacity};});
    return {month:r.month,populationBefore:r.populationBefore,populationAfter:r.populationAfter,arrivals:r.arrivals,departures:r.departures,relocated:r.relocated,unhousedBefore:r.unhousedBefore,income:r.income,expenses:r.expenses,operatingNet:r.operatingNet,previousNet:r.previousNet,cashChange:r.cashChange,grants:r.grants,homes};
  }

  // A beach needs a walkable approach, rather than asphalt on its shoreline.
  function beachAccess(C,state,roads){
    const terrain=C.terrainFor?.(state)||C.terrain;
    const anchors=state.cells.flatMap((cell,i)=>cell&&cell.anchor===undefined?[{...cell,i}]:[]);
    const parking=anchors.filter(b=>b.type==='parking').map(b=>{const plots=C.footprint(b.type,b.i,b.rotation),entries=[...new Set(plots.flatMap(i=>C.neighbours(i).filter(j=>roads.has(j))))];return {i:b.i,rotation:b.rotation||0,level:b.level,plots,entries,connected:entries.length>0,capacity:6+(b.level-1)*2,beaches:[]};});
    const walkable=i=>terrain[i]==='land'&&C.ownsLand(state,i)&&(!state.cells[i]||C.roadTypes.has(state.cells[i].type)||C.greenTypes.has(state.cells[i].type)||state.cells[i].type==='parking');
    const walks=new Map(),beaches=anchors.filter(b=>b.type==='beach').map(b=>{
      const plots=C.footprint(b.type,b.i,b.rotation),parents=new Map(plots.map(i=>[i,null])),steps=new Map(plots.map(i=>[i,0])),queue=[...plots];
      for(let head=0;head<queue.length;head++){const i=queue[head];if(steps.get(i)>=6)continue;for(const j of C.neighbours(i))if(walkable(j)&&!parents.has(j)){parents.set(j,i);steps.set(j,steps.get(i)+1);queue.push(j);}}
      const pathTo=end=>{const path=[];for(let i=end;i!==null;i=parents.get(i))path.push(i);return path;};
      walks.set(b.i,{parents,steps,pathTo});
      const road=queue.find(i=>roads.has(i)),lots=[];
      for(const lot of parking){const end=lot.connected&&queue.find(i=>lot.plots.includes(i));if(end!==false&&end!==undefined){const path=pathTo(end);lot.beaches.push({i:b.i,path});lots.push(lot.i);}}
      const nearby=lots.length?parking.find(p=>p.i===lots[0]):null,viaLot=nearby?.beaches.find(p=>p.i===b.i).path;
      return {i:b.i,accessible:road!==undefined||lots.length>0,road:road??nearby?.entries[0]??null,path:road!==undefined?pathTo(road):viaLot?[nearby.entries[0],...viaLot]:[],walkingDistance:road!==undefined?steps.get(road):viaLot?viaLot.length-1:null,parking:lots};
    });
    const bars=anchors.filter(b=>b.type==='beachbar').map(bar=>{
      const links=[];
      for(const beach of beaches){if(!beach.accessible)continue;const walk=walks.get(beach.i),approach=C.neighbours(bar.i).filter(i=>walk.parents.has(i)&&walk.steps.get(i)<6).sort((a,b)=>walk.steps.get(a)-walk.steps.get(b))[0];if(approach!==undefined)links.push({beach,path:[bar.i,...walk.pathTo(approach)]});}
      links.sort((a,b)=>a.path.length-b.path.length||a.beach.i-b.beach.i);
      const direct=C.neighbours(bar.i).find(i=>roads.has(i)),nearby=links[0],tail=nearby?[...nearby.path].reverse():[],via=nearby?[...nearby.beach.path,...tail.slice(nearby.beach.path.at(-1)===tail[0]?1:0)]:[];
      return {i:bar.i,accessible:direct!==undefined||!!nearby,beach:nearby?.beach.i??null,beaches:links.map(l=>l.beach.i),road:direct??nearby?.beach.road??null,path:direct!==undefined?[direct,bar.i]:via,walkingDistance:direct!==undefined?1:via.length?via.length-1:null};
    });
    return {beaches,parking,bars};
  }
  function tourism(C,state,a){
    const anchors=state.cells.flatMap((cell,i)=>cell&&cell.anchor===undefined?[{...cell,i,meta:C.types[cell.type],factor:1+(cell.level-1)*.5}]:[]);
    const staff=i=>{const w=a.workplaces.find(w=>w.i===i&&w.linked);return w?.positions?w.filled/w.positions:0;};
    const gateways=anchors.filter(b=>['airport','internationalairport','ferry','marina'].includes(b.type)&&staff(b.i)>0).map(b=>{const c=a.connections.find(c=>c.i===b.i);return {i:b.i,type:b.type,capacity:Math.floor((b.type==='ferry'?30+state.population*.04:b.type==='marina'?40+state.population*.04:Math.max(12,(c?.customers||0)*.65))*staff(b.i))};}).filter(g=>g.capacity>0);
    const access=a.beachAccess||beachAccess(C,state,a.roads),beaches=anchors.filter(b=>b.type==='beach'&&access.beaches.some(p=>p.i===b.i&&p.accessible));
    const appeal=Math.round(clamp(a.air/100*.35+a.happiness/100*.3+a.overall/100*.2+Math.min(.25,beaches.length*.08))*100);
    const arrivals=Math.floor(Math.min(gateways.reduce((n,g)=>n+g.capacity,0),60+state.population*.3)*appeal/100);
    const hotels=anchors.filter(b=>b.meta.rooms).map(b=>{const staffing=staff(b.i),nearBeach=beaches.some(p=>C.distance(p.i,b.i)<7),pollution=(a.localSources.industry||[]).reduce((n,p)=>n+(C.distance(p.i,b.i)<6?(p.strength||25):0),0),quality=clamp((nearBeach?1.25:1)-pollution/90,.15,1.25);return {i:b.i,type:b.type,rooms:Math.round(b.meta.rooms*b.factor),capacity:Math.floor(b.meta.rooms*b.factor*staffing),staffing,quality,nearBeach};});
    const allocation=allocate(arrivals,hotels.map(h=>({i:h.i,cap:h.capacity,weight:h.capacity*h.quality})));
    hotels.forEach(h=>{h.guests=allocation[h.i]||0;h.occupancy=Math.round(100*h.guests/Math.max(1,h.rooms));h.revenue=Math.round(h.guests*C.types[h.type].visitorRate*h.quality);});
    const bars=anchors.filter(b=>b.type==='beachbar').map(b=>({i:b.i,type:b.type,capacity:access.bars?.some(p=>p.i===b.i&&p.accessible&&p.beaches.length)?Math.floor(40*b.factor*staff(b.i)):0}));
    const customers=allocate(arrivals+Math.floor(state.population*.03),bars.map(b=>({i:b.i,cap:b.capacity,weight:b.capacity})));
    bars.forEach(b=>{b.customers=customers[b.i]||0;b.revenue=Math.round(b.customers*.9);});
    const guests=hotels.reduce((n,h)=>n+h.guests,0),revenue=[...hotels,...bars].reduce((n,b)=>n+b.revenue,0);
    return {gateways,appeal,arrivals,guests,dayVisitors:Math.max(0,arrivals-guests),rooms:hotels.reduce((n,h)=>n+h.rooms,0),hotels,bars,beaches:beaches.length,revenue};
  }
  const api={beachAccess,tourism,levels,districts,district,ownedDistricts,owned,level,landReports,jobs,highPay,society,allocate,housingCapacity,seedHousing,housingSnapshot,staffing,homeHappiness,migration,migrationReasons,restoreOccupancy,restoreMonthly};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityDevelopment=api;
})(globalThis);
