const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../green-city-core.js'),D=require('../green-city-development.js'),L=require('../green-city-life.js'),P=require('../green-city-planning.js'),A=require('../green-city-art.js');globalThis.GreenCity=C;globalThis.GreenCityLife=L;globalThis.GreenCityPlanning=P;
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;};
function build(s,type){const i=C.terrain.findIndex((_,j)=>!C.canPlace(s,type,j));assert.ok(i>=0,type+' has a legal plot');return [apply(C.place(s,type,i)),i];}
function tourismCity(){let s={...C.fresh('sandbox'),cash:1000000,population:2000};for(const type of ['airport','hotel','hotel','beach','beachbar','resorthotel'])[s]=build(s,type);return C.grant(s).state;}
test('tourism needs staffed passenger access, shares finite demand and pays the monthly ledger once',()=>{
 const s=tourismCity(),a=C.analyse(s),before=JSON.stringify(s),t=a.tourism;assert.ok(t.gateways.length>0);assert.ok(t.arrivals>0);assert.ok(t.guests<=t.arrivals);assert.ok(t.hotels.every(h=>h.guests<=h.capacity&&h.capacity<=h.rooms));assert.equal(t.revenue,[...t.hotels,...t.bars].reduce((n,b)=>n+b.revenue,0));assert.equal(a.budget.tourismRevenue,t.revenue);assert.equal(JSON.stringify(s),before);
 const next=apply(C.advance(s));assert.equal(next.cash,s.cash+a.net);assert.deepEqual(C.restore(JSON.parse(JSON.stringify(next))),next);
 const none={...s,population:0},n=C.analyse(none).tourism;assert.equal(n.arrivals,0);assert.equal(n.revenue,0);
 const removed=apply(C.demolish(s,t.gateways[0].i));assert.equal(C.analyse(removed).tourism.arrivals,0);assert.equal(C.analyse(removed).tourism.hotels.reduce((n,h)=>n+h.revenue,0),0);
});
test('hotels unlock through passenger gateways while cargo cannot substitute, and prerequisites never spend money',()=>{
 let base={...C.fresh('sandbox'),cash:1000000,month:4,cityLevel:3},i;[base,i]=build(base,'cargoport');let normal={...base,challenge:'revolution',districts:['central','meadows','east']};const before=JSON.stringify(normal);assert.ok(C.canPlace(normal,'hotel',tile(6,7)).includes('airport'));assert.equal(JSON.stringify(normal),before);
 let gateway;[normal,gateway]=build(normal,'airport');assert.ok(C.analyse(normal).tourism.gateways.some(g=>g.i===gateway));[normal]=build(normal,'hotel');assert.deepEqual(C.restore(JSON.parse(JSON.stringify(normal))),normal);
 const broken=apply(C.demolish(normal,tile(17,10)));assert.equal(C.analyse(broken).tourism.gateways.length,0);
});
test('tourism models and textures are original, distinct, bounded, and retain night panes and roof retrofits',async()=>{
 const {CityWorld}=await import('../green-city-world.js'),T=await import('../assets/vendor/three/three.module.js'),w=Object.create(CityWorld.prototype);w.materials=new Map();w.smokePoints=[];const counts=[];
 for(const type of ['house','apartment','luxuryhouse','luxuryapartment','school','clinic','beach','beachbar','hotel','resorthotel']){const model=w.model({type,level:1,roof:null,rotation:0},100,Array(784).fill(null));assert.equal(model.userData.architecture,type);assert.ok(A.piece(type,'land').length>200);counts.push(model.children.length);model.updateMatrixWorld(true);assert.ok(new T.Box3().setFromObject(model).max.y<5);if(C.buildingTypes.has(type)){const roof=w.model({type,level:1,roof:'solar',rotation:0},100,[]);assert.ok(roof.children.length>0);}}
 assert.ok(new Set(counts).size>=5);assert.ok(w.surfaces.size<=4);assert.equal(w.surface('stone'),w.surface('stone'));assert.ok([...w.materials.values()].some(m=>m.map));
});
test('one clinic and one fire station support multiple connected homes across a neighbourhood',()=>{
 let s=C.fresh('sandbox');s=apply(C.place(s,'clinic',tile(6,7)));s=apply(C.place(s,'firestation',tile(9,7)));const a=C.analyse(s),clinic=a.homeProfiles.filter(h=>h.linked&&C.distance(h.i,tile(6,7))<5),fire=a.homeProfiles.filter(h=>h.linked&&C.distance(h.i,tile(9,7))<9);
 assert.ok(clinic.length>=5);assert.ok(clinic.every(h=>h.health>=20));assert.ok(fire.length>=10);assert.ok(fire.every(h=>h.safety>=15));assert.ok(a.neighbourhoods.filter(h=>clinic.some(c=>c.i===h.i)).every(h=>!h.needs.some(n=>n.id==='health')));
 const duplicate=apply(C.place(s,'clinic',tile(6,8))),b=C.analyse(duplicate);assert.ok(b.homeProfiles.every(h=>h.health<=55));
 const broken=apply(C.demolish(s,tile(17,10)));assert.ok(C.analyse(broken).homeProfiles.every(h=>h.health===0&&h.safety===0));
});
function busCity(){let s=C.fresh('sandbox');for(const i of [tile(5,5),tile(5,10),tile(10,10),tile(15,10)])s=apply(C.place(s,'bus',i));return s;}
test('two or more stops run a local bus, configured paused routes stay paused, and ride plans use connected stops',()=>{
 const s=busCity(),a=C.analyse(s),lines=L.transitLines(C,s,a);assert.equal(lines.length,1);assert.equal(lines[0].name,'Local bus');const people=L.plan(C,s,a).walkers;L.connectTransit(C,people,lines,a.roads);const offers=people.flatMap(p=>Object.values(p.itinerary).filter(Boolean).flatMap(t=>Object.values(t.transit).filter(Boolean)));assert.ok(offers.length>0);
 for(const o of offers){assert.ok(lines[0].stops.includes(o.board));assert.ok(lines[0].stops.includes(o.exit));assert.notEqual(o.board,o.exit);assert.ok(o.path.every(i=>a.roads.has(i)));for(let n=1;n<o.path.length;n++)assert.ok(C.neighbours(o.path[n-1]).includes(o.path[n]));}
 const paused={...s,routes:[{id:1,name:'Local route',type:'bus',colour:C.routeColours[0],enabled:false,stops:[tile(5,5),tile(5,10)]}]};assert.equal(L.transitLines(C,paused,C.analyse(paused)).length,0);
});
test('passengers wait, board only the correct direction, pay once per boarding and alight at their destination',()=>{
 const s=busCity(),before=JSON.stringify(s),a=C.analyse(s),lines=L.transitLines(C,s,a),people=L.plan(C,s,a).walkers;L.connectTransit(C,people,lines,a.roads);const person=people.find(p=>p.itinerary.primary?.transit.outbound),trip=person.itinerary.primary,offer=trip.transit.outbound;
 person.route=L.compile(person.path,C.size,.44,person.speed);person.ride={key:'outbound',phase:'waiting',plan:offer,trip,clock:0};const vehicle={id:offer.line,passengers:[],capacity:12,g:{position:{x:2,z:3},rotation:{y:0}}};assert.equal(L.transitStop([person],vehicle,offer.board,-offer.direction).boarded,0);assert.equal(L.transitStop([person],vehicle,offer.board,offer.direction).boarded,1);assert.equal(L.transitStop([person],vehicle,offer.board,offer.direction).boarded,0);assert.equal(person.ride.phase,'aboard');assert.equal(L.sampleRide(person,0,.05).visible,false);
 assert.equal(L.transitStop([person],vehicle,offer.exit,offer.direction).alighted,1);assert.equal(person.ride.phase,'walkFrom');assert.equal(vehicle.passengers.length,0);assert.equal(JSON.stringify(s),before);
 const waiting=L.compile([offer.board],C.size,.44,.65),position=L.sample(waiting,0);assert.ok(Math.abs(position.x-(offer.board%C.size-(C.size-1)/2))<=.45);
});
test('opposite directions use separate lanes; followers stop behind cars and dwelling buses without blocking the other lane',()=>{
 const from=tile(5,5),to=tile(5,6),east=L.lanePosition(from,to,.5,C.size),west=L.lanePosition(to,from,.5,C.size);assert.ok(Math.hypot(east.x-west.x,east.z-west.z)>=.39);
 assert.ok(L.trafficBlocked(east,east.angle,[{...east,id:1,x:east.x+.45}],.68,2));assert.equal(L.trafficBlocked(east,east.angle,[{...west,id:1}],.68,2),false);assert.ok(L.trafficBlocked(east,east.angle,[{...east,id:-100,x:east.x+.6}],.9,2));assert.equal(L.trafficBlocked(east,east.angle,[{...east,id:1,x:east.x-.6}],.68,2),false);
});

test('a rendered bus completes repeated boarding and alighting cycles without changing saved money',async()=>{
 const {CityWorld}=await import('../green-city-world.js'),{CityLife}=await import('../green-city-life-world.js'),T=await import('../assets/vendor/three/three.module.js');const s=busCity(),before=JSON.stringify(s),a=C.analyse(s),life=new CityLife(new T.Scene());life.sync(C,s,a,false);const lines=L.transitLines(C,s,a);L.connectTransit(C,life.people,lines,a.roads);
 const w=Object.create(CityWorld.prototype);Object.assign(w,{state:s,analysis:a,life,cars:[],routeVehicles:lines.map(r=>({id:r.id,name:r.name,g:new T.Group(),stops:new Set(r.stops),baseLength:r.path.length,path:[...r.path,...r.path.slice(1,-1).reverse()],progress:0,dwell:1.1,type:r.type,passengers:[],capacity:12})),updateFare(){}});let boardings=0,seenRiding=0,finished=0;w.showFare=(v,n)=>boardings+=n;
 for(let n=1;n<=4800;n++){w.advanceTransit(.05);life.update(n*.05,false,a.transport.roadLoads,(145+n*.05)%180);seenRiding=Math.max(seenRiding,life.counts.riding);finished=Math.max(finished,life.people.filter(p=>p.ride?.phase==='complete').length);}
 assert.ok(boardings>0,'Passengers must actually board during the animation');assert.ok(seenRiding>0);assert.ok(finished>0,'Passengers must get off and walk to the destination');assert.equal(JSON.stringify(s),before);
});
