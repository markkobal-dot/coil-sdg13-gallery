import * as THREE from './assets/vendor/three/three.module.js';
import './arctic-ice.js?v=539cbf62d9';
const I=globalThis.ArcticIce;

// Bundled CC0 maps; phone variants use a quarter of the pixels.
export async function loadSurfaceTextures(low=false){
  const loader=new THREE.TextureLoader(),base=new URL('./assets/arctic/textures/'+(low?'mobile/':''),import.meta.url);
  const textures={};
  await Promise.all(['snow-color','snow-normal','snow-roughness','snow-height','ice-color','ice-normal','ice-roughness','ice-height','sky'].map(async name=>{
    try{
      const t=await loader.loadAsync(new URL(name+'.webp',base).href);
      t.colorSpace=name.endsWith('color')||name==='sky'?THREE.SRGBColorSpace:THREE.NoColorSpace;
      t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=low?2:8;
      textures[name]=t;
    }catch(error){console.warn('Arctic texture unavailable:',name);}
  }));
  return textures;
}
export function iceMaterial(){
  const snow=new THREE.MeshStandardMaterial({color:'#dae6e9',roughness:.92,vertexColors:true});
  // Opaque scattering avoids glass transmission's screen-space refraction artefacts.
  const blue=new THREE.MeshPhysicalMaterial({color:'#b9cbd2',roughness:.56,vertexColors:true,clearcoat:.08,clearcoatRoughness:.4});
  for(const [index,material] of [snow,blue].entries()){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vIcePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIcePoint=position;');
      shader.fragmentShader='varying vec3 vIcePoint;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat wetBand=1.-smoothstep(.015,.17,abs(vIcePoint.y));diffuseColor.rgb*=1.-wetBand*.19;\n'+(index===1?'float iceDepth=1.-smoothstep(-2.4,.05,vIcePoint.y);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.91,1.),iceDepth*.38);':''));
      if(index===1)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat scatter=exp(-abs(vIcePoint.y+.35)*.45);totalEmissiveRadiance+=vec3(.012,.025,.032)*scatter;');
    };
  }
  return [snow,blue];
}
export function applyTextures(materials,textures){
  for(const [i,prefix] of ['snow','ice'].entries()){
    const m=materials[i];m.map=textures[prefix+'-color']||null;m.normalMap=textures[prefix+'-normal']||null;
    m.roughnessMap=textures[prefix+'-roughness']||null;m.displacementMap=textures[prefix+'-height']||null;
    m.normalScale=new THREE.Vector2(i===1?.38:.6,i===1?.38:.6);m.displacementScale=i===1?.018:.035;m.displacementBias=-m.displacementScale*.5;m.needsUpdate=true;
  }
}
export function makeFloe(side,materials,low=false){
  const data=I.build(side,low?.5:1),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));geometry.setIndex(data.indices);
  geometry.addGroup(0,data.topCount,0);geometry.addGroup(data.topCount,data.indices.length-data.topCount,1);geometry.computeVertexNormals();
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,materials);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  const chipMaterial=new THREE.MeshStandardMaterial({color:'#dbe5e7',roughness:.95});
  const chips=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.38,0),chipMaterial,44),pose=new THREE.Object3D();
  chips.castShadow=chips.receiveShadow=true;
  for(let i=0;i<44;i++){
    const z=12-I.noise(i+side*47,11)*52,x=I.seam(z)+(side===0?-1:1)*(.5+I.noise(i+side*31,8)*2.4);
    pose.position.set(x,I.top(x,z)+.12,z);pose.scale.set(.6+I.noise(i,2)*1.3,.2+I.noise(i,4)*.5,.8+I.noise(i,5)*1.4);pose.rotation.set(i*.7,i*1.3,i*.4);pose.updateMatrix();chips.setMatrixAt(i,pose.matrix);
  }group.add(chips);
  const rim=[];for(let i=0;i<data.ring.length;i++){const a=data.ring[i],b=data.ring[(i+1)%data.ring.length];rim.push(a[0],.012,a[1],b[0],.012,b[1]);}
  const edge=new THREE.BufferGeometry();edge.setAttribute('position',new THREE.Float32BufferAttribute(rim,3));
  group.add(new THREE.LineSegments(edge,new THREE.LineBasicMaterial({color:'#c9e4e3',transparent:true,opacity:.24,depthWrite:false})));
  return group;
}
export function iceberg(){
  const count=160,layers=42,p=[],c=[],uv=[],indices=[];
  function vertex(x,z,r){
    const peaks=10*Math.exp(-((x+3)**2/13+(z+1)**2/18))+6.3*Math.exp(-((x-5)**2/10+(z-1)**2/12));
    const ridge=(1-Math.abs(I.noise(x*.7,z*.7)*2-1))*1.15;
    const y=.12+peaks+ridge*Math.min(1,peaks*.5)+(.6*I.fbm(x*.8,z*.8)-.18)*(1-r);
    p.push(x,y,z);const s=.77+.2*I.fbm(x*.5,z*.5);c.push(s,s+.04,Math.min(1,s+.07));uv.push(x*.22,z*.22);
  }
  vertex(0,0,0);
  for(let k=1;k<=layers;k++)for(let j=0;j<count;j++){const a=j/count*Math.PI*2,r=k/layers,edge=1+.13*Math.sin(a*5+.6)+.07*Math.sin(a*9);vertex(Math.cos(a)*12*r*edge,Math.sin(a)*7*r*edge,r);}
  for(let j=0;j<count;j++)indices.push(0,1+(j+1)%count,1+j);
  for(let k=1;k<layers;k++)for(let j=0;j<count;j++){const a=1+(k-1)*count+j,b=1+(k-1)*count+(j+1)%count,d=1+k*count+j,e=1+k*count+(j+1)%count;indices.push(a,b,d,b,e,d);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#e0eced',vertexColors:true,roughness:.78}));mesh.position.set(24,0,-105);return mesh;
}
export function fragments(){
  const geometry=new THREE.CylinderGeometry(1,1.15,.18,12,1),material=new THREE.MeshStandardMaterial({color:'#c5dee0',roughness:.85,transparent:true,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,64),dummy=new THREE.Object3D();
  for(let i=0;i<64;i++){const a=i*2.3999,r=26+I.noise(i,3)*55;dummy.position.set(Math.cos(a)*r,.06,-24-Math.abs(Math.sin(a))*r);const s=.2+I.noise(i,6)*.9;dummy.scale.set(s,1,s*.6);dummy.rotation.y=a;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  return mesh;
}

