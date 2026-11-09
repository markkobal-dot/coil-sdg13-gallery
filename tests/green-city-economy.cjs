const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js');
const tile=(r,c)=>r*C.size+c,apply=result=>{assert.equal(result.error,'');return result.state;};
test('the opening grant funds a useful mixed neighbourhood while major infrastructure requires saving',()=>{
  let state=C.fresh();const opening=state.cash;
  for(const [type,r,c]of [['park',4,7],['bus',5,6],['clinic',6,7],['solar',4,4],['tree',3,6],['tree',3,7]])state=apply(C.place(state,type,tile(r,c)));
  assert.ok(state.cash>opening/2);assert.ok(C.analyse(state).net>0);
  assert.ok(C.upgrades.airport.cost>opening*3);assert.ok(C.upgrades.metro.cost>C.upgrades.clinic.cost*5);
  assert.ok(C.upgrades.hospital.cost>C.upgrades.clinic.cost*5);assert.ok(C.upgrades.park.cost>C.upgrades.tree.cost*4);
});
test('unfilled workplaces cannot generate business taxes, and taxes rise when residents fill their jobs',()=>{
  let state={...C.fresh('sandbox'),population:0};const office=tile(4,7);
  state=apply(C.place(state,'office',office));assert.ok(C.analyse(state).jobs>0);assert.equal(C.analyse(state).budget.businessRevenue,0);
  const staffed=C.analyse({...state,population:600});assert.ok(staffed.budget.businessRevenue>0);assert.ok(staffed.budget.filledJobs<=600*.42);
  const small={...state,population:100},extra=apply(C.place(small,'office',tile(6,7)));
  assert.equal(C.analyse(extra).budget.businessRevenue,C.analyse(small).budget.businessRevenue);
});
test('new road tiles carry recurring maintenance and the monthly ledger charges it once',()=>{
  const state=C.fresh(),before=C.analyse(state),next=apply(C.buildLine(state,tile(5,17),tile(5,21))),after=C.analyse(next);
  assert.equal(state.cash-next.cash,4*C.upgrades.road.cost);assert.equal(after.budget.assetUpkeep-before.budget.assetUpkeep,1);
  assert.equal(apply(C.advance(next)).cash,next.cash+after.net);
});
test('airports lose operating money at low demand and can cover upkeep when a larger city fills demand',()=>{
  const state=C.fresh('sandbox'),withAirport=apply(C.place(state,'airport',tile(6,12))),small=C.analyse(withAirport).connections[0];
  assert.ok(small.revenue<small.upkeep);const full=C.analyse({...withAirport,population:5000}).connections[0];
  assert.equal(full.utilisation,1);assert.ok(full.revenue>full.upkeep);assert.equal(full.revenue,C.upgrades.airport.revenue);
});
test('new rooftop refunds use their actual purchase price after upgrades, relocation and reload',()=>{
  const fresh=C.fresh('sandbox'),i=tile(4,4);let state=apply(C.place(fresh,'solar',i));
  assert.equal(state.cells[i].roofPaid,C.upgrades.solar.cost);state=apply(C.upgrade(state,i));state=apply(C.relocate(state,i,tile(4,7)));
  state=C.restore(JSON.parse(JSON.stringify(state)));const paid=state.cells[tile(4,7)].paid,removed=apply(C.demolish(state,tile(4,7),true));
  assert.equal(removed.cash-state.cash,C.upgrades.solar.cost/2);assert.equal(removed.cells[tile(4,7)].paid,paid-C.upgrades.solar.cost);assert.equal(removed.cells[tile(4,7)].roofPaid,undefined);
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(removed))),removed);
});
test('old saves keep cash and historical purchase values instead of receiving inflated refunds',()=>{
  for(const [roof,cost]of [['solar',150],['roof',100]]){
    const old=C.fresh('sandbox'),i=tile(4,4);old.cash=25387;old.cells[i]={...old.cells[i],roof,paid:180+cost};
    const restored=C.restore(JSON.parse(JSON.stringify(old)));assert.equal(restored.cash,25387);assert.equal(restored.cells[i].paid,180+cost);
    const removed=apply(C.demolish(restored,i,true));assert.equal(removed.cash-restored.cash,cost/2);assert.equal(removed.cells[i].paid,180);
    assert.equal(apply(C.demolish(removed,i)).cash-removed.cash,90);
  }
  const corrupt=C.fresh();corrupt.cells[tile(4,4)]={...corrupt.cells[tile(4,4)],roof:'solar',paid:150,roofPaid:300};assert.throws(()=>C.restore(corrupt));
});
