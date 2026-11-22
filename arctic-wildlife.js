import * as THREE from './assets/vendor/three/three.module.js';
import './arctic-ice.js?v=539cbf62d9';
const I=globalThis.ArcticIce;
const sphere=new THREE.SphereGeometry(1,24,18);
const bearSkins=new Map();
export function continuousBearSkin(low=false){
  if(bearSkins.has(low))return bearSkins.get(low);
  const shapes=[[-.12,1.04,0,1.02,.5,.39],[.5,1.14,0,.55,.57,.4],[.88,1.32,0,.55,.33,.3],[1.25,1.48,0,.4,.28,.25],[1.58,1.36,0,.35,.15,.17],[-1.06,1.04,0,.15,.17,.17]];
  for(const side of [-1,1]){
    shapes.push([1.13,1.71,side*.19,.115,.12,.075]);
    for(const x of [-.68,.58])shapes.push([x,.51,side*.29,.19,.49,.19],[x+.09,.11,side*.29,.3,.135,.22]);
  }
  const nx=low?42:82,ny=low?28:48,nz=low?20:32,sx=nx+1,sy=ny+1,plane=sx*sy,count=plane*(nz+1),dx=3.55/nx,dy=2.2/ny,dz=1.3/nz;
  const values=new Float32Array(count),positions=new Float32Array(count*3),gradients=new Float32Array(count*3);
  const field=(x,y,z)=>{
    let d=10;
    for(const [cx,cy,cz,rx,ry,rz] of shapes){const q=(Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz)-1)*Math.min(rx,ry,rz),h=Math.max(.09-Math.abs(d-q),0)/.09;d=Math.min(d,q)-h*h*.09*.25;}
    return d;
  };
  for(let k=0;k<=nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const id=i+j*sx+k*plane,x=-1.45+i*dx,y=-.1+j*dy,z=-.65+k*dz;values[id]=field(x,y,z);positions.set([x,y,z],id*3);
  }
  for(let k=0;k<=nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const id=i+j*sx+k*plane;gradients.set([(values[id+(i<nx?1:0)]-values[id-(i>0?1:0)])/dx,(values[id+(j<ny?sx:0)]-values[id-(j>0?sx:0)])/dy,(values[id+(k<nz?plane:0)]-values[id-(k>0?plane:0)])/dz],id*3);
  }
  const out=[],normals=[],uv=[],tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const edge=(a,b)=>{const t=values[a]/(values[a]-values[b]),p=[],n=[];for(let d=0;d<3;d++){p.push(positions[a*3+d]+t*(positions[b*3+d]-positions[a*3+d]));n.push(gradients[a*3+d]+t*(gradients[b*3+d]-gradients[a*3+d]));}const length=Math.hypot(...n)||1;return {p,n:n.map(v=>v/length)};};
  const triangle=(a,b,c)=>{
    const u=b.p.map((v,i)=>v-a.p[i]),v=c.p.map((v,i)=>v-a.p[i]);
    if((u[1]*v[2]-u[2]*v[1])*a.n[0]+(u[2]*v[0]-u[0]*v[2])*a.n[1]+(u[0]*v[1]-u[1]*v[0])*a.n[2]<0)[b,c]=[c,b];
    for(const q of [a,b,c]){out.push(...q.p);normals.push(...q.n);uv.push(q.p[0]*.75+q.p[2]*.3,q.p[1]*.75);}
  };
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const a=i+j*sx+k*plane,cube=[a,a+1,a+sx+1,a+sx,a+plane,a+plane+1,a+plane+sx+1,a+plane+sx];
    let mask=0;cube.forEach((id,n)=>{if(values[id]<0)mask|=1<<n;});if(mask===0||mask===255)continue;
    for(const tet of tetrahedra){const inside=[],outside=[];tet.forEach(n=>(values[cube[n]]<0?inside:outside).push(cube[n]));
      if(inside.length===1)triangle(...outside.map(id=>edge(inside[0],id)));
      else if(inside.length===3)triangle(...inside.map(id=>edge(outside[0],id)));
      else if(inside.length===2){const a=edge(inside[0],outside[0]),b=edge(inside[0],outside[1]),c=edge(inside[1],outside[0]),d=edge(inside[1],outside[1]);triangle(a,b,c);triangle(b,d,c);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));bearSkins.set(low,geometry);return geometry;
}
function ellipsoid(parent,material,position,scale){
  const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function polarBear(materials,cub=false,low=false){
  const group=new THREE.Group();group.name=cub?'Polar bear cub':'Polar bear';
  const skin=new THREE.Mesh(continuousBearSkin(low),materials.fur);skin.castShadow=skin.receiveShadow=true;group.add(skin);
  ellipsoid(group,materials.dark,[1.86,1.375,0],[.075,.065,.11]);
  for(const side of [-1,1]){
    ellipsoid(group,materials.ear,[1.16,1.73,side*.24],[.06,.063,.023]);
    ellipsoid(group,materials.dark,[1.43,1.56,side*.215],[.025,.026,.014]);
  }
  return group;
}
function sealTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(512,256);
  for(let y=0;y<256;y++)for(let x=0;x<512;x++){
    const i=(y*512+x)*4,n=I.noise(x*.2,y*.2),v=98+Math.sin(y/256*Math.PI)*35+n*18;
    image.data.set([v,v+7,v+10,255],i);
  }ctx.putImageData(image,0,0);
  ctx.strokeStyle='#b8c2c080';ctx.lineWidth=1.8;
  for(let i=0;i<100;i++){const x=I.noise(i,12)*512,y=I.noise(i,91)*256;ctx.beginPath();ctx.ellipse(x,y,4+I.noise(i,4)*5,3+I.noise(i,7)*3,i,0,Math.PI*2);ctx.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function ringedSeal(materials){
  const group=new THREE.Group();group.name='Ringed seal';
  ellipsoid(group,materials.seal,[0,.27,0],[1.0,.32,.39]);
  ellipsoid(group,materials.seal,[-.8,.37,0],[.3,.28,.28]);
  ellipsoid(group,materials.muzzle,[-1.04,.32,0],[.17,.1,.18]);
  ellipsoid(group,materials.dark,[-1.18,.36,0],[.04,.035,.065]);
  for(const side of [-1,1]){
    ellipsoid(group,materials.dark,[-.94,.48,side*.21],[.039,.04,.025]);
    const front=ellipsoid(group,materials.seal,[-.42,.09,side*.43],[.3,.075,.13]);front.rotation.y=side*.6;
    const tail=ellipsoid(group,materials.seal,[1.03,.11,side*.14],[.34,.07,.12]);tail.rotation.y=side*.45;
    const whiskers=[];for(let i=0;i<4;i++)whiskers.push(-1.08,.3+i*.015,side*.12,-1.24-i*.025,.27+i*.035,side*(.26+i*.03));
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(whiskers,3));
    group.add(new THREE.LineSegments(geo,materials.whiskers));
  }return group;
}
function shadowMap(){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,62);g.addColorStop(0,'#102a3890');g.addColorStop(.45,'#102a3845');g.addColorStop(1,'#102a3800');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
export class ArcticWildlife{
  constructor(floes,low=false){
    this.texture=sealTexture();this.shadow=shadowMap();
    this.materials={
      fur:new THREE.MeshStandardMaterial({color:'#ede9df',roughness:1}),
      ear:new THREE.MeshStandardMaterial({color:'#9b9388',roughness:1}),
      dark:new THREE.MeshStandardMaterial({color:'#181c1d',roughness:.6}),
      seal:new THREE.MeshStandardMaterial({color:'#b7c1c0',map:this.texture,roughness:.83}),
      muzzle:new THREE.MeshStandardMaterial({color:'#babbb5',roughness:.9}),
      whiskers:new THREE.LineBasicMaterial({color:'#c7c9bf',transparent:true,opacity:.55})
    };
    this.actors=[];
    const definitions=[
      {side:0,x:-6.6,z:7.5,portrait:[-4.3,7.5],angle:.08,scale:1,type:'bear'},
      {side:0,x:-9.2,z:9.2,portrait:[-5.9,9.3],angle:.13,scale:.53,type:'cub'},
      {side:1,x:4.6,z:4.5,portrait:[1.6,4.5],angle:-.3,scale:1,type:'seal'},
      {side:1,x:8.5,z:-4,portrait:[4.4,-2],angle:.35,scale:.72,type:'seal'}
    ];
    for(const def of definitions){
      const actor=def.type==='seal'?ringedSeal(this.materials):polarBear(this.materials,def.type==='cub',low);
      actor.scale.setScalar(def.scale);actor.rotation.y=def.angle;actor.position.set(def.x,I.top(def.x,def.z)+.02,def.z);floes[def.side].add(actor);
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.8*def.scale,1.9*def.scale),new THREE.MeshBasicMaterial({map:this.shadow,transparent:true,depthWrite:false,opacity:.5}));
      shadow.rotation.x=-Math.PI/2;shadow.position.copy(actor.position);shadow.position.y+=.012;floes[def.side].add(shadow);
      this.actors.push({actor,shadow,def});
    }
  }
  applyTextures(textures){
    this.materials.fur.normalMap=textures['snow-normal']||null;this.materials.fur.normalScale=new THREE.Vector2(.12,.12);this.materials.fur.needsUpdate=true;
  }
  update(frame){
    const alpha=frame.wildlife;
    for(const {actor,shadow,def} of this.actors){
      actor.visible=shadow.visible=alpha>.005;
      const [x,z]=frame.portrait?def.portrait:[def.x,def.z];
      actor.position.set(x,I.top(x,z)+.02,z);shadow.position.set(x,actor.position.y+.012,z);shadow.material.opacity=.5*alpha;
      actor.scale.y=def.scale*(1+.008*Math.sin(frame.progress*35));
    }
    for(const material of Object.values(this.materials)){
      const line=material===this.materials.whiskers,fading=alpha<.999||line;
      if(material.transparent!==fading){material.transparent=fading;material.needsUpdate=true;}
      material.opacity=line?.55*alpha:alpha;material.depthWrite=!fading;
    }
  }
  dispose(){this.texture.dispose();this.shadow.dispose();Object.values(this.materials).forEach(m=>m.dispose());}
}

