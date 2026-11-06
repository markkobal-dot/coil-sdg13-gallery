/* Shared, date-aware Open-Meteo data helpers for the page and snapshot builder. */
(function (host) {
  'use strict';
  const cities = {
    nova: [45.956, 13.648, 'Europe/Ljubljana'],
    ajdovscina: [45.887, 13.909, 'Europe/Ljubljana'],
    paris: [48.857, 2.352, 'Europe/Paris'],
    newyork: [40.713, -74.006, 'America/New_York']
  };
  const dailyFields = 'temperature_2m_mean,temperature_2m_min,temperature_2m_max,weather_code,wind_speed_10m_max,precipitation_sum';
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  function localDate(zone, now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'})
      .formatToParts(now).reduce((a,p) => {a[p.type]=p.value; return a;}, {});
  }
  const dayString = d => `${d.year}-${d.month}-${d.day}`;
  function pastDate(date) {
    const [y,m,d] = date.split('-').map(Number);
    const day = Math.min(d, new Date(Date.UTC(y-10,m,0)).getUTCDate());
    return `${y-10}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function dailyValues(data, date) {
    const d=data?.daily, i=d?.time?.indexOf(date) ?? -1;
    if(i<0) throw new Error('Requested date missing');
    const humidity=(data.hourly?.time || []).flatMap((t,j)=>t.startsWith(date) && finite(data.hourly.relative_humidity_2m?.[j]) ? [data.hourly.relative_humidity_2m[j]] : []);
    return {temp:d.temperature_2m_mean?.[i],low:d.temperature_2m_min?.[i],high:d.temperature_2m_max?.[i],condition:d.weather_code?.[i],wind:d.wind_speed_10m_max?.[i],rain:d.precipitation_sum?.[i],humidity:d.relative_humidity_2m_mean?.[i] ?? (humidity.length?humidity.reduce((a,b)=>a+b,0)/humidity.length:null)};
  }
  function url(past, city, extra={}) {
    const [latitude,longitude,timezone]=cities[city];
    return `https://${past?'archive-api':'api'}.open-meteo.com/v1/${past?'archive':'forecast'}?` + new URLSearchParams({latitude,longitude,timezone,temperature_unit:'celsius',wind_speed_unit:'kmh',daily:dailyFields,hourly:'relative_humidity_2m',...(past?{models:'era5'}:{current:'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation'}),...extra});
  }
  function compact(data) {
    const daily={...data.daily};
    daily.relative_humidity_2m_mean=daily.time.map(date=>dailyValues(data,date).humidity);
    return {daily,...(data.current?{current:data.current}:{}),timezone:data.timezone};
  }
  const api={cities,dailyFields,finite,localDate,dayString,pastDate,dailyValues,url,compact};
  if(typeof module==='object' && module.exports) module.exports=api;
  else host.CoilWeatherData=api;
})(globalThis);
