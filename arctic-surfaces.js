import * as THREE from './assets/vendor/three/three.module.js';
import {GLTFLoader} from './assets/vendor/three/GLTFLoader.js';
import './arctic-ice.js?v=b990c3418e';
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
  const snow=new THREE.MeshStandardMaterial({color:'#f3faff',roughness:.9,vertexColors:true,dithering:true});
  // Opaque scattering avoids glass transmission's screen-space refraction artefacts.
  const blue=new THREE.MeshPhysicalMaterial({color:'#c2e1e9',roughness:.48,vertexColors:true,clearcoat:.1,clearcoatRoughness:.4,ior:1.31,dithering:true});
  for(const [index,material] of [snow,blue].entries()){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vIcePoint;varying vec3 vIceNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvIcePoint=position;vIceNormal=normal;');
      shader.fragmentShader='varying vec3 vIcePoint;varying vec3 vIceNormal;\n'+shader.fragmentShader;
      if(index===1){
        // Object-space projection removes the long UV unwrap's stretched bands.
        // Two rotated scales break up the recognisable square texture repeats.
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\n#ifdef USE_MAP\nvec3 iceDetail(vec2 uv){vec2 rotated=mat2(.8,-.6,.6,.8)*uv*.713+vec2(.37,.61);return mix(texture2D(map,uv).rgb,texture2D(map,rotated).rgb,.5);}\n#endif');
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nvec3 weights=pow(abs(normalize(vIceNormal)),vec3(4.));weights/=max(dot(weights,vec3(1.)),.0001);vec3 p=vIcePoint*.24;vec3 detail=iceDetail(p.zy)*weights.x+iceDetail(p.xz)*weights.y+iceDetail(p.xy)*weights.z;diffuseColor.rgb*=mix(vec3(1.),detail,.38);\n#endif');
      }
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat wetBand=1.-smoothstep(.015,.17,abs(vIcePoint.y));diffuseColor.rgb*=1.-wetBand*.1;\n'+(index===1?'float frost=smoothstep(-.12,.72,vIcePoint.y);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.91,.94),frost*.58);':''));
      if(index===1)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat scatter=exp(-abs(vIcePoint.y+.5)*.38);totalEmissiveRadiance+=vec3(.008,.065,.09)*scatter;');
    };
  }
  return [snow,blue];
}
export function applyTextures(materials,textures){
  for(const [i,prefix] of ['snow','ice'].entries()){
    const m=materials[i];m.map=textures[prefix+'-color']||null;m.normalMap=textures[prefix+'-normal']||null;
    m.roughnessMap=textures[prefix+'-roughness']||null;m.displacementMap=textures[prefix+'-height']||null;
    m.normalScale=new THREE.Vector2(i===1?.14:.22,i===1?.14:.22);m.displacementScale=i===1?0:.012;m.displacementBias=-m.displacementScale*.5;m.needsUpdate=true;
  }
}
export function makeFloe(side,materials,low=false){
  const data=I.build(side,low?.5:1),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));geometry.setIndex(data.indices);
  geometry.addGroup(0,data.topCount,0);geometry.addGroup(data.topCount,data.indices.length-data.topCount,1);geometry.computeVertexNormals();
  // UVs stay separate, but the cap and wall share a smooth shoulder normal.
  const normals=geometry.attributes.normal,n=data.ring.length,capStart=1+(data.radials-1)*n;
  for(let k=0;k<=data.wallLayers;k++){
    const first=data.wallStart+k*data.wallStride,last=first+n;
    const normal=new THREE.Vector3().fromBufferAttribute(normals,first).add(new THREE.Vector3().fromBufferAttribute(normals,last)).normalize();
    normals.setXYZ(first,normal.x,normal.y,normal.z);normals.setXYZ(last,normal.x,normal.y,normal.z);
  }
  for(let j=0;j<n;j++){
    const cap=capStart+j,wall=data.wallStart+j;
    const normal=new THREE.Vector3().fromBufferAttribute(normals,cap).add(new THREE.Vector3().fromBufferAttribute(normals,wall)).normalize();
    normals.setXYZ(cap,normal.x,normal.y,normal.z);normals.setXYZ(wall,normal.x,normal.y,normal.z);
    if(j===0)normals.setXYZ(data.wallStart+n,normal.x,normal.y,normal.z);
  }
  const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,materials);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  const chipMaterial=new THREE.MeshPhysicalMaterial({color:'#f4fbff',roughness:.52,clearcoat:.14,vertexColors:true});group.userData.rubbleMaterial=chipMaterial;
  const pose=new THREE.Object3D(),perVariant=low?10:17;
  // Fewer weathered pieces, partly embedded in snow, with varied rounded outlines.
  for(let variant=0;variant<5;variant++){
    const shape=new THREE.Shape(),corners=7+variant%4;
    for(let j=0;j<corners;j++){const angle=j/corners*Math.PI*2+.25*(I.noise(j,variant)-.5),r=.34+.28*I.noise(j+variant*7,4),x=Math.cos(angle)*r,z=Math.sin(angle)*r;if(j)shape.lineTo(x,z);else shape.moveTo(x,z);}shape.closePath();
    const plate=new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelThickness:.045,bevelSize:.065,bevelSegments:3,steps:1,curveSegments:1});
    plate.rotateX(-Math.PI/2);plate.translate(0,-.095,0);
    const points=plate.attributes.position,colours=[];
    for(let j=0;j<points.count;j++){const snow=Math.max(0,Math.min(1,(points.getY(j)+.06)/.14));colours.push(.26+snow*.68,.67+snow*.3,.83+snow*.17);}plate.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
    const chips=new THREE.InstancedMesh(plate,chipMaterial,perVariant);chips.castShadow=chips.receiveShadow=true;
    for(let j=0;j<perVariant;j++){
      const i=j+variant*perVariant,z=12-I.noise(i+side*47,11)*52,x=I.seam(z)+(side===0?-1:1)*(1.3+I.noise(i+side*31,8)*2.2),s=i%9===0?.95:.25+I.noise(i,2)*.55;
      const tilt=i%7===0?.35+I.noise(i,9)*.25:I.noise(i,9)*.16;
      pose.position.set(x,I.top(x,z)-.02+s*.035,z);pose.scale.set(s*(.8+I.noise(i,2)),s,s*(1.2+I.noise(i,5)));pose.rotation.set(tilt,i*1.3,(I.noise(i,4)-.5)*.25);pose.updateMatrix();chips.setMatrixAt(j,pose.matrix);
    }group.add(chips);
  }
  const rim=[];for(let i=0;i<data.ring.length;i++){const a=data.ring[i],b=data.ring[(i+1)%data.ring.length];rim.push(a[0],.012,a[1],b[0],.012,b[1]);}
  const edge=new THREE.BufferGeometry();edge.setAttribute('position',new THREE.Float32BufferAttribute(rim,3));
  group.add(new THREE.LineSegments(edge,new THREE.LineBasicMaterial({color:'#c9e4e3',transparent:true,opacity:.24,depthWrite:false})));
  return group;
}
export function iceberg(low=false){
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshPhysicalMaterial({color:'#f4fbff',vertexColors:true,roughness:.63,clearcoat:.04,ior:1.31,dithering:true}));
  mesh.position.set(18,0,-82);mesh.castShadow=mesh.receiveShadow=true;
  const file=low?'sculpted-iceberg-mobile.glb':'sculpted-iceberg.glb';
  mesh.ready=new GLTFLoader().loadAsync(new URL('./assets/arctic/models/'+file,import.meta.url).href).then(gltf=>{
    let source;gltf.scene.traverse(object=>{if(object.isMesh)source=object;});
    if(!source)throw Error('Missing iceberg mesh');
    if(mesh.userData.disposed){source.geometry.dispose();source.material.dispose();return;}
    mesh.geometry.dispose();mesh.geometry=source.geometry;source.material.dispose();
  });return mesh;
}
export function fragments(){
  const geometry=new THREE.CylinderGeometry(1,1.15,.18,12,1),material=new THREE.MeshStandardMaterial({color:'#c5dee0',roughness:.85,transparent:true,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,64),dummy=new THREE.Object3D();
  for(let i=0;i<64;i++){const a=i*2.3999,r=26+I.noise(i,3)*55;dummy.position.set(Math.cos(a)*r,.06,-24-Math.abs(Math.sin(a))*r);const s=.2+I.noise(i,6)*.9;dummy.scale.set(s,1,s*.6);dummy.rotation.y=a;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  return mesh;
}

