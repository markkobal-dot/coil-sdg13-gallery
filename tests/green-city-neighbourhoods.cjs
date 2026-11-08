const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js');
const tile=(r,c)=>r*C.size+c,home=tile(4,4);
const apply=result=>{assert.equal(result.error,'');return result.state;};

test('every home receives derived local needs while roads and water have no resident report',()=>{
 const state=C.fresh('sandbox'),a=C.analyse(state);
 assert.equal(a.neighbourhoods.length,state.cells.filter(c=>c?.type==='house'||c?.type==='apartment').length);
 assert.ok(a.neighbourhoods.every(h=>Number.isInteger(h.residents)&&h.residents>=0&&h.needs.every(n=>Number.isFinite(n.severity)&&n.severity>=0&&n.severity<=100)));
 assert.equal(C.neighbourhoodInfo(state,0,a),null);assert.equal(C.neighbourhoodInfo(state,tile(5,5),a),null);
 const report=C.neighbourhoodInfo(state,home,a);assert.equal(report.i,home);assert.ok(report.priorities.length<=3);assert.ok(report.needs.some(n=>n.id==='shade'));
});

test('planning spends nothing and a suggested improvement produces the exact local forecast when built',()=>{
 const state=C.fresh('sandbox'),before=JSON.stringify(state),a=C.analyse(state),report=C.neighbourhoodInfo(state,home,a);
 assert.equal(JSON.stringify(state),before);assert.equal(a.net,C.analyse(state).net);
 const shade=report.priorities.find(n=>n.id==='shade');assert.ok(shade.action);assert.equal(shade.action.kind,'build');
 assert.equal(C.canPlace(state,shade.action.type,shade.action.target,a),'');
 const built=apply(C.place(state,shade.action.type,shade.action.target)),after=C.analyse(built).homeProfiles.find(h=>h.i===home);
 assert.equal(after.shade,shade.forecast.after);assert.ok(after.shade>shade.forecast.before);
 assert.equal(built.cash,state.cash-shade.action.cost);assert.equal(state.cash,14000);
});

test('an unaffordable plan remains a forecast and cannot bypass the actual construction budget',()=>{
 const state={...C.fresh('sandbox'),cash:0},report=C.neighbourhoodInfo(state,home),shade=report.priorities.find(n=>n.id==='shade');
 assert.equal(shade.action.type,'tree');assert.equal(shade.action.affordable,false);assert.ok(shade.forecast.after>shade.forecast.before);
 const result=C.place(state,shade.action.type,shade.action.target);assert.equal(result.state,state);assert.ok(result.error);assert.equal(state.cash,0);
});

test('noise feedback identifies the actual footprint source and resolves after it is relocated',()=>{
 let state=C.fresh('sandbox');state=apply(C.place(state,'airport',tile(6,12),1));
 const i=tile(6,11),report=C.neighbourhoodInfo(state,i),noise=report.priorities.find(n=>n.id==='noise');
 assert.ok(noise);assert.equal(noise.source.i,tile(6,12));assert.equal(noise.source.type,'airport');assert.equal(noise.action.kind,'inspect');assert.equal(noise.action.target,tile(6,12));
 const parkPlot=C.terrain.findIndex((_,j)=>C.distance(i,j)<=3&&!C.canPlace(state,'park',j));
 const greener=apply(C.place(state,'park',parkPlot));assert.equal(C.analyse(greener).homeProfiles.find(h=>h.i===i).noise,report.conditions.noise,'planting does not invent noise reduction');
 state=apply(C.buildLine(state,tile(5,17),tile(5,24)));state=apply(C.relocate(state,tile(6,12),tile(6,22),0));
 assert.ok(!C.neighbourhoodInfo(state,i).needs.some(n=>n.id==='noise'));
});

test('disconnected homes ask for a road connection and that need clears when the gateway is repaired',()=>{
 const state=apply(C.demolish(C.fresh('sandbox'),tile(17,10))),report=C.neighbourhoodInfo(state,home);
 assert.equal(report.primary,'roads');assert.equal(report.priorities[0].action.kind,'road');
 assert.ok(!report.needs.some(n=>n.id==='mobility'),'a disconnected home first needs its street connection');
 const repaired=apply(C.place(state,'road',tile(17,10)));assert.ok(!C.neighbourhoodInfo(repaired,home).needs.some(n=>n.id==='roads'));
});

test('named-line access is recognised locally without inventing a separate happiness score',()=>{
 const facts={i:home,linked:true,shade:60,mobility:10,health:65,safety:65,services:65,noise:0,commute:0,routeRiders:0,namedLineAccess:false};
 assert.ok(C.homeFeedback(facts,40).needs.some(n=>n.id==='mobility'));
 const connected=C.homeFeedback({...facts,namedLineAccess:true,routeRiders:8},40);assert.equal(connected.status,'Well supported');assert.equal(connected.needs.length,0);assert.equal(connected.happiness,undefined);
});

test('local reports recompute after upgrades and restore without storing derived flags or spending funds',()=>{
 let state=C.fresh('sandbox'),report=C.neighbourhoodInfo(state,home),care=report.priorities.find(n=>n.id==='health');assert.ok(care?.action);
 state=apply(C.place(state,care.action.type,care.action.target));const beforeUpgrade=C.neighbourhoodInfo(state,home).conditions.health;
 state=apply(C.upgrade(state,care.action.target));assert.ok(C.neighbourhoodInfo(state,home).conditions.health>beforeUpgrade);
 const saved=JSON.parse(JSON.stringify(state)),restored=C.restore(saved);
 assert.equal(saved.neighbourhoods,undefined);assert.equal(restored.cash,state.cash);assert.deepEqual(C.neighbourhoodInfo(restored,home).needs,C.neighbourhoodInfo(state,home).needs);
 const old=C.restore(require('./fixtures/new-terra-v2.json'));assert.ok(C.analyse(old).neighbourhoods.length>0);
});
