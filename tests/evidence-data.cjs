// Pure data/date regression checks; uses Node's built-in test runner.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context={document:{getElementById:()=>({addEventListener(){}}),addEventListener(){}},IntersectionObserver:class{observe(){}},setInterval(){},Intl,Date,Map,AbortController};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../evidence.js'),'utf8').replace(/\}\)\(\);\s*$/, 'globalThis.helpers = {pastDate, localDate, dayString, aggregate};})();'),context);
const {pastDate,aggregate}=context.helpers;
test('ten-year anniversary handles leap days',()=>{assert.equal(pastDate('2024-02-29'),'2014-02-28');assert.equal(pastDate('2026-11-06'),'2016-11-06');});
function daily(){const time=[],temperature_2m_mean=[];for(let d=new Date('1980-01-01Z');d<new Date('2026-01-01Z');d.setUTCDate(d.getUTCDate()+1)){time.push(d.toISOString().slice(0,10));temperature_2m_mean.push(d.getUTCFullYear()-1980);}return {time,temperature_2m_mean};}
test('full years, baseline and incomplete years',()=>{const d=daily();let rows=aggregate(d,2025);assert.equal(rows.length,46);assert.equal(rows.find(r=>r.year===2000).mean,20);assert.equal(rows.find(r=>r.year===2000).anomaly,-5.5);d.temperature_2m_mean[d.temperature_2m_mean.length-1]=null;rows=aggregate(d,2025);assert.equal(rows.at(-1).year,2024);assert.equal(aggregate(d,2023).at(-1).year,2023);});
test('missing baseline refuses anomalies',()=>{const d=daily();d.temperature_2m_mean[d.time.indexOf('2000-02-29')]=null;assert.throws(()=>aggregate(d,2025),/baseline/);});
test('city calendar changes at local midnight',()=>{vm.runInContext("Date = class extends globalThis.Date { constructor(...args) { super(...(args.length ? args : ['2026-11-06T04:59:59Z'])); } }",context);assert.equal(context.helpers.dayString(context.helpers.localDate('America/New_York')),'2026-11-05');assert.equal(context.helpers.dayString(context.helpers.localDate('Europe/Ljubljana')),'2026-11-06');vm.runInContext("Date = class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-06T05:00:00Z'])); } }",context);assert.equal(context.helpers.dayString(context.helpers.localDate('America/New_York')),'2026-11-06');});
