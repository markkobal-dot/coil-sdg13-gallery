/* Evidence explorer: public Open-Meteo data, no keys or third-party chart runtime. */
(() => {
  'use strict';
  const root = document.getElementById('climate-explorer');
  if (!root) return;
  const $ = id => document.getElementById('ce-' + id);
  const cities = {
    nova: [45.956, 13.648, 'Europe/Ljubljana'],
    ajdovscina: [45.887, 13.909, 'Europe/Ljubljana'],
    paris: [48.857, 2.352, 'Europe/Paris'],
    newyork: [40.713, -74.006, 'America/New_York']
  };
  let generation = 0, controller, dateKey = '', active = false, busy = false;
  const memory = new Map();
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const number = (n, unit = ' °C') => finite(n) ? n.toFixed(1) + unit : 'Unavailable';
  const signed = n => (n > 0 ? '+' : '') + n.toFixed(2);
  const localDate = zone => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date()).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const dayString = d => `${d.year}-${d.month}-${d.day}`;
  function pastDate(date) {
    const [y,m,d] = date.split('-').map(Number);
    return `${y-10}-${String(m).padStart(2,'0')}-${String(m === 2 && d === 29 && new Date(Date.UTC(y-10,2,0)).getUTCDate() < 29 ? 28 : d).padStart(2,'0')}`;
  }
  function cacheGet(key, ttl) {
    try { const v = memory.get(key) || JSON.parse(localStorage.getItem(key)); if(v && Date.now()-v.saved < ttl) return v.data; } catch { /* Storage may be unavailable. */ }
    return null;
  }
  function cacheSet(key, data) {
    const value = {saved: Date.now(), data}; memory.set(key,value);
    try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* In-memory caching remains available. */ }
  }
  async function request(url, signal) {
    const timeout = new AbortController();
    const abort = () => timeout.abort(); signal.addEventListener('abort',abort,{once:true});
    const timer = setTimeout(abort,25000);
    try { const response = await fetch(url,{signal:timeout.signal}); if(!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); if(data.error) throw new Error('API error'); return data; }
    finally {clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function url(host, city, extra) {
    const [latitude,longitude,timezone] = cities[city];
    return `https://${host}/v1/${host.startsWith('archive')?'archive':'forecast'}?` + new URLSearchParams({latitude,longitude,timezone,temperature_unit:'celsius',...extra});
  }
  function condition(code) {
    if(code === 0) return 'Clear sky'; if([1,2,3].includes(code)) return 'Partly cloudy / overcast';
    if([45,48].includes(code)) return 'Fog'; if([51,53,55,56,57].includes(code)) return 'Drizzle';
    if([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
    if([71,73,75,77,85,86].includes(code)) return 'Snow'; if([95,96,99].includes(code)) return 'Thunderstorm'; return 'Conditions unavailable';
  }
  const dailyFields = 'temperature_2m_mean,temperature_2m_min,temperature_2m_max,weather_code,wind_speed_10m_max,precipitation_sum';
  const prettyDate = date => new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
  function dailyValues(data, date) {
    const d=data.daily, i=d?.time?.indexOf(date) ?? -1;
    if(i<0) throw new Error('Requested date missing');
    const humidity=(data.hourly?.time || []).flatMap((t,j)=>t.startsWith(date) && finite(data.hourly.relative_humidity_2m?.[j]) ? [data.hourly.relative_humidity_2m[j]] : []);
    return {temp:d.temperature_2m_mean?.[i],low:d.temperature_2m_min?.[i],high:d.temperature_2m_max?.[i],condition:d.weather_code?.[i],wind:d.wind_speed_10m_max?.[i],rain:d.precipitation_sum?.[i],humidity:humidity.length?humidity.reduce((a,b)=>a+b,0)/humidity.length:null};
  }
  function renderDay(prefix, values) {
    ['temp','low','high','humidity','wind','rain'].forEach(key=>$(prefix+'-'+key).textContent=number(values[key],key==='humidity'?' %':key==='wind'?' km/h':key==='rain'?' mm':' °C'));
    $(prefix+'-condition').textContent=condition(values.condition);
    $(prefix+'-status').textContent=Object.values(values).every(finite)?'': 'Some measurements are unavailable from the source.';
  }
  async function load(force=false) {
    const city=$('city').value, date=dayString(localDate(cities[city][2])), earlier=pastDate(date);
    controller?.abort(); controller=new AbortController(); const signal=controller.signal, token=++generation;busy=true;dateKey=date;
    ['today','past'].forEach(prefix=>{['temp','low','high','humidity','wind','rain'].forEach(key=>$(prefix+'-'+key).textContent='—');$(prefix+'-condition').textContent='Loading conditions…';$(prefix+'-status').textContent='Loading…';});
    $('today-date').textContent=prettyDate(date);$('past-date').textContent=prettyDate(earlier);
    $('current').textContent='—';$('weather').textContent='Loading current weather…';$('now-metrics').textContent='';$('updated').textContent='';$('difference').textContent='—';$('comparison').textContent='Waiting for both days…';$('weather-status').textContent='Fetching weather…';
    async function getDay(past) {
      const target=past?earlier:date, prefix=past?'past':'today', key=`coil-day-v2-${city}-${target}-${prefix}`;
      try {
        let data=(!force||past)&&cacheGet(key,past?365*86400000:15*60*1000);
        if(!data){data=await request(url(past?'archive-api.open-meteo.com':'api.open-meteo.com',city,{daily:dailyFields,hourly:'relative_humidity_2m',wind_speed_unit:'kmh',...(past?{start_date:target,end_date:target,models:'era5'}:{forecast_days:'1',current:'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation'})}),signal);cacheSet(key,data);}
        if(token!==generation)return null;
        const values=dailyValues(data,target);renderDay(prefix,values);
        if(!past){const c=data.current;if(c){$('current').textContent=number(c.temperature_2m);$('weather').textContent=condition(c.weather_code);$('now-metrics').textContent=`Humidity ${number(c.relative_humidity_2m,' %')} · Wind ${number(c.wind_speed_10m,' km/h')} · Precipitation ${number(c.precipitation,' mm')}`;$('updated').textContent=`Model valid ${c.time?.replace('T',' ') || 'time unavailable'} · ${cities[city][2]}. Updates every 15 minutes.`;}else $('weather').textContent='Current reading unavailable';}
        return values;
      } catch(e) {if(token===generation){$(prefix+'-condition').textContent='Weather unavailable';$(prefix+'-status').textContent='Could not load this day. Please retry.';if(!past)$('weather').textContent='Current weather unavailable';}return null;}
    }
    const [today,past]=await Promise.all([getDay(false),getDay(true)]);
    if(token!==generation)return;
    busy=false;
    if(finite(today?.temp)&&finite(past?.temp)){
      const diff=today.temp-past.temp;$('difference').textContent=signed(diff)+' °C';$('comparison').textContent=diff===0?'The same daily average temperature on both days.':`Today’s forecast daily average is ${Math.abs(diff).toFixed(2)} °C ${diff>0?'warmer':'cooler'} than on ${prettyDate(earlier)}.`;
      $('weather-status').textContent='Both days loaded.';
    }else{$('comparison').textContent='The temperature difference needs both daily averages.';$('weather-status').textContent='Some data is unavailable. Please retry.';}
  }
  // Loading starts only when this existing routed section becomes visible.
  new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!active){active=true;load();}},{rootMargin:'100px'}).observe(root);
  $('city').addEventListener('change',()=>{active=true;load();});$('retry').addEventListener('click',()=>load(true));
  function tick(){if(!active)return;const date=dayString(localDate(cities[$('city').value][2]));if(date!==dateKey||!busy)load();}
  setInterval(()=>{if(active&&dayString(localDate(cities[$('city').value][2]))!==dateKey)load();},30000);
  setInterval(tick,15*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)tick();});
})();
