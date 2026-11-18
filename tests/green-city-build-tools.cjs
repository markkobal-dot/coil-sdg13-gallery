const test=require('node:test'),assert=require('node:assert/strict'),C=require('../green-city-core.js'),P=require('../green-city-planning.js');
const tile=(r,c)=>r*C.size+c,apply=r=>{assert.equal(r.error,'');return r.state;};

test('a road plan reports its complete cost and preserves existing road furniture without charging twice',()=>{
 let s=C.fresh();s=apply(C.place(s,'bus',tile(5,6)));const before=JSON.stringify(s),cells=[tile(5,6),tile(5,7),tile(6,7),tile(7,7),tile(7,7)],r=C.planTiles(s,'road',cells);
 assert.equal(r.error,'');assert.equal(r.existing.length,2);assert.equal(r.added.length,2);assert.equal(r.cost,2*C.upgrades.road.cost);assert.equal(JSON.stringify(s),before);
 const built=apply(C.buildTiles(s,'road',cells));assert.equal(built.cash,s.cash-r.cost);assert.deepEqual(built.cells[tile(5,6)],s.cells[tile(5,6)]);assert.equal(built.cells[tile(7,7)].type,'road');assert.deepEqual(C.restore(JSON.parse(JSON.stringify(built))),built);
});

test('water, occupied buildings and unpurchased land reject the entire stroke without partial charges',()=>{
 const s=C.fresh(),clear=tile(7,7),blocked=[0,tile(4,4),tile(20,14)];
 for(const type of ['road','tree'])for(const i of blocked){const before=JSON.stringify(s),r=C.planTiles(s,type,[clear,i]);assert.deepEqual(r.blocked,[i]);assert.ok(r.error.includes(C.label(i)));assert.equal(C.buildTiles(s,type,[clear,i]).state,s);assert.equal(s.cells[clear],null);assert.equal(JSON.stringify(s),before);}
});

test('trees are purchased once per new plot while existing upgraded trees keep their level and paid value',()=>{
 let s=C.fresh();const a=tile(7,7),b=tile(7,8);s=apply(C.place(s,'tree',a));s=apply(C.upgrade(s,a));
 const r=C.planTiles(s,'tree',[a,b,a,b]),next=apply(C.buildTiles(s,'tree',r.cells));assert.equal(r.cost,C.upgrades.tree.cost);assert.deepEqual(next.cells[a],s.cells[a]);assert.equal(next.cash,s.cash-C.upgrades.tree.cost);
 const forecast=P.forecast(C,s,{mode:'batch',type:'tree',cells:[a,b],i:b});assert.equal(forecast.cost,r.cost);assert.equal(forecast.net,C.analyse(next).net);assert.equal(forecast.happinessChange,C.analyse(next).happiness-C.analyse(s).happiness);
});

test('invalid, unaffordable and no-op plans remain side-effect free and grants are awarded only once',()=>{
 const s=C.fresh(),cells=C.line(tile(7,7),tile(7,9));
 for(const bad of [[],null,[NaN],[1.5],[-1],[784],Array(785).fill(1)])assert.equal(C.buildTiles(s,'road',bad).state,s);
 assert.ok(C.planTiles(s,'house',cells).error);const poor={...s,cash:1};assert.equal(C.buildTiles(poor,'tree',cells).state,poor);
 assert.equal(C.buildTiles(s,'road',[tile(5,5)]).state,s);
 const batch=apply(C.buildTiles(s,'tree',C.line(tile(7,6),tile(8,9)))),awarded=C.grant(batch);assert.equal(awarded.rewards.filter(r=>r.id==='builder').length,1);assert.equal(C.grant(awarded.state).rewards.length,0);
});

function inputHarness(World,mode='road',type='tree'){
 const handlers=new Map(),events=[],selected=[];
 const canvas={style:{},addEventListener(name,fn){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(fn);}};
 const w=Object.create(World.prototype);Object.assign(w,{canvas,mode,type,controls:{mouseButtons:{},touches:{}},pick:e=>e.tile??-1,pickResident:()=>null,onDraw:e=>events.push(e),onSelect:(...args)=>selected.push(args),onHover:()=>{},updateHover:()=>{},schedule:()=>{},cursor:{visible:true}});w.bindInput();
 const emit=(name,props={})=>{const e={pointerId:1,button:0,pointerType:'mouse',clientX:0,clientY:0,tile:tile(7,7),...props};for(const fn of handlers.get(name)||[])fn(e);};
 return {w,events,selected,emit};
}

test('fast drags interpolate every crossed tile, include the release endpoint and do not turn into a second click',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js');const h=inputHarness(CityWorld);
 h.emit('pointerdown');h.emit('pointermove',{clientX:30,tile:tile(7,10)});h.emit('pointerup',{clientX:50,tile:tile(8,10)});
 assert.equal(h.events.at(-1).phase,'ready');assert.deepEqual(h.events.at(-1).cells,[...C.line(tile(7,7),tile(7,10)),tile(8,10)]);assert.equal(h.selected.length,0);
 const click=inputHarness(CityWorld);click.emit('pointerdown');click.emit('pointermove',{clientX:3});click.emit('pointerup',{clientX:3});assert.equal(click.events.length,0);assert.equal(click.selected.length,1);
});

test('a second touch, cancelled pointer or release outside the map cancels painting and subsequent input still works',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js');
 for(const reason of ['touch','cancel','outside']){const h=inputHarness(CityWorld,'build');h.emit('pointerdown',{pointerType:'touch'});h.emit('pointermove',{pointerType:'touch',clientX:30,tile:tile(7,10)});
  if(reason==='touch'){h.emit('pointerdown',{pointerType:'touch',pointerId:2});h.emit('pointerup',{pointerType:'touch',pointerId:2});h.emit('pointerup',{pointerType:'touch'});}
  if(reason==='cancel')h.emit('pointercancel');if(reason==='outside')h.emit('pointerup',{clientX:50,tile:-1});
  assert.equal(h.events.at(-1).phase,'cancel');assert.ok(!h.events.some(e=>e.phase==='ready'));h.emit('pointerdown');h.emit('pointerup');assert.equal(h.selected.length,1);
 }
});

test('painting reserves primary dragging, keeps camera alternatives, and renders a bounded reusable tile overlay',async()=>{
 globalThis.GreenCity=C;const {CityWorld}=await import('../green-city-world.js'),THREE=await import('../assets/vendor/three/three.module.js');
 const h=inputHarness(CityWorld);h.w.configureBuildInput();assert.equal(h.w.controls.mouseButtons.LEFT,null);assert.equal(h.w.controls.mouseButtons.MIDDLE,THREE.MOUSE.PAN);assert.equal(h.w.controls.touches.TWO,THREE.TOUCH.DOLLY_PAN);
 h.w.mode='inspect';h.w.configureBuildInput();assert.equal(h.w.controls.mouseButtons.LEFT,THREE.MOUSE.PAN);
 const w=Object.create(CityWorld.prototype);w.brushFill=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial(),C.size*C.size);w.route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial());w.schedule=()=>{};
 const report=C.planTiles(C.fresh(),'road',[tile(5,5),tile(7,7),tile(4,4)]);w.setBuildDraft(report);assert.equal(w.brushFill.count,3);const c=new THREE.Color();w.brushFill.getColorAt(2,c);assert.equal(c.getHexString(),'d15b4c');assert.ok(w.route.visible);w.setBuildDraft(null);assert.equal(w.brushFill.count,0);assert.equal(w.route.visible,false);
});
