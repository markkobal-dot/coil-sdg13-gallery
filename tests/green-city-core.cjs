const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../green-city-core.js');
const cell=(r,c)=>r*20+c;
function applied(state,result){assert.equal(result.error,'');return C.grant(result.state).state;}
function build(state,type,i){return applied(state,C.place(state,type,i));}
const plan=[...[87,127,167,187,227,228,171,194].map(i=>['park',i]),...[84,86,89,124].map(i=>['solar',i]),['wind',96],['wind',256],...[105,110,205,210].map(i=>['bus',i]),['wetland',223],['wetland',263],['school',132],['clinic',192],['waterworks',291],['recycling',293],['roof',126],['roof',129],['roof',184],...[106,107,108,109].map(i=>['bike',i]),['battery',257]];

test('400-tile world has protected water, 21 tools, connected streets and a viable opening budget',()=>{
 const state=C.fresh(),a=C.analyse(state);
 assert.equal(C.size,20);assert.equal(C.terrain.length,400);assert.equal(Object.keys(C.upgrades).length,21);
 assert.ok(C.terrain.includes('water'));assert.ok(a.roads.size>70);assert.equal(a.capacity,680);
 assert.equal(state.population,220);assert.equal(a.scores[2],0);assert.ok(a.pollution>70);assert.ok(a.net>0);
 assert.ok(C.neighbours(19).every(i=>i!==20));assert.equal(C.label(399),'T20');
});

test('every catalogue item can be placed on its proper site and charges its stated price',()=>{
 for(const [type,item] of Object.entries(C.upgrades)){
  const state=C.fresh('sandbox'),i=item.site==='roof'?84:item.site==='road'?105:item.road?87:47;
  const result=C.place(state,type,i);assert.equal(result.error,'',type);assert.equal(result.state.cash,state.cash-item.cost);
  assert.deepEqual(state,C.fresh('sandbox'),'placement is immutable');
  assert.equal(item.site==='roof'?result.state.cells[i].roof:result.state.cells[i].type,type);
 }
});

test('water, occupied tiles, wrong sites, disconnected buildings, locked tools and overspending are rejected atomically',()=>{
 const state=C.fresh();
 for(const [type,i]of[['park',0],['park',84],['solar',87],['bus',87],['house',147],['tram',105]]){
  const result=C.place(state,type,i);assert.ok(result.error,type);assert.equal(result.state,state);
 }
 const broke={...state,cash:0};const result=C.place(broke,'tree',87);assert.ok(result.error);assert.equal(result.state,broke);
 assert.ok(C.canPlace(state,'constructor',87));assert.ok(C.canPlace(state,'tree',-1));assert.ok(C.canPlace(state,'tree',400));assert.ok(C.canPlace(state,'tree','87'));
});

test('road connectivity is rooted at the harbour; removing it disconnects housing and stops transit service',()=>{
 const state=build(C.fresh(),'bus',105);assert.ok(C.analyse(state).scores[3]>12);
 const disconnected=C.demolish(state,350).state,a=C.analyse(disconnected);
 assert.equal(a.roads.size,0);assert.equal(a.capacity,0);assert.equal(a.scores[3],12);
 assert.ok(C.canPlace(disconnected,'house',87).includes('connected'));
 const reconnected=C.place(disconnected,'road',350).state;assert.equal(C.analyse(reconnected).capacity,680);
});

test('road paths cost only new tiles and a blocked or unaffordable route changes nothing',()=>{
 const state=C.fresh(),a=47,b=49,result=C.buildLine(state,a,b);
 assert.equal(result.error,'');assert.equal(result.state.cash,state.cash-105);
 assert.deepEqual(C.line(a,b),[47,48,49]);assert.ok(C.analyse(result.state).roads.has(a));
 for(const [from,to]of[[0,47],[84,87]]){const failed=C.buildLine(state,from,to);assert.ok(failed.error);assert.equal(failed.state,state);}
 const poor={...state,cash:34};assert.equal(C.buildLine(poor,a,b).state,poor);
});

test('upgrades have three levels, charge their price, and raise housing and rooftop output',()=>{
 let state=build(C.fresh(),'solar',84),before=C.analyse(state),cost=C.upgradeCost(state.cells[84]);
 const result=C.upgrade(state,84);assert.equal(result.error,'');assert.equal(result.state.cash,state.cash-cost);
 state=result.state;assert.ok(C.analyse(state).capacity>before.capacity);assert.ok(C.analyse(state).cleanPower>before.cleanPower);
 state=C.upgrade(state,84).state;assert.equal(state.cells[84].level,3);assert.equal(C.upgrade(state,84).state,state);
 assert.ok(C.upgrade(state,105).error);
});

test('relocation preserves the building, level and rooftop retrofit with one relocation fee',()=>{
 let state=build(C.fresh(),'solar',84);state=C.upgrade(state,84).state;
 const old=state.cells[84],result=C.relocate(state,84,87);
 assert.equal(result.error,'');assert.equal(result.state.cash,state.cash-C.moveCost(old));assert.equal(result.state.cells[84],null);assert.deepEqual(result.state.cells[87],old);
 assert.equal(C.relocate(state,84,147).state,state);assert.equal(C.relocate(state,105,47).state,state);assert.equal(C.relocate(state,84,0).state,state);
});

test('salvage never refunds unpurchased starter buildings; removing a retrofit preserves its host',()=>{
 const fresh=C.fresh();assert.equal(C.demolish(fresh,84).state.cash,fresh.cash);
 let state=build(fresh,'solar',84),result=C.demolish(state,84,true);
 assert.equal(result.state.cash,state.cash+75);assert.equal(result.state.cells[84].type,'house');assert.equal(result.state.cells[84].roof,null);assert.equal(result.state.cells[84].paid,0);
 state=build(fresh,'bus',105);result=C.demolish(state,105);assert.equal(result.state.cash,state.cash+90);assert.equal(result.state.cells[105].type,'road');
 state=build(fresh,'park',87);assert.equal(C.demolish(state,87).state.cash,state.cash+60);
});

test('placement affects local cooling and transit; coastal rain gardens protect more effectively',()=>{
 const fresh=C.fresh('sandbox');const near=build(fresh,'park',87),far=build(fresh,'park',337);
 assert.ok(C.analyse(near).shadeCoverage>C.analyse(far).shadeCoverage);assert.ok(C.tileInfo(near,84).heat<C.tileInfo(fresh,84).heat);
 assert.ok(C.analyse(build(fresh,'bus',105)).mobilityCoverage>C.analyse(build(fresh,'bus',317)).mobilityCoverage);
 assert.ok(C.analyse(build(fresh,'wetland',223)).scores[4]>C.analyse(build(fresh,'wetland',227)).scores[4]);
});

test('monthly income, upkeep and population are applied once; policies have real costs and tradeoffs',()=>{
 const state=C.fresh(),a=C.analyse(state),next=C.advance(state).state;
 assert.equal(next.cash,state.cash+a.net);assert.equal(next.month,2);assert.ok(next.population>state.population);assert.equal(next.history.length,1);
 const high=C.setPolicy(state,'tax','high').state,low=C.setPolicy(state,'tax','low').state;
 assert.ok(C.analyse(high).income>C.analyse(low).income);assert.ok(C.analyse(high).wellbeing<C.analyse(low).wellbeing);
 const cleaner=C.setPolicy(state,'cleanIndustry',true).state;assert.ok(C.analyse(cleaner).scores[0]>a.scores[0]);assert.equal(C.analyse(cleaner).expenses,a.expenses+35);
});

test('development grants are paid once, including after advancing the month',()=>{
 let state=C.fresh();for(const i of [47,48,49,67,68])state=build(state,'tree',i);
 assert.ok(state.grants.includes('builder'));const cash=state.cash;
 assert.equal(C.grant(state).state.cash,cash);assert.equal(C.grant(state).rewards.length,0);
 assert.equal(state.cash,2800-250+400);
 state=C.advance(state).state;assert.equal(state.grants.filter(id=>id==='builder').length,1);
});

test('climate events cycle through heat, rain and energy; stronger responses protect more',()=>{
 let state=C.fresh();const seen=[];
 for(let month=2;month<=12;month++){state=C.advance(state).state;if(state.event)seen.push(state.event.type);}
 assert.deepEqual(seen,['heat','rain','energy']);
 const heat={...C.fresh(),month:4,event:{type:'heat',choice:null}},base=C.analyse(heat).wellbeing;
 const basic=C.respond(heat,'volunteers'),full=C.respond(heat,'shelters');
 assert.equal(full.state.cash,heat.cash-120);assert.equal(basic.state.cash,heat.cash-60);
 assert.ok(C.analyse(full.state).wellbeing>C.analyse(basic.state).wellbeing);assert.ok(C.analyse(basic.state).wellbeing>base);
 assert.ok(C.respond(full.state,'volunteers').error);assert.ok(C.respond({...heat,cash:0},'shelters').error);
 const energy={...C.fresh(),month:12,event:{type:'energy',choice:null}};
 assert.ok(C.analyse(C.respond(energy,'reserve').state).expenses<C.analyse(C.respond(energy,'save').state).expenses);
});

for(const challenge of ['revolution','carbon','future'])test(challenge+' mission is achievable through legal purchases, normal grants and monthly income',()=>{
 let state=C.fresh(challenge);
 for(const [type,i] of plan){
  while((state.cash<C.upgrades[type].cost||C.canPlace(state,type,i).startsWith('Unlocks'))&&state.month<24)state=C.advance(state).state;
  state=build(state,type,i);
 }
 if(challenge==='carbon'){while(state.cash<180)state=C.advance(state).state;state=build(state,'bus',130);state=applied(state,C.demolish(state,336));}
 while(!C.analyse(state).completed&&state.month<24)state=C.advance(state).state;
 assert.equal(C.analyse(state).completed,true,JSON.stringify(C.analyse(state)));assert.ok(state.cash>=0);assert.ok(state.month<=18);
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
});

test('save validation rejects corrupted cities without trusting stored scores',()=>{
 const state=C.fresh();assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
 for(const raw of [null,{}, {...state,version:1},{...state,challenge:'constructor'},{...state,cash:-1},{...state,cash:Infinity},{...state,month:0},{...state,grants:['energy','energy']},{...state,policies:{tax:'invalid'}},{...state,cells:[...state.cells.slice(1)]},{...state,event:{type:'dragon',choice:null}}])assert.throws(()=>C.restore(raw));
 const water=structuredClone(state);water.cells[0]={type:'park',level:1,roof:null,paid:120};assert.throws(()=>C.restore(water));
 const wrong=structuredClone(state);wrong.cells[84].type='__proto__';assert.throws(()=>C.restore(wrong));
 const fake=C.restore({...state,overall:100,emissions:0});assert.equal(C.analyse(fake).overall,10);
});

test('varied long-running cities keep money, population and every indicator within valid bounds',()=>{
 const tools=Object.keys(C.upgrades);
 for(let seed=0;seed<10;seed++){
  let state=C.fresh('sandbox');
  for(let turn=0;turn<100;turn++){
   const i=(turn*37+seed*29)%400;
   const action=turn%9===0?C.advance(state):turn%9===1?C.upgrade(state,i):turn%9===2?C.demolish(state,i):C.place(state,tools[(turn+seed)%tools.length],i);
   if(!action.error)state=C.grant(action.state).state;
   const a=C.analyse(state);assert.ok(state.cash>=0);assert.ok(state.population>=0);assert.ok(state.population<=a.capacity||state.month===1);
   assert.ok([...a.scores,a.overall,a.wellbeing,a.employment,a.pollution].every(n=>Number.isInteger(n)&&n>=0&&n<=100));
  }
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))),state);
 }
});

test('separate taxes affect revenue, household wellbeing and local employment',()=>{
 const base=C.fresh(),a=C.analyse(base);
 const residential=C.setPolicies(base,{residentialTax:16}).state,business=C.setPolicies(base,{businessTax:17}).state;
 assert.ok(C.analyse(residential).budget.residentialRevenue>a.budget.residentialRevenue);
 assert.ok(C.analyse(residential).wellbeing<a.wellbeing);
 assert.ok(C.analyse(business).jobs<a.jobs);
 assert.ok(C.analyse(business).budget.businessRevenue>a.budget.businessRevenue);
 assert.equal(base.policies.residentialTax,10,'policy previews and changes never mutate the source city');
});

test('fare and utility prices have income, demand and wellbeing tradeoffs',()=>{
 let city=build(C.fresh('sandbox'),'bus',105);city=build(city,'tram',110);
 const low=C.analyse(C.setPolicies(city,{transitFare:0,utilityTariff:.5}).state);
 const high=C.analyse(C.setPolicies(city,{transitFare:5,utilityTariff:4}).state);
 assert.equal(low.budget.fareRevenue,0);assert.equal(low.budget.transitSupport,45);
 assert.ok(high.budget.fareRevenue>0);assert.ok(high.budget.utilities>0);
 assert.ok(low.ridership>high.ridership);assert.ok(low.wellbeing>high.wellbeing);
 assert.ok(high.demand<low.demand);assert.ok(low.budget.utilitySubsidy>0);
});

test('service funding changes upkeep and service outcomes, and forecasts balance exactly',()=>{
 let city=build(C.fresh('sandbox'),'school',87);city=build(city,'park',127);
 const lower=C.analyse(C.setPolicies(city,{serviceBudget:70}).state),higher=C.analyse(C.setPolicies(city,{serviceBudget:140}).state);
 assert.ok(higher.budget.assetUpkeep>lower.budget.assetUpkeep);
 assert.ok(higher.serviceCoverage>lower.serviceCoverage);assert.ok(higher.wellbeing>lower.wellbeing);
 const a=C.analyse(city),b=a.budget;
 assert.equal(a.income,b.grant+b.residentialRevenue+b.businessRevenue+b.fareRevenue+b.utilities);
 assert.equal(a.expenses,b.assetUpkeep+b.transitSupport+b.industryStandards+b.gridCost+b.utilitySubsidy+b.loanPayment);
 assert.equal(a.net,a.income-a.expenses);
});

test('invalid rates and prices are rejected without changing the city',()=>{
 const city=C.fresh();for(const patch of [{residentialTax:19},{businessTax:0},{transitFare:-1},{utilityTariff:NaN},{serviceBudget:200},{transitFare:1.25},{unknown:3},{cleanIndustry:'yes'},{freeTransit:'yes'}]){
  const result=C.setPolicies(city,patch);assert.ok(result.error,JSON.stringify(patch));assert.equal(result.state,city);
 }
 const raw=structuredClone(city);raw.policies.utilityTariff=999;assert.throws(()=>C.restore(raw));
});

test('development loans cannot stack and repay exactly once per funded month',()=>{
 const start=C.fresh('sandbox'),borrowed=C.borrow(start);assert.equal(borrowed.state.cash,start.cash+1000);
 assert.equal(C.borrow(borrowed.state).state,borrowed.state);
 let city=borrowed.state,paid=0;
 for(let n=0;n<12;n++){const before=C.analyse(city);paid+=before.budget.loanPayment;city=C.advance(city).state;}
 assert.equal(paid,1080);assert.equal(city.loan,null);assert.equal(C.analyse(city).budget.loanPayment,0);
 const early=C.repayLoan(borrowed.state);assert.equal(early.state.loan,null);assert.equal(early.state.cash,borrowed.state.cash-1080);
 assert.ok(C.repayLoan({...borrowed.state,cash:0}).error);
 assert.deepEqual(C.restore(JSON.parse(JSON.stringify(borrowed.state))),borrowed.state);
});

test('unpaid loan amounts remain outstanding when treasury cannot cover a payment',()=>{
 let city=C.borrow(C.fresh()).state;city={...city,cash:0,population:0,policies:{...city.policies,freeTransit:true,transitFare:0,cleanIndustry:true,serviceBudget:140}};
 // Add a lawful high-upkeep city to make a shortfall without altering loan terms.
 city.cells=city.cells.map((c,i)=>C.terrain[i]==='land'?{type:'clinic',level:3,roof:'solar',paid:0}:null);city.grants=C.grantDefs.map(g=>g.id);
 const before=city.loan.balance,next=C.advance(city).state;
 assert.ok(next.loan);assert.equal(next.loan.balance,before);assert.equal(next.cash,0);
});

test('five council situations offer explicit free responses without disguising their impact',()=>{
 assert.equal(Object.keys(C.events).length,5);
 for(const type of Object.keys(C.events)){
  const city={...C.fresh(),event:{type,choice:null}},before=C.analyse(city),skipped=C.respond(city,'none');
  assert.equal(skipped.error,'');assert.equal(skipped.state.cash,city.cash);assert.equal(skipped.state.event.choice,'none');
  assert.equal(C.analyse(skipped.state).wellbeing,before.wellbeing);
  assert.ok(C.respond(skipped.state,C.events[type].options[0].id).error);
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(skipped.state))),skipped.state);
 }
});

test('previous expanded saves migrate legacy taxes and fare-free policy without losing the city',()=>{
 const old={...C.fresh(),policies:{tax:'low',freeTransit:true,cleanIndustry:false}};delete old.loan;
 const restored=C.restore(JSON.parse(JSON.stringify(old)));
 assert.equal(restored.policies.residentialTax,8);assert.equal(restored.policies.businessTax,8);
 assert.equal(restored.policies.transitFare,0);assert.equal(restored.policies.utilityTariff,1);assert.equal(restored.policies.serviceBudget,100);
 assert.equal(restored.loan,null);assert.deepEqual(restored.cells,old.cells);assert.equal(restored.cash,old.cash);
});
