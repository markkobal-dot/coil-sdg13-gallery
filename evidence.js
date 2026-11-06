/* Evidence explorer: public Open-Meteo data, no keys or third-party chart runtime. */
(() => {
  'use strict';
  const root = document.getElementById('climate-explorer');
  if (!root) return;
  const $ = id => document.getElementById('ce-' + id);
  const cities = {
    nova: [45.956, 13.648, 'Europe/Ljubljana'],
    ljubljana: [46.057, 14.505, 'Europe/Ljubljana'],
    london: [51.507, -0.128, 'Europe/London'],
    newyork: [40.713, -74.006, 'America/New_York']
  };
  let generation = 0, controller, rows = [], dateKey = '', active = false, busy = false;
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
  function aggregate(daily, end) {
    if(!Array.isArray(daily?.time) || daily.time.length !== daily.temperature_2m_mean?.length) throw new Error('Incomplete archive response');
    const years = new Map();
    daily.time.forEach((date,i) => {const y=Number(date.slice(0,4));if(y<1980||y>end)return; if(!years.has(y))years.set(y,new Map());years.get(y).set(date,daily.temperature_2m_mean[i]);});
    const result=[];
    for(const [year,days] of years) {
      const count = (Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
      if(days.size===count && [...days.values()].every(finite))result.push({year,mean:[...days.values()].reduce((a,b)=>a+b,0)/count});
    }
    const base=result.filter(r=>r.year>=1991&&r.year<=2020);
    if(base.length!==30) throw new Error('The full 1991–2020 baseline is unavailable');
    const baseline=base.reduce((a,b)=>a+b.mean,0)/30;
    return result.sort((a,b)=>a.year-b.year).map(r=>({...r,anomaly:r.mean-baseline}));
  }
  function draw() {
    if(!rows.length)return;
    const mode=$('mode').value, selected=Number($('year').value), row=rows.find(r=>r.year===selected);
    $('selected-year').value=String(selected);
    $('year-detail').textContent=row?`${selected} · Annual mean ${number(row.mean)} · Anomaly ${signed(row.anomaly)} °C relative to 1991–2020.`:`${selected} · Complete annual data unavailable.`;
    const values=rows.map(r=>r[mode]); const low=Math.floor(Math.min(...values,mode==='anomaly'?0:Infinity))-0.5, high=Math.ceil(Math.max(...values,mode==='anomaly'?0:-Infinity))+0.5;
    const x=y=>55+(y-rows[0].year)/(rows.at(-1).year-rows[0].year||1)*720, y=v=>225-(v-low)/(high-low)*195;
    const ns='http://www.w3.org/2000/svg', svg=$('chart');svg.replaceChildren();
    function add(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;}
    add('title',{id:'ce-chart-title'},`${$('city').selectedOptions[0].text}: ${mode==='mean'?'annual mean temperature':'annual temperature anomaly'}`);
    add('desc',{id:'ce-chart-desc'},`Complete years ${rows[0].year}–${rows.at(-1).year}. Baseline 1991–2020. Use the year slider or data table for exact values.`);
    for(let i=0;i<5;i++){const v=low+(high-low)*i/4;add('line',{x1:55,x2:775,y1:y(v),y2:y(v),stroke:'#d9ddd4'});add('text',{x:3,y:y(v)+4},v.toFixed(1)+'°');}
    if(mode==='anomaly')add('line',{x1:55,x2:775,y1:y(0),y2:y(0),stroke:'#59655e','stroke-dasharray':'4 4'});
    add('path',{d:rows.map((r,i)=>(i && rows[i-1].year===r.year-1?'L':'M')+x(r.year)+','+y(r[mode])).join(' '),fill:'none',stroke:'#bf4b2e','stroke-width':2.5});
    rows.forEach(r=>{const c=add('circle',{cx:x(r.year),cy:y(r[mode]),r:r.year===selected?6:3,fill:r.year===selected?'#143c30':'#bf4b2e',class:'ce-chart-point'});const title=document.createElementNS(ns,'title');title.textContent=`${r.year}: ${number(r[mode])}`;c.append(title);c.addEventListener('click',()=>{$('year').value=r.year;draw();});});
    [rows[0].year,2000,rows.at(-1).year].forEach(year=>add('text',{x:x(year),y:255,'text-anchor':'middle'},String(year)));
  }
  async function load(force=false) {
    const city=$('city').value, date=dayString(localDate(cities[city][2])), earlier=pastDate(date), end=Number(date.slice(0,4))-1;
    controller?.abort(); controller=new AbortController(); const signal=controller.signal, token=++generation;busy=true;dateKey=date;
    rows=[];$('year').disabled=true;$('chart').replaceChildren();$('table').replaceChildren();$('year-detail').textContent='Loading annual data…';$('selected-year').value='—';
    ['current','humidity','wind','rain','difference'].forEach(id=>$(id).textContent='—');$('updated').textContent='';$('weather').textContent='Loading current weather…';$('comparison').textContent='Loading comparable daily means…';
    $('weather-status').textContent='Fetching weather…';$('climate-status').textContent='Loading complete historical years…';
    const weatherJob=(async()=>{
      try {
        const key=`coil-weather-v1-${city}-${date}`;
        let data=!force&&cacheGet(key,15*60*1000);
        if(!data){data=await request(url('api.open-meteo.com',city,{current:'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation',daily:'temperature_2m_mean',forecast_days:'1',wind_speed_unit:'kmh'}),signal);cacheSet(key,data);}
        if(token!==generation)return;
        const c=data.current;if(!c)throw new Error('Missing current data');
        $('weather').textContent=condition(c.weather_code);$('current').textContent=number(c.temperature_2m);$('humidity').textContent=number(c.relative_humidity_2m,' %');$('wind').textContent=number(c.wind_speed_10m,' km/h');$('rain').textContent=number(c.precipitation,' mm');
        $('updated').textContent=`Model valid ${c.time.replace('T',' ')} · ${cities[city][2]}. Refreshes every 15 minutes.`;
        $('weather-status').textContent='Current weather loaded.';
        const hkey=`coil-day-era5-v1-${city}-${earlier}`;
        let history=cacheGet(hkey,365*86400000);
        if(!history){history=await request(url('archive-api.open-meteo.com',city,{start_date:earlier,end_date:earlier,daily:'temperature_2m_mean',models:'era5'}),signal);cacheSet(hkey,history);}
        if(token!==generation)return;
        const today=data.daily?.time?.[0]===date?data.daily.temperature_2m_mean?.[0]:null, past=history.daily?.time?.[0]===earlier?history.daily.temperature_2m_mean?.[0]:null;
        if(!finite(today)||!finite(past))throw new Error('Daily comparison unavailable');
        $('difference').textContent=signed(today-past)+' °C';$('comparison').textContent=`${date}: ${number(today)} (forecast daily mean). ${earlier}: ${number(past)} (ERA5 daily mean). Difference: today minus ten years earlier.`;
        $('weather-status').textContent='Weather and daily comparison loaded.';
      }catch(e){if(token===generation){$('weather-status').textContent='Weather or comparison unavailable. Please retry; the service may be busy or unreachable.';$('comparison').textContent='Comparison unavailable until both daily means can be retrieved.';}}
    })();
    const climateJob=(async()=>{
      try {
        const key=`coil-annual-era5-v1-${city}-${end}`;
        let result=cacheGet(key,30*86400000);
        if(!result){const data=await request(url('archive-api.open-meteo.com',city,{start_date:'1980-01-01',end_date:`${end}-12-31`,daily:'temperature_2m_mean',models:'era5'}),signal);result=aggregate(data.daily,end);cacheSet(key,result);}
        if(token!==generation)return;
        rows=result;if(!rows.length)throw new Error('No complete years');
        $('year').min=rows[0].year;$('year').max=rows.at(-1).year;$('year').value=rows.at(-1).year;$('year').disabled=false;
        $('climate-status').textContent=`${rows.length} complete years · ${rows[0].year}–${rows.at(-1).year} · ERA5 reanalysis. ${rows.length < end-1979?'Missing or incomplete years omitted.':''}`;
        rows.forEach(r=>{const tr=document.createElement('tr');[r.year,r.mean.toFixed(2),signed(r.anomaly)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});$('table').append(tr);});draw();
      }catch(e){if(token===generation)$('climate-status').textContent='Historical data unavailable. No temperatures have been estimated. Please retry.';}
    })();
    await Promise.allSettled([weatherJob,climateJob]);if(token===generation)busy=false;
  }
  // Loading starts only when this existing routed section becomes visible.
  new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!active){active=true;load();}},{rootMargin:'100px'}).observe(root);
  $('city').addEventListener('change',()=>{active=true;load();});$('retry').addEventListener('click',()=>load(true));$('mode').addEventListener('change',draw);$('year').addEventListener('input',draw);
  function tick(){if(!active)return;const date=dayString(localDate(cities[$('city').value][2]));if(date!==dateKey||!busy)load();}
  setInterval(()=>{if(active&&dayString(localDate(cities[$('city').value][2]))!==dateKey)load();},30000);
  setInterval(tick,15*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)tick();});
})();
