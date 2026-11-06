// Refresh a small, genuine Open-Meteo snapshot for fast first visits on GitHub Pages.
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const {cities,localDate,dayString,pastDate,dailyValues,url,compact,finite}=require('../weather-data.js');
const destination=path.join(__dirname,'../assets/data/weather-snapshot.js');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function request(address) {
  for(let attempt=0;attempt<5;attempt++) {
    try {
      const response=await fetch(address,{signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok||data.error)throw new Error(data.reason||'HTTP '+response.status);
      return compact(data);
    } catch(error) {
      if(attempt===4)throw error;
      await sleep(Math.min(2000*2**attempt,16000));
    }
  }
}
function shift(date,days) {const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
async function main() {
  let snapshot={version:1,cities:{}};
  try {const context={};vm.runInNewContext(await fs.readFile(destination,'utf8'),context);if(context.COIL_WEATHER_SNAPSHOT?.version===1)snapshot=context.COIL_WEATHER_SNAPSHOT;} catch { /* First snapshot. */ }
  let failures=0;
  for(const city of Object.keys(cities)) {
    const date=dayString(localDate(cities[city][2]));
    snapshot.cities[city] ||= {};
    for(const past of [false,true]) {
      const kind=past?'history':'forecast';
      const target=past?pastDate(date):date;
      const existing=snapshot.cities[city][kind];
      // Keep a month's history ready, including tomorrow; no repeated archive downloads.
      if(past&&existing) {
        try {dailyValues(existing.data,pastDate(shift(date,7)));dailyValues(existing.data,target);continue;} catch { /* Refill coverage. */ }
      }
      try {
        const data=await request(url(past,city,past?{start_date:pastDate(shift(date,-1)),end_date:pastDate(shift(date,32))}:{past_days:'1',forecast_days:'7'}));
        if(!finite(dailyValues(data,target).temp))throw new Error('Requested daily average missing');
        snapshot.cities[city][kind]={saved:Date.now(),data};
        console.log(city+' '+kind+' ready');
      } catch(error) {failures++;console.error(city+' '+kind+': '+error.message+'; keeping any previous snapshot.');}
    }
  }
  snapshot.generatedAt=new Date().toISOString();
  await fs.mkdir(path.dirname(destination),{recursive:true});
  const payload='/* Generated from Open-Meteo; do not edit measurements by hand. */\nglobalThis.COIL_WEATHER_SNAPSHOT = '+JSON.stringify(snapshot)+';\n';
  await fs.writeFile(destination+'.tmp',payload);
  await fs.rename(destination+'.tmp',destination);
  const missing=Object.keys(cities).filter(city=>!snapshot.cities[city].forecast||!snapshot.cities[city].history);
  if(missing.length) {console.error('Snapshot still incomplete for '+missing.join(', '));process.exitCode=1;}
  else if(failures) console.warn('Some sources were unavailable; previous measurements were retained.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
