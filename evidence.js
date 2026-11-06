/* Render saved weather immediately; refresh independently without blanking the cards. */
(() => {
  'use strict';
  const root=document.getElementById('climate-explorer');
  if(!root) return;
  const $=id=>document.getElementById('ce-'+id);
  const {cities,finite,localDate,dayString,pastDate,dailyValues,url,compact}=CoilWeatherData;
  const number=(n,unit=' °C')=>finite(n)?n.toFixed(1)+unit:'Unavailable';
  const signed=n=>(n>0?'+':'')+n.toFixed(2);
  const prettyDate=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  const memory=new Map(), pending=new Map();
  const snapshot=globalThis.COIL_WEATHER_SNAPSHOT?.version===1?globalThis.COIL_WEATHER_SNAPSHOT:null;
  let generation=0, viewKey='', job=null, archiveQueue=Promise.resolve();
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function cacheGet(key) {
    try {return memory.get(key)||JSON.parse(localStorage.getItem(key));} catch {return null;}
  }
  function cacheSet(key,packet) {
    memory.set(key,packet);
    try {localStorage.setItem(key,JSON.stringify(packet));} catch { /* Private browsing keeps memory cache. */ }
  }
  function valid(packet,date) {
    try {return Number.isFinite(packet?.saved)&&finite(dailyValues(packet.data,date).temp);} catch {return false;}
  }
  function savedDay(city,date,past) {
    const key='coil-day-v2-'+city+'-'+date+'-'+(past?'past':'today');
    const local=cacheGet(key), bundled=snapshot?.cities?.[city]?.[past?'history':'forecast'];
    const packets=[local,bundled].filter(p=>valid(p,date)).sort((a,b)=>b.saved-a.saved);
    return {key,packet:packets[0]||null};
  }
  function request(address,past,onRetry) {
    if(pending.has(address)) return pending.get(address);
    const run=async()=>{
      for(let attempt=0;attempt<3;attempt++) {
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),past?15000:10000);
        let delay=1000*(attempt+1);
        try {
          const response=await fetch(address,{signal:controller.signal,cache:'no-store'});
          const data=await response.json();
          if(!response.ok||data.error) {
            const error=new Error(data.reason||'HTTP '+response.status);
            error.retryable=response.status===429||response.status>=500||/concurrent/i.test(data.reason||'');
            const seconds=Number(response.headers.get('Retry-After'));
            if(seconds>0) delay=Math.min(seconds*1000,15000);
            throw error;
          }
          return compact(data);
        } catch(error) {
          if(error.retryable===false||attempt===2) throw error;
          onRetry?.();
        } finally {clearTimeout(timer);}
        await sleep(delay);
      }
    };
    const result=(past?archiveQueue.then(run):run()).finally(()=>pending.delete(address));
    if(past) archiveQueue=result.catch(()=>{});
    pending.set(address,result);
    return result;
  }
  function condition(code) {
    if(code === 0) return 'Clear sky'; if([1,2,3].includes(code)) return 'Partly cloudy / overcast';
    if([45,48].includes(code)) return 'Fog'; if([51,53,55,56,57].includes(code)) return 'Drizzle';
    if([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
    if([71,73,75,77,85,86].includes(code)) return 'Snow'; if([95,96,99].includes(code)) return 'Thunderstorm'; return 'Conditions unavailable';
  }

  function renderDay(prefix,values) {
    ['temp','low','high','humidity','wind','rain'].forEach(key=>$(prefix+'-'+key).textContent=number(values[key],key==='humidity'?' %':key==='wind'?' km/h':key==='rain'?' mm':' °C'));
    $(prefix+'-condition').textContent=condition(values.condition);
  }
  function renderCurrent(packet,city,date) {
    const c=packet?.data.current;
    if(c?.time?.startsWith(date)&&finite(c.temperature_2m)) {
      $('current').textContent=number(c.temperature_2m);$('weather').textContent=(Date.now()-packet.saved>15*60000?'Saved reading · ':'')+condition(c.weather_code);
      $('now-metrics').textContent='Humidity '+number(c.relative_humidity_2m,' %')+' · Wind '+number(c.wind_speed_10m,' km/h')+' · Precipitation '+number(c.precipitation,' mm');
      $('updated').textContent='Model valid '+c.time.replace('T',' ')+' · '+cities[city][2]+'. Updates every 15 minutes.';
    } else {
      $('current').textContent='—';$('weather').textContent='Current reading not yet available';$('now-metrics').textContent='';$('updated').textContent='';
    }
  }
  function load(force=false) {
    const city=$('city').value,date=dayString(localDate(cities[city][2])),earlier=pastDate(date),key=city+'-'+date;
    if(job&&key===viewKey) return job;
    viewKey=key;const token=++generation;
    const state={};
    $('today-date').textContent=prettyDate(date);$('past-date').textContent=prettyDate(earlier);
    for(const prefix of ['today','past']) {
      const past=prefix==='past',target=past?earlier:date,cached=savedDay(city,target,past);
      state[prefix]={...cached,values:cached.packet?dailyValues(cached.packet.data,target):null,pending:false,error:false};
      if(cached.packet) renderDay(prefix,state[prefix].values);
      else {['temp','low','high','humidity','wind','rain'].forEach(k=>$(prefix+'-'+k).textContent='—');$(prefix+'-condition').textContent='Loading conditions…';}
    }
    renderCurrent(state.today.packet,city,date);
    function update() {
      if(token!==generation)return;
      for(const prefix of ['today','past']) {
        const s=state[prefix];
        const updated=s.packet?new Date(s.packet.saved).toLocaleString('en-GB',{timeZone:cities[city][2]}):'';
        $(prefix+'-status').textContent=s.error?(s.values?'Showing saved data from '+updated+'. The source is busy; refresh to retry.':'The weather source is busy or unavailable. Refresh to retry.'):
          s.pending?(s.values?'Showing saved data from '+updated+' · updating…':'Loading data · retrying automatically if the source is busy…'):
          s.values?(prefix==='past'?'Historical record ready.':'Forecast updated '+updated+'.'):'Loading…';
        if(s.error&&!s.values)$(prefix+'-condition').textContent='Weather unavailable';
      }
      const a=state.today.values,b=state.past.values;
      if(finite(a?.temp)&&finite(b?.temp)) {
        const diff=a.temp-b.temp;$('difference').textContent=signed(diff)+' °C';
        $('comparison').textContent=diff===0?'The same daily average temperature on both days.':'Today’s forecast daily average is '+Math.abs(diff).toFixed(2)+' °C '+(diff>0?'warmer':'cooler')+' than on '+prettyDate(earlier)+'.';
      } else {$('difference').textContent='—';$('comparison').textContent='The temperature difference needs both daily averages.';}
      const loading=Object.values(state).some(s=>s.pending);
      $('retry').disabled=loading;$('retry').textContent=loading?'Refreshing…':'Refresh data ↗';
      $('weather-status').textContent=loading?'Updating weather…':Object.values(state).some(s=>s.error)?'The source is unavailable. Saved values stay visible where available.':'Both days loaded.';
    }
    const tasks=['today','past'].map(prefix=>{
      const past=prefix==='past',s=state[prefix],target=past?earlier:date;
      // Historical observations are immutable for this comparison; refresh the forecast, not the archive on every click.
      const ttl=past?365*86400000:15*60000;
      if(s.packet&&Date.now()-s.packet.saved<ttl&&(!force||past))return Promise.resolve();
      s.pending=true;
      const address=url(past,city,past?{start_date:earlier,end_date:earlier}:{forecast_days:'2'});
      return request(address,past).then(data=>{
        const values=dailyValues(data,target);if(!finite(values.temp))throw new Error('Daily average unavailable');
        const packet={saved:Date.now(),data};cacheSet(s.key,packet);
        if(token!==generation)return;
        s.packet=packet;s.values=values;renderDay(prefix,values);if(!past)renderCurrent(packet,city,date);
      }).catch(()=>{s.error=true;}).finally(()=>{s.pending=false;update();});
    });
    update();
    const run=Promise.all(tasks).finally(()=>{if(token===generation)job=null;});job=run;return run;
  }
  window.addEventListener('app:view',event=>{if(event.detail?.id==='problem')load();});
  $('city').addEventListener('change',()=>load());
  $('retry').addEventListener('click',()=>load(true));
  // Preload on the home page, so route entry does not start a cold request.
  load();
  setInterval(()=>{
    if(document.hidden)return;
    const key=$('city').value+'-'+dayString(localDate(cities[$('city').value][2]));
    if(key!==viewKey)load();
  },1000);
  setInterval(()=>{if(!document.hidden)load();},15*60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  window.addEventListener('online',()=>load(true));
})();
