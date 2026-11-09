/* Procedural 3D island: local Three.js, shared geometry, batched static meshes. */
import * as THREE from './assets/vendor/three/three.module.js';
import { OrbitControls } from './assets/vendor/three/OrbitControls.js';
import { mergeGeometries } from './assets/vendor/three/BufferGeometryUtils.js';
import {needIcon} from './green-city-neighbourhood-icons.js?v=98db9558ad';
import {CityLife} from './green-city-life-world.js?v=499c79081b';

const C = globalThis.GreenCity;
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
  constructor(canvas, { onSelect, onHover, onError, onNeighbourhood, onLife }) {
    this.canvas = canvas; this.onSelect=onSelect; this.onHover=onHover; this.onError=onError;this.onNeighbourhood=onNeighbourhood;
    this.materials = new Map(); this.night=false; this.overlay='city'; this.mode='inspect'; this.type='tree'; this.focus=8*mapSize+8;
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
    this.rotors=[];this.cars=[];this.smokePoints=[];this.pickTargets=[];
    this.addWater(); this.addGround();
    this.cursor=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.51,0,-.51],[.51,0,-.51],[.51,0,.51],[-.51,0,.51]].map(v=>new THREE.Vector3(...v))),new THREE.LineBasicMaterial({color:'#fff2b8',depthTest:false,transparent:true,opacity:1}));
    this.cursor.renderOrder=20;this.cursor.position.y=.18;this.scene.add(this.cursor);
    this.selection=this.cursor.clone();this.selection.material=this.cursor.material.clone();this.selection.material.color.set('#f3c383');this.selection.position.y=.19;this.scene.add(this.selection);
    this.route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#f2c779',depthTest:false}));this.route.renderOrder=21;this.scene.add(this.route);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-landY);this.intersection=new THREE.Vector3();
    this.labels=document.createElement('div');this.labels.className='gc-world-labels';this.labels.setAttribute('aria-hidden','true');canvas.parentElement.append(this.labels);
    this.districts=[['OLD TOWN',-7.8,.6,-8.5],['THE GREEN QUARTER',0,.6,-6],['SOUTHERN EXPANSION',4,.6,5]];
    this.districts.forEach(([name])=>{const span=document.createElement('span');span.textContent=name;this.labels.append(span);});
    this.pinLayer=document.createElement('div');this.pinLayer.className='gc-neighbourhood-pins';this.pinLayer.setAttribute('aria-label','Neighbourhood feedback markers');canvas.parentElement.append(this.pinLayer);this.pinButtons=new Map();this.showNeeds=true;
    this.pinLayer.addEventListener('click',event=>{const button=event.target.closest('[data-gc-neighbourhood]');if(button)this.onNeighbourhood?.(Number(button.dataset.gcNeighbourhood));});
    this.bindInput();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.resize();
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.setActive(false);onError?.('The 3D view paused because the graphics context was lost. Your city is saved. Reload to restore the view.');});
    this.reduced.addEventListener('change',()=>{this.makeSmoke();this.life.update(this.time,true);this.dirty=true;this.schedule();});
  }
  mat(color, options={}) {
    const key=color+JSON.stringify(options);if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,...options}));return this.materials.get(key);
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
      this.box(g,color,(col-.5)*w*.48,y,d/2+.005,w*.17,.13,.012,{emissive:'#e7b76c',emissiveIntensity:.08});
      this.box(g,color,w/2+.005,y,(col-.5)*d*.48,.012,.13,d*.17,{emissive:'#e7b76c',emissiveIntensity:.08});
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
    if(type==='airport'){
      this.box(g,'#b7bfaa',0,.035,0,2.94,.06,1.94);
      this.box(g,'#637a79',0,.08,-.36,2.8,.035,.6);
      for(let n=0;n<9;n++)this.box(g,'#e9e5cb',-1.2+n*.3,.105,-.36,.14,.012,.035);
      for(const x of[-1.25,1.25])for(const z of[-.55,-.2])this.box(g,'#dfd3aa',x,.11,z,.13,.012,.035);
      this.box(g,'#dce1d0',-.4,.29,.48,1.2,.46,.58);this.box(g,'#67979a',-.4,.34,.78,1.05,.24,.025);
      this.box(g,'#e3e3cf',.53,.5,.61,.2,.93,.2);this.box(g,'#517f86',.53,1.02,.61,.38,.2,.34);this.box(g,'#e0e4d2',.53,1.15,.61,.42,.05,.38);
      const plane=new THREE.Group();this.box(plane,'#f0eddb',0,.2,0,.14,.12,.68);this.box(plane,'#dce4d5',0,.2,.04,.68,.04,.14);this.box(plane,'#7daba8',0,.3,-.22,.04,.22,.18);plane.rotation.y=Math.PI/2;plane.position.set(.7,.01,-.36);g.add(plane);
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
    const land=C.terrain.flatMap((t,i)=>t==='land'?[i]:[]);
    const ground=new THREE.InstancedMesh(new THREE.BoxGeometry(.997,.38,.997),this.mat('#ffffff'),land.length);ground.receiveShadow=true;
    const dummy=new THREE.Object3D();
    land.forEach((i,n)=>{dummy.position.set(i%mapSize-center,-.055,Math.floor(i/mapSize)-center);dummy.updateMatrix();ground.setMatrixAt(n,dummy.matrix);const coast=C.neighbours(i).some(j=>C.terrain[j]==='water');ground.setColorAt(n,new THREE.Color(coast?'#c5c5a0':hash(i)>.5?'#aebc8c':'#a7b785'));});this.scene.add(ground);
    const vertices=[];land.forEach(i=>{const x=i%mapSize-center,z=Math.floor(i/mapSize)-center;for(const[a,b]of[[[-.5,-.5],[.5,-.5]],[[.5,-.5],[.5,.5]],[[.5,.5],[-.5,.5]],[[-.5,.5],[-.5,-.5]]])vertices.push(x+a[0],.142,z+a[1],x+b[0],.142,z+b[1]);});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.grid=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#f0e6c9',transparent:true,opacity:.2}));this.scene.add(this.grid);
    this.overlayMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.96,.96),new THREE.MeshBasicMaterial({transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}),land.length);this.overlayMesh.userData.cells=land;this.overlayMesh.visible=false;
    land.forEach((i,n)=>{dummy.position.set(i%mapSize-center,.17,Math.floor(i/mapSize)-center);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();this.overlayMesh.setMatrixAt(n,dummy.matrix);this.overlayMesh.setColorAt(n,new THREE.Color('#ffffff'));});this.overlayMesh.renderOrder=2;this.scene.add(this.overlayMesh);
  }
  batch(source,target){
    source.updateMatrixWorld(true);const byMaterial=new Map();
    source.traverse(obj=>{if(!obj.isMesh||obj.userData.skipBatch)return;let parent=obj.parent;while(parent&&parent!==source){if(parent.userData.animated)return;parent=parent.parent;}const clone=obj.geometry.clone().applyMatrix4(obj.matrixWorld);const geo=clone.index?clone.toNonIndexed():clone;if(geo!==clone)clone.dispose();if(!byMaterial.has(obj.material))byMaterial.set(obj.material,[]);byMaterial.get(obj.material).push(geo);});
    for(const[material,parts]of byMaterial){const geo=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geo)continue;const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;target.add(mesh);}
  }
  clear(group){for(const child of [...group.children]){group.remove(child);if(child.isMesh)child.geometry.dispose();}}
  setState(state,analysis){
    if(this.state?.cells===state.cells){const changeCars=Math.floor(this.state.population/45)!==Math.floor(state.population/45);this.state=state;this.analysis=analysis;if(changeCars){for(const car of this.cars)this.dynamicGroup.remove(car.g);this.makeCars();}this.syncTransit();this.syncLife();this.updateOverlay();this.updateSelection();this.updateLabels();this.dirty=true;this.schedule();return;}
    this.state=state;this.analysis=analysis;this.clear(this.staticGroup);this.dynamicGroup.clear();this.rotors=[];this.animatedWindCount=0;this.smokePoints=[];this.pickTargets=[];
    const root=new THREE.Group();
    state.cells.forEach((cell,i)=>{
      if(!cell||cell.anchor!==undefined)return;const [w,d]=C.dimensions(cell.type,cell.rotation),model=this.model(cell,i,state.cells);model.rotation.y=-(cell.rotation||0)*Math.PI/2;model.position.set(i%mapSize-center+(w-1)/2,landY,Math.floor(i/mapSize)-center+(d-1)/2);root.add(model);
      // Separate pick volumes preserve a building's tile after static geometry is batched.
      // Clicking a tall roof must select that building, rather than the ground behind it.
      const h=cell.type==='apartment'?(1.8+hash(i)*.55)*(1+(cell.level-1)*.35)+.3:cell.type==='office'?1.35*(1+(cell.level-1)*.35)+.5:cell.type==='geothermal'?1.3*(1+(cell.level-1)*.35)+.3:cell.type==='wind'?3.1*(1+(cell.level-1)*.18):cell.type==='cargoport'?1.7:cell.type==='stadium'?1.4:cell.type==='airport'?1.35:cell.type==='metro'?.95:C.roadTypes.has(cell.type)?.4:C.greenTypes.has(cell.type)?1.15:cell.type==='coal'?1.9:cell.type==='factory'?1.8:1.2*(1+(cell.level-1)*.35);
      const pick=new THREE.Mesh(boxGeo(),this.mat('#ffffff'));pick.position.set(i%mapSize-center+(w-1)/2,landY+h/2,Math.floor(i/mapSize)-center+(d-1)/2);pick.scale.set(cell.type==='wind'?.4:w*.85,h,d*.85);pick.userData.cell=i;pick.updateMatrixWorld(true);this.pickTargets.push(pick);
    });
    root.updateMatrixWorld(true);
    const rotors=[];root.traverse(node=>{if(node.userData.animated)rotors.push(node);});
    for(const rotor of rotors){const world=new THREE.Vector3();rotor.getWorldPosition(world);rotor.removeFromParent();rotor.position.copy(world);this.dynamicGroup.add(rotor);this.rotors.push(rotor);}
    this.batch(root,this.staticGroup);this.makeCars();this.syncTransit();this.syncLife();this.makeSmoke();this.updateOverlay();this.updateSelection();this.updateLabels();this.dirty=true;this.schedule();
  }
  syncLife(){if(!this.state)return;this.life.sync(C,this.state,this.analysis,this.canvas.parentElement.clientWidth<600);this.onLife?.(this.life.counts);}
  toggleLife(){const enabled=this.life.toggle();this.onLife?.(this.life.counts);this.dirty=true;this.schedule();return enabled;}
  makeCars(){
    this.cars=[];const roads=[...this.analysis.roads];if(roads.length<2)return;
    const count=Math.min(16,Math.max(5,Math.floor(this.state.population/45)));
    for(let n=0;n<count;n++){
      const g=new THREE.Group(),isBus=n===0&&((this.analysis.counts.bus||0)+(this.analysis.counts.tram||0)>0)&&!this.analysis.transport.routes.some(r=>r.active);
      this.vehicle(g,isBus?'#b5dcc6':['#e7d6b4','#afc6b9','#c7ab85','#b8c9d2'][n%4],isBus);
      let from=roads[Math.floor(hash(n+7)*roads.length)],candidates=C.neighbours(from).filter(j=>this.analysis.roads.has(j));if(!candidates.length)continue;
      const to=candidates[Math.floor(hash(n+9)*candidates.length)];g.traverse(m=>{if(m.isMesh)m.castShadow=true;});this.dynamicGroup.add(g);
      const t=hash(n);g.position.set(THREE.MathUtils.lerp(from%mapSize,to%mapSize,t)-center,landY+.03,THREE.MathUtils.lerp(Math.floor(from/mapSize),Math.floor(to/mapSize),t)-center);g.rotation.y=Math.atan2(to%mapSize-from%mapSize,Math.floor(to/mapSize)-Math.floor(from/mapSize));
      this.cars.push({g,from,to,previous:-1,t,speed:isBus?.35:.5+hash(n+3)*.3,seed:n});
    }
  }
  syncTransit(){
    const lines=this.analysis.transport.routes.filter(r=>r.active);
    const signature=JSON.stringify(lines.map(r=>[r.id,r.type,r.colour,r.path]));
    if(signature===this.transitSignature)return;this.transitSignature=signature;
    if(!this.transitLines){this.transitLines=new THREE.Group();this.transitVehiclesGroup=new THREE.Group();this.scene.add(this.transitLines,this.transitVehiclesGroup);}
    this.clear(this.transitLines);this.transitVehiclesGroup.clear();this.routeVehicles=[];
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
      const path=[...route.path,...route.path.slice(1,-1).reverse()],vehicle={g,path,progress:hash(route.id)*path.length,type:route.type};
      this.routeVehicles.push(vehicle);this.positionTransit(vehicle);
    }
  }
  positionTransit(vehicle){
    const segment=Math.floor(vehicle.progress)%vehicle.path.length,t=vehicle.progress%1,a=vehicle.path[segment],b=vehicle.path[(segment+1)%vehicle.path.length];
    vehicle.g.position.set(THREE.MathUtils.lerp(a%mapSize,b%mapSize,t)-center,landY+.03,THREE.MathUtils.lerp(Math.floor(a/mapSize),Math.floor(b/mapSize),t)-center);
    vehicle.g.rotation.y=Math.atan2(b%mapSize-a%mapSize,Math.floor(b/mapSize)-Math.floor(a/mapSize));
  }
  makeSmoke(){
    if(this.smoke){this.scene.remove(this.smoke);this.smoke.geometry.dispose();this.smoke.material.dispose();this.smoke=null;}
    if(!this.analysis||this.reduced.matches||!this.smokePoints.length||this.analysis.pollution<45)return;
    this.smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshBasicMaterial({color:'#b7b5a5',transparent:true,opacity:.25,depthWrite:false}),this.smokePoints.length*6);this.scene.add(this.smoke);
  }
  setTool(mode,type,focus,source=null,lineStart=null,rotation=0){this.rotation=rotation;this.mode=mode;this.type=type;this.focus=focus;this.source=source;this.lineStart=lineStart;this.hover=null;this.updateSelection();this.updateLabels();this.dirty=true;this.schedule();}
  allowed(i){
    if(!this.state)return false;
    if(this.mode==='build')return !C.canPlace(this.state,this.type,i,this.analysis,this.rotation);
    if(this.mode==='demolish'||this.mode==='upgrade')return !!this.state.cells[i];
    if(this.mode==='move')return this.source===null?!!this.state.cells[i]:!C.relocate(this.state,this.source,i,this.rotation).error;
    if(this.mode==='road')return C.terrain[i]==='land'&&(!this.state.cells[i]||C.roadTypes.has(this.state.cells[i].type));
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
      this.smokePoints=[];this.ghost=this.model(moving?this.state.cells[this.source]:{type:previewType,level:1,roof:null,paid:0},i,this.state.cells);this.smokePoints=smokeBackup;
      this.ghost.rotation.y=-rotation*Math.PI/2;this.ghost.position.set(i%mapSize-center+(w-1)/2,landY,Math.floor(i/mapSize)-center+(h-1)/2);
      this.ghost.traverse(obj=>{if(obj.isMesh){obj.material=obj.material.clone();obj.material.transparent=true;obj.material.opacity=.42;obj.material.depthWrite=false;obj.material.userData.ghost=true;}});this.scene.add(this.ghost);
    }
    if(this.mode==='road'&&this.lineStart!==null){const points=C.line(this.lineStart,i).map(j=>new THREE.Vector3(j%mapSize-center,.22,Math.floor(j/mapSize)-center));this.route.geometry.dispose();this.route.geometry=new THREE.BufferGeometry().setFromPoints(points);this.route.visible=true;}else this.route.visible=false;
    this.dirty=true;
  }
  updateOverlay(){
    if(!this.state)return;this.overlayMesh.visible=this.overlay!=='city';if(!this.overlayMesh.visible)return;
    const colors=new THREE.Color();
    this.overlayMesh.userData.cells.forEach((i,n)=>{const info=C.tileInfo(this.state,i,this.analysis);if(this.overlay==='neighbourhood'&&!info.neighbourhood){colors.set('#b9c6ad');this.overlayMesh.setColorAt(n,colors);return;}const value=this.overlay==='heat'?100-info.heat:this.overlay==='transit'?info.transit:this.overlay==='water'?info.resilience:this.overlay==='noise'?100-info.noise:this.overlay==='traffic'?100-info.congestion:this.overlay==='neighbourhood'?100-(info.neighbourhood?.urgency||0):info.power;colors.setHSL(.025+value/100*.3,.5,.51);this.overlayMesh.setColorAt(n,colors);});
    this.overlayMesh.instanceColor.needsUpdate=true;
  }
  setOverlay(value){this.overlay=value;this.updateOverlay();this.updateLabels();this.dirty=true;this.schedule();}
  resize(){const rect=this.canvas.parentElement.getBoundingClientRect();if(rect.width<2||rect.height<2)return;this.renderer.setSize(rect.width,rect.height,false);const aspect=rect.width/rect.height,half=viewHalf;this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;if(!this.initialFit){this.camera.zoom=Math.min(1.35,aspect*1.2);this.initialFit=true;}this.camera.updateProjectionMatrix();this.syncLife();this.dirty=true;this.updateLabels();this.schedule();}
  zoomBy(factor){this.camera.zoom=THREE.MathUtils.clamp(this.camera.zoom*factor,.55,3.7);this.camera.updateProjectionMatrix();this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  rotateBy(direction){const offset=this.camera.position.clone().sub(this.controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),direction*Math.PI/4);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  focusCell(i){const target=new THREE.Vector3(i%mapSize-center,.5,Math.floor(i/mapSize)-center);this.camera.position.add(target.clone().sub(this.controls.target));this.controls.target.copy(target);this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  resetView(){this.controls.target.set(0,.5,0);this.camera.position.set(27,31,27);const rect=this.canvas.parentElement.getBoundingClientRect();this.camera.zoom=Math.min(1,rect.width/rect.height*.98);this.camera.updateProjectionMatrix();this.controls.update();this.updateLabels();this.dirty=true;this.schedule();}
  toggleNight(){this.night=!this.night;this.waterMaterial.uniforms.uNight.value=this.night?1:0;this.scene.background.set(this.night?'#172d38':'#d4e4dd');this.scene.fog.color.copy(this.scene.background);this.ambient.intensity=this.night?.65:1.55;this.sun.intensity=this.night?.45:2.7;this.sun.color.set(this.night?'#b6d5e1':'#fff1cf');for(const mat of this.materials.values())if(mat.emissive?.getHex())mat.emissiveIntensity=this.night?1.8:.08;this.labels.classList.toggle('gc-night-labels',this.night);this.dirty=true;this.schedule();return this.night;}
  toggleGrid(){this.grid.visible=!this.grid.visible;this.dirty=true;this.schedule();return this.grid.visible;}
  photo(){this.renderer.render(this.scene,this.camera);return this.canvas.toDataURL('image/png');}
  pick(event){const rect=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.pickTargets,false)[0];if(hit&&!(this.mode==='build'||this.mode==='road'||(this.mode==='move'&&this.source!==null)))return hit.object.userData.cell;if(!this.ray.ray.intersectPlane(this.plane,this.intersection))return -1;const c=Math.floor(this.intersection.x+mapSize/2),r=Math.floor(this.intersection.z+mapSize/2);return r>=0&&r<mapSize&&c>=0&&c<mapSize?r*mapSize+c:-1;}
  bindInput(){
    const pointers=new Set();let start=null,multi=false;
    this.canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size>1)multi=true;if(e.button===0)start={x:e.clientX,y:e.clientY};});
    this.canvas.addEventListener('pointermove',e=>{if(pointers.size)return;const i=this.pick(e);if(i!==this.hover){this.updateHover(i);this.onHover?.(i);this.schedule();}});
    const end=e=>{pointers.delete(e.pointerId);const click=!multi&&start&&e.button===0&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<7;if(!pointers.size){start=null;multi=false;}if(click){const i=this.pick(e);if(i>=0)this.onSelect?.(i);}};
    this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);start=null;if(!pointers.size)multi=false;});
    this.canvas.addEventListener('pointerleave',()=>{if(!pointers.size){this.hover=null;this.cursor.visible=false;if(this.ghost)this.ghost.visible=false;this.onHover?.(-1);this.dirty=true;this.schedule();}});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  updateLabels(){
    if(!this.labels)return;const rect=this.canvas.parentElement.getBoundingClientRect(),point=new THREE.Vector3();
    this.districts.forEach(([,x,y,z],n)=>{point.set(x,y,z).project(this.camera);const el=this.labels.children[n];el.style.left=(point.x*.5+.5)*rect.width+'px';el.style.top=(-point.y*.5+.5)*rect.height+'px';el.hidden=Math.abs(point.x)>1||Math.abs(point.y)>1||this.camera.zoom>2.5;});
    this.updateNeighbourhoodPins();
  }
  updateNeighbourhoodPins(){
    if(!this.pinLayer)return;
    const visible=this.showNeeds&&this.mode==='inspect'&&['city','neighbourhood'].includes(this.overlay)&&this.analysis;
    this.pinLayer.hidden=!visible;if(!visible)return;
    const parent=this.canvas.parentElement,rect=parent.getBoundingClientRect(),expanded=this.canvas.closest('.gc-expanded'),point=new THREE.Vector3(),limit=this.overlay==='neighbourhood'?12:6,placed=[],keep=new Set();
    const blocked=[...parent.querySelectorAll('.gc-world-top,.gc-overlay-legend,.gc-camera-controls,.gc-world-bottom,.gc-onboarding,.gc-alert-banner')].filter(el=>!el.hidden).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({left:r.left-rect.left-4,right:r.right-rect.left+4,top:r.top-rect.top-4,bottom:r.bottom-rect.top+4}));
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
    if(timestamp-this.lastFrame<32){this.schedule();return;}
    const dt=Math.min(.07,(timestamp-(this.lastFrame||timestamp))/1000);this.lastFrame=timestamp;
    if(animate){
      this.time+=dt;this.waterMaterial.uniforms.uTime.value=this.time;
      this.rotors.forEach(r=>r.rotation.z-=dt*.75);
      this.life.update(this.time,false,this.analysis?.transport.roadLoads);
      for(const car of this.cars){
        car.t+=dt*car.speed*Math.max(.22,1-this.analysis.transport.roadLoads[car.from]/150);if(car.t>=1){car.previous=car.from;car.from=car.to;const choices=C.neighbours(car.from).filter(j=>this.analysis.roads.has(j)&&j!==car.previous);car.to=choices.length?choices[Math.floor(hash(car.seed+Math.floor(this.time)*13)*choices.length)]:car.previous;car.t=0;}
        const x=THREE.MathUtils.lerp(car.from%mapSize,car.to%mapSize,car.t)-center,z=THREE.MathUtils.lerp(Math.floor(car.from/mapSize),Math.floor(car.to/mapSize),car.t)-center;
        car.g.position.set(x,landY+.03,z);car.g.rotation.y=Math.atan2(car.to%mapSize-car.from%mapSize,Math.floor(car.to/mapSize)-Math.floor(car.from/mapSize));
      }
      for(const vehicle of this.routeVehicles||[]){vehicle.progress=(vehicle.progress+dt*(vehicle.type==='tram'?.85:.65)*(1-this.analysis.transport.congestion*.004))%vehicle.path.length;this.positionTransit(vehicle);}
      if(this.smoke){const dummy=new THREE.Object3D();this.smokePoints.forEach((origin,k)=>{for(let n=0;n<6;n++){const t=(this.time*.3+n/6)%1;dummy.position.copy(origin).add(new THREE.Vector3(t*.5,.1+t*1.6,Math.sin(t*4+k)*.09));dummy.scale.setScalar(.6+t*1.5);dummy.updateMatrix();this.smoke.setMatrixAt(k*6+n,dummy.matrix);}});this.smoke.instanceMatrix.needsUpdate=true;}
    }
    if(animate||this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}
    if(animate)this.schedule();
  }
}
