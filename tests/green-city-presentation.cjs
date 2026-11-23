'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../green-city-core.js');
const Life = require('../green-city-life.js');
const createPresentationCity = require('../assets/data/green-city-presentation.js');

test('the presentation island starts fully owned, connected and operational', () => {
  const city = createPresentationCity(C);
  const analysis = C.analyse(city);
  assert.equal(city.name, 'Harbour Green');
  assert.equal(analysis.tier, 4);
  assert.ok(C.landReports(city, analysis).every(district => district.owned));
  assert.ok(city.reclaimed.length > 0);
  assert.ok(analysis.homeProfiles.every(home => home.linked));
  assert.equal(analysis.housing.housed, city.population);
  assert.ok(analysis.workforce.filled > 1000);
  assert.deepEqual(analysis.scores, [100, 100, 100, 100, 100]);
  assert.equal(analysis.overall, 100);
  assert.equal(analysis.happiness, 100);
  assert.ok(analysis.life.groups.every(group => group.happiness === 100));
  assert.ok(analysis.neighbourhoods.every(home => home.needs.length === 0));
  assert.ok(analysis.transport.congestion <= 10);
  assert.ok(analysis.cleanPower >= analysis.demand);
  assert.ok(analysis.net > 0);
  assert.equal(analysis.beachAccess.beaches.filter(beach => beach.accessible).length, 4);
  assert.equal(analysis.tourism.hotels.length, 3);
  assert.ok(analysis.tourism.hotels.every(hotel => hotel.guests > 0));
  assert.equal(analysis.transport.routes.length, 4);
  assert.ok(analysis.transport.routes.every(route => route.active && route.riders > 0));
  const operations = Life.regionalOperations(C, city, analysis);
  assert.equal(operations.filter(operation => operation.kind === 'air').length, 2);
  assert.equal(operations.filter(operation => operation.kind === 'sea').length, 4);
  assert.ok(operations.every(operation => operation.active && operation.filled > 0));
});

test('presentation sessions start from independent copies of the same city', () => {
  const original = createPresentationCity(C);
  const next = C.advance(original);
  assert.equal(next.error, '');
  assert.equal(next.state.month, original.month + 1);
  assert.deepEqual(createPresentationCity(C), original);
});

test('presentation road fixtures follow their streets and bus shelters avoid junctions', () => {
  const city = createPresentationCity(C);
  const roads = C.analyse(city).roads;
  for (const [i, cell] of city.cells.entries()) {
    if (C.upgrades[cell?.type]?.site !== 'road') continue;
    const adjacent = C.neighbours(i).filter(j => roads.has(j));
    const eastWest = adjacent.some(j => Math.abs(j - i) === 1);
    const northSouth = adjacent.some(j => Math.abs(j - i) === C.size);
    const description = cell.type + ' at ' + C.label(i);
    if (cell.type === 'bus') assert.notEqual(eastWest, northSouth, description);
    if (eastWest !== northSouth) assert.equal((cell.rotation || 0) % 2, northSouth ? 1 : 0, description);
  }
});

test('the presentation programme affects live scores and survives save and restore', () => {
  const city = createPresentationCity(C);
  const restored = C.restore(JSON.parse(JSON.stringify(city)));
  const funded = C.analyse(restored);
  const unfunded = C.analyse({ ...restored, climateProgram: false });
  assert.equal(funded.budget.climateProgram, 90);
  assert.equal(unfunded.budget.climateProgram, 0);
  assert.ok(unfunded.scores[0] < funded.scores[0]);
  assert.ok(unfunded.happiness < funded.happiness);
  const higherFares = C.setPolicy(restored, 'transitFare', 5);
  assert.equal(higherFares.error, '');
  assert.ok(C.analyse(higherFares.state).happiness < 100);
});

test('new city names survive save and restore, with a default for older cities', () => {
  const city = C.fresh('revolution', '  Ajdovščina   ob Vipavi  ');
  assert.equal(city.name, 'Ajdovščina ob Vipavi');
  assert.equal(C.restore(JSON.parse(JSON.stringify(city))).name, city.name);
  const { name, ...oldSave } = city;
  assert.equal(C.restore(oldSave).name, 'New Terra');
  assert.equal(C.fresh('revolution', '   ').name, 'New Terra');
  assert.equal(C.fresh('revolution', 'a'.repeat(60)).name.length, 48);
});
