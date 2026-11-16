const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),I=require('../green-city-intro.js'),L=require('../green-city-life.js');
const tile=(r,c)=>r*C.size+c;
function begin(state=C.fresh()){
  const a=C.analyse(state),entry=I.entry(C,state,a,L.plan(C,state,a).walkers);assert.equal(entry.kind,'start');
  const started=C.startNeighbourhoodMission(state,'shade',entry.home);assert.equal(started.error,'');
  return {state:started.state,session:{...entry,stage:1}};
}
test('the introduction chooses an actual resident and starts the existing mission for free',()=>{
  const state=C.fresh(),before=JSON.stringify(state),a=C.analyse(state),walkers=L.plan(C,state,a).walkers;
  const entry=I.entry(C,state,a,walkers);assert.equal(JSON.stringify(state),before);assert.ok(walkers.some(p=>p.from===entry.home&&p.id===entry.actor.id));
  const started=C.startNeighbourhoodMission(state,'shade',entry.home);assert.equal(started.error,'');assert.equal(started.state.cash,state.cash);assert.deepEqual(started.state.cells,state.cells);
  assert.equal(I.status(C,started.state,{...entry,stage:1}).kind,'active');
});
test('guided plans use legal purchases, show the exact shade change, and earn the normal reward once',()=>{
  let {state,session}=begin(),opening=state.cash,spent=0,paid=0,builds=0;
  while(I.status(C,state,session).kind!=='completed'&&builds++<10){
    const before=JSON.stringify(state),plan=I.nextPlan(C,state,session.home);assert.ok(!plan.error);assert.equal(JSON.stringify(state),before);
    const result=plan.kind==='upgrade'?C.upgrade(state,plan.target):C.place(state,plan.type,plan.target);assert.equal(result.error,'');spent+=plan.cost;
    assert.equal(C.analyse(result.state).homeProfiles.find(h=>h.i===session.home).shade,plan.after);
    const award=C.awardNeighbourhoodMission(result.state);if(award.reward)paid+=award.reward.reward;state=award.state;
  }
  const report=I.status(C,state,session);assert.equal(report.kind,'completed');assert.ok(report.record.value>=40);assert.equal(paid,180);assert.equal(state.cash,opening-spent+180);
  assert.equal(I.ownsReward(session,report.record),true);assert.equal(I.ownsReward(session,{...report.record,baseline:1}),false);assert.equal(I.ownsReward(null,report.record),false);assert.equal(I.ownsReward(session,{...report.record,id:'care'}),false);
  for(let n=0;n<3;n++){assert.equal(C.awardNeighbourhoodMission(state).reward,null);assert.equal(I.entry(C,state,C.analyse(state)).kind,'completed');}
  assert.equal(state.cash,opening-spent+180);
});
test('resuming validates the saved mission and discards a stale build step',()=>{
  const {state,session}=begin(),restored=C.restore(JSON.parse(JSON.stringify(state))),saved={status:'active',...session,stage:3};
  assert.equal(I.restore(C,restored,saved).stage,2);
  assert.equal(I.restore(C,restored,{...saved,home:0}),null);assert.equal(I.restore(C,restored,{...saved,baseline:39}),null);
  assert.equal(I.restore(C,restored,{...saved,status:'skipped'}),null);assert.equal(I.restore(C,restored,{...saved,status:'complete'}),null);
  assert.equal(I.restore(C,restored,{...saved,stage:99}),null);
});
test('another active mission is preserved and cannot be replaced by the introduction',()=>{
  const fresh=C.fresh(),home=C.neighbourhoodMissions(fresh).find(m=>m.id==='transit').candidates[0].i;
  const state=C.startNeighbourhoodMission(fresh,'transit',home).state,before=JSON.stringify(state);
  assert.equal(I.entry(C,state,C.analyse(state)).kind,'busy');assert.equal(JSON.stringify(state),before);
});
test('unaffordable and crowded plans cannot bypass costs or silently remove buildings',()=>{
  const {state,session}=begin(),poor={...state,cash:0},saved=JSON.stringify(poor),plan=I.nextPlan(C,poor,session.home);
  assert.ok(!plan.error);assert.equal(plan.affordable,false);assert.ok(C.place(poor,plan.type,plan.target).error);assert.equal(JSON.stringify(poor),saved);
  let dense=C.fresh('sandbox');dense=C.place(dense,'tree',tile(3,4)).state;
  dense={...dense,cells:dense.cells.map((cell,i)=>cell||C.terrain[i]==='water'||C.distance(i,tile(4,4))>4?cell:{type:'house',level:1,roof:null,paid:0})};
  const upgrade=I.nextPlan(C,dense,tile(4,4));assert.equal(upgrade.kind,'upgrade');assert.equal(C.upgrade(dense,upgrade.target).error,'');
});
test('demolition, mission abandonment and Undo cannot invent a completed tour or bonus',()=>{
  const {state,session}=begin(),removed=C.demolish(state,session.home).state;
  assert.equal(I.status(C,removed,session).kind,'missing');assert.ok(I.nextPlan(C,removed,session.home).error);
  assert.equal(I.status(C,C.leaveNeighbourhoodMission(state).state,session).kind,'detached');
  assert.equal(I.status(C,state,{...session,stage:4}).kind,'active');assert.equal(state.cash,C.fresh().cash);
});
