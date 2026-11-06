/* Deterministic game rules. Scores are teaching indicators, not emissions estimates. */
(function(host) {
  'use strict';
  const size=6;
  const buildings=new Set([0,1,4,5,6,10,24,25,28,30,34,35]);
  const terrain=Array.from({length:size*size},(_,i)=>Math.floor(i/size)===2||i%size===3||[19,20,22,23].includes(i)?'road':buildings.has(i)?'building':'land');
  const metrics=['Air quality','Renewable energy','Green spaces','Sustainable transport','Climate resilience'];
  const upgrades={
    tree:{name:'Tree',category:'Nature',cost:50,terrain:'land',effect:[9,0,16,0,12],description:'A small canopy for a big difference. Plant beside buildings for an extra resilience benefit.'},
    park:{name:'Park',category:'Nature',cost:120,terrain:'land',effect:[14,0,28,0,24],description:'Turn a paved plot into green public space. Neighbouring buildings benefit from its shade.'},
    roof:{name:'Green roof',category:'Nature',cost:100,terrain:'building',effect:[6,6,15,0,17],description:'Retrofit an existing building with planting. Adds greenery and helps prepare the city for heat.'},
    solar:{name:'Solar panels',category:'Clean energy',cost:150,terrain:'building',effect:[6,32,0,0,6],description:'Generate electricity on an existing roof. Place near electric transport to earn a connection bonus.'},
    wind:{name:'Wind turbine',category:'Clean energy',cost:200,terrain:'land',effect:[10,44,0,0,4],description:'Use an open plot for renewable electricity. A strong energy option that leaves less room for parks.'},
    ev:{name:'EV station',category:'Clean energy',cost:100,terrain:'road',effect:[7,4,0,16,2],description:'Add charging to a road tile. Supports electric travel, but public transport benefits more people in this game.'},
    bike:{name:'Bike lane',category:'Transport',cost:80,terrain:'road',effect:[10,0,2,24,5],description:'Reclaim a road tile for cycling. Adjacent bike lanes earn a network bonus.'},
    bus:{name:'E-Bus',category:'Transport',cost:180,terrain:'road',effect:[16,0,0,38,6],description:'Create an electric bus stop. Place beside solar panels or a turbine for a clean-power bonus.'},
    tram:{name:'Electric tram',category:'Transport',cost:250,terrain:'road',effect:[20,0,0,48,7],description:'Invest in a high-capacity electric tram stop. Powerful, but it takes a larger share of your budget.'}
  };
  const challenges={
    revolution:{name:'Green Revolution',budget:1000,goal:'Reach 80 overall sustainability.',detail:'Balance nature, clean energy and transport with 1,000 Eco Points.'},
    carbon:{name:'Low-Carbon City',budget:1000,goal:'Pollution ≤15, energy ≥70, transport ≥70.',detail:'Prioritise cleaner power and ways to get around. Pollution is a simplified game index.'},
    future:{name:'City of the Future',budget:1800,goal:'Build 5 parks, 3 solar roofs and public transport; reach 80 overall.',detail:'A larger 1,800 EP grant makes this ambitious neighbourhood plan achievable.'}
  };
  const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const fresh=(challenge='revolution')=>({version:1,challenge:owns(challenges,challenge)?challenge:'revolution',moves:[]});
  function board(state){const cells=Array(36).fill(null);for(const move of state.moves)cells[move.cell]=move.type;return cells;}
  const spent=state=>state.moves.reduce((sum,m)=>sum+upgrades[m.type].cost,0);
  const remaining=state=>challenges[state.challenge].budget-spent(state);
  function canPlace(state,type,cell) {
    const item=owns(upgrades,type)?upgrades[type]:null;
    if(!item)return 'Choose an upgrade first.';
    if(!Number.isInteger(cell)||cell<0||cell>=36)return 'Choose a tile inside the city.';
    if(board(state)[cell])return 'This tile already has an upgrade. Undo a move to free it.';
    if(terrain[cell]!==item.terrain)return item.terrain==='building'?'Choose an existing building roof.':item.terrain==='road'?'Choose a road tile.':'Choose an open paved plot.';
    if(remaining(state)<item.cost)return 'Not enough Eco Points. Try a cheaper upgrade or undo a move.';
    return '';
  }
  function place(state,type,cell){const error=canPlace(state,type,cell);if(error)return {error,state};return {error:'',state:{...state,moves:[...state.moves,{cell,type}]}};}
  function neighbours(i){const r=Math.floor(i/size),c=i%size;return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([y,x])=>y>=0&&x>=0&&y<size&&x<size).map(([y,x])=>y*size+x);}
  function score(state) {
    const cells=board(state),counts={},values=[18,8,0,10,16];let shade=0,network=0,power=0;
    // Repeated purchases get smaller returns; one upgrade type cannot solve every problem.
    for(const move of state.moves){const n=counts[move.type]||0;counts[move.type]=n+1;const factor=[1,.8,.6,.45][n]??.35;upgrades[move.type].effect.forEach((v,i)=>values[i]+=v*factor);}
    cells.forEach((type,i)=>{
      if(type==='tree'||type==='park')shade+=Math.min(3,neighbours(i).filter(j=>terrain[j]==='building').length)*2;
      if(type==='bike')network+=neighbours(i).filter(j=>j>i&&cells[j]==='bike').length*3;
      if(['solar','wind'].includes(type))power+=neighbours(i).filter(j=>['bus','tram','ev'].includes(cells[j])).length*3;
    });
    values[4]+=shade;values[3]+=Math.min(12,network)+Math.min(9,power);values[1]+=Math.min(9,power);
    const scores=values.map(v=>Math.max(0,Math.min(100,Math.round(v))));
    const overall=Math.round(scores.reduce((sum,n)=>sum+n,0)/scores.length),pollution=100-scores[0];
    const completed=state.challenge==='revolution'?overall>=80:state.challenge==='carbon'?pollution<=15&&scores[1]>=70&&scores[3]>=70:(counts.park||0)>=5&&(counts.solar||0)>=3&&((counts.bus||0)+(counts.tram||0))>=1&&overall>=80;
    return {scores,overall,pollution,counts,completed,bonuses:{shade,network:Math.min(12,network),power:Math.min(9,power)}};
  }
  function restore(raw) {
    if(!raw||raw.version!==1||!owns(challenges,raw.challenge)||!Array.isArray(raw.moves)||raw.moves.length>36)throw new Error('Invalid saved city');
    let state=fresh(raw.challenge);for(const move of raw.moves){if(!move||typeof move!=='object')throw new Error('Invalid move');const result=place(state,move.type,move.cell);if(result.error)throw new Error('Invalid saved placement');state=result.state;}return state;
  }
  const label=i=>String.fromCharCode(65+Math.floor(i/size))+(i%size+1);
  const api={size,terrain,metrics,upgrades,challenges,fresh,board,spent,remaining,canPlace,place,neighbours,score,restore,label};
  if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCity=api;
})(globalThis);
