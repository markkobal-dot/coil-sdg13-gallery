const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),P=require('../green-city-planning.js');
const tile=(r,c)=>r*C.size+c,home=tile(4,4),apply=r=>{assert.equal(r.error,'');return r.state;};

test('home diagnosis uses the housing happiness score and never mutates saves or finances',()=>{
 const s=C.fresh('sandbox'),a=C.analyse(s),before=JSON.stringify(s),report=P.homeReport(C,s,a,home);
 assert.equal(report.happiness,a.homeProfiles.find(h=>h.i===home).localHappiness);
 assert.equal(report.mood,'Unhappy');assert.equal(report.occupied,true);assert.ok(report.issues.length<=3);
 assert.equal(report.issues[0].id,'health');assert.match(report.issues[0].evidence,/0\/100/);
 assert.equal(P.homeReport(C,s,a,0),null);assert.equal(P.homeReport(C,s,a,tile(5,5)),null);
 assert.equal(JSON.stringify(s),before);
 const restored=C.restore(JSON.parse(before));assert.deepEqual(P.homeReport(C,restored,C.analyse(restored),home),report);
});

test('a broken gateway takes priority; repairing it removes the road diagnosis',()=>{
 const gateway=tile(17,10),cut=apply(C.demolish(C.fresh('sandbox'),gateway));
 const r=P.homeReport(C,cut,C.analyse(cut),home);assert.equal(r.issues[0].id,'roads');assert.equal(r.issues[0].action.kind,'road');
 const fixed=apply(C.place(cut,'road',gateway));assert.ok(!P.homeReport(C,fixed,C.analyse(fixed),home).issues.some(x=>x.id==='roads'));
});

test('a clinic plan clears the healthcare cause only when it actually improves this home',()=>{
 const s=C.fresh('sandbox'),a=C.analyse(s),plan=C.neighbourhoodInfo(s,home,a,'health').priorities.find(x=>x.id==='health').action;
 const built=apply(C.place(s,plan.type,plan.target)),after=C.analyse(built),r=P.homeReport(C,built,after,home);
 assert.ok(after.homeProfiles.find(h=>h.i===home).health>=40);assert.ok(!r.issues.some(x=>x.id==='health'));
 assert.ok(r.happiness>P.homeReport(C,s,a,home).happiness);
 const entries=[...new Set(C.footprint(plan.type,plan.target).flatMap(i=>C.neighbours(i).filter(j=>C.roadTypes.has(built.cells[j]?.type))))];
 let disconnected=built;for(const i of entries)disconnected=apply(C.demolish(disconnected,i));
 const report=P.homeReport(C,disconnected,C.analyse(disconnected),home),care=report.issues.find(x=>x.id==='health');
 assert.ok(care);assert.match(care.title,/lost road access/);assert.equal(care.action.target,plan.target);
});

test('empty homes are prospective conditions and coverage is not misreported as a staffing failure',()=>{
 let s={...C.fresh('sandbox'),population:0};const plan=C.neighbourhoodInfo(s,home,undefined,'health').priorities.find(x=>x.id==='health').action;
 s=apply(C.place(s,plan.type,plan.target));const a=C.analyse(s),r=P.homeReport(C,s,a,home);
 assert.equal(r.occupied,false);assert.equal(a.workplaces.find(w=>w.i===plan.target).filled,0);
 assert.ok(!r.issues.some(x=>x.id==='health'));assert.doesNotMatch(JSON.stringify(r),/needs staff|no staff/i);
});

test('industrial warnings identify a real contributing footprint and its source disappears on removal',()=>{
 const s=C.fresh('sandbox'),a=C.analyse(s),h=tile(6,9);
 const sites=C.terrain.flatMap((_,i)=>C.canPlace(s,'refinery',i,a)?[]:[i]).sort((x,y)=>Math.min(...C.footprint('refinery',x).map(j=>C.distance(h,j)))-Math.min(...C.footprint('refinery',y).map(j=>C.distance(h,j))));
 const polluted=apply(C.place(s,'refinery',sites[0])),r=P.homeReport(C,polluted,C.analyse(polluted),h),issue=r.issues.find(x=>x.id==='pollution');
 assert.ok(issue);assert.equal(issue.action.target,sites[0]);assert.match(issue.evidence,/Oil refinery/);
 const clean=apply(C.demolish(polluted,sites[0]));assert.ok(!P.homeReport(C,clean,C.analyse(clean),h).issues.some(x=>x.id==='pollution'));
});

test('prices and a citywide job shortage lead to budget and workplace actions without inventing a resident job',()=>{
 const s=C.fresh('sandbox'),costly=apply(C.setPolicies(s,{residentialTax:18,transitFare:5,utilityTariff:4}));
 const prices=P.homeReport(C,costly,C.analyse(costly),home).issues.find(x=>x.id==='prices');
 assert.ok(prices);assert.equal(prices.scope,'city');assert.equal(prices.action.kind,'finance');assert.match(prices.evidence,/18%/);
 const noJobs={...s,population:1200,cells:s.cells.map(c=>c&&['factory','coal'].includes(c.type)?null:c)},a=C.analyse(noJobs);
 const jobs=P.homeReport(C,noJobs,a,home).issues.find(x=>x.id==='jobs');assert.ok(jobs);assert.equal(jobs.scope,'city');assert.equal(jobs.action.kind,'build');assert.match(jobs.fix,/shared citywide/);
 const event={...s,event:{type:'heat',choice:null}},warning=P.homeReport(C,event,C.analyse(event),home);
 // When local gaps rank first, an event stays outside the concise top three.
 assert.ok(warning.issueCount>warning.issues.length);
});

test('weak existing care offers its upgrade instead of another clinic, with no automatic spending',()=>{
 let s=C.fresh('sandbox');const care=C.neighbourhoodInfo(s,home,undefined,'health').priorities.find(x=>x.id==='health').action;
 s=apply(C.place(s,care.type,care.target));
 const park=C.neighbourhoodInfo(s,home,undefined,'shade').priorities.find(x=>x.id==='shade').action;
 s=apply(C.place(s,park.type,park.target));s=apply(C.upgrade(s,park.target));s=apply(C.upgrade(s,park.target));
 const bus=C.neighbourhoodInfo(s,home,undefined,'mobility').priorities.find(x=>x.id==='mobility').action;s=apply(C.place(s,bus.type,bus.target));
 s=apply(C.setPolicy(s,'serviceBudget',70));const before=JSON.stringify(s),r=P.homeReport(C,s,C.analyse(s),home),issue=r.issues.find(x=>x.id==='health');
 assert.ok(issue);assert.equal(issue.action.kind,'upgrade');assert.equal(issue.action.target,care.target);assert.equal(JSON.stringify(s),before);
 const improved=apply(C.upgrade(s,care.target));assert.ok(!P.homeReport(C,improved,C.analyse(improved),home).issues.some(x=>x.id==='health'));
});
