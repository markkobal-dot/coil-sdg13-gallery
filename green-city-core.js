/* Green City / simulation rules. Deterministic, browser-local teaching model. */
(function (host) {
  'use strict';
  const size = 28, maxPopulation=size*size*200;
  const metrics = ['Air quality', 'Renewable energy', 'Green spaces', 'Sustainable transport', 'Climate resilience'];
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const clamp = (value, low = 0, high = 100) => Math.max(low, Math.min(high, value));
  const policyDefaults = { tax:'balanced', freeTransit:false, cleanIndustry:false, residentialTax:10, businessTax:10, transitFare:2, utilityTariff:1, serviceBudget:100 };
  const policyRanges = { residentialTax:[6,18,1], businessTax:[5,18,1], transitFare:[0,5,.5], utilityTariff:[0,4,.5], serviceBudget:[70,140,5] };
  function policies(raw = {}) {
    const rate={low:8,balanced:10,high:14}[raw.tax] || 10;
    const p={tax:raw.tax||'balanced',cleanIndustry:raw.cleanIndustry??false,residentialTax:raw.residentialTax??rate,businessTax:raw.businessTax??rate,transitFare:raw.transitFare??(raw.freeTransit?0:2),utilityTariff:raw.utilityTariff??1,serviceBudget:raw.serviceBudget??100};
    p.freeTransit=p.transitFare===0;
    if(!['low','balanced','high'].includes(p.tax)||typeof p.cleanIndustry!=='boolean'||(raw.freeTransit!==undefined&&typeof raw.freeTransit!=='boolean'))throw new Error('Invalid city policies');
    for(const [key,[min,max,step]]of Object.entries(policyRanges))if(!Number.isFinite(p[key])||p[key]<min||p[key]>max||Math.abs(p[key]/step-Math.round(p[key]/step))>1e-7)throw new Error('Invalid '+key);
    return p;
  }
  const upgrades = {
    tree: { name: 'Street trees', category: 'Nature', cost: 50, upkeep: 1, site: 'land', icon: 'tree', effect: 'Shade · cleaner air', description: 'Plant a pocket of shade. Trees within three tiles of homes improve liveability and reduce local heat.' },
    park: { name: 'Neighbourhood park', category: 'Nature', cost: 120, upkeep: 3, site: 'land', icon: 'park', effect: 'Green space · wellbeing', description: 'A public green space with paths and seating. Place near homes to improve wellbeing and heat resilience.' },
    forest: { name: 'Urban woodland', category: 'Nature', cost: 180, upkeep: 2, site: 'land', icon: 'forest', effect: 'Strong cooling · biodiversity', description: 'A dense canopy that cools its surroundings. Uses a plot that could otherwise provide housing or jobs.' },
    wetland: { name: 'Rain garden', category: 'Nature', cost: 160, upkeep: 2, site: 'land', icon: 'wetland', effect: 'Flood protection · nature', description: 'Absorb stormwater and support wildlife. Extra resilience when built within two tiles of water.' },
    garden: { name: 'Community garden', category: 'Nature', cost: 90, upkeep: 1, site: 'land', icon: 'garden', effect: 'Local food · wellbeing', description: 'A shared growing space. Adds greenery, local jobs and a place for neighbours to meet.' },
    roof: { name: 'Green roof', category: 'Nature', cost: 100, upkeep: 1, site: 'roof', icon: 'roof', effect: 'Cooling without new land', description: 'Retrofit an existing building. Green roofs cool the building and add greenery without using another plot.' },
    solar: { name: 'Solar roof', category: 'Clean energy', cost: 150, upkeep: 2, site: 'roof', icon: 'solar', effect: '+12 clean power units', description: 'Add solar panels to a building roof. Upgrading the building also improves its rooftop installation.' },
    wind: { name: 'Wind turbine', category: 'Clean energy', cost: 220, upkeep: 4, site: 'land', icon: 'wind', effect: '+28 clean power units', description: 'Generate substantial clean power. Keep room for housing and green space when planning your energy district.' },
    battery: { name: 'Battery storage', category: 'Clean energy', cost: 180, upkeep: 3, site: 'land', icon: 'battery', unlock: 2, effect: 'Stores clean power · resilience', description: 'Makes renewable production more dependable and protects the city during energy-price events. Unlocks in month 3 or at 35 sustainability.' },
    heat: { name: 'District heat pump', category: 'Clean energy', cost: 240, upkeep: 4, site: 'land', icon: 'heat', unlock: 2, road: true, effect: 'Lower energy demand · jobs', description: 'An efficient neighbourhood heating centre. Needs road access and reduces the city’s power demand.' },
    road: { name: 'Local road', category: 'Transport', cost: 35, upkeep: 0, site: 'land', icon: 'road', effect: 'Connect homes and services', description: 'Expand the street network. Connected roads let new homes, workplaces and public services function. Use Road path for an entire route.' },
    bike: { name: 'Protected bike lane', category: 'Transport', cost: 80, upkeep: 1, site: 'road', icon: 'bike', effect: 'Active travel · network bonus', description: 'Upgrade a road with protected cycling. Connected neighbouring bike lanes work better than isolated lanes.' },
    bus: { name: 'Electric bus stop', category: 'Transport', cost: 180, upkeep: 5, site: 'road', icon: 'bus', effect: 'Public transport in 5 tiles', description: 'Serve nearby homes with electric public transport. Must connect to the main road network to provide coverage.' },
    tram: { name: 'Tram station', category: 'Transport', cost: 300, upkeep: 7, site: 'road', icon: 'tram', unlock: 2, effect: 'High-capacity transport', description: 'A higher-capacity transit investment with wider coverage. Unlocks in month 3 or at 35 sustainability.' },
    ev: { name: 'EV charging hub', category: 'Transport', cost: 100, upkeep: 2, site: 'road', icon: 'ev', effect: 'Cleaner local travel', description: 'Convert a road tile into a charging hub. Complements cycling and public transport.' },
    house: { name: 'Eco homes', category: 'Community', cost: 180, upkeep: 2, site: 'land', icon: 'house', road: true, effect: '+40 resident capacity', description: 'Build efficient, low-rise homes beside a connected road. Residents move in when you advance the month.' },
    apartment: { name: 'Mixed-use apartments', category: 'Community', cost: 340, upkeep: 5, site: 'land', icon: 'apartment', road: true, unlock: 2, effect: '+100 capacity · +18 jobs', description: 'House more people on a single plot, with workspaces below. Needs road access; unlocks in month 3 or at 35 sustainability.' },
    school: { name: 'Learning centre', category: 'Community', cost: 260, upkeep: 5, site: 'land', icon: 'school', road: true, effect: 'Education · +20 jobs', description: 'A community learning centre. Nearby homes benefit most, and the centre adds clean local jobs.' },
    clinic: { name: 'Community clinic', category: 'Community', cost: 220, upkeep: 5, site: 'land', icon: 'clinic', road: true, effect: 'Health · +18 jobs', description: 'Improve access to care and wellbeing for nearby residents. Requires a connected road.' },
    recycling: { name: 'Circular hub', category: 'Community', cost: 200, upkeep: 3, site: 'land', icon: 'recycling', road: true, effect: 'Less waste · +24 jobs', description: 'Recover useful materials and provide clean jobs. Helps replace employment from the old industrial district.' },
    waterworks: { name: 'Water recycling', category: 'Community', cost: 250, upkeep: 4, site: 'land', icon: 'waterworks', road: true, effect: 'Water security · +18 jobs', description: 'A water reuse facility improves climate resilience and gives residents a more reliable water supply.' },
    orchard: { name: 'Urban orchard', category: 'Nature', cost: 140, upkeep: 2, site: 'land', icon: 'orchard', jobs: 8, natureShade: 24, greenScore: 4.5, effect: 'Local food · +8 jobs · shade', description: 'Grow fruit close to home. An orchard provides more local jobs than woodland, with a smaller canopy and a monthly maintenance cost.' },
    playground: { name: 'Adventure playground', category: 'Nature', cost: 160, upkeep: 3, site: 'land', icon: 'playground', jobs: 3, natureShade: 12, greenScore: 3, amenity: 26, radius: 4, effect: 'Nearby wellbeing · family space', description: 'Create a place for families to play. Strongest within four tiles of homes; offers less cooling than a wooded park.' },
    plaza: { name: 'Sponge plaza', category: 'Nature', cost: 190, upkeep: 3, site: 'land', icon: 'plaza', jobs: 4, natureShade: 10, greenScore: 2.5, amenity: 15, radius: 4, resilience: 6, effect: 'Flood resilience · public space', description: 'A permeable public square with rain beds. Improves flood resilience and nearby wellbeing while keeping space for community life.' },
    solarfarm: { name: 'Solar farm', category: 'Clean energy', cost: 320, upkeep: 5, site: 'land', icon: 'solarfarm', power: 44, jobs: 8, effect: '+44 clean power · +8 jobs', description: 'Generate clean electricity on an open plot. Higher output than a solar roof, but uses land that could provide housing or green space.' },
    geothermal: { name: 'Geothermal plant', category: 'Clean energy', cost: 420, upkeep: 7, site: 'land', icon: 'geothermal', road: true, unlock: 2, power: 60, jobs: 16, resilience: 3, effect: '+60 clean power · +16 jobs', description: 'Reliable low-carbon generation with a high opening cost and upkeep. Requires a connected road; unlocks in month 3 or at 35 sustainability.' },
    metro: { name: 'Metro station', category: 'Transport', cost: 420, upkeep: 9, site: 'road', icon: 'metro', unlock: 2, transportStrength: 90, transportRadius: 8, effect: 'Wide transit coverage · fares', description: 'An underground transit entrance with the widest coverage. Needs a connected road and costs more to maintain than a bus or tram stop.' },
    bikeshare: { name: 'Bike-share station', category: 'Transport', cost: 110, upkeep: 2, site: 'road', icon: 'bikeshare', transportStrength: 35, transportRadius: 4, effect: 'Short local trips · active travel', description: 'Give nearby residents a practical cycling option. Works best close to homes and complements a connected protected-bike network.' },
    market: { name: 'Local food market', category: 'Community', cost: 210, upkeep: 4, site: 'land', icon: 'market', road: true, jobs: 30, amenity: 18, radius: 5, effect: '+30 jobs · neighbourhood life', description: 'Support local traders and everyday shopping. Provides jobs and a modest wellbeing benefit to nearby homes; requires road access.' },
    library: { name: 'Public library', category: 'Community', cost: 240, upkeep: 5, site: 'land', icon: 'library', road: true, jobs: 22, amenity: 40, radius: 5, effect: 'Strong local services · +22 jobs', description: 'Invest in learning, public space and access to information. Strong wellbeing support within five tiles; requires a connected road.' },
    office: { name: 'Clean-tech offices', category: 'Community', cost: 380, upkeep: 7, site: 'land', icon: 'office', road: true, unlock: 2, jobs: 64, powerDemand: 6, effect: '+64 jobs · uses 6 power units', description: 'Replace polluting industrial jobs with clean businesses. Provides substantial employment but needs road access, power and ongoing maintenance.' },
    airport: { name: 'Regional airport', category: 'Transport', cost: 1400, upkeep: 28, site: 'land', icon: 'airport', road: true, unlock: 2, footprint: [3,2], unique: true, jobs: 90, revenue: 140, powerDemand: 18, emissions: 10, noise: 32, effect: '+90 jobs · demand-led income · noise', description: 'A 3 × 2 regional airfield. Connect a road to its perimeter. Income grows with residents and local jobs, up to 140 EP/month at full demand. Uses power and creates pollution and noise within six tiles. One airport per island.' },
    cargoport: { name: 'Cargo harbour', category: 'Transport', cost: 1000, upkeep: 20, site: 'land', icon: 'cargoport', road: true, coast: true, unlock: 2, footprint: [2,2], jobs: 75, revenue: 100, powerDemand: 12, emissions: 7, noise: 22, effect: '+75 jobs · demand-led trade · noise', description: 'A 2 × 2 freight port on coastal land, with road access. Trade demand grows with residents and local jobs, up to 100 EP/month. Multiple harbours share demand. Nearby homes experience noise and worse air.' },
    ferry: { name: 'Electric ferry dock', category: 'Transport', cost: 380, upkeep: 8, site: 'land', icon: 'ferry', road: true, coast: true, jobs: 14, transportStrength: 65, transportRadius: 7, powerDemand: 4, effect: 'Coastal public transport · +14 jobs', description: 'An electric passenger connection on a coastal land tile beside a connected road. Covers nearby homes and earns transit fares. Water tiles remain protected.' },
    marina: { name: 'Waterfront marina', category: 'Transport', cost: 520, upkeep: 10, site: 'land', icon: 'marina', road: true, coast: true, footprint: [2,2], jobs: 30, revenue: 45, noise: 10, amenity: 25, radius: 5, effect: 'Leisure · +30 jobs · visitor income', description: 'A 2 × 2 waterfront leisure destination. Needs coastal land and a road. Adds local services. Visitor income grows with population and happiness, up to 45 EP/month; marinas share demand. Creates some nearby noise.' },
    firestation: { name: 'Fire & rescue station', category: 'Community', cost: 300, upkeep: 6, site: 'land', icon: 'firestation', road: true, jobs: 22, amenity: 35, radius: 6, need: 'safety', resilience: 4, effect: 'Emergency cover · +22 jobs', description: 'Provide emergency cover within six tiles of homes. Requires a connected road. Service funding affects coverage and climate readiness.' },
    hospital: { name: 'Community hospital', category: 'Community', cost: 460, upkeep: 10, site: 'land', icon: 'hospital', road: true, unlock: 2, jobs: 40, amenity: 65, radius: 7, need: 'health', powerDemand: 6, effect: 'Wide healthcare cover · +40 jobs', description: 'A larger investment in healthcare with a seven-tile reach. Needs road access, power and a continuing maintenance budget.' },
    stadium: { name: 'Community sports centre', category: 'Community', cost: 650, upkeep: 14, site: 'land', icon: 'stadium', road: true, footprint: [2,2], jobs: 32, amenity: 55, radius: 7, powerDemand: 9, noise: 18, effect: 'Leisure & wellbeing · event noise', description: 'A 2 × 2 sports ground. Offers recreation and jobs with a wide local benefit, but crowds create noise near homes. Connect a road to its perimeter.' }
  };
  const types = { ...upgrades,
    factory: { name: 'Old industry', cost: 260, upkeep: 5, road: true, description: 'An older industrial workplace. It provides 48 jobs but pollutes nearby neighbourhoods. Replace its jobs before removing it.' },
    coal: { name: 'Fossil energy plant', cost: 350, upkeep: 7, road: true, description: 'The city’s legacy power station. It provides 24 jobs but worsens air quality. Imported grid power remains available after removal.' }
  };
  const roadTypes = new Set(['road', 'bike', 'bus', 'tram', 'ev', 'metro', 'bikeshare']);
  const buildingTypes = new Set(['house', 'apartment', 'school', 'clinic', 'recycling', 'waterworks', 'heat', 'battery', 'factory', 'geothermal', 'market', 'library', 'office', 'firestation', 'hospital']);
  const greenTypes = new Set(['tree', 'park', 'forest', 'garden', 'wetland', 'orchard', 'playground', 'plaza']);
  const challenges = {
    revolution: { name: 'Green Revolution', budget: 2800, detail: 'Bring sustainability to 70, wellbeing to 60, and grow to 350 residents.', goal: 'Build a balanced, liveable neighbourhood.' },
    carbon: { name: 'Low-Carbon City', budget: 3000, detail: 'Reach 75 clean energy, 65 mobility and a pollution index of 20 or lower, with 300 residents.', goal: 'Replace fossil dependence with a cleaner city.' },
    future: { name: 'City of the Future', budget: 4200, detail: 'Reach 650 residents and 75 sustainability, with 5 parks, 3 solar roofs and 2 transit stops.', goal: 'Build a thriving climate-ready city.' },
    sandbox: { name: 'Creative mode', budget: 14000, detail: 'All tools unlocked. Grow your city at your own pace; costs and monthly finances still apply.', goal: 'Your island. Your plan.' }
  };
  const terrain = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size), c = i % size;
    return r < 1 || c < 1 || r > size-2 || c > size-2 || (r < 4 && c < 5-r) || (r > size-5 && c > 2*size-6-r) || (r > 8 && r < 15 && c < 3) ? 'water' : 'land';
  });
  const rowLabel = row => { let value=row+1,result='';while(value>0){value--;result=String.fromCharCode(65+value%26)+result;value=Math.floor(value/26);}return result; };
  const label = i => rowLabel(Math.floor(i / size)) + (i % size + 1);
  const validCell = i => Number.isInteger(i) && i >= 0 && i < size * size;
  function neighbours(i) {
    const r = Math.floor(i / size), c = i % size;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < size && x < size).map(([y, x]) => y * size + x);
  }
  const distance = (a, b) => Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size);
  const rotatable=type=>!!(types[type]?.footprint||types[type]?.coast);
  const dimensions=(type,rotation=0)=>{const [w,h]=types[type]?.footprint||[1,1];return rotation%2?[h,w]:[w,h];};
  function footprint(type,i,rotation=0){const [w,h]=dimensions(type,rotation);if(!validCell(i)||i%size+w>size||Math.floor(i/size)+h>size)return [];return Array.from({length:w*h},(_,n)=>i+Math.floor(n/w)*size+n%w);}
  const anchorAt=(state,i)=>validCell(i)?(state.cells[i]?.anchor??i):i;
  const linkedPlot=(plots,roads)=>plots.some(i=>neighbours(i).some(j=>roads.has(j)));
  const coastal=plots=>plots.some(i=>neighbours(i).some(j=>terrain[j]==='water'));
  function starter() {
    const cells = Array(size * size).fill(null);
    for (let r = 2; r <= 17; r++) for (let c = 3; c <= 17; c++) {
      const i = r * size + c;
      if (terrain[i] !== 'water' && ([5, 10, 15].includes(r) || [5, 10, 15].includes(c))) cells[i] = { type: 'road', level: 1, roof: null, paid: 0 };
    }
    const put = (r, c, type, level = 1) => { cells[r * size + c] = { type, level, roof: null, paid: 0 }; };
    [[4,4],[4,6],[4,9],[6,4],[6,6],[6,9],[9,4],[9,6],[9,9],[11,6],[11,9],[14,9]].forEach(([r,c])=>put(r,c,'house'));
    put(4, 11, 'apartment'); put(6, 11, 'apartment');
    put(14, 14, 'factory'); put(16, 14, 'factory'); put(16, 16, 'coal');
    return cells;
  }
  function fresh(challenge = 'revolution') {
    if (!owns(challenges, challenge)) challenge = 'revolution';
    return { version: 3, challenge, cells: starter(), cash: challenges[challenge].budget, population: 220, month: 1,
      policies: policies(), routes:[], loan:null, grants: [], event: null, history: [], log: ['The council has approved your opening grant. Welcome to New Terra.'] };
  }
  function connectedRoads(cells) {
    // The harbour entrance is the fixed connection to the regional road network.
    const hub = 17 * size + 10, connected = new Set(), queue = [];
    if (roadTypes.has(cells[hub]?.type)) { connected.add(hub); queue.push(hub); }
    for (let head = 0; head < queue.length; head++) for (const j of neighbours(queue[head])) if (!connected.has(j) && roadTypes.has(cells[j]?.type)) { connected.add(j); queue.push(j); }
    return connected;
  }
  const multiplier = cell => 1 + (cell.level - 1) * .5;
  const localNeeds={
    roads:{label:'Road connection',message:'These homes are cut off from the regional road network.',metric:'linked',kind:'road'},
    noise:{label:'Too much noise',message:'A nearby activity is creating noise at these homes.',metric:'noise',kind:'inspect'},
    shade:{label:'More shade needed',message:'Nearby trees and parks would improve shade and local cooling.',metric:'shade',kind:'build',build:'park'},
    mobility:{label:'Transport gap',message:'Local transport access is low and no named line is carrying residents here.',metric:'mobility',kind:'build',build:'bus'},
    health:{label:'Care is too far away',message:'These homes have little nearby healthcare coverage.',metric:'health',kind:'build',build:'clinic'},
    safety:{label:'Emergency cover needed',message:'Fire and rescue coverage is low around these homes.',metric:'safety',kind:'build',build:'firestation'},
    services:{label:'More local services',message:'A library or learning centre nearby would improve access to shared services.',metric:'services',kind:'build',build:'library'},
    traffic:{label:'Busy daily journeys',message:'Roads on the journey to nearby workplaces are under pressure.',metric:'commute',kind:'transport'}
  };
  function homeFeedback(home,people=0){
    const needs=[],add=(id,severity)=>needs.push({id,severity:Math.round(clamp(severity)),value:home[localNeeds[id].metric]});
    if(!home.linked)add('roads',100);
    if(home.noise>=18)add('noise',60+home.noise*.45);
    if(home.shade<25)add('shade',38+(25-home.shade)*1.2);
    if(home.linked&&home.mobility<35&&!home.namedLineAccess&&!(home.routeRiders>0))add('mobility',40+(35-home.mobility)*.8);
    if(home.health<20)add('health',35+(20-home.health)*.9);
    if(home.safety<15)add('safety',30+(15-home.safety));
    if(home.services<25)add('services',28+(25-home.services)*.7);
    if(home.linked&&home.commute>=45)add('traffic',48+(home.commute-45)*.65);
    needs.sort((a,b)=>b.severity-a.severity||a.id.localeCompare(b.id));
    const urgency=needs[0]?.severity||0;
    return {i:home.i,residents:Math.round(people),needs,primary:needs[0]?.id||'well',urgency,status:urgency>=70?'Priority area':needs.length?'Room to improve':'Well supported'};
  }
  function nearbyPlan(state,type,i,a,radius=4){
    const candidates=[];
    for(let r=Math.max(0,Math.floor(i/size)-radius);r<=Math.min(size-1,Math.floor(i/size)+radius);r++)for(let c=Math.max(0,i%size-radius);c<=Math.min(size-1,i%size+radius);c++){
      const j=r*size+c;if(distance(i,j)<=radius)candidates.push(j);
    }
    candidates.sort((x,y)=>distance(i,x)-distance(i,y)||x-y);
    // Planning may preview a price the treasury cannot yet afford; purchases always use the real state.
    const planning=state.cash>=upgrades[type].cost?state:{...state,cash:upgrades[type].cost};
    const target=candidates.find(j=>!canPlace(planning,type,j,a));if(target===undefined)return null;
    return {kind:'build',type,target,cost:upgrades[type].cost,upkeep:upgrades[type].upkeep,affordable:state.cash>=upgrades[type].cost};
  }
  function neighbourhoodInfo(state,i,a=analyse(state)){
    i=anchorAt(state,i);const summary=a.neighbourhoods.find(h=>h.i===i),home=a.homeProfiles.find(h=>h.i===i);if(!summary||!home)return null;
    const priorities=summary.needs.slice(0,3).map(need=>{
      const def=localNeeds[need.id];let action=null,source=null,forecast=null;
      if(need.id==='roads')action={kind:'road',target:i};
      else if(need.id==='noise'){
        source=a.localSources.noise.map(s=>({i:s.i,type:s.type,value:Math.max(0,1-Math.min(...s.plots.map(j=>distance(i,j)))/6)*s.strength*s.factor})).sort((x,y)=>y.value-x.value)[0]||null;
        if(source?.value>0)action={kind:'inspect',target:source.i,overlay:'noise'};
      }else if(need.id==='traffic')action={kind:'transport',target:i};
      else if(def.build){
        const type=need.id==='shade'&&state.cash<upgrades.park.cost?'tree':def.build;
        action=nearbyPlan(state,type,i,a);
        if(!action&&need.id==='mobility')action={kind:'transport',target:i};
        if(action?.kind==='build'){
          const planning=state.cash>=action.cost?state:{...state,cash:action.cost};
          const result=place(planning,action.type,action.target);
          if(!result.error){const after=analyse(result.state).homeProfiles.find(h=>h.i===i);forecast={metric:def.metric,before:home[def.metric],after:after[def.metric]};}
        }
      }
      return {...need,...def,source:source?{...source,value:Math.round(source.value)}:null,action,forecast};
    });
    return {...summary,name:'Around '+label(i),building:types[state.cells[i].type].name,conditions:home,priorities};
  }
  const routeColours=['#bf704b','#4f8b80','#637eb0','#9b789f'];
  function roadPath(roads,from,to){
    if(!roads.has(from)||!roads.has(to))return [];
    const queue=[from],parent=new Map([[from,-1]]);
    for(let head=0;head<queue.length&&!parent.has(to);head++)for(const j of neighbours(queue[head]))if(roads.has(j)&&!parent.has(j)){parent.set(j,queue[head]);queue.push(j);}
    if(!parent.has(to))return [];
    const path=[];for(let i=to;i!==-1;i=parent.get(i))path.push(i);return path.reverse();
  }
  function routeInfo(state,route,roads=connectedRoads(state.cells)){
    const path=[];let issue='';
    if(route.stops.some(i=>state.cells[i]?.type!==route.type))issue='A stop was removed or changed. Rebuild it or edit this line.';
    else if(route.stops.some(i=>!roads.has(i)))issue='A stop has lost its connection to the regional gateway.';
    else for(let n=1;n<route.stops.length;n++){
      const leg=roadPath(roads,route.stops[n-1],route.stops[n]);
      if(!leg.length){issue='The road connection between stops is broken.';break;}
      path.push(...(n===1?leg:leg.slice(1)));
    }
    const active=route.enabled&&!issue,length=Math.max(0,path.length-1),funding=policies(state.policies).serviceBudget/100;
    return {...route,path,active,issue,status:!route.enabled?'Paused':issue?'Suspended':'Operating',length,
      capacity:active?Math.round((route.type==='tram'?360:180)*funding):0,
      upkeep:active?Math.round(((route.type==='tram'?18:12)+length*(route.type==='tram'?.4:.25))*funding):0};
  }
  function validRoute(route){
    return route&&['bus','tram'].includes(route.type)&&typeof route.name==='string'&&route.name.trim().length>0&&route.name.length<=32&&routeColours.includes(route.colour)&&typeof route.enabled==='boolean'&&Array.isArray(route.stops)&&route.stops.length>=2&&route.stops.length<=6&&new Set(route.stops).size===route.stops.length&&route.stops.every(i=>validCell(i)&&terrain[i]==='land');
  }
  function setRoute(state,definition,id=null){
    const routes=state.routes||[];
    if(!validRoute(definition))return rejected(state,'Name the line and choose 2–6 different stops of the same transport type.');
    if(id!==null&&!routes.some(r=>r.id===id))return rejected(state,'This line no longer exists.');
    if(id===null&&routes.length>=12)return rejected(state,'Your transport office can manage up to 12 lines.');
    const info=routeInfo(state,definition);if(info.issue)return rejected(state,info.issue);
    const same=(a,b)=>a.every((i,n)=>i===b[n]);
    if(routes.some(r=>r.id!==id&&r.type===definition.type&&r.stops.length===definition.stops.length&&(same(r.stops,definition.stops)||same(r.stops,[...definition.stops].reverse()))))return rejected(state,'A line already serves this sequence of stops. Edit that line instead.');
    const route={id:id??Array.from({length:12},(_,n)=>n+1).find(n=>!routes.some(r=>r.id===n)),name:definition.name.trim(),type:definition.type,colour:definition.colour,enabled:definition.enabled,stops:[...definition.stops]};
    return ok({...state,routes:id===null?[...routes,route]:routes.map(r=>r.id===id?route:r)},route.name+' '+(id===null?'created':'updated')+' · '+info.upkeep+' EP / month.');
  }
  function removeRoute(state,id){
    const route=(state.routes||[]).find(r=>r.id===id);if(!route)return rejected(state,'This line no longer exists.');
    return ok({...state,routes:state.routes.filter(r=>r.id!==id)},route.name+' removed. Its stops remain available.');
  }
  function setRouteEnabled(state,id,enabled){
    const route=(state.routes||[]).find(r=>r.id===id);if(!route||typeof enabled!=='boolean')return rejected(state,'Choose an existing line.');
    return ok({...state,routes:state.routes.map(r=>r.id===id?{...r,enabled}:r)},route.name+(enabled?' resumed.':' paused.'));
  }
  function transportAnalysis(state,roads,homeProfiles,homes,residents,transit,bikes,bikeLinks){
    const p=policies(state.policies),fareDemand=clamp(1-Math.max(0,p.transitFare-2)*.1,.65,1),funding=.8+.2*p.serviceBudget/100;
    const routes=(state.routes||[]).map(r=>({...routeInfo(state,r,roads),passengerDemand:0,riders:0}));
    const workplaces=[];
    state.cells.forEach((cell,i)=>{
      if(!cell||cell.anchor!==undefined)return;
      const jobs=types[cell.type].jobs??({apartment:18,factory:48,coal:24,heat:12,school:20,clinic:18,recycling:24,waterworks:18}[cell.type]||0);
      if(jobs&&linkedPlot(footprint(cell.type,i,cell.rotation),roads))workplaces.push(i);
    });
    const allocations=[],active=routes.filter(r=>r.active);
    homes.forEach((home,n)=>{
      const profile=homeProfiles[n],people=state.population*home.capacity/residents;
      const localShare=home.linked&&transit.some(t=>['bus','tram','metro','ferry'].includes(t.type))?clamp(profile.mobility*funding)/100*.45*fareDemand:0;
      const offers=home.linked?active.map(route=>{
        const distances=route.stops.map(i=>distance(home.i,i)),nearest=Math.min(...distances),start=distances.indexOf(nearest);
        const reach=Math.max(0,1-nearest/5);
        const destination=route.stops.some((stop,index)=>index!==start&&workplaces.some(work=>distance(work,stop)<=5));
        return {route,quality:destination?reach:0};
      }).filter(o=>o.quality>0):[];
      const quality=offers.length?Math.max(...offers.map(o=>o.quality)):0,total=offers.reduce((sum,o)=>sum+o.quality,0);
      const potential=people*Math.max(0,.65-localShare)*.55*quality*fareDemand;
      const shares=offers.map(o=>{const demand=potential*o.quality/total;o.route.passengerDemand+=demand;return {route:o.route,demand};});
      allocations.push({home,profile,people,localShare,shares});
    });
    routes.forEach(route=>{route.riders=Math.min(route.capacity,Math.round(route.passengerDemand));route.servedRatio=route.passengerDemand?route.riders/route.passengerDemand:0;route.passengerDemand=Math.round(route.passengerDemand);});
    // One nearest-workplace search serves all homes. Traffic follows actual connected streets.
    const parents=Array(size*size).fill(-2),queue=[];
    for(const work of workplaces)for(const i of neighbours(work))if(roads.has(i)&&parents[i]===-2){parents[i]=-1;queue.push(i);}
    if(!queue.length&&roads.has(17*size+10)){parents[17*size+10]=-1;queue.push(17*size+10);}
    const steps=Array(size*size).fill(Infinity);queue.forEach(i=>steps[i]=0);
    for(let head=0;head<queue.length;head++)for(const j of neighbours(queue[head]))if(roads.has(j)&&parents[j]===-2){parents[j]=queue[head];steps[j]=steps[queue[head]]+1;queue.push(j);}
    const roadLoads=Array(size*size).fill(0);let carTrips=0,routeRiders=0,unconnected=0;
    allocations.forEach(({home,profile,people,localShare,shares})=>{
      const extra=shares.reduce((sum,o)=>sum+o.demand*o.route.servedRatio,0);
      routeRiders+=extra;profile.namedLineAccess=shares.some(o=>o.route.riders>0);
      const activeShare=Math.min(.3,.05+(bikes+Math.min(bikeLinks,10))*.006);
      const trips=Math.max(0,people*.42*(1-localShare-activeShare)-extra*.42);
      const access=neighbours(home.i).filter(i=>roads.has(i)&&parents[i]!==-2).sort((a,b)=>steps[a]-steps[b]||a-b)[0];
      if(access===undefined){unconnected+=people;profile.commute=100;return;}
      const path=[];for(let i=access;i>=0;i=parents[i]){roadLoads[i]+=trips;path.push(i);}
      carTrips+=trips;profile.commutePath=path;profile.routeRiders=Math.round(extra);
    });
    const roadCapacity=i=>18+(state.cells[i]?.type==='bike'?4:0),pressure=i=>clamp((roadLoads[i]/roadCapacity(i)-1)*70);
    const totalLoad=roadLoads.reduce((sum,v)=>sum+v,0),congestion=totalLoad?Math.round(roadLoads.reduce((sum,v,i)=>sum+v*pressure(i),0)/totalLoad):0;
    homeProfiles.forEach(home=>{if(home.commutePath)home.commute=home.commutePath.length?Math.round(home.commutePath.reduce((sum,i)=>sum+pressure(i),0)/home.commutePath.length):0;});
    const bottlenecks=[...roads].filter(i=>roadLoads[i]>roadCapacity(i)).sort((a,b)=>roadLoads[b]/roadCapacity(b)-roadLoads[a]/roadCapacity(a)).slice(0,5).map(i=>({i,load:Math.ceil(roadLoads[i]),capacity:roadCapacity(i),pressure:Math.round(pressure(i))}));
    const gaps=allocations.filter(h=>h.home.linked&&h.profile.mobility<35&&!h.shares.length).sort((a,b)=>b.people-a.people).slice(0,4).map(h=>({i:h.home.i,people:Math.round(h.people),coverage:h.profile.mobility}));
    return {routes,roadLoads,congestion,carTrips:Math.round(carTrips),routeRiders:Math.round(routeRiders),upkeep:routes.reduce((sum,r)=>sum+r.upkeep,0),unconnected:Math.round(unconnected),bottlenecks,gaps};
  }
  function analyse(state) {
    const p=policies(state.policies),funding=p.serviceBudget/100;
    const roads = connectedRoads(state.cells), counts = {}, homes = [], greens = [], transit = [], power = [], services = [], noiseSources=[],industrySources=[],connections=[];
    let upkeep = 0, cleanPower = 0, capacity = 0, jobs = 0, forests = 0, wetlands = 0, roofs = 0, batteries = 0, heating = 0, waste = 0, water = 0, industry = 0, fossil = 0, bikes = 0, bikeLinks = 0, extraResilience = 0, extraDemand = 0, regionalRevenue=0, extraEmissions=0;
    state.cells.forEach((cell, i) => {
      if (!cell || cell.anchor!==undefined) return;
      const { type, level } = cell, factor = multiplier(cell), meta = types[type];
      const plots=footprint(type,i,cell.rotation),linked = roadTypes.has(type) ? roads.has(i) : linkedPlot(plots,roads);
      if(meta.revenue)connections.push({i,type,factor,linked});
      if(['factory','coal'].includes(type))industrySources.push({i,factor});
      counts[type] = (counts[type] || 0) + 1;
      upkeep += (meta.upkeep || 0) * factor;
      if (cell.roof) { counts[cell.roof] = (counts[cell.roof] || 0) + 1; upkeep += upgrades[cell.roof].upkeep * factor; }
      if (type === 'house' || type === 'apartment') {
        const people = (type === 'house' ? 40 : 100) * factor;
        homes.push({ i, capacity: people, linked });
        if (linked) capacity += people;
        if (type === 'apartment' && linked) jobs += 18 * factor;
      }
      if (greenTypes.has(type)) { greens.push({ i, type, factor }); jobs += (meta.jobs ?? (type === 'garden' ? 4 : 2)) * factor; }
      if (!meta.road || linked) {
        if (meta.power) { cleanPower += meta.power * factor; power.push(i); }
        if (meta.jobs && !greenTypes.has(type)) jobs += meta.jobs * factor;
        extraResilience += (meta.resilience || 0) * factor;
        extraDemand += (meta.powerDemand || 0) * factor;
        extraEmissions += (meta.emissions||0)*factor;
        if(meta.noise)noiseSources.push({i,type,factor,strength:meta.noise,plots});
        if (meta.amenity) services.push({ i, type, factor, strength:meta.amenity, radius:meta.radius, need:meta.need });
      }
      if (type === 'forest') forests += factor;
      if (type === 'wetland') wetlands += factor * (terrain.some((t,j)=>t==='water' && distance(i,j)<=2) ? 1.6 : 1);
      if (cell.roof === 'roof') roofs += factor;
      if (type === 'wind') { cleanPower += 28 * factor; power.push(i); jobs += 6 * factor; }
      if (cell.roof === 'solar') { cleanPower += 12 * factor; power.push(i); jobs += 2 * factor; }
      if (type === 'battery') { batteries += factor; jobs += 6 * factor; }
      if (type === 'heat' && linked) { heating += factor; jobs += 12 * factor; }
      if (type === 'factory' && linked) { industry += factor; jobs += 48 * factor; }
      if (type === 'coal' && linked) { fossil += factor; jobs += 24 * factor; }
      if (type === 'recycling' && linked) { waste += factor; jobs += 24 * factor; }
      if (type === 'waterworks' && linked) { water += factor; jobs += 18 * factor; }
      if (['school','clinic'].includes(type) && linked) { services.push({ i, type, factor, need:type==='clinic'?'health':'learning' }); jobs += (type === 'school' ? 20 : 18) * factor; }
      if ((['bus','tram','ev','metro','bikeshare'].includes(type) && roads.has(i)) || (type==='ferry'&&linked)) transit.push({ i, type, factor });
      if (type === 'bikeshare' && roads.has(i)) bikes += 1.5 * factor;
      if (type === 'bike' && roads.has(i)) { bikes += factor; bikeLinks += neighbours(i).filter(j => j > i && state.cells[j]?.type === 'bike' && roads.has(j)).length; }
    });
    const residents = Math.max(1, homes.reduce((s,h)=>s+h.capacity,0));
    let shadeCoverage = 0, mobilityCoverage = 0, serviceCoverage = 0, healthCoverage=0,safetyCoverage=0,noiseExposure=0;
    const homeProfiles=[];
    homes.forEach(home => {
      const nature = greens.reduce((s,g)=>s+Math.max(0,1-distance(home.i,g.i)/4)*(types[g.type].natureShade ?? {tree:16,park:29,forest:27,wetland:20,garden:18}[g.type])*g.factor,0);
      const travel = home.linked ? transit.reduce((s,t)=>s+Math.max(0,1-distance(home.i,t.i)/(types[t.type].transportRadius || (t.type==='tram'?7:6)))*(types[t.type].transportStrength || (t.type==='ev'?15:t.type==='tram'?75:58))*t.factor,0) : 0;
      const amenities = services.reduce((s,a)=>s+Math.max(0,1-distance(home.i,a.i)/(a.radius||6))*(a.strength||30)*a.factor,0);
      const care=need=>services.filter(a=>a.need===need).reduce((s,a)=>s+Math.max(0,1-distance(home.i,a.i)/(a.radius||6))*(a.strength||30)*a.factor,0);
      const health=care('health'),safety=care('safety');
      const noise=noiseSources.reduce((s,n)=>s+Math.max(0,1-Math.min(...n.plots.map(j=>distance(home.i,j)))/6)*n.strength*n.factor,0);
      shadeCoverage += clamp(nature) * home.capacity / residents;
      mobilityCoverage += clamp(travel) * home.capacity / residents;
      serviceCoverage += clamp(amenities) * home.capacity / residents;
      healthCoverage += clamp(health)*home.capacity/residents;safetyCoverage += clamp(safety)*home.capacity/residents;noiseExposure += clamp(noise)*home.capacity/residents;
      homeProfiles.push({i:home.i,shade:clamp(Math.round(nature)),services:clamp(Math.round(amenities*funding)),health:clamp(Math.round(health*funding)),safety:clamp(Math.round(safety*funding)),mobility:clamp(Math.round(travel)),noise:clamp(Math.round(noise)),linked:home.linked});
    });
    jobs*=clamp(1-(p.businessTax-10)*.025,.8,1.125);
    serviceCoverage=clamp(serviceCoverage*funding);
    shadeCoverage=clamp(shadeCoverage*(.8+.2*funding));
    mobilityCoverage=clamp(mobilityCoverage*(.8+.2*funding));
    const fareDemand=clamp(1-Math.max(0,p.transitFare-2)*.1,.65,1);
    const hasTransit=transit.some(t=>['bus','tram','metro','ferry'].includes(t.type));
    const transport=transportAnalysis(state,roads,homeProfiles,homes,residents,transit,bikes,bikeLinks);
    const neighbourhoods=homeProfiles.map((home,n)=>homeFeedback(home,state.population*homes[n].capacity/residents));
    const ridership=hasTransit?Math.round(state.population*mobilityCoverage/100*.45*fareDemand)+transport.routeRiders:0;
    const demand = Math.max(16, Math.round((state.population * .105 + industry * 9 + 8 + services.length * 2 + extraDemand) * Math.max(.6,1-heating*.08-roofs*.006)*(1-Math.max(0,p.utilityTariff-1)*.035)));
    const energy = clamp(Math.round(cleanPower * (1 + Math.min(.2,batteries*.08)) / demand * 100));
    const greenness = clamp(Math.round(greens.reduce((s,g)=>s+(types[g.type].greenScore ?? {tree:2.8,park:5.8,forest:7,wetland:5,garden:4}[g.type])*Math.pow(g.factor,.65),0) + shadeCoverage*.42 + roofs*3.5));
    const mobility = clamp(Math.round(12 + mobilityCoverage*.68*fareDemand + Math.min(28,bikes*3.2+bikeLinks*1.8) + (hasTransit?Math.max(0,2-p.transitFare)*6:0) + Math.min(16,transport.routeRiders/Math.max(1,state.population)*80) - Math.max(0,transport.congestion-35)*.12));
    const air = clamp(Math.round(47 - industry*7 - fossil*13 - extraEmissions + energy*.22 + greenness*.29 + mobility*.12 + Math.min(10,waste*4) + (p.cleanIndustry?10:0)));
    const resilience = clamp(Math.round((15 + greenness*.3 + shadeCoverage*.22 + wetlands*7 + roofs*3 + batteries*6 + water*11 + heating*3 + extraResilience)*(.85+.15*funding)));
    const scores = [air, energy, greenness, mobility, resilience];
    const pollution = 100-air, overall=Math.round(scores.reduce((a,b)=>a+b,0)/5);
    const employment = clamp(Math.round(jobs / Math.max(1,state.population*.42)*100));
    const eventBase = state.event ? ({heat:resilience<55?12:4,rain:resilience<50?10:3,energy:energy<70?9:2,housing:state.population>capacity*.85?12:6,waste:waste<2?10:4}[state.event.type]||0) : 0;
    const response=state.event?.choice?events[state.event.type].options.find(o=>o.id===state.event.choice):null;
    const protection=response?.protection??0;
    const eventPenalty = Math.round(eventBase * (1-protection));
    const baseWellbeing = clamp(Math.round(27 + air*.2 + shadeCoverage*.18 + serviceCoverage*.38 + employment*.12 + mobility*.12 - (p.residentialTax-10)*2.5 - Math.max(0,p.utilityTariff-1)*4 - Math.max(0,p.transitFare-2)*2 + (hasTransit&&p.freeTransit?4:0) + (p.serviceBudget-100)*.06 - eventPenalty - noiseExposure*.15 - Math.max(0,transport.congestion-35)*.12));
    const life=residentLife({state,p,capacity,employment,air,greenness,mobility,serviceCoverage,healthCoverage:clamp(healthCoverage*funding),safetyCoverage:clamp(safetyCoverage*funding),noiseExposure,baseWellbeing});
    const wellbeing=life.happiness;
    const growth=wellbeing<30?-Math.ceil(state.population*.035):Math.round((25+state.population*.075)*(wellbeing/80)*Math.max(.15,employment/100));
    const nextPopulation=Math.max(0,Math.min(capacity,state.population+growth));
    const residentialRevenue=Math.round(state.population*.038*p.residentialTax),businessRevenue=Math.round(jobs*.018*p.businessTax);
    const fareRevenue=Math.round(ridership*p.transitFare*.4),utilityMargin=Math.round((p.utilityTariff-1)*demand*.35);
    const assetUpkeep=Math.round(upkeep*funding),transitSupport=p.freeTransit&&hasTransit?45:0,industryStandards=p.cleanIndustry?35:0;
    // Demand is shared by each kind of connection; building duplicate ports cannot create customers.
    const localJobs=Math.max(0,jobs-connections.filter(c=>c.linked).reduce((sum,c)=>sum+types[c.type].jobs*c.factor,0)*clamp(1-(p.businessTax-10)*.025,.8,1.125));
    const connectionDemand={airport:Math.round(state.population*.08+localJobs*.06),cargoport:Math.round(state.population*.035+localJobs*.25),marina:Math.round(state.population*.06*(.3+wellbeing/100*.7))};
    const connectionCapacity={airport:300,cargoport:180,marina:140};
    connections.forEach(c=>{
      const total=connections.filter(other=>other.type===c.type&&other.linked).reduce((sum,other)=>sum+connectionCapacity[c.type]*other.factor,0);
      c.capacity=connectionCapacity[c.type]*c.factor;
      c.utilisation=c.linked&&total?Math.min(1,connectionDemand[c.type]/total):0;
      c.customers=Math.round(c.capacity*c.utilisation);
      c.revenue=Math.round(types[c.type].revenue*c.factor*c.utilisation);
      c.upkeep=Math.round(types[c.type].upkeep*c.factor*funding);
      regionalRevenue+=c.revenue;
    });
    const income = 140+residentialRevenue+businessRevenue+fareRevenue+Math.max(0,utilityMargin)+regionalRevenue;
    const gridCost = Math.round(Math.max(0,demand-cleanPower)*.8*(state.event?.type==='energy'?1.8-.8*protection:1));
    const loanPayment=state.loan?Math.min(state.loan.payment,state.loan.balance):0;
    const expenses = assetUpkeep+transitSupport+industryStandards+gridCost+Math.max(0,-utilityMargin)+loanPayment+transport.upkeep, net=income-expenses;
    const completed = state.challenge==='revolution' ? overall>=70&&wellbeing>=60&&state.population>=350 : state.challenge==='carbon' ? pollution<=20&&energy>=75&&mobility>=65&&state.population>=300 : state.challenge==='future' ? state.population>=650&&overall>=75&&(counts.park||0)>=5&&(counts.solar||0)>=3&&(counts.bus||0)+(counts.tram||0)+(counts.metro||0)>=2 : false;
    return { scores, overall, pollution, wellbeing, happiness:wellbeing,nextPopulation,life,homeProfiles,neighbourhoods,connections,transport,localSources:{nature:greens,transit,noise:noiseSources,industry:industrySources},noiseExposure:Math.round(noiseExposure),capacity:Math.round(capacity), jobs:Math.round(jobs), employment, roads, counts, income, expenses, net, cleanPower:Math.round(cleanPower), demand, shadeCoverage:Math.round(shadeCoverage), mobilityCoverage:Math.round(mobilityCoverage), serviceCoverage:Math.round(serviceCoverage),ridership,policy:p,budget:{grant:140,residentialRevenue,businessRevenue,fareRevenue,utilities:Math.max(0,utilityMargin),regionalRevenue,routeUpkeep:transport.upkeep,assetUpkeep,transitSupport,industryStandards,gridCost,utilitySubsidy:Math.max(0,-utilityMargin),loanPayment}, completed, upgrades:state.cells.filter(c=>c&&c.paid>0).length, tier:state.challenge==='sandbox'||state.month>=3||overall>=35?2:1 };
  }
  function residentLife(a){
    const {state,p,capacity,employment,air,greenness,mobility,serviceCoverage,healthCoverage,safetyCoverage,noiseExposure,baseWellbeing}=a;
    const room=capacity?Math.max(0,capacity-state.population)/Math.max(1,capacity):0;
    const needs=[
      {id:'housing',name:'Housing',score:capacity?clamp(Math.round(35+room*90)):0,detail:Math.max(0,capacity-state.population)+' places available',tip:'Build or upgrade homes beside connected roads.',build:'house'},
      {id:'jobs',name:'Jobs & opportunity',score:employment,detail:employment+'% local employment',tip:'Add connected workplaces before removing old industry.',build:'office'},
      {id:'services',name:'Health & services',score:clamp(Math.round(25+serviceCoverage*.52+healthCoverage*.2+safetyCoverage*.15)),detail:Math.round(healthCoverage)+' healthcare · '+Math.round(safetyCoverage)+' emergency cover',tip:healthCoverage<20?'Put a clinic or hospital near homes, with road access.':safetyCoverage<20?'Add fire and rescue cover near homes.':'Bring learning and community services closer to homes.',build:healthCoverage<20?'clinic':safetyCoverage<20?'firestation':'library'},
      {id:'environment',name:'Environment & quiet',score:clamp(Math.round(air*.65+greenness*.35-noiseExposure*.5)),detail:Math.round(noiseExposure)+'/100 average noise exposure',tip:'Separate homes from airports and freight docks; add shade and clean power.',build:'park'},
      {id:'mobility',name:'Getting around',score:mobility,detail:mobility+'/100 sustainable transport',tip:'Connect homes to buses, trams, metro or a coastal ferry.',build:'bus'},
      {id:'community',name:'Community & leisure',score:clamp(Math.round(20+greenness*.35+serviceCoverage*.55)),detail:'Nearby green spaces and shared services',tip:'Bring parks, libraries and recreation close to residents.',build:'playground'},
      {id:'affordability',name:'Cost of living',score:clamp(Math.round(100-(p.residentialTax-6)*5-p.transitFare*4-p.utilityTariff*7-(room<.1?(1-room/.1)*18:0))),detail:p.residentialTax+'% tax · '+p.transitFare+' EP fare',tip:'Review household taxes, fares and utility prices in the budget.',build:null}
    ];
    const values=Object.fromEntries(needs.map(n=>[n.id,n.score]));
    const definitions=[['families','Families',.32,{housing:.25,services:.25,community:.25,environment:.15,affordability:.1}],['workers','Working residents',.5,{jobs:.3,mobility:.2,affordability:.25,housing:.15,environment:.1}],['seniors','Older residents',.18,{services:.35,environment:.3,community:.2,affordability:.15}]];
    const groups=definitions.map(([id,name,share,weights])=>({id,name,share,happiness:clamp(Math.round(baseWellbeing*.65+Object.entries(weights).reduce((sum,[key,weight])=>sum+values[key]*weight,0)*.35))}));
    const happiness=Math.round(groups.reduce((sum,g)=>sum+g.happiness*g.share,0)),mood=happiness>=75?'Thriving':happiness>=60?'Content':happiness>=40?'Uneasy':'Unhappy';
    const priorities=[...needs].sort((x,y)=>x.score-y.score).slice(0,3);
    return {happiness,mood,needs,groups,priorities,noise:Math.round(noiseExposure)};
  }
  const remaining = state => state.cash;
  const board = state => state.cells;
  const score = analyse;
  function canPlace(state, type, i, analysis, rotation=0) {
    if (!owns(upgrades,type)) return 'Choose a building from the catalogue.';
    if(!Number.isInteger(rotation)||rotation<0||rotation>3||(!rotatable(type)&&rotation))return 'Choose a valid building orientation.';
    if (!validCell(i)) return 'Choose a tile inside the island.';
    if (terrain[i]==='water') return 'Protect the waterfront. Build on land.';
    const item=upgrades[type], cell=state.cells[i], s=analysis||analyse(state);
    if (item.unlock && s.tier<item.unlock) return 'Unlocks in month 3 or at 35 sustainability. Advance time or improve your city.';
    if (item.site==='roof') {
      if (!cell||!buildingTypes.has(cell.type)) return 'Choose an existing building with a usable roof.';
      if (cell.roof) return 'This roof already has a retrofit. Remove it in the inspector to change it.';
    } else if (item.site==='road') {
      if (!cell||cell.type!=='road') return 'Choose a plain road tile. Demolish an existing road upgrade to change it.';
      if (!s.roads.has(i)) return 'Reconnect this road to the harbour entrance first.';
    } else {
      const plots=footprint(type,i,rotation);
      if(!plots.length)return 'Keep the whole building footprint inside the map.';
      if(plots.some(j=>terrain[j]==='water'))return 'The whole footprint needs land. Water stays protected.';
      if (plots.some(j=>state.cells[j])) return 'The whole footprint needs empty land. Inspect, move or demolish first.';
      if(item.coast&&!coastal(plots))return 'Choose coastal land with water touching the footprint.';
      if(item.unique&&s.counts[type])return 'Your island already has a '+item.name.toLowerCase()+'.';
      if (item.road&&!linkedPlot(plots,s.roads)) return 'This building needs a neighbouring road connected to the regional gateway.';
    }
    if (state.cash<item.cost) return 'Not enough Eco Points. Earn monthly income, choose a cheaper option or undo.';
    return '';
  }
  function addLog(state,text) { return {...state,log:[text,...state.log].slice(0,16)}; }
  const rejected=(state,error)=>({state,error,notice:''});
  const ok=(state,notice)=>({state:addLog(state,notice),error:'',notice});
  function place(state,type,i,rotation=0) {
    const error=canPlace(state,type,i,undefined,rotation); if(error)return rejected(state,error);
    const item=upgrades[type],cells=state.cells.slice(),old=cells[i];
    if(item.site==='roof')cells[i]={...old,roof:type,paid:old.paid+item.cost};
    else footprint(type,i,rotation).forEach(j=>cells[j]=j===i?{type,level:1,roof:null,paid:(old?.paid||0)+item.cost,...(rotation?{rotation}:{})}:{type,level:1,roof:null,paid:0,anchor:i});
    return ok({...state,cells,cash:state.cash-item.cost},item.name+' built at '+label(i)+' · −'+item.cost+' EP.');
  }
  function upgradeCost(cell) { return cell&&owns(types,cell.type)?Math.round(types[cell.type].cost*.65*cell.level):0; }
  function upgrade(state,i) {
    i=anchorAt(state,i);
    const cell=state.cells[i];
    if(!cell||!validCell(i))return rejected(state,'Select a building or improvement to upgrade.');
    if(cell.type==='road'||cell.type==='factory'||cell.type==='coal')return rejected(state,'Use the build catalogue to retrofit or replace this tile.');
    if(cell.level>=3)return rejected(state,'Already at maximum level.');
    const cost=upgradeCost(cell);if(state.cash<cost)return rejected(state,'Not enough Eco Points for this upgrade.');
    const cells=state.cells.slice();cells[i]={...cell,level:cell.level+1,paid:cell.paid+cost};
    return ok({...state,cells,cash:state.cash-cost},types[cell.type].name+' upgraded to level '+(cell.level+1)+' · −'+cost+' EP.');
  }
  function demolish(state,i,roofOnly=false) {
    i=anchorAt(state,i);
    if(!validCell(i)||!state.cells[i])return rejected(state,'There is nothing to remove on this plot.');
    const cell=state.cells[i], cells=state.cells.slice();
    if(roofOnly&&!cell.roof)return rejected(state,'This building has no rooftop retrofit.');
    if(roofOnly){const cost=upgrades[cell.roof].cost;cells[i]={...cell,roof:null,paid:Math.max(0,cell.paid-cost)};return ok({...state,cells,cash:state.cash+Math.floor(cost*.5)},'Rooftop retrofit removed. 50% of its purchase price refunded.');}
    const refund=Math.floor(cell.paid*.5);
    footprint(cell.type,i,cell.rotation).forEach(j=>cells[j]=null);
    if(roadTypes.has(cell.type)&&cell.type!=='road')cells[i]={type:'road',level:1,roof:null,paid:0};
    return ok({...state,cells,cash:state.cash+refund},types[cell.type].name+' removed · +'+refund+' EP salvage. Undo is available.');
  }
  function moveCost(cell){return cell?Math.max(15,Math.round(types[cell.type].cost*.15)):0;}
  function relocate(state,from,to,rotation) {
    from=anchorAt(state,from);
    if(!validCell(from)||!state.cells[from])return rejected(state,'Select a building to relocate.');
    if(!validCell(to))return rejected(state,'Choose an empty land plot.');
    const cell=state.cells[from];if(roadTypes.has(cell.type))return rejected(state,'Roads stay in place. Use the road path or demolition tools.');
    rotation=rotation??cell.rotation??0;
    if(!Number.isInteger(rotation)||rotation<0||rotation>3||(!rotatable(cell.type)&&rotation))return rejected(state,'Choose a valid building orientation.');
    if(from===to&&rotation===(cell.rotation||0))return rejected(state,'Choose a different location or rotate the building.');
    const cost=moveCost(cell);if(state.cash<cost)return rejected(state,'Not enough Eco Points to relocate this building.');
    const cells=state.cells.slice();footprint(cell.type,from,cell.rotation).forEach(j=>cells[j]=null);
    const plots=footprint(cell.type,to,rotation);
    if(!plots.length||plots.some(j=>terrain[j]==='water'||cells[j]))return rejected(state,'Choose empty land for the whole building footprint.');
    if(types[cell.type].coast&&!coastal(plots))return rejected(state,'The new footprint must touch the coast.');
    if(types[cell.type].road&&!linkedPlot(plots,connectedRoads(cells)))return rejected(state,'The new plot needs a connected neighbouring road.');
    const moved={...cell};delete moved.rotation;if(rotation)moved.rotation=rotation;
    plots.forEach(j=>cells[j]=j===to?moved:{type:cell.type,level:1,roof:null,paid:0,anchor:to});
    return ok({...state,cells,cash:state.cash-cost},types[cell.type].name+' moved to '+label(to)+' · −'+cost+' EP.');
  }
  function line(a,b) {
    if(!validCell(a)||!validCell(b))return [];
    const result=[a];let r=Math.floor(a/size),c=a%size;const tr=Math.floor(b/size),tc=b%size;
    while(c!==tc){c+=Math.sign(tc-c);result.push(r*size+c);}while(r!==tr){r+=Math.sign(tr-r);result.push(r*size+c);}return result;
  }
  function buildLine(state,a,b) {
    const path=line(a,b);if(!path.length)return rejected(state,'Choose two tiles inside the city.');
    if(path.some(i=>terrain[i]==='water'||(state.cells[i]&&!roadTypes.has(state.cells[i].type))))return rejected(state,'The whole route needs clear land or existing roads. No points were spent.');
    const empty=path.filter(i=>!state.cells[i]),cost=empty.length*upgrades.road.cost;
    if(!empty.length)return rejected(state,'This route already has roads.');
    if(state.cash<cost)return rejected(state,'This route costs '+cost+' EP. Shorten it or earn more monthly income.');
    const cells=state.cells.slice();empty.forEach(i=>cells[i]={type:'road',level:1,roof:null,paid:upgrades.road.cost});
    return ok({...state,cells,cash:state.cash-cost},empty.length+' road tiles built as one route · −'+cost+' EP.');
  }
  const grantDefs=[
    {id:'builder',name:'Neighbourhood investment',reward:400,test:(s,a)=>a.upgrades>=5,detail:'Build 5 improvements'},
    {id:'greener',name:'Green district grant',reward:600,test:(s,a)=>a.overall>=35,detail:'Reach 35 sustainability'},
    {id:'energy',name:'Clean energy grant',reward:650,test:(s,a)=>a.scores[1]>=75,detail:'Reach 75 clean energy'},
    {id:'growing',name:'Thriving community grant',reward:800,test:s=>s.population>=450,detail:'Reach 450 residents'},
    {id:'mission',name:'Climate action award',reward:1200,test:(s,a)=>a.completed,detail:'Complete your mission'}
  ];
  function grant(state) {
    const a=analyse(state),earned=grantDefs.filter(g=>!state.grants.includes(g.id)&&g.test(state,a));
    if(!earned.length)return {state,rewards:[]};
    return {state:{...state,cash:state.cash+earned.reduce((s,g)=>s+g.reward,0),grants:[...state.grants,...earned.map(g=>g.id)]},rewards:earned};
  }
  const neighbourhoodMissionDefs=[
    {id:'shade',name:'Cool the block',metric:'shade',target:40,reward:180,icon:'tree',detail:'Bring shade around one underserved home to 40/100.',hint:'Plan parks, street trees or green spaces near this home.'},
    {id:'transit',name:'Connect the community',metric:'mobility',target:55,reward:220,icon:'route',detail:'Reach 55/100 transport access with nearby public transport.',hint:'Add a connected bus stop, tram stop, metro or ferry nearby, or create a useful transit line.'},
    {id:'care',name:'Healthy streets',metric:'health',target:40,reward:240,icon:'health',detail:'Reach 40/100 healthcare access and keep the monthly budget balanced.',hint:'Place or upgrade nearby healthcare, then check service funding and the monthly balance.'}
  ];
  const missionBook=state=>state.missions||{active:null,completed:[]};
  function missionPublicTransit(home,a){
    return !!home.namedLineAccess||a.localSources.transit.some(t=>['bus','tram','metro','ferry'].includes(t.type)&&distance(home.i,t.i)<(types[t.type].transportRadius||(t.type==='tram'?7:6)));
  }
  function neighbourhoodMissions(state,a=analyse(state)){
    const book=missionBook(state);
    return neighbourhoodMissionDefs.map(def=>{
      const completed=book.completed.find(m=>m.id===def.id),active=book.active?.id===def.id?book.active:null;
      const candidates=a.homeProfiles.filter(home=>home.linked&&home[def.metric]<def.target).sort((x,y)=>x[def.metric]-y[def.metric]||x.i-y.i);
      const home=active?a.homeProfiles.find(h=>h.i===active.home):null,value=home?.[def.metric]||0;
      const checks=active?[{name:'Home connected to main roads',done:!!home?.linked},{name:{shade:'Local shade',mobility:'Transport access',health:'Healthcare access'}[def.metric]+' '+value+' / '+def.target,done:!!home&&value>=def.target},...(def.id==='transit'?[{name:'Nearby public transport',done:!!home&&missionPublicTransit(home,a)}]:[]),...(def.id==='care'?[{name:'Monthly balance '+(a.net>=0?'+':'')+a.net+' EP',done:a.net>=0}]:[])]:[];
      const ready=!!active&&checks.every(c=>c.done);
      const progress=completed?100:!active||!home?0:Math.min(ready?100:99,Math.max(0,Math.round((value-active.baseline)/(def.target-active.baseline)*100)));
      return {...def,active,completed,home,value,candidates,checks,ready,progress,missing:!!active&&!home};
    });
  }
  function startNeighbourhoodMission(state,id,i){
    const def=neighbourhoodMissionDefs.find(m=>m.id===id),book=missionBook(state);
    if(!def||!validCell(i))return rejected(state,'Choose a neighbourhood mission and a home.');
    if(book.active)return rejected(state,'Finish or leave your current neighbourhood mission first.');
    if(book.completed.some(m=>m.id===id))return rejected(state,'This neighbourhood mission has already earned its reward.');
    const home=analyse(state).homeProfiles.find(h=>h.i===i);
    if(!home?.linked||home[def.metric]>=def.target)return rejected(state,'Choose a connected home that still needs this improvement.');
    return ok({...state,missions:{...book,active:{id,home:i,baseline:home[def.metric],started:state.month}}},def.name+' started around '+label(i)+'. Track your progress in Goals.');
  }
  function leaveNeighbourhoodMission(state){
    const book=missionBook(state);if(!book.active)return rejected(state,'There is no active neighbourhood mission.');
    return ok({...state,missions:{...book,active:null}},'Neighbourhood mission left. Your buildings and Eco Points are unchanged.');
  }
  function awardNeighbourhoodMission(state){
    const report=neighbourhoodMissions(state).find(m=>m.ready);
    if(!report)return {state,reward:null};
    const book=missionBook(state),record={id:report.id,home:report.active.home,baseline:report.active.baseline,value:report.value,month:state.month};
    return {state:{...state,cash:state.cash+report.reward,missions:{active:null,completed:[...book.completed,record]},log:[report.name+' completed around '+label(record.home)+' · +'+report.reward+' EP.',...state.log].slice(0,16)},reward:{...record,name:report.name,reward:report.reward,metric:report.metric}};
  }
  function restoreMissions(raw,month){
    if(raw===undefined)return undefined;
    const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    const valid=(m,completed)=>{
      const def=neighbourhoodMissionDefs.find(d=>d.id===m?.id);
      return def&&int(m.home,0,size*size-1)&&terrain[m.home]==='land'&&int(m.baseline,0,def.target-1)&&(completed?int(m.value,def.target,100)&&int(m.month,1,month):int(m.started,1,month));
    };
    if(!raw||typeof raw!=='object'||!Array.isArray(raw.completed)||raw.completed.length>3||raw.completed.some(m=>!valid(m,true))||new Set(raw.completed.map(m=>m.id)).size!==raw.completed.length||(raw.active!==null&&(!valid(raw.active,false)||raw.completed.some(m=>m.id===raw.active.id))))throw new Error('Invalid neighbourhood missions');
    return {active:raw.active?{id:raw.active.id,home:raw.active.home,baseline:raw.active.baseline,started:raw.active.started}:null,completed:raw.completed.map(m=>({id:m.id,home:m.home,baseline:m.baseline,value:m.value,month:m.month}))};
  }
  const events={
    heat:{name:'Heatwave forecast',eyebrow:'Climate readiness',icon:'sun',description:'A hot spell is putting pressure on residents. Shade, cool roofs and reliable services reduce the impact. Choose how your council will support people this month.',options:[{id:'shelters',name:'Open cooling shelters',cost:120,protection:1,detail:'Fully cover the remaining wellbeing impact this month.'},{id:'volunteers',name:'Neighbourhood checks',cost:60,protection:.5,detail:'Reduce the wellbeing impact by half at a lower cost.'},{id:'none',name:'Rely on existing preparations',cost:0,protection:0,detail:'Keep your budget; the city takes the remaining impact.'}]},
    rain:{name:'Heavy rain warning',eyebrow:'Waterfront resilience',icon:'rain',description:'Heavy rainfall is approaching the waterfront. Rain gardens and water recycling have already reduced your exposure. Decide how much additional support to fund.',options:[{id:'drains',name:'Mobilise drainage teams',cost:130,protection:1,detail:'Fully protect wellbeing from the remaining event impact.'},{id:'alerts',name:'Community alerts',cost:50,protection:.5,detail:'Halve the remaining impact with a basic response.'},{id:'none',name:'Use existing defences',cost:0,protection:0,detail:'Spend nothing now; rely on your current resilience.'}]},
    energy:{name:'Grid energy price spike',eyebrow:'Energy security',icon:'energy',description:'Imported grid electricity is temporarily more expensive. Your renewable generation reduces exposure. Choose how to protect households and the monthly budget.',options:[{id:'reserve',name:'Household support package',cost:100,protection:1,detail:'Remove the event surcharge and wellbeing penalty.'},{id:'save',name:'Energy-saving campaign',cost:40,protection:.5,detail:'Reduce the surcharge and halve the wellbeing penalty.'},{id:'none',name:'Let current tariffs stand',cost:0,protection:0,detail:'Keep funds available; higher grid costs remain this month.'}]},
    housing:{name:'Housing pressure',eyebrow:'Quality of life',icon:'home',description:'Residents are worried about housing affordability. More connected homes and thoughtful tax rates help over time. Decide on support for the current month.',options:[{id:'housing-support',name:'Targeted housing support',cost:180,protection:1,detail:'Fully cover this month’s wellbeing impact.'},{id:'housing-advice',name:'Housing advice service',cost:70,protection:.5,detail:'Halve the immediate impact while you plan new homes.'},{id:'none',name:'Keep the current plan',cost:0,protection:0,detail:'No immediate spending; residents absorb the impact.'}]},
    waste:{name:'Waste collection pressure',eyebrow:'Essential services',icon:'recycling',description:'The growing city is putting pressure on waste collection. Circular hubs reduce exposure; service funding determines everyday capacity. Choose a short-term response.',options:[{id:'extra-collections',name:'Extra collection teams',cost:140,protection:1,detail:'Fully protect wellbeing for this month.'},{id:'waste-campaign',name:'Neighbourhood sorting drive',cost:50,protection:.5,detail:'Halve the impact with a smaller programme.'},{id:'none',name:'Use existing capacity',cost:0,protection:0,detail:'No added expense; your city takes the remaining impact.'}]}
  };
  function respond(state,id){
    const e=state.event&&events[state.event.type];if(!e||state.event.choice)return rejected(state,'There is no unanswered city event.');
    const option=e.options.find(o=>o.id===id);if(!option)return rejected(state,'Choose one of the council responses.');
    if(state.cash<option.cost)return rejected(state,'Not enough Eco Points. Choose a lower-cost or no-cost response.');
    return ok({...state,cash:state.cash-option.cost,event:{...state.event,choice:id}},'Council decision recorded: '+option.name+(option.cost?' · −'+option.cost+' EP.':' · no additional cost.'));
  }
  function setPolicies(state,patch){
    if(!patch||typeof patch!=='object'||Object.keys(patch).some(k=>!owns(policyDefaults,k)))return rejected(state,'Unknown city policy.');
    const next={...policies(state.policies),...patch};
    if(owns(patch,'tax')){const rate={low:8,balanced:10,high:14}[patch.tax];if(!owns(patch,'residentialTax'))next.residentialTax=rate;if(!owns(patch,'businessTax'))next.businessTax=rate;}
    if(owns(patch,'freeTransit')&&!owns(patch,'transitFare'))next.transitFare=patch.freeTransit?0:2;
    if(owns(patch,'transitFare'))next.freeTransit=patch.transitFare===0;
    try{return ok({...state,policies:policies(next)},'City budget updated. The new taxes, prices and service funding apply to your next monthly balance.');}catch{return rejected(state,'Choose rates and prices within the displayed limits.');}
  }
  function setPolicy(state,key,value){return setPolicies(state,{[key]:value});}
  function borrow(state){
    if(state.loan)return rejected(state,'Repay the existing development loan before taking another.');
    return ok({...state,cash:state.cash+1000,loan:{balance:1080,payment:90}},'Development loan approved: +1,000 EP. Twelve payments of 90 EP; total cost 1,080 EP.');
  }
  function repayLoan(state){
    if(!state.loan)return rejected(state,'There is no outstanding development loan.');
    if(state.cash<state.loan.balance)return rejected(state,'Not enough Eco Points to repay the remaining loan.');
    return ok({...state,cash:state.cash-state.loan.balance,loan:null},'The remaining development loan has been repaid.');
  }
  function advance(state){
    const a=analyse(state),population=a.nextPopulation;
    const month=state.month+1;
    const eventTypes=Object.keys(events);
    const event=month%4===0?{type:eventTypes[Math.floor(month/4-1)%eventTypes.length],choice:null}:null;
    const available=state.cash+a.income-(a.expenses-a.budget.loanPayment);
    const paid=Math.min(a.budget.loanPayment,Math.max(0,available));
    const loan=state.loan&&state.loan.balance>paid?{...state.loan,balance:state.loan.balance-paid}:null;
    let next={...state,population,month,cash:Math.max(0,available-paid),loan,event,history:[...state.history,{month:state.month,score:a.overall,population:state.population,happiness:a.happiness}].slice(-24)};
    const awarded=grant(next);next=awarded.state;
    const notice='Month '+month+' · '+(a.net>=0?'+':'')+a.net+' EP operating balance · '+(population-state.population>=0?'+':'')+(population-state.population)+' residents.'+(awarded.rewards.length?' Grants: +'+awarded.rewards.reduce((s,g)=>s+g.reward,0)+' EP.':'')+(event?' Council alert: '+events[event.type].name+'.':'');
    return ok(next,notice);
  }
  function goals(state,a=analyse(state)){
    if(state.challenge==='revolution')return [{name:'Sustainability',value:a.overall,target:70},{name:'Resident wellbeing',value:a.wellbeing,target:60},{name:'Population',value:state.population,target:350}];
    if(state.challenge==='carbon')return [{name:'Pollution index',value:a.pollution,target:20,lower:true},{name:'Renewable energy',value:a.scores[1],target:75},{name:'Sustainable transport',value:a.scores[3],target:65},{name:'Population',value:state.population,target:300}];
    if(state.challenge==='future')return [{name:'Population',value:state.population,target:650},{name:'Sustainability',value:a.overall,target:75},{name:'Neighbourhood parks',value:a.counts.park||0,target:5},{name:'Solar roofs',value:a.counts.solar||0,target:3},{name:'Transit stops',value:(a.counts.bus||0)+(a.counts.tram||0)+(a.counts.metro||0),target:2}];
    return [{name:'City size',value:state.population,target:1000},{name:'Sustainability',value:a.overall,target:100}];
  }
  function tileInfo(state,i,a=analyse(state)){
    i=anchorAt(state,i);
    const cell=state.cells[i];if(!validCell(i))return null;
    const linked=roadTypes.has(cell?.type)?a.roads.has(i):linkedPlot(footprint(cell?.type,i,cell?.rotation),a.roads);
    const nature=a.localSources.nature.reduce((sum,g)=>sum+Math.max(0,1-distance(i,g.i)/4)*14*g.factor,0);
    const transit=a.localSources.transit.reduce((sum,t)=>sum+(t.type==='ev'?0:Math.max(0,1-distance(i,t.i)/(types[t.type].transportRadius||6))*(types[t.type].transportStrength||55)*t.factor),0);
    const industrial=a.localSources.industry.reduce((sum,n)=>sum+Math.max(0,1-distance(i,n.i)/5)*25,0);
    const local=a.homeProfiles.find(h=>h.i===i);
    const noise=local?.noise??clamp(Math.round(a.localSources.noise.reduce((sum,n)=>sum+Math.max(0,1-Math.min(...n.plots.map(j=>distance(i,j)))/6)*n.strength*n.factor,0)));
    return {label:label(i),name:cell?types[cell.type].name:terrain[i]==='water'?'Protected waterfront':'Available land',cell,linked,local,neighbourhood:a.neighbourhoods.find(h=>h.i===i),noise,traffic:Math.round(a.transport.roadLoads[i]),congestion:clamp(Math.round((a.transport.roadLoads[i]/(cell?.type==='bike'?22:18)-1)*70)),heat:clamp(Math.round(78-nature-(cell?.roof==='roof'?20:0)+industrial)),power:a.scores[1],transit:clamp(Math.round(transit)),resilience:clamp(Math.round(a.scores[4]+nature*.3+(terrain[i]==='water'?15:0))),refund:Math.floor((cell?.paid||0)*.5)};
  }
  function restore(raw){
    if(!raw||![2,3].includes(raw.version)||!owns(challenges,raw.challenge)||!Array.isArray(raw.cells)||raw.cells.length!==(raw.version===2?400:size*size))throw new Error('Invalid saved city');
    const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!integer(raw.cash,0,10000000)||!integer(raw.population,0,maxPopulation)||!integer(raw.month,1,10000))throw new Error('Invalid city finances or calendar');
    const source=Array(size*size).fill(null);
    if(raw.version===2)raw.cells.forEach((cell,i)=>{const r=Math.floor(i/20),c=i%20,water=r<1||c<1||r>18||c>18||(r<4&&c<5-r)||(r>15&&c>34-r)||(r>8&&r<15&&c<3);if(cell&&water)throw new Error('Invalid old waterfront building');source[r*size+c]=cell;});else raw.cells.forEach((cell,i)=>source[i]=cell);
    const cells=source.map((cell,i)=>{
      if(cell===null)return null;
      if(!cell||terrain[i]==='water'||!owns(types,cell.type)||!integer(cell.level,1,3)||!integer(cell.paid,0,100000))throw new Error('Invalid building');
      if(cell.roof!==null&&(!['roof','solar'].includes(cell.roof)||!buildingTypes.has(cell.type)))throw new Error('Invalid rooftop retrofit');
      if(cell.anchor!==undefined){if(raw.version!==3||!integer(cell.anchor,0,size*size-1)||cell.anchor===i||cell.paid!==0||cell.level!==1||cell.roof!==null)throw new Error('Invalid footprint reference');return {type:cell.type,level:1,roof:null,paid:0,anchor:cell.anchor};}
      if(cell.rotation!==undefined&&(!integer(cell.rotation,0,3)||!rotatable(cell.type)))throw new Error('Invalid building orientation');
      return {type:cell.type,level:cell.level,roof:cell.roof,paid:cell.paid,...(cell.rotation?{rotation:cell.rotation}:{})};
    });
    cells.forEach((cell,i)=>{if(!cell)return;if(cell.anchor!==undefined){const root=cells[cell.anchor];if(!root||root.anchor!==undefined||root.type!==cell.type||!footprint(root.type,cell.anchor,root.rotation).includes(i))throw new Error('Orphaned building footprint');}else{const plots=footprint(cell.type,i,cell.rotation);if(!plots.length||plots.some(j=>terrain[j]==='water'||(j!==i&&(cells[j]?.anchor!==i||cells[j]?.type!==cell.type))))throw new Error('Incomplete building footprint');if(types[cell.type].coast&&!coastal(plots))throw new Error('Invalid coastal building');}});
    for(const type of Object.keys(upgrades).filter(type=>upgrades[type].unique))if(cells.filter(c=>c?.type===type&&c.anchor===undefined).length>1)throw new Error('Duplicate unique infrastructure');
    const p=raw.policies;
    if(!p||!['low','balanced','high'].includes(p.tax)||typeof p.freeTransit!=='boolean'||typeof p.cleanIndustry!=='boolean')throw new Error('Invalid policies');
    const restoredPolicies=policies(p);
    let loan=null;
    if(raw.loan!==undefined&&raw.loan!==null){if(!raw.loan||typeof raw.loan!=='object'||!integer(raw.loan.balance,1,1080)||raw.loan.payment!==90)throw new Error('Invalid development loan');loan={balance:raw.loan.balance,payment:90};}
    if(!Array.isArray(raw.grants)||new Set(raw.grants).size!==raw.grants.length||raw.grants.some(id=>!grantDefs.some(g=>g.id===id)))throw new Error('Invalid grants');
    let event=null;
    if(raw.event){const e=events[raw.event.type];if(!e||(raw.event.choice!==null&&!e.options.some(o=>o.id===raw.event.choice)))throw new Error('Invalid event');event={type:raw.event.type,choice:raw.event.choice};}
    const history=(Array.isArray(raw.history)?raw.history:[]).slice(-24).map(h=>{if(!h||!integer(h.month,1,raw.month)||!integer(h.score,0,100)||!integer(h.population,0,maxPopulation)||(h.happiness!==undefined&&!integer(h.happiness,0,100)))throw new Error('Invalid city history');return {month:h.month,score:h.score,population:h.population,...(h.happiness===undefined?{}:{happiness:h.happiness})};});
    let routes=[];
    if(raw.routes!==undefined){if(!Array.isArray(raw.routes)||raw.routes.length>12||new Set(raw.routes.map(r=>r?.id)).size!==raw.routes.length)throw new Error('Invalid transport lines');routes=raw.routes.map(r=>{if(!validRoute(r)||!integer(r.id,1,12))throw new Error('Invalid transport line');return {id:r.id,name:r.name.trim(),type:r.type,colour:r.colour,enabled:r.enabled,stops:[...r.stops]};});}
    const log=(Array.isArray(raw.log)?raw.log:[]).filter(s=>typeof s==='string'&&s.length<=400).slice(0,16);
    const missions=restoreMissions(raw.missions,raw.month);
    return {version:3,challenge:raw.challenge,cells,cash:raw.cash,population:raw.population,month:raw.month,policies:restoredPolicies,routes,loan,grants:[...raw.grants],event,history,log,...(missions?{missions}:{})};
  }
  const api={size,terrain,metrics,upgrades,types,challenges,localNeeds,homeFeedback,neighbourhoodInfo,routeColours,roadPath,routeInfo,setRoute,removeRoute,setRouteEnabled,roadTypes,buildingTypes,greenTypes,fresh,board,remaining,score,analyse,neighbours,distance,rowLabel,label,rotatable,dimensions,footprint,anchorAt,coastal,canPlace,place,upgrade,upgradeCost,demolish,relocate,moveCost,line,buildLine,grantDefs,grant,events,respond,policies,policyRanges,setPolicies,setPolicy,borrow,repayLoan,advance,goals,tileInfo,restore};
  Object.assign(api,{neighbourhoodMissionDefs,neighbourhoodMissions,startNeighbourhoodMission,leaveNeighbourhoodMission,awardNeighbourhoodMission});
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCity=api;
})(globalThis);
