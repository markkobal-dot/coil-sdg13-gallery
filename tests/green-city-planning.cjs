const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js'),P=require('../green-city-planning.js'),L=require('../green-city-life.js');
const tile=(r,c)=>r*C.size+c;
test('build preview agrees with actual costs and outcomes without changing the city or awarding grants',()=>{
  const state=C.fresh(),saved=JSON.stringify(state),before=C.analyse(state),i=tile(4,5-2);
  const report=P.forecast(C,state,{mode:'build',type:'park',i},before);assert.equal(report.error,'');
  const built=C.place(state,'park',i),after=C.analyse(built.state);
  assert.equal(report.cost,state.cash-built.state.cash);assert.equal(report.net,after.net);assert.equal(report.netChange,after.net-before.net);
  assert.equal(report.happinessChange,after.happiness-before.happiness);assert.equal(report.upkeep,after.budget.assetUpkeep-before.budget.assetUpkeep);
  assert.ok(report.better>0);assert.ok(report.homes.some(h=>h.i===tile(4,4)&&h.changes.some(c=>c.key==='shade'&&c.delta>0)));
  assert.ok(report.coverage.every(j=>C.terrain[j]==='land'&&C.distance(i,j)<4));assert.equal(JSON.stringify(state),saved);
});
test('invalid sites and insufficient funds produce no misleading benefit overlay',()=>{
  const state=C.fresh();for(const i of [0,tile(4,4)]){const report=P.forecast(C,state,{mode:'build',type:'park',i});assert.ok(report.error);assert.deepEqual(report.homes,[]);assert.deepEqual(report.coverage,[]);}
  assert.match(P.forecast(C,{...state,cash:0},{mode:'build',type:'park',i:tile(4,3)}).error,/Eco Points/);
});
test('large noisy infrastructure shows nearby household trade-offs and respects rotation',()=>{
  const state=C.fresh('sandbox'),i=tile(7,7),report=P.forecast(C,state,{mode:'build',type:'airport',i,rotation:1});
  assert.equal(report.error,'');assert.ok(report.worse>0);assert.ok(report.homes.some(h=>h.changes.some(c=>c.key==='noise'&&c.delta>0)));
  assert.equal(report.cost,C.upgrades.airport.cost);
});
test('road, upgrade and relocation previews use their actual action price',()=>{
  const state=C.fresh('sandbox');
  for(const [action,actual]of [[{mode:'road',i:tile(18,10),start:tile(17,10)},C.buildLine(state,tile(17,10),tile(18,10))],[{mode:'upgrade',i:tile(4,4)},C.upgrade(state,tile(4,4))],[{mode:'move',i:tile(3,4),source:tile(4,4),rotation:0},C.relocate(state,tile(4,4),tile(3,4),0)]]){
    assert.equal(actual.error,'');const report=P.forecast(C,state,action);assert.equal(report.error,'');assert.equal(report.cost,state.cash-actual.state.cash);
  }
});
test('resident details match a real connected journey and changing local conditions',()=>{
  const state=C.fresh(),before=C.analyse(state),actor=L.plan(C,state,before).walkers[0],report=P.resident(C,state,before,actor);
  assert.equal(report.from,actor.from);assert.equal(report.to,actor.to);assert.equal(report.links,actor.path.length-1);assert.equal(report.shade,before.homeProfiles.find(h=>h.i===actor.from).shade);
  assert.equal(report.priority,P.homeReport(C,state,before,actor.from).issues[0].title);
  const improved=C.place(state,'bus',tile(4,5));assert.equal(improved.error,'');const updated=P.resident(C,improved.state,C.analyse(improved.state),actor);assert.ok(updated.transport>report.transport);assert.equal(updated.priority,P.homeReport(C,improved.state,C.analyse(improved.state),actor.from).issues[0].title);
  const removed={...state,cells:state.cells.map((c,i)=>i===actor.to?null:c)};assert.equal(P.resident(C,removed,C.analyse(removed),actor),null);
});
test('landscape colours and districts are deterministic and preserve every saved terrain tile',()=>{
  const state=C.fresh(),before=JSON.stringify({state,terrain:C.terrain}),colours=C.terrain.map((_,i)=>P.groundColour(C,i));
  assert.deepEqual(C.terrain.map((_,i)=>P.groundColour(C,i)),colours);assert.ok(new Set(colours).size>=5);
  assert.equal(P.district(C,tile(22,12)),'Southern Meadows');assert.equal(P.district(C,tile(10,3)),'West Bay');assert.equal(P.district(C,tile(4,4)),'Old Town');
  assert.equal(JSON.stringify({state,terrain:C.terrain}),before);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
});
