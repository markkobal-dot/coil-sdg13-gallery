const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),D=require('../green-city-development.js'),L=require('../green-city-life.js');
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;},sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
function advance(s){if(s.event&&!s.event.choice)s=apply(C.respond(s,C.events[s.event.type].options.find(o=>!o.cost)?.id||C.events[s.event.type].options.at(-1).id));return apply(C.advance(s));}

test('monthly migration conserves residents, matches the population forecast, and records the actual budget once',()=>{
 const state=C.fresh(),before=JSON.stringify(state),a=C.analyse(state),next=advance(state),r=next.monthlyReport;
 assert.equal(JSON.stringify(state),before);assert.equal(next.population,a.nextPopulation);assert.equal(sum(next.occupancy),next.population);
 assert.equal(r.populationBefore+r.arrivals-r.departures,r.populationAfter);assert.equal(r.populationAfter,next.population);assert.equal(r.month,next.month);assert.equal(r.income-r.expenses,r.operatingNet);assert.equal(r.operatingNet,a.net);assert.equal(r.cashChange,next.cash-state.cash);assert.equal(r.previousNet,null);
 assert.ok(r.arrivals>0);for(const h of r.homes){assert.equal(h.before+h.in-h.out,h.after);assert.ok(h.after>=0&&h.after<=h.capacity);}
 const second=advance(next);assert.equal(second.monthlyReport.previousNet,r.operatingNet);assert.equal(second.history.length,2);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(second))),second);
});

test('new homes begin empty and acquire real residents only during a monthly update',()=>{
 const state=C.fresh('sandbox'),i=tile(4,7),built=apply(C.place(state,'house',i)),a=C.analyse(built);
 assert.equal(built.population,state.population);assert.equal(built.occupancy[i],0);assert.equal(a.homeProfiles.find(h=>h.i===i).residents,0);
 assert.ok(L.plan(C,built,a).walkers.every(p=>p.from!==i&&p.to!==i));
 const next=advance(built);assert.ok(next.occupancy[i]>0);assert.equal(next.monthlyReport.homes.find(h=>h.i===i).before,0);assert.equal(next.monthlyReport.homes.find(h=>h.i===i).after,next.occupancy[i]);
});

test('industrial pollution pushes residents out of affected homes while safer homes accept moves',()=>{
 let s=C.fresh('sandbox');s=apply(C.place(s,'refinery',tile(6,12)));s=apply(C.place(s,'park',tile(4,3)));s=apply(C.place(s,'clinic',tile(3,4)));
 const a=C.analyse(s),dirty=tile(6,11),clean=tile(4,4),next=advance(s),r=next.monthlyReport;
 assert.ok(a.homeProfiles.find(h=>h.i===dirty).pollution>=30);const departure=r.homes.find(h=>h.i===dirty),arrival=r.homes.find(h=>h.i===clean);
 assert.ok(departure.out>0);assert.ok(departure.after<departure.before);assert.equal(departure.reasonOut,'pollution');assert.ok(arrival.in>0);assert.ok(arrival.after>arrival.before);assert.ok(r.relocated>0);
 assert.equal(next.population,s.population+r.arrivals-r.departures);assert.equal(sum(next.occupancy),next.population);
});

test('road disconnection leaves people in place until the monthly update, then records genuine departures',()=>{
 const base=C.fresh(),state=apply(C.demolish(base,tile(17,10))),a=C.analyse(state);assert.equal(state.population,base.population);assert.equal(a.housing.housed,base.population);
 const next=advance(state),r=next.monthlyReport;assert.ok(r.departures>0);assert.equal(r.arrivals,0);assert.equal(r.relocated,0);assert.ok(r.homes.some(h=>h.reasonOut==='roads'&&h.out>0));assert.ok(next.population<state.population);assert.ok(Object.values(next.occupancy).every(n=>Number.isInteger(n)&&n>=0));
});

test('higher household taxes lower housing demand and increase departures',()=>{
 const base=C.fresh('sandbox'),low=apply(C.setPolicies(base,{residentialTax:8})),high=apply(C.setPolicies(base,{residentialTax:18})),a=C.analyse(low),b=C.analyse(high);
 assert.ok(a.homeProfiles[0].housingDemand>b.homeProfiles[0].housingDemand);const first=advance(low).monthlyReport,second=advance(high).monthlyReport;
 assert.ok(second.departures>first.departures);assert.ok(second.populationAfter<first.populationAfter);assert.ok(second.homes.some(h=>h.reasonOut==='tax'));
});

test('housing upgrades and moves preserve occupants; demolition exposes displacement and new housing rehousing',()=>{
 let s=advance(C.fresh('sandbox'));const i=tile(4,4),people=s.occupancy[i],up=apply(C.upgrade(s,i));assert.equal(up.occupancy[i],people);assert.equal(up.population,s.population);
 const moved=apply(C.relocate(up,i,tile(3,4)));assert.equal(moved.occupancy[tile(3,4)],people);assert.equal(moved.occupancy[i],undefined);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(moved))),moved);
 const removed=apply(C.demolish(moved,tile(3,4)));assert.equal(removed.population,moved.population);assert.equal(C.analyse(removed).housing.displaced,people);
 const repaired=apply(C.place(removed,'house',tile(3,4))),next=advance(repaired);assert.equal(repaired.occupancy[tile(3,4)],0);assert.ok(next.monthlyReport.relocated>=people);assert.equal(next.monthlyReport.unhousedBefore,people);
 assert.equal(sum(next.occupancy),next.population);assert.equal(s.occupancy[i],people);
});

test('filled jobs are integer, finite and consistent across workplaces, the workforce and tax revenue',()=>{
 let base=C.fresh('sandbox');base=apply(C.place(base,'gamestudio',tile(4,7)));
 for(const population of [0,3,220,1000])for(const businessTax of [5,10,18]){
  const s={...base,population,policies:{...base.policies,businessTax}},a=C.analyse(s),filled=a.workplaces.reduce((sum,w)=>sum+w.filled,0);
  assert.equal(filled,a.workforce.filled);assert.equal(filled,a.budget.filledJobs);assert.ok(filled<=Math.floor(population*.42));
  for(const w of a.workplaces){assert.ok(Number.isInteger(w.positions)&&Number.isInteger(w.filled));assert.ok(w.filled>=0&&w.filled<=w.positions);assert.equal(w.filled+w.vacancies,w.positions);}
  const premium=Math.round(a.workplaces.reduce((sum,w)=>sum+w.filled*Math.max(0,(C.types[w.type].taxMultiplier||1)-1),0)*.018*businessTax);assert.equal(a.budget.specialistTax,premium);if(!population)assert.equal(a.budget.businessRevenue,0);
  assert.ok(L.plan(C,s,a).walkers.every(p=>p.workplace===null||a.workplaces.some(w=>w.i===p.workplace&&w.filled>0)));
 }
});

test('old cities retain cash and population, while occupancy and monthly reports survive export and restore',()=>{
 const old=C.fresh('sandbox'),restored=C.restore(JSON.parse(JSON.stringify(old)));assert.equal(restored.cash,old.cash);assert.equal(restored.population,old.population);assert.equal(C.analyse(restored).housing.housed,old.population);
 const modern=advance(restored),raw=JSON.parse(JSON.stringify(modern));assert.deepEqual(C.restore(raw),modern);
 for(const occupancy of [{0:1},{[tile(4,4)]:-1},{[tile(4,4)]:9999},{[tile(5,5)]:10}])assert.throws(()=>C.restore({...raw,occupancy}));
 for(const patch of [{populationAfter:raw.population+1},{arrivals:-1},{income:999999},{month:raw.month+1},{homes:[...raw.monthlyReport.homes,raw.monthlyReport.homes[0]]}])assert.throws(()=>C.restore({...raw,monthlyReport:{...raw.monthlyReport,...patch}}));
});

test('new arrivals respect both the monthly building move-in limit and the overall city population ceiling',()=>{
 const state={population:18,occupancy:{1:18}},homes=[{i:1,type:'house',capacity:40,linked:true}],profiles=[{i:1,shade:90,health:90,services:90,mobility:90,noise:0,pollution:0,linked:true}],snapshot=D.housingSnapshot(state,homes);
 const r=D.migration({state,homes,profiles,snapshot,city:{happiness:90,employment:100},growth:100,policy:{residentialTax:10},maxPopulation:20});assert.equal(r.nextPopulation,20);assert.equal(r.arrivals,2);assert.equal(r.departures,0);assert.ok(r.homes[0].in<=Math.ceil(40*.18));
});

test('repeated simulation and save reloads retain population conservation without allocating unbuilt homes',()=>{
 let s=C.fresh('sandbox');for(const[type,i]of [['park',tile(4,7)],['clinic',tile(6,7)],['house',tile(3,4)],['office',tile(11,7)]])s=apply(C.place(s,type,i));
 for(let month=0;month<18;month++){s=C.restore(JSON.parse(JSON.stringify(advance(s))));assert.equal(sum(s.occupancy),s.population);assert.ok(s.cash>=0);assert.ok(Object.keys(s.occupancy).every(i=>C.analyse(s).homeProfiles.some(h=>h.i===Number(i))));}
});
