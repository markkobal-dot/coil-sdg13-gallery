const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),P=require('../green-city-planning.js'),L=require('../green-city-life.js'),A=require('../green-city-art.js');
globalThis.GreenCityPlanning=P;
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;};
function site(state,type,near=true){return C.terrain.flatMap((_,i)=>C.canPlace(state,type,i)?[]:[i]).sort((a,b)=>(near?1:-1)*(Math.min(...C.footprint(type,a).map(j=>C.distance(j,tile(6,9))))-Math.min(...C.footprint(type,b).map(j=>C.distance(j,tile(6,9))))))[0];}

test('home navigation resolves the resident home, not their current destination or selected tile',()=>{
 const state=C.fresh('sandbox'),a=C.analyse(state),actor=L.plan(C,state,a).walkers.find(p=>p.activity==='work'),before=JSON.stringify(state);
 assert.ok(actor);const target=P.residentBuilding(C,state,a,actor,'home');assert.equal(target.i,actor.from);assert.notEqual(target.i,actor.to);assert.equal(target.name,C.types[state.cells[actor.from].type].name);assert.deepEqual(target.plots,C.footprint(state.cells[actor.from].type,actor.from));assert.equal(JSON.stringify(state),before);
 const work=P.residentBuilding(C,state,a,actor,'work');assert.equal(work.i,actor.workplace);assert.equal(P.residentBuilding(C,state,a,{...actor,workplace:null},'work'),null);assert.equal(P.residentBuilding(C,state,a,actor,'other'),null);
 const removed=apply(C.demolish(state,actor.from));assert.equal(P.residentBuilding(C,removed,C.analyse(removed),actor,'home'),null);
});

test('home highlighting frames the entire housing footprint, persists when city life is hidden, and clears after demolition',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js'),THREE=await import('../assets/vendor/three/three.module.js');
 const s=C.fresh('sandbox'),i=tile(4,11),a=C.analyse(s),actor=L.plan(C,s,a).walkers.find(p=>p.from===i);assert.ok(actor);
 const w=Object.create(CityWorld.prototype);w.scene=new THREE.Scene();w.state=s;w.analysis=a;w.resident=actor;w.residentBuildingKind='home';w.pickTargets=[{userData:{cell:i},scale:{y:3}}];w.createResidentBuildingMarker();
 w.life={enabled:false};const target=w.updateResidentBuilding();assert.equal(target.i,i);assert.ok(w.residentBuildingMarker.visible);assert.ok(w.buildingOutline.scale.x>1);assert.ok(w.buildingOutline.scale.y>3);assert.equal(w.residentBuildingMarker.position.x,i%C.size-(C.size-1)/2);
 w.personRing={visible:true};w.personRoute={visible:true};w.updateResident(0);assert.equal(w.personRing.visible,false);assert.equal(w.personRoute.visible,false);assert.ok(w.residentBuildingMarker.visible);
 w.state=apply(C.demolish(s,i));w.analysis=C.analyse(w.state);assert.equal(w.updateResidentBuilding(),null);assert.equal(w.residentBuildingMarker.visible,false);
});

test('polluting workplaces can earn more operating income with workers, but cannot create taxes from empty jobs',()=>{
 for(const type of ['heavyindustry','refinery']){
  const base={...C.fresh('sandbox'),population:1200},i=site(base,type),before=C.analyse(base),s=apply(C.place(base,type,i)),after=C.analyse(s);
  assert.ok(after.budget.businessRevenue>before.budget.businessRevenue);assert.ok(after.net>before.net,type+' has a profitable staffed-city trade-off');assert.ok(after.pollution>before.pollution);assert.equal(C.analyse({...s,population:0}).budget.businessRevenue,0);
  assert.equal(s.cash,base.cash-C.types[type].cost);const next=apply(C.advance(s));assert.ok(next.cash>=s.cash+after.net);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);
 }
});

test('nearby industry harms local living conditions and resident happiness more than distant industry',()=>{
 const base=C.fresh('sandbox'),home=tile(6,9),actor=L.plan(C,base,C.analyse(base)).walkers.find(p=>p.from===home);assert.ok(actor);
 for(const type of ['heavyindustry','refinery']){
  const near=apply(C.place(base,type,site(base,type))),far=apply(C.place(base,type,site(base,type,false))),a=C.analyse(near),b=C.analyse(far),local=a.homeProfiles.find(h=>h.i===home),remote=b.homeProfiles.find(h=>h.i===home);
  assert.ok(a.happiness<C.analyse(base).happiness);
  assert.ok(local.pollution>remote.pollution);assert.ok(local.noise>remote.noise);const r=P.resident(C,near,a,actor),s=P.resident(C,far,b,actor);assert.ok(r.happiness<s.happiness);assert.ok(r.happinessDetail.includes('pollution'));assert.ok(C.tileInfo(near,home,a).heat>C.tileInfo(far,home,b).heat);
  const cleaned=apply(C.demolish(near,site(base,type)));assert.equal(C.analyse(cleaned).homeProfiles.find(h=>h.i===home).pollution,0);
 }
});

test('industrial previews match committed tax, pollution and power changes without spending or changing the saved city',()=>{
 const state=C.fresh('sandbox'),before=JSON.stringify(state),a=C.analyse(state);
 for(const type of ['heavyindustry','refinery']){const i=site(state,type),preview=P.forecast(C,state,{mode:'build',type,i}),after=C.analyse(apply(C.place(state,type,i)));
  assert.equal(preview.businessTaxChange,after.budget.businessRevenue-a.budget.businessRevenue);assert.equal(preview.airChange,after.scores[0]-a.scores[0]);assert.equal(preview.powerDemandChange,after.demand-a.demand);assert.ok(preview.homes.some(h=>h.changes.some(c=>c.key==='pollution'&&c.benefit<0)));assert.equal(JSON.stringify(state),before);
 }
});

test('heavy industry and refineries stop production after losing roads, preserve rotations, and have proper models and artwork',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js'),w=Object.create(CityWorld.prototype);w.materials=new Map();w.smokePoints=[];
 for(const type of ['heavyindustry','refinery'])for(let rotation=0;rotation<4;rotation++){
  const base=C.fresh('sandbox'),i=C.terrain.findIndex((_,j)=>!C.canPlace(base,type,j,undefined,rotation)),s=apply(C.place(base,type,i,rotation));assert.ok(w.model(s.cells[i],i,s.cells).children.length>0);assert.ok(A.piece(type,'land').length>250);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);
  const broken=apply(C.demolish(s,tile(17,10))),a=C.analyse(broken);assert.ok(!a.workplaces.some(job=>job.type===type));assert.ok(a.homeProfiles.every(h=>h.pollution===0));
 }
});
