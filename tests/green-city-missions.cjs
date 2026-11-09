const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js');
const tile=(r,c)=>r*C.size+c,home=tile(4,6),apply=result=>{assert.equal(result.error,'');return result.state;};
const start=(id,state=C.fresh('sandbox'))=>apply(C.startNeighbourhoodMission(state,id,home));
const build=(state,type,r,c)=>apply(C.place(state,type,tile(r,c)));
function improved(id){
  let state=start(id);
  if(id==='shade')state=build(build(state,'park',3,6),'park',4,7);
  if(id==='transit')state=build(build(state,'bus',5,6),'bus',5,7);
  if(id==='care')state=build(build(state,'clinic',3,6),'clinic',4,7);
  return state;
}
test('all three neighbourhood missions are achievable with legal purchases and pay exactly once',()=>{
  for(const def of C.neighbourhoodMissionDefs){
    const state=improved(def.id),report=C.neighbourhoodMissions(state).find(m=>m.id===def.id);assert.equal(report.ready,true,def.id);
    const before=state.cash,paid=C.awardNeighbourhoodMission(state);assert.equal(paid.state.cash,before+def.reward);assert.equal(paid.reward.id,def.id);
    assert.equal(paid.state.missions.active,null);assert.equal(paid.state.missions.completed.length,1);assert.equal(state.missions.completed.length,0);
    assert.equal(C.awardNeighbourhoodMission(paid.state).state,paid.state);assert.ok(C.startNeighbourhoodMission(paid.state,def.id,home).error);
    const restored=C.restore(JSON.parse(JSON.stringify(paid.state)));assert.deepEqual(restored,paid.state);assert.equal(C.awardNeighbourhoodMission(restored).reward,null);
  }
});
test('starting and leaving missions is free, only one runs at a time, and satisfied or invalid targets are rejected',()=>{
  const state=C.fresh('sandbox'),active=start('shade',state);assert.equal(active.cash,state.cash);assert.equal(active.cells,state.cells);
  for(const [id,i]of [['wrong',home],['shade',0],['shade',tile(5,6)],['care',-1]])assert.equal(C.startNeighbourhoodMission(state,id,i).state,state);
  assert.equal(C.startNeighbourhoodMission(active,'care',home).state,active);
  const left=apply(C.leaveNeighbourhoodMission(active));assert.equal(left.cash,active.cash);assert.equal(left.missions.active,null);assert.equal(C.awardNeighbourhoodMission(left).reward,null);
  const served=improved('shade');assert.ok(C.startNeighbourhoodMission(apply(C.leaveNeighbourhoodMission(served)),'shade',home).error);
});
test('progress reflects actual local improvement, and distant greenery cannot complete a shade mission',()=>{
  const active=start('shade'),far=build(active,'park',23,20),report=C.neighbourhoodMissions(far).find(m=>m.active);
  assert.equal(report.progress,0);assert.equal(C.awardNeighbourhoodMission(far).reward,null);
  const near=build(active,'park',3,6),partial=C.neighbourhoodMissions(near).find(m=>m.active);assert.ok(partial.progress>0&&partial.progress<100);
});
test('healthcare requires a balanced operating budget and transport requires public transit',()=>{
  let care=improved('care');care={...care,population:0,loan:{balance:1080,payment:90}};
  for(let r=2;r<17&&C.analyse(care).net>=0;r++)for(let c=3;c<17&&C.analyse(care).net>=0;c++)if(!C.canPlace(care,'clinic',tile(r,c)))care=build(care,'clinic',r,c);
  assert.ok(C.analyse(care).net<0);const report=C.neighbourhoodMissions(care).find(m=>m.active);
  assert.ok(report.value>=40);assert.equal(report.ready,false);assert.equal(report.progress,99);assert.equal(C.awardNeighbourhoodMission(care).reward,null);
  let transit=start('transit');for(const [r,c]of [[5,6],[5,7],[5,8],[5,9],[3,5],[4,5]])transit=build(transit,'ev',r,c);
  const t=C.neighbourhoodMissions(transit).find(m=>m.active);assert.ok(t.value>=55);assert.equal(t.ready,false);assert.equal(C.awardNeighbourhoodMission(transit).reward,null);
});
test('demolished or disconnected targets retain their mission and cannot claim a reward',()=>{
  const ready=improved('shade'),removed=apply(C.demolish(ready,home)),disconnected=apply(C.demolish(ready,tile(17,10)));
  assert.equal(C.neighbourhoodMissions(removed).find(m=>m.active).missing,true);assert.equal(C.awardNeighbourhoodMission(removed).reward,null);
  assert.equal(C.awardNeighbourhoodMission(disconnected).reward,null);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(removed))),removed);
  const repaired=build(disconnected,'road',17,10);assert.ok(C.awardNeighbourhoodMission(repaired).reward);
});
test('legacy saves acquire no mission progress, and active or completed records are validated',()=>{
  const old=C.fresh('sandbox');assert.deepEqual(C.restore(JSON.parse(JSON.stringify(old))),old);assert.equal(C.restore(old).missions,undefined);
  const state=start('shade');assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
  const invalid=[null,{}, {active:null,completed:[{id:'shade'}]}, {active:{...state.missions.active,baseline:40},completed:[]}, {active:{...state.missions.active,home:0},completed:[]}];
  for(const missions of invalid)assert.throws(()=>C.restore({...state,missions}));
  const paid=C.awardNeighbourhoodMission(improved('shade')).state;
  assert.throws(()=>C.restore({...paid,missions:{...paid.missions,completed:[...paid.missions.completed,...paid.missions.completed]}}));
  assert.throws(()=>C.restore({...paid,missions:{...paid.missions,active:state.missions.active}}));
});
test('Undo and Redo snapshots restore the exact award and remain safe after reload',()=>{
  const before=improved('shade'),after=C.awardNeighbourhoodMission(before).state;
  assert.equal(after.cash-before.cash,180);assert.equal(C.awardNeighbourhoodMission(after).reward,null);
  const undone=C.restore(JSON.parse(JSON.stringify(before)));assert.ok(undone.missions.active);assert.equal(undone.cash,before.cash);
  const redone=C.restore(JSON.parse(JSON.stringify(after)));assert.equal(redone.cash,after.cash);assert.equal(C.awardNeighbourhoodMission(redone).reward,null);
});
