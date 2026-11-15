const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js');
const i=8*C.size+5,apply=r=>{assert.equal(r.error,'');return r.state;};
test('every road improvement supports all four orientations and preserves road connections through save and upgrade',()=>{
 for(const type of Object.keys(C.upgrades).filter(t=>C.upgrades[t].site==='road'))for(let rotation=0;rotation<4;rotation++){
  const before=C.fresh('sandbox'),state=apply(C.place(before,type,i,rotation));
  assert.equal(state.cells[i].rotation||0,rotation);assert.equal(state.cash,before.cash-C.upgrades[type].cost);
  assert.deepEqual(C.analyse(state).roads,C.analyse(before).roads);
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
  const upgraded=apply(C.upgrade(state,i));assert.equal(upgraded.cells[i].rotation||0,rotation);
 }
});
test('existing road fixtures rotate for free without changing route paths or city finances',()=>{
 let state=apply(C.place(C.fresh('sandbox'),'bus',i));const original=state;
 for(let n=1;n<=4;n++){state=apply(C.rotateRoadItem(state,i));assert.equal(state.cells[i].rotation||0,n%4);assert.equal(state.cash,original.cash);assert.equal(state.cells[i].paid,original.cells[i].paid);assert.deepEqual(C.analyse(state).transport,C.analyse(original).transport);}
 assert.deepEqual(state.cells,original.cells);assert.equal(original.cells[i].rotation,undefined);
 const reverse=apply(C.rotateRoadItem(original,i,-1));assert.equal(reverse.cells[i].rotation,3);
 assert.ok(C.rotateRoadItem(original,0).error);assert.ok(C.rotateRoadItem(original,i,2).error);
});
test('the street geometry stays fixed while the shelter or lane markings rotate',async()=>{
 globalThis.GreenCity=C;
 const {CityWorld}=await import('../green-city-world.js');
 const world=Object.create(CityWorld.prototype);world.materials=new Map();world.smokePoints=[];
 const state=C.fresh('sandbox');
 for(const type of ['bus','tram','bike','ev','metro','bikeshare']){
  const zero=world.model({type,level:1,rotation:0},i,state.cells),turned=world.model({type,level:1,rotation:1},i,state.cells);
  const fixtures=turned.getObjectByName('Road fixtures');assert.equal(fixtures.rotation.y,-Math.PI/2);assert.ok(fixtures.children.length>0);
  const shape=g=>g.children.filter(c=>c.name!=='Road fixtures').map(m=>({position:m.position.toArray(),scale:m.scale.toArray(),rotation:m.rotation.toArray()}));
  assert.deepEqual(shape(turned),shape(zero));
 }
});
