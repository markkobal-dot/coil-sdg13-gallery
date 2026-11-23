import * as THREE from './assets/vendor/three/three.module.js';
import {iceMaterial,makeFloe,iceberg,fragments,loadSurfaceTextures,applyTextures} from './arctic-surfaces.js?v=6eda190933';
import {ArcticWildlife} from './arctic-wildlife.js?v=a16811df99';
const skyVertex='varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const skyFragment=[
'varying vec3 vP;uniform float underwater;uniform sampler2D sky;uniform float hasSky;',
'const float PI=3.14159265359;',
'void main(){vec3 d=normalize(vP);vec2 uv=vec2(atan(d.z,d.x)/(2.*PI)+.5,asin(clamp(d.y,-1.,1.))/PI+.5);',
'vec3 horizon=vec3(.32,.64,.92),zenith=vec3(.012,.095,.34);',
'vec3 colour=mix(horizon,zenith,pow(max(d.y,0.),.32));',
'vec3 photo=texture2D(sky,uv).rgb;float cloud=clamp((dot(photo,vec3(.21,.72,.07))-.55)*1.8,0.,1.);colour=mix(colour,vec3(.7,.85,.96),cloud*hasSky*.12);',
'float sun=max(dot(d,normalize(vec3(-30.,38.,-35.))),0.);colour+=vec3(1.,.88,.65)*(pow(sun,380.)*.7+pow(sun,18.)*.06);',
'vec3 sea=mix(vec3(.004,.028,.058),vec3(.015,.19,.27),smoothstep(-.5,.85,d.y));',
// Rays below the horizon still see the ocean as the camera reaches the surface.
// Camera depth alone exposed the sky's pale lower hemisphere between the floes.
'float oceanView=1.-smoothstep(-.015,.015,d.y);',
'gl_FragColor=vec4(mix(colour,sea,max(underwater,oceanView)),1.);',
'#include <tonemapping_fragment>',
'#include <colorspace_fragment>',
'gl_FragColor.rgb+=(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5)/255.;',
'}'
].join('\n');
const waterVertex=[
'varying vec3 vWorld;varying vec4 vReflection;uniform mat4 reflectionMatrix;uniform float progress;',
'void main(){vec3 p=position;p.z+=.035*sin(p.x*.8+progress*2.)+.018*cos(p.y*.61-progress);',
'vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;vReflection=reflectionMatrix*world;gl_Position=projectionMatrix*viewMatrix*world;}'
].join('\n');
const waterFragment=[
'varying vec3 vWorld;varying vec4 vReflection;uniform vec3 eye;uniform float progress;uniform sampler2D sky;uniform float hasSky;uniform sampler2D reflection;uniform float hasReflection;uniform float gap;uniform float drift;',
'const float PI=3.14159265359;',
'vec2 filteredWave(vec2 p,vec2 direction,float amplitude,float phase){float angle=dot(p,direction)+phase;float footprint=fwidth(angle);return direction*cos(angle)*amplitude*exp(-.5*footprint*footprint);}',
'void main(){vec2 p=vWorld.xz;float phase=progress*2.;',
'vec2 g=vec2(0.);',
'g+=filteredWave(p,vec2(.8,.23),.033,phase);',
'g+=filteredWave(p,vec2(-.51,1.15),.019,-phase*.8);',
'g+=filteredWave(p,vec2(3.2,1.8),.0045,phase*.7);',
'g+=filteredWave(p,vec2(-8.1,4.7),.0012,phase);',
'vec3 n=normalize(vec3(-g.x,1.,-g.y));vec3 v=normalize(eye-vWorld);',
'float fresnel=.025+.92*pow(1.-abs(dot(v,n)),4.5);vec3 r=reflect(-v,n);',
'vec2 uv=vec2(atan(r.z,r.x)/(2.*PI)+.5,asin(clamp(r.y,-1.,1.))/PI+.5);',
'vec3 reflected=mix(vec3(.29,.53,.71),texture2D(sky,uv).rgb*vec3(.8,1.,1.18),hasSky*.35);',
'vec2 reflectionUV=vReflection.xy/vReflection.w+g*.012;vec3 sceneReflection=texture2D(reflection,clamp(reflectionUV,.002,.998)).rgb;',
'vec2 border=smoothstep(vec2(0.),vec2(.04),reflectionUV)*(1.-smoothstep(vec2(.96),vec2(1.),reflectionUV));float valid=border.x*border.y;reflected=mix(reflected,sceneReflection,hasReflection*valid);',
'float seam=.8*sin(p.y*.37)+.35*sin(p.y*.92)+.14*sin(p.y*2.43);float edge=abs(abs(p.x-seam)-gap*.5);',
'float shallows=exp(-edge*.7)*(1.-drift)*(1.-smoothstep(12.,22.,p.y))*smoothstep(-48.,-40.,p.y);',
'vec3 colour=mix(mix(vec3(.006,.043,.075),vec3(.018,.22,.28),shallows),reflected,fresnel);',
'vec3 halfLight=normalize(v+normalize(vec3(-30.,38.,-35.)));',
'float spec=pow(max(dot(n,halfLight),0.),260.);colour+=vec3(1.,.92,.76)*spec*1.1;',
'float fog=1.-exp(-length(eye.xz-p)*.0018);colour=mix(colour,vec3(.49,.68,.79),fog);',
'float window=smoothstep(.63,.78,abs(dot(v,n)));float ripple=.5+.5*sin(dot(p,vec2(1.9,.7))+sin(p.y*3.1)*.7+phase);',
'vec3 underside=mix(vec3(.006,.045,.075),reflected*.65+vec3(.035,.12,.16),window)*(.87+.2*ripple);',
'colour=mix(underside,colour,smoothstep(-.06,.06,eye.y-vWorld.y));',
'gl_FragColor=vec4(colour,1.);',
'#include <tonemapping_fragment>',
'#include <colorspace_fragment>',
'gl_FragColor.rgb+=(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5)/255.;',
'}'
].join('\n');

// A separately framed polar view dissolves over the rising camera. The data is
// never enlarged into a low-altitude ice texture during the handoff.
const orbitalVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const orbitalFragment=[
'varying vec2 vUv;uniform sampler2D polarMap;uniform float reveal;uniform float mapVisibility;uniform vec2 resolution;',
'float starHash(vec2 cell){return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);}',
'void main(){vec2 screen=gl_FragCoord.xy/resolution.y;vec2 grid=screen*60.;vec2 cell=floor(grid);',
'float stars=step(.992,starHash(cell))*(1.-smoothstep(.025,.07,length(fract(grid)-.5)));',
'vec3 space=vec3(.001,.003,.009)+vec3(.002,.006,.014)*exp(-length(screen-vec2(.4,.6))*1.7)+vec3(.38,.47,.62)*stars;',
'vec2 uv=(vUv-.5)*(1600./260.)+.5;float radius=length(uv-.5);',
'float rim=exp(-pow((radius-.495)/.012,2.));space+=vec3(.009,.065,.12)*rim*mapVisibility;',
'vec4 polar=texture2D(polarMap,clamp(uv,vec2(0.),vec2(1.)));',
'float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);',
'vec3 surface=polar.rgb*(1.-.12*smoothstep(.28,.5,radius));',
'gl_FragColor=vec4(mix(space,surface,polar.a*inside*mapVisibility),reveal);',
'#include <colorspace_fragment>',
'}'
].join('\n');

export class ArcticWorld{
  constructor(canvas,mapData,year){
    this.canvas=canvas;this.disposed=false;this.low=innerWidth<701;this.textures={};
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default',preserveDrawingBuffer:false});
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.02;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c4d8e2');this.scene.fog=new THREE.FogExp2('#b6cdd5',.0025);this.underwaterFog=new THREE.Color('#074456');
    // Keep the rippled surface in view while passing through it, centimetres from the eye.
    this.camera=new THREE.PerspectiveCamera(46,1,.01,1800);
    this.scene.add(new THREE.HemisphereLight('#c5e5ff','#12405a',1.25));
    const sun=new THREE.DirectionalLight('#fff5df',3.4);this.sun=sun;sun.position.set(-30,38,-35);sun.target.position.set(0,0,-8);this.scene.add(sun,sun.target);
    sun.castShadow=true;sun.shadow.mapSize.set(this.low?1024:2048,this.low?1024:2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:170});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
    const empty=new THREE.DataTexture(new Uint8Array([125,165,180,255]),1,1);empty.needsUpdate=true;this.emptyTexture=empty;
    this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{underwater:{value:0},sky:{value:empty},hasSky:{value:0}},vertexShader:skyVertex,fragmentShader:skyFragment});
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(850,48,24),this.skyMaterial));
    this.closeScene=new THREE.Group();this.scene.add(this.closeScene);
    this.iceMaterial=iceMaterial();this.floes=[makeFloe(0,this.iceMaterial,this.low),makeFloe(1,this.iceMaterial,this.low)];this.floes.forEach(f=>this.closeScene.add(f));
    this.wildlife=new ArcticWildlife(this.floes,this.low);
    this.fragments=fragments();this.closeScene.add(this.fragments);this.landmark=iceberg(this.low);this.closeScene.add(this.landmark);
    this.reflectionTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,samples:Math.min(this.renderer.capabilities.maxSamples,this.low?2:4),generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter});
    this.reflectionTarget.texture.anisotropy=Math.min(this.renderer.capabilities.getMaxAnisotropy(),this.low?4:8);
    this.reflectionTarget.resolveDepthBuffer=false;this.reflectionCamera=new THREE.PerspectiveCamera();
    this.reflectionMatrix=new THREE.Matrix4();this.reflectionDirection=new THREE.Vector3();this.reflectionTargetPoint=new THREE.Vector3();this.waterClip=[new THREE.Plane(new THREE.Vector3(0,1,0),-.04)];
    this.waterMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{eye:{value:new THREE.Vector3()},progress:{value:0},sky:{value:empty},hasSky:{value:0},reflection:{value:this.reflectionTarget.texture},reflectionMatrix:{value:this.reflectionMatrix},hasReflection:{value:0},gap:{value:.35},drift:{value:0}},vertexShader:waterVertex,fragmentShader:waterFragment});
    const ocean=new THREE.PlaneGeometry(1400,1400,this.low?100:160,this.low?100:160),points=ocean.attributes.position;
    for(let i=0;i<points.count;i++)for(const axis of ['x','y']){const value=axis==='x'?points.getX(i):points.getY(i),detail=Math.sign(value)*Math.pow(Math.abs(value)/700,2.4)*700;axis==='x'?points.setX(i,detail):points.setY(i,detail);}
    this.water=new THREE.Mesh(ocean,this.waterMaterial);this.water.rotation.x=-Math.PI/2;this.scene.add(this.water);
    // Suspended particles reveal scale and depth below the surface, without another texture request.
    const dustPositions=[],dustCount=this.low?220:650;
    for(let i=0;i<dustCount;i++)dustPositions.push((Math.sin(i*127.1)*43758.5453%1)*27,-.2-Math.abs(Math.sin(i*73.7)*9137.21%1)*11,14-Math.abs(Math.sin(i*311.7)*12345.7%1)*72);
    const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
    this.dustMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:0}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(11./max(1.,-p.z),.7,2.4);}',fragmentShader:'uniform float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.5,.82,.9,(1.-r*r)*opacity);}'});
    this.dust=new THREE.Points(dustGeometry,this.dustMaterial);this.dust.visible=false;this.closeScene.add(this.dust);
    this.mapCanvas=document.createElement('canvas');this.mapCanvas.width=this.mapCanvas.height=this.low?1024:2048;
    this.mapTexture=new THREE.CanvasTexture(this.mapCanvas);this.mapTexture.colorSpace=THREE.SRGBColorSpace;
    this.mapScene=new THREE.Scene();this.mapCamera=new THREE.PerspectiveCamera(43,1,.01,1800);
    this.mapViews=[false,true].map(portrait=>globalThis.ArcticModel.frameAt(.67,portrait));
    this.mapMaterial=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{polarMap:{value:this.mapTexture},reveal:{value:0},mapVisibility:{value:0},resolution:{value:new THREE.Vector2(1,1)}},vertexShader:orbitalVertex,fragmentShader:orbitalFragment});
    this.mapPlane=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),this.mapMaterial);this.mapPlane.rotation.x=-Math.PI/2;this.mapPlane.position.y=.1;this.mapScene.add(this.mapPlane);
    this.frameMap(false);
    this.mapData=mapData;this.setYear(year);
    this.basemapReady=new Promise(resolve=>{
      const image=new Image();image.decoding='async';
      image.onload=()=>{if(!this.disposed){this.basemapImage=image;this.setYear(this.year,true);}resolve();};
      image.onerror=()=>resolve();image.src=new URL('./assets/arctic/'+(this.low?'polar-land-mobile.webp':'polar-land.webp'),import.meta.url).href;
    });
    const surfacesReady=loadSurfaceTextures(this.low).then(textures=>{
      this.textures=textures;if(this.disposed){Object.values(textures).forEach(t=>t.dispose());return;}
      applyTextures(this.iceMaterial,textures);
      for(const floe of this.floes){const material=floe.userData.rubbleMaterial;material.map=textures['snow-color']||null;material.normalMap=textures['snow-normal']||null;material.needsUpdate=true;}
      // Fine snow normal maps stretch on steep iceberg faces and caused the pitted, crawling surface.
      this.landmark.material.map=null;this.landmark.material.normalMap=null;this.landmark.material.needsUpdate=true;
      if(textures.sky){
        for(const material of [this.skyMaterial,this.waterMaterial]){material.uniforms.sky.value=textures.sky;material.uniforms.hasSky.value=1;}
        const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromEquirectangular(textures.sky);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.55;pmrem.dispose();
      }
    });
    this.ready=Promise.all([surfacesReady,this.wildlife.ready,this.landmark.ready]).then(async()=>{
      if(this.disposed)return;
      this.wildlife.update(globalThis.ArcticModel.frameAt(0));
      await this.renderer.compileAsync(this.scene,this.camera);
      if(this.disposed)return;
      await this.renderer.compileAsync(this.mapScene,this.mapCamera);
      if(this.disposed)return;
      // Warm the clipped reflection variant before revealing the canvas.
      const clipping=this.renderer.clippingPlanes;this.renderer.clippingPlanes=this.waterClip;this.water.visible=false;
      try{await this.renderer.compileAsync(this.scene,this.reflectionCamera);}finally{this.renderer.clippingPlanes=clipping;this.water.visible=true;}
    });
  }
  setYear(year,force=false){
    if(this.year===year&&!force)return;this.year=year;
    const ctx=this.mapCanvas.getContext('2d'),size=this.mapCanvas.width,scale=size/1024;
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#173c48';ctx.fillRect(0,0,size,size);
    const path=rings=>{ctx.beginPath();for(const ring of rings||[]){ring.forEach(([x,y],i)=>{const px=size/2+x/8000000*size,py=size/2-y/8000000*size;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();}};
    ctx.strokeStyle='#aec6c729';ctx.lineWidth=scale;for(const radius of [.125,.25,.375]){ctx.beginPath();ctx.arc(size/2,size/2,size*radius,0,Math.PI*2);ctx.stroke();}
    path(this.mapData.years[String(year)]);ctx.fillStyle='#edf2e9';ctx.fill('evenodd');ctx.strokeStyle='#c9e0e1';ctx.lineWidth=.5*scale;ctx.stroke();
    // Land covers the extent grid's coastal cells, so land snow is never presented as sea ice.
    path(this.mapData.coast);ctx.fillStyle='#70837c';ctx.fill('evenodd');
    if(this.basemapImage){ctx.save();ctx.clip('evenodd');ctx.drawImage(this.basemapImage,0,0,size,size);ctx.restore();}
    path(this.mapData.coast);ctx.strokeStyle='#a4b4aa';ctx.lineWidth=.6*scale;ctx.stroke();
    ctx.globalCompositeOperation='destination-in';const gradient=ctx.createRadialGradient(size/2,size/2,size*.485,size/2,size/2,size*.499);gradient.addColorStop(0,'#fff');gradient.addColorStop(1,'#fff0');ctx.fillStyle=gradient;ctx.fillRect(0,0,size,size);ctx.globalCompositeOperation='source-over';
    this.mapTexture.needsUpdate=true;
  }
  resize(width,height){
    const ratio=Math.min(Math.max(devicePixelRatio||1,this.low?1:1.5),this.low?1.5:2,Math.sqrt((this.low?1800000:12000000)/(width*height)));
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
    this.mapCamera.aspect=width/height;this.mapCamera.updateProjectionMatrix();this.renderer.getDrawingBufferSize(this.mapMaterial.uniforms.resolution.value);
    const reflectionScale=Math.min(ratio,(this.low?768:2048)/Math.max(width,height));
    this.reflectionTarget.setSize(Math.max(1,Math.round(width*reflectionScale)),Math.max(1,Math.round(height*reflectionScale)));
  }
  reflectWater(){
    const mirror=this.reflectionCamera;this.camera.updateMatrixWorld();mirror.copy(this.camera);
    this.camera.getWorldDirection(this.reflectionDirection);this.reflectionTargetPoint.copy(this.camera.position).add(this.reflectionDirection);this.reflectionTargetPoint.y*=-1;
    mirror.position.y*=-1;mirror.up.set(0,-1,0);mirror.lookAt(this.reflectionTargetPoint);mirror.updateMatrixWorld();
    this.reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
    const clipping=this.renderer.clippingPlanes;this.water.visible=false;this.renderer.clippingPlanes=this.waterClip;
    this.renderer.setRenderTarget(this.reflectionTarget);this.renderer.render(this.scene,mirror);this.renderer.setRenderTarget(null);
    this.renderer.clippingPlanes=clipping;this.water.visible=true;this.renderer.shadowMap.needsUpdate=false;
  }
  frameMap(portrait){
    const view=this.mapViews[portrait?1:0];
    this.mapCamera.position.fromArray(view.camera);this.mapCamera.fov=view.fov;this.mapCamera.lookAt(...view.target);this.mapCamera.updateProjectionMatrix();
  }
  render(frame){
    if(this.disposed)return;
    this.camera.position.fromArray(frame.camera);this.camera.fov=frame.fov;this.camera.lookAt(...frame.target);this.camera.updateProjectionMatrix();
    this.closeScene.visible=frame.orbitCover<1;
    this.wildlife.update(frame);this.renderer.shadowMap.needsUpdate=this.closeScene.visible;
    this.fragments.material.opacity=1-frame.drift;
    this.floes.forEach((f,i)=>{const direction=i===0?-1:1;f.position.set(direction*(frame.gap/2+frame.drift*85),frame.drift*-.15,frame.drift*22);f.rotation.y=direction*frame.drift*.28;});
    this.mapMaterial.uniforms.reveal.value=frame.orbitCover;this.mapMaterial.uniforms.mapVisibility.value=frame.mapBlend;
    this.waterMaterial.uniforms.eye.value.copy(this.camera.position);this.waterMaterial.uniforms.progress.value=frame.progress;
    this.waterMaterial.uniforms.gap.value=frame.gap;this.waterMaterial.uniforms.drift.value=frame.drift;
    this.skyMaterial.uniforms.underwater.value=frame.underwater;
    this.dust.visible=frame.underwater>.05;this.dustMaterial.uniforms.opacity.value=frame.underwater*.18;
    this.scene.fog.color.set('#b2d2e4').lerp(this.underwaterFog,frame.underwater);this.scene.fog.density=.0016+frame.underwater*.022;
    const reflectionBlend=(1-frame.orbitCover)*THREE.MathUtils.smoothstep(this.camera.position.y,.04,.24);
    this.waterMaterial.uniforms.hasReflection.value=reflectionBlend;
    if(reflectionBlend>0)this.reflectWater();
    if(frame.orbitCover<1)this.renderer.render(this.scene,this.camera);
    if(frame.orbitCover>0){
      this.frameMap(frame.portrait);
      const autoClear=this.renderer.autoClear;
      try{
        this.renderer.autoClear=frame.orbitCover===1?autoClear:false;
        if(frame.orbitCover<1)this.renderer.clearDepth();
        this.renderer.render(this.mapScene,this.mapCamera);
      }finally{this.renderer.autoClear=autoClear;}
    }
  }
  dispose(){
    this.disposed=true;this.landmark.userData.disposed=true;for(const scene of [this.scene,this.mapScene])scene.traverse(object=>{object.geometry?.dispose();if(object.material){for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();}});
    this.sun.shadow.map?.dispose();this.sun.shadow.mapPass?.dispose();this.wildlife.dispose();Object.values(this.textures).forEach(t=>t.dispose());this.emptyTexture.dispose();this.environment?.dispose();this.reflectionTarget.dispose();this.mapTexture.dispose();this.renderer.dispose();
  }
}

