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
  assert.ok(M.frameAt(.455).camera[1]>0);assert.ok(M.frameAt(.67).camera[1]>300);
});
test('camera velocity stays continuous across waypoints without easing to a stop at every join',()=>{
  const h=.0000001;
  for(const p of M.waypoints.slice(1,-1)){
    const before=M.frameAt(p-h).camera,at=M.frameAt(p).camera,after=M.frameAt(p+h).camera;
    before.forEach((v,i)=>assert.ok(Math.abs((at[i]-v)/h-(after[i]-at[i])/h)<.2));
  }
  assert.ok(Math.abs((M.frameAt(.23001).camera[0]-M.frameAt(.22999).camera[0])/.00002)>20);
});
test('wheel smoothing settles exactly and reverses without overshooting',()=>{
  let p=.15;
  for(const target of [.4,.13,.9,0,1]){
    for(let i=0;i<120;i++){const next=M.follow(p,target,16);assert.ok(next>=Math.min(p,target)&&next<=Math.max(p,target));p=next;}
    assert.equal(p,target);
  }
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
    // A wall triangle must not interpolate from the end of the entire UV unwrap back to zero.
    const wallEnd=d.indices.length-d.ring.length*3;
    for(let q=d.topCount;q<wallEnd;q+=3){const u=d.indices.slice(q,q+3).map(i=>d.uv[i*2]);assert.ok(Math.max(...u)-Math.min(...u)<.5,'stretched UV seam');}
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
test('all six fallback views and the original route remain available without WebGL',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/id="climate-story"/);
  const images=[...html.matchAll(/class="arctic-still"(?: id="[^"]+")? src="([^"]+)"/g)];assert.equal(images.length,6);
  images.forEach((image,i)=>{assert.ok(fs.existsSync(path.join(root,image[1])));assert.match(html,new RegExp(`data-arctic-step="${i}"`));});
  assert.equal(images.filter(image=>image[1].endsWith('.webp')).length,4);
  assert.doesNotMatch(html,/How emissions lead to hotter streets/);
  assert.match(html,/href="#solutions">Take action/);
});
