const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),P=require('../green-city-planning.js');
globalThis.GreenCity=C;globalThis.GreenCityPlanning=P;
const apply=r=>{assert.equal(r.error,'');return r.state;};
test('visual day repeats every three minutes, has continuous sunrise and sunset, and cannot alter finances',()=>{
 const s=C.fresh(),before=JSON.stringify(s);assert.equal(P.daylight(0).darkness,0);assert.equal(P.daylight(90).darkness,1);assert.deepEqual(P.daylight(0),P.daylight(180));assert.equal(P.daylight(50).label,'Sunset');assert.equal(P.daylight(130).label,'Sunrise');
 for(let t=0;t<180;t+=.25){const x=P.daylight(t),y=P.daylight(t+.25);assert.ok(x.darkness>=0&&x.darkness<=1);assert.ok(Math.abs(x.darkness-y.darkness)<.02);assert.ok(x.hour>=0&&x.hour<24);}
 assert.equal(JSON.stringify(s),before);
});
test('empty homes remain unlit and the occupancy map uses real residents, including footprint followers',()=>{
 let s=C.fresh('sandbox'),i=C.terrain.findIndex((_,j)=>!C.canPlace(s,'luxuryapartment',j));s=apply(C.place(s,'luxuryapartment',i));const a=C.analyse(s),followers=C.footprint('luxuryapartment',i);
 for(const j of followers){assert.equal(P.buildingActivity(C,s,a,j).housing,0);assert.equal(P.occupancyMap(C,s,a,j,'housing'),0);}
 const home=a.homeProfiles.find(h=>h.residents>0);assert.ok(P.buildingActivity(C,s,a,home.i).housing>0);assert.equal(P.occupancyMap(C,s,a,0,'housing'),null);
 s=apply(C.advance(s));assert.ok(P.buildingActivity(C,s,C.analyse(s),i).housing>0);
});
test('business activity and staffing overlay follow actual filled jobs and stop without workers',()=>{
 const s=C.fresh(),a=C.analyse(s),w=a.workplaces.find(w=>w.filled>0);assert.ok(w);assert.equal(P.buildingActivity(C,s,a,w.i).staffing,w.filled/w.positions);assert.equal(P.occupancyMap(C,s,a,w.i,'staffing'),Math.round(w.filled/w.positions*100));
 const empty={...s,population:0},b=C.analyse(empty);assert.equal(P.buildingActivity(C,empty,b,w.i).staffing,0);assert.equal(P.occupancyMap(C,empty,b,w.i,'staffing'),0);
 const base=C.fresh('sandbox'),i=C.terrain.findIndex((_,j)=>!C.canPlace(base,'ailab',j,undefined,1)),multi=apply(C.place(base,'ailab',i,1)),ma=C.analyse(multi);for(const j of C.footprint('ailab',i,1))assert.equal(P.occupancyMap(C,multi,ma,j,'staffing'),P.occupancyMap(C,multi,ma,i,'staffing'));
});
test('night windows are instanced, vacancy updates without rebuilding static buildings, and shared materials stay unchanged',async()=>{
 const {CityWorld}=await import('../green-city-world.js'),T=await import('../assets/vendor/three/three.module.js');
 const w=Object.create(CityWorld.prototype);w.materials=new Map();w.smokePoints=[];w.scene=new T.Scene();w.state=C.fresh();w.analysis=C.analyse(w.state);w.darkness=1;
 const root=new T.Group();for(const h of w.analysis.homeProfiles){const g=w.model(w.state.cells[h.i],h.i,w.state.cells);g.position.x=h.i%C.size;root.add(g);}root.updateMatrixWorld(true);w.makeWindows(root);w.updateActivity();
 assert.ok(w.windowMesh.isInstancedMesh);assert.ok(w.windowMesh.count>0);assert.ok(w.windowActivity.some(Boolean));const sample=new T.Color();w.windowMesh.getColorAt(w.windowActivity.indexOf(true),sample);assert.ok(sample.r>sample.b);assert.ok(w.windowMesh.material.isMeshBasicMaterial);const mesh=w.windowMesh,materials=[...w.materials.values()].map(m=>m.emissiveIntensity);
 w.state={...w.state,population:0};w.analysis=C.analyse(w.state);w.updateActivity();assert.equal(w.windowMesh,mesh);assert.ok(w.windowActivity.every(x=>!x));assert.deepEqual([...w.materials.values()].map(m=>m.emissiveIntensity),materials);
});
test('manual lighting holds the view, automatic cycling resumes the current phase, and hidden views cancel rendering',async()=>{
 const {CityWorld}=await import('../green-city-world.js');const w=Object.create(CityWorld.prototype);w.night=false;w.daySeconds=40;w.applyDaylight=x=>{w.darkness=x;w.night=x>=.5;};w.reportDaylight=()=>{};w.schedule=()=>{};
 w.setCycle(false);assert.equal(w.daySeconds,40);w.toggleNight();assert.equal(w.cycleEnabled,false);assert.equal(w.darkness,1);assert.equal(w.daySeconds,90);w.setCycle(true);assert.equal(w.daySeconds,90);w.toggleNight();assert.equal(w.darkness,0);
 const oldDocument=global.document,oldCancel=global.cancelAnimationFrame;try{global.document={hidden:true};let cancelled;global.cancelAnimationFrame=x=>cancelled=x;w.raf=123;w.setActive(true);assert.equal(w.active,false);assert.equal(w.raf,0);assert.equal(cancelled,123);}finally{global.document=oldDocument;global.cancelAnimationFrame=oldCancel;}
});
test('industrial smoke scales with staffing and disappears in a city without employees',async()=>{
 const {CityWorld}=await import('../green-city-world.js'),T=await import('../assets/vendor/three/three.module.js');const w=Object.create(CityWorld.prototype);w.scene=new T.Scene();w.reduced={matches:false};w.state=C.fresh();w.analysis=C.analyse(w.state);
 const job=w.analysis.workplaces.find(x=>x.type==='factory');assert.ok(job);const origin=new T.Vector3();origin.cell=job.i;w.smokePoints=[origin];w.makeSmoke();assert.equal(w.activeSmoke.length,1);assert.equal(w.activeSmoke[0].rate,job.filled/job.positions);assert.equal(w.smoke.count,6);
 w.analysis=C.analyse({...w.state,population:0});w.makeSmoke();assert.equal(w.smoke,null);assert.equal(w.activeSmoke.length,0);
});
test('milestone feedback contains only newly earned levels and grants, without granting money twice',()=>{
 let s=C.fresh();const before=JSON.stringify(s),next=C.grant({...s,month:3}).state,r=P.unlocks(C,s,next);assert.equal(r.levels.length,1);assert.equal(r.levels[0].level,2);assert.ok(r.buildings.includes('Eco manufacturing'));assert.equal(JSON.stringify(s),before);assert.equal(P.unlocks(C,next,next).levels.length,0);
 const earned={...next,grants:[...next.grants,'energy']},g=P.unlocks(C,next,earned);assert.equal(g.grants[0].id,'energy');assert.equal(earned.cash,next.cash);assert.equal(P.unlocks(C,earned,earned).grants.length,0);
});

test('the actual render clock completes a cycle, pauses offscreen, and still advances with reduced motion',async()=>{
 const {CityWorld}=await import('../green-city-world.js');
 for(const reduced of [false,true]){
  const w=Object.create(CityWorld.prototype),samples=[];Object.assign(w,{active:true,reduced:{matches:reduced},lastFrame:0,daySeconds:0,cycleEnabled:true,time:0,rotors:[],cars:[],waterMaterial:{uniforms:{uTime:{value:0}}},life:{update(){}},renderer:{render(){}},schedule(){},updateResident(){},reportDaylight(){},applyDaylight(n){samples.push(n);this.dirty=true;}});
  const step=reduced?1000:40;for(let t=step;t<=180000+step;t+=step)w.frame(t);
  assert.ok(samples.some(n=>n===0));assert.ok(samples.some(n=>n===1));assert.ok(Math.min(w.daySeconds,180-w.daySeconds)<.1);const time=w.daySeconds;w.active=false;w.frame(200000);assert.equal(w.daySeconds,time);
  w.active=true;w.cycleEnabled=false;w.frame(200040);assert.equal(w.daySeconds,time);
 }
});
