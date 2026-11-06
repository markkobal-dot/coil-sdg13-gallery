/* Green City / simulation rules. Deterministic, browser-local teaching model. */
(function (host) {
  'use strict';
  const size = 20;
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
    office: { name: 'Clean-tech offices', category: 'Community', cost: 380, upkeep: 7, site: 'land', icon: 'office', road: true, unlock: 2, jobs: 64, powerDemand: 6, effect: '+64 jobs · uses 6 power units', description: 'Replace polluting industrial jobs with clean businesses. Provides substantial employment but needs road access, power and ongoing maintenance.' }
  };
  const types = { ...upgrades,
    factory: { name: 'Old industry', cost: 260, upkeep: 5, road: true, description: 'An older industrial workplace. It provides 48 jobs but pollutes nearby neighbourhoods. Replace its jobs before removing it.' },
    coal: { name: 'Fossil energy plant', cost: 350, upkeep: 7, road: true, description: 'The city’s legacy power station. It provides 24 jobs but worsens air quality. Imported grid power remains available after removal.' }
  };
  const roadTypes = new Set(['road', 'bike', 'bus', 'tram', 'ev', 'metro', 'bikeshare']);
  const buildingTypes = new Set(['house', 'apartment', 'school', 'clinic', 'recycling', 'waterworks', 'heat', 'battery', 'factory', 'geothermal', 'market', 'library', 'office']);
  const greenTypes = new Set(['tree', 'park', 'forest', 'garden', 'wetland', 'orchard', 'playground', 'plaza']);
  const challenges = {
    revolution: { name: 'Green Revolution', budget: 2800, detail: 'Bring sustainability to 70, wellbeing to 60, and grow to 350 residents.', goal: 'Build a balanced, liveable neighbourhood.' },
    carbon: { name: 'Low-Carbon City', budget: 3000, detail: 'Reach 75 clean energy, 65 mobility and a pollution index of 20 or lower, with 300 residents.', goal: 'Replace fossil dependence with a cleaner city.' },
    future: { name: 'City of the Future', budget: 4200, detail: 'Reach 650 residents and 75 sustainability, with 5 parks, 3 solar roofs and 2 transit stops.', goal: 'Build a thriving climate-ready city.' },
    sandbox: { name: 'Creative mode', budget: 14000, detail: 'All tools unlocked. Grow your city at your own pace; costs and monthly finances still apply.', goal: 'Your island. Your plan.' }
  };
  const terrain = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size), c = i % size;
    return r < 1 || c < 1 || r > 18 || c > 18 || (r < 4 && c < 5 - r) || (r > 15 && c > 34 - r) || (r > 8 && r < 15 && c < 3) ? 'water' : 'land';
  });
  const label = i => String.fromCharCode(65 + Math.floor(i / size)) + (i % size + 1);
  const validCell = i => Number.isInteger(i) && i >= 0 && i < size * size;
  function neighbours(i) {
    const r = Math.floor(i / size), c = i % size;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < size && x < size).map(([y, x]) => y * size + x);
  }
  const distance = (a, b) => Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size);
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
    return { version: 2, challenge, cells: starter(), cash: challenges[challenge].budget, population: 220, month: 1,
      policies: policies(), loan:null, grants: [], event: null, history: [], log: ['The council has approved your opening grant. Welcome to New Terra.'] };
  }
  function connectedRoads(cells) {
    // The harbour entrance is the fixed connection to the regional road network.
    const hub = 17 * size + 10, connected = new Set(), queue = [];
    if (roadTypes.has(cells[hub]?.type)) { connected.add(hub); queue.push(hub); }
    for (let head = 0; head < queue.length; head++) for (const j of neighbours(queue[head])) if (!connected.has(j) && roadTypes.has(cells[j]?.type)) { connected.add(j); queue.push(j); }
    return connected;
  }
  const multiplier = cell => 1 + (cell.level - 1) * .5;
  function analyse(state) {
    const p=policies(state.policies),funding=p.serviceBudget/100;
    const roads = connectedRoads(state.cells), counts = {}, homes = [], greens = [], transit = [], power = [], services = [];
    let upkeep = 0, cleanPower = 0, capacity = 0, jobs = 0, forests = 0, wetlands = 0, roofs = 0, batteries = 0, heating = 0, waste = 0, water = 0, industry = 0, fossil = 0, bikes = 0, bikeLinks = 0, extraResilience = 0, extraDemand = 0;
    state.cells.forEach((cell, i) => {
      if (!cell) return;
      const { type, level } = cell, factor = multiplier(cell), meta = types[type];
      const linked = roadTypes.has(type) ? roads.has(i) : neighbours(i).some(j => roads.has(j));
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
        if (meta.amenity) services.push({ i, type, factor, strength:meta.amenity, radius:meta.radius });
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
      if (['school','clinic'].includes(type) && linked) { services.push({ i, type, factor }); jobs += (type === 'school' ? 20 : 18) * factor; }
      if (['bus','tram','ev','metro','bikeshare'].includes(type) && roads.has(i)) transit.push({ i, type, factor });
      if (type === 'bikeshare' && roads.has(i)) bikes += 1.5 * factor;
      if (type === 'bike' && roads.has(i)) { bikes += factor; bikeLinks += neighbours(i).filter(j => j > i && state.cells[j]?.type === 'bike' && roads.has(j)).length; }
    });
    const residents = Math.max(1, homes.reduce((s,h)=>s+h.capacity,0));
    let shadeCoverage = 0, mobilityCoverage = 0, serviceCoverage = 0;
    homes.forEach(home => {
      const nature = greens.reduce((s,g)=>s+Math.max(0,1-distance(home.i,g.i)/4)*(types[g.type].natureShade ?? {tree:16,park:29,forest:27,wetland:20,garden:18}[g.type])*g.factor,0);
      const travel = home.linked ? transit.reduce((s,t)=>s+Math.max(0,1-distance(home.i,t.i)/(types[t.type].transportRadius || (t.type==='tram'?7:6)))*(types[t.type].transportStrength || (t.type==='ev'?15:t.type==='tram'?75:58))*t.factor,0) : 0;
      const amenities = services.reduce((s,a)=>s+Math.max(0,1-distance(home.i,a.i)/(a.radius||6))*(a.strength||30)*a.factor,0);
      shadeCoverage += clamp(nature) * home.capacity / residents;
      mobilityCoverage += clamp(travel) * home.capacity / residents;
      serviceCoverage += clamp(amenities) * home.capacity / residents;
    });
    jobs*=clamp(1-(p.businessTax-10)*.025,.8,1.125);
    serviceCoverage=clamp(serviceCoverage*funding);
    shadeCoverage=clamp(shadeCoverage*(.8+.2*funding));
    mobilityCoverage=clamp(mobilityCoverage*(.8+.2*funding));
    const fareDemand=clamp(1-Math.max(0,p.transitFare-2)*.1,.65,1);
    const hasTransit=transit.some(t=>['bus','tram','metro'].includes(t.type));
    const ridership=hasTransit?Math.round(state.population*mobilityCoverage/100*.45*fareDemand):0;
    const demand = Math.max(16, Math.round((state.population * .105 + industry * 9 + 8 + services.length * 2 + extraDemand) * Math.max(.6,1-heating*.08-roofs*.006)*(1-Math.max(0,p.utilityTariff-1)*.035)));
    const energy = clamp(Math.round(cleanPower * (1 + Math.min(.2,batteries*.08)) / demand * 100));
    const greenness = clamp(Math.round(greens.reduce((s,g)=>s+(types[g.type].greenScore ?? {tree:2.8,park:5.8,forest:7,wetland:5,garden:4}[g.type])*Math.pow(g.factor,.65),0) + shadeCoverage*.42 + roofs*3.5));
    const mobility = clamp(Math.round(12 + mobilityCoverage*.68*fareDemand + Math.min(28,bikes*3.2+bikeLinks*1.8) + (hasTransit?Math.max(0,2-p.transitFare)*6:0)));
    const air = clamp(Math.round(47 - industry*7 - fossil*13 + energy*.22 + greenness*.29 + mobility*.12 + Math.min(10,waste*4) + (p.cleanIndustry?10:0)));
    const resilience = clamp(Math.round((15 + greenness*.3 + shadeCoverage*.22 + wetlands*7 + roofs*3 + batteries*6 + water*11 + heating*3 + extraResilience)*(.85+.15*funding)));
    const scores = [air, energy, greenness, mobility, resilience];
    const pollution = 100-air, overall=Math.round(scores.reduce((a,b)=>a+b,0)/5);
    const employment = clamp(Math.round(jobs / Math.max(1,state.population*.42)*100));
    const eventBase = state.event ? ({heat:resilience<55?12:4,rain:resilience<50?10:3,energy:energy<70?9:2,housing:state.population>capacity*.85?12:6,waste:waste<2?10:4}[state.event.type]||0) : 0;
    const response=state.event?.choice?events[state.event.type].options.find(o=>o.id===state.event.choice):null;
    const protection=response?.protection??0;
    const eventPenalty = Math.round(eventBase * (1-protection));
    const wellbeing = clamp(Math.round(27 + air*.2 + shadeCoverage*.18 + serviceCoverage*.38 + employment*.12 + mobility*.12 - (p.residentialTax-10)*2.5 - Math.max(0,p.utilityTariff-1)*4 - Math.max(0,p.transitFare-2)*2 + (hasTransit&&p.freeTransit?4:0) + (p.serviceBudget-100)*.06 - eventPenalty));
    const residentialRevenue=Math.round(state.population*.038*p.residentialTax),businessRevenue=Math.round(jobs*.018*p.businessTax);
    const fareRevenue=Math.round(ridership*p.transitFare*.4),utilityMargin=Math.round((p.utilityTariff-1)*demand*.35);
    const assetUpkeep=Math.round(upkeep*funding),transitSupport=p.freeTransit&&hasTransit?45:0,industryStandards=p.cleanIndustry?35:0;
    const income = 140+residentialRevenue+businessRevenue+fareRevenue+Math.max(0,utilityMargin);
    const gridCost = Math.round(Math.max(0,demand-cleanPower)*.8*(state.event?.type==='energy'?1.8-.8*protection:1));
    const loanPayment=state.loan?Math.min(state.loan.payment,state.loan.balance):0;
    const expenses = assetUpkeep+transitSupport+industryStandards+gridCost+Math.max(0,-utilityMargin)+loanPayment, net=income-expenses;
    const completed = state.challenge==='revolution' ? overall>=70&&wellbeing>=60&&state.population>=350 : state.challenge==='carbon' ? pollution<=20&&energy>=75&&mobility>=65&&state.population>=300 : state.challenge==='future' ? state.population>=650&&overall>=75&&(counts.park||0)>=5&&(counts.solar||0)>=3&&(counts.bus||0)+(counts.tram||0)+(counts.metro||0)>=2 : false;
    return { scores, overall, pollution, wellbeing, capacity:Math.round(capacity), jobs:Math.round(jobs), employment, roads, counts, income, expenses, net, cleanPower:Math.round(cleanPower), demand, shadeCoverage:Math.round(shadeCoverage), mobilityCoverage:Math.round(mobilityCoverage), serviceCoverage:Math.round(serviceCoverage),ridership,policy:p,budget:{grant:140,residentialRevenue,businessRevenue,fareRevenue,utilities:Math.max(0,utilityMargin),assetUpkeep,transitSupport,industryStandards,gridCost,utilitySubsidy:Math.max(0,-utilityMargin),loanPayment}, completed, upgrades:state.cells.filter(c=>c&&c.paid>0).length, tier:state.challenge==='sandbox'||state.month>=3||overall>=35?2:1 };
  }
  const remaining = state => state.cash;
  const board = state => state.cells;
  const score = analyse;
  function canPlace(state, type, i, analysis) {
    if (!owns(upgrades,type)) return 'Choose a building from the catalogue.';
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
      if (cell) return 'This plot is occupied. Inspect, move or demolish it first.';
      if (item.road&&!neighbours(i).some(j=>s.roads.has(j))) return 'This building needs a neighbouring road connected to the harbour entrance.';
    }
    if (state.cash<item.cost) return 'Not enough Eco Points. Earn monthly income, choose a cheaper option or undo.';
    return '';
  }
  function addLog(state,text) { return {...state,log:[text,...state.log].slice(0,16)}; }
  const rejected=(state,error)=>({state,error,notice:''});
  const ok=(state,notice)=>({state:addLog(state,notice),error:'',notice});
  function place(state,type,i) {
    const error=canPlace(state,type,i); if(error)return rejected(state,error);
    const item=upgrades[type],cells=state.cells.slice(),old=cells[i];
    if(item.site==='roof')cells[i]={...old,roof:type,paid:old.paid+item.cost};
    else cells[i]={type,level:1,roof:null,paid:(old?.paid||0)+item.cost};
    return ok({...state,cells,cash:state.cash-item.cost},item.name+' built at '+label(i)+' · −'+item.cost+' EP.');
  }
  function upgradeCost(cell) { return cell&&owns(types,cell.type)?Math.round(types[cell.type].cost*.65*cell.level):0; }
  function upgrade(state,i) {
    const cell=state.cells[i];
    if(!cell||!validCell(i))return rejected(state,'Select a building or improvement to upgrade.');
    if(cell.type==='road'||cell.type==='factory'||cell.type==='coal')return rejected(state,'Use the build catalogue to retrofit or replace this tile.');
    if(cell.level>=3)return rejected(state,'Already at maximum level.');
    const cost=upgradeCost(cell);if(state.cash<cost)return rejected(state,'Not enough Eco Points for this upgrade.');
    const cells=state.cells.slice();cells[i]={...cell,level:cell.level+1,paid:cell.paid+cost};
    return ok({...state,cells,cash:state.cash-cost},types[cell.type].name+' upgraded to level '+(cell.level+1)+' · −'+cost+' EP.');
  }
  function demolish(state,i,roofOnly=false) {
    if(!validCell(i)||!state.cells[i])return rejected(state,'There is nothing to remove on this plot.');
    const cell=state.cells[i], cells=state.cells.slice();
    if(roofOnly&&!cell.roof)return rejected(state,'This building has no rooftop retrofit.');
    if(roofOnly){const cost=upgrades[cell.roof].cost;cells[i]={...cell,roof:null,paid:Math.max(0,cell.paid-cost)};return ok({...state,cells,cash:state.cash+Math.floor(cost*.5)},'Rooftop retrofit removed. 50% of its purchase price refunded.');}
    const refund=Math.floor(cell.paid*.5);
    cells[i]=roadTypes.has(cell.type)&&cell.type!=='road'?{type:'road',level:1,roof:null,paid:0}:null;
    return ok({...state,cells,cash:state.cash+refund},types[cell.type].name+' removed · +'+refund+' EP salvage. Undo is available.');
  }
  function moveCost(cell){return cell?Math.max(15,Math.round(types[cell.type].cost*.15)):0;}
  function relocate(state,from,to) {
    if(!validCell(from)||!state.cells[from])return rejected(state,'Select a building to relocate.');
    if(!validCell(to)||terrain[to]==='water'||state.cells[to])return rejected(state,'Choose an empty land plot.');
    const cell=state.cells[from];if(roadTypes.has(cell.type))return rejected(state,'Roads stay in place. Use the road path or demolition tools.');
    const cost=moveCost(cell);if(state.cash<cost)return rejected(state,'Not enough Eco Points to relocate this building.');
    const cells=state.cells.slice();cells[from]=null;
    if(types[cell.type].road&&!neighbours(to).some(j=>connectedRoads(cells).has(j)))return rejected(state,'The new plot needs a connected neighbouring road.');
    cells[to]=cell;
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
    const a=analyse(state),growth=a.wellbeing<30?-Math.ceil(state.population*.035):Math.round((25+state.population*.075)*(a.wellbeing/80)*Math.max(.15,a.employment/100));
    const population=Math.max(0,Math.min(a.capacity,state.population+growth));
    const month=state.month+1;
    const eventTypes=Object.keys(events);
    const event=month%4===0?{type:eventTypes[Math.floor(month/4-1)%eventTypes.length],choice:null}:null;
    const available=state.cash+a.income-(a.expenses-a.budget.loanPayment);
    const paid=Math.min(a.budget.loanPayment,Math.max(0,available));
    const loan=state.loan&&state.loan.balance>paid?{...state.loan,balance:state.loan.balance-paid}:null;
    let next={...state,population,month,cash:Math.max(0,available-paid),loan,event,history:[...state.history,{month:state.month,score:a.overall,population:state.population}].slice(-24)};
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
    const cell=state.cells[i];if(!validCell(i))return null;
    const linked=roadTypes.has(cell?.type)?a.roads.has(i):neighbours(i).some(j=>a.roads.has(j));
    const nature=state.cells.reduce((sum,c,j)=>sum+(c&&greenTypes.has(c.type)?Math.max(0,1-distance(i,j)/4)*14*multiplier(c):0),0);
    const transit=state.cells.reduce((sum,c,j)=>sum+(c&&['bus','tram','metro','bikeshare'].includes(c.type)&&a.roads.has(j)?Math.max(0,1-distance(i,j)/(types[c.type].transportRadius||6))*(types[c.type].transportStrength||55)*multiplier(c):0),0);
    const industrial=state.cells.reduce((sum,c,j)=>sum+(c&&['factory','coal'].includes(c.type)?Math.max(0,1-distance(i,j)/5)*25:0),0);
    return {label:label(i),name:cell?types[cell.type].name:terrain[i]==='water'?'Protected waterfront':'Available land',cell,linked,heat:clamp(Math.round(78-nature-(cell?.roof==='roof'?20:0)+industrial)),power:a.scores[1],transit:clamp(Math.round(transit)),resilience:clamp(Math.round(a.scores[4]+nature*.3+(terrain[i]==='water'?15:0))),refund:Math.floor((cell?.paid||0)*.5)};
  }
  function restore(raw){
    if(!raw||raw.version!==2||!owns(challenges,raw.challenge)||!Array.isArray(raw.cells)||raw.cells.length!==400)throw new Error('Invalid saved city');
    const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!integer(raw.cash,0,10000000)||!integer(raw.population,0,100000)||!integer(raw.month,1,10000))throw new Error('Invalid city finances or calendar');
    const cells=raw.cells.map((cell,i)=>{
      if(cell===null)return null;
      if(!cell||terrain[i]==='water'||!owns(types,cell.type)||!integer(cell.level,1,3)||!integer(cell.paid,0,100000))throw new Error('Invalid building');
      if(cell.roof!==null&&(!['roof','solar'].includes(cell.roof)||!buildingTypes.has(cell.type)))throw new Error('Invalid rooftop retrofit');
      return {type:cell.type,level:cell.level,roof:cell.roof,paid:cell.paid};
    });
    const p=raw.policies;
    if(!p||!['low','balanced','high'].includes(p.tax)||typeof p.freeTransit!=='boolean'||typeof p.cleanIndustry!=='boolean')throw new Error('Invalid policies');
    const restoredPolicies=policies(p);
    let loan=null;
    if(raw.loan!==undefined&&raw.loan!==null){if(!raw.loan||typeof raw.loan!=='object'||!integer(raw.loan.balance,1,1080)||raw.loan.payment!==90)throw new Error('Invalid development loan');loan={balance:raw.loan.balance,payment:90};}
    if(!Array.isArray(raw.grants)||new Set(raw.grants).size!==raw.grants.length||raw.grants.some(id=>!grantDefs.some(g=>g.id===id)))throw new Error('Invalid grants');
    let event=null;
    if(raw.event){const e=events[raw.event.type];if(!e||(raw.event.choice!==null&&!e.options.some(o=>o.id===raw.event.choice)))throw new Error('Invalid event');event={type:raw.event.type,choice:raw.event.choice};}
    const history=(Array.isArray(raw.history)?raw.history:[]).slice(-24).map(h=>{if(!h||!integer(h.month,1,raw.month)||!integer(h.score,0,100)||!integer(h.population,0,100000))throw new Error('Invalid city history');return {month:h.month,score:h.score,population:h.population};});
    const log=(Array.isArray(raw.log)?raw.log:[]).filter(s=>typeof s==='string'&&s.length<=400).slice(0,16);
    return {version:2,challenge:raw.challenge,cells,cash:raw.cash,population:raw.population,month:raw.month,policies:restoredPolicies,loan,grants:[...raw.grants],event,history,log};
  }
  const api={size,terrain,metrics,upgrades,types,challenges,roadTypes,buildingTypes,greenTypes,fresh,board,remaining,score,analyse,neighbours,distance,label,canPlace,place,upgrade,upgradeCost,demolish,relocate,moveCost,line,buildLine,grantDefs,grant,events,respond,policies,policyRanges,setPolicies,setPolicy,borrow,repayLoan,advance,goals,tileInfo,restore};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCity=api;
})(globalThis);
