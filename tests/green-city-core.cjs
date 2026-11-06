const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../green-city-core.js');

function build(challenge, moves) {
  return moves.reduce((state, [type, cell]) => {
    const result = C.place(state, type, cell);
    assert.equal(result.error, '', `${type} on ${cell}: ${result.error}`);
    return result.state;
  }, C.fresh(challenge));
}

test('an ordinary city starts with no greenery, high pollution, and the correct grant', () => {
  const state = C.fresh();
  assert.equal(C.remaining(state), 1000);
  assert.equal(C.score(state).scores[2], 0);
  assert.equal(C.score(state).pollution, 82);
  assert.equal(C.score(state).completed, false);
  assert.equal(C.remaining(C.fresh('future')), 1800);
  assert.equal(C.terrain.length, 36);
  assert.equal(C.terrain.filter(t => t === 'land').length, 9);
});

test('all nine upgrades charge their actual cost and only fit their declared terrain', () => {
  for (const [type, item] of Object.entries(C.upgrades)) {
    const cell = C.terrain.indexOf(item.terrain);
    const initial = C.fresh();
    const result = C.place(initial, type, cell);
    assert.equal(result.error, '');
    assert.equal(C.remaining(result.state), 1000 - item.cost);
    assert.equal(C.board(result.state)[cell], type);
    assert.deepEqual(initial.moves, [], 'placement must not mutate the previous state');
    for (const terrain of ['land', 'building', 'road'].filter(t => t !== item.terrain)) {
      const rejected = C.place(initial, type, C.terrain.indexOf(terrain));
      assert.ok(rejected.error);
      assert.equal(rejected.state, initial);
      assert.equal(C.remaining(rejected.state), 1000);
    }
    const duplicate = C.place(result.state, type, cell);
    assert.ok(duplicate.error);
    assert.equal(duplicate.state, result.state);
  }
});

test('budget is never negative; undo restores the tile, the exact budget, and scores', () => {
  let state = build('revolution', [['tram',12],['tram',13],['tram',14]]);
  const before = state;
  state = C.place(state,'tram',15).state;
  assert.equal(C.remaining(state), 0);
  const rejected = C.place(state,'tree',2);
  assert.ok(rejected.error.includes('Eco Points'));
  assert.equal(rejected.state, state);
  const undone = {...state, moves:state.moves.slice(0,-1)};
  assert.equal(C.remaining(undone), 250);
  assert.deepEqual(C.board(undone), C.board(before));
  assert.deepEqual(C.score(undone), C.score(before));
});

test('three missions can be completed with legal purchases inside their grants', () => {
  const plans = {
    revolution:[['park',2],['park',7],['solar',0],['solar',1],['bus',12],['bike',13],['bike',14],['roof',4]],
    carbon:[['solar',0],['solar',1],['wind',2],['bus',12],['bike',13],['bike',14],['tree',7],['roof',4]],
    future:[['park',2],['park',7],['park',8],['park',11],['park',18],['solar',0],['solar',1],['solar',4],['bus',12]]
  };
  for (const [challenge, moves] of Object.entries(plans)) {
    const city = build(challenge, moves);
    assert.ok(C.remaining(city) >= 0);
    assert.equal(C.score(city).completed, true, challenge);
    assert.equal(C.score({...city, moves:city.moves.slice(0,-1)}).completed, false, `${challenge} must still need its final purchase`);
    assert.deepEqual(C.restore(JSON.parse(JSON.stringify(city))), city);
  }
});

test('mission completion checks the specific targets, not just the overall score', () => {
  const city = build('future', [['park',2],['park',7],['park',8],['park',11],['solar',0],['solar',1],['solar',4],['bus',12],['roof',5]]);
  assert.ok(C.score(city).overall >= 80);
  assert.equal(C.score(city).completed, false, 'four parks are not five');
  const unbalanced = build('carbon', [['park',2],['park',7],['roof',4],['roof',5],['solar',0],['bus',12],['bike',13],['bike',14]]);
  assert.ok(C.score(unbalanced).overall >= 80);
  assert.ok(C.score(unbalanced).scores[1] < 70);
  assert.equal(C.score(unbalanced).completed, false, 'a high average does not replace the clean-energy target');
  const carbon = build('carbon', [['park',2],['park',7],['solar',0],['solar',1],['bus',12],['bike',13],['bike',14],['roof',4]]);
  assert.ok(C.score(carbon).overall >= 80);
  assert.equal(C.score(carbon).completed, true);
});

test('placement earns actual bonuses for shade, cycle networks, and clean-power links', () => {
  assert.deepEqual(C.neighbours(5).sort((a,b)=>a-b), [4,11], 'adjacency never wraps between rows');
  const shaded = C.score(build('revolution', [['tree',7]]));
  assert.ok(shaded.bonuses.shade > 0);
  assert.equal(C.score(build('revolution', [['tree',32]])).bonuses.shade, 0);
  const connected = C.score(build('revolution', [['bike',12],['bike',13]]));
  const separate = C.score(build('revolution', [['bike',12],['bike',17]]));
  assert.equal(connected.bonuses.network, 3);
  assert.equal(connected.scores[3] - separate.scores[3], 3);
  const linked = C.score(build('revolution', [['solar',6],['bus',12]]));
  const unlinked = C.score(build('revolution', [['solar',0],['bus',12]]));
  assert.equal(linked.bonuses.power, 3);
  assert.equal(linked.scores[1] - unlinked.scores[1], 3);
  assert.equal(linked.scores[3] - unlinked.scores[3], 3);
});

test('repeated upgrades give diminishing returns and scores stay within 0–100', () => {
  const one = build('future', [['solar',0]]);
  const two = build('future', [['solar',0],['solar',1]]);
  const three = build('future', [['solar',0],['solar',1],['solar',4]]);
  const base = C.score(C.fresh()).scores[1];
  assert.ok(C.score(one).scores[1] - base > C.score(two).scores[1] - C.score(one).scores[1]);
  assert.ok(C.score(two).scores[1] - C.score(one).scores[1] > C.score(three).scores[1] - C.score(two).scores[1]);
  // Deterministic, varied complete games exercise every upgrade and every tile type.
  const types = Object.keys(C.upgrades);
  for (let seed = 0; seed < 80; seed++) {
    let state = C.fresh(['revolution','carbon','future'][seed % 3]);
    for (let turn = 0; turn < 80; turn++) {
      const type = types[(turn * 7 + seed) % types.length], cell = (turn * 13 + seed * 5) % 36;
      state = C.place(state,type,cell).state;
      const s = C.score(state);
      assert.ok(C.remaining(state) >= 0);
      assert.ok([...s.scores,s.overall,s.pollution].every(n => Number.isInteger(n) && n >= 0 && n <= 100));
    }
    assert.deepEqual(C.restore(JSON.parse(JSON.stringify(state))), state);
  }
});

test('invalid cells, unknown upgrades, and corrupt or overspent saves are rejected', () => {
  for (const cell of [-1,36,1.5,'2',null,NaN]) assert.ok(C.canPlace(C.fresh(),'tree',cell));
  for (const type of ['dragon','constructor','__proto__','toString',null]) assert.ok(C.canPlace(C.fresh(),type,2));
  for (const raw of [null,{}, {version:2,challenge:'revolution',moves:[]}, {version:1,challenge:'constructor',moves:[]}, {version:1,challenge:'revolution',moves:[{type:'tree',cell:0}]}, {version:1,challenge:'revolution',moves:[{type:'tree',cell:2},{type:'park',cell:2}]}, {version:1,challenge:'revolution',moves:[12,13,14,15,16].map(cell=>({type:'tram',cell}))}]) assert.throws(()=>C.restore(raw));
  assert.equal(C.fresh('constructor').challenge, 'revolution');
  const legitimate = build('revolution', [['tree',2]]);
  assert.equal(C.remaining(C.restore({...legitimate,budget:999999,overall:100})), 950, 'saved scores and budgets are never trusted');
});
