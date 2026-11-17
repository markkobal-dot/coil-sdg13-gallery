const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),P=require('../green-city-planning.js'),L=require('../green-city-life.js'),A=require('../green-city-art.js');
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;},specialists=['ecofactory','gamestudio','ailab'];

test('specialist employers charge for land, upkeep and computing; tax bonuses require actual workers',()=>{
 for(const type of specialists){const base=C.fresh('sandbox'),i=C.terrain.findIndex((_,j)=>!C.canPlace(base,type,j)),s=apply(C.place(base,type,i)),a=C.analyse(s),empty=C.analyse({...s,population:0});
  assert.equal(base.cash-s.cash,C.types[type].cost);assert.ok(a.jobs>C.analyse(base).jobs);assert.ok(a.demand>C.analyse(base).demand);assert.ok(a.budget.specialistTax>0);assert.equal(empty.budget.specialistTax,0);assert.equal(empty.budget.businessRevenue,0);
  assert.equal(a.budget.businessRevenue,Math.round(Math.min(a.jobs,s.population*.42)*.018*s.policies.businessTax)+a.budget.specialistTax);
  const removed=apply(C.demolish(s,i));assert.equal(C.analyse(removed).budget.specialistTax,0);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);
 }
 assert.ok(C.types.ailab.powerDemand>C.types.gamestudio.powerDemand*3);
});

test('new jobs stop generating tax premiums when their road access is lost',()=>{
 let s=C.fresh('sandbox');s=apply(C.place(s,'gamestudio',tile(4,7)));assert.ok(C.analyse(s).budget.specialistTax>0);
 s=apply(C.demolish(s,tile(17,10)));const a=C.analyse(s);assert.equal(a.budget.specialistTax,0);assert.ok(!a.workplaces.some(w=>w.type==='gamestudio'));
});

test('resident job titles come from their actual employer, and removing that employer clears the title',()=>{
 const base=C.fresh('sandbox'),actor=L.plan(C,base,C.analyse(base)).walkers[0];
 for(const type of specialists){const i=C.terrain.findIndex((_,j)=>!C.canPlace(base,type,j)),s=apply(C.place(base,type,i)),person={...actor,workplace:i},r=P.resident(C,s,C.analyse(s),person);
  assert.ok(C.types[type].professions.includes(r.profession));assert.equal(r.workplace.i,i);assert.equal(r.income,'Comfortable');
  const removed=apply(C.demolish(s,i)),gone=P.resident(C,removed,C.analyse(removed),person);assert.equal(gone.workplace,null);assert.equal(gone.profession,'Looking for work');
 }
});

test('personal happiness responds to real neighbourhood improvements, noise and job loss without altering saves',()=>{
 let s=C.fresh('sandbox');const actor=L.plan(C,s,C.analyse(s)).walkers.find(p=>p.from===tile(4,4));assert.ok(actor);const before=JSON.stringify(s),first=P.resident(C,s,C.analyse(s),actor);
 assert.equal(JSON.stringify(s),before);s=apply(C.place(s,'park',tile(4,3)));s=apply(C.place(s,'clinic',tile(3,4)));const better=P.resident(C,s,C.analyse(s),actor);assert.ok(better.happiness>first.happiness);assert.ok(better.health>first.health);
 const notWorking=P.resident(C,s,C.analyse(s),{...actor,workplace:null});assert.ok(notWorking.happiness<=better.happiness);assert.ok(notWorking.happinessDetail.includes('job'));
 const noisy={...C.analyse(s),homeProfiles:C.analyse(s).homeProfiles.map(h=>({...h,noise:100}))},worse=P.resident(C,s,noisy,actor);assert.ok(worse.happiness<better.happiness);
 for(const r of [first,better,notWorking,worse]){assert.ok(r.happiness>=0&&r.happiness<=100);assert.ok(r.mood);assert.ok(r.happinessDetail);}
});

test('city priorities identify financial and local problems without charging money or recommending locked tools',()=>{
 const s=C.fresh(),before=JSON.stringify(s),a=C.analyse(s),tips=P.priorities(C,s,a);assert.ok(tips.length>0&&tips.length<=3);assert.equal(new Set(tips.map(t=>t.id)).size,tips.length);
 assert.equal(JSON.stringify(s),before);for(const t of tips.filter(t=>t.type)){assert.ok(!C.types[t.type].unlock||C.types[t.type].unlock<=a.tier);assert.equal(t.cost,C.types[t.type].cost);}
 assert.equal(P.priorities(C,s,{...a,net:-200})[0].id,'budget');
 const broke=P.priorities(C,{...s,cash:0},a).filter(t=>t.type);assert.ok(broke.every(t=>!t.affordable));
});

test('healthcare inspection counts actual homes within the facility radius and detects disconnection',()=>{
 const base=C.fresh('sandbox'),i=tile(6,7),s=apply(C.place(base,'regionalhospital',i)),a=C.analyse(s),r=P.healthcare(C,s,a,i);
 assert.equal(r.radius,12);assert.equal(r.homes,a.homeProfiles.filter(h=>h.linked&&C.footprint('regionalhospital',i).some(j=>C.distance(j,h.i)<12)).length);assert.ok(r.linked);
 const follower=C.footprint('regionalhospital',i)[3];assert.deepEqual(P.healthcare(C,s,a,follower),r);assert.equal(P.healthcare(C,s,a,tile(4,4)),null);
 const broken=apply(C.demolish(s,tile(17,10)));assert.equal(P.healthcare(C,broken,C.analyse(broken),i).linked,false);
});

test('specialist buildings have original models, thumbnails, rotated footprints and usable roofs',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js'),world=Object.create(CityWorld.prototype);world.materials=new Map();world.smokePoints=[];
 for(const type of specialists)for(let rotation=0;rotation<(C.rotatable(type)?4:1);rotation++){
  const base=C.fresh('sandbox'),i=C.terrain.findIndex((_,j)=>!C.canPlace(base,type,j,undefined,rotation)),s=apply(C.place(base,type,i,rotation));
  assert.ok(world.model(s.cells[i],i,s.cells).children.length>0);assert.ok(A.piece(type,'land').length>250);
  const roof=apply(C.place(s,'solar',C.footprint(type,i,rotation).at(-1)));assert.deepEqual(C.restore(JSON.parse(JSON.stringify(roof))),roof);
 }
});
