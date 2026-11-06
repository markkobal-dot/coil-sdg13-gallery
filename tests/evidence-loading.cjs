// Exercise real loading logic against a minimal DOM and controllable clock/network.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const helpers=fs.readFileSync(path.join(__dirname,'../weather-data.js'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../evidence.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function data(date,temp=12) {
  return {daily:{time:[date],temperature_2m_mean:[temp],temperature_2m_min:[5],temperature_2m_max:[16],weather_code:[3],wind_speed_10m_max:[20],precipitation_sum:[0],relative_humidity_2m_mean:[70]},current:{time:date+'T12:00',temperature_2m:14,weather_code:3,relative_humidity_2m:70,wind_speed_10m:10,precipitation:0}};
}
const response=(body,status=200)=>({ok:status===200,status,headers:{get:()=>null},json:async()=>body});
function harness({snapshot=true,forecastAge=0,handler}={}) {
  let now=Date.parse('2026-11-06T12:00:00Z'),seq=0;
  const elements=new Map(),events={},windowEvents={},timers=new Map(),intervals=[];
  const get=id=>{
    if(!elements.has(id))elements.set(id,{textContent:'',value:id==='ce-city'?'nova':'',disabled:false,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;}});
    return elements.get(id);
  };
  const calls=[],store=new Map();
  const snapshotData={version:1,cities:{nova:{forecast:{saved:now-forecastAge,data:data('2026-11-06')},history:{saved:now,data:data('2016-11-06',8)}},paris:{forecast:{saved:now,data:data('2026-11-06',15)},history:{saved:now,data:data('2016-11-06',9)}}}};
  class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const context={Date:Clock,Intl,Map,AbortController,URLSearchParams,console,
    document:{hidden:false,body:{dataset:{view:'home'}},getElementById:get,addEventListener:(name,fn)=>events[name]=fn},
    window:{addEventListener:(name,fn)=>windowEvents[name]=fn},
    localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
    setInterval:(fn,delay)=>intervals.push({fn,delay}),
    setTimeout:(fn,delay)=>{const id=++seq;timers.set(id,{fn,when:now+delay});return id;},
    clearTimeout:id=>timers.delete(id),
    fetch:async address=>{const url=new URL(address);calls.push(url);return handler?handler(url,calls.length):response(data(url.hostname.startsWith('archive')?url.searchParams.get('start_date'):'2026-11-06'));}
  };
  if(snapshot)context.COIL_WEATHER_SNAPSHOT=snapshotData;
  vm.createContext(context);vm.runInContext(helpers,context);vm.runInContext(source,context);
  return {get,calls,context,events,windowEvents,intervals,store,
    click:()=>get('ce-retry').listeners.click(),
    setTime:value=>now=Date.parse(value),
    async advance(ms){now+=ms;for(const [id,t]of [...timers])if(t.when<=now){timers.delete(id);t.fn();}await flush();}
  };
}
test('first-visit snapshot renders synchronously before route entry, without archive requests',async()=>{
  const h=harness();assert.equal(h.get('ce-today-temp').textContent,'12.0 °C');assert.equal(h.get('ce-past-temp').textContent,'8.0 °C');assert.equal(h.get('ce-difference').textContent,'+4.00 °C');
  await flush();assert.equal(h.calls.length,0);
  h.windowEvents['app:view']({detail:{id:'problem'}});await flush();assert.equal(h.calls.length,0);
});
test('refresh retains the visible comparison and combines rapid clicks into one request',async()=>{
  let release;const h=harness({handler:()=>new Promise(resolve=>release=resolve)});await flush();
  const first=h.click(),second=h.click();assert.strictEqual(first,second);assert.equal(h.calls.length,1);assert.equal(h.get('ce-today-temp').textContent,'12.0 °C');assert.equal(h.get('ce-past-temp').textContent,'8.0 °C');
  release(response(data('2026-11-06',13)));await first;assert.equal(h.get('ce-today-temp').textContent,'13.0 °C');assert.equal(h.get('ce-difference').textContent,'+5.00 °C');assert.equal(h.calls.filter(u=>u.hostname.startsWith('archive')).length,0);
});
test('stale forecast appears immediately; failed refresh keeps it and reports saved data',async()=>{
  const h=harness({forecastAge:3600000,handler:()=>response({error:true,reason:'Too many concurrent requests'},429)});
  assert.equal(h.get('ce-today-temp').textContent,'12.0 °C');await flush();
  await h.advance(1000);await h.advance(2000);await flush();
  assert.equal(h.calls.length,3);assert.equal(h.get('ce-today-temp').textContent,'12.0 °C');assert.match(h.get('ce-today-status').textContent,/Showing saved data/);assert.equal(h.get('ce-retry').disabled,false);
});
test('cold requests retry a busy archive and start before The evidence is opened',async()=>{
  let archive=0;const h=harness({snapshot:false,handler:u=>{
    if(u.hostname.startsWith('archive')&&++archive===1)return response({error:true,reason:'Too many concurrent requests'},429);
    return response(data(u.hostname.startsWith('archive')?u.searchParams.get('start_date'):'2026-11-06',u.hostname.startsWith('archive')?8:12));
  }});await flush();assert.equal(h.get('ce-today-temp').textContent,'12.0 °C');await h.advance(1000);assert.equal(h.get('ce-past-temp').textContent,'8.0 °C');assert.equal(archive,2);
});
test('city changes cannot be overwritten by a late response for the previous city',async()=>{
  let release;const h=harness({handler:()=>new Promise(resolve=>release=resolve)});await flush();const old=h.click();
  h.get('ce-city').value='paris';await h.get('ce-city').listeners.change();assert.equal(h.get('ce-today-temp').textContent,'15.0 °C');
  release(response(data('2026-11-06',99)));await old;assert.equal(h.get('ce-today-temp').textContent,'15.0 °C');
});
test('local midnight updates both dates; previous-day measurements do not masquerade as today',async()=>{
  const h=harness({handler:u=>response(data(u.hostname.startsWith('archive')?u.searchParams.get('start_date'):'2026-11-07',u.hostname.startsWith('archive')?7:11))});await flush();
  h.setTime('2026-11-06T23:00:00Z');h.intervals.find(i=>i.delay===1000).fn();await flush();
  assert.match(h.get('ce-today-date').textContent,/7 November 2026/);assert.match(h.get('ce-past-date').textContent,/7 November 2016/);assert.equal(h.get('ce-today-temp').textContent,'11.0 °C');assert.equal(h.get('ce-past-temp').textContent,'7.0 °C');
});
test('returning to a hidden tab checks the new date immediately',async()=>{
  const h=harness({handler:u=>response(data(u.hostname.startsWith('archive')?u.searchParams.get('start_date'):'2026-11-07'))});await flush();h.setTime('2026-11-07T08:00:00Z');h.events.visibilitychange();await flush();assert.match(h.get('ce-today-date').textContent,/7 November 2026/);
});
