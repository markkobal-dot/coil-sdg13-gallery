const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js');globalThis.GreenCity=C;globalThis.GreenCityPlanning=require('../green-city-planning.js');
const tile=(r,c)=>r*C.size+c;
async function setup(){const {CityWorld}=await import('../green-city-world.js'),T=await import('../assets/vendor/three/three.module.js');const world=Object.create(CityWorld.prototype);world.materials=new Map();world.smokePoints=[];return {world,T};}
function signature(model){const parts=[];model.traverse(p=>{if(p.isMesh)parts.push([p.position.toArray(),p.scale.toArray(),p.rotation.toArray(),p.material.color.getHex(),p.geometry.type]);});return JSON.stringify(parts);}
test('starter homes have six distinct silhouettes and stable individual details, without changing saved cities',async()=>{
 const {world}=await setup(),state=C.fresh(),before=JSON.stringify(state),variants=new Set(),models=[];
 state.cells.forEach((cell,i)=>{if(cell?.type==='house'){const m=world.model(cell,i,state.cells);variants.add(m.userData.houseVariant);models.push(signature(m));assert.equal(signature(world.model(cell,i,state.cells)),signature(m));}});
 assert.equal(variants.size,6);assert.equal(new Set(models).size,models.length);assert.equal(JSON.stringify(state),before);
});
test('all ordinary-house variants fit their plots at each level and expose windows for occupancy lighting',async()=>{
 const {world,T}=await setup();
 for(let i=tile(4,3);i<tile(4,15);i++)for(let level=1;level<=3;level++)for(const roof of [null,'solar','roof']){
  const model=world.model({type:'house',level,roof,rotation:0},i,[]);model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model);assert.ok(bounds.min.x>=-.51&&bounds.max.x<=.51);assert.ok(bounds.min.z>=-.51&&bounds.max.z<=.51);assert.ok(bounds.max.y<2);let panes=0,patches=0;model.traverse(p=>{if(p.isMesh)assert.ok(p.matrixWorld.determinant()>0,'Batched and instanced meshes need positive transform determinants');if(p.userData.windowCell!==undefined){assert.equal(p.userData.windowCell,i);panes++;}if(p.userData.houseRetrofit){assert.equal(p.userData.houseRetrofit,roof);patches++;}});assert.ok(panes>=2);assert.equal(patches,roof?1:0);
 }
});
test('entrances face adjacent streets and roof upgrades preserve the chosen house and roof shapes',async()=>{
 const {world}=await setup(),i=tile(7,7),cell={type:'house',level:1,roof:null,rotation:0};
 for(const [dr,dc,angle]of [[1,0,0],[0,1,Math.PI/2],[-1,0,Math.PI],[0,-1,-Math.PI/2]]){const cells=Array(C.size*C.size).fill(null);cells[i]=cell;cells[i+dr*C.size+dc]={type:'road',level:1,roof:null};assert.equal(world.model(cell,i,cells).userData.streetFacing,angle);}
 const profile=m=>{const shapes=[];m.traverse(p=>{if(p.userData.houseRoof)shapes.push([p.userData.houseRoof,p.position.toArray(),p.rotation.toArray()]);});return shapes;};
 for(let j=i;j<i+6;j++){const base=world.model(cell,j,[]);for(const roof of ['solar','roof']){const retrofit=world.model({...cell,roof},j,[]);assert.equal(retrofit.userData.houseVariant,base.userData.houseVariant);assert.deepEqual(profile(retrofit),profile(base));}}
});
