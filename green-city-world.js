/* Procedural 3D island: local Three.js, shared geometry, batched static meshes. */
import * as THREE from './assets/vendor/three/three.module.js';
import { OrbitControls } from './assets/vendor/three/OrbitControls.js';
import { mergeGeometries } from './assets/vendor/three/BufferGeometryUtils.js';
import {needIcon} from './green-city-neighbourhood-icons.js?v=98db9558ad';
import {CityLife} from './green-city-life-world.js?v=d69e6e56f2';
import './green-city-planning.js?v=1a80a074c1';

const C = globalThis.GreenCity;
const P = globalThis.GreenCityPlanning;
const mapSize=C.size, center=(mapSize-1)/2, viewHalf=mapSize*.725;
const landY = .14;
const palette = ['#e2cfad','#d7dfd0','#e8d9bd','#a8c8bc','#e3bc9f','#b7c6ce'];
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const geometries = new Map();
function geometry(key, create) { if (!geometries.has(key)) geometries.set(key, create()); return geometries.get(key); }
const boxGeo = () => geometry('box', () => new THREE.BoxGeometry(1,1,1));
const sphereGeo = () => geometry('sphere', () => new THREE.IcosahedronGeometry(1,1));
const cylinderGeo = () => geometry('cylinder', () => new THREE.CylinderGeometry(1,1,1,10));
const coneGeo = () => geometry('cone', () => new THREE.ConeGeometry(1,1,10));

export class CityWorld {
  constructor(canvas, { onSelect, onHover, onError, onNeighbourhood, onLife, onResident, onFollowStop, onDaylight, onDraw }) {
    this.canvas = canvas;this.onDraw=onDraw; this.onSelect=onSelect; this.onHover=onHover; this.onError=onError;this.onNeighbourhood=onNeighbourhood;
    this.materials = new Map(); this.night=false;this.daySeconds=145;this.lifeSeconds=145;this.cycleEnabled=true;this.darkness=0;this.onDaylight=onDaylight; this.overlay='city'; this.mode='inspect'; this.type='tree'; this.focus=8*mapSize+8;
    this.active=false; this.raf=0; this.lastFrame=0; this.time=0; this.dirty=true; this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.08;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#d4e4dd');
    this.scene.fog=new THREE.Fog('#d4e4dd',42,95);
    this.camera=new THREE.OrthographicCamera(-16,16,14,-14,.1,150); this.camera.position.set(27,31,27);
    this.controls=new OrbitControls(this.camera,canvas); this.controls.target.set(0,.5,0);
    this.controls.enableDamping=false; this.controls.minZoom=.55; this.controls.maxZoom=3.7;
    this.controls.minPolarAngle=.32; this.controls.maxPolarAngle=1.23; this.controls.maxTargetRadius=mapSize*1.1;
    this.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
    this.controls.addEventListener('change',()=>{this.dirty=true;this.updateLabels();}); this.controls.update();
    this.ambient=new THREE.HemisphereLight('#eff4dc','#536d5a',1.55);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#fff1cf',2.7);this.sun.position.set(-12,26,12);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:.5,far:65});
    this.sun.shadow.bias=-.00045;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=3;this.scene.add(this.sun);
    this.staticGroup=new THREE.Group();this.dynamicGroup=new THREE.Group();this.scene.add(this.staticGroup,this.dynamicGroup);
    this.life=new CityLife(this.scene);this.onLife=onLife;
    this.onResident=onResident;
    this.onFollowStop=onFollowStop;
    this.rotors=[];this.cars=[];this.smokePoints=[];this.pickTargets=[];
    this.addWater(); this.addGround(); this.addLandscape();
    this.landMask=new THREE.InstancedMesh(new THREE.PlaneGeometry(.98,.98),new THREE.MeshBasicMaterial({color:'#456967',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}),mapSize*mapSize);this.landMask.frustumCulled=false;this.scene.add(this.landMask);
    this.cursor=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.51,0,-.51],[.51,0,-.51],[.51,0,.51],[-.51,0,.51]].map(v=>new THREE.Vector3(...v))),new THREE.LineBasicMaterial({color:'#fff2b8',depthTest:false,transparent:true,opacity:1}));
    this.cursor.renderOrder=20;this.cursor.position.y=.18;this.scene.add(this.cursor);
    this.selection=this.cursor.clone();this.selection.material=this.cursor.material.clone();this.selection.material.color.set('#f3c383');this.selection.position.y=.19;this.scene.add(this.selection);
    this.route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#f2c779',depthTest:false}));this.route.renderOrder=21;this.scene.add(this.route);
    this.brushFill=new THREE.InstancedMesh(new THREE.PlaneGeometry(.92,.92),new THREE.MeshBasicMaterial({transparent:true,opacity:.65,depthWrite:false,depthTest:false,side:THREE.DoubleSide}),mapSize*mapSize);this.brushFill.count=0;this.brushFill.renderOrder=22;this.brushFill.frustumCulled=false;this.scene.add(this.brushFill);
    this.forecastFill=new THREE.InstancedMesh(new THREE.PlaneGeometry(.97,.97),new THREE.MeshBasicMaterial({color:'#4ba8a2',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}),mapSize*mapSize);this.forecastFill.count=0;this.forecastFill.frustumCulled=false;this.scene.add(this.forecastFill);
    this.forecastBorders=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,depthTest:false}));this.forecastBorders.renderOrder=24;this.scene.add(this.forecastBorders);
    this.personRoute=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#486fc4',depthTest:false}));this.personRoute.renderOrder=25;this.personRoute.visible=false;this.scene.add(this.personRoute);
    this.personRing=new THREE.Mesh(new THREE.RingGeometry(.16,.23,24),new THREE.MeshBasicMaterial({color:'#466ec3',side:THREE.DoubleSide,depthTest:false}));this.personRing.rotation.x=-Math.PI/2;this.personRing.renderOrder=26;this.personRing.visible=false;this.scene.add(this.personRing);
    this.createResidentBuildingMarker();
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-landY);this.intersection=new THREE.Vector3();
    this.labels=document.createElement('div');this.labels.className='gc-world-labels';this.labels.setAttribute('aria-hidden','true');canvas.parentElement.append(this.labels);
    this.residentBuildingLabel=document.createElement('div');this.residentBuildingLabel.className='gc-resident-building-label';this.residentBuildingLabel.hidden=true;this.residentBuildingLabel.setAttribute('aria-hidden','true');canvas.parentElement.append(this.residentBuildingLabel);
    this.districts=P.districts;
    this.districts.forEach(([name])=>{const span=document.createElement('span');span.textContent=name;this.labels.append(span);});
    this.pinLayer=document.createElement('div');this.pinLayer.className='gc-neighbourhood-pins';this.pinLayer.setAttribute('aria-label','Neighbourhood feedback markers');canvas.parentElement.append(this.pinLayer);this.pinButtons=new Map();this.showNeeds=true;
    this.pinLayer.addEventListener('click',event=>{const button=event.target.closest('[data-gc-neighbourhood]');if(button)this.onNeighbourhood?.(Number(button.dataset.gcNeighbourhood));});
    this.bindInput();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.setActive(false);onError?.('The 3D view paused because the graphics context was lost. Your city is saved. Reload to restore the view.');});
    this.reduced.addEventListener('change',()=>{this.makeSmoke();this.life.update(this.time,true);this.dirty=true;this.schedule();});
  }
  surface(kind){
    this.surfaces??=new Map();if(this.surfaces.has(kind))return this.surfaces.get(kind);
    const size=32,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const seam=kind==='timber'?x%8===0:kind==='tile'?y%8===0||((x+(Math.floor(y/8)%2)*8)%16===0):kind==='stone'?y%16===0||x%16===0:false;const shade=seam?165:224+Math.floor(hash(x+y*size)*30);const n=(y*size+x)*4;data[n]=data[n+1]=data[n+2]=shade;data[n+3]=255;}
    const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;this.surfaces.set(kind,texture);return texture;
  }
  mat(color, options={}) {
    const key=color+JSON.stringify(options);if(!this.materials.has(key)){const {surface,...rest}=options;this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,...(surface?{map:this.surface(surface)}:{}),...rest}));}return this.materials.get(key);
  }
  pane(g,i,x,y,z,w,h,d){const p=this.box(g,'#355f6c',x,y,z,w,h,d,{roughness:.25,metalness:.25});p.userData.windowCell=i;return p;}
  retrofit(g,cell,y,w=.75,d=.7,x=0,z=0){const roof=new THREE.Group();roof.position.set(x,0,z);g.add(roof);if(cell.roof==='solar')this.solar(roof,y,.8);else if(cell.roof==='roof'){this.box(roof,'#769b6b',0,y,0,w,.045,d);for(const dx of[-w*.24,w*.24])this.leaf(roof,'#4d8059',dx,y+.12,0,.13,.12,.13);}}
  umbrella(g,x,z,colour='#eae4cd',y=.5){this.cylinder(g,'#ac926b',x,y/2,z,.012,y);const top=this.mesh(g,geometry('umbrella',()=>new THREE.ConeGeometry(.22,.085,8)),colour,x,y,z,1,1,1);return top;}
  houseRoof(g,cell,{x=0,z=0,y,w,d,rise=.24,colour='#817a6d',mono=false,retrofit=false,turn=0}){
    const roof=new THREE.Group();roof.position.set(x,y,z);roof.rotation.y=turn;roof.userData.houseRoof=mono?'mono':'pitched';g.add(roof);
    if(mono){const slab=this.box(roof,colour,0,.035,0,w,.065,d,{surface:'concrete'});slab.rotation.x=-.12;}
    else{
      const geo=geometry('pitchedHomeRoof',()=>{const a=[-.5,0,.5],b=[.5,0,.5],c=[0,1,.5],aa=[-.5,0,-.5],bb=[.5,0,-.5],cc=[0,1,-.5],vertices=[a,b,c,bb,aa,cc,a,c,cc,a,cc,aa,c,b,bb,c,bb,cc,a,aa,bb,a,bb,b].flat(),uv=[];for(let n=0;n<vertices.length;n+=3)uv.push(vertices[n]+.5,vertices[n+2]+.5);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;});
      this.mesh(roof,geo,colour,0,0,0,w,rise,d,{surface:'concrete'});
      this.box(roof,colour,0,rise+.008,0,.035,.025,d+.015);
      for(const side of[-1,1])this.box(roof,'#e4deca',side*w*.49,-.012,0,.025,.035,d);
    }
    if(retrofit&&cell.roof){
      const patch=new THREE.Group();patch.position.set(mono?0:w*.23,mono?.085:rise*.58,0);patch.rotation.z=mono?0:-Math.atan2(rise,w/2);if(mono)patch.rotation.x=-.12;roof.add(patch);patch.userData.houseRetrofit=cell.roof;
      if(cell.roof==='solar')this.solar(patch,0,mono?.7:.47);
      else{this.box(patch,'#7b9a62',0,.035,0,mono?w*.72:w*.36,.035,d*.68);for(const zz of[-d*.18,d*.18])this.leaf(patch,'#5a824d',0,.075,zz,.06,.045,.07);}
    }
    return roof;
  }
  house(g,cell,i){
    const row=Math.floor(i/mapSize),col=i%mapSize,variant=(row*2+col+Math.floor(row/3))%6,seed=hash(i+59),f=1+(cell.level-1)*.22,jitter=(seed-.5)*.055;
    g.userData.architecture='house';g.userData.houseVariant=variant;g.userData.houseSeed=seed;
    const walls=['#e4ddc5','#d6dbcd','#c7d4cc','#b59871','#ded6c3','#dadfd2'],roofColours=['#9d8b76','#687b7c','#7f8d82','#74796b','#9a8c7e','#728578'],wall=walls[variant],roof=roofColours[(variant+(seed>.65?1:0))%6];
    // The lot is a garden, with foundations only under the building.
    this.box(g,['#a9b88c','#b1be94','#a5b68b'][i%3],0,.015,0,.93,.03,.93);
    const structure=new THREE.Group();structure.userData.houseStructure=true;structure.scale.set(.88+hash(i+137)*.12,.91+hash(i+271)*.19,.90+hash(i+389)*.10);g.add(structure);g=structure;
    const volume=(x,z,w,h,d,colour=wall)=>{this.box(g,'#c5beaa',x,.052,z,w+.035,.065,d+.035,{surface:'stone'});this.box(g,colour,x,h/2+.075,z,w,h,d,{surface:variant===3?'timber':'concrete'});};
    const frontWindow=(x,y,z,w=.16,h=.18)=>{this.box(g,'#f1ebd9',x,y,z,w+.035,h+.035,.022);this.pane(g,i,x,y,z+.015,w,h,.018);this.box(g,'#c4bea9',x,y-h/2-.025,z+.025,w+.06,.035,.055);};
    const sideWindow=(x,y,z,w=.19,h=.18)=>{this.box(g,'#f1ebd9',x,y,z,.022,h+.035,w+.035);this.pane(g,i,x+.015,y,z,.018,h,w);};
    const door=(x,z,h=.27)=>{this.box(g,'#ebe4d0',x,.075+h/2,z,.17,h+.035,.035);this.box(g,seed>.5?'#7e8c78':'#907c60',x,.075+h/2,z+.023,.125,h,.018,{surface:'timber'});this.box(g,'#cbbb8c',x+.04,.21,z+.036,.012,.018,.01);this.box(g,'#c4bba4',x,.06,z+.085,.23,.055,.14,{surface:'stone'});this.box(g,'#d0c6aa',x,.035,.40,.18,.025,.16+(seed*.035));};
    const planter=(x,z)=>{this.box(g,'#aa9773',x,.08,z,.19,.09,.10);this.leaf(g,'#72905d',x,.15,z,.115,.07,.065);if(seed>.45)this.leaf(g,'#e1dbb8',x+.04,.18,z,.025,.025,.025);};
    if(variant===0){
      const h=(.52+jitter)*f;volume(-.055,-.07,.62,h,.60);this.houseRoof(g,cell,{x:-.055,z:-.07,y:h+.075,w:.73,d:.72,rise:.26,colour:roof,retrofit:true,turn:seed>.57?Math.PI/2:0});
      frontWindow(-.23,.35,.242,.18,.20);door(.09,.245);sideWindow(.264,.35,-.07,.23,.20);
      this.box(g,'#ddcfad',.09,.40,.355,.35,.055,.26);for(const x of[-.06,.24])this.box(g,'#b2a282',x,.23,.45,.022,.36,.022);
      this.box(g,'#a29178',-.22,h+.31,-.16,.075,.25,.09,{surface:'stone'});planter(-.25,.35);
    }else if(variant===1){
      const h=(.84+jitter)*f;volume(-.12,-.08,.49,h,.60);this.houseRoof(g,cell,{x:-.12,z:-.08,y:h+.075,w:.61,d:.72,rise:.24,colour:roof,retrofit:true});
      for(const y of[.34,h*.78]){if(y===.34)frontWindow(-.21,y,.232,.16,.19);else{frontWindow(-.23,y,.232,.13,.19);frontWindow(-.02,y,.232,.13,.19);}sideWindow(.133,y,-.08,.24,.19);}door(.04,.242);
      this.box(g,'#ddd6c1',-.12,h*.64,.32,.54,.04,.18);this.box(g,'#7f9287',-.12,h*.64+.11,.4,.52,.025,.025);for(const x of[-.36,-.12,.12])this.box(g,'#8f9f91',x,h*.64+.06,.4,.012,.12,.018);
      if(seed>.45){volume(.285,-.15,.23,.25,.38,'#a8b8ab');this.houseRoof(g,cell,{x:.285,z:-.15,y:.335,w:.3,d:.45,colour:'#7b8a7f',mono:true});}else planter(.28,-.12);planter(.29,.29);
    }else if(variant===2){
      const h=(.43+jitter)*f;volume(.015,-.10,.74,h,.50);volume(-.22,.12,.29,h*.77,.31,'#b59e7c');
      this.houseRoof(g,cell,{x:.015,z:-.10,y:h+.075,w:.84,d:.62,colour:roof,mono:true,retrofit:true});this.houseRoof(g,cell,{x:-.22,z:.12,y:h*.77+.075,w:.36,d:.38,colour:roof,mono:true});
      frontWindow(.23,.30,.161,.20,.21);sideWindow(.391,.30,-.10,.26,.20);door(.015,.162);
      for(const x of[.30,.35])this.box(g,'#9b8765',x,.30,.188,.02,.31,.025,{surface:'timber'});this.box(g,'#b9a584',.12,.055,.33,.29,.055,.20,{surface:'timber'});planter(-.28,.36);
    }else if(variant===3){
      const h=(.57+jitter)*f;volume(-.025,-.09,.57,h,.58);this.houseRoof(g,cell,{x:-.025,z:-.09,y:h+.075,w:.75,d:.76,rise:.34,colour:roof,retrofit:true});
      frontWindow(-.22,.34,.212,.15,.19);frontWindow(.17,.34,.212,.15,.19);door(-.025,.218);
      this.box(g,'#baa47e',-.025,.085,.34,.76,.06,.22,{surface:'timber'});for(const x of[-.37,.32]){this.box(g,'#8f795a',x,.20,.44,.02,.24,.02);this.box(g,'#8f795a',x,.31,.34,.02,.025,.23);}sideWindow(.271,.35,-.08,.24,.20);planter(.30,-.30);
      this.box(g,'#e1d5b9',-.025,h+.15,.218,.14,.12,.02);this.pane(g,i,-.025,h+.15,.232,.10,.08,.015);
    }else if(variant===4){
      const h=(.54+jitter)*f;volume(-.20,-.07,.32,h*.87,.56);volume(.18,-.12,.36,h*1.18,.60,'#d5cbb7');
      this.houseRoof(g,cell,{x:-.20,z:-.07,y:h*.87+.075,w:.41,d:.67,rise:.20,colour:roof});this.houseRoof(g,cell,{x:.18,z:-.12,y:h*1.18+.075,w:.46,d:.70,rise:.24,colour:roof,retrofit:true});
      frontWindow(-.20,.32,.222,.18,.19);frontWindow(.20,.43,.192,.20,.24);door(.02,.235);sideWindow(.371,.42,-.12,.26,.23);
      this.box(g,'#a7a084',-.30,.09,.35,.18,.10,.18);this.leaf(g,'#6e8b5a',-.30,.20,.35,.10,.11,.09);planter(.29,.34);
    }else{
      const h=(.49+jitter)*f;volume(-.22,-.07,.30,h,.59);volume(.22,-.07,.30,h*.82,.59,'#b49b78');volume(0,-.29,.26,h*.7,.17);
      for(const side of[-1,1])this.houseRoof(g,cell,{x:side*.22,z:-.07,y:(side<0?h:h*.82)+.075,w:.38,d:.68,colour:roof,mono:true,retrofit:side<0});
      frontWindow(-.22,.32,.238,.18,.20);frontWindow(.22,.29,.238,.18,.17);sideWindow(.379,.29,-.06,.27,.17);door(0,-.19);
      this.box(g,'#c4b493',0,.05,.16,.19,.04,.58,{surface:'stone'});this.box(g,'#9c8966',.04,.17,.16,.14,.025,.13);this.cylinder(g,'#837b5e',.04,.11,.16,.012,.11);planter(-.22,.37);planter(.24,.36);
    }
    const rear=(x,y,z,w=.21,h=.18)=>{this.box(g,'#eee8d5',x,y,z,w+.035,h+.035,.022);this.pane(g,i,x,y,z-.015,w,h,.018);this.box(g,'#c4bea9',x,y-h/2-.025,z-.025,w+.05,.03,.045);};
    const west=(x,y,z,w=.22,h=.18)=>{this.box(g,'#eee8d5',x,y,z,.022,h+.035,w+.035);this.pane(g,i,x-.015,y,z,.018,h,w);};
    if(variant===0){rear(-.055,.34,-.38,.30);west(-.38,.34,-.08);}
    if(variant===1){for(const y of[.34,(.84+jitter)*f*.78]){rear(-.12,y,-.392,.29);west(-.377,y,-.08,.23);}}
    if(variant===2){rear(.06,.29,-.36,.37);west(-.37,.29,-.12,.23);}
    if(variant===3){rear(-.025,.35,-.39,.31);west(-.323,.35,-.10,.23);}
    if(variant===4){rear(-.20,.31,-.362,.17);rear(.18,.40,-.432,.20);west(-.372,.31,-.07);}
    if(variant===5){rear(-.22,.31,-.378,.16);rear(.22,.27,-.378,.16);west(-.382,.31,-.07);}
    // A few low boundaries and planting details keep streets open and lots individual.
    if(seed>.32){for(const z of[-.32,-.12,.08,.28])this.box(g,'#a9ad8e',-.435,.13,z,.025,.18,.025);this.box(g,'#b7b69a',-.435,.18,-.02,.025,.028,.70);}
    if(seed<.7){this.cylinder(g,'#8c8264',.40,.105,.28,.012,.17);this.box(g,'#72877b',.40,.20,.28,.065,.055,.045);}
    // Reflect the layout through local positions and rotations, keeping positive
    // mesh scales for both static batching and instanced window lighting.
    if(seed>.5)g.traverse(node=>{if(node!==g){node.position.x*=-1;node.rotation.y*=-1;node.rotation.z*=-1;}});
  }
  residence(g,cell,i){
    if(cell.type==='house'){this.house(g,cell,i);return;}
    const f=1+(cell.level-1)*.28,luxury=cell.type==='luxuryhouse',tower=['apartment','luxuryapartment'].includes(cell.type);
    g.userData.architecture=cell.type;
    this.box(g,'#d3ceb9',0,.035,0,.96,.07,.96,{surface:'stone'});
    if(tower){
      const premium=cell.type==='luxuryapartment',height=(premium?2.35:1.65)*f,width=premium?.72:.77;
      this.box(g,premium?'#c7d2c9':'#b9c7bd',0,height/2+.09,0,width,height,.68,{surface:'concrete'});
      const floors=Math.floor(height/.32);
      for(let n=0;n<floors;n++){const y=.36+n*.32;for(const x of[-.24,0,.24]){this.pane(g,i,x,y,.351,.17,.22,.02);this.pane(g,i,.371,y,x,.02,.22,.17);}this.box(g,'#eee9d9',.025,y-.13,.08,.89,.045,.9,{surface:'stone'});if(premium){for(const x of[-.39,.42])this.box(g,'#749a9e',x,y-.03,.16,.018,.17,.65,{transparent:true,opacity:.65});this.box(g,'#73999c',.01,y-.03,.5,.84,.17,.018,{transparent:true,opacity:.65});this.box(g,'#b6b99a',-.29,y-.06,.39,.14,.1,.12);this.leaf(g,'#4c7955',-.29,y+.01,.39,.09,.08,.075);}}
      this.box(g,'#414f49',0,.22,.38,.54,.3,.035);for(const x of[-.19,.19])this.pane(g,i,x,.22,.404,.12,.23,.02);
      this.box(g,premium?'#efe8d3':'#8baca4',0,.42,.44,.9,.065,.2);
      this.box(g,'#eee8da',0,height+.12,0,.87,.08,.82,{surface:'stone'});
      if(premium){this.box(g,'#6c7e74',-.09,height+.31,-.1,.53,.34,.48,{surface:'timber'});this.pane(g,i,-.09,height+.32,.15,.43,.22,.02);this.box(g,'#c6c3aa',.23,height+.17,.26,.32,.07,.3);this.box(g,'#70aaa9',.23,height+.215,.26,.26,.02,.25,{roughness:.12});for(const x of[-.35,-.15])this.box(g,'#ded6be',x,height+.2,.3,.11,.04,.24);this.retrofit(g,cell,height+.52,.52,.45,-.09,-.1);}
      else this.retrofit(g,cell,height+.18,.75,.66);
      return;
    }
    const height=(luxury?.72:.6)*f;
    if(luxury){
      this.box(g,'#e5e0cf',-.14,height/2+.09,-.12,.6,height,.66,{surface:'stone'});this.box(g,'#a58c68',.26,.29,-.25,.27,.45,.39,{surface:'timber'});
      this.pane(g,i,-.14,height*.55,.22,.5,height*.65,.025);this.pane(g,i,-.455,height*.55,-.11,.018,height*.65,.48);
      this.box(g,'#f1ebd9',-.14,height+.13,-.1,.75,.08,.78);this.box(g,'#bba986',.03,.1,.37,.83,.06,.22,{surface:'timber'});
      this.box(g,'#ece6d3',.3,.11,.06,.31,.07,.4);this.box(g,'#67aaa9',.3,.152,.06,.25,.018,.34,{roughness:.12});
      for(const x of[-.34,-.1]){this.box(g,'#e7dfc7',x,.17,.34,.15,.035,.23);this.box(g,'#9f9676',x,.145,.34,.025,.08,.19);}
      for(const z of[-.32,-.1,.12])this.box(g,'#8a7456',.43,height+.16,z,.025,.04,.14,{surface:'timber'});
      this.retrofit(g,cell,height+.19,.58,.54,-.14,-.1);this.tree(g,-.34,-.36,.3,i);return;
    }
    const facade=['#d7d6c3','#bccdbd','#c6d4d1'][i%3];this.box(g,facade,0,height/2+.07,-.07,.65,height,.66,{surface:i%2?'stone':'concrete'});
    this.box(g,'#a68c66',-.24,height*.5,.275,.16,height*.75,.035,{surface:'timber'});this.pane(g,i,.13,height*.58,.274,.27,.23,.024);this.pane(g,i,.33,height*.58,-.1,.02,.23,.3);
    this.box(g,'#45584e',-.1,.22,.28,.13,.31,.025);this.box(g,'#bdb9a0',-.1,.07,.38,.27,.06,.18,{surface:'stone'});
    if(!cell.roof){const roof=this.mesh(g,geometry('homeRoof',()=>new THREE.ConeGeometry(.51,.23,4)),i%2?'#63746b':'#947c65',0,height+.18,-.07,1,1,.98,{surface:'tile'});roof.rotation.y=Math.PI/4;}else{this.box(g,'#e0decb',0,height+.09,-.07,.75,.06,.76);this.retrofit(g,cell,height+.15,.65,.65,0,-.07);}
    this.box(g,'#8ca87e',.32,.09,.33,.18,.08,.24);this.leaf(g,'#5a8558',.32,.16,.33,.11,.1,.13);
  }
  civic(g,cell,i){
    const school=cell.type==='school',height=(school?.73:.55)*(1+(cell.level-1)*.32);g.userData.architecture=cell.type;
    this.box(g,'#d3d3bd',0,.04,0,.96,.08,.96,{surface:'stone'});
    this.box(g,school?'#d9d7b9':'#e2e9df',-.11,height/2+.08,-.09,.7,height,.66,{surface:'concrete'});
    this.box(g,school?'#759c96':'#85aaa6',.31,.26,-.15,.25,.36,.52,{surface:'timber'});
    for(const x of[-.34,-.1,.14])this.pane(g,i,x,height*.58,.249,.16,.24,.024);
    this.pane(g,i,.385,.32,-.13,.025,.21,.38);this.box(g,'#eceddf',-.11,height+.12,-.09,.78,.07,.74,{surface:'stone'});
    if(school){
      this.box(g,'#7ba4a0',-.09,.38,.37,.64,.04,.24);for(const x of[-.35,.18])this.box(g,'#69897b',x,.21,.42,.022,.37,.022);
      this.box(g,'#8caf91',.14,.091,.36,.5,.012,.23);for(const x of[-.02,.12,.26])this.box(g,'#e9e5ce',x,.1,.35,.035,.012,.14);
      this.box(g,'#6f8174',-.11,height+.25,-.07,.2,.25,.19);this.box(g,'#e9e4ce',-.11,height+.25,.03,.15,.15,.012);this.box(g,'#486455',-.11,height+.27,.042,.012,.06,.008);this.box(g,'#486455',-.08,height+.25,.042,.065,.012,.008);
      this.cylinder(g,'#75927a',-.4,.46,-.34,.015,.8);this.box(g,'#85b2ae',-.32,.8,-.34,.18,.11,.02);
    }else{
      this.box(g,'#548c88',0,.39,.37,.64,.06,.23);this.box(g,'#e3e9db',.13,.63,.27,.25,.23,.025);this.box(g,'#a9514f',.13,.63,.291,.14,.045,.015);this.box(g,'#a9514f',.13,.63,.294,.045,.14,.015);
      this.box(g,'#aeb9aa',0,.083,.4,.68,.02,.18);for(const x of[-.27,.27])this.box(g,'#f0efda',x,.102,.39,.025,.012,.18);
      const van=new THREE.Group();this.vehicle(van,'#e9e7d8');van.scale.setScalar(.45);van.rotation.y=Math.PI/2;van.position.set(-.19,.08,.38);g.add(van);
    }
    this.retrofit(g,cell,height+.18,.64,.55,-.11,-.09);
  }
  hospitality(g,cell,i){
    const type=cell.type;g.userData.architecture=type;
    if(type==='beach'){
      this.box(g,'#dfd2a6',0,.035,0,1.97,.07,.97,{surface:'concrete'});this.box(g,'#b19c78',0,.08,-.32,1.95,.05,.19,{surface:'timber'});
      for(const x of[-.65,0,.65]){this.umbrella(g,x,.08,x===0?'#8eafa6':'#e9e1c2');for(const dx of[-.12,.12])this.box(g,'#e9dfc4',x+dx,.11,.27,.12,.035,.25);}
      this.box(g,'#a9b7a2',.75,.34,-.18,.27,.42,.25,{surface:'timber'});this.box(g,'#eeead8',.75,.59,-.18,.36,.07,.35);return;
    }
    if(type==='beachbar'){
      this.box(g,'#b29a73',0,.04,0,.96,.08,.96,{surface:'timber'});this.box(g,'#9c805d',0,.28,-.2,.7,.4,.36,{surface:'timber'});this.box(g,'#466d62',0,.53,-.17,.86,.07,.58);this.box(g,'#d9c5a0',0,.34,.02,.68,.06,.16);
      for(const x of[-.25,0,.25]){this.cylinder(g,'#567668',x,.2,.13,.055,.3);this.box(g,'#a7b995',x,.36,-.06,.04,.11,.04);}
      for(const x of[-.25,.25]){this.umbrella(g,x,.32,'#d6e0c8',.56);this.cylinder(g,'#b49c74',x,.18,.32,.12,.045);}
      this.retrofit(g,cell,.6,.67,.39,0,-.17);return;
    }
    const resort=type==='resorthotel',width=resort?2.94:1.94,depth=1.94,height=(resort?1.55:1.12)*(1+(cell.level-1)*.25);
    this.box(g,'#dbd7c0',0,.04,0,width,.08,depth,{surface:'stone'});
    for(const x of[-width*.31,width*.31]){this.box(g,'#dfdfd1',x,height/2+.08,-.25,width*.31,height,1.2,{surface:'concrete'});for(let y=.36;y<height;y+=.33){for(const dx of[-.12,.12])this.pane(g,i,x+dx,y,.36,.16,.22,.025);for(const z of[-.63,-.25,.13])this.pane(g,i,x+Math.sign(x)*width*.156,y,z,.025,.22,.22);this.box(g,'#ece8d4',x,y-.13,.46,width*.34,.045,.3);this.box(g,'#7ba4a2',x,y-.025,.59,width*.31,.15,.018,{transparent:true,opacity:.65});}this.box(g,'#759b91',x,height+.12,-.25,width*.34,.07,1.27);this.retrofit(g,cell,height+.19,width*.28,1.05,x,-.25);}
    this.box(g,'#7c9f96',0,.34,-.62,width*.35,.48,.43);this.pane(g,i,0,.34,-.39,width*.25,.3,.02);
    this.box(g,'#ece7d2',0,.13,.26,width*.3,.07,.66);this.box(g,'#66a9ac',0,.176,.26,width*.25,.015,.53,{roughness:.1});for(const x of[-width*.35,width*.35]){this.umbrella(g,x,.7,'#ece6cf',.58);this.box(g,'#b7a882',x,.11,.65,.18,.035,.34);}
    this.box(g,'#9b805c',0,.48,-.39,width*.3,.055,.3,{surface:'timber'});this.tree(g,-width*.42,.6,.5,i);this.tree(g,width*.42,.6,.5,i+1);
  }
  mesh(group,geo,color,x,y,z,sx,sy,sz,options={}) {
    const mesh=new THREE.Mesh(geo,this.mat(color,options));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;
  }
  box(g,color,x,y,z,w,h,d,options) { return this.mesh(g,boxGeo(),color,x,y,z,w,h,d,options); }
  cylinder(g,color,x,y,z,r,h,options) { return this.mesh(g,cylinderGeo(),color,x,y,z,r,h,r,options); }
  leaf(g,color,x,y,z,sx,sy,sz) { return this.mesh(g,sphereGeo(),color,x,y,z,sx,sy,sz); }
  tree(g,x,z,scale=1,seed=0) {
    this.cylinder(g,'#79634a',x,.35*scale,z,.038*scale,.55*scale);
    const color=['#5c8d68','#77a17a','#467c61','#a0b77a'][Math.floor(hash(seed)*4)];
    this.leaf(g,color,x,.77*scale,z,.28*scale,.39*scale,.28*scale);
    this.leaf(g,'#88ac7a',x-.1*scale,.9*scale,z+.03*scale,.2*scale,.24*scale,.21*scale);
  }
  solar(g,y,scale=1) {
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const panel=this.box(g,'#25536b',(col-.5)*.27*scale,y+.08,(row-.5)*.23*scale,.24*scale,.025,.2*scale,{metalness:.4,roughness:.25});panel.rotation.x=-.2;
      this.box(g,'#81b8be',(col-.5)*.27*scale,y+.098,(row-.5)*.23*scale,.009,.006,.2*scale);
    }
  }
  windows(g,w,d,height,seed) {
    const floors=Math.max(1,Math.floor(height/.28));
    const color=hash(seed)>.36?'#315b64':'#deb772';
    for(let f=0;f<floors;f++)for(let col=0;col<2;col++){
      const y=.24+f*(height-.22)/floors;
      this.box(g,color,(col-.5)*w*.48,y,d/2+.005,w*.17,.13,.012,{emissive:'#e7b76c',emissiveIntensity:.08}).userData.windowCell=seed;
      this.box(g,color,w/2+.005,y,(col-.5)*d*.48,.012,.13,d*.17,{emissive:'#e7b76c',emissiveIntensity:.08}).userData.windowCell=seed;
    }
  }
  building(g,cell,i) {
    const type=cell.type,factor=1+(cell.level-1)*.35,seed=hash(i),color=palette[Math.floor(seed*palette.length)];
    let height=(type==='apartment'?1.7+seed*.55:type==='office'?1.35:type==='house'?.58+seed*.22:type==='factory'?.72:.62)*factor;
    const w=type==='house'?.59:.76,d=type==='house'?.62:.74;
    this.box(g,'#e8e4d5',0,.045,0,.9,.09,.9);
    this.box(g,type==='factory'?'#b58369':color,0,height/2+.08,0,w,height,d);
    this.windows(g,w,d,height,i);
    if(type==='house'&&!cell.roof){
      const roof=this.mesh(g,geometry('roof',()=>new THREE.ConeGeometry(.53,.24,4)),'#b88d72',0,height+.19,0,1,1,1);roof.rotation.y=Math.PI/4;
      this.box(g,'#a5ae9a',-.17,height+.2,-.1,.08,.2,.08);
    }else{
      this.box(g,'#e8e4d3',0,height+.11,0,w+.045,.07,d+.045);
      if(type==='apartment')for(let floor=.4;floor<height;floor+=.38)this.box(g,'#e9e7db',.04,floor,d/2+.035,w+.05,.04,.15);
      if(cell.roof==='solar')this.solar(g,height+.17,type==='house'?.85:1.1);
      else if(cell.roof==='roof'){
        this.box(g,'#79a46c',0,height+.16,0,w*.88,.07,d*.88);
        for(const [x,z]of[[-.18,-.16],[.18,.16]]){this.leaf(g,'#4f885d',x,height+.28,z,.15,.16,.13);}
      }else{
        this.box(g,'#afbaad',-.17,height+.2,-.17,.19,.16,.22);
        if(type==='apartment')this.tree(g,.2,-.18,.32,i+3);
      }
    }
    this.box(g,'#576d61',0,.19,d/2+.012,.1,.25,.02);
    if(type==='school'){
      this.box(g,'#4d9090',-.27,height+.15,0,.035,.34,.035);this.box(g,'#e8ad70',-.17,height+.26,0,.22,.12,.02);
      this.box(g,'#c8ac78',0,.07,.36,.5,.025,.18);
    }
    if(type==='clinic'||type==='hospital'){
      this.box(g,'#faf4e8',0,height+.18,0,.3,.03,.3);this.box(g,'#be6c54',0,height+.205,0,.21,.025,.065);this.box(g,'#be6c54',0,height+.21,0,.065,.025,.21);
      if(type==='hospital')for(const x of[-.22,.22])this.box(g,'#e9e7dc',x,.3,.43,.18,.55,.18);
    }
    if(type==='firestation'){
      this.box(g,'#b76f58',0,.3,.4,.66,.4,.1);
      for(const x of[-.17,.17]){this.box(g,'#e5c7a1',x,.29,.46,.22,.32,.025);this.box(g,'#b35f48',x,.13,.49,.17,.12,.26);}
      this.box(g,'#b76f58',0,height+.18,0,.47,.08,.48);
    }
    if(type==='factory'){
      this.cylinder(g,'#9f7964',-.22,1.04*factor,-.17,.08,1.1*factor);this.cylinder(g,'#d1c8ae',-.22,1.5*factor,-.17,.09,.12);
      this.box(g,'#bdac8a',.2,height+.22,0,.18,.26,.35);this.smokePoints.push(new THREE.Vector3(i%C.size-center-.22,landY+1.6*factor,Math.floor(i/C.size)-center-.17));
    }
    if(type==='house'){
      this.box(g,'#c7b891',-.32,.2,-.27,.23,.24,.35);
      this.box(g,'#8eaaa0',-.32,.34,-.27,.25,.04,.36);
      this.box(g,'#71836c',.32,.08,.24,.16,.035,.32);
      this.leaf(g,'#9aae77',.34,.16,-.26,.12,.09,.11);
    }
    if(type==='recycling'){
      for(let n=0;n<3;n++){
        this.box(g,['#6e9e7b','#d5b671','#7ba6a7'][n],-.25+n*.25,.2,.41,.17,.25,.18);
        this.box(g,'#e4e4c8',-.25+n*.25,.34,.41,.19,.035,.2);
      }
      this.box(g,'#668b6d',0,height+.19,0,.44,.1,.42);
    }
    if(type==='waterworks'){
      this.cylinder(g,'#cad5bb',0,height+.22,0,.29,.2);
      this.cylinder(g,'#73aaa7',0,height+.325,0,.25,.018,{roughness:.2,metalness:.25});
      for(const x of[-.21,.21])this.box(g,'#809f8a',x,height+.36,0,.02,.08,.5);
    }
    if(type==='heat'){
      for(const x of[-.23,.23]){
        this.cylinder(g,'#587d75',x,height+.19,0,.15,.04);
        this.box(g,'#b9d0b1',x,height+.22,0,.21,.025,.025);
        this.box(g,'#b9d0b1',x,height+.22,0,.025,.025,.21);
      }
    }
    if(type==='geothermal'){
      for(const x of[-.23,.23]){
        this.cylinder(g,'#a7c5b6',x,height+.35,-.04,.14,.45);
        this.cylinder(g,'#638f83',x,height+.58,-.04,.15,.035);
        this.box(g,'#cba575',x,height+.27,.24,.055,.12,.35);
      }
      this.box(g,'#cba575',0,height+.28,.38,.5,.055,.055);
    }
    if(type==='market'){
      this.box(g,'#c99c68',0,.42,.47,.91,.06,.3);
      for(let n=0;n<6;n++)this.box(g,n%2?'#efe7cf':'#76a082',-.375+n*.15,.457,.47,.14,.018,.3);
      for(const x of[-.41,.41])this.box(g,'#82765a',x,.24,.56,.025,.4,.025);
      for(const x of[-.23,.04,.27]){
        this.box(g,'#b39569',x,.13,.45,.19,.16,.16);
        for(const z of[.41,.48])this.leaf(g,x<0?'#d99b62':'#8da85e',x,.24,z,.065,.05,.04);
      }
    }
    if(type==='library'){
      this.box(g,'#527e80',0,.34,.381,.58,.35,.018);
      for(const x of[-.23,-.08,.08,.23])this.box(g,'#e9e5d2',x,.34,.397,.018,.38,.018);
      this.box(g,'#d7cbb0',0,.07,.45,.65,.07,.18);
      this.box(g,'#d7cbb0',0,.035,.53,.75,.04,.18);
      this.box(g,'#557d66',0,height+.2,0,.36,.035,.3);
      for(const x of[-.09,.09]){const book=this.box(g,'#ece8ce',x,height+.235,0,.17,.025,.24);book.rotation.z=x<0?-.12:.12;}
    }
    if(type==='office'){
      for(const x of[-.25,0,.25])this.box(g,'#517a81',x,height/2+.09,.379,.17,height*.8,.018,{metalness:.25,roughness:.3});
      for(let y=.4;y<height;y+=.35)this.box(g,'#d9e1d4',0,y,.397,.8,.035,.03);
      if(!cell.roof){this.box(g,'#86a278',.12,height+.17,.1,.4,.07,.35);this.leaf(g,'#5f8e62',.16,height+.31,.12,.14,.15,.14);}
    }
  }
  vehicle(g,color='#d4c497',bus=false) {
    const length=bus?.72:.4,width=bus?.28:.23;
    this.box(g,color,0,.12,0,width,.15,length);
    this.box(g,'#335960',0,.24,-.02,width*.84,.12,length*.6);
    this.box(g,color,0,.305,-.02,width*.91,.025,length*.63);
    for(const x of[-width/2,width/2])for(const z of[-length*.32,length*.32])this.box(g,'#344341',x,.065,z,.045,.09,.09);
    this.box(g,'#fff0b0',-.07,.13,length*.5+.006,.045,.04,.01,{emissive:'#fff1b1',emissiveIntensity:.5});this.box(g,'#fff0b0',.07,.13,length*.5+.006,.045,.04,.01,{emissive:'#fff1b1',emissiveIntensity:.5});
  }
  model(cell,i,cells) {
    const g=new THREE.Group(),type=cell.type,scale=1+(cell.level-1)*.18;
    if(type==='house'){
      const home=new THREE.Group();this.residence(home,cell,i);const r=Math.floor(i/mapSize),c=i%mapSize;
      const street=[[1,0,0],[0,1,Math.PI/2],[-1,0,Math.PI],[0,-1,-Math.PI/2]].filter(([dr,dc])=>r+dr>=0&&r+dr<mapSize&&c+dc>=0&&c+dc<mapSize&&C.roadTypes.has(cells?.[(r+dr)*mapSize+c+dc]?.type));
      home.rotation.y=street.length?street[Math.floor(hash(i+11)*street.length)][2]:0;g.userData={...home.userData,streetFacing:home.rotation.y};g.add(home);return g;
    }
    if(['apartment','luxuryhouse','luxuryapartment'].includes(type)){this.residence(g,cell,i);return g;}
    if(['school','clinic'].includes(type)){this.civic(g,cell,i);return g;}
    if(type==='parking'){
      g.userData.architecture='parking';this.box(g,'#667b73',0,.025,0,1.96,.05,1.96,{surface:'concrete'});
      for(const x of[-.97,.97])for(const z of[-.66,.66])this.box(g,'#b8bcaa',x,.075,z,.035,.09,.62);
      const columns=3+cell.level-1,span=1.65/columns;
      for(const z of[-.61,.61])for(let n=0;n<=columns;n++)this.box(g,'#e6e4cc',-.825+n*span,.054,z,.015,.008,.57);
      for(const z of[-.9,.9])this.box(g,'#e6e4cc',0,.054,z,1.65,.008,.015);
      this.box(g,'#c0c7b7',-.87,.31,-.85,.025,.58,.025);this.box(g,'#426b69',-.87,.59,-.85,.18,.21,.035);
      this.box(g,'#f0edda',-.915,.59,-.826,.022,.14,.008);this.box(g,'#f0edda',-.87,.65,-.826,.08,.02,.008);this.box(g,'#f0edda',-.835,.62,-.826,.02,.07,.008);this.box(g,'#f0edda',-.87,.59,-.826,.08,.02,.008);
      return g;
    }
    if(['beach','beachbar','hotel','resorthotel'].includes(type)){this.hospitality(g,cell,i);return g;}
    if(type==='heavyindustry'||type==='refinery'){
      const refinery=type==='refinery',w=refinery?2.94:1.94,smokeStart=this.smokePoints.length;this.box(g,'#bfbda9',0,.05,0,w,.1,1.94);
      if(refinery){for(const x of[-.9,0,.9]){this.cylinder(g,'#b3b7ad',x,.33,.5,.34,.55);this.cylinder(g,'#d2cfbb',x,.63,.5,.35,.06);}for(const x of[-.8,.55]){this.cylinder(g,'#a4aca8',x,.86,-.48,.13,1.6);this.cylinder(g,'#7f8b85',x,1.7,-.48,.16,.12);}this.box(g,'#8b9f94',0,.45,-.48,1.5,.06,.1);}
      else{for(const x of[-.43,.43]){const wing=new THREE.Group();this.building(wing,{...cell,type:'factory'},i);wing.position.x=x;wing.position.z=.3;g.add(wing);}}
      this.smokePoints.length=smokeStart;
      {
        const [width,depth]=C.dimensions(type,cell.rotation);
        for(const[x,z]of refinery?[[-.8,-.48],[.55,-.48]]:[[-.65,.13],[.21,.13]]){const offset=new THREE.Vector3(x,landY+1.9,z).applyAxisAngle(new THREE.Vector3(0,1,0),-(cell.rotation||0)*Math.PI/2);offset.x+=i%mapSize-center+(width-1)/2;offset.z+=Math.floor(i/mapSize)-center+(depth-1)/2;this.smokePoints.push(offset);}
      }
      if(cell.roof==='solar')this.solar(g,.75,.7);else if(cell.roof==='roof')this.leaf(g,'#5b875e',.2,.75,.1,.3,.1,.25);return g;
    }
    if(type==='ecofactory'){
      this.box(g,'#d4ddc9',0,.05,0,1.94,.1,.94);this.box(g,'#91ac91',-.24,.37,0,1.32,.64,.7);this.box(g,'#e1e8d5',.63,.3,0,.5,.5,.7);
      this.box(g,'#73a17d',-.24,.73,0,1.4,.08,.76);if(cell.roof==='solar'){const panels=new THREE.Group();this.solar(panels,.79,.8);panels.position.x=-.24;g.add(panels);}else if(cell.roof==='roof')for(const x of[-.55,.1])this.leaf(g,'#4d825c',x,.86,0,.18,.12,.2);
      for(const x of[-.65,-.25,.15])this.box(g,'#54848b',x,.4,.36,.25,.24,.02);this.tree(g,.72,-.3,.35,i);return g;
    }
    if(type==='gamestudio'){
      this.building(g,{...cell,type:'office'},i);this.box(g,'#3e5b71',-.24,.62,.4,.32,.24,.04);this.box(g,'#c9dfa3',-.24,.62,.43,.19,.035,.02);this.box(g,'#c9dfa3',-.24,.62,.43,.035,.13,.02);return g;
    }
    if(type==='ailab'){
      this.box(g,'#d5dfd0',0,.05,0,1.94,.1,1.94);const office=new THREE.Group();this.building(office,{...cell,type:'office'},i);office.position.x=-.48;g.add(office);
      this.box(g,'#9eb7b7',.48,.58,0,.82,1.05,1.42);this.box(g,'#e1e8da',.48,1.14,0,.9,.08,1.48);
      for(const z of[-.47,0,.47]){this.box(g,'#3f6679',.9,.65,z,.025,.6,.28);this.box(g,'#72928c',.48,1.28,z,.35,.2,.3);}this.tree(g,-.65,.71,.4,i);return g;
    }
    if(['internationalairport','containerport'].includes(type)){
      const airport=type==='internationalairport',base=this.model({...cell,type:airport?'airport':'cargoport'},i,cells);base.scale.set(airport?4/3:1.5,1,1.5);g.add(base);
      if(airport){this.box(g,'#e4e9de',.1,.35,1.05,1.65,.56,.5);this.box(g,'#57818a',.1,.4,1.31,1.5,.3,.02);for(const x of[-.5,0,.5])this.box(g,'#dce5d8',x,.21,.62,.16,.24,.45);}
      else for(let n=0;n<4;n++)this.box(g,['#719c8c','#bfa376'][n%2],-.85+n*.55,.28,-1.12,.45,.42,.38);
      return g;
    }
    if(['regionalhospital','officepark'].includes(type)){
      this.box(g,'#d6dccb',0,.05,0,1.95,.1,1.95);
      const hospital=type==='regionalhospital';
      for(const x of[-.5,.5]){const wing=new THREE.Group();this.building(wing,{...cell,type:hospital?'hospital':'office'},i);wing.position.x=x;wing.scale.set(.95,hospital?1.6:1.15,1.35);g.add(wing);}
      this.box(g,'#719aa0',0,.28,.52,.36,.42,.52);
      if(hospital){this.box(g,'#eae9d8',0,.78,-.48,.66,.08,.68);this.box(g,'#679783',0,.83,-.48,.48,.025,.5);for(const x of[-.12,.12])this.box(g,'#f3efda',x,.85,-.48,.035,.025,.25);this.box(g,'#f3efda',0,.85,-.48,.25,.025,.035);}
      else{this.box(g,'#acc69c',0,.11,-.68,.35,.1,.36);this.tree(g,0,-.69,.5,i);}
      return g;
    }
    if(['luxuryhouse','luxuryapartment'].includes(type)){
      const apartment=type==='luxuryapartment';this.building(g,{...cell,type:apartment?'apartment':'house',roof:'roof'},i);
      this.box(g,'#628c92',.28,.28,.37,.28,.34,.06);this.box(g,'#eae6d6',0,.1,.4,.86,.06,.18);
      if(apartment){for(let y=.45;y<1.8;y+=.38)this.box(g,'#d8dfd4',-.41,y,0,.17,.04,.78);}
      else{this.box(g,'#75a9b2',-.25,.12,.31,.27,.025,.28);this.box(g,'#dedac7',-.25,.13,.46,.33,.035,.035);}
      return g;
    }
    if(type==='airport'){
      this.box(g,'#b7bfaa',0,.035,0,2.94,.06,1.94);
      this.box(g,'#637a79',0,.08,-.36,2.8,.035,.6);
      for(let n=0;n<9;n++)this.box(g,'#e9e5cb',-1.2+n*.3,.105,-.36,.14,.012,.035);
      for(const x of[-1.25,1.25])for(const z of[-.55,-.2])this.box(g,'#dfd3aa',x,.11,z,.13,.012,.035);
      this.box(g,'#dce1d0',-.4,.29,.48,1.2,.46,.58);this.box(g,'#67979a',-.4,.34,.78,1.05,.24,.025);
      this.box(g,'#e3e3cf',.53,.5,.61,.2,.93,.2);this.box(g,'#517f86',.53,1.02,.61,.38,.2,.34);this.box(g,'#e0e4d2',.53,1.15,.61,.42,.05,.38);
      for(const x of[.42,.98])this.box(g,'#e6d7a6',x,.112,-.02,.02,.012,.26);
      for(const x of[-1.3,1.3])this.leaf(g,'#87a477',x,.16,.64,.1,.12,.15);
      return g;
    }
    if(['cargoport','ferry','marina'].includes(type)){
      const large=type!=='ferry',span=large?1.94:.94;
      this.box(g,'#d3c5a5',0,.065,0,span,.12,span);
      this.box(g,'#719f9d',0,.13,span*.26,span*.86,.018,span*.35,{roughness:.25});
      for(const x of[-span*.36,span*.36]){this.box(g,'#b09a71',x,.17,span*.24,.1,.08,span*.6);for(const z of[.1,span*.38])this.cylinder(g,'#6b8373',x,.25,z,.025,.2);}
      if(type==='cargoport'){
        for(let n=0;n<5;n++)this.box(g,['#769d8b','#c5a271','#b77c65'][n%3],-.65+(n%3)*.48,.29+Math.floor(n/3)*.28,-.48,.42,.28,.38);
        for(const x of[-.61,.61])this.box(g,'#d6b877',x,.8,.12,.06,1.5,.06);
        this.box(g,'#d6b877',0,1.53,.12,1.45,.07,.07);this.box(g,'#617e72',0,1.2,.12,.025,.5,.025);
        this.box(g,'#4c7276',0,.23,.64,.85,.15,.28);
      }else if(type==='marina'){
        this.box(g,'#d8ddc7',0,.32,-.6,.85,.5,.48);this.box(g,'#7caaa2',0,.6,-.6,.95,.08,.56);
        for(const x of[-.32,.32]){
          this.box(g,'#ece8d4',x,.2,.48,.22,.1,.6);this.box(g,'#c4b783',x,.27,.45,.025,.08,.025);this.box(g,'#f2eedb',x,.59,.43,.02,.65,.02);
          const sail=this.mesh(g,geometry('sail',()=>new THREE.ConeGeometry(.26,.55,3)),'#f1edda',x+.08,.6,.43,.65,1,.12);sail.rotation.z=-.15;
        }
      }else{
        this.box(g,'#5c8f83',0,.36,-.21,.72,.055,.35);for(const x of[-.28,.28])this.box(g,'#6f9282',x,.21,-.23,.025,.3,.025);
        this.box(g,'#e7e5d1',0,.2,.23,.5,.16,.24);this.box(g,'#5c8b92',0,.33,.23,.34,.13,.21);
      }
      return g;
    }
    if(type==='stadium'){
      this.box(g,'#d2c4a7',0,.05,0,1.94,.09,1.94);this.box(g,'#78a475',0,.12,0,1.42,.06,1.3);
      for(const z of[-.56,.56])this.box(g,'#e7e7cb',0,.16,z,1.22,.012,.025);for(const x of[-.61,.61])this.box(g,'#e7e7cb',x,.16,0,.025,.012,1.15);
      this.box(g,'#e7e7cb',0,.16,0,1.22,.012,.018);
      for(const x of[-.87,.87])for(let n=0;n<3;n++)this.box(g,'#c2bca4',x,.18+n*.1,-.52+n*.52,.2,.25,.43);
      for(const x of[-.72,.72])for(const z of[-.76,.76]){this.box(g,'#81988b',x,.65,z,.025,1.2,.025);this.box(g,'#e7e2c1',x,1.28,z,.22,.045,.06);}
      return g;
    }
    if(C.buildingTypes.has(type)&&type!=='battery'){this.building(g,cell,i);return g;}
    if(C.roadTypes.has(type)){
      this.box(g,'#6d8281',0,.005,0,1,.025,1);
      const r=Math.floor(i/C.size),c=i%C.size;
      const arms=[[-1,0],[1,0],[0,-1],[0,1]].filter(([dr,dc])=>r+dr>=0&&r+dr<C.size&&c+dc>=0&&c+dc<C.size&&C.roadTypes.has(cells[(r+dr)*C.size+c+dc]?.type));
      const horizontal=arms.some(([dr])=>dr===0),vertical=arms.some(([dr])=>dr!==0);
      if(horizontal){this.box(g,'#bdc4b5',0,.025,-.46,1,.025,.07);this.box(g,'#bdc4b5',0,.025,.46,1,.025,.07);for(const x of[-.31,0,.31])this.box(g,'#d7d6bf',x,.025,0,.13,.008,.02);}
      if(vertical){this.box(g,'#bdc4b5',-.46,.025,0,.07,.025,1);this.box(g,'#bdc4b5',.46,.025,0,.07,.025,1);for(const z of[-.31,0,.31])this.box(g,'#d7d6bf',0,.026,z,.02,.008,.13);}
      if(arms.length>2)for(let j=0;j<4;j++)this.box(g,'#e3e1cc',(j-1.5)*.095,.03,.29,.055,.01,.18);
      const roadPartCount=g.children.length;
      if(type==='bike'){
        this.box(g,'#619a79',0,.033,.32,1,.015,.17);for(const x of[-.3,.3])this.box(g,'#d9e7cc',x,.05,.32,.025,.008,.13);
        for(const x of[-.35,.35])this.cylinder(g,'#dfdec8',x,.09,.2,.013,.1);
      }
      if(type==='bus'||type==='tram'){
        this.box(g,'#e4dbc3',.12,.055,.31,.6,.055,.26);this.box(g,'#3f7668',.12,.41,.34,.66,.045,.27);
        for(const x of[-.15,.38])this.box(g,'#497064',x,.23,.41,.025,.35,.025);
        this.box(g,'#aac7b8',.12,.25,.43,.54,.29,.014,{transparent:true,opacity:.55});
        this.box(g,'#c5aa7c',.1,.12,.35,.36,.05,.09);
        if(type==='tram')for(const z of[-.1,.1])this.box(g,'#a8beb8',0,.04,z,1,.016,.02,{metalness:.7});
      }
      if(type==='ev')for(const x of[-.25,.25]){this.box(g,'#e1e0cb',x,.2,.34,.1,.34,.09);this.box(g,'#357f68',x,.28,.392,.06,.11,.014);this.box(g,'#4f6152',x+.07,.14,.34,.018,.18,.02);}
      if(type==='metro'){
        this.box(g,'#d2cfb7',0,.05,.16,.8,.07,.6);
        this.box(g,'#284e51',0,.092,.1,.58,.02,.42);
        for(let n=0;n<5;n++)this.box(g,'#94a89d',0,.11+n*.018,-.05+n*.075,.5,.025,.035);
        for(const x of[-.34,.34])this.box(g,'#5c8e81',x,.34,.12,.035,.55,.52);
        this.box(g,'#84a79a',0,.62,.12,.75,.055,.58);
        this.box(g,'#467f85',.32,.88,.24,.18,.3,.035);
        this.box(g,'#eceddb',.32,.9,.264,.11,.025,.012);
      }
      if(type==='bikeshare'){
        this.box(g,'#c6c9ae',0,.06,.3,.9,.065,.32);
        for(const x of[-.3,-.1,.1,.3]){
          this.box(g,'#648e7f',x,.2,.4,.025,.28,.035);
          for(const z of[.08,.3]){const wheel=this.cylinder(g,'#3e5b53',x,.16,z,.075,.025);wheel.rotation.z=Math.PI/2;}
          this.box(g,'#78aaa0',x,.23,.2,.025,.035,.25);
          this.box(g,'#78aaa0',x,.28,.19,.025,.14,.025);
          this.box(g,'#e2d8b7',x,.36,.1,.11,.025,.025);
        }
      }
      if(i%8===0){this.cylinder(g,'#6b8174',-.42,.32,-.42,.013,.59);this.box(g,'#e9d6a0',-.42,.63,-.4,.13,.035,.07,{emissive:'#ffdd99',emissiveIntensity:.2});}
      const fixtures=new THREE.Group();fixtures.name='Road fixtures';for(const child of g.children.slice(roadPartCount))fixtures.add(child);fixtures.rotation.y=-(cell.rotation||0)*Math.PI/2;g.add(fixtures);
      return g;
    }
    if(C.greenTypes.has(type)){
      this.box(g,type==='wetland'?'#83aa88':'#9fba7d',0,.04,0,.94,.06,.94);
      if(type==='tree')this.tree(g,0,0,scale,i);
      if(type==='forest')for(const[x,z,s]of[[-.26,-.2,.83],[.24,.21,.76],[.25,-.22,.95],[-.22,.24,.8],[0,0,1.05]])this.tree(g,x,z,s*scale,i+x*30);
      if(type==='park'){
        this.box(g,'#ddcfac',0,.077,0,.14,.015,.94);this.box(g,'#ddcfac',0,.078,0,.94,.015,.12);
        for(const[x,z]of[[-.28,-.25],[.28,.25]])this.tree(g,x,z,.73*scale,i+x*30);
        this.box(g,'#aa8058',.27,.17,-.24,.28,.04,.09);this.box(g,'#aa8058',.27,.23,-.29,.28,.12,.035);
        for(const x of[.16,.36])this.box(g,'#5b7056',x,.12,-.24,.025,.1,.06);
      }
      if(type==='garden')for(const x of[-.27,0,.27]){
        this.box(g,'#af9267',x,.12,0,.19,.12,.64);this.box(g,'#6b7850',x,.185,0,.15,.025,.6);
        for(const z of[-.2,0,.2])this.leaf(g,hash(i+z)>.5?'#9cba69':'#597d47',x,.25,z,.07,.08,.075);
      }
      if(type==='wetland'){
        this.cylinder(g,'#7bacaa',0,.08,0,.32,.022,{roughness:.2});
        for(let n=0;n<6;n++){const a=n/6*Math.PI*2;this.box(g,'#597b50',Math.cos(a)*.3,.2,Math.sin(a)*.3,.02,.24,.02);this.leaf(g,'#ac9564',Math.cos(a)*.3,.32,Math.sin(a)*.3,.035,.06,.035);}
      }
      if(type==='orchard'){
        for(const[x,z]of[[-.24,-.24],[.24,-.24],[-.24,.24],[.24,.24]]){
          this.tree(g,x,z,.65*scale,i+x*13+z*7);
          for(const[dx,dz]of[[-.08,.09],[.1,.06]])this.leaf(g,'#d9a15b',x+dx,.54*scale,z+dz,.045,.045,.045);
        }
        this.box(g,'#baa272',0,.08,0,.09,.025,.9);
      }
      if(type==='playground'){
        this.box(g,'#d7bc8b',0,.08,0,.72,.035,.65);
        for(const x of[-.24,.07])for(const z of[-.2,.13])this.box(g,'#9c7856',x,.35,z,.025,.5,.025);
        this.box(g,'#c5a273',-.08,.43,-.03,.42,.055,.43);
        this.box(g,'#ca9562',-.08,.65,-.03,.46,.09,.46);
        const slide=this.box(g,'#73a4ac',.24,.28,.02,.23,.035,.56);slide.rotation.x=.65;
        this.tree(g,-.34,.3,.46,i);
      }
      if(type==='plaza'){
        this.box(g,'#d6cbb0',0,.083,0,.87,.035,.87);
        this.cylinder(g,'#a8b6a1',0,.13,0,.22,.1);
        this.cylinder(g,'#78aaa7',0,.187,0,.19,.018,{roughness:.2});
        this.cylinder(g,'#bad5c3',0,.29,0,.018,.2);
        for(const x of[-.34,.34]){
          this.box(g,'#7d9e70',x,.115,0,.14,.07,.65);
          for(const z of[-.2,.2])this.leaf(g,'#64885b',x,.2,z,.08,.09,.08);
        }
        this.box(g,'#aa8b61',0,.19,.31,.37,.045,.1);
      }
      if(type==='park'||type==='tree')for(let j=0;j<3;j++)this.leaf(g,['#e2b871','#d8a491','#a7b987'][j],-.3+j*.2,.12,.34,.055,.04,.055);
      return g;
    }
    if(type==='wind'){
      this.cylinder(g,'#c2c5ad',0,.07,0,.23,.12);const pole=this.mesh(g,coneGeo(),'#e4e9dd',0,1.37*scale,0,.065,2.65*scale,.065);pole.rotation.z=.015;
      this.box(g,'#d1ded4',0,2.7*scale,0,.13,.12,.27);
      const rotor=new THREE.Group();rotor.position.set(0,2.7*scale,.17);rotor.userData.animated=(this.animatedWindCount||0)<24;this.animatedWindCount=(this.animatedWindCount||0)+1;
      for(let n=0;n<3;n++){const arm=new THREE.Group();arm.rotation.z=n*Math.PI*2/3;this.box(arm,'#f2f1df',0,.43,0,.07,.83,.025);rotor.add(arm);}
      this.cylinder(rotor,'#4f827a',0,0,0,.06,.06);g.add(rotor);return g;
    }
    if(type==='solarfarm'){
      this.box(g,'#bec4a4',0,.035,0,.94,.06,.94);
      for(const x of[-.29,0,.29])for(const z of[-.27,.07,.35]){
        this.box(g,'#809588',x,.14,z,.025,.22,.025);
        const panel=this.box(g,'#285b71',x,.27,z,.26,.025,.25,{metalness:.4,roughness:.25});panel.rotation.x=-.3;
        this.box(g,'#82b4bd',x,.29,z,.008,.006,.23);
      }
      return g;
    }
    if(type==='coal'){
      this.box(g,'#b0aa8e',0,.25,0,.8,.5,.7);for(const x of[-.22,.22]){this.cylinder(g,'#c1bca8',x,.95,0,.17,1.4);this.cylinder(g,'#827f6e',x,1.67,0,.14,.05);}this.smokePoints.push(new THREE.Vector3(i%mapSize-center,1.85,Math.floor(i/mapSize)-center));return g;
    }
    if(type==='battery'){
      this.box(g,'#ddd9c5',0,.035,0,.92,.06,.92);
      for(const x of[-.21,.21]){this.box(g,'#b1c6ad',x,.31,0,.3,.53,.62);this.box(g,'#527b63',x,.32,.315,.22,.36,.012);for(let l=0;l<3;l++)this.box(g,'#d9daa7',x,.24+l*.075,.326,.12,.025,.01);}
      this.box(g,'#b9c7b4',0,.63,0,.8,.05,.72);if(cell.roof==='solar')this.solar(g,.69);if(cell.roof==='roof')this.box(g,'#83a46e',0,.69,0,.7,.07,.6);return g;
    }
    return g;
  }
  addWater() {
    this.waterMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uNight:{value:0}},vertexShader:`varying vec3 vWorld; uniform float uTime; void main(){vec3 p=position;p.z+=sin(p.x*.65+uTime*.4)*.025+cos(p.y*.55+uTime*.3)*.018;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying vec3 vWorld; uniform float uTime;uniform float uNight;void main(){float wave=sin(vWorld.x*2.8+vWorld.z*1.6+uTime*.65+sin(vWorld.z*.8+uTime*.2)*.6)*.5+.5;float stripe=smoothstep(.97,1.,wave)*.045;vec3 water=mix(vec3(.43,.66,.64),vec3(.57,.75,.71),sin(vWorld.x*.13+vWorld.z*.17)*.5+.5);water+=stripe;water=mix(water,water*vec3(.24,.42,.56),uNight);gl_FragColor=vec4(water,1.);}`});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(150,150,80,80),this.waterMaterial);plane.rotation.x=-Math.PI/2;plane.position.y=-.12;this.scene.add(plane);
  }
  addGround(){
    const terrain=C.terrainFor(this.state),land=terrain.flatMap((t,i)=>t==='land'?[i]:[]);this.terrainMap=terrain;
    const ground=new THREE.InstancedMesh(new THREE.BoxGeometry(.997,.38,.997),this.mat('#ffffff'),land.length);ground.receiveShadow=true;
    const dummy=new THREE.Object3D();
    land.forEach((i,n)=>{dummy.position.set(i%mapSize-center,-.055,Math.floor(i/mapSize)-center);dummy.updateMatrix();ground.setMatrixAt(n,dummy.matrix);ground.setColorAt(n,new THREE.Color(P.groundColour(C,i,this.state)));});this.ground=ground;this.scene.add(ground);
    const vertices=[];land.forEach(i=>{const x=i%mapSize-center,z=Math.floor(i/mapSize)-center;for(const[a,b]of[[[-.5,-.5],[.5,-.5]],[[.5,-.5],[.5,.5]],[[.5,.5],[-.5,.5]],[[-.5,.5],[-.5,-.5]]])vertices.push(x+a[0],.142,z+a[1],x+b[0],.142,z+b[1]);});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.grid=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#f0e6c9',transparent:true,opacity:.2}));this.scene.add(this.grid);
    this.overlayMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.96,.96),new THREE.MeshBasicMaterial({transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}),land.length);this.overlayMesh.userData.cells=land;this.overlayMesh.visible=false;
    land.forEach((i,n)=>{dummy.position.set(i%mapSize-center,.17,Math.floor(i/mapSize)-center);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();this.overlayMesh.setMatrixAt(n,dummy.matrix);this.overlayMesh.setColorAt(n,new THREE.Color('#ffffff'));});this.overlayMesh.renderOrder=2;this.scene.add(this.overlayMesh);
  }
  addLandscape(){
    const scenery=new THREE.Group(),terrainMap=C.terrainFor(this.state);
    // Protected shore features occupy water only; every existing plot remains usable.
    terrainMap.forEach((terrain,i)=>{
      if(terrain!=='water'||!C.neighbours(i).some(j=>terrainMap[j]==='land'))return;
      const x=i%mapSize-center,z=Math.floor(i/mapSize)-center;
      for(const j of C.neighbours(i).filter(j=>terrainMap[j]==='land')){
        const dx=j%mapSize-i%mapSize,dz=Math.floor(j/mapSize)-Math.floor(i/mapSize);
        this.box(scenery,'#c6bfa1',x+dx*.42,-.09,z+dz*.42,dx?.22:.99,.13,dz?.22:.99);
      }
      if(hash(i)>.88){this.mesh(scenery,sphereGeo(),'#91a29a',x+.16,-.025,z-.1,.18,.13,.24,{flatShading:true});this.mesh(scenery,sphereGeo(),'#b1b8a3',x-.15,-.04,z+.12,.13,.1,.18,{flatShading:true});}
      if(Math.floor(i/mapSize)>=9&&Math.floor(i/mapSize)<=14&&i%mapSize===2){
        for(let n=0;n<5;n++){const stem=this.box(scenery,'#78936d',x-.25+hash(i+n)*.5,.08,z-.2+hash(i+n+3)*.4,.025,.28,.025);stem.rotation.z=(hash(i+n)-.5)*.45;}
      }
    });
    // Offshore landforms give the island a horizon without changing the saved grid.
    for(const[x,z,scale]of[[-18,-9,1],[2,-19,1.2],[8,-20,.8]]){
      this.mesh(scenery,coneGeo(),'#839b79',x,.55*scale,z,3.1*scale,1.45*scale,2.5*scale,{flatShading:true});
      this.mesh(scenery,coneGeo(),'#a7b09c',x-.5,1.35*scale,z-.2,1.8*scale,3.2*scale,1.5*scale,{flatShading:true});
      this.mesh(scenery,coneGeo(),'#c1c4af',x+.65,1.15*scale,z,1.15*scale,2.8*scale,1*scale,{flatShading:true});
      for(let n=0;n<8;n++){const seed=n+Math.round(x*x),angle=hash(seed)*Math.PI*2,radius=.6+hash(seed+4)*.18,tree=new THREE.Group();this.tree(tree,0,0,.5+hash(seed+8)*.3,seed);tree.position.set(x+Math.cos(angle)*3.1*scale*radius,(1.275-radius*1.45)*scale,z+Math.sin(angle)*2.5*scale*radius);scenery.add(tree);}
    }
    const target=new THREE.Group();this.batch(scenery,target);this.landscapeGroup=target;this.scene.add(target);
  }
  rebuildTerrain(state){
    const map=C.terrainFor(state);if(!this.ground||this.terrainMap===map)return;
    const gridVisible=this.grid.visible,previous=this.state;this.state=state;
    for(const mesh of [this.ground,this.grid,this.overlayMesh]){this.scene.remove(mesh);mesh.geometry.dispose();if(mesh!==this.ground)mesh.material.dispose();if(mesh.isInstancedMesh)mesh.dispose();}
    if(this.landscapeGroup){this.clear(this.landscapeGroup);this.scene.remove(this.landscapeGroup);}
    this.addGround();this.grid.visible=gridVisible;this.addLandscape();this.state=previous;this.landSignature=null;
  }
  setForecast(report){
    const signature=JSON.stringify(report?[report.coverage,report.homes.map(h=>[h.i,h.kind])]:null);
    if(signature===this.forecastSignature)return;this.forecastSignature=signature;
    const dummy=new THREE.Object3D(),coverage=report?.coverage||[];this.forecastFill.count=coverage.length;
    coverage.forEach((i,n)=>{dummy.position.set(i%mapSize-center,.165,Math.floor(i/mapSize)-center);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();this.forecastFill.setMatrixAt(n,dummy.matrix);});this.forecastFill.instanceMatrix.needsUpdate=true;
    const points=[],colours=[];
    for(const home of report?.homes||[]){
      const [w,h]=C.dimensions(this.state?.cells[home.i]?.type,this.state?.cells[home.i]?.rotation),x=home.i%mapSize-center,z=Math.floor(home.i/mapSize)-center;
      const color=new THREE.Color(home.kind==='better'?'#66b34f':'#d08c46');
      for(const[a,b]of[[[-.54,-.54],[w-.46,-.54]],[[w-.46,-.54],[w-.46,h-.46]],[[w-.46,h-.46],[-.54,h-.46]],[[-.54,h-.46],[-.54,-.54]]]){
        points.push(x+a[0],.23,z+a[1],x+b[0],.23,z+b[1]);colours.push(color.r,color.g,color.b,color.r,color.g,color.b);
      }
    }
    this.forecastBorders.geometry.dispose();this.forecastBorders.geometry=new THREE.BufferGeometry();this.forecastBorders.geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.forecastBorders.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));this.dirty=true;this.schedule();
  }
  createResidentBuildingMarker(){
    this.residentBuildingMarker=new THREE.Group();this.residentBuildingMarker.visible=false;
    this.buildingOutline=new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo()),new THREE.LineBasicMaterial({color:'#3f75ce',depthTest:false,transparent:true,opacity:.95}));this.buildingOutline.renderOrder=28;
    this.buildingTint=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#527ed1',transparent:true,opacity:.18,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));this.buildingTint.rotation.x=-Math.PI/2;this.buildingTint.position.y=.03;this.buildingTint.renderOrder=27;
    this.residentBuildingMarker.add(this.buildingOutline,this.buildingTint);this.scene.add(this.residentBuildingMarker);
  }
  clearResidentBuilding(){this.residentBuildingKind=null;this.residentBuildingMarker.visible=false;if(this.residentBuildingLabel)this.residentBuildingLabel.hidden=true;this.updateNeighbourhoodPins();this.dirty=true;this.schedule();}
  updateResidentBuilding(){
    if(!this.residentBuildingMarker)return;
    const target=this.residentBuildingKind&&P.residentBuilding(C,this.state,this.analysis,this.resident,this.residentBuildingKind);
    if(!target){this.residentBuildingMarker.visible=false;if(this.residentBuildingLabel)this.residentBuildingLabel.hidden=true;return null;}
    const [w,d]=target.dimensions,pick=this.pickTargets.find(p=>p.userData.cell===target.i),height=pick?.userData.visualHeight||pick?.scale.y||2;
    this.residentBuildingMarker.visible=true;this.residentBuildingMarker.position.set(target.i%mapSize-center+(w-1)/2,landY,Math.floor(target.i/mapSize)-center+(d-1)/2);
    this.buildingOutline.position.y=height/2;this.buildingOutline.scale.set(w+.14,height+.2,d+.14);this.buildingTint.scale.set(w+.14,d+.14,1);
    const colour=target.kind==='home'?'#3f75ce':'#7860bd';this.buildingOutline.material.color.set(colour);this.buildingTint.material.color.set(colour);
    this.residentBuildingMarker.userData.target=target;this.residentBuildingMarker.userData.height=height;
    if(this.residentBuildingLabel){this.residentBuildingLabel.textContent=target.label;this.residentBuildingLabel.dataset.kind=target.kind;this.residentBuildingLabel.dataset.cell=String(target.i);}
    return target;
  }
  showResidentBuilding(actor,kind='home'){
    this.selectResident(actor,false);this.residentBuildingKind=kind;const target=this.updateResidentBuilding();if(!target){this.clearResidentBuilding();return null;}
    this.focusCell(target.i);this.camera.zoom=Math.max(this.camera.zoom,kind==='home'?3.1:2.4);this.camera.updateProjectionMatrix();this.controls.update();this.updateLabels();this.dirty=true;this.schedule();return target;
  }
  selectResident(actor,following=false){
    if(!actor||following||this.resident?.from!==actor.from||this.resident?.to!==actor.to||this.resident?.id!==actor.id)this.clearResidentBuilding();
    this.resident=actor;this.followingResident=following;this.personRing.visible=!!actor&&this.life.enabled;this.personRoute.visible=!!actor&&this.life.enabled;
    if(actor){this.personRoute.geometry.dispose();this.personRoute.geometry=new THREE.BufferGeometry().setFromPoints(actor.path.map(i=>new THREE.Vector3(i%mapSize-center,.25,Math.floor(i/mapSize)-center)));this.updateResident(0);}
    this.dirty=true;this.schedule();
  }
  residentPosition(actor){
    if(!actor)return null;
    const person=this.life.people.find(p=>p.from===actor.from&&p.to===actor.to&&p.id===actor.id);
    return person?(person.current||globalThis.GreenCityLife.sampleRoutine(person,this.lifeSeconds??this.daySeconds)):null;
  }
  residentActivity(actor){const person=this.life.people.find(p=>p.from===actor?.from&&p.id===actor?.id);return person?(person.current||globalThis.GreenCityLife.routine(person,this.lifeSeconds??this.daySeconds)):null;}
  showResident(actor){const p=this.residentPosition(actor);if(!p)return;const target=new THREE.Vector3(p.x,.5,p.z);this.camera.position.add(target.clone().sub(this.controls.target));this.controls.target.copy(target);this.camera.zoom=Math.max(this.camera.zoom,2.2);this.camera.updateProjectionMatrix();this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  updateResident(dt){
    if(this.residentBuildingKind){this.personRing.visible=false;this.personRoute.visible=false;return;}
    if(!this.life.enabled){this.personRing.visible=false;this.personRoute.visible=false;return;}
    const p=this.residentPosition(this.resident);if(!p){this.personRing.visible=false;this.personRoute.visible=false;return;}
    this.personRing.visible=this.life.enabled&&p.visible!==false;this.personRoute.visible=this.life.enabled&&p.visible!==false;if(p.trip?.path&&this.residentRoutePath!==p.trip.path){this.residentRoutePath=p.trip.path;this.personRoute.geometry.dispose();this.personRoute.geometry=new THREE.BufferGeometry().setFromPoints(p.trip.path.map(i=>new THREE.Vector3(i%mapSize-center,.25,Math.floor(i/mapSize)-center)));}this.personRing.position.set(p.x,.26,p.z);
    if(this.followingResident){const target=new THREE.Vector3(p.x,.5,p.z),delta=target.sub(this.controls.target).multiplyScalar(Math.min(1,dt*6));this.camera.position.add(delta);this.controls.target.add(delta);this.controls.update();this.updateLabels();}
  }
  pickResident(event){
    if(this.mode!=='inspect'||!this.life.enabled)return null;
    const rect=this.canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,point=new THREE.Vector3();let closest=null,best=event.pointerType==='touch'?20:11;
    for(const actor of this.life.people){const p=this.residentPosition(actor);if(!p||p.visible===false)continue;point.set(p.x,.4,p.z).project(this.camera);if(Math.abs(point.z)>1)continue;const distance=Math.hypot((point.x*.5+.5)*rect.width-x,(-point.y*.5+.5)*rect.height-y);if(distance<best){best=distance;closest=actor;}}
    return closest;
  }
  batch(source,target){
    source.updateMatrixWorld(true);const byMaterial=new Map();
    source.traverse(obj=>{if(!obj.isMesh||obj.userData.skipBatch)return;let parent=obj.parent;while(parent&&parent!==source){if(parent.userData.animated)return;parent=parent.parent;}const clone=obj.geometry.clone().applyMatrix4(obj.matrixWorld);const geo=clone.index?clone.toNonIndexed():clone;if(geo!==clone)clone.dispose();if(!byMaterial.has(obj.material))byMaterial.set(obj.material,[]);byMaterial.get(obj.material).push(geo);});
    for(const[material,parts]of byMaterial){const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geo)continue;const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;target.add(mesh);}
  }
  clear(group){for(const child of [...group.children]){group.remove(child);if(child.isMesh)child.geometry.dispose();}}
  updateLand(){
    const signature=JSON.stringify([this.state.challenge,this.state.districts,this.state.reclaimed]);if(signature===this.landSignature)return;this.landSignature=signature;
    const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));let count=0;
    C.terrainFor(this.state).forEach((t,i)=>{if(t==='land'&&!C.ownsLand(this.state,i)){matrix.compose(new THREE.Vector3(i%mapSize-center,landY+.025,Math.floor(i/mapSize)-center),rotation,new THREE.Vector3(1,1,1));this.landMask.setMatrixAt(count++,matrix);}});
    this.landMask.count=count;this.landMask.instanceMatrix.needsUpdate=true;
  }
  setState(state,analysis){
    this.rebuildTerrain(state);
    if(this.state?.cells===state.cells){const changeCars=Math.floor(this.state.population/45)!==Math.floor(state.population/45);this.state=state;this.analysis=analysis;this.updateLand();if(changeCars){for(const car of this.cars)this.dynamicGroup.remove(car.g);this.makeCars();}this.syncTransit();this.syncLife();this.updateActivity();this.makeSmoke();this.updateOverlay();this.updateSelection();this.updateLabels();this.dirty=true;this.schedule();return;}
    this.state=state;this.analysis=analysis;this.updateLand();this.clear(this.staticGroup);this.dynamicGroup.clear();this.rotors=[];this.animatedWindCount=0;this.smokePoints=[];this.pickTargets=[];
    const root=new THREE.Group();
    state.cells.forEach((cell,i)=>{
      if(!cell||cell.anchor!==undefined)return;const [w,d]=C.dimensions(cell.type,cell.rotation),startSmoke=this.smokePoints.length,model=this.model(cell,i,state.cells);for(const p of this.smokePoints.slice(startSmoke))p.cell=i;model.rotation.y=C.roadTypes.has(cell.type)?0:-(cell.rotation||0)*Math.PI/2;model.position.set(i%mapSize-center+(w-1)/2,landY,Math.floor(i/mapSize)-center+(d-1)/2);root.add(model);
      // Separate pick volumes preserve a building's tile after static geometry is batched.
      // Clicking a tall roof must select that building, rather than the ground behind it.
      const h=['heavyindustry','refinery'].includes(cell.type)?2.1:cell.type==='gamestudio'?2.2:cell.type==='ailab'?2.5:['regionalhospital','officepark'].includes(cell.type)?2.5:['containerport','internationalairport'].includes(cell.type)?2:cell.type==='luxuryapartment'?3:cell.type==='apartment'?(1.8+hash(i)*.55)*(1+(cell.level-1)*.35)+.3:cell.type==='office'?1.35*(1+(cell.level-1)*.35)+.5:cell.type==='geothermal'?1.3*(1+(cell.level-1)*.35)+.3:cell.type==='wind'?3.1*(1+(cell.level-1)*.18):cell.type==='cargoport'?1.7:cell.type==='stadium'?1.4:cell.type==='airport'?1.35:cell.type==='metro'?.95:C.roadTypes.has(cell.type)?.4:C.greenTypes.has(cell.type)?1.15:cell.type==='coal'?1.9:cell.type==='factory'?1.8:1.2*(1+(cell.level-1)*.35);
      const pick=new THREE.Mesh(boxGeo(),this.mat('#ffffff'));pick.position.set(i%mapSize-center+(w-1)/2,landY+h/2,Math.floor(i/mapSize)-center+(d-1)/2);pick.scale.set(cell.type==='wind'?.4:w*.85,h,d*.85);pick.userData.cell=i;pick.userData.visualHeight=Math.max(.3,new THREE.Box3().setFromObject(model).max.y-landY);pick.scale.y=pick.userData.visualHeight;pick.position.y=landY+pick.userData.visualHeight/2;pick.updateMatrixWorld(true);this.pickTargets.push(pick);
    });
    root.updateMatrixWorld(true);
    const rotors=[];root.traverse(node=>{if(node.userData.animated)rotors.push(node);});
    for(const rotor of rotors){const world=new THREE.Vector3();rotor.getWorldPosition(world);rotor.removeFromParent();rotor.position.copy(world);this.dynamicGroup.add(rotor);this.rotors.push(rotor);}
    this.makeWindows(root);this.batch(root,this.staticGroup);this.updateActivity();this.applyDaylight(this.darkness);this.makeCars();this.syncTransit();this.syncLife();this.makeSmoke();this.updateOverlay();this.updateSelection();this.updateLabels();this.dirty=true;this.schedule();
  }
  syncLife(){if(!this.state)return;const oldPeople=this.life.people;this.life.sync(C,this.state,this.analysis,this.canvas.parentElement.clientWidth<600);if(oldPeople!==this.life.people||this.preparedTransit!==this.transitSignature){this.preparedTransit=this.transitSignature;this.preparePassengers();}this.life.update(this.time,this.reduced.matches,this.analysis.transport.roadLoads,this.lifeSeconds??this.daySeconds);this.onLife?.(this.life.counts);}
  toggleLife(){const enabled=this.life.toggle();this.onLife?.(this.life.counts);this.dirty=true;this.schedule();return enabled;}
  makeCars(){
    this.cars=[];const roads=[...this.analysis.roads];if(roads.length<2)return;
    const count=Math.min(16,Math.max(5,Math.floor(this.state.population/45)));
    for(let n=0;n<count;n++){
      const g=new THREE.Group(),isBus=false;
      this.vehicle(g,isBus?'#b5dcc6':['#e7d6b4','#afc6b9','#c7ab85','#b8c9d2'][n%4],isBus);
      let from=roads[Math.floor(hash(n+7)*roads.length)],candidates=C.neighbours(from).filter(j=>this.analysis.roads.has(j));if(!candidates.length)continue;
      const to=candidates[Math.floor(hash(n+9)*candidates.length)];g.traverse(m=>{if(m.isMesh)m.castShadow=true;});this.dynamicGroup.add(g);
      const t=hash(n);if(this.cars.some(c=>c.from===from&&c.to===to&&Math.abs(c.t-t)<.7)){this.dynamicGroup.remove(g);continue;}const p=globalThis.GreenCityLife.lanePosition(from,to,t,mapSize);if(this.cars.some(c=>Math.hypot(c.g.position.x-p.x,c.g.position.z-p.z)<(Math.cos(c.g.rotation.y-p.angle)>.65?.65:.36))){this.dynamicGroup.remove(g);continue;}g.position.set(p.x,landY+.03,p.z);g.rotation.y=p.angle;
      this.cars.push({g,from,to,previous:-1,t,speed:isBus?.35:.5+hash(n+3)*.3,seed:n});
    }
  }
  syncTransit(){
    const lines=globalThis.GreenCityLife.transitLines(C,this.state,this.analysis);
    const signature=JSON.stringify(lines.map(r=>[r.id,r.type,r.colour,r.stops,r.path]));
    if(signature===this.transitSignature)return;this.transitSignature=signature;this.transitDefinitions=lines;
    if(!this.transitLines){this.transitLines=new THREE.Group();this.transitVehiclesGroup=new THREE.Group();this.scene.add(this.transitLines,this.transitVehiclesGroup);}
    for(const v of this.routeVehicles||[])v.fare?.remove();this.clear(this.transitLines);this.transitVehiclesGroup.clear();this.routeVehicles=[];
    for(const route of lines){
      const ribbons=new THREE.Group();
      for(let n=1;n<route.path.length;n++){
        const a=route.path[n-1],b=route.path[n],x=((a%mapSize)+(b%mapSize))/2-center,z=(Math.floor(a/mapSize)+Math.floor(b/mapSize))/2-center;
        this.box(ribbons,route.colour,x,landY+.085,z,a%mapSize===b%mapSize?.07:1.05,.008,a%mapSize===b%mapSize?1.05:.07);
      }
      ribbons.updateMatrixWorld(true);this.batch(ribbons,this.transitLines);
      if(this.routeVehicles.length>=8)continue;
      const g=new THREE.Group();this.vehicle(g,route.colour,true);
      if(route.type==='tram'){const rear=new THREE.Group();this.vehicle(rear,route.colour,true);rear.position.z=-.65;g.add(rear);this.box(g,'#5f7464',0,.47,-.15,.08,.16,.08);}
      this.transitVehiclesGroup.add(g);
      const path=[...route.path,...route.path.slice(1,-1).reverse()],vehicle={id:route.id,name:route.name,stops:new Set(route.stops),baseLength:route.path.length,g,path,progress:0,type:route.type,dwell:1.1,passengers:[],capacity:route.type==='tram'?24:12};
      this.routeVehicles.push(vehicle);this.positionTransit(vehicle);
    }
  }
  trafficObstacles(){return [...(this.life?.enabled?this.life.carObstacles():[]),...(this.cars||[]).filter(c=>c.g.visible).map(c=>({id:c.seed,x:c.g.position.x,z:c.g.position.z,angle:c.g.rotation.y})),...(this.routeVehicles||[]).map(v=>({id:-100-v.id,x:v.g.position.x,z:v.g.position.z,angle:v.g.rotation.y}))];}
  preparePassengers(){if(!this.life?.people)return;globalThis.GreenCityLife.connectTransit(C,this.life.people,this.transitDefinitions||[],this.analysis.roads);for(const v of this.routeVehicles||[])v.passengers=[];}
  advanceTransit(dt){
    for(const v of this.routeVehicles||[]){if(v.dwell>0){v.dwell=Math.max(0,v.dwell-dt);this.updateFare(v,dt);continue;}
      const previous=Math.floor(v.progress),next=(v.progress+dt*(v.type==='tram'?1.6:1.35)*(1-this.analysis.transport.congestion*.003))%v.path.length;
      const segment=Math.floor(next),a=v.path[segment],b=v.path[(segment+1)%v.path.length],p=globalThis.GreenCityLife.lanePosition(a,b,next%1,mapSize);
      if(globalThis.GreenCityLife.trafficBlocked(p,p.angle,this.trafficObstacles(),.9,-100-v.id)){this.updateFare(v,dt);continue;}
      v.progress=next;if(segment!==previous&&v.stops.has(a)){v.progress=segment;v.dwell=1.3;const counts=globalThis.GreenCityLife.transitStop(this.life.people,v,a,segment<v.baseLength-1?1:-1);if(counts.boarded)this.showFare(v,counts.boarded);}
      this.positionTransit(v);this.updateFare(v,dt);
    }
  }
  showFare(vehicle,count){
    if(!vehicle.fare){vehicle.fare=document.createElement('span');vehicle.fare.className='gc-bus-fare';vehicle.fare.setAttribute('aria-hidden','true');this.canvas.parentElement.append(vehicle.fare);}
    const fare=this.analysis.policy.transitFare;vehicle.fare.textContent=fare?'◉ +'+(count*fare).toLocaleString('en-GB',{maximumFractionDigits:1})+' EP':'◉ Free ride';vehicle.fare.title=count+' boarding · '+fare+' EP each · included in monthly transit fares';vehicle.fare.hidden=false;vehicle.fareTime=1.8;
  }
  updateFare(vehicle,dt){if(!vehicle.fare)return;vehicle.fareTime-=dt;vehicle.fare.hidden=vehicle.fareTime<=0;if(vehicle.fare.hidden)return;const p=vehicle.g.position.clone().add(new THREE.Vector3(0,.9+(1.8-vehicle.fareTime)*.25,0)).project(this.camera),rect=this.canvas.getBoundingClientRect();vehicle.fare.style.left=(p.x*.5+.5)*rect.width+'px';vehicle.fare.style.top=(-p.y*.5+.5)*rect.height+'px';vehicle.fare.style.opacity=Math.min(1,vehicle.fareTime*2);}
  positionTransit(vehicle){
    const segment=Math.floor(vehicle.progress)%vehicle.path.length,t=vehicle.progress%1,a=vehicle.path[segment],b=vehicle.path[(segment+1)%vehicle.path.length];
    const p=globalThis.GreenCityLife.lanePosition(a,b,t,mapSize);vehicle.g.position.set(p.x,landY+.03,p.z);
    vehicle.g.rotation.y=Math.atan2(b%mapSize-a%mapSize,Math.floor(b/mapSize)-Math.floor(a/mapSize));
  }
  makeWindows(root){
    if(this.windowMesh){this.scene.remove(this.windowMesh);this.windowMesh.material.dispose();}
    const panes=[];root.traverse(obj=>{if(obj.isMesh&&obj.userData.windowCell!==undefined)panes.push(obj);});
    this.windowCells=panes.map(p=>p.userData.windowCell);
    this.windowMesh=new THREE.InstancedMesh(boxGeo(),new THREE.MeshBasicMaterial({color:'#ffffff'}),panes.length);
    panes.forEach((pane,n)=>{this.windowMesh.setMatrixAt(n,pane.matrixWorld);pane.removeFromParent();});
    this.windowMesh.frustumCulled=false;this.scene.add(this.windowMesh);
  }
  regionalModel(op){
    const source=new THREE.Group();
    if(op.kind==='air'){
      const fuselage=this.mesh(source,geometry('airlinerFuselage',()=>new THREE.CylinderGeometry(.067,.078,.7,10)),'#eeeede',0,.18,0,1,1,1);fuselage.rotation.x=Math.PI/2;
      this.mesh(source,sphereGeo(),'#e7ecdf',0,.18,.37,.069,.064,.12);this.box(source,'#3c626d',0,.215,.29,.09,.045,.06);
      for(const side of[-1,1]){const wing=this.box(source,'#d4dfd1',side*.21,.16,-.02,.43,.027,.16);wing.rotation.y=side*.2;const engine=this.mesh(source,geometry('airlinerEngine',()=>new THREE.CylinderGeometry(.034,.03,.14,8)),'#6c928e',side*.19,.105,.045,1,1,1);engine.rotation.x=Math.PI/2;this.box(source,'#e1e6d8',side*.1,.18,-.3,.24,.022,.09);for(const z of[-.15,-.04,.07,.18])this.box(source,'#527781',side*.073,.2,z,.008,.025,.025);for(const z of[-.17,.2])this.box(source,'#334b49',side*.045,.037,z,.02,.06,.045);}
      this.box(source,'#6a9e91',0,.26,-.29,.027,.21,.14);
    }else{
      const hull=geometry('visitingShipHull',()=>{const shape=new THREE.Shape();shape.moveTo(-.23,-.45);shape.lineTo(.23,-.45);shape.lineTo(.23,.25);shape.lineTo(0,.55);shape.lineTo(-.23,.25);shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:false});});
      const body=this.mesh(source,hull,'#446e71',0,.12,0,.88,.88,.88);body.rotation.x=Math.PI/2;
      const cargo=['cargoport','containerport'].includes(op.type);this.box(source,'#e1e5d1',0,.225,cargo?-.24:-.03,.29,.19,cargo?.25:.55);this.box(source,'#537f88',0,.26,cargo?-.102:.25,.25,.075,.015);this.box(source,'#70958b',0,.335,cargo?-.24:-.03,.32,.035,cargo?.28:.57);
      if(cargo)for(let n=0;n<4;n++)this.box(source,['#98ad88','#b7ad80','#86a5a2'][n%3],n%2?.095:-.095,.205,.05+Math.floor(n/2)*.2,.16,.16,.17);
      else for(const side of[-1,1])for(const z of[-.17,-.02,.13])this.box(source,'#4b737d',side*.148,.25,z,.012,.07,.09);
      for(const side of[-1,1])this.box(source,'#d9dfc8',side*.19,.155,.12,.015,.055,.46);
      this.box(source,'#8ca69b',0,.41,-.25,.025,.13,.025);
    }
    source.updateMatrixWorld(true);const model=new THREE.Group();this.batch(source,model);model.name=op.kind==='air'?'Visiting aircraft':'Visiting vessel';return model;
  }
  makeRegional(){
    if(!this.scene||!this.state||!this.analysis||!globalThis.GreenCityLife)return;const L=globalThis.GreenCityLife,compact=(this.canvas?.parentElement?.clientWidth||1200)<600,all=L.regionalOperations(C,this.state,this.analysis),water=new Set();let ships=0,planes=0;
    const selected=all.filter(op=>{if(!op.active)return false;if(op.kind==='air')return ++planes<=(compact?1:2);const berth=op.path.at(-1);if(water.has(berth))return false;water.add(berth);return ++ships<=(compact?3:6);});
    const signature=JSON.stringify([compact,selected.map(op=>[op.i,op.type,op.rotation,op.filled,op.customers,op.usage,op.path])]);if(signature===this.regionalSignature)return;this.regionalSignature=signature;
    const previous=new Map((this.regional||[]).map(op=>[op.i,op]));if(this.regionalGroup){const materials=new Set();this.regionalGroup.traverse(m=>{if(m.isMesh){m.geometry.dispose();if(m.isInstancedMesh){m.dispose();materials.add(m.material);}}});materials.forEach(m=>m.dispose());this.scene.remove(this.regionalGroup);}
    this.regionalGroup=new THREE.Group();this.regionalGroup.name='Regional arrivals and working crews';this.scene.add(this.regionalGroup);this.regionalWorkers=[];
    this.regional=selected.map(op=>{const g=this.regionalModel(op);this.regionalGroup.add(g);const item={...op,g,started:previous.get(op.i)?.started??(this.time||0)};if(op.kind==='sea'){const wake=new THREE.Mesh(new THREE.PlaneGeometry(.25,.6),this.mat('#e0edda',{transparent:true,opacity:.18,depthWrite:false}));wake.rotation.x=-Math.PI/2;wake.position.set(0,-.025,-.7);g.add(wake);item.wake=wake;}for(let n=0;n<Math.min(compact?2:3,Math.max(1,Math.ceil(op.filled/16)));n++)this.regionalWorkers.push({op:item,n});return item;});
    this.regionalParts={};const count=this.regionalWorkers.length;if(count){const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85});for(const name of ['body','head','helmet','leftLeg','rightLeg','crate']){const mesh=new THREE.InstancedMesh(name==='head'?new THREE.IcosahedronGeometry(1,1):new THREE.BoxGeometry(1,1,1),material,count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.name='Regional crew '+name;this.regionalParts[name]=mesh;this.regionalGroup.add(mesh);const colour=new THREE.Color(name==='body'?'#bbc17e':name==='head'?'#cda783':name==='helmet'?'#e0d5a2':name==='crate'?'#ae9469':'#3a5350');for(let n=0;n<count;n++)mesh.setColorAt(n,colour);}}
    this.animateRegional(this.time||0);
  }
  animateRegional(seconds){
    if(!this.regionalGroup)return;const L=globalThis.GreenCityLife;this.regionalGroup.visible=this.life?.enabled!==false;if(!this.regionalGroup.visible)return;const labels={},night=L.dayHour(this.lifeSeconds??0)<6||L.dayHour(this.lifeSeconds??0)>=22,dummy=new THREE.Object3D();
    for(const op of this.regional){const p=L.sampleRegional(op,seconds-op.started);op.current=p;op.g.visible=p.visible;labels[op.i]=p.label;if(p.visible){op.g.position.set(p.x,p.y+(op.kind==='sea'&&p.moving?Math.sin(seconds*1.1)*.006:0),p.z);op.g.rotation.set(p.pitch||0,p.angle,0);}if(op.wake)op.wake.visible=p.moving;}
    const place=(part,n,p,x,y,z,w,h,d,tilt=0)=>{const c=Math.cos(p.angle),s=Math.sin(p.angle);dummy.position.set(p.x+x*c+z*s,p.y+y,p.z-x*s+z*c);dummy.rotation.set(tilt,p.angle,0);dummy.scale.set(w,h,d);dummy.updateMatrix();part.setMatrixAt(n,dummy.matrix);};
    this.regionalWorkers.forEach(({op,n},index)=>{const p=L.regionalWorker(op,n,seconds-op.started),hidden=night&&n>0,step=this.reduced?.matches?0:Math.sin(seconds*3.9+n)*.28;if(hidden){for(const part of Object.values(this.regionalParts))place(part,index,p,0,-10,0,0,0,0);return;}
      place(this.regionalParts.body,index,p,0,.19,0,.095,.14,.065);place(this.regionalParts.head,index,p,0,.305,0,.05,.055,.05);place(this.regionalParts.helmet,index,p,0,.352,0,.105,.035,.09);place(this.regionalParts.leftLeg,index,p,-.026,.085,0,.035,.1,.04,step);place(this.regionalParts.rightLeg,index,p,.026,.085,0,.035,.1,.04,-step);
      const carrying=op.kind==='sea'&&['cargoport','containerport'].includes(op.type)&&op.current.phase==='docked'&&Math.sin(seconds*.4+n)>0;place(this.regionalParts.crate,index,p,0,carrying?.2:-10,.09,carrying?.1:0,carrying?.1:0,carrying?.1:0);
    });for(const part of Object.values(this.regionalParts))part.instanceMatrix.needsUpdate=true;if(this.life)this.life.regionalStatus=labels;
  }
  updateActivity(){
    const activity=new Map();for(const i of new Set(this.windowCells||[]))activity.set(i,P.buildingActivity(C,this.state,this.analysis,i));
    this.windowActivity=(this.windowCells||[]).map((i,n)=>hash(n*17+i)<(activity.get(i)?.lit||0));
    this.updateWindowColours();this.makeRegional();
  }
  updateWindowColours(){
    if(!this.windowMesh)return;
    const dark=new THREE.Color('#19343d'),warm=new THREE.Color('#efc278'),colour=new THREE.Color();
    this.windowActivity.forEach((lit,n)=>{colour.copy(dark);if(lit)colour.lerp(warm,this.darkness);this.windowMesh.setColorAt(n,colour);});
    this.windowMesh.instanceColor&&(this.windowMesh.instanceColor.needsUpdate=true);
  }
  makeSmoke(){
    if(this.smoke){this.scene.remove(this.smoke);this.smoke.geometry.dispose();this.smoke.material.dispose();this.smoke=null;}
    this.activeSmoke=(this.smokePoints||[]).flatMap(origin=>{const job=this.analysis?.workplaces.find(w=>w.i===origin.cell),rate=job?.positions?job.filled/job.positions:0;return rate>0?[{origin,rate}]:[];});
    if(this.reduced.matches||!this.activeSmoke.length)return;
    this.smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshBasicMaterial({color:'#b7b5a5',transparent:true,opacity:.25,depthWrite:false}),this.activeSmoke.length*6);this.scene.add(this.smoke);
  }
  configureBuildInput(){
    const paint=this.mode==='road'||this.mode==='build'&&this.type==='tree';
    this.controls.mouseButtons.LEFT=paint?null:THREE.MOUSE.PAN;
    this.controls.mouseButtons.MIDDLE=paint?THREE.MOUSE.PAN:THREE.MOUSE.DOLLY;
    this.controls.touches.ONE=paint?null:THREE.TOUCH.PAN;
    this.controls.touches.TWO=paint?THREE.TOUCH.DOLLY_PAN:THREE.TOUCH.DOLLY_ROTATE;
    this.canvas.style.cursor=paint?'crosshair':'';
  }
  setBuildDraft(report=null){
    this.buildDraft=report;
    const cells=report?.cells||[];this.brushFill.count=cells.length;
    const blocked=new Set(report?.blocked),existing=new Set(report?.existing),dummy=new THREE.Object3D();
    cells.forEach((i,n)=>{dummy.position.set(i%mapSize-center,.205,Math.floor(i/mapSize)-center);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();this.brushFill.setMatrixAt(n,dummy.matrix);this.brushFill.setColorAt(n,new THREE.Color(blocked.has(i)?'#d15b4c':existing.has(i)?'#a1b9b7':'#b6e176'));});
    this.brushFill.instanceMatrix.needsUpdate=true;if(this.brushFill.instanceColor)this.brushFill.instanceColor.needsUpdate=true;
    if(report?.type==='road'){this.route.geometry.dispose();this.route.geometry=new THREE.BufferGeometry().setFromPoints(cells.map(i=>new THREE.Vector3(i%mapSize-center,.23,Math.floor(i/mapSize)-center)));this.route.material.color.set(report.error?'#d15b4c':'#d6f35b');this.route.visible=true;}else this.route.visible=false;
    this.dirty=true;this.schedule();
  }
  setTool(mode,type,focus,source=null,lineStart=null,rotation=0){this.rotation=rotation;this.mode=mode;this.type=type;this.focus=focus;this.source=source;this.lineStart=lineStart;this.configureBuildInput();this.hover=null;this.updateSelection();this.updateLabels();this.dirty=true;this.schedule();}
  allowed(i){
    if(!this.state)return false;
    if(this.mode==='land')return !C.canReclaim(this.state,i,this.analysis);
    if(this.mode==='build')return !C.canPlace(this.state,this.type,i,this.analysis,this.rotation);
    if(this.mode==='demolish'||this.mode==='upgrade')return !!this.state.cells[i];
    if(this.mode==='move')return this.source===null?!!this.state.cells[i]:!C.relocate(this.state,this.source,i,this.rotation).error;
    if(this.mode==='road')return C.terrainAt(this.state,i)==='land'&&(!this.state.cells[i]||C.roadTypes.has(this.state.cells[i].type));
    return true;
  }
  updateSelection(){
    if(this.focus>=0){const i=C.anchorAt(this.state,this.focus),[w,h]=C.dimensions(this.state.cells[i]?.type,this.state.cells[i]?.rotation);this.selection.visible=true;this.selection.scale.set(w,1,h);this.selection.position.set(i%mapSize-center+(w-1)/2,.185,Math.floor(i/mapSize)-center+(h-1)/2);}else this.selection.visible=false;
    this.updateHover(this.hover??this.focus);
  }
  updateHover(i){
    if(i===null||i<0||i>=mapSize*mapSize){this.cursor.visible=false;if(this.ghost)this.ghost.visible=false;return;}
    if(this.mode==='inspect')i=C.anchorAt(this.state,i);
    const moving=this.mode==='move'&&this.source!==null,previewType=this.mode==='build'?this.type:moving?this.state.cells[this.source]?.type:this.state.cells[C.anchorAt(this.state,i)]?.type;
    const rotation=this.mode==='build'||moving?this.rotation:this.state.cells[C.anchorAt(this.state,i)]?.rotation||0;
    const [w,h]=C.dimensions(previewType,rotation);
    this.hover=i;this.cursor.visible=true;this.cursor.scale.set(w,1,h);this.cursor.position.set(i%mapSize-center+(w-1)/2,.195,Math.floor(i/mapSize)-center+(h-1)/2);
    const allowed=this.allowed(i);this.cursor.material.color.set(this.mode==='inspect'?'#fff1b6':allowed?'#ddf2ad':'#e98e71');
    if(this.ghost){this.scene.remove(this.ghost);this.ghost.traverse(m=>{if(m.isMesh&&m.material.userData.ghost)m.material.dispose();});this.ghost=null;}
    if((this.mode==='build'||moving)&&allowed&&previewType!=='solar'&&previewType!=='roof'){
      const smokeBackup=this.smokePoints;
      this.smokePoints=[];this.ghost=this.model(moving?this.state.cells[this.source]:{type:previewType,level:1,roof:null,paid:0,rotation},i,this.state.cells);this.smokePoints=smokeBackup;
      this.ghost.rotation.y=C.roadTypes.has(previewType)?0:-rotation*Math.PI/2;this.ghost.position.set(i%mapSize-center+(w-1)/2,landY,Math.floor(i/mapSize)-center+(h-1)/2);
      this.ghost.traverse(obj=>{if(obj.isMesh){obj.material=obj.material.clone();obj.material.transparent=true;obj.material.opacity=.42;obj.material.depthWrite=false;obj.material.userData.ghost=true;}});this.scene.add(this.ghost);
    }
    if(this.mode==='land'&&allowed){this.ghost=new THREE.Group();this.box(this.ghost,'#b2c39a',0,-.055,0,.997,.38,.997,{transparent:true,opacity:.62,depthWrite:false});this.ghost.position.set(i%mapSize-center,0,Math.floor(i/mapSize)-center);this.scene.add(this.ghost);}
    if(this.mode==='road'&&this.lineStart!==null){const points=(this.buildDraft?.type==='road'?this.buildDraft.cells:C.line(this.lineStart,i)).map(j=>new THREE.Vector3(j%mapSize-center,.22,Math.floor(j/mapSize)-center));this.route.geometry.dispose();this.route.geometry=new THREE.BufferGeometry().setFromPoints(points);this.route.visible=true;}else this.route.visible=false;
    this.dirty=true;
  }
  updateOverlay(){
    if(!this.state)return;this.overlayMesh.visible=this.overlay!=='city';if(!this.overlayMesh.visible)return;
    const colors=new THREE.Color();
    this.overlayMesh.userData.cells.forEach((i,n)=>{const info=C.tileInfo(this.state,i,this.analysis);if(['housing','staffing'].includes(this.overlay)){const value=P.occupancyMap(C,this.state,this.analysis,i,this.overlay);if(value===null)colors.set('#a9b5ad');else colors.setHSL(.025+value/100*.3,.65,.5);this.overlayMesh.setColorAt(n,colors);return;}if(this.overlay==='neighbourhood'&&!info.neighbourhood){colors.set('#b9c6ad');this.overlayMesh.setColorAt(n,colors);return;}const value=this.overlay==='heat'?100-info.heat:this.overlay==='transit'?info.transit:this.overlay==='water'?info.resilience:this.overlay==='noise'?100-info.noise:this.overlay==='traffic'?100-info.congestion:this.overlay==='neighbourhood'?100-(info.neighbourhood?.urgency||0):info.power;colors.setHSL(.025+value/100*.3,.5,.51);this.overlayMesh.setColorAt(n,colors);});
    this.overlayMesh.instanceColor.needsUpdate=true;
  }
  setOverlay(value){this.overlay=value;this.updateOverlay();this.updateLabels();this.dirty=true;this.schedule();}
  resize(){const rect=this.canvas.parentElement.getBoundingClientRect();if(rect.width<2||rect.height<2)return;this.renderer.setSize(rect.width,rect.height,false);const aspect=rect.width/rect.height,half=viewHalf;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;if(!this.initialFit){this.camera.zoom=Math.min(1.35,aspect*1.2);this.initialFit=true;}this.camera.updateProjectionMatrix();this.syncLife();this.dirty=true;this.updateLabels();this.schedule();}
  zoomBy(factor){this.camera.zoom=THREE.MathUtils.clamp(this.camera.zoom*factor,.55,3.7);this.camera.updateProjectionMatrix();this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  rotateBy(direction){const offset=this.camera.position.clone().sub(this.controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),direction*Math.PI/4);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  focusCell(i){const target=new THREE.Vector3(i%mapSize-center,.5,Math.floor(i/mapSize)-center);this.camera.position.add(target.clone().sub(this.controls.target));this.controls.target.copy(target);this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  resetView(){this.controls.target.set(0,.5,0);this.camera.position.set(27,31,27);const rect=this.canvas.parentElement.getBoundingClientRect();this.camera.zoom=Math.min(1,rect.width/rect.height*.98);this.camera.updateProjectionMatrix();this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  applyDaylight(darkness){
    this.darkness=darkness;this.night=darkness>=.5;this.waterMaterial.uniforms.uNight.value=darkness;
    this.scene.background.copy(new THREE.Color('#d4e4dd').lerp(new THREE.Color('#172d38'),darkness));this.scene.fog.color.copy(this.scene.background);
    this.ambient.intensity=1.55-darkness*.9;this.sun.intensity=2.7-darkness*2.25;
    this.sun.color.copy(new THREE.Color('#fff1cf').lerp(new THREE.Color('#b6d5e1'),darkness));
    for(const mat of this.materials.values())if(mat.emissive?.getHex())mat.emissiveIntensity=.08+darkness*1.72;
    this.updateWindowColours();this.labels.classList.toggle('gc-night-labels',this.night);this.dirty=true;
  }
  refreshDailyLife(){if(!this.life)return;this.life.update(this.time,true,this.analysis?.transport.roadLoads,this.lifeSeconds??this.daySeconds);const density=globalThis.GreenCityLife.trafficLevel(this.lifeSeconds??this.daySeconds);(this.cars||[]).forEach((car,n)=>car.g.visible=n<Math.max(1,Math.ceil(this.cars.length*density)));this.onLife?.(this.life.counts);}
  reportDaylight(){const time=P.daylight(this.daySeconds),key=time.hour+'-'+time.label+'-'+this.cycleEnabled+'-'+this.night+'-'+Math.floor(this.lifeSeconds??this.daySeconds);if(key===this.daylightKey)return;this.daylightKey=key;this.refreshDailyLife();this.onDaylight?.({...time,night:this.night,enabled:this.cycleEnabled});}
  setCycle(enabled){if(enabled&&this.lifeSeconds!==undefined)this.daySeconds=this.lifeSeconds;this.cycleEnabled=!!enabled;this.reportDaylight();this.schedule();return this.cycleEnabled;}
  toggleNight(){this.cycleEnabled=false;this.daySeconds=this.night?0:90;this.lifeSeconds=this.daySeconds;this.applyDaylight(this.night?0:1);this.reportDaylight();this.schedule();return this.night;}

  toggleGrid(){this.grid.visible=!this.grid.visible;this.dirty=true;this.schedule();return this.grid.visible;}
  photo(){this.renderer.render(this.scene,this.camera);return this.canvas.toDataURL('image/png');}
  pick(event){const rect=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.pickTargets,false)[0];if(hit&&!(this.mode==='build'||this.mode==='road'||this.mode==='land'||(this.mode==='move'&&this.source!==null)))return hit.object.userData.cell;if(!this.ray.ray.intersectPlane(this.plane,this.intersection))return -1;const c=Math.floor(this.intersection.x+mapSize/2),r=Math.floor(this.intersection.z+mapSize/2);return r>=0&&r<mapSize&&c>=0&&c<mapSize?r*mapSize+c:-1;}
  bindInput(){
    const pointers=new Set();let start=null,multi=false;
    const painting=()=>this.mode==='road'||this.mode==='build'&&this.type==='tree';
    const cancel=notify=>{const drawing=start?.drawing;start=null;if(drawing&&notify)this.onDraw?.({phase:'cancel'});};
    this.cancelStroke=(notify=false)=>cancel(notify);
    this.canvas.addEventListener('pointerdown',e=>{
      if(this.followingResident){this.followingResident=false;this.onFollowStop?.();}
      pointers.add(e.pointerId);if(pointers.size>1){multi=true;cancel(true);return;}
      if(e.button===0){const i=this.pick(e);start={x:e.clientX,y:e.clientY,tile:i,cells:i>=0?[i]:[],seen:new Set(i>=0?[i]:[]),id:e.pointerId,mode:this.mode,type:this.type,drawing:false,paint:painting()};}
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(pointers.size){
        if(multi||!start?.paint||e.pointerId!==start.id)return;
        if(start.mode!==this.mode||start.type!==this.type){cancel(false);return;}
        if(!start.drawing&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<7)return;
        const i=this.pick(e);if(i<0||start.tile<0)return;
        if(start.drawing&&i===start.tile)return;
        for(const j of C.line(start.tile,i))if(!start.seen.has(j)){start.seen.add(j);start.cells.push(j);}
        start.tile=i;start.drawing=true;this.onDraw?.({phase:'preview',type:this.mode==='road'?'road':'tree',cells:[...start.cells]});return;
      }
      const i=this.pick(e);if(i!==this.hover){this.updateHover(i);this.onHover?.(i);this.schedule();}
    });
    const end=e=>{
      pointers.delete(e.pointerId);const current=start,wasMulti=multi;
      if(!pointers.size){start=null;multi=false;}
      if(wasMulti||!current||e.pointerId!==current.id)return;
      if(current.drawing){const i=this.pick(e);if(i<0){this.onDraw?.({phase:'cancel'});return;}for(const j of C.line(current.tile,i))if(!current.seen.has(j)){current.seen.add(j);current.cells.push(j);}this.onDraw?.({phase:'ready',type:current.mode==='road'?'road':'tree',cells:[...current.cells]});return;}
      if(e.button===0&&Math.hypot(e.clientX-current.x,e.clientY-current.y)<7){const person=this.pickResident(e);if(person){this.onResident?.(person);return;}const i=this.pick(e);if(i>=0)this.onSelect?.(i,!(e.pointerType==='touch'&&this.mode!=='inspect'));}
    };
    this.canvas.addEventListener('pointerup',end);
    this.canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);cancel(true);if(!pointers.size)multi=false;});
    this.canvas.addEventListener('lostpointercapture',e=>{if(start?.id===e.pointerId){pointers.delete(e.pointerId);cancel(true);if(!pointers.size)multi=false;}});
    this.canvas.addEventListener('pointerleave',()=>{if(!pointers.size&&!this.buildDraft){this.hover=null;this.cursor.visible=false;if(this.ghost)this.ghost.visible=false;this.onHover?.(-1);this.dirty=true;this.schedule();}});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  updateLabels(){
    if(!this.labels)return;const rect=this.canvas.parentElement.getBoundingClientRect(),point=new THREE.Vector3();
    this.districts.forEach(([,x,y,z],n)=>{point.set(x,y,z).project(this.camera);const el=this.labels.children[n];el.style.left=(point.x*.5+.5)*rect.width+'px';el.style.top=(-point.y*.5+.5)*rect.height+'px';el.hidden=Math.abs(point.x)>1||Math.abs(point.y)>1||this.camera.zoom>2.5;});
    const target=this.updateResidentBuilding();
    if(target&&this.residentBuildingLabel){const marker=this.residentBuildingMarker;point.set(marker.position.x,landY+marker.userData.height+.35,marker.position.z).project(this.camera);this.residentBuildingLabel.style.left=(point.x*.5+.5)*rect.width+'px';this.residentBuildingLabel.style.top=(-point.y*.5+.5)*rect.height+'px';this.residentBuildingLabel.hidden=Math.abs(point.x)>1||Math.abs(point.y)>1||Math.abs(point.z)>1;}
    this.updateNeighbourhoodPins();
  }
  updateNeighbourhoodPins(){
    if(!this.pinLayer)return;
    const visible=this.showNeeds&&this.mode==='inspect'&&!this.residentBuildingMarker?.visible&&['city','neighbourhood'].includes(this.overlay)&&this.analysis;
    this.pinLayer.hidden=!visible;if(!visible)return;
    const parent=this.canvas.parentElement,rect=parent.getBoundingClientRect(),expanded=this.canvas.closest('.gc-expanded'),point=new THREE.Vector3(),limit=this.overlay==='neighbourhood'?12:6,placed=[],keep=new Set();
    const blocked=[...parent.querySelectorAll('.gc-world-top,.gc-expand-land,.gc-overlay-legend,.gc-camera-controls,.gc-world-bottom,.gc-onboarding,.gc-alert-banner')].filter(el=>!el.hidden).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({left:r.left-rect.left-4,right:r.right-rect.left+4,top:r.top-rect.top-4,bottom:r.bottom-rect.top+4}));
    const candidates=[...this.analysis.neighbourhoods].filter(h=>this.overlay==='neighbourhood'||h.needs.length||h.i===this.focus).sort((a,b)=>(b.i===this.focus)-(a.i===this.focus)||b.urgency-a.urgency||a.i-b.i);
    for(const home of candidates){
      const cell=this.state.cells[home.i],height=cell.type==='apartment'?(1.8+hash(home.i)*.55)*(1+(cell.level-1)*.35)+.55:1.2*(1+(cell.level-1)*.35)+.35;
      point.set(home.i%mapSize-center,landY+height,Math.floor(home.i/mapSize)-center).project(this.camera);
      const x=(point.x*.5+.5)*rect.width,y=(-point.y*.5+.5)*rect.height;
      if(Math.abs(point.z)>1||x<26||x>rect.width-58||y<(expanded?225:103)||y>rect.height-(expanded?200:105)||placed.some(p=>Math.abs(p.x-x)<52&&Math.abs(p.y-y)<52)||blocked.some(r=>x+22>r.left&&x-22<r.right&&y>r.top&&y-44<r.bottom))continue;
      placed.push({x,y});keep.add(home.i);
      let button=this.pinButtons.get(home.i);
      if(!button){button=document.createElement('button');button.type='button';button.dataset.gcNeighbourhood=String(home.i);this.pinButtons.set(home.i,button);this.pinLayer.append(button);}
      if(button.dataset.issue!==home.primary){button.dataset.issue=home.primary;button.innerHTML='<span>'+needIcon(home.primary)+'</span>';}
      button.className='gc-neighbourhood-pin '+(home.urgency>=70?'is-urgent':home.needs.length?'':'is-supported')+(home.i===this.focus?' is-selected':'');
      const description=C.label(home.i)+' · '+(home.needs.length?C.localNeeds[home.primary].label:'Well supported')+' · Open local resident feedback';
      button.title=description;button.setAttribute('aria-label',description);button.style.left=x+'px';button.style.top=y+'px';
      if(placed.length>=limit)break;
    }
    for(const[i,button]of this.pinButtons)if(!keep.has(i)){button.remove();this.pinButtons.delete(i);}
  }
  toggleNeighbourhoodPins(){this.showNeeds=!this.showNeeds;this.updateNeighbourhoodPins();return this.showNeeds;}
  setActive(active){this.active=active&&!document.hidden;if(!this.active){cancelAnimationFrame(this.raf);this.raf=0;}else{this.lastFrame=0;this.dirty=true;this.resize();this.schedule();}}
  schedule(){if(this.active&&!this.raf)this.raf=requestAnimationFrame(t=>this.frame(t));}
  frame(timestamp){
    this.raf=0;if(!this.active)return;
    const animate=!this.reduced.matches;
    if(timestamp-this.lastFrame<(animate?32:1000)){this.schedule();return;}
    const elapsed=Math.max(0,(timestamp-(this.lastFrame||timestamp))/1000),dt=Math.min(.07,elapsed);this.lastFrame=timestamp;
    this.lifeSeconds=((this.lifeSeconds??this.daySeconds)+Math.min(1,elapsed))%180;
    if(this.cycleEnabled){this.daySeconds=(this.daySeconds+Math.min(1,elapsed))%180;this.lifeSeconds=this.daySeconds;const phase=P.daylight(this.daySeconds);this.applyDaylight(this.reduced.matches?(phase.darkness>=.5?1:0):phase.darkness);this.reportDaylight();if(this.reduced.matches)this.life?.update(this.time,true,this.analysis?.transport.roadLoads,this.lifeSeconds??this.daySeconds);}
    if(animate){
      this.time+=dt;this.waterMaterial.uniforms.uTime.value=this.time;this.animateRegional(this.time);
      this.rotors.forEach(r=>r.rotation.z-=dt*.75);
      this.advanceTransit(dt);this.life.trafficObstacles=this.trafficObstacles();this.life.update(this.time,false,this.analysis?.transport.roadLoads,this.lifeSeconds??this.daySeconds);
      for(const [index,car] of this.cars.entries()){
        const density=globalThis.GreenCityLife.trafficLevel(this.lifeSeconds??this.daySeconds);car.g.visible=index<Math.max(1,Math.ceil(this.cars.length*density));if(!car.g.visible)continue;
        const proposed=car.t+dt*car.speed*Math.max(.22,1-this.analysis.transport.roadLoads[car.from]/150),preview=globalThis.GreenCityLife.lanePosition(car.from,car.to,Math.min(1,proposed),mapSize);if(globalThis.GreenCityLife.trafficBlocked(preview,preview.angle,this.trafficObstacles(),.68,car.seed))continue;car.t=proposed;if(car.t>=1){const choices=C.neighbours(car.to).filter(j=>this.analysis.roads.has(j)&&j!==car.from),next=choices.length?choices[Math.floor(hash(car.seed+Math.floor(this.time)*13)*choices.length)]:car.from,entry=globalThis.GreenCityLife.lanePosition(car.to,next,0,mapSize);if(globalThis.GreenCityLife.trafficBlocked(entry,entry.angle,this.trafficObstacles(),.68,car.seed)){car.t=.98;continue;}car.previous=car.from;car.from=car.to;car.to=next;car.t=0;}
        const {x,z}=globalThis.GreenCityLife.lanePosition(car.from,car.to,car.t,mapSize);
        car.g.position.set(x,landY+.03,z);car.g.rotation.y=Math.atan2(car.to%mapSize-car.from%mapSize,Math.floor(car.to/mapSize)-Math.floor(car.from/mapSize));
      }

      if(this.smoke){const dummy=new THREE.Object3D();this.activeSmoke.forEach(({origin,rate},k)=>{for(let n=0;n<6;n++){const t=(this.time*(.12+.18*rate)+n/6)%1;dummy.position.copy(origin).add(new THREE.Vector3(t*.5,.1+t*1.6,Math.sin(t*4+k)*.09));dummy.scale.setScalar((.6+t*1.5)*Math.sqrt(rate));dummy.updateMatrix();this.smoke.setMatrixAt(k*6+n,dummy.matrix);}});this.smoke.instanceMatrix.needsUpdate=true;}
    }
    if(Math.floor(this.time)!==this.lifeCountSecond){this.lifeCountSecond=Math.floor(this.time);this.onLife?.(this.life?.counts);}
    if(!this.cycleEnabled)this.reportDaylight();
    this.updateResident(dt);
    if(animate||this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}
    if(animate||this.cycleEnabled)this.schedule();
  }
}
