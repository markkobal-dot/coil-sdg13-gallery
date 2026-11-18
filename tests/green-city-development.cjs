const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),D=require('../green-city-development.js'),L=require('../green-city-life.js'),P=require('../green-city-planning.js'),A=require('../green-city-art.js');
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;};
const newer=['luxuryhouse','luxuryapartment','officepark','regionalhospital','internationalairport','containerport'];
function build(s,type){const i=C.terrain.findIndex((_,j)=>!C.canPlace(s,type,j));assert.ok(i>=0,type+' has space');return [apply(C.place(s,type,i)),i];}
function greenCity(){let s={...C.fresh('sandbox'),cash:1000000};for(let n=0;n<12;n++)[s]=build(s,'park');return s;}

test('district purchases require milestones and funds, charge once, and survive Undo snapshots and reload',()=>{
 const fresh=C.fresh(),before=JSON.stringify(fresh);assert.ok(C.purchaseLand(fresh,'meadows').error);assert.equal(JSON.stringify(fresh),before);
 const ready={...greenCity(),challenge:'revolution',districts:['central'],population:700,cityLevel:3};
 const report=C.landReports(ready).find(d=>d.id==='meadows');assert.ok(report.eligible);
 assert.ok(C.purchaseLand({...ready,cash:report.cost-1},'meadows').error);
 const paid=apply(C.purchaseLand(ready,'meadows'));assert.equal(paid.cash,ready.cash-report.cost);assert.ok(paid.districts.includes('meadows'));
 assert.ok(C.purchaseLand(paid,'meadows').error);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(paid))),paid);
 assert.deepEqual(ready.districts,['central']);assert.equal(C.restore(JSON.parse(JSON.stringify(ready))).cash,ready.cash);
});

test('unowned districts reject buildings, roads and relocations before charging anything',()=>{
 const s=C.fresh(),i=tile(20,12);assert.equal(C.ownsLand(s,i),false);
 for(const r of [C.place(s,'tree',i),C.buildLine(s,tile(17,12),i),C.relocate(s,tile(4,4),i)]){assert.ok(r.error);assert.equal(r.state,s);}
 const owned={...s,districts:['central','meadows']};assert.equal(C.canPlace(owned,'tree',i),'');
});

test('legacy saves retain all districts containing their existing buildings without a migration charge',()=>{
 let s=C.fresh('sandbox');s=apply(C.place(s,'tree',tile(20,12)));s=apply(C.place(s,'tree',tile(8,21)));
 const raw=JSON.parse(JSON.stringify({...s,challenge:'revolution'}));delete raw.districts;delete raw.cityLevel;delete raw.affluentPopulation;
 const restored=C.restore(raw);assert.deepEqual(new Set(restored.districts),new Set(['central','meadows','east']));assert.equal(restored.cash,s.cash);assert.deepEqual(restored.cells,s.cells);
 for(const change of [{districts:['central','fake']},{districts:['central','central']},{affluentPopulation:-1},{affluentPopulation:s.population+1},{cityLevel:5}])assert.throws(()=>C.restore({...s,...change}));
 assert.throws(()=>C.restore({...s,challenge:'revolution',districts:['central']}));
});

test('development levels unlock in order and earned levels remain available when conditions fall',()=>{
 const s=C.fresh();assert.equal(C.analyse(s).tier,1);assert.equal(C.analyse({...s,month:3}).tier,2);
 assert.match(C.canPlace(s,'luxuryhouse',tile(4,7)),/city level 3/);
 let prepared=greenCity();for(const type of ['officepark','regionalhospital','solar','solar','solar'])[prepared]=build(prepared,type);
 const earned=C.grant({...prepared,challenge:'revolution',population:450,month:3,policies:{...s.policies,residentialTax:6}}).state;
 assert.ok(earned.cityLevel>=3);assert.equal(C.analyse({...earned,population:0}).tier,earned.cityLevel);
 assert.equal(C.analyse(C.fresh('sandbox')).tier,4);
});

test('both airport and freight sizes share finite demand, while oversized infrastructure loses money and confidence',()=>{
 for(const [small,big]of [['airport','internationalairport'],['cargoport','containerport']]){
  let s={...C.fresh('sandbox'),cash:1000000};[s]=build(s,small);const before=C.analyse(s);[s]=build(s,big);const after=C.analyse(s),report=after.connections.find(c=>c.type===big);
  assert.ok(report.revenue<report.upkeep);assert.ok(after.infrastructurePenalty>before.infrastructurePenalty);
  assert.ok(after.connections.find(c=>c.type===small).utilisation<before.connections[0].utilisation);
  assert.ok(after.connections.every(c=>c.customers<=c.operatingCapacity));
  assert.ok(after.connections.reduce((sum,c)=>sum+c.customers,0)<=Math.round(s.population*(small==='airport'?.08:.035)+s.population*.42*(small==='airport'?.06:.25))+1);
  const forecast=P.forecast(C,{...C.fresh('sandbox'),cash:1000000},{mode:'build',type:big,i:report.i});assert.equal(forecast.connection.type,big);assert.ok(forecast.netChange<0);
 }
});

test('small clinics, district hospitals and regional hospitals offer increasingly wider healthcare',()=>{
 assert.ok(C.types.clinic.radius<C.types.hospital.radius);assert.ok(C.types.hospital.radius<C.types.regionalhospital.radius);
 const base=C.fresh('sandbox'),site=tile(6,7),home=tile(4,9);
 const small=C.analyse(apply(C.place(base,'clinic',site))).homeProfiles.find(h=>h.i===home);
 const district=C.analyse(apply(C.place(base,'hospital',site))).homeProfiles.find(h=>h.i===home);
 const large=C.analyse(apply(C.place(base,'regionalhospital',site))).homeProfiles.find(h=>h.i===home);
 assert.ok(large.health>district.health);assert.ok(district.health>small.health);
 const upgraded=apply(C.upgrade(apply(C.place(base,'regionalhospital',site)),site));assert.ok(C.analyse(upgraded).homeProfiles.find(h=>h.i===home).health>=large.health);
});

test('affluent demand requires good housing and jobs, moves gradually and taxes only actual affluent residents',()=>{
 const state={population:1000,affluentPopulation:0},homes=[{i:1,type:'luxuryapartment',capacity:1000,linked:true,luxury:true}];
 const input={state,homes,homeProfiles:[{i:1,shade:85,health:90,services:90,noise:5}],workplaces:[{type:'officepark',jobs:400,positions:400,filled:400}],air:90,happiness:85,employment:100,policy:{residentialTax:10}};
 const a=D.society(input);assert.ok(a.affluentTarget>100);assert.ok(a.nextAffluent>0&&a.nextAffluent<a.affluentTarget);assert.equal(a.premiumTax,0);
 const inhabited=D.society({...input,state:{...state,affluentPopulation:100}});assert.ok(inhabited.premiumTax>0);
 assert.equal(D.society({...input,workplaces:[]}).affluentTarget,0);assert.equal(D.society({...input,policy:{residentialTax:18}}).affluentTarget,0);
 assert.equal(D.society({...input,happiness:40}).affluentTarget,0);
 const gone=D.society({...input,state:{...state,affluentPopulation:100},homes:homes.map(h=>({...h,luxury:false}))});assert.equal(gone.affluent,0);assert.equal(gone.premiumTax,0);
});

test('luxury construction changes capacity without spawning residents; monthly progression uses the derived demand',()=>{
 let s=greenCity(),i;[s,i]=build(s,'luxuryapartment');[s]=build(s,'officepark');[s]=build(s,'regionalhospital');
 s=C.grant(s).state;const a=C.analyse(s);assert.equal(s.affluentPopulation,0);assert.equal(a.society.affluent,0);assert.ok(a.society.luxuryCapacity>0);assert.ok(a.jobs>C.analyse(C.fresh()).jobs);
 const next=apply(C.advance(s));assert.equal(next.affluentPopulation,Math.min(next.population,a.society.nextAffluent));assert.equal(next.cash,s.cash+a.net);
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(next))),next);
 const removed=apply(C.demolish({...s,affluentPopulation:50},i));assert.equal(C.analyse(removed).society.premiumTax,0);
});

test('resident workplaces refer to current connected employers, work journeys agree with them, and removed employers disappear',()=>{
 let s=greenCity();[s]=build(s,'luxuryapartment');let office;[s,office]=build(s,'officepark');
 const a=C.analyse(s),people=L.plan(C,s,a).walkers;assert.ok(people.some(p=>p.workplace!==null));
 for(const p of people){const r=P.resident(C,s,a,p);if(p.workplace!==null){assert.ok(a.workplaces.some(w=>w.i===p.workplace&&w.linked));assert.equal(r.workplace.i,p.workplace);}else assert.equal(r.workplace,null);if(p.activity==='work')assert.equal(p.workplace,p.to);assert.ok(r.housing);assert.ok(r.income);}
 const removed=apply(C.demolish(s,office)),b=C.analyse(removed);assert.ok(L.plan(C,removed,b).walkers.every(p=>p.workplace!==office));
});

test('all added facilities have geometry and artwork, support rotated footprints, and preserve exact save data',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js'),world=Object.create(CityWorld.prototype);world.materials=new Map();world.smokePoints=[];
 for(const type of newer)for(let rotation=0;rotation<(C.rotatable(type)?4:1);rotation++){
  const base=C.fresh('sandbox'),i=C.terrain.findIndex((_,j)=>!C.canPlace(base,type,j,undefined,rotation));assert.ok(i>=0,type);
  const s=apply(C.place(base,type,i,rotation)),model=world.model(s.cells[i],i,s.cells);assert.ok(model.children.length>=1);assert.ok(A.piece(type,'land').length>200);
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);assert.equal(C.footprint(type,i,rotation).filter(j=>s.cells[j]).length,C.dimensions(type,rotation).reduce((a,b)=>a*b));
 }
});

test('rooftop retrofits clicked on a multi-plot facility attach to its anchor without corrupting its save',()=>{
 const base=C.fresh('sandbox'),i=tile(6,7),built=apply(C.place(base,'regionalhospital',i)),follower=C.footprint('regionalhospital',i)[3];
 const roof=apply(C.place(built,'solar',follower));assert.equal(roof.cells[i].roof,'solar');assert.equal(roof.cells[follower].roof,null);assert.equal(roof.cash,built.cash-C.upgrades.solar.cost);
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(roof))),roof);assert.match(C.canPlace(roof,'solar',follower),/already/);
});
