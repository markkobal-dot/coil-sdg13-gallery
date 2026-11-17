const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),L=require('../green-city-life.js'),P=require('../green-city-planning.js');globalThis.GreenCity=C;globalThis.GreenCityLife=L;globalThis.GreenCityPlanning=P;
const apply=r=>{assert.equal(r.error,'');return r.state;},tile=(r,c)=>r*C.size+c,seconds=h=>((h-12+24)%24)/24*180;
function city(){let s={...C.fresh('sandbox'),cash:500000};for(const [type,r,c]of [['school',4,3],['park',4,7],['market',8,6],['clinic',6,7],['firestation',9,7],['recycling',11,7],['waterworks',14,7],['gamestudio',8,9]])s=apply(C.place(s,type,tile(r,c)));return s;}
test('daily itineraries use their actual employer, school and local destinations on connected roads',()=>{
 const s=city(),a=C.analyse(s),before=JSON.stringify(s),plan=L.plan(C,s,a);assert.ok(plan.walkers.some(p=>p.student));assert.ok(plan.walkers.some(p=>p.itinerary.primary?.activity==='work'));assert.ok(plan.walkers.some(p=>p.itinerary.outing));
 for(const p of plan.walkers){for(const trip of Object.values(p.itinerary)){if(!trip)continue;assert.equal(trip.from,p.from);assert.ok(s.cells[trip.to]);assert.ok(trip.path.every(i=>a.roads.has(i)));for(let n=1;n<trip.path.length;n++)assert.ok(C.neighbours(trip.path[n-1]).includes(trip.path[n]));if(trip.activity==='work'){assert.equal(trip.to,p.workplace);assert.ok(a.workplaces.find(w=>w.i===trip.to&&w.filled>0));}if(p.student){assert.equal(p.workplace,null);assert.equal(s.cells[p.itinerary.primary.to].type,'school');}}
 }
 assert.equal(JSON.stringify(s),before);assert.deepEqual(L.plan(C,s,a),plan);
});
test('the day has outward commutes, time inside buildings, a homeward journey, local outings and quiet nights',()=>{
 const s=city(),people=L.plan(C,s,C.analyse(s)).walkers,worker=people.find(p=>p.itinerary.primary?.activity==='work'),shift=worker.phase*1.8;
 assert.equal(L.routine(worker,seconds(7+shift)).label,'Commuting to work');assert.equal(L.routine(worker,seconds(11+shift)).label,'At work');assert.equal(L.routine(worker,seconds(14.5+shift)).label,'Walking home');
 assert.ok(people.some(p=>L.routine(p,seconds(18)).trip===p.itinerary.outing));
 for(const p of people){const night=L.routine(p,seconds(1));assert.equal(night.visible,false);assert.equal(night.location,p.from);assert.equal(night.label,'At home for the night');}
 assert.ok(L.trafficLevel(seconds(8))>L.trafficLevel(seconds(13)));assert.ok(L.trafficLevel(seconds(13))>L.trafficLevel(seconds(1)));
});
test('scheduled pedestrians stay on their route, return in the correct direction and never mutate city finances',()=>{
 const s=city(),before=JSON.stringify(s),people=L.plan(C,s,C.analyse(s)).walkers;
 for(const person of people){person.route=L.compile(person.path,C.size,.44,person.speed);for(const trip of Object.values(person.itinerary))if(trip)trip.route=L.compile(trip.path,C.size,.44,person.speed);
  for(let h=0;h<24;h+=.05){const p=L.sampleRoutine(person,seconds(h));assert.ok(Number.isFinite(p.x+p.z));if(!p.visible)continue;const i=Math.round(p.z+(C.size-1)/2)*C.size+Math.round(p.x+(C.size-1)/2);assert.ok(p.trip.path.includes(i));}
 }
 assert.equal(JSON.stringify(s),before);
});
test('instanced residents go indoors at night, emergency vehicles remain, and actor counts stay bounded',async()=>{
 const {CityLife}=await import('../green-city-life-world.js'),T=await import('../assets/vendor/three/three.module.js'),life=new CityLife(new T.Scene()),s=city();life.sync(C,s,C.analyse(s),false);const mesh=life.body,parts=life.parts.length;
 let peak=0;for(let h=6;h<21;h+=.5){life.update(1,false,[],seconds(h));peak=Math.max(peak,life.counts.walkers);}assert.ok(peak>0);
 const nightLife=new CityLife(new T.Scene());nightLife.sync(C,s,C.analyse(s),false);nightLife.update(2,false,[],seconds(1));assert.equal(nightLife.counts.walkers,0);assert.ok(nightLife.vehicles.filter(v=>v.visible).every(v=>['fire','care'].includes(v.kind)));assert.equal(life.body,mesh);assert.equal(life.parts.length,parts);assert.ok(life.parts.length<=14);
 const matrix=new T.Matrix4();nightLife.body.getMatrixAt(0,matrix);assert.equal(matrix.elements[0],0);life.sync(C,s,C.analyse(s),true);assert.ok(life.people.length<=32);life.toggle();assert.equal(life.group.visible,false);
});
test('resident profiles report live home, school and work activity without inventing jobs for students',()=>{
 const s=city(),a=C.analyse(s),p=L.plan(C,s,a).walkers.find(p=>p.student),status=L.routine(p,seconds(11));const r=P.resident(C,s,a,p,status);assert.equal(r.profession,'Student');assert.equal(r.employment,'In education');assert.equal(r.income,'Household support');assert.equal(r.workplace,null);assert.equal(r.purpose,'At the learning centre');assert.ok(!r.happinessDetail.includes('Looking for a job'));
 const atHome=P.resident(C,s,a,p,L.routine(p,seconds(1)));assert.equal(atHome.to,p.from);assert.equal(atHome.routeDetail,'At home');
});
test('building tax shares sum to the actual city ledger, include premiums, and do not pay income to vacancies',()=>{
 let s=city(),a=C.analyse(s);const reports=s.cells.flatMap((c,i)=>c&&c.anchor===undefined?[P.business(C,s,a,i)]:[]).filter(Boolean);assert.equal(reports.reduce((n,r)=>n+r.tax,0),a.budget.businessRevenue);
 const studio=reports.find(r=>s.cells[r.i].type==='gamestudio');assert.ok(studio);assert.equal(studio.contribution,studio.tax+studio.regionalIncome-studio.maintenance);assert.equal(studio.filled+studio.vacancies,studio.positions);
 const empty={...s,population:0},ea=C.analyse(empty);assert.ok(empty.cells.every((c,i)=>!c||!P.business(C,empty,ea,i)?.tax));
 const noTax={...s,policies:{...s.policies,businessTax:5}},na=C.analyse(noTax);assert.ok(P.business(C,noTax,na,studio.i).tax<studio.tax);
});
test('business inspections preserve roof upkeep and level costs, resolve footprint anchors, and expose disconnection',()=>{
 let s=city(),i=tile(8,9);s=apply(C.place(s,'solar',i));s=apply(C.upgrade(s,i));let a=C.analyse(s),r=P.business(C,s,a,i);assert.ok(Math.abs(r.maintenance-(C.types.gamestudio.upkeep+C.upgrades.solar.upkeep)*1.5)<1.1);assert.ok(r.roles.includes('Game developer'));
 const big=C.terrain.findIndex((_,j)=>!C.canPlace(s,'ailab',j,undefined,1));s=apply(C.place(s,'ailab',big,1));a=C.analyse(s);for(const j of C.footprint('ailab',big,1))assert.deepEqual(P.business(C,s,a,j),P.business(C,s,a,big));
 s=apply(C.demolish(s,tile(17,10)));a=C.analyse(s);r=P.business(C,s,a,i);assert.equal(r.status,'No road access');assert.equal(r.filled,0);assert.equal(r.tax,0);assert.ok(r.maintenance>0);assert.equal(P.business(C,s,a,0),null);
});
test('holding lighting keeps resident time running without advancing the monthly financial simulation',async()=>{
 const {CityWorld}=await import('../green-city-world.js');const s=city(),before=JSON.stringify(s),w=Object.create(CityWorld.prototype);Object.assign(w,{active:true,reduced:{matches:false},state:s,daySeconds:0,lifeSeconds:0,cycleEnabled:false,lastFrame:0,time:0,rotors:[],cars:[],waterMaterial:{uniforms:{uTime:{value:0}}},life:{update(){}},renderer:{render(){}},schedule(){},updateResident(){},reportDaylight(){}});
 w.frame(1000);w.frame(1040);assert.equal(w.daySeconds,0);assert.ok(w.lifeSeconds>0);assert.equal(JSON.stringify(s),before);
});
