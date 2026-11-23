/* A playable, fully owned island kept separate from the player's saved city. */
(function (host) {
  'use strict';

  function createPresentationCity(C) {
    const city = {
      ...C.fresh('sandbox', 'Harbour Green'),
      cells: Array(C.size ** 2).fill(null),
      month: 37,
      cityLevel: 4,
      population: 4600,
      affluentPopulation: 240,
      cash: 48000,
      climateProgram: true,
      policies: C.policies({ cleanIndustry: true, residentialTax: 6, businessTax: 18, transitFare: 1, utilityTariff: 0, serviceBudget: 95 }),
      log: ['Harbour Green funds lower-emission airport and port operations and housing co-ops.'],
    };
    const tile = (row, column) => row * C.size + column;

    function road(row, column) {
      const i = tile(row, column);
      city.cells[i] = { type: 'road', level: 1, roof: null, paid: C.upgrades.road.cost };
    }
    for (const row of [4, 9, 14, 18, 23]) {
      for (let column = 3; column <= 24; column++) road(row, column);
    }
    for (const [column, start, end] of [[5, 2, 24], [10, 2, 23], [15, 2, 25], [20, 3, 23], [24, 4, 25]]) {
      for (let row = start; row <= end; row++) road(row, column);
    }
    for (const [row, column] of [[8, 25], [24, 3], [25, 3]]) {
      road(row, column);
    }
    city.reclaimed = [[12, 2], [13, 2], [14, 2]].map(([row, column]) => tile(row, column));
    road(14, 2);

    function place(type, row, column, level = 1, roof = null, rotation = 0) {
      const i = tile(row, column);
      const item = C.upgrades[type];
      const plots = C.footprint(type, i, rotation);
      const occupied = j => item.site === 'road' ? city.cells[j]?.type !== 'road' : !!city.cells[j];
      if (!plots.length || plots.some(j => C.terrainAt(city, j) !== 'land' || occupied(j))) {
        throw new Error('Presentation layout conflict at ' + C.label(i) + ' for ' + type);
      }
      const roofPaid = roof ? C.upgrades[roof].cost : 0;
      city.cells[i] = { type, level, roof, paid: item.cost + roofPaid, ...(roof ? { roofPaid } : {}), ...(rotation ? { rotation } : {}) };
      for (const j of plots.slice(1)) city.cells[j] = { type, level: 1, roof: null, paid: 0, anchor: i };
    }

    // Regional connections and beaches have clear approaches and permanent public space.
    place('internationalairport', 19, 16);
    place('airport', 24, 10);
    place('containerport', 24, 20);
    place('cargoport', 25, 1);
    place('marina', 25, 5);
    place('ferry', 8, 26);
    place('resorthotel', 11, 25, 1, null, 1);
    place('hotel', 6, 18, 2, 'solar');
    place('hotel', 10, 6, 2, 'roof');
    place('parking', 11, 8);
    place('parking', 6, 22);
    for (const [row, column, rotation] of [[1, 7, 0], [10, 3, 1], [5, 26, 1], [15, 26, 1]]) {
      place('beach', row, column, 1, null, rotation);
    }
    for (const [row, column] of [[2, 8], [11, 4], [5, 25], [15, 25]]) place('beachbar', row, column);

    const districts = [
      ['regionalhospital', 10, 11, 2, 'solar'], ['hospital', 6, 14, 2, 'solar'],
      ['clinic', 3, 6, 2], ['clinic', 10, 19, 2], ['clinic', 19, 9, 2],
      ['clinic', 5, 22, 2], ['clinic', 16, 21, 2], ['clinic', 16, 4, 2],
      ['firestation', 5, 9, 2], ['firestation', 10, 16, 2], ['firestation', 15, 21, 2], ['firestation', 19, 6, 2],
      ['firestation', 5, 21, 2], ['firestation', 17, 14, 2],
      ['school', 5, 6, 2, 'roof'], ['school', 8, 14, 2, 'roof'], ['school', 15, 11, 2],
      ['library', 8, 4, 2], ['library', 10, 13, 2], ['library', 15, 19, 2], ['library', 3, 22, 2], ['library', 8, 22, 2],
      ['market', 8, 9, 2], ['market', 13, 16, 2], ['market', 17, 7, 2], ['market', 17, 23, 2],
      ['officepark', 12, 21, 2, 'solar'], ['officepark', 19, 11, 2, 'solar'],
      ['office', 10, 9, 2, 'roof'], ['office', 15, 14, 2, 'solar'], ['office', 17, 21, 2],
      ['gamestudio', 10, 14, 2, 'solar'], ['ailab', 15, 16, 2, 'solar'],
      ['ecofactory', 22, 11, 2, 'solar'], ['ecofactory', 22, 16, 2, 'solar'],
      ['recycling', 22, 9, 2], ['recycling', 24, 16, 2], ['waterworks', 22, 19, 2], ['waterworks', 24, 19, 2],
      ['heat', 17, 11, 2], ['heat', 13, 23, 2], ['geothermal', 22, 21, 2, 'solar'],
      ['stadium', 24, 13],
    ];
    for (const site of districts) place(...site);

    // Urban blocks sit between green courtyards rather than filling the shoreline.
    for (const [row, columns] of [
      [3, [4, 7, 9, 11, 13, 16, 18, 21, 23]], [5, [4, 7, 11, 13, 16, 18, 23]],
      [8, [6, 11, 13, 16, 18, 21, 23]], [10, [17, 21, 23]],
      [13, [4, 6, 7, 11, 13, 14, 18, 19]], [15, [4, 9, 13, 18, 23]],
      [17, [4, 6, 9, 13]], [19, [4, 7, 8]],
    ]) {
      for (const column of columns) {
        const central = row >= 5 && row <= 15 && column >= 9 && column <= 21;
        const type = central && (row + column) % 4 === 0 ? 'luxuryapartment' :
          central || (row + column) % 3 === 0 ? 'apartment' : (row + column) % 5 === 0 ? 'luxuryhouse' : 'house';
        const level = central ? 2 + Number((row + column) % 3 === 0) : 1 + Number((row + column) % 3 === 0);
        place(type, row, column, level, (row + column) % 3 === 0 ? 'solar' : 'roof');
      }
    }
    place('apartment', 12, 16, 2, 'roof');
    place('luxuryhouse', 7, 14, 1, 'roof');
    const greenery = [
      ['forest', 2, 4], ['park', 2, 7], ['park', 2, 9], ['orchard', 2, 12],
      ['garden', 2, 13], ['park', 2, 17], ['forest', 2, 22], ['forest', 2, 24],
      ['park', 3, 8], ['plaza', 3, 17], ['wetland', 3, 25], ['garden', 5, 12],
      ['park', 5, 17], ['park', 6, 7], ['playground', 6, 8], ['park', 6, 12], ['forest', 6, 13],
      ['park', 7, 4], ['orchard', 7, 7], ['forest', 7, 9], ['park', 7, 11],
      ['forest', 7, 13], ['park', 7, 17], ['wetland', 7, 25],
      ['garden', 8, 8], ['park', 8, 17], ['forest', 8, 19], ['wetland', 10, 4],
      ['plaza', 11, 13], ['park', 11, 16], ['park', 11, 18], ['playground', 11, 21],
      ['wetland', 12, 2], ['forest', 12, 4], ['garden', 12, 6], ['park', 12, 7],
      ['park', 12, 12], ['forest', 12, 17], ['garden', 12, 19], ['wetland', 13, 2],
      ['park', 13, 8], ['plaza', 13, 12], ['park', 15, 12], ['garden', 16, 13],
      ['park', 15, 22], ['forest', 16, 9], ['park', 16, 12], ['forest', 16, 19],
      ['wetland', 16, 25], ['forest', 17, 8], ['park', 17, 12], ['plaza', 17, 17],
      ['forest', 17, 19], ['forest', 17, 22], ['park', 20, 6], ['park', 20, 7],
      ['forest', 21, 4], ['orchard', 21, 8], ['wetland', 24, 7], ['wetland', 26, 17],
      ['park', 2, 21], ['park', 3, 3], ['park', 4, 25], ['park', 6, 21], ['park', 6, 25],
      ['park', 9, 25], ['park', 10, 22], ['park', 10, 25], ['park', 12, 14],
      ['park', 15, 3], ['park', 16, 3], ['park', 17, 3], ['park', 17, 18], ['park', 19, 3],
    ];
    for (const [type, row, column] of greenery) place(type, row, column, type === 'park' ? 2 : 1);
    for (const [row, column] of [[20, 13], [21, 6], [22, 7], [24, 8], [25, 8], [24, 25], [25, 25]]) place('solarfarm', row, column, 2);
    for (const [row, column] of [[1, 22], [2, 25], [20, 2], [21, 2], [23, 2], [25, 23]]) place('wind', row, column, 2);
    for (const [row, column] of [[20, 8], [22, 13], [24, 23]]) place('battery', row, column, 2);

    // Road fixtures run east-west at zero rotation. Turn the waterfront stops
    // toward the east curb on straight north-south blocks between junctions.
    for (const [type, row, column] of [
      ['bus', 4, 6], ['bus', 4, 16], ['bus', 4, 23], ['bus', 18, 23],
      ['bus', 18, 17], ['bus', 23, 22], ['bus', 14, 4], ['bus', 18, 7], ['bus', 23, 6],
      ['tram', 9, 6], ['tram', 9, 12], ['tram', 9, 18], ['tram', 14, 21],
      ['metro', 4, 12], ['metro', 14, 12], ['ev', 23, 13],
      ['bikeshare', 9, 8], ['bikeshare', 14, 8],
    ]) place(type, row, column, ['bus', 'tram', 'metro'].includes(type) ? 2 : 1);
    place('bus', 10, 24, 2, null, 3);
    place('bus', 13, 24, 2, null, 3);
    for (const [row, columns] of [
      [4, [7, 8, 9, 10, 11, 13, 14, 17, 18, 19]],
      [9, [4, 5, 7, 9, 10, 11, 13, 14, 15, 16, 17, 19]],
      [14, [5, 6, 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20]],
      [18, [10, 11, 12, 13]],
    ]) {
      for (const column of columns) place('bike', row, column);
    }
    place('bike', 13, 10, 1, null, 1);
    const lines = [
      ['Coast & Beaches', 'bus', [[4, 6], [4, 16], [4, 23], [10, 24], [13, 24]]],
      ['Central Tram', 'tram', [[9, 6], [9, 12], [9, 18], [14, 21]]],
      ['Airport & Harbour', 'bus', [[13, 24], [18, 23], [18, 17], [23, 22]]],
      ['West Bay Local', 'bus', [[4, 6], [14, 4], [18, 7], [23, 6]]],
    ];
    let state = C.restore(city);
    for (const [index, [name, type, stops]] of lines.entries()) {
      const result = C.setRoute(state, { name, type, stops: stops.map(([row, column]) => tile(row, column)), colour: C.routeColours[index], enabled: true });
      if (result.error) throw new Error(name + ': ' + result.error);
      state = result.state;
    }
    return state;
  }

  if (typeof module === 'object' && module.exports) module.exports = createPresentationCity;
  else host.createPresentationCity = createPresentationCity;
})(globalThis);
