import * as THREE from './assets/vendor/three/three.module.js';
import './green-city-life.js?v=city-life-1';
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
    if(this.cells===state.cells&&this.density===density&&this.limit===limit)return;
    this.cells=state.cells;this.density=density;this.limit=limit;
    for(const part of this.parts){this.group.remove(part);part.dispose();}this.parts=[];
    const plan=L.plan(C,state,analysis,{walkers:limit,services:compact?4:6});
    this.people=plan.walkers.map(p=>({...p,route:L.compile(p.path,C.size,.44,p.speed)}));
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
    this.update(this.time||0,true);
  }
  place(part,n,x,y,z,w,h,d,angle=0,tilt=0){
    const object=this.dummy;object.position.set(x,y,z);object.rotation.set(tilt,angle,0);object.scale.set(w,h,d);object.updateMatrix();part.setMatrixAt(n,object.matrix);
  }
  update(seconds,still=false,loads=[]){
    this.time=seconds;if(!this.enabled)return;
    for(let n=0;n<this.people.length;n++){
      const person=this.people[n],p=L.sample(person.route,seconds,person.phase),step=still||!p.moving?0:Math.sin(seconds*8+n)*.35,bob=Math.abs(step)*.012;
      this.place(this.body,n,p.x,.14+.19+bob,p.z,.095,.14,.065,p.angle);
      this.place(this.heads,n,p.x,.14+.3+bob,p.z,.05,.055,.05,p.angle);
      for(const [part,side,swing]of [[this.leftLeg,-1,step],[this.rightLeg,1,-step]]){
        const dx=Math.cos(p.angle)*side*.026,dz=-Math.sin(p.angle)*side*.026;
        this.place(part,n,p.x+dx,.14+.085,p.z+dz,.035,.1,.04,p.angle,swing);
      }
    }
    for(let n=0;n<this.vehicles.length;n++){
      const vehicle=this.vehicles[n];
      // Each journey progresses smoothly; traffic affects the current segment without jumping along the route.
      const last=vehicle.lastTime??seconds,dt=still?0:Math.max(0,Math.min(.07,seconds-last));vehicle.lastTime=seconds;
      const current=L.sample(vehicle.route,vehicle.clock||0,vehicle.phase),size=globalThis.GreenCity.size;
      const cell=Math.round(current.z+(size-1)/2)*size+Math.round(current.x+(size-1)/2);
      vehicle.clock=(vehicle.clock||0)+dt*Math.max(.25,1-(loads[cell]||0)/150);
      const p=L.sample(vehicle.route,vehicle.clock,vehicle.phase),cos=Math.cos(p.angle),sin=Math.sin(p.angle),waste=vehicle.kind==='waste';
      const set=(name,x,y,z,w,h,d)=>this.place(this.vParts[name],n,p.x+x*cos+z*sin,.14+y,p.z-x*sin+z*cos,w,h,d,p.angle);
      set('cab',0,.15,.17,.25,.19,.23);set('glass',0,.21,.24,.21,.09,.06);
      set('body',0,.2,-.11,.27,waste?.29:.23,waste?.42:.34);set('roof',0,waste?.355:.325,-.11,.28,.025,waste?.43:.35);
      set('markAcross',0,waste?.375:.345,-.1,.16,.012,.045);set('markAlong',0,waste?.377:.347,-.1,.045,.012,vehicle.kind==='care'?.16:.045);
      for(const [name,x,z]of [['wheelFL',-.14,.2],['wheelFR',.14,.2],['wheelBL',-.14,-.23],['wheelBR',.14,-.23]])set(name,x,.07,z,.045,.11,.11);
    }
    for(const part of this.parts)part.instanceMatrix.needsUpdate=true;
  }
  toggle(){this.enabled=!this.enabled;this.group.visible=this.enabled;return this.enabled;}
  get counts(){return {walkers:this.people.length,services:this.vehicles.length,enabled:this.enabled};}
}
