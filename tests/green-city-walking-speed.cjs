const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js'),L=require('../green-city-life.js');globalThis.GreenCity=C;globalThis.GreenCityLife=L;
const tile=(r,c)=>r*C.size+c,hour=h=>((h-12+24)%24)/24*180;
function person(length){const path=Array.from({length},(_,n)=>tile(5,n+3)),speed=.17,trip={from:tile(4,3),to:tile(6,length+2),path,activity:'work',purpose:'office'};trip.route=L.compile(path,C.size,.44,speed);return {id:1,from:trip.from,to:trip.to,path,speed,phase:0,itinerary:{primary:trip,outing:null},route:trip.route};}
test('long and short commutes walk at the same bounded speed, independently of the accelerated day',()=>{
 for(const length of [4,20]){const p=person(length);let previous=L.sampleWalking(p,hour(7),0),distance=0;for(let n=1;n<=160;n++){const next=L.sampleWalking(p,(hour(7)+n*.05)%180,.05);const step=Math.hypot(next.x-previous.x,next.z-previous.z);assert.ok(step<=p.speed*.05+.00001);distance+=step;previous=next;}assert.ok(Math.abs(distance-8*p.speed)<.02);}
});
test('residents finish long journeys at walking speed instead of jumping to match the daily schedule',()=>{
 const p=person(20);L.sampleWalking(p,hour(7),0);let sample;for(let n=1;n<=2400;n++)sample=L.sampleWalking(p,(hour(7)+n*.05)%180,.05);assert.ok(p.walk);assert.ok(Number.isFinite(sample.x+sample.z));assert.ok(p.walk.clock<=p.walk.trip.route.duration);
});
test('walking to and from a bus uses the same personal pace, while vehicle fares remain unchanged',()=>{
 let s=C.fresh('sandbox');for(const i of[tile(5,5),tile(5,10),tile(10,10),tile(15,10)])s=C.place(s,'bus',i).state;const a=C.analyse(s),people=L.plan(C,s,a).walkers;L.connectTransit(C,people,L.transitLines(C,s,a),a.roads);let found=0;
 for(const p of people){assert.ok(p.speed>=.14&&p.speed<=.19);for(const trip of Object.values(p.itinerary).filter(Boolean))for(const offer of Object.values(trip.transit).filter(Boolean)){for(const route of [offer.walkTo,offer.walkFrom])for(const segment of route.segments){assert.ok(Math.abs(Math.hypot(segment.b.x-segment.a.x,segment.b.z-segment.a.z)/segment.time-p.speed)<.00001);}found++;}}
 assert.ok(found>0);assert.equal(a.policy.transitFare,2);
});
