'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../arctic-model.js');
const Ice=require('../arctic-ice.js');
const root=path.join(__dirname,'..');
const series=JSON.parse(fs.readFileSync(path.join(root,'assets/data/arctic-september.json'),'utf8'));

test('opening and closing use the exact same position, target and lens in both compositions',()=>{
  for(const portrait of [false,true]){
    const first=M.frameAt(0,portrait),last=M.frameAt(1,portrait);
    assert.deepEqual(first.camera,last.camera);assert.deepEqual(first.target,last.target);assert.equal(first.fov,last.fov);
    assert.equal(first.drift,0);assert.equal(last.drift,1);assert.equal(last.map,0);
  }
});
test('scroll reversal recovers an identical pose without a time-dependent simulation',()=>{
  for(const p of [.075,.14,.21,.378,.431,.49,.62,.805,.955]){
    const expected=M.frameAt(p);M.frameAt(p+.01);M.frameAt(p-.01);assert.deepEqual(M.frameAt(p),expected);
  }
});
test('the camera crosses the waterline and passes between the separated matching floes',()=>{
  assert.ok(M.frameAt(.125).camera[1]>0);assert.ok(M.frameAt(.21).camera[1]<0);
  const crack=M.frameAt(.415);assert.ok(crack.gap>=3);assert.ok(Math.abs(crack.camera[0])<crack.gap/2);
  assert.ok(M.frameAt(.455).camera[1]>0);assert.ok(M.frameAt(M.chapters[3]).camera[1]>300);
});
test('camera velocity stays continuous across waypoints without easing to a stop at every join',()=>{
  const h=.0000001;
  for(const p of M.waypoints.slice(1,-1)){
    const before=M.frameAt(p-h).camera,at=M.frameAt(p).camera,after=M.frameAt(p+h).camera;
    before.forEach((v,i)=>assert.ok(Math.abs((at[i]-v)/h-(after[i]-at[i])/h)<.2));
  }
  assert.ok(Math.abs((M.frameAt(.23001).camera[0]-M.frameAt(.22999).camera[0])/.00002)>20);
});

test('underwater tint stays active through the ripple band and fades continuously on resurfacing',()=>{
  for(const portrait of [false,true]){
    let previous=M.frameAt(.4,portrait).underwater;
    for(let i=4001;i<=4700;i++){
      const frame=M.frameAt(i/10000,portrait),tint=frame.underwater;
      assert.ok(tint>=0&&tint<=previous);
      assert.ok(previous-tint<.02,'waterline colour jumped');
      if(frame.camera[1]<=.053)assert.ok(tint>0,'tint vanished before clearing the waves');
      if(frame.camera[1]>=.08)assert.equal(tint,0);
      previous=tint;
    }
  }
});
test('wheel smoothing settles exactly and reverses without overshooting',()=>{
  let p=.15;
  for(const target of [.4,.13,.9,0,1]){
    for(let i=0;i<120;i++){const next=M.follow(p,target,16);assert.ok(next>=Math.min(p,target)&&next<=Math.max(p,target));p=next;}
    assert.equal(p,target);
  }
});

test('the orbital handoff fades continuously after the camera rises and reverses exactly',()=>{
  for(const portrait of [false,true]){
    let previous=0,previousCover=0;let blended=0;
    for(let i=5100;i<=7100;i++){
      const frame=M.frameAt(i/10000,portrait),blend=frame.mapBlend;
      assert.ok(blend>=previous&&blend<=1);
      assert.ok(blend-previous<.005,'satellite transition jumped');
      assert.ok(frame.orbitCover>=previousCover&&frame.orbitCover<=1);
      assert.ok(frame.orbitCover-previousCover<.01,'orbital backdrop jumped');
      if(blend>.15)assert.ok(frame.orbitCover>.999,'ice overlapped the revealed map');
      if(blend>0&&blend<1){blended++;assert.ok(frame.camera[1]>25,'map appeared before the pullback');}
      M.frameAt(.9,portrait);assert.equal(M.frameAt(i/10000,portrait).mapBlend,blend);
      previous=blend;previousCover=frame.orbitCover;
    }
    assert.ok(blended>1100,'satellite dissolve was compressed into too little scrolling');assert.equal(previous,1);
    assert.equal(M.frameAt(.51,portrait).mapBlend,0);assert.equal(M.frameAt(1,portrait).mapBlend,0);
  }
});

test('orbital wheel steps are cushioned and settle without overshooting',()=>{
  let p=.55,previous=p;
  for(let i=0;i<150;i++){
    p=M.follow(p,M.chapters[3],16);
    assert.ok(p>=previous&&p<=M.chapters[3]);
    assert.ok(p-previous<.018,'orbital motion advanced too far in one frame');
    previous=p;
  }
  assert.equal(p,M.chapters[3]);
  let peakMapStep=0,previousBlend=M.frameAt(.59).mapBlend;
  for(let i=5901;i<=7100;i++){
    const blend=M.frameAt(i/10000).mapBlend;
    peakMapStep=Math.max(peakMapStep,blend-previousBlend);previousBlend=blend;
  }
  assert.ok(peakMapStep<.0013,'visible map contrast changed too quickly');
});

test('the orbital sphere has a tangent horizon inside the actual polar map coverage',()=>{
  assert.deepEqual(M.globeSample(0,0).uv,[.5,.5]);assert.equal(M.globeSample(1.01,0),null);
  for(let i=0;i<=100;i++)for(let j=0;j<64;j++){
    const r=i/100,angle=j*Math.PI/32,sample=M.globeSample(r*Math.cos(angle),r*Math.sin(angle));
    assert.ok(sample.point.every(Number.isFinite)&&sample.uv.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...sample.point)-1)<1e-6);
    assert.ok(Math.hypot(sample.uv[0]-.5,sample.uv[1]-.5)<.485,'globe sampled the cropped map boundary');
    assert.ok(sample.latitude>55*Math.PI/180);
    if(i===100){
      const view=sample.point.map((v,k)=>(k===2?M.globe.distance:0)-v);
      assert.ok(Math.abs(sample.point.reduce((sum,v,k)=>sum+v*view[k],0))<1e-6,'horizon is not tangent to the surface');
    }
  }
});
test('wildlife fades with scroll, returns on reversal and stays absent from the closing frame',()=>{
  assert.equal(M.frameAt(0).wildlife,1);assert.equal(M.frameAt(.06).wildlife,1);
  let previous=1;for(let i=0;i<=100;i++){const value=M.frameAt(i/100).wildlife;assert.ok(value>=0&&value<=previous);previous=value;}
  const halfway=M.frameAt(.13).wildlife;assert.ok(halfway>0&&halfway<1);
  M.frameAt(.8);assert.equal(M.frameAt(.13).wildlife,halfway);assert.equal(M.frameAt(.22).wildlife,0);assert.equal(M.frameAt(1).wildlife,0);
});
test('textured bear GLBs are self-contained, valid and substantially lighter on phones',()=>{
  const results=[];
  for(const file of ['polar-bear.glb','polar-bear-mobile.glb']){
    const bytes=fs.readFileSync(path.join(root,'assets/arctic/models',file));
    assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
    const bin=bytes.subarray(28+jsonLength);assert.equal(doc.asset.version,'2.0');assert.ok((doc.extensionsRequired||[]).every(e=>e==='KHR_mesh_quantization'));
    assert.ok(doc.buffers.every(b=>!b.uri));assert.ok(doc.images.length>=2&&doc.images.every(i=>i.bufferView!==undefined&&!i.uri));
    let triangles=0;
    const values=index=>{
      const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
      const read={5122:['readInt16LE',2,32767],5123:['readUInt16LE',2,65535],5125:['readUInt32LE',4],5126:['readFloatLE',4]}[a.componentType];assert.ok(read);
      const [method,size]=read,stride=v.byteStride||components*size,offset=(v.byteOffset||0)+(a.byteOffset||0),out=[];
      assert.ok(offset+(a.count-1)*stride+components*size<=bin.length);
      for(let i=0;i<a.count;i++)for(let c=0;c<components;c++){const value=bin[method](offset+i*stride+c*size);out.push(a.normalized?Math.max(-1,value/read[2]):value);}return out;
    };
    for(const mesh of doc.meshes)for(const p of mesh.primitives){
      const positions=values(p.attributes.POSITION),normals=values(p.attributes.NORMAL),uv=values(p.attributes.TEXCOORD_0),indices=values(p.indices);
      assert.ok(positions.every(Number.isFinite)&&normals.every(Number.isFinite)&&uv.every(Number.isFinite));
      for(let i=0;i<normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...normals.slice(i,i+3))-1)<.02);
      assert.ok(indices.every(i=>i>=0&&i<positions.length/3));assert.equal(indices.length%3,0);triangles+=indices.length/3;
      assert.ok(doc.materials[p.material].pbrMetallicRoughness.baseColorTexture);
    }
    results.push({bytes:bytes.length,triangles});
    if(doc.extensionsRequired?.includes('KHR_mesh_quantization')){
      assert.ok(doc.nodes[0].scale.every(v=>v>0&&v===doc.nodes[0].scale[0]));
      assert.ok(doc.asset.extras.maxPositionError<.00002);
      assert.match(fs.readFileSync(path.join(root,'assets/vendor/three/GLTFLoader.js'),'utf8'),/KHR_mesh_quantization/);
    }
  }
  assert.ok(results[0].triangles<85000);assert.ok(results[1].triangles<results[0].triangles*.5);assert.ok(results[1].bytes<results[0].bytes*.5);
  assert.match(fs.readFileSync(path.join(root,'assets/arctic/models/LICENSE.txt'),'utf8'),/CC0/);
});
test('the sculpted iceberg has finite geometry, valid indices and a smaller phone version',()=>{
  const variants=[];
  for(const file of ['sculpted-iceberg.glb','sculpted-iceberg-mobile.glb']){
    const bytes=fs.readFileSync(path.join(root,'assets/arctic/models',file)),length=bytes.readUInt32LE(12);
    assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
    const doc=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length),primitive=doc.meshes[0].primitives[0];
    for(const attribute of ['POSITION','NORMAL','COLOR_0','TEXCOORD_0']){
      const a=doc.accessors[primitive.attributes[attribute]],v=doc.bufferViews[a.bufferView];assert.equal(a.componentType,5126);
      assert.ok(v.byteOffset+v.byteLength<=bin.length);
      for(let i=0;i<v.byteLength;i+=4)assert.ok(Number.isFinite(bin.readFloatLE(v.byteOffset+i)));
    }
    const position=doc.accessors[primitive.attributes.POSITION];assert.ok(position.min[1]>=-.6&&position.max[1]>9);assert.ok(position.max[0]-position.min[0]>20);
    const a=doc.accessors[primitive.indices],v=doc.bufferViews[a.bufferView],size=a.componentType===5123?2:4,read=size===2?'readUInt16LE':'readUInt32LE';
    for(let i=0;i<a.count;i++)assert.ok(bin[read](v.byteOffset+i*size)<position.count);
    assert.equal(a.count%3,0);variants.push({triangles:a.count/3,bytes:bytes.length});
  }
  assert.ok(variants[0].triangles<=32000);assert.ok(variants[1].triangles<variants[0].triangles*.5);assert.ok(variants[1].bytes<variants[0].bytes*.5);
});
test('both ice halves share an organic crack, with finite detailed relief and upward-facing caps',()=>{
  const a=Ice.outline(0).slice(0,161),b=Ice.outline(1).slice(0,161).reverse();assert.deepEqual(a,b);
  assert.ok(Math.max(...a.map(p=>p[0]))-Math.min(...a.map(p=>p[0]))>1);
  for(const quality of [1,.5])for(const side of [0,1]){
    const d=Ice.build(side,quality),vertices=d.positions.length/3;
    assert.ok(vertices>19000&&vertices<35000);assert.ok(d.positions.every(Number.isFinite));assert.ok(d.indices.every(i=>i>=0&&i<vertices));
    const heights=[];for(let i=1;i<=12*200;i++)heights.push(d.positions[i*3+1]);assert.ok(Math.max(...heights)-Math.min(...heights)>.1);
    const [i,j,k]=d.indices,a=d.positions.slice(i*3,i*3+3),b=d.positions.slice(j*3,j*3+3),c=d.positions.slice(k*3,k*3+3);
    assert.ok((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>0);
    for(let q=0;q<d.topCount;q+=3){
      const [i,j,k]=d.indices.slice(q,q+3).map(i=>i*3),p=d.positions;
      assert.ok((p[j+2]-p[i+2])*(p[k]-p[i])-(p[j]-p[i])*(p[k+2]-p[i+2])>0,'folded snow cap');
    }
    // A wall triangle must not interpolate from the end of the entire UV unwrap back to zero.
    const wallEnd=d.indices.length-d.ring.length*3;
    for(let q=d.topCount;q<wallEnd;q+=3){const u=d.indices.slice(q,q+3).map(i=>d.uv[i*2]);assert.ok(Math.max(...u)-Math.min(...u)<.5,'stretched UV seam');}
    for(let k=0;k<=d.wallLayers;k++){
      const first=(d.wallStart+k*d.wallStride)*3,last=first+d.ring.length*3;
      assert.deepEqual(d.positions.slice(first,first+3),d.positions.slice(last,last+3),'open wall seam');
    }
    for(let j=0;j<d.ring.length;j++){
      const cap=(1+(d.radials-1)*d.ring.length+j)*3,wall=(d.wallStart+j)*3;
      for(let axis=0;axis<3;axis++)assert.ok(Math.abs(d.positions[cap+axis]-d.positions[wall+axis])<1e-6,'gap between snow cap and ice wall');
    }
  }
  assert.ok(M.frameAt(.415,true).underwater>.5);
});
test('the camera stays outside the solid ice throughout the underwater journey',()=>{
  const rings=[Ice.outline(0),Ice.outline(1)];
  const inside=(x,z,ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }return hit;};
  for(const portrait of [false,true])for(let i=0;i<=5500;i++){
    const frame=M.frameAt(i/10000,portrait);if(frame.camera[1]>0||frame.camera[1]<-2.6)continue;
    for(let side=0;side<2;side++)assert.equal(inside(frame.camera[0]-(side===0?-1:1)*frame.gap/2,frame.camera[2],rings[side]),false,'camera entered floe at '+i/10000);
  }
});
test('the close passage holds a stable horizontal target and all camera samples stay finite',()=>{
  for(const portrait of [false,true])for(let i=0;i<=10000;i++){
    const frame=M.frameAt(i/10000,portrait);
    for(const value of [...frame.camera,...frame.target,frame.gap,frame.map,frame.drift])assert.ok(Number.isFinite(value));
    assert.ok(frame.map>=0&&frame.map<=1);assert.ok(frame.drift>=0&&frame.drift<=1);
  }
  const a=M.frameAt(.414),b=M.frameAt(.416);assert.ok(Math.abs(a.target[1]-b.target[1])<.01);
});
test('native document progress handles entry, exit and a zero-height track safely',()=>{
  assert.equal(M.progressAt(300,500,6000,700),0);assert.equal(M.progressAt(5800,500,6000,700),1);
  assert.equal(M.progressAt(3150,500,6000,700),.5);assert.ok(Number.isFinite(M.progressAt(500,500,0,0)));
});
test('all September monthly measurements and units match the unmodified official CSV',()=>{
  const rows=fs.readFileSync(path.join(root,'assets/data/arctic-september-original.csv'),'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(v=>v.trim()));
  assert.equal(series.units,'million km²');assert.equal(series.rows.length,48);
  rows.forEach((row,i)=>{assert.equal(series.rows[i].year,Number(row[0]));assert.equal(series.rows[i].extent,Number(row[4]));assert.equal(series.rows[i].area,Number(row[5]));});
  assert.ok(series.rows.filter((r,i)=>i&&r.extent>series.rows[i-1].extent).length>=20);
  assert.equal(series.rows.find(r=>r.year===2012).extent,3.57);assert.equal(series.rows.find(r=>r.year===2013).extent,5.21);
});
test('daily 2026 minimum remains separate from the monthly mean and IPCC area threshold',()=>{
  assert.equal(series.minimum2026.extent,4.60);assert.equal(series.minimum2026.date,'2026-09-12');
  assert.equal(series.rows.at(-1).extent,4.81);assert.notEqual(series.minimum2026.extent,series.rows.at(-1).extent);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/million square kilometres of sea-ice area/);assert.match(html,/Daily minimum; the September monthly mean is 4\.81/);
});
test('every measured year has finite, closed, sourced polar outline rings',()=>{
  const map=JSON.parse(fs.readFileSync(path.join(root,'assets/data/arctic-map.json'),'utf8'));
  assert.equal(map.projection,'EPSG:3411');assert.equal(Object.keys(map.years).length,48);
  for(const row of series.rows){assert.ok(map.years[row.year].length>0);for(const ring of map.years[row.year]){assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.length>=4);assert.ok(ring.every(p=>p.length===2&&p.every(Number.isFinite)));}}
});

test('display ice contours round the grid without mutating data or materially changing its footprint',()=>{
  const map=JSON.parse(fs.readFileSync(path.join(root,'assets/data/arctic-map.json'),'utf8')),before=JSON.stringify(map.years);
  const area=ring=>Math.abs(ring.slice(1).reduce((sum,p,i)=>sum+ring[i][0]*p[1]-p[0]*ring[i][1],0)/2);
  for(const rings of Object.values(map.years)){
    let original=0,display=0;
    for(const ring of rings){
      const smooth=M.smoothIceRing(ring);assert.deepEqual(smooth[0],smooth.at(-1));
      assert.ok(smooth.every(p=>p.every(Number.isFinite)));assert.equal(M.smoothIceRing(ring),smooth);
      original+=area(ring);display+=area(smooth);
    }
    assert.ok(Math.abs(display-original)/original<.005,'smoothed footprint changed by over 0.5%');
  }
  assert.equal(JSON.stringify(map.years),before);
});
test('all six fallback views and the original route remain available without WebGL',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/id="climate-story"/);
  const images=[...html.matchAll(/class="arctic-still"(?: id="[^"]+")? src="([^"]+)"/g)];assert.equal(images.length,6);
  images.forEach((image,i)=>{assert.ok(fs.existsSync(path.join(root,image[1])));assert.match(html,new RegExp(`data-arctic-step="${i}"`));});
  assert.equal(images.filter(image=>image[1].endsWith('.webp')).length,4);
  assert.doesNotMatch(html,/How emissions lead to hotter streets/);
  assert.match(html,/href="#solutions">Take action/);
});
