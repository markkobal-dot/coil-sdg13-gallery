const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),D=require('../green-city-development.js');
const apply=r=>{assert.equal(r.error,'');return C.grant(r.state).state;},at=i=>Math.floor(i/20)*C.size+i%20;
function build(s,type){const a=C.analyse(s),i=C.terrain.findIndex((_,j)=>!C.canPlace(s,type,j,a));assert.ok(i>=0);return {state:apply(C.place(s,type,i)),i};}
function advance(s){if(s.event&&!s.event.choice)s=apply(C.respond(s,'none'));return apply(C.advance(s));}

test('regional support protects the opening town but stops financing an empty island',()=>{
 const s=C.fresh();assert.equal(C.analyse(s).budget.grant,140);
 const half=C.analyse({...s,population:110}),empty=C.analyse({...s,population:0});assert.equal(half.budget.grant,70);assert.equal(empty.budget.grant,0);assert.ok(empty.net<0);
 let city=apply(C.setPolicies(s,{residentialTax:18,businessTax:18,transitFare:5,utilityTariff:4,serviceBudget:70}));
 for(let n=0;n<23;n++)city=advance(city);assert.equal(city.population,0);const cash=city.cash;
 for(let n=0;n<6;n++)city=advance(city);assert.ok(city.cash<cash);
 city=apply(C.setPolicies(city,{residentialTax:8,transitFare:2,utilityTariff:1,serviceBudget:100}));
 for(let n=0;n<12;n++)city=advance(city);assert.ok(city.population>0,'fairer prices permit recovery using existing connected homes');
});

test('staffed clean businesses can cover operating costs; building vacancies too early still costs money',()=>{
 for(const type of ['office','officepark','ecofactory','gamestudio','ailab']){
  const small=C.fresh('sandbox'),premature=build(small,type),smallA=C.analyse(premature.state);
  assert.ok(smallA.net<C.analyse(small).net,type+' has an early operating cost');
  const mature={...small,population:1200},a=C.analyse(mature),built=build(mature,type),b=C.analyse(built.state),work=b.workplaces.find(w=>w.i===built.i);
  assert.equal(work.filled,work.positions);assert.ok(b.net>a.net,type+' is viable at normal taxes even using imported power');
  const empty=C.analyse({...built.state,population:0});assert.equal(empty.budget.businessRevenue,0);
 }
});

test('dirty industry retains a stronger financial incentive with a real environmental cost',()=>{
 const s={...C.fresh('sandbox'),population:1200},clean=C.analyse(build(s,'ecofactory').state);
 for(const type of ['heavyindustry','refinery']){const a=C.analyse(build(s,type).state);assert.ok(a.net>clean.net);assert.ok(a.scores[0]<clean.scores[0]);assert.ok(Math.max(...a.homeProfiles.map(h=>h.pollution))>Math.max(...clean.homeProfiles.map(h=>h.pollution)));}
});

test('regional customers are bounded by both finite demand and actual staffed capacity',()=>{
 for(const type of ['airport','internationalairport','cargoport','containerport','marina']){
  let s={...C.fresh('sandbox'),population:3};const built=build(s,type);s=built.state;const a=C.analyse(s),c=a.connections.find(c=>c.i===built.i),work=a.workplaces.find(w=>w.i===built.i);
  assert.ok(c.customers<=c.operatingCapacity);assert.equal(c.operatingCapacity,Math.floor(c.capacity*work.filled/work.positions));assert.ok(c.revenue<c.upkeep);
  const empty=C.analyse({...s,population:0}).connections.find(c=>c.i===built.i);assert.equal(empty.operatingCapacity,0);assert.equal(empty.customers,0);assert.equal(empty.revenue,0);assert.ok(empty.upkeep>0);
  const full=C.analyse({...s,population:10000}).connections.find(c=>c.i===built.i);assert.ok(full.revenue>full.upkeep);assert.ok(full.utilisation<=1);
 }
});

test('luxury demand follows filled specialist jobs rather than empty office capacity',()=>{
 const input={state:{population:1000,affluentPopulation:0},homes:[{i:1,type:'luxuryapartment',capacity:1000,linked:true,luxury:true}],homeProfiles:[{i:1,residents:1000,shade:85,health:90,services:90,noise:5}],air:90,happiness:85,employment:100,policy:{residentialTax:10}};
 const vacant=D.society({...input,workplaces:[{type:'officepark',jobs:400,positions:400,filled:0}]});assert.equal(vacant.affluentTarget,0);assert.match(vacant.advice,/Fill existing specialist vacancies/);
 const partly=D.society({...input,workplaces:[{type:'officepark',jobs:400,positions:400,filled:20}]}),full=D.society({...input,workplaces:[{type:'officepark',jobs:400,positions:400,filled:400}]});
 assert.ok(partly.affluentTarget>0&&partly.affluentTarget<full.affluentTarget);assert.equal(partly.highPayJobs,20);assert.equal(partly.premiumTax,0);
});

test('a normal city can progress from 220 residents to level 4 through legal purchases within 60 months',()=>{
 let s=C.fresh(),n=0,m=0,coal=false;
 const opening=[...[87,127,167,187,227,228,171,194].map(i=>['park',at(i)]),...[84,86,89,124].map(i=>['solar',at(i)]),['wind',at(96)],['wind',at(256)],...[105,110,205,210].map(i=>['bus',at(i)]),['wetland',at(223)],['wetland',at(263)],['school',at(132)],['clinic',at(192)],['waterworks',at(291)],['recycling',at(293)],...[126,129,184].map(i=>['roof',at(i)]),...[106,107,108,109].map(i=>['bike',at(i)]),['battery',at(257)]];
 const expansion=['office','apartment','apartment','office','apartment','apartment','clinic','library','park','park'];
 while(s.month<=60&&C.analyse(s).tier<4){
  while(n<opening.length){const [type,i]=opening[n];if(C.canPlace(s,type,i))break;s=apply(C.place(s,type,i));n++;}
  if(n===opening.length&&!coal){s=apply(C.demolish(s,at(336)));coal=true;}
  while(n===opening.length&&m<expansion.length){const type=expansion[m],a=C.analyse(s);if(s.cash<C.types[type].cost)break;const sites=C.terrain.flatMap((_,i)=>C.canPlace(s,type,i,a)?[]:[i]).sort((x,y)=>C.distance(x,at(168))-C.distance(y,at(168))||x-y);if(!sites.length)break;s=apply(C.place(s,type,sites[0]));m++;}
  if(C.analyse(s).tier<4)s=advance(s);
 }
 const a=C.analyse(s);assert.equal(a.tier,4);assert.ok(s.population>=1000);assert.ok(a.happiness>=60);assert.ok(a.net>0);assert.ok(s.month<=60);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);
});

test('an empty island cannot sell utilities to its own fixed grid connection',()=>{
 const s=C.fresh(),empty={...s,population:0,cells:s.cells.map(()=>null)};
 for(const utilityTariff of [0,1,4]){const a=C.analyse(apply(C.setPolicy(empty,'utilityTariff',utilityTariff)));assert.equal(a.budget.utilities,0);assert.equal(a.budget.utilitySubsidy,0);assert.equal(a.income,0);assert.ok(a.net<0);}
});
