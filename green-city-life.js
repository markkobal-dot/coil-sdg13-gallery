/* Visual journeys derived from the city; never persisted or used to award service cover. */
(function(host){
  'use strict';
  const destinations=new Set(['house','apartment','park','garden','plaza','playground','market','school','library','office','clinic','hospital','bus','tram','metro','bikeshare','ferry','stadium','marina']);
  const serviceKinds={clinic:'care',hospital:'care',firestation:'fire',recycling:'waste',waterworks:'utility'};
  const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function plan(C,state,analysis,{walkers=72,services=6}={}){
    const result={walkers:[],services:[]};
    if(state.population<=0||!analysis.roads.size)return result;
    const roads=analysis.roads,trees=new Map();
    const access=(cell,i)=>{
      const plots=C.footprint(cell.type,i,cell.rotation);
      return [...new Set(plots.flatMap(j=>roads.has(j)?[j]:C.neighbours(j).filter(k=>roads.has(k))))].sort((a,b)=>a-b);
    };
    const buildings=[];
    state.cells.forEach((cell,i)=>{if(cell&&cell.anchor===undefined){const entries=access(cell,i);if(entries.length)buildings.push({i,type:cell.type,entries});}});
    const homes=buildings.filter(b=>['house','apartment'].includes(b.type));
    if(!homes.length)return result;
    function tree(start){
      if(trees.has(start))return trees.get(start);
      const parents=new Map([[start,-1]]),distances=new Map([[start,0]]),queue=[start];
      for(let head=0;head<queue.length;head++)for(const next of C.neighbours(queue[head]))if(roads.has(next)&&!parents.has(next)){
        parents.set(next,queue[head]);distances.set(next,distances.get(queue[head])+1);queue.push(next);
      }
      const value={parents,distances};trees.set(start,value);return value;
    }
    function journey(from,to,maxLength){
      let best=null;
      for(const start of from.entries){const t=tree(start);for(const end of to.entries){
        const length=t.distances.get(end);
        if(length>=1&&length<=maxLength&&(!best||length<best.length))best={start,end,length,t};
      }}
      if(!best)return null;
      const path=[];for(let i=best.end;i!==-1;i=best.t.parents.get(i))path.push(i);
      return path.reverse();
    }
    const places=buildings.filter(b=>destinations.has(b.type)),walkingRoutes=[];
    for(const home of homes){
      const nearby=places.filter(b=>b.i!==home.i).map(place=>({place,distance:Math.abs(home.i%C.size-place.i%C.size)+Math.abs(Math.floor(home.i/C.size)-Math.floor(place.i/C.size))})).sort((a,b)=>Number(['house','apartment'].includes(a.place.type))-Number(['house','apartment'].includes(b.place.type))||a.distance-b.distance||a.place.i-b.place.i);
      const kinds=new Set();let found=0;
      for(const {place} of nearby){
        if(kinds.has(place.type))continue;
        const path=journey(home,place,18);if(!path)continue;
        walkingRoutes.push({from:home.i,to:place.i,purpose:place.type,path});kinds.add(place.type);
        if(++found===3)break;
      }
    }
    const limit=Math.min(Math.max(0,Math.floor(walkers)),Math.ceil(state.population/16),walkingRoutes.length*3);
    for(let n=0;n<limit;n++){
      const route=walkingRoutes[n%walkingRoutes.length];
      result.walkers.push({...route,id:n,phase:hash(n+route.from),speed:.2+hash(n+19)*.07});
    }
    const stations=buildings.filter(b=>serviceKinds[b.type]),byKind=new Map();
    // Prefer one of each available service before adding a second vehicle of a kind.
    for(const station of stations){const kind=serviceKinds[station.type];if(!byKind.has(kind))byKind.set(kind,[]);byKind.get(kind).push(station);}
    const stationOrder=[];for(let n=0;n<2;n++)for(const list of byKind.values())if(list[n])stationOrder.push(list[n]);
    for(const station of stationOrder){
      if(result.services.length>=Math.max(0,Math.min(6,Math.floor(services))))break;
      const nearby=homes.filter(home=>C.distance(home.i,station.i)<=8),options=[];
      for(const home of nearby){const path=journey(station,home,24);if(path)options.push({home,path});}
      options.sort((a,b)=>Math.abs(a.path.length-8)-Math.abs(b.path.length-8)||a.home.i-b.home.i);
      if(options.length){const {home,path}=options[0];result.services.push({kind:serviceKinds[station.type],from:station.i,to:home.i,path,speed:.5,phase:hash(station.i)});}
    }
    return result;
  }
  function offsetPath(path,size,lane){
    const points=path.map(i=>({x:i%size-(size-1)/2,z:Math.floor(i/size)-(size-1)/2}));
    return points.map((p,n)=>{
      const a=points[Math.max(0,n-1)],b=points[Math.min(points.length-1,n+1)];
      const dx1=p.x-a.x,dz1=p.z-a.z,dx2=b.x-p.x,dz2=b.z-p.z;
      // At a corner, the two lane offsets meet inside the road tile.
      const dx=dx1||dx2,dz=dz1||dz2;
      return {x:p.x+dz*lane,z:p.z-dx*lane};
    });
  }
  function compile(path,size,lane,speed){
    if(path.length<2||speed<=0)return {segments:[],duration:0};
    const outward=offsetPath(path,size,lane),points=[...outward,...offsetPath([...path].reverse(),size,lane)],segments=[];
    let duration=0;
    for(let n=0;n<points.length;n++){
      const a=points[n],b=points[(n+1)%points.length],length=Math.hypot(b.x-a.x,b.z-a.z);
      if(length<.00001)continue;
      const hold=n===outward.length-1||n===points.length-1?1.5:0,time=length/speed;
      segments.push({a,b,start:duration,end:duration+hold+time,hold,time,angle:Math.atan2(b.x-a.x,b.z-a.z)});duration+=hold+time;
    }
    return {segments,duration};
  }
  function sample(route,seconds,phase=0){
    if(!route.duration)return {x:0,z:0,angle:0,moving:false};
    const time=((seconds+phase*route.duration)%route.duration+route.duration)%route.duration;
    let low=0,high=route.segments.length-1;
    while(low<high){const mid=(low+high)>>1;if(time<route.segments[mid].end)high=mid;else low=mid+1;}
    const segment=route.segments[low],elapsed=time-segment.start-segment.hold,t=Math.max(0,Math.min(1,elapsed/segment.time));
    return {x:segment.a.x+(segment.b.x-segment.a.x)*t,z:segment.a.z+(segment.b.z-segment.a.z)*t,angle:segment.angle,moving:elapsed>0};
  }
  const api={plan,compile,sample};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityLife=api;
})(globalThis);
