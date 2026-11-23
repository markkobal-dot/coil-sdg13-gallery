import * as THREE from './assets/vendor/three/three.module.js';
import {GLTFLoader} from './assets/vendor/three/GLTFLoader.js';
import './arctic-ice.js?v=b990c3418e';
const I=globalThis.ArcticIce,templates=new Map();
async function bearTemplate(low){
  if(!templates.has(low)){
    const file=low?'polar-bear-mobile.glb':'polar-bear.glb';
    const pending=new GLTFLoader().loadAsync(new URL('./assets/arctic/models/'+file,import.meta.url).href).then(gltf=>{
      const model=gltf.scene;model.rotation.y=-Math.PI/4;model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      model.position.set(-center.x,-box.min.y,-center.z);
      const aligned=new THREE.Group();aligned.add(model);aligned.scale.setScalar(3/Math.max(size.x,size.z));return aligned;
    });
    templates.set(low,pending);pending.catch(()=>templates.delete(low));
  }
  return templates.get(low);
}
function contactShadow(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,62);
  g.addColorStop(0,'#102a3875');g.addColorStop(.45,'#102a3838');g.addColorStop(1,'#102a3800');
  ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(canvas);
}
export class ArcticWildlife{
  constructor(floes,low=false){
    this.disposed=false;this.materials=new Set();this.shadow=contactShadow();this.actors=[];this.lastFrame=null;
    // Adult bears at different distances. No scaled-adult cub or geometric placeholders.
    const definitions=[
      {x:-6.6,z:7.5,portrait:[-4.3,7.5],angle:.08,scale:1},
      {x:-11.4,z:-1.5,portrait:[-5.8,-3],angle:-.3,scale:.88}
    ];
    for(const def of definitions){
      const actor=new THREE.Group();actor.name='Polar bear';actor.visible=false;actor.userData.loaded=false;
      actor.scale.setScalar(def.scale);actor.rotation.y=def.angle;actor.position.set(def.x,I.top(def.x,def.z)+.02,def.z);floes[0].add(actor);
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8*def.scale,1.9*def.scale),new THREE.MeshBasicMaterial({map:this.shadow,transparent:true,depthWrite:false,opacity:.4}));
      shadow.rotation.x=-Math.PI/2;shadow.visible=false;floes[0].add(shadow);this.actors.push({actor,shadow,def});
    }
    this.ready=bearTemplate(low).then(template=>{
      if(this.disposed)return;
      for(const {actor} of this.actors){
        const model=template.clone(true);
        model.traverse(object=>{
          if(!object.isMesh)return;
          object.castShadow=object.receiveShadow=true;
          const clone=source=>{const material=source.clone();material.metalness=0;material.shadowSide=THREE.FrontSide;this.materials.add(material);return material;};
          object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
        });
        actor.add(model);actor.userData.loaded=true;
      }
      if(this.lastFrame)this.update(this.lastFrame);
    });
  }
  update(frame){
    this.lastFrame=frame;const alpha=frame.wildlife;
    for(const {actor,shadow,def} of this.actors){
      actor.visible=shadow.visible=actor.userData.loaded&&alpha>.005;
      const [x,z]=frame.portrait?def.portrait:[def.x,def.z];
      actor.position.set(x,I.top(x,z)+.015,z);shadow.position.set(x,actor.position.y+.012,z);shadow.material.opacity=.4*alpha;
    }
    for(const material of this.materials){
      const fading=alpha<.999;
      if(material.transparent!==fading){material.transparent=fading;material.needsUpdate=true;}
      material.opacity=alpha;material.depthWrite=!fading;
    }
  }
  dispose(){
    this.disposed=true;this.shadow.dispose();
    const textures=new Set();for(const material of this.materials){
      for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(material[key])textures.add(material[key]);
      material.dispose();
    }textures.forEach(texture=>texture.dispose());
  }
}

