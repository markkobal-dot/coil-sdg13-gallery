const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js'),L=require('../green-city-life.js');
const tile=(r,c)=>r*C.size+c;
const apply=result=>{assert.equal(result.error,'');return result.state;};
function city(){
  let state=C.fresh('sandbox');
  for(const [type,r,c]of [['park',4,7],['clinic',6,7],['firestation',9,7],['recycling',11,7],['waterworks',14,7]])state=apply(C.place(state,type,tile(r,c)));
  return {...state,population:1300};
}
function validateJourneys(state,plan){
  const roads=C.analyse(state).roads;
  for(const actor of [...plan.walkers,...plan.services]){
    assert.ok(state.cells[actor.from]);assert.ok(state.cells[actor.to]);assert.ok(actor.path.length>=2);
    assert.ok(actor.path.every(i=>roads.has(i)));
    for(let n=1;n<actor.path.length;n++)assert.ok(C.neighbours(actor.path[n-1]).includes(actor.path[n]));
    assert.ok(C.footprint(state.cells[actor.from].type,actor.from,state.cells[actor.from].rotation).some(i=>i===actor.path[0]||C.neighbours(i).includes(actor.path[0])));
  }
}
test('journeys use real connected buildings and contiguous roads without changing the saved city',()=>{
  const state=city(),before=JSON.stringify(state),a=C.analyse(state),plan=L.plan(C,state,a);
  assert.ok(plan.walkers.length>0);assert.deepEqual(new Set(plan.services.map(v=>v.kind)),new Set(['care','fire','waste','utility']));
  assert.ok(plan.services.some(v=>v.path.length>=6));validateJourneys(state,plan);
  assert.deepEqual(L.plan(C,state,a),plan);assert.equal(JSON.stringify(state),before);
  assert.deepEqual(C.restore(JSON.parse(before)),state);
});
test('a new city has neighbour visits, while zero population has no visual residents or service journeys',()=>{
  const state=C.fresh(),plan=L.plan(C,state,C.analyse(state));assert.ok(plan.walkers.length>0);assert.equal(plan.services.length,0);
  const empty={...city(),population:0};assert.deepEqual(L.plan(C,empty,C.analyse(empty)),{walkers:[],services:[]});
});
test('render budgets cap actors independently of population, including compact screens',()=>{
  const state={...city(),population:100000},a=C.analyse(state),full=L.plan(C,state,a),phone=L.plan(C,state,a,{walkers:32,services:2});
  assert.ok(full.walkers.length<=72);assert.ok(full.services.length<=6);assert.equal(phone.walkers.length,32);assert.equal(phone.services.length,2);
  assert.deepEqual(L.plan(C,state,a,{walkers:0,services:0}),{walkers:[],services:[]});
});
test('demolition and broken regional connections remove affected journeys, and restoring the road restores them',()=>{
  const state=city(),removed=apply(C.demolish(state,tile(6,7))),plan=L.plan(C,removed,C.analyse(removed));
  assert.ok(!plan.services.some(v=>v.from===tile(6,7)));assert.ok(!plan.walkers.some(v=>v.to===tile(6,7)));validateJourneys(removed,plan);
  const broken=apply(C.demolish(state,tile(17,10)));assert.deepEqual(L.plan(C,broken,C.analyse(broken)),{walkers:[],services:[]});
  const repaired=apply(C.place(broken,'road',tile(17,10)));assert.deepEqual(L.plan(C,repaired,C.analyse(repaired)),L.plan(C,state,C.analyse(state)));
});
test('sampled outward and return journeys remain on their road corridor, including corners and stops',()=>{
  const path=[tile(8,5),tile(9,5),tile(10,5),tile(10,6),tile(10,7),tile(10,8),tile(10,9),tile(10,10),tile(9,10)],allowed=new Set(path);
  for(const lane of [.15,.44]){
    const route=L.compile(path,C.size,lane,.5);assert.ok(route.duration>0);
    let paused=false;
    for(let t=0;t<route.duration;t+=.025){
      const p=L.sample(route,t);assert.ok(Number.isFinite(p.x+p.z+p.angle));paused||=!p.moving;
      const cell=Math.round(p.z+(C.size-1)/2)*C.size+Math.round(p.x+(C.size-1)/2);assert.ok(allowed.has(cell),'Must remain inside a path road tile');
    }
    assert.ok(paused);assert.deepEqual(L.sample(route,0),L.sample(route,route.duration));
    for(const segment of route.segments){
      const a=L.sample(route,segment.end-.00001),b=L.sample(route,segment.end+.00001);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.001,'No teleport at a turn or route boundary');
    }
  }
  assert.equal(L.compile([],C.size,.15,.5).duration,0);
});
test('instanced rendering stays bounded, supports hiding and compact resize, and freezes for reduced motion',async()=>{
  globalThis.GreenCity=C;globalThis.GreenCityLife=L;
  const {CityLife}=await import('../green-city-life-world.js'),THREE=await import('../assets/vendor/three/three.module.js');
  const life=new CityLife(new THREE.Scene()),state=city(),a=C.analyse(state);
  life.sync(C,state,a,false);assert.ok(life.parts.length<=14);assert.equal(life.people.length,72);assert.equal(life.vehicles.length,4);
  const body=life.body;life.update(5,true);const still=Array.from(body.instanceMatrix.array);life.update(5,true);assert.deepEqual(Array.from(body.instanceMatrix.array),still);
  life.update(6);assert.notDeepEqual(Array.from(body.instanceMatrix.array),still);
  assert.equal(life.toggle(),false);assert.equal(life.group.visible,false);assert.equal(life.toggle(),true);
  life.sync(C,state,a,true);assert.equal(life.people.length,32);assert.ok(life.parts.length<=14);assert.equal(life.group.children.length,life.parts.length);
  const noPeople={...state,population:0};life.sync(C,noPeople,C.analyse(noPeople),true);assert.equal(life.parts.length,0);assert.equal(life.group.children.length,0);life.update(7);
});
