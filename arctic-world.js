import * as THREE from './assets/vendor/three/three.module.js';
import {iceMaterial,makeFloe,iceberg,fragments,loadSurfaceTextures,applyTextures} from './arctic-surfaces.js?v=79ecd9ffcc';
import {ArcticWildlife} from './arctic-wildlife.js?v=b5e0ec45ef';
const skyVertex='varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const skyFragment=[
'varying vec3 vP;uniform float underwater;uniform sampler2D sky;uniform float hasSky;',
'const float PI=3.14159265359;',
'void main(){vec3 d=normalize(vP);vec2 uv=vec2(atan(d.z,d.x)/(2.*PI)+.5,asin(clamp(d.y,-1.,1.))/PI+.5);',
'vec3 colour=mix(vec3(.82,.88,.9),vec3(.43,.62,.74),smoothstep(-.03,.85,d.y));',
'vec3 photo=texture2D(sky,uv).rgb;colour=mix(colour,mix(colour,photo,.75),hasSky);',
'vec3 sea=mix(vec3(.025,.065,.09),vec3(.1,.19,.25),smoothstep(-.5,.7,d.y));',
'gl_FragColor=vec4(mix(colour,sea,underwater),1.);',
'#include <tonemapping_fragment>',
'#include <colorspace_fragment>',
'}'
].join('\n');
const waterVertex=[
'varying vec3 vWorld;uniform float progress;',
'void main(){vec3 p=position;p.z+=.035*sin(p.x*.8+progress*2.)+.018*cos(p.y*.61-progress);',
'vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}'
].join('\n');
const waterFragment=[
'varying vec3 vWorld;uniform vec3 eye;uniform float progress;uniform sampler2D sky;uniform float hasSky;',
'const float PI=3.14159265359;',
'void main(){vec2 p=vWorld.xz;float phase=progress*2.;',
'vec2 g=vec2(0.);',
'g+=vec2(.8,.23)*cos(dot(p,vec2(.8,.23))+phase)*.045;',
'g+=vec2(-.51,1.15)*cos(dot(p,vec2(-.51,1.15))-phase*.8)*.027;',
'g+=vec2(3.2,1.8)*cos(dot(p,vec2(3.2,1.8))+phase*.7)*.008;',
'g+=vec2(-8.1,4.7)*cos(dot(p,vec2(-8.1,4.7))+phase)*.0025;',
'vec3 n=normalize(vec3(-g.x,1.,-g.y));vec3 v=normalize(eye-vWorld);',
'float fresnel=.025+.92*pow(1.-abs(dot(v,n)),4.5);vec3 r=reflect(-v,n);',
'vec2 uv=vec2(atan(r.z,r.x)/(2.*PI)+.5,asin(clamp(r.y,-1.,1.))/PI+.5);',
'vec3 reflected=mix(vec3(.44,.61,.68),texture2D(sky,uv).rgb,hasSky*.85);',
'vec3 colour=mix(vec3(.045,.085,.11),reflected,fresnel);',
'vec3 halfLight=normalize(v+normalize(vec3(-.65,.5,.32)));',
'float spec=pow(max(dot(n,halfLight),0.),200.);colour+=vec3(.88,.91,.82)*spec*.3;',
'float fog=1.-exp(-length(eye.xz-p)*.0027);colour=mix(colour,vec3(.57,.7,.75),fog);',
'if(eye.y<0.)colour=mix(vec3(.07,.14,.19),colour,.35);',
'gl_FragColor=vec4(colour,eye.y<0.?.72:.84);',
'#include <tonemapping_fragment>',
'#include <colorspace_fragment>',
'}'
].join('\n');

export class ArcticWorld{
  constructor(canvas,mapData,year){
    this.canvas=canvas;this.disposed=false;this.low=innerWidth<701;this.textures={};
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default',preserveDrawingBuffer:false});
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.94;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c4d8e2');this.scene.fog=new THREE.FogExp2('#b6cdd5',.0025);
    this.camera=new THREE.PerspectiveCamera(46,1,.08,1800);
    this.scene.add(new THREE.HemisphereLight('#dcecf5','#1d495b',.85));
    const sun=new THREE.DirectionalLight('#fff4e0',2.3);this.sun=sun;sun.position.set(-50,28,25);sun.target.position.set(0,0,-8);this.scene.add(sun,sun.target);
    sun.castShadow=true;sun.shadow.mapSize.set(this.low?1024:2048,this.low?1024:2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:170});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
    const empty=new THREE.DataTexture(new Uint8Array([125,165,180,255]),1,1);empty.needsUpdate=true;this.emptyTexture=empty;
    this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{underwater:{value:0},sky:{value:empty},hasSky:{value:0}},vertexShader:skyVertex,fragmentShader:skyFragment});
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(850,48,24),this.skyMaterial));
    this.closeScene=new THREE.Group();this.scene.add(this.closeScene);
    this.iceMaterial=iceMaterial();this.floes=[makeFloe(0,this.iceMaterial,this.low),makeFloe(1,this.iceMaterial,this.low)];this.floes.forEach(f=>this.closeScene.add(f));
    this.wildlife=new ArcticWildlife(this.floes,this.low);
    this.fragments=fragments();this.closeScene.add(this.fragments);this.landmark=iceberg();this.closeScene.add(this.landmark);
    this.waterMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{eye:{value:new THREE.Vector3()},progress:{value:0},sky:{value:empty},hasSky:{value:0}},vertexShader:waterVertex,fragmentShader:waterFragment});
    const ocean=new THREE.PlaneGeometry(1400,1400,this.low?100:160,this.low?100:160),points=ocean.attributes.position;
    for(let i=0;i<points.count;i++)for(const axis of ['x','y']){const value=axis==='x'?points.getX(i):points.getY(i),detail=Math.sign(value)*Math.pow(Math.abs(value)/700,2.4)*700;axis==='x'?points.setX(i,detail):points.setY(i,detail);}
    this.water=new THREE.Mesh(ocean,this.waterMaterial);this.water.rotation.x=-Math.PI/2;this.scene.add(this.water);
    this.mapCanvas=document.createElement('canvas');this.mapCanvas.width=this.mapCanvas.height=this.low?1024:2048;
    this.mapTexture=new THREE.CanvasTexture(this.mapCanvas);this.mapTexture.colorSpace=THREE.SRGBColorSpace;
    // A geographic overlay must never be clipped by the depth of the illustrative floes or water.
    this.mapMaterial=new THREE.MeshBasicMaterial({map:this.mapTexture,transparent:true,opacity:0,depthTest:false,depthWrite:false,fog:false,toneMapped:false});
    this.mapPlane=new THREE.Mesh(new THREE.PlaneGeometry(260,260),this.mapMaterial);this.mapPlane.rotation.x=-Math.PI/2;this.mapPlane.position.y=.1;this.mapPlane.renderOrder=10;this.scene.add(this.mapPlane);
    this.mapData=mapData;this.setYear(year);
    this.ready=loadSurfaceTextures(this.low).then(textures=>{
      this.textures=textures;if(this.disposed){Object.values(textures).forEach(t=>t.dispose());return;}
      applyTextures(this.iceMaterial,textures);
      this.wildlife.applyTextures(textures);
      this.landmark.material.map=textures['snow-color']||null;this.landmark.material.normalMap=textures['snow-normal']||null;this.landmark.material.normalScale=new THREE.Vector2(.45,.45);this.landmark.material.needsUpdate=true;
      if(textures.sky){
        for(const material of [this.skyMaterial,this.waterMaterial]){material.uniforms.sky.value=textures.sky;material.uniforms.hasSky.value=1;}
        const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromEquirectangular(textures.sky);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.55;pmrem.dispose();
      }
    });
  }
  setYear(year){
    if(this.year===year)return;this.year=year;
    const ctx=this.mapCanvas.getContext('2d'),size=this.mapCanvas.width,scale=size/1024;
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#173c48';ctx.fillRect(0,0,size,size);
    const path=rings=>{ctx.beginPath();for(const ring of rings||[]){ring.forEach(([x,y],i)=>{const px=size/2+x/8000000*size,py=size/2-y/8000000*size;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();}};
    path(this.mapData.coast);ctx.fillStyle='#70837c';ctx.fill('evenodd');ctx.strokeStyle='#a4b4aa';ctx.lineWidth=.6*scale;ctx.stroke();
    ctx.strokeStyle='#aec6c729';ctx.lineWidth=scale;for(const radius of [.125,.25,.375]){ctx.beginPath();ctx.arc(size/2,size/2,size*radius,0,Math.PI*2);ctx.stroke();}
    path(this.mapData.years[String(year)]);ctx.fillStyle='#edf2e9';ctx.fill('evenodd');ctx.strokeStyle='#c9e0e1';ctx.lineWidth=.5*scale;ctx.stroke();
    ctx.globalCompositeOperation='destination-in';const gradient=ctx.createRadialGradient(size/2,size/2,size*.42,size/2,size/2,size*.499);gradient.addColorStop(0,'#fff');gradient.addColorStop(1,'#fff0');ctx.fillStyle=gradient;ctx.fillRect(0,0,size,size);ctx.globalCompositeOperation='source-over';
    this.mapTexture.needsUpdate=true;
  }
  resize(width,height){
    const ratio=Math.min(devicePixelRatio||1,this.low?1.5:2,Math.sqrt((this.low?1800000:8500000)/(width*height)));
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  }
  render(frame){
    if(this.disposed)return;
    this.camera.position.fromArray(frame.camera);this.camera.fov=frame.fov;this.camera.lookAt(...frame.target);this.camera.updateProjectionMatrix();
    this.closeScene.visible=frame.map<.3;
    this.wildlife.update(frame);this.renderer.shadowMap.needsUpdate=this.closeScene.visible;
    this.fragments.material.opacity=1-frame.drift;
    this.floes.forEach((f,i)=>{const direction=i===0?-1:1;f.position.set(direction*(frame.gap/2+frame.drift*85),frame.drift*-.15,frame.drift*22);f.rotation.y=direction*frame.drift*.28;});
    this.mapPlane.visible=frame.map>.001;this.mapMaterial.opacity=globalThis.ArcticModel.ease(frame.map/.3);
    this.waterMaterial.uniforms.eye.value.copy(this.camera.position);this.waterMaterial.uniforms.progress.value=frame.progress;
    this.skyMaterial.uniforms.underwater.value=frame.underwater;
    this.scene.fog.color.set(frame.underwater>.15?'#294451':'#b6cdd5');this.scene.fog.density=.0025+frame.underwater*.012;
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){
    this.disposed=true;this.scene.traverse(object=>{object.geometry?.dispose();if(object.material){for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();}});
    this.sun.shadow.map?.dispose();this.sun.shadow.mapPass?.dispose();this.wildlife.dispose();Object.values(this.textures).forEach(t=>t.dispose());this.emptyTexture.dispose();this.environment?.dispose();this.mapTexture.dispose();this.renderer.dispose();
  }
}

