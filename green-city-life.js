/* Visual journeys derived from the city; never persisted or used to award service cover. */
(function(host){
  'use strict';
  const destinations=new Set(['beach','beachbar','hotel','resorthotel','house','apartment','park','garden','plaza','playground','market','school','library','office','clinic','hospital','bus','tram','metro','bikeshare','ferry','stadium','marina']);
  const workplaces=new Set(['factory','coal','office','officepark','ecofactory','gamestudio','ailab','heavyindustry','refinery','heat','battery','recycling','waterworks','geothermal','solarfarm','airport','internationalairport','cargoport','containerport']);
  const activity=type=>workplaces.has(type)?'work':['house','apartment','luxuryhouse','luxuryapartment'].includes(type)?'visit':['bus','tram','metro','bikeshare','ferry'].includes(type)?'transport':['school','library'].includes(type)?'learning':['clinic','hospital','regionalhospital'].includes(type)?'care':type==='market'?'shopping':'leisure';
  const serviceKinds={clinic:'care',hospital:'care',regionalhospital:'care',firestation:'fire',recycling:'waste',waterworks:'utility'};
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
    state.cells.forEach((cell,i)=>{if(cell&&cell.anchor===undefined){const foot=(cell.type==='beach'?analysis.beachAccess?.beaches:cell.type==='beachbar'?analysis.beachAccess?.bars:[])?.find(b=>b.i===i&&b.accessible),entries=foot?[foot.road]:access(cell,i);if(entries.length)buildings.push({i,type:cell.type,entries});}});
    const homes=buildings.filter(b=>['house','apartment','luxuryhouse','luxuryapartment'].includes(b.type)&&analysis.homeProfiles.some(h=>h.i===b.i&&h.residents>0));
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
    const jobs=(analysis.workplaces||[]).filter(w=>w.linked&&w.filled>0).map(w=>({...w,jobs:w.filled,building:buildings.find(b=>b.i===w.i)})).filter(w=>w.building),homeJobs=new Map();
    const places=buildings.filter(b=>(destinations.has(b.type)||workplaces.has(b.type)||['luxuryhouse','luxuryapartment','regionalhospital'].includes(b.type))&&(!workplaces.has(b.type)||jobs.some(w=>w.i===b.i))&&(!['house','apartment','luxuryhouse','luxuryapartment'].includes(b.type)||homes.some(h=>h.i===b.i))),walkingRoutes=[];
    for(const home of homes){
      homeJobs.set(home.i,jobs.filter(w=>w.i===home.i||journey(home,w.building,C.size*3)));
      const nearby=places.filter(b=>b.i!==home.i).map(place=>({place,distance:Math.abs(home.i%C.size-place.i%C.size)+Math.abs(Math.floor(home.i/C.size)-Math.floor(place.i/C.size))})).sort((a,b)=>Number(['house','apartment'].includes(a.place.type))-Number(['house','apartment'].includes(b.place.type))||a.distance-b.distance||a.place.i-b.place.i);
      const kinds=new Set();let found=0;
      for(const {place} of nearby){
        const purpose=activity(place.type);if(kinds.has(purpose))continue;
        const path=journey(home,place,purpose==='work'?32:18);if(!path)continue;
        walkingRoutes.push({from:home.i,to:place.i,purpose:place.type,activity:purpose,path});kinds.add(purpose);
        if(++found===7)break;
      }
    }
    const limit=Math.min(Math.max(0,Math.floor(walkers)),Math.ceil(state.population/16),walkingRoutes.length*3);
    const activities=new Map();for(const route of walkingRoutes){if(!activities.has(route.activity))activities.set(route.activity,[]);activities.get(route.activity).push(route);}
    const groups=[...activities.values()];
    for(let n=0;n<limit;n++){
      const group=groups[n%groups.length],slots=Math.ceil((limit-n%groups.length)/groups.length),weights=group.map(r=>analysis.homeProfiles.find(h=>h.i===r.from)?.residents||0),totalWeight=weights.reduce((sum,v)=>sum+v,0);let target=(Math.floor(n/groups.length)+(n%groups.length)/groups.length)/slots*totalWeight;
      const route=group.find((r,index)=>(target-=weights[index])<=0)||group.at(-1);
      const options=homeJobs.get(route.from)||[],total=options.reduce((sum,w)=>sum+w.jobs,0);let workplace=null;
      if(route.activity==='work'&&options.some(w=>w.i===route.to))workplace=route.to;
      else if(hash(route.from*13+n*17)<analysis.employment/100&&total){let choice=hash(route.from*7+n*31)*total;workplace=options.find(w=>(choice-=w.jobs)<0)?.i??options.at(-1).i;}
      const home=homes.find(h=>h.i===route.from),local=walkingRoutes.filter(r=>r.from===home.i),student=route.activity==='learning'&&route.purpose==='school';
      if(student)workplace=null;
      const employer=jobs.find(w=>w.i===workplace),workPath=employer&&journey(home,employer.building,C.size*3);
      const work=workPath?{from:home.i,to:workplace,purpose:employer.type,activity:'work',path:workPath}:null;
      const school=student?route:null,outings=local.filter(r=>!['work','learning'].includes(r.activity));
      const outing=!['work','learning'].includes(route.activity)?route:outings.length?outings[Math.floor(hash(n+home.i)*outings.length)]:null;
      for(const trip of [school||work,outing])if(['beach','beachbar'].includes(trip?.purpose)){const access=(trip.purpose==='beach'?analysis.beachAccess?.beaches:analysis.beachAccess?.bars)?.find(b=>b.i===trip.to);if(access?.path.length>1&&!trip.beachApproach){trip.beachApproach=true;trip.path=[...trip.path,...access.path.slice(1)];}}
      result.walkers.push({...route,id:n,workplace,student,itinerary:{primary:school||work,outing},phase:hash(n+route.from),speed:.14+hash(n+19)*.05});
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
    if(path.length<2||speed<=0)return {segments:[],duration:0,origin:path.length?{x:path[0]%size-(size-1)/2+.44,z:Math.floor(path[0]/size)-(size-1)/2}:null};
    const outward=offsetPath(path,size,lane),points=[...outward,...offsetPath([...path].reverse(),size,lane)],segments=[];
    let duration=0,outboundEnd=0,returnStart=0,returnEnd=0;
    for(let n=0;n<points.length;n++){
      const a=points[n],b=points[(n+1)%points.length],length=Math.hypot(b.x-a.x,b.z-a.z);
      if(length<.00001)continue;
      if(n===outward.length-1)outboundEnd=duration;if(n===outward.length)returnStart=duration;if(n===points.length-1)returnEnd=duration;
      const hold=n===outward.length-1||n===points.length-1?1.5:0,time=length/speed;
      segments.push({a,b,start:duration,end:duration+hold+time,hold,time,angle:Math.atan2(b.x-a.x,b.z-a.z)});duration+=hold+time;
    }
    return {segments,duration,outboundEnd,returnStart,returnEnd};
  }
  function sample(route,seconds,phase=0){
    if(!route.duration)return {x:route.origin?.x||0,z:route.origin?.z||0,angle:0,moving:false};
    const time=((seconds+phase*route.duration)%route.duration+route.duration)%route.duration;
    let low=0,high=route.segments.length-1;
    while(low<high){const mid=(low+high)>>1;if(time<route.segments[mid].end)high=mid;else low=mid+1;}
    const segment=route.segments[low],elapsed=time-segment.start-segment.hold,t=Math.max(0,Math.min(1,elapsed/segment.time));
    return {x:segment.a.x+(segment.b.x-segment.a.x)*t,z:segment.a.z+(segment.b.z-segment.a.z)*t,angle:segment.angle,moving:elapsed>0};
  }

  function dayHour(seconds){return ((12+seconds/180*24)%24+24)%24;}
  function trafficLevel(seconds){const h=dayHour(seconds);return h<6||h>=22?.18:h<10||h>=15&&h<19?1:.62;}
  function routine(person,seconds){
    const h=dayHour(seconds),shift=person.phase*1.8,primary=person.itinerary?.primary,outing=person.itinerary?.outing;
    const home={visible:false,at:'home',location:person.from,label:h<6||h>=22?'At home for the night':'At home',trip:null};
    function excursion(trip,start,outbound,stay,inbound,label){
      if(!trip||h<start||h>=start+outbound+stay+inbound)return null;
      const elapsed=h-start;
      if(elapsed<outbound)return {visible:true,at:'outbound',location:trip.to,label,trip,progress:elapsed/outbound};
      if(elapsed<outbound+stay)return {visible:false,at:'destination',location:trip.to,label:trip.activity==='work'?'At work':trip.activity==='learning'?'At the learning centre':trip.activity==='shopping'?'Shopping locally':trip.activity==='visit'?'Visiting neighbours':trip.activity==='care'?'At a healthcare appointment':'Enjoying time outside',trip,progress:1};
      return {visible:true,at:'returning',location:person.from,label:'Walking home',trip,progress:(elapsed-outbound-stay)/inbound};
    }
    const morning=excursion(primary,6.5+shift,2,person.student?4.5:5.5,1.5,person.student?'Walking to school':'Commuting to work');if(morning)return morning;
    const afternoon=excursion(outing,(primary?17:10)+person.phase*1.2,1.1,1.6,1.1,outing?.activity==='shopping'?'Walking to the shops':outing?.activity==='visit'?'Visiting neighbours':outing?.activity==='care'?'Walking to an appointment':'Heading out locally');
    return afternoon||home;
  }
  function sampleRoutine(person,seconds){
    const status=routine(person,seconds),trip=status.trip,route=trip?.route;
    if(!route)return {...sample(person.route,0),...status,moving:false};
    const t=status.at==='returning'?route.returnStart+status.progress*(route.returnEnd-route.returnStart):status.progress*route.outboundEnd;
    return {...sample(route,t),...status,moving:status.visible};
  }

  // The daily routine decides when to leave; real route time controls walking pace.
  // A long commute may finish later, rather than accelerating to catch the clock.
  function sampleWalking(person,seconds,dt){
    const scheduled=routine(person,seconds),normal=sampleRoutine(person,seconds);
    const start=(trip,returning)=>person.walk={trip,returning,clock:0,complete:false};
    let walk=person.walk;
    if(!walk){if(!scheduled.visible||!scheduled.trip?.route)return normal;walk=start(scheduled.trip,scheduled.at==='returning');}
    if(walk.complete){
      if(!walk.returning){
        if(scheduled.at==='home'||scheduled.at==='returning'||scheduled.visible&&scheduled.trip!==walk.trip)walk=start(walk.trip,true);
        else return {...normal,visible:false,moving:false,at:'destination',trip:walk.trip,location:walk.trip.to,label:walk.trip.activity==='work'?'At work':walk.trip.activity==='learning'?'At the learning centre':'At the destination'};
      }else if(scheduled.visible&&scheduled.at==='outbound'&&scheduled.trip?.route)walk=start(scheduled.trip,false);
      else return {...normal,visible:false,moving:false,at:'home',location:person.from,label:'At home'};
    }
    const route=walk.trip.route,begin=walk.returning?route.returnStart:0,end=walk.returning?route.returnEnd:route.outboundEnd;
    walk.clock=Math.min(Math.max(0,end-begin),walk.clock+Math.max(0,dt||0));
    const position=sample(route,begin+walk.clock);walk.complete=walk.clock>=end-begin;
    return {...position,visible:!walk.complete,moving:!walk.complete,at:walk.returning?'returning':'outbound',location:walk.returning?person.from:walk.trip.to,trip:walk.trip,label:walk.returning?'Walking home':walk.trip.activity==='work'?'Walking to work':walk.trip.activity==='learning'?'Walking to school':'Walking locally'};
  }
  function lanePosition(from,to,t,size,lane=.2){const ax=from%size,az=Math.floor(from/size),dx=to%size-ax,dz=Math.floor(to/size)-az;return {x:ax+dx*t-(size-1)/2+dz*lane,z:az+dz*t-(size-1)/2-dx*lane,angle:Math.atan2(dx,dz)};}
  function trafficBlocked(p,angle,others,gap=.65,id=100){
    return others.some(o=>{if(o.id===id||o.visible===false)return false;const dx=o.x-p.x,dz=o.z-p.z,ahead=dx*Math.sin(angle)+dz*Math.cos(angle),side=Math.abs(dx*Math.cos(angle)-dz*Math.sin(angle)),same=Math.cos((o.angle??angle)-angle)>.65;return ahead>-.03&&ahead<gap&&side<.28&&(same||(o.id??0)<id);});
  }
  function transitLines(C,state,a){
    const lines=a.transport.routes.filter(r=>r.active);if((state.routes||[]).some(r=>r.type==='bus'))return lines;
    const stops=[...a.roads].filter(i=>state.cells[i]?.type==='bus').sort((a,b)=>a-b).slice(0,6);if(stops.length<2)return lines;
    const path=[];for(let n=1;n<stops.length;n++){const leg=C.roadPath(a.roads,stops[n-1],stops[n]);if(!leg.length)return lines;path.push(...(n===1?leg:leg.slice(1)));}
    return [...lines,{id:0,name:'Local bus',type:'bus',colour:'#548b76',stops,path,active:true}];
  }
  function connectTransit(C,people,lines,roads){
    const cache=new Map(),path=(from,to)=>{const key=from+':'+to;if(!cache.has(key))cache.set(key,C.roadPath(roads,from,to));return cache.get(key);};
    function offer(trip,returning,speed){
      const from=returning?trip.path.at(-1):trip.path[0],to=returning?trip.path[0]:trip.path.at(-1);let best=null;
      for(const line of lines)for(const board of line.stops)for(const exit of line.stops){if(board===exit)continue;const approach=path(from,board),egress=path(exit,to),a=line.path.indexOf(board),b=line.path.indexOf(exit);if(!approach.length||!egress.length||a<0||b<0||approach.length>7||egress.length>7)continue;
        const cost=approach.length+egress.length+Math.abs(b-a)*.2;if(cost>trip.path.length+4||best&&cost>=best.cost)continue;
        const segment=a<b?line.path.slice(a,b+1):line.path.slice(b,a+1).reverse();best={line:line.id,name:line.name,board,exit,direction:a<b?1:-1,cost,approach,egress,path:[...approach,...segment.slice(1),...egress.slice(1)],walkTo:compile(approach,C.size,.44,speed),walkFrom:compile(egress,C.size,.44,speed)};
      }return best;
    }
    for(const person of people){if(person.beachCar)continue;person.ride=null;for(const trip of Object.values(person.itinerary||{}))if(trip)trip.transit={outbound:offer(trip,false,person.speed||.17),returning:offer(trip,true,person.speed||.17)};}
  }
  function sampleRide(person,daySeconds,dt){
    const normal=sampleRoutine(person,daySeconds),status=routine(person,daySeconds),trip=status.trip,key=trip?trip.to+':'+status.at:'';
    const plan=trip?.transit?.[status.at==='returning'?'returning':'outbound'];
    if((!person.ride||person.ride.phase==='complete'&&person.ride.key!==key)&&status.visible&&plan){person.walk=null;person.ride={key,phase:'walkTo',plan,trip,returning:status.at==='returning',clock:0};}
    const ride=person.ride;if(!ride)return sampleWalking(person,daySeconds,dt);
    if(ride.phase==='complete'){if(ride.key!==key){person.ride=null;return sampleWalking(person,daySeconds,0);}return {...normal,visible:false,moving:false,at:ride.returning?'home':'destination',location:ride.returning?person.from:ride.trip.to,label:ride.returning?'At home':ride.trip.activity==='work'?'At work':ride.trip.activity==='learning'?'At the learning centre':'At the destination'};}
    const direction=ride.returning?1:-1,position=ride.phase==='walkFrom'?ride.plan.walkFrom:ride.plan.walkTo;
    const common={...status,trip:{...ride.trip,path:ride.plan.path},location:ride.returning?person.from:ride.trip.to};
    if(ride.phase==='aboard'){const g=ride.vehicle.g;return {...common,x:g.position.x,z:g.position.z,angle:g.rotation.y,moving:false,visible:false,at:'aboard',label:'On '+ride.plan.name+' · getting off at '+globalThis.GreenCity.label(ride.plan.exit)};}
    if(ride.phase==='waiting'){const p=sample(ride.plan.walkTo,ride.plan.walkTo.outboundEnd||0);return {...p,...common,visible:true,moving:false,at:'waiting',label:'Waiting for '+ride.plan.name};}
    ride.clock+=dt;const end=position.outboundEnd||0,p=sample(position,Math.min(ride.clock,end));
    if(ride.clock>=end){if(ride.phase==='walkTo'){ride.phase='waiting';ride.clock=0;}else ride.phase='complete';}
    return {...p,...common,visible:ride.phase!=='complete',moving:ride.phase!=='waiting'&&ride.phase!=='complete',at:'walking',label:ride.phase==='walkFrom'?(ride.returning?'Walking home from the stop':'Walking from the stop'):'Walking to '+ride.plan.name};
  }
  function transitStop(people,vehicle,stop,direction){
    vehicle.passengers??=[];let alighted=0,boarded=0;
    vehicle.passengers=vehicle.passengers.filter(person=>{if(person.ride?.plan.exit!==stop)return true;person.ride.phase='walkFrom';person.ride.clock=0;person.ride.vehicle=null;alighted++;return false;});
    for(const person of people){const ride=person.ride;if(!ride||ride.phase!=='waiting'||ride.plan.line!==vehicle.id||ride.plan.board!==stop||ride.plan.direction!==direction||vehicle.passengers.length>=(vehicle.capacity||12))continue;ride.phase='aboard';ride.vehicle=vehicle;vehicle.passengers.push(person);boarded++;}
    return {boarded,alighted};
  }

  // Finite, physical parking spaces. Journey state stays outside the saved city.
  function pointRoute(points,speed){
    const segments=[];let duration=0;
    for(let n=1;n<points.length;n++){const a=points[n-1],b=points[n],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.00001)continue;const time=length/speed;segments.push({a,b,start:duration,end:duration+time,hold:0,time,angle:Math.atan2(b.x-a.x,b.z-a.z)});duration+=time;}
    const end=points.at(-1)||{x:0,z:0},angle=segments.at(-1)?.angle||0;
    segments.push({a:end,b:end,start:duration,end:duration+100000,hold:100000,time:1,angle});
    return {segments,duration:duration+100000,outboundEnd:duration,origin:points[0]||end};
  }
  function parkingSlot(C,lot,slot){
    const columns=lot.capacity/2,row=Math.floor(slot/columns),x=(slot%columns-(columns-1)/2)*1.65/columns,z=row?.61:-.61,theta=(lot.rotation||0)*Math.PI/2;
    return {x:lot.i%C.size-(C.size-1)/2+.5+x*Math.cos(theta)-z*Math.sin(theta),z:Math.floor(lot.i/C.size)-(C.size-1)/2+.5+x*Math.sin(theta)+z*Math.cos(theta),angle:(row?0:Math.PI)-theta};
  }
  function attachParking(C,state,a,people,limit=8){
    const lots=(a.beachAccess?.parking||[]).filter(p=>p.connected&&p.beaches.length),reserved=new Map(),centre=i=>({x:i%C.size-(C.size-1)/2,z:Math.floor(i/C.size)-(C.size-1)/2});let assigned=0;
    for(const person of people){
      if(assigned>=limit)break;const home=state.cells[person.from];if(!home)continue;
      const entries=[...new Set(C.footprint(home.type,person.from,home.rotation).flatMap(i=>C.neighbours(i).filter(j=>a.roads.has(j))))];let best=null;
      for(const lot of lots){if((reserved.get(lot.i)||0)>=lot.capacity)continue;for(const start of entries)for(const end of lot.entries){const path=C.roadPath(a.roads,start,end);if(path.length&&(!best||path.length<best.path.length))best={lot,path};}}
      if(!best)continue;const {lot,path}=best,slot=reserved.get(lot.i)||0;reserved.set(lot.i,slot+1);const beach=lot.beaches[assigned%lot.beaches.length],bay=parkingSlot(C,lot,slot),middle={x:lot.i%C.size-(C.size-1)/2+.5,z:Math.floor(lot.i/C.size)-(C.size-1)/2+.5};
      const outward=path.length>1?offsetPath(path,C.size,.2):[centre(path[0])],inward=path.length>1?offsetPath([...path].reverse(),C.size,.2):[centre(path[0])];
      const theta=(lot.rotation||0)*Math.PI/2,cos=Math.cos(theta),sin=Math.sin(theta),local=p=>({x:(p.x-middle.x)*cos+(p.z-middle.z)*sin,z:-(p.x-middle.x)*sin+(p.z-middle.z)*cos}),world=p=>({x:middle.x+p.x*cos-p.z*sin,z:middle.z+p.x*sin+p.z*cos}),road=local(centre(path.at(-1))),side=Math.abs(road.z)>Math.abs(road.x),edge=side?{x:(road.x<0?-1:1)*.89,z:Math.sign(road.z)*.96}:{x:Math.sign(road.x)*.96,z:road.z<0?-.27:.27},outside=world(side?{...edge,z:Math.sign(road.z)*1.35}:{...edge,x:Math.sign(road.x)*1.35}),gate=world(edge),aisle=world({x:side?edge.x:Math.sign(road.x)*.88,z:0}),column=world({x:local(bay).x,z:0});
      const door={x:bay.x+Math.cos(bay.angle)*.18,z:bay.z-Math.sin(bay.angle)*.18},walk=[door,middle,...beach.path.map(centre)];
      person.beachCar={size:C.size,roads:a.roads,lot:lot.i,beach:beach.i,slot,bay,door,roadPath:path,driveOut:pointRoute(outward,.85),park:pointRoute([outward.at(-1),outside,gate,aisle,column,bay],.42),walkOut:pointRoute(walk,person.speed),walkBack:pointRoute([...walk].reverse(),person.speed),unpark:pointRoute([bay,column,aisle,gate,outside,inward[0]],.42),driveHome:pointRoute(inward,.85)};
      person.itinerary.primary=null;person.itinerary.outing={from:person.from,to:beach.i,purpose:'beach',activity:'leisure',path:[...path,...beach.path]};assigned++;
    }
  }
  function sampleParking(person,seconds,dt,obstacles=[]){
    const plan=person.beachCar,hour=dayHour(seconds),home={...sample(person.route,0),visible:false,moving:false,at:'home',location:person.from,label:hour<6||hour>=22?'At home for the night':'At home'};
    let visit=person.carVisit;if(visit?.phase==='complete'&&hour<6)person.carVisit=visit=null;
    if(!visit){if(hour<10+person.phase*1.2||hour>=17||trafficBlocked(sample(plan.driveOut,0),sample(plan.driveOut,0).angle,obstacles,.8,2000+person.id)){person.carCurrent=null;return home;}visit=person.carVisit={phase:'driving',clock:0};}
    const movingCar=['driving','parking','unparking','drivingHome'].includes(visit.phase),parked=['alighting','walkTo','atBeach','walkBack','boarding'].includes(visit.phase);
    const routes={driving:'driveOut',parking:'park',walkTo:'walkOut',walkBack:'walkBack',unparking:'unpark',drivingHome:'driveHome'},route=plan[routes[visit.phase]];
    let p=route?sample(route,visit.clock):visit.phase==='alighting'||visit.phase==='boarding'?{...plan.door,angle:plan.bay.angle}:visit.phase==='atBeach'?sample(plan.walkOut,plan.walkOut.outboundEnd):home;
    const onRoad=p=>plan.roads.has(Math.round(p.z+(plan.size-1)/2)*plan.size+Math.round(p.x+(plan.size-1)/2)),roadPhase=visit.phase==='driving'||visit.phase==='drivingHome',nextClock=visit.clock+Math.max(0,dt||0),next=route&&sample(route,Math.min(nextClock,route.outboundEnd));
    if(!movingCar||!(roadPhase||onRoad(next))||!trafficBlocked(next,next.angle,obstacles,.72,2000+person.id))visit.clock=nextClock;
    if(route)p=sample(route,Math.min(visit.clock,route.outboundEnd));
    person.carCurrent=movingCar?{...p,visible:true,moving:true,road:onRoad(p),parked:false,lot:plan.lot,door:0}:parked?{...plan.bay,visible:true,moving:false,road:false,parked:true,lot:plan.lot,door:visit.phase==='alighting'||visit.phase==='boarding'?Math.sin(Math.min(1,visit.clock/.9)*Math.PI)*.8:0}:null;
    const labels={driving:'Driving to the beach',parking:'Parking',alighting:'Getting out of the car',walkTo:'Walking to the beach',atBeach:'At the beach',walkBack:'Walking back to the car',boarding:'Getting into the car',unparking:'Leaving the parking lot',drivingHome:'Driving home',complete:'At home'};
    const result={...p,visible:['alighting','walkTo','atBeach','walkBack','boarding'].includes(visit.phase),moving:visit.phase==='walkTo'||visit.phase==='walkBack',at:visit.phase,location:visit.phase==='drivingHome'||visit.phase==='complete'?person.from:plan.beach,label:labels[visit.phase],trip:person.itinerary.outing};
    const transitions={driving:'parking',parking:'alighting',alighting:'walkTo',walkTo:'atBeach',atBeach:'walkBack',walkBack:'boarding',boarding:'unparking',unparking:'drivingHome',drivingHome:'complete'};
    if(visit.phase!=='complete'&&(route?visit.clock>=route.outboundEnd:visit.clock>=(visit.phase==='atBeach'?18:.9))){visit.phase=transitions[visit.phase];visit.clock=0;}
    return result;
  }

  function regionalOperations(C,state,a,{only}={}){
    const kinds=new Set(['cargoport','containerport','ferry','marina','airport','internationalairport']),terrain=C.terrainFor(state),centre=i=>({x:i%C.size-(C.size-1)/2,z:Math.floor(i/C.size)-(C.size-1)/2});
    return state.cells.flatMap((cell,i)=>{
      if(!cell||cell.anchor!==undefined||!kinds.has(cell.type)||only!==undefined&&only!==i)return [];
      const kind=['airport','internationalairport'].includes(cell.type)?'air':'sea',work=a.workplaces.find(w=>w.i===i),connection=a.connections.find(c=>c.i===i),filled=work?.filled||0,linked=!!work?.linked,[w,h]=C.types[cell.type].footprint||[1,1],[rw,rh]=C.dimensions(cell.type,cell.rotation),p=centre(i),base={i,type:cell.type,kind,w,h,rotation:cell.rotation||0,x:p.x+(rw-1)/2,z:p.z+(rh-1)/2,filled};
      const customers=connection?.customers??(cell.type==='ferry'?Math.round(a.ridership/Math.max(1,a.counts.ferry||1)):0),usage=Math.max(0,Math.min(1,(connection?.utilisation??customers/60)*(filled/Math.max(1,work?.positions||0))));
      let issue=!linked?'Reconnect a road':!filled?'Needs staff':!customers?'Waiting for demand':'',path=[];
      if(kind==='sea'){
        path=C.seaRoute(state,i,terrain);if(!path.length&&!issue)issue='No open-water route';
      }
      const op={...base,customers,usage,active:!issue,issue,path};
      if(kind==='sea'&&path.length){const points=path.map(centre),edge=path[0],first=points[0],outside={x:first.x+(edge%C.size===0?-5:edge%C.size===C.size-1?5:0),z:first.z+(Math.floor(edge/C.size)===0?-5:Math.floor(edge/C.size)===C.size-1?5:0)};op.inbound=pointRoute([outside,...points],.55);op.outbound=pointRoute([...points].reverse().concat(outside),.55);op.pause=12;op.wait=12+48*(1-usage);}
      return [op];
    });
  }
  function regionalPoint(op,p){const angle=-op.rotation*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);return {x:op.x+p.x*c+p.z*s,z:op.z-p.x*s+p.z*c,y:.14+(p.y||0),angle:(p.angle||0)+angle};}
  function sampleRegional(op,seconds){
    if(!op.active)return {visible:false,label:op.issue,moving:false};
    if(op.kind==='sea'){
      const incoming=op.inbound.outboundEnd,outgoing=op.outbound.outboundEnd,cycle=incoming+op.pause+outgoing+op.wait,t=((seconds+incoming+2)%cycle+cycle)%cycle;
      if(t<incoming)return {...sample(op.inbound,t),y:-.085,visible:true,moving:true,phase:'arriving',label:op.type==='marina'?'Boat arriving':'Ship arriving'};
      if(t<incoming+op.pause)return {...sample(op.inbound,incoming),y:-.085,visible:true,moving:false,phase:'docked',label:['cargoport','containerport'].includes(op.type)?'Docked · unloading cargo':'Docked · boarding passengers'};
      if(t<incoming+op.pause+outgoing)return {...sample(op.outbound,t-incoming-op.pause),y:-.085,visible:true,moving:true,phase:'departing',label:op.type==='marina'?'Boat departing':'Ship departing'};
      return {visible:false,moving:false,phase:'away',label:'Waiting for the next vessel'};
    }
    const runway=-.36*(op.h/2),left=-op.w/2+.22,right=op.w/2-.22,gate={x:.7,z:-.02},threshold={x:left,z:runway},end={x:right,z:runway};
    const phases=[{name:'approach',duration:14,a:{x:left-7,z:runway,y:4.5},b:threshold,label:'Aircraft on approach'}, {name:'landing',duration:5,a:threshold,b:{x:.7,z:runway},label:'Landing'}, {name:'taxiIn',duration:4,a:{x:.7,z:runway},b:gate,label:'Taxiing to the gate'}, {name:'gate',duration:12,a:gate,b:gate,label:'At gate · boarding passengers'}, {name:'taxiOut',duration:5,a:gate,b:threshold,label:'Taxiing to the runway'}, {name:'takeoff',duration:6,a:threshold,b:end,label:'Taking off'}, {name:'climb',duration:12,a:end,b:{x:right+8,z:runway,y:4.5},label:'Aircraft departing'}, {name:'away',duration:12+48*(1-op.usage),a:end,b:end,label:'Waiting for the next flight'}];
    const cycle=phases.reduce((n,p)=>n+p.duration,0);let t=((seconds+25)%cycle+cycle)%cycle,phase=phases[0];for(const item of phases){phase=item;if(t<item.duration)break;t-=item.duration;}
    const u=Math.max(0,Math.min(1,t/phase.duration)),a=phase.a,b=phase.b,angle=phase.name==='gate'?Math.PI/2:Math.atan2(b.x-a.x,b.z-a.z),y=phase.name==='approach'?Math.sqrt(1-u)*4.5:phase.name==='climb'?Math.sqrt(u)*4.5:0;
    return {...regionalPoint(op,{x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,y,angle}),visible:phase.name!=='away',moving:!['gate','away'].includes(phase.name),phase:phase.name,label:phase.label,pitch:phase.name==='climb'?-.13:phase.name==='approach'?.08:0};
  }
  function regionalWorker(op,n,seconds){
    const air=op.kind==='air',points=air?[{x:.34,z:.05},{x:Math.min(op.w/2-.14,1.18),z:.05},{x:Math.min(op.w/2-.14,1.18),z:.17},{x:.34,z:.17}]:[{x:-op.w/2+.14,z:-op.h/2+.14},{x:-op.w/2+.14,z:op.h/2-.14},{x:op.w/2-.14,z:op.h/2-.14},{x:op.w/2-.14,z:-op.h/2+.14}];
    const segments=points.map((a,i)=>({a,b:points[(i+1)%points.length],length:Math.hypot(points[(i+1)%points.length].x-a.x,points[(i+1)%points.length].z-a.z)})),total=segments.reduce((sum,s)=>sum+s.length,0);let distance=(seconds*.15+n*total/3)%total,segment=segments[0];for(const s of segments){segment=s;if(distance<s.length)break;distance-=s.length;}const u=distance/Math.max(.001,segment.length),a=segment.a,b=segment.b;
    return {...regionalPoint(op,{x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,angle:Math.atan2(b.x-a.x,b.z-a.z)}),moving:true};
  }
  const api={regionalOperations,sampleRegional,regionalWorker,attachParking,parkingSlot,sampleParking,pointRoute,sampleWalking,lanePosition,trafficBlocked,transitLines,connectTransit,sampleRide,transitStop,plan,compile,sample,dayHour,trafficLevel,routine,sampleRoutine};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityLife=api;
})(globalThis);
