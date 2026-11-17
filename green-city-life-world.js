import * as THREE from './assets/vendor/three/three.module.js';
import './green-city-life.js?v=acc9a6f5a0';
const L=globalThis.GreenCityLife;

/* Fixed-size instancing keeps the number of draw calls independent of population. */
export class CityLife {
  constructor(scene){
    this.group=new THREE.Group();scene.add(this.group);this.enabled=true;this.parts=[];
    this.box=new THREE.BoxGeometry(1,1,1);this.head=new THREE.IcosahedronGeometry(1,1);
    this.material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85});
    this.dummy=new THREE.Object3D();this.colour=new THREE.Color();this.people=[];this.vehicles=[];
  }
  part(name,count,geometry=this.box){
    const mesh=new THREE.InstancedMesh(geometry,this.material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;mesh.name=name;this.group.add(mesh);this.parts.push(mesh);return mesh;
  }
  sync(C,state,analysis,compact){
    const limit=compact?32:72,density=Math.min(limit,Math.ceil(state.population/16));
    const economy=JSON.stringify([state.population,state.policies.businessTax,analysis.employment,state.occupancy,state.reclaimed]);
    if(this.cells===state.cells&&this.density===density&&this.limit===limit&&this.economy===economy)return;
    this.economy=economy;
    this.cells=state.cells;this.density=density;this.limit=limit;
    for(const part of this.parts){this.group.remove(part);part.dispose();}this.parts=[];
    const plan=L.plan(C,state,analysis,{walkers:limit,services:compact?4:6});
    this.people=plan.walkers.map(p=>({...p,route:L.compile(p.path,C.size,.44,p.speed),itinerary:Object.fromEntries(Object.entries(p.itinerary).map(([key,trip])=>[key,trip?{...trip,route:L.compile(trip.path,C.size,.44,p.speed)}:null]))}));
    L.attachParking(C,state,analysis,this.people,compact?4:8);this.drivers=this.people.filter(p=>p.beachCar);
    this.vehicles=plan.services.map(p=>({...p,route:L.compile(p.path,C.size,.15,p.speed)}));
    if(this.people.length){
      this.body=this.part('Resident coats',this.people.length);this.heads=this.part('Resident heads',this.people.length,this.head);
      this.leftLeg=this.part('Resident left legs',this.people.length);this.rightLeg=this.part('Resident right legs',this.people.length);
      this.people.forEach((p,n)=>{
        this.body.setColorAt(n,this.colour.set(['#bd775c','#557f87','#d0b377','#638e75','#d5d7c1','#8a7694'][n%6]));
        this.heads.setColorAt(n,this.colour.set(['#d7ae89','#ab795b','#edc9a2','#805a46'][n%4]));
        for(const part of [this.leftLeg,this.rightLeg])part.setColorAt(n,this.colour.set('#455b59'));
      });
    }
    if(this.vehicles.length){
      this.vParts={};for(const name of ['cab','glass','body','roof','markAcross','markAlong','wheelFL','wheelFR','wheelBL','wheelBR'])this.vParts[name]=this.part(name,this.vehicles.length);
      this.vehicles.forEach((p,n)=>{
        const color={care:'#ede9d8',fire:'#b9664f',waste:'#739981',utility:'#749ca9'}[p.kind];
        for(const [name,part]of Object.entries(this.vParts))part.setColorAt(n,this.colour.set(name.startsWith('wheel')?'#344542':name==='glass'?'#3e6269':name.startsWith('mark')?(p.kind==='care'?'#b75f4c':'#e5c288'):color));
      });
    }
    if(this.drivers.length){
      this.cParts={};for(const name of ['body','cabin','glass','wheelFL','wheelFR','wheelBL','wheelBR','door'])this.cParts[name]=this.part('Visitor car '+name,this.drivers.length);
      this.drivers.forEach((p,n)=>{for(const [name,part]of Object.entries(this.cParts))part.setColorAt(n,this.colour.set(name.startsWith('wheel')?'#334542':name==='glass'?'#405e65':['#d9dfce','#839e95','#78919f','#a8b483'][n%4]));});
    }
    this.update(this.time||0,true);
  }
  place(part,n,x,y,z,w,h,d,angle=0,tilt=0){
    const object=this.dummy;object.position.set(x,y,z);object.rotation.set(tilt,angle,0);object.scale.set(w,h,d);object.updateMatrix();part.setMatrixAt(n,object.matrix);
  }
  update(seconds,still=false,loads=[],daySeconds=null){
    const dt=still?0:Math.max(0,Math.min(.07,seconds-(this.time??seconds)));this.time=seconds;if(daySeconds!==null)this.daySeconds=daySeconds;if(!this.enabled)return;
    for(let n=0;n<this.people.length;n++){
      const person=this.people[n],p=this.daySeconds===undefined?L.sample(person.route,seconds,person.phase):(person.beachCar?L.sampleParking(person,this.daySeconds,dt,[...(this.trafficObstacles||[]),...this.carObstacles()]):L.sampleRide(person,this.daySeconds,dt)),step=still||!p.moving?0:Math.sin(seconds*4.4*(person.speed/.17)+n)*.30,bob=Math.abs(step)*.012;
      person.current=p;person.visible=p.visible!==false;
      if(!person.visible){for(const part of [this.body,this.heads,this.leftLeg,this.rightLeg])this.place(part,n,0,-10,0,0,0,0);continue;}
      this.place(this.body,n,p.x,.14+.19+bob,p.z,.095,.14,.065,p.angle);
      this.place(this.heads,n,p.x,.14+.3+bob,p.z,.05,.055,.05,p.angle);
      for(const [part,side,swing]of [[this.leftLeg,-1,step],[this.rightLeg,1,-step]]){
        const dx=Math.cos(p.angle)*side*.026,dz=-Math.sin(p.angle)*side*.026;
        this.place(part,n,p.x+dx,.14+.085,p.z+dz,.035,.1,.04,p.angle,swing);
      }
    }
    for(let n=0;n<this.vehicles.length;n++){
      const vehicle=this.vehicles[n];const hour=this.daySeconds===undefined?12:L.dayHour(this.daySeconds),visible=['care','fire'].includes(vehicle.kind)||(hour>=6&&hour<21);vehicle.visible=visible;if(!visible){for(const part of Object.values(this.vParts))this.place(part,n,0,-10,0,0,0,0);continue;}
      // Each journey progresses smoothly; traffic affects the current segment without jumping along the route.
      const last=vehicle.lastTime??seconds,dt=still?0:Math.max(0,Math.min(.07,seconds-last));vehicle.lastTime=seconds;
      const current=L.sample(vehicle.route,vehicle.clock||0,vehicle.phase),size=globalThis.GreenCity.size;
      const cell=Math.round(current.z+(size-1)/2)*size+Math.round(current.x+(size-1)/2);
      const nextClock=(vehicle.clock||0)+dt*Math.max(.25,1-(loads[cell]||0)/150),next=L.sample(vehicle.route,nextClock,vehicle.phase);if(!L.trafficBlocked(next,next.angle,this.trafficObstacles||[],.8,1000+n))vehicle.clock=nextClock;
      const p=L.sample(vehicle.route,vehicle.clock,vehicle.phase),cos=Math.cos(p.angle),sin=Math.sin(p.angle),waste=vehicle.kind==='waste';
      const set=(name,x,y,z,w,h,d)=>this.place(this.vParts[name],n,p.x+x*cos+z*sin,.14+y,p.z-x*sin+z*cos,w,h,d,p.angle);
      set('cab',0,.15,.17,.25,.19,.23);set('glass',0,.21,.24,.21,.09,.06);
      set('body',0,.2,-.11,.27,waste?.29:.23,waste?.42:.34);set('roof',0,waste?.355:.325,-.11,.28,.025,waste?.43:.35);
      set('markAcross',0,waste?.375:.345,-.1,.16,.012,.045);set('markAlong',0,waste?.377:.347,-.1,.045,.012,vehicle.kind==='care'?.16:.045);
      for(const [name,x,z]of [['wheelFL',-.14,.2],['wheelFR',.14,.2],['wheelBL',-.14,-.23],['wheelBR',.14,-.23]])set(name,x,.07,z,.045,.11,.11);
    }
    for(let n=0;n<(this.drivers||[]).length;n++){
      const car=this.drivers[n].carCurrent;if(!car?.visible){for(const part of Object.values(this.cParts))this.place(part,n,0,-10,0,0,0,0);continue;}
      const cos=Math.cos(car.angle),sin=Math.sin(car.angle),set=(name,x,y,z,w,h,d,turn=0)=>this.place(this.cParts[name],n,car.x+x*cos+z*sin,.14+y,car.z-x*sin+z*cos,w,h,d,car.angle+turn);
      set('body',0,.105,0,.23,.13,.44);set('cabin',0,.205,-.025,.205,.1,.24);set('glass',0,.211,.1,.18,.065,.017);
      for(const [name,x,z]of [['wheelFL',-.12,.14],['wheelFR',.12,.14],['wheelBL',-.12,-.14],['wheelBR',.12,-.14]])set(name,x,.06,z,.035,.08,.08);
      set('door',.118+Math.sin(car.door||0)*.075,.15,.01,.018,.12,.17,car.door||0);
    }
    for(const part of this.parts)part.instanceMatrix.needsUpdate=true;
  }
  carObstacles(){return (this.drivers||[]).flatMap(p=>p.carCurrent?.visible&&p.carCurrent.road?[{...p.carCurrent,id:2000+p.id}]:[]);}
  toggle(){this.enabled=!this.enabled;this.group.visible=this.enabled;if(this.enabled)this.update(this.time||0,true);return this.enabled;}
  get counts(){const parking={};for(const p of this.drivers||[])if(p.carCurrent?.parked)parking[p.beachCar.lot]=(parking[p.beachCar.lot]||0)+1;return {regional:this.regionalStatus||{},parking,driving:(this.drivers||[]).filter(p=>p.carCurrent?.moving).length,parked:Object.values(parking).reduce((n,v)=>n+v,0),walkers:this.people.filter(p=>p.visible!==false).length,services:this.vehicles.filter(p=>p.visible!==false).length,riding:this.people.filter(p=>p.ride?.phase==='aboard').length,residents:this.people.length,enabled:this.enabled};}
}
