// Pure data/date regression checks; uses Node's built-in test runner.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context={document:{getElementById:()=>({addEventListener(){}}),addEventListener(){}},IntersectionObserver:class{observe(){}},setInterval(){},Intl,Date,Map,AbortController};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../evidence.js'),'utf8').replace(/\}\)\(\);\s*$/, 'globalThis.helpers = {pastDate, localDate, dayString, dailyValues};})();'),context);
const {pastDate,aggregate}=context.helpers;
test('ten-year anniversary handles leap days',()=>{assert.equal(pastDate('2024-02-29'),'2014-02-28');assert.equal(pastDate('2026-11-06'),'2016-11-06');});
test('daily values preserve zero and missing data',()=>{const values=context.helpers.dailyValues({daily:{time:['2026-11-06'],temperature_2m_mean:[0],precipitation_sum:[0]},hourly:{time:['2026-11-06T00:00','2026-11-06T01:00'],relative_humidity_2m:[60,80]}},'2026-11-06');assert.equal(values.temp,0);assert.equal(values.rain,0);assert.equal(values.humidity,70);assert.equal(values.wind,undefined);assert.throws(()=>context.helpers.dailyValues({daily:{time:[]}},'2026-11-06'),/missing/);});
test('city calendar changes at local midnight',()=>{vm.runInContext("Date = class extends globalThis.Date { constructor(...args) { super(...(args.length ? args : ['2026-11-06T04:59:59Z'])); } }",context);assert.equal(context.helpers.dayString(context.helpers.localDate('America/New_York')),'2026-11-05');assert.equal(context.helpers.dayString(context.helpers.localDate('Europe/Ljubljana')),'2026-11-06');vm.runInContext("Date = class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-06T05:00:00Z'])); } }",context);assert.equal(context.helpers.dayString(context.helpers.localDate('America/New_York')),'2026-11-06');});
