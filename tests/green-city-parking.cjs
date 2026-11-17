const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js'),D=require('../green-city-development.js'),L=require('../green-city-life.js');globalThis.GreenCity=C;globalThis.GreenCityLife=L;
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;};
function city(){let s=C.fresh('sandbox');s=apply(C.place(s,'beach',32));s=apply(C.place(s,'parking',34));return s;}
test('beaches can be built on coastal land without road adjacency; hotels and parking still need roads',()=>{
 const s=C.fresh('sandbox'),roads=C.analyse(s).roads,i=C.terrain.findIndex((_,i)=>!C.canPlace(s,'beach',i)&&C.footprint('beach',i).every(j=>C.neighbours(j).every(k=>!roads.has(k))));assert.ok(i>=0);const beach=apply(C.place(s,'beach',i));assert.equal(beach.cash,s.cash-C.types.beach.cost);assert.equal(C.types.beach.road,undefined);
 for(const type of ['parking','hotel']){assert.equal(C.types[type].road,true);const j=C.terrain.findIndex((_,j)=>C.canPlace(s,type,j).includes('road'));assert.ok(j>=0);assert.equal(C.place(s,type,j).state,s);}
});
test('walking access cannot cross private buildings, water, unowned land or more than six tiles',()=>{
 const size=10,terrain=Array(100).fill('water'),cells=Array(100).fill(null),roads=new Set([11]);for(let i=11;i<=18;i++)terrain[i]='land';cells[17]={type:'beach',level:1};
 const api={size,terrain,types:{},greenTypes:new Set(['beach','park']),roadTypes:new Set(['road']),ownsLand:(s,i)=>i!==s.blocked,footprint:(type,i)=>[i],neighbours:i=>[i-size,i+size,...(i%size?[i-1]:[]),...(i%size<size-1?[i+1]:[])].filter(j=>j>=0&&j<100)},state={cells};
 assert.equal(D.beachAccess(api,state,roads).beaches[0].accessible,true);cells[14]={type:'house'};assert.equal(D.beachAccess(api,state,roads).beaches[0].accessible,false);cells[14]={type:'park'};assert.equal(D.beachAccess(api,state,roads).beaches[0].accessible,true);assert.equal(D.beachAccess(api,{...state,blocked:14},roads).beaches[0].accessible,false);terrain[14]='water';assert.equal(D.beachAccess(api,state,roads).beaches[0].accessible,false);terrain[14]='land';cells[17]=null;cells[18]={type:'beach',level:1};assert.equal(D.beachAccess(api,state,roads).beaches[0].accessible,false);
});
test('parking serves a reachable beach and disconnection removes visits and beach service operation',()=>{
 const s=city(),a=C.analyse(s),lot=a.beachAccess.parking[0];assert.equal(lot.capacity,6);assert.equal(lot.connected,true);assert.equal(lot.beaches[0].i,32);assert.ok(a.beachAccess.beaches[0].accessible);assert.equal(a.tourism.beaches,1);
 const broken=apply(C.demolish(s,tile(17,10))),b=C.analyse(broken),people=L.plan(C,broken,b).walkers;L.attachParking(C,broken,b,people);assert.equal(b.beachAccess.parking[0].connected,false);assert.equal(b.tourism.beaches,0);assert.ok(!b.workplaces.some(w=>w.type==='beach'));assert.ok(people.every(p=>!p.beachCar));
});
test('space reservations are finite, routes stay on connected roads, and mobile drivers are capped',()=>{
 const s=city(),a=C.analyse(s),people=L.plan(C,s,a).walkers,before=JSON.stringify(s);L.attachParking(C,s,a,people);const drivers=people.filter(p=>p.beachCar);assert.equal(drivers.length,6);assert.equal(new Set(drivers.map(p=>p.beachCar.slot)).size,6);
 for(const p of drivers){assert.ok(p.beachCar.roadPath.every(i=>a.roads.has(i)));for(let n=1;n<p.beachCar.roadPath.length;n++)assert.ok(C.neighbours(p.beachCar.roadPath[n-1]).includes(p.beachCar.roadPath[n]));for(const route of [p.beachCar.walkOut,p.beachCar.walkBack])for(const seg of route.segments.filter(s=>s.hold===0))assert.ok(Math.abs(Math.hypot(seg.b.x-seg.a.x,seg.b.z-seg.a.z)/seg.time-p.speed)<.00001);}
 const compact=L.plan(C,s,a,{walkers:32}).walkers;L.attachParking(C,s,a,compact,4);assert.equal(compact.filter(p=>p.beachCar).length,4);assert.equal(JSON.stringify(s),before);
});
test('parking rotates, upgrades to eight and ten spaces, and restores exactly without persisting journey state',()=>{
 for(let rotation=0;rotation<4;rotation++){let s=apply(C.place(apply(C.place(C.fresh('sandbox'),'beach',32)),'parking',34,rotation));for(let level=1;level<=3;level++){const lot=C.analyse(s).beachAccess.parking[0];assert.equal(lot.capacity,4+level*2);for(let n=0;n<lot.capacity;n++){const p=L.parkingSlot(C,lot,n);assert.ok(p.x>=34%C.size-(C.size-1)/2-.49&&p.x<=34%C.size-(C.size-1)/2+1.49);assert.ok(p.z>=Math.floor(34/C.size)-(C.size-1)/2-.49&&p.z<=Math.floor(34/C.size)-(C.size-1)/2+1.49);}assert.deepEqual(C.restore(JSON.parse(JSON.stringify(s))),s);if(level<3)s=apply(C.upgrade(s,34));}}
});
test('residents drive, occupy real bays, get out, walk at their own pace and drive home without changing money',async()=>{
 const {CityLife}=await import('../green-city-life-world.js'),T=await import('../assets/vendor/three/three.module.js'),s=city(),a=C.analyse(s),before=JSON.stringify(s),life=new CityLife(new T.Scene());life.sync(C,s,a,false);assert.equal(life.drivers.length,6);assert.ok(life.parts.length<=22);const phases=new Set();let peak=0,done=0;
 for(let n=1;n<=3600;n++){life.trafficObstacles=life.carObstacles();life.update(n*.05,false,a.transport.roadLoads,n*.05);peak=Math.max(peak,life.counts.parked);for(const p of life.drivers){phases.add(p.current.at);if(p.carCurrent?.parked){assert.ok(Math.hypot(p.carCurrent.x-p.beachCar.bay.x,p.carCurrent.z-p.beachCar.bay.z)<.00001);}if(p.current.at==='complete')done++;}assert.ok(life.counts.parked<=6);}
 for(const phase of ['driving','parking','alighting','walkTo','atBeach','walkBack','boarding','unparking','drivingHome','complete'])assert.ok(phases.has(phase),phase+' must be visibly represented');assert.ok(peak>0);assert.ok(done>0);assert.equal(JSON.stringify(s),before);life.toggle();assert.equal(life.group.visible,false);
});

test('parking manoeuvres avoid other bays and wait before joining occupied roads',()=>{
 const s=city(),a=C.analyse(s),people=L.plan(C,s,a).walkers;L.attachParking(C,s,a,people);const p=people.find(p=>p.beachCar),lot=a.beachAccess.parking[0],car=p.beachCar;
 for(let n=0;n<=100;n++){const position=L.sample(car.park,car.park.outboundEnd*n/100);for(let slot=0;slot<lot.capacity;slot++)if(slot!==car.slot){const bay=L.parkingSlot(C,lot,slot);assert.ok(Math.hypot(position.x-bay.x,position.z-bay.z)>.23,'Enter along the aisle, not through another occupied bay');}}
 p.route=L.compile(p.path,C.size,.44,p.speed);p.carVisit={phase:'unparking',clock:car.unpark.outboundEnd-.1};const before=p.carVisit.clock,next=L.sample(car.unpark,before+.05);L.sampleParking(p,10,.05,[{...next,id:1}]);assert.equal(p.carVisit.clock,before);L.sampleParking(p,10,.05,[]);assert.ok(p.carVisit.clock>before);
});

test('an inland beach bar operates and earns customer income through beach foot access without an adjacent road',()=>{
 const P=require('../green-city-planning.js');let s={...C.fresh('sandbox'),challenge:'revolution',cityLevel:2,cash:100000};s=apply(C.place(s,'beach',32));assert.equal(C.coastal([63]),false);assert.ok(C.neighbours(63).every(i=>!C.analyse(s).roads.has(i)));assert.equal(C.types.beachbar.road,undefined);assert.equal(C.types.beachbar.coast,undefined);
 s=apply(C.place(s,'beachbar',63));const before=JSON.stringify(s),a=C.analyse(s),bar=a.beachAccess.bars[0],work=a.workplaces.find(w=>w.i===63);assert.equal(bar.accessible,true);assert.equal(bar.beach,32);assert.ok(work.linked&&work.filled>0);assert.equal(C.tileInfo(s,63,a).linked,true);assert.ok(a.tourism.bars[0].customers>0&&a.tourism.bars[0].revenue>0);assert.notEqual(P.business(C,s,a,63).status,'No road access');
 const visitors=L.plan(C,s,a).walkers.filter(p=>p.itinerary.outing?.to===63);assert.ok(visitors.length>0);for(const p of visitors){const path=p.itinerary.outing.path;assert.equal(path.at(-1),63);for(let n=1;n<path.length;n++)assert.ok(C.neighbours(path[n-1]).includes(path[n]));}
 assert.equal(JSON.stringify(s),before);for(let rotation=0;rotation<4;rotation++){const saved=JSON.parse(before);saved.cells[63].rotation=rotation;assert.equal(C.restore(saved).cells[63].rotation||0,rotation);}
 const disconnected=apply(C.demolish(s,tile(17,10))),b=C.analyse(disconnected);assert.equal(b.beachAccess.bars[0].accessible,false);assert.ok(!b.workplaces.some(w=>w.i===63));assert.equal(b.tourism.bars[0].revenue,0);assert.equal(P.business(C,disconnected,b,63).status,'No walking access');
});
test('beach bar foot access cannot pass through private buildings or water',()=>{
 const size=10,terrain=Array(100).fill('water'),cells=Array(100).fill(null);for(let i=11;i<=17;i++)terrain[i]='land';terrain[25]='land';cells[17]={type:'beach',level:1};cells[25]={type:'beachbar',level:1};const api={size,terrain,greenTypes:new Set(['beach','park']),roadTypes:new Set(['road']),ownsLand:()=>true,footprint:(type,i)=>[i],neighbours:i=>[i-size,i+size,...(i%size?[i-1]:[]),...(i%size<size-1?[i+1]:[])].filter(j=>j>=0&&j<100)},state={cells},roads=new Set([11]);
 assert.equal(D.beachAccess(api,state,roads).bars[0].accessible,true);cells[15]={type:'house'};assert.equal(D.beachAccess(api,state,roads).bars[0].accessible,false);cells[15]=null;terrain[15]='water';assert.equal(D.beachAccess(api,state,roads).bars[0].accessible,false);
});
