const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js');
const tile=(r,c)=>r*C.size+c;
const stopA=tile(5,5),stopB=tile(10,10),stopC=tile(5,10);
function applied(result){assert.equal(result.error,'');return result.state;}
function city(type='bus'){let state=C.fresh('sandbox');for(const i of [stopA,stopB,stopC])state=applied(C.place(state,type,i));return {...state,population:680};}
const line=(patch={})=>({name:'Old Town shuttle',type:'bus',colour:C.routeColours[0],enabled:true,stops:[stopA,stopB],...patch});

test('a named bus line follows connected roads, shares its service forecast with the budget and survives export',()=>{
 const before=city(),state=applied(C.setRoute(before,line())),a=C.analyse(state),route=a.transport.routes[0];
 assert.equal(route.status,'Operating');assert.equal(route.path[0],stopA);assert.equal(route.path.at(-1),stopB);
 for(let n=1;n<route.path.length;n++)assert.ok(C.neighbours(route.path[n-1]).includes(route.path[n]));
 assert.ok(route.path.every(i=>a.roads.has(i)));assert.ok(route.riders>0);assert.ok(route.upkeep>0);
 assert.equal(a.budget.routeUpkeep,route.upkeep);assert.equal(a.transport.routeRiders,route.riders);
 assert.equal(a.income-a.expenses,a.net);assert.equal(state.cash,before.cash,'planning has no setup charge');
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
});

test('tram routes use their own stations and provide higher passenger capacity at a higher operating cost',()=>{
 const bus=C.analyse(applied(C.setRoute(city(),line()))).transport.routes[0];
 const state=applied(C.setRoute(city('tram'),line({type:'tram'}))),tram=C.analyse(state).transport.routes[0];
 assert.ok(tram.capacity>bus.capacity);assert.ok(tram.upkeep>bus.upkeep);
 assert.equal(C.setRoute(city(),line({type:'tram'})).state.routes.length,0);
});

test('broken stops and the regional gateway suspend affected routes without deleting the saved plan',()=>{
 const state=applied(C.setRoute(city(),line()));
 const missing=applied(C.demolish(state,stopA)),report=C.analyse(missing).transport.routes[0];
 assert.equal(report.status,'Suspended');assert.equal(report.upkeep,0);assert.equal(report.riders,0);assert.match(report.issue,/stop/i);
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(missing))),missing);
 const repaired=applied(C.place(missing,'bus',stopA));assert.equal(C.analyse(repaired).transport.routes[0].status,'Operating');
 const disconnected=applied(C.demolish(state,tile(17,10)));assert.equal(C.analyse(disconnected).transport.routes[0].status,'Suspended');
 const reconnected=applied(C.place(disconnected,'road',tile(17,10)));assert.equal(C.analyse(reconnected).transport.routes[0].status,'Operating');
});

test('pausing and removing lines stop operating charges, retain stops and remain immutable for Undo',()=>{
 const state=applied(C.setRoute(city(),line())),paused=applied(C.setRouteEnabled(state,1,false));
 assert.equal(state.routes[0].enabled,true);assert.equal(C.analyse(paused).transport.routes[0].status,'Paused');
 assert.equal(C.analyse(paused).budget.routeUpkeep,0);assert.equal(paused.cells,state.cells);
 const resumed=applied(C.setRouteEnabled(paused,1,true));assert.ok(C.analyse(resumed).budget.routeUpkeep>0);
 const removed=applied(C.removeRoute(resumed,1));assert.equal(removed.routes.length,0);assert.equal(removed.cells[stopA].type,'bus');assert.equal(state.routes.length,1);
});

test('bad line definitions and reversed duplicates are rejected atomically',()=>{
 const state=city();
 for(const patch of [{name:''},{name:'x'.repeat(33)},{type:'plane'},{colour:'red'},{enabled:1},{stops:[stopA]},{stops:[stopA,stopA]},{stops:[stopA,0]},{stops:[stopA,7.1]},{stops:[stopA,tile(7,7)]}])assert.equal(C.setRoute(state,line(patch)).state,state);
 const saved=applied(C.setRoute(state,line()));assert.equal(C.setRoute(saved,line({stops:[stopB,stopA]})).state,saved);
 assert.equal(C.setRoute(saved,line(),99).state,saved);assert.equal(C.removeRoute(saved,99).state,saved);
});

test('routes compete for finite residents, and extra riders reduce actual road loads',()=>{
 const state=city(),base=C.analyse(state),one=applied(C.setRoute(state,line())),first=C.analyse(one);
 const two=applied(C.setRoute(one,line({name:'Cross town',colour:C.routeColours[1],stops:[stopA,stopC,stopB]}))),a=C.analyse(two);
 assert.ok(first.transport.carTrips<base.transport.carTrips);
 assert.ok(first.transport.roadLoads.reduce((s,v)=>s+v,0)<base.transport.roadLoads.reduce((s,v)=>s+v,0));
 assert.ok(first.transport.congestion<=base.transport.congestion);
 assert.ok(a.ridership<=state.population*.65+1);assert.equal(a.transport.routeRiders,a.transport.routes.reduce((s,r)=>s+r.riders,0));
 assert.ok(a.transport.routes.every(r=>r.riders<=r.capacity));
 const free=C.analyse(applied(C.setPolicies(two,{transitFare:0})));assert.equal(free.budget.fareRevenue,0);assert.ok(free.transport.routeRiders>0);assert.ok(free.budget.routeUpkeep>0);
});

test('funding changes route cost and capacity, and line costs are paid only once in the monthly ledger',()=>{
 let state=applied(C.setRoute(city(),line()));state={...state,grants:C.grantDefs.map(g=>g.id)};
 const a=C.analyse(state),next=applied(C.advance(state));assert.equal(next.cash,state.cash+a.net);
 const lower=C.analyse(applied(C.setPolicies(state,{serviceBudget:70})));assert.ok(lower.transport.routes[0].capacity<a.transport.routes[0].capacity);assert.ok(lower.budget.routeUpkeep<a.budget.routeUpkeep);
 assert.equal(a.expenses,Object.entries(a.budget).filter(([name])=>['assetUpkeep','routeUpkeep','transitSupport','industryStandards','gridCost','utilitySubsidy','loanPayment'].includes(name)).reduce((sum,[,v])=>sum+v,0));
});

test('old cities acquire an empty route list and malformed transport saves are rejected',()=>{
 const old=city();delete old.routes;const restored=C.restore(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(restored.routes,[]);assert.deepEqual(restored.cells,old.cells);assert.equal(restored.cash,old.cash);assert.equal(restored.month,old.month);
 const saved=applied(C.setRoute(city(),line()));
 for(const bad of [{routes:null},{routes:[{...saved.routes[0],id:99}]},{routes:[saved.routes[0],saved.routes[0]]},{routes:[{...saved.routes[0],stops:[stopA,0]}]},{routes:[{...saved.routes[0],enabled:'yes'}]}])assert.throws(()=>C.restore({...saved,...bad}));
});

test('passenger capacity and the twelve-line limit stay bounded, and a deleted line frees its identifier',()=>{
 const busy=applied(C.setRoute({...city(),population:10000},line())),report=C.analyse(busy).transport.routes[0];assert.equal(report.riders,report.capacity);
 let state=applied(C.place(city(),'bus',tile(15,10))),count=0;
 const stops=[stopA,stopB,stopC,tile(15,10)];
 for(const a of stops)for(const b of stops)for(const c of stops){
  if(new Set([a,b,c]).size!==3)continue;
  const result=C.setRoute(state,line({name:'Line '+(count+1),stops:[a,b,c]}));
  if(!result.error){state=result.state;count++;}
 }
 assert.equal(count,12);assert.equal(C.setRoute(state,line()).state,state);
 const removed=applied(C.removeRoute(state,5)),replacement=applied(C.setRoute(removed,line()));assert.equal(replacement.routes.at(-1).id,5);
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(replacement))),replacement);
});
