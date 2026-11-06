/* Original SVG city pieces, drawn in the repository; no downloaded art assets. */
(function(host){
  'use strict';
  const tree=(x=0,y=0,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="5" rx="15" ry="6" fill="#173b3020"/><path d="M-2 3v-25h5V4Z" fill="#8b6f4e"/><ellipse cy="-28" rx="18" ry="23" fill="#28734e"/><ellipse cx="-6" cy="-33" rx="11" ry="16" fill="#65aa6b"/><ellipse cx="7" cy="-22" rx="10" ry="14" fill="#398e58"/></g>`;
  function house(type,index=0){
    const h=index%3===0?38:27;
    let roof=type==='roof'?'#72b875':'#c48c6c';
    let top=`<path d="M-24 ${-h-4} 0 ${-h-17} 25 ${-h-4} 0 ${-h+9}Z" fill="${roof}" stroke="#ffffff50"/>`;
    if(type==='solar')top+=`<path d="M-18 ${-h-4} 0 ${-h-13} 18 ${-h-4} 0 ${-h+5}Z" fill="#235a70" stroke="#a9d9de" stroke-width="1.5"/><path d="m-9 ${-h-8} 18 9m-9-14v18" stroke="#83bdc8" stroke-width="1"/>`;
    if(type==='roof')top+=`<path d="M-15 ${-h-5} 0 ${-h-12} 15 ${-h-4} 0 ${-h+3}Z" fill="#4a965c"/>${tree(0,-h-2,.32)}`;
    return `<path d="M-24 -12 0 0 0 ${-h+9} -24 ${-h-4}Z" fill="#d8c9b1"/><path d="M0 0 25 -13 25 ${-h-4} 0 ${-h+9}Z" fill="#f4ecd9"/><path d="M5 -10v-12l6-3v12m5-2v-12l5-3v12M-17 -16v-11l6 3v11" stroke="#648e91" stroke-width="4"/>${top}`;
  }
  function vehicle(tram=false){return `<path d="M-28 -10 10 -30 30 -18 -8 3Z" fill="#ffffff"/><path d="M-28 -10 -8 3 -8 17 -28 4Z" fill="#1d624a"/><path d="M-8 3 30 -18 30 -4 -8 17Z" fill="${tram?'#58a9b0':'#7dbf94'}"/><path d="m-3 4 28-15v7L-3 11Z" fill="#1f4c58"/><path d="m-24-6 12 7v7l-12-7Z" fill="#abd5d7"/><circle cx="-18" cy="10" r="3" fill="#26483f"/><circle cx="17" cy="5" r="3" fill="#26483f"/>${tram?'<path d="m-13-25 13-15 12 7-13 8" stroke="#537a7b" fill="none"/>':''}`;}
  function piece(type,terrain,index=0){
    if(type==='airport')return '<path d="m-42 4 42-23 42 23L0 27Z" fill="#a9b697"/><path d="m-37 2 53-29 16 9-53 29Z" fill="#607c7c"/><path d="m-29 2 42-23" stroke="#e4e5d0" stroke-width="1.7" stroke-dasharray="5 4"/><path d="m-22 9 18-10 20 11v-17L-3-18-22-8Z" fill="#d1dbcb"/><path d="M24 5v-39l-8-5v39Z" fill="#c3d1bf"/><path d="m16-39 10-5 9 5v9l-11 5-8-5Z" fill="#5b8f97"/><path d="m-8-14 9-5 5-12 4 2-1 9 13 4-3 3-14-1-10 8-4-2Z" fill="#f2efda"/>';
    if(type==='cargoport')return '<path d="m-39 3 39-21 39 21L0 24Z" fill="#c7b991"/><path d="m-3 19 38-21 9 5-38 21Z" fill="#77a8a6"/><path d="M-25-9v-44m48 62v-41M-25-53l48 27m-37-21 31-16 7 4-31 16" stroke="#d2b16f" stroke-width="4" fill="none"/><path d="M7-51v26m-5 1h10" stroke="#6b8d80" stroke-width="2"/><path d="m-31 0 18-10 19 10-18 10Z" fill="#86a58b"/><path d="M-31 0v-15l18-10 19 10v15l-18 10Z" fill="#8daa91"/><path d="m-13-25 19 10v15l-19-10Z" fill="#c3a578"/><path d="m1 10 24-13 12 7-24 13Z" fill="#527d84"/>';
    if(type==='ferry')return '<path d="m-33 6 33-18 33 18-33 18Z" fill="#7ca9a5"/><path d="m-30 0 29-16 11 6-29 16Z" fill="#cdbb92"/><path d="m-14 4 28-15 17 9-28 15Z" fill="#e6e8d5"/><path d="M-14 4v9l17 9 28-15V-2L3 13Z" fill="#5c9a8a"/><path d="m-6 0 17-9 13 7-17 9Z" fill="#e7e7cf"/><path d="M-6 0v-10l17-9 13 7v10L7 7Z" fill="#a0c8bf"/><path d="m-3-10 13-7 10 6-13 7Z" fill="#f1efd9"/>';
    if(type==='marina')return '<path d="m-38 3 38-20 38 20L0 24Z" fill="#7aa6a0"/><path d="m-31-1 31-16 8 4-31 16Zm9 11 31-17 8 5-31 16Z" fill="#cfbb91"/><path d="m1 8 19-10 12 7-19 10Z" fill="#f1ecd7"/><path d="M17 5v-48m1 4 17 34-17-9Z" fill="#eee9d4" stroke="#a7c1b4" stroke-width="1.5"/><path d="m-31-11 16-9 17 9v-15l-17-9-16 9Z" fill="#d4dfcc"/><path d="m-32-26 17-9 18 9-17 9Z" fill="#7da89a"/>';
    if(type==='firestation')return `${house(null,1)}<path d="M-20-16v-17l15 8v17m10-1v-18l15-8v18" stroke="#b96e54" stroke-width="6"/><path d="m-18-18 9 5m16 0 10-5" stroke="#e6c29b" stroke-width="3"/><path d="m-2-50 6-11 5 11-6 6Z" fill="#c78755"/>`;
    if(type==='hospital')return `${house(null,0)}<path d="m-30-10 13 7v-24l-13-7Zm38 9 23-13v-24L8-25Z" fill="#d8e0cf"/><path d="M-3-64v19m-9-10h18" stroke="#ba6c53" stroke-width="6"/>`;
    if(type==='stadium')return '<path d="m-39 3 39-21 39 21L0 24Z" fill="#d2c19a"/><path d="m-31 1 31-17 31 17L0 18Z" fill="#8bb27c" stroke="#bdc4a4" stroke-width="7"/><path d="m-20 1 20-11 20 11-20 11Zm20-11v22" fill="none" stroke="#e8e9d0" stroke-width="1.5"/><path d="M-32 2v-40m64 40v-40" stroke="#8ca18d" stroke-width="2"/><path d="m-38-38 12-6m20 6 12-6" stroke="#e4d8b1" stroke-width="4"/>';
    if(type==='orchard')return `<path d="m-30 0 30-16 30 16-30 16Z" fill="#a5bd7d"/>${tree(-15,-4,.58)}${tree(14,-4,.58)}${tree(0,10,.58)}<g fill="#dd9a57"><circle cx="-20" cy="-22" r="3"/><circle cx="-10" cy="-15" r="3"/><circle cx="10" cy="-24" r="3"/><circle cx="20" cy="-18" r="3"/><circle cx="-4" cy="-9" r="3"/><circle cx="5" cy="-5" r="3"/></g>`;
    if(type==='playground')return '<path d="m-30 0 30-16 30 16-30 16Z" fill="#a8c68a"/><path d="m-17-4 15-8 20 11-15 8Z" fill="#dfbc85"/><path d="M-17-4v-30L1-44 18-34v30M-10-8v-19m7 15v-19" fill="none" stroke="#9e7353" stroke-width="3"/><path d="m1-30 10-5 14 25-10 5Z" fill="#71a5aa"/><path d="m-20-30 14 8 13-7-14-8Z" fill="#cf9b68"/><path d="m-23 6 10 5 8-4-10-5Z" fill="#d5ae6c"/>';
    if(type==='plaza')return '<path d="m-32 0 32-17 32 17-32 17Z" fill="#d8cfb2"/><path d="m-25 0 25-13 25 13-25 13Z" fill="none" stroke="#f1ebd3" stroke-width="2"/><ellipse cy="-3" rx="13" ry="7" fill="#abc4b0"/><path d="M-13-3v-7h26v7" fill="#acbaa2"/><ellipse cy="-10" rx="13" ry="6" fill="#70a7a5"/><path d="M0-13v-13m-6 8 6-8 6 8" stroke="#b9ded1" stroke-width="2" fill="none"/><path d="m-28 0 8-4 8 4-8 4Zm36 1 9-4 9 4-9 4Z" fill="#6b9865"/>';
    if(type==='solarfarm')return '<path d="m-33 1 33-18 33 18-33 18Z" fill="#a7b48d"/>'+[-14,0,14].map((y,j)=>`<g transform="translate(${j*3-3} ${y/2-9})"><path d="m-23 0 28-15 20 11-28 15Z" fill="#285a70" stroke="#91c5c6" stroke-width="1.2"/><path d="m-14-5 20 11m-10-16 20 11m-34 1 28-15" stroke="#74a8b4" stroke-width=".8"/></g>`).join('');
    if(type==='geothermal')return `${house(null,1)}<g fill="#c2d6c5" stroke="#78a497" stroke-width="1.5"><path d="M-20-33v-25h16v25"/><ellipse cx="-12" cy="-58" rx="8" ry="4"/><path d="M5-39v-25h16v25"/><ellipse cx="13" cy="-64" rx="8" ry="4"/></g><path d="m-7-58 7-4 8 4M-7-52l7-4 8 4" fill="none" stroke="#d7aa6a" stroke-width="3"/>`;
    if(type==='metro')return '<path d="m-31 0 31-17 31 17-31 17Z" fill="#b7c3b4"/><path d="m-19-1 18-10 18 10L-1 9Z" fill="#4b6a66"/><path d="m-15-1 14-7 13 7-13 7Z" fill="#244b4e"/><path d="m-13 1 13-7m-9 10L4-3m-9 9L8-1" stroke="#a3b4a8" stroke-width="2"/><path d="M-23-4v-32M23-4v-32m-46 0 23-12 23 12" stroke="#5e8e83" stroke-width="3" fill="none"/><path d="m-8-36 8-5 8 5v-17l-8-5-8 5Z" fill="#4b8d91"/><path d="M-5-39v-11l5 7 5-7v11" fill="none" stroke="#f2f3dc" stroke-width="2"/>';
    if(type==='bikeshare')return '<path d="m-32 2 32-17 32 17-32 17Z" fill="#d2d5bc"/>'+[-15,0,15].map(x=>`<g transform="translate(${x} ${-x/2-5})" stroke="#4e8277" stroke-width="2" fill="none"><circle cx="-6" cy="0" r="5"/><circle cx="7" cy="0" r="5"/><path d="m-6 0 5-11 5 11h-10m5-11 7 1 1 10M-3-14h5m3-1h5"/></g>`).join('');
    if(type==='market')return `${house(null,1)}<path d="m-27-25 26 14 29-15v9L-1-2-27-16Z" fill="#d4aa74"/><path d="m-24-24 5 3v9l-5-3m10-3 5 3v9l-5-3m15-5 5-3v9l-5 3m10-8 5-3v9l-5 3" stroke="#f1e8cb" stroke-width="4"/><path d="M-25-16V2M26-17v18" stroke="#897459" stroke-width="2"/><path d="m-23 3 12-6 12 6-12 6Z" fill="#77a26a"/><g fill="#d99b61"><circle cx="-16" cy="1" r="2"/><circle cx="-10" cy="1" r="2"/><circle cx="-6" cy="4" r="2"/></g>`;
    if(type==='library')return `${house(null,1)}<path d="m-14-49 12 3 12-9v18l-12 9-12-3Z" fill="#eee8ce" stroke="#7c9f88" stroke-width="1.5"/><path d="M-2-46v18" stroke="#82977c"/><path d="m-10-43 5 1m9-4 5-4m-19 11 5 1m9-4 5-4" stroke="#b08c62" stroke-width="1.2"/>`;
    if(type==='office')return '<path d="M-26-6 0 8v-70l-26-14Z" fill="#80a9a2"/><path d="M0 8 27-7v-70L0-62Z" fill="#b5cec2"/><path d="m-26-76 26-14 27 13L0-62Z" fill="#e7e7d2"/><path d="M-21-61 0-49 22-62M-21-43 0-31 22-44M-21-25 0-13 22-26M-13-67v57M11-67v57" fill="none" stroke="#4c7780" stroke-width="4"/><path d="m-13-76 13-7 13 6-13 7Z" fill="#789c6a"/>';
    if(type==='forest')return `${tree(-15,-4,.6)}${tree(14,-6,.72)}${tree(0,10,.85)}`;
    if(type==='wetland')return '<path d="m-28 0 28-15 28 15-28 15Z" fill="#99bc85"/><ellipse cy="0" rx="18" ry="8" fill="#76ada6"/><path d="M-20 0v-18m5 16v-14m30 15v-17m6 18v-13" stroke="#5d854c" stroke-width="2"/><path d="M-20-18v-7m35 7v-7" stroke="#aa8c60" stroke-width="4"/>';
    if(type==='garden')return '<path d="m-28 0 28-15 28 15-28 15Z" fill="#a7bc82"/><path d="m-22-1 22-11 7 4-22 11Zm9 7 22-11 7 4-22 11Z" fill="#a98860" stroke="#cbb081" stroke-width="2"/><path d="m-17-5 4-7m4 4 4-7m8 13 4-7m4 3 4-7" stroke="#57884c" stroke-width="4"/>';
    if(type==='house')return house(null,index);
    if(type==='apartment')return '<path d="M-22-7 0 5 0-65-22-77Z" fill="#98b7ac"/><path d="M0 5 25-8V-78L0-65Z" fill="#d3ded0"/><path d="m-22-77 24-13 23 12L0-65Z" fill="#e9e5cf"/><path d="M-17-19v-11m9 16v-11m-9-8v-11m9 16v-11m-9-8v-11m9 16v-11m14 30v-11m10 6v-11m-10-2v-11m10 6v-11m-10-2v-11m10 6v-11" stroke="#4d7981" stroke-width="5"/>';
    if(type==='road')return '<path d="m-32-1 32-17 32 17L0 16Z" fill="#899f98" stroke="#cdd6bd" stroke-width="3"/><path d="m-22 10 44-23" stroke="#e5e6ce" stroke-width="2" stroke-dasharray="5 4"/>';
    if(type==='battery')return '<path d="M-25 4-5 15V-27L-25-38Z" fill="#5f8e73"/><path d="M-5 15 22 0v-42L-5-27Z" fill="#a9c7a2"/><path d="m-25-38 27-15 20 11L-5-27Z" fill="#d1ddbd"/><path d="m2-23 11-6v5L2-18m0 4 11-6v5L2-9m0 4 11-6v5L2 0" stroke="#557c65" stroke-width="2"/>';
    if(type==='heat')return `${house(null,1)}<g transform="translate(9 -35)"><ellipse rx="13" ry="7" fill="#4a7f7d"/><path d="m-7-2 14 4m-7-7v10" stroke="#a5c9bc" stroke-width="3"/></g>`;
    if(type==='school')return `${house(null,1)}<path d="M-10-47v-25" stroke="#587e6a" stroke-width="2"/><path d="m-10-72 18 4-18 8Z" fill="#d7a66d"/>`;
    if(type==='clinic')return `${house(null,1)}<path d="M-2-57v17m-8-9h16" stroke="#b9654b" stroke-width="5"/>`;
    if(type==='recycling')return '<path d="m-27 0 27-15 27 15L0 15Z" fill="#cbd6b9"/><path d="M-23 0v-24l12 6V6Zm15 8v-30l12 6v30Zm15-2v-29l12-7v30Z" fill="#69a281"/><path d="m-23-24 11-6 12 6-11 6Zm15 2 11-6 12 6-11 6Zm15-1 11-6 12 6-11 6Z" fill="#a5c39a"/><path d="m-5-9 5-3m-3 7 5-3" stroke="#e7ecd3" stroke-width="2"/>';
    if(type==='waterworks')return '<ellipse cy="0" rx="27" ry="12" fill="#a2b8a1"/><path d="M-23-8v-24h46v24" fill="#b4c9b8"/><ellipse cy="-8" rx="23" ry="10" fill="#b4c9b8"/><ellipse cy="-32" rx="23" ry="10" fill="#d5dfc8"/><ellipse cy="-32" rx="17" ry="7" fill="#6eaaa7"/><path d="m-8-43 8-12 8 12a8 8 0 1 1-16 0Z" fill="#78b2ad"/>';
    if(terrain==='building')return house(type,index);
    if(type==='tree')return tree(0,-3,.88);
    if(type==='park')return `<path d="m-27-1 26-13 28 14L0 14Z" fill="#95c981"/><path d="m-26 0 24 12 26-13" stroke="#dbe6b0" stroke-width="4"/>${tree(-15,-4,.62)}${tree(13,0,.78)}<path d="m-4 8 9 4 8-4-9-4Z" fill="#cfab76"/>`;
    if(type==='wind')return `<ellipse cy="7" rx="13" ry="5" fill="#31574125"/><path d="M-3 6 0-69 4 6Z" fill="#f9f8e9"/><path d="m1 6 3-75 2 75" fill="#a4bec1"/><g transform="translate(1 -70)"><g class="gc-blades"><circle r="28" fill="none"/><path d="M-2 0-4-27 0-29 4-3 24 11 23 16 1 5-20 22-24 19Z" fill="#f5faf2" stroke="#769ea0" stroke-width=".7"/></g><circle r="4" fill="#397b83"/></g>`;
    if(type==='solar')return '';
    if(type==='ev')return `<path d="M-9 5 4-2 4-29-9-23Z" fill="#346d5b"/><path d="m4-2 10 6v-27L4-29Z" fill="#9ccfa2"/><path d="m-6-20 7-3v10l-7 3Z" fill="#c7e6de"/><path d="m10-17 6 3v15q0 8-7 3" fill="none" stroke="#335952" stroke-width="2"/><path d="m-2-18-3 5h4l-2 5 5-8h-4l2-4" fill="#e5eead"/>`;
    if(type==='bike')return `<path d="m-35 4 67-34 9 5L-25 10Z" fill="#88c6a0"/><g transform="translate(0 -4)" stroke="#f7f6ed" stroke-width="1.7" fill="none"><circle cx="-10" cy="0" r="5"/><circle cx="10" cy="0" r="5"/><path d="m-10 0 7-10 5 10h-12m7-10 12-1 1 11M-5-12h6m6-3h5"/></g>`;
    if(type==='bus'||type==='tram')return `${type==='tram'?'<path d="m-38 9 75-38m-68 43 75-38" stroke="#b1bdb5" stroke-width="2"/>':''}${vehicle(type==='tram')}`;
    return terrain==='land'?'<path d="m-17 0 15-8 17 8-15 8Z" fill="#d8d7c7" stroke="#e9e8db"/>':'';
  }
  function city(cells,terrain,selected=-1,valid=[],last=-1,interactive=true){
    const tiles=[];for(const index of Array.from({length:36},(_,i)=>i).sort((a,b)=>(Math.floor(a/6)+a%6)-(Math.floor(b/6)+b%6))){
      const r=Math.floor(index/6),c=index%6;
      const i=r*6+c,x=340+(c-r)*48,y=112+(c+r)*25,type=cells[i],road=terrain[i]==='road';
      const colour=type==='tree'||type==='park'?'#acd397':road?'#a5b7b2':terrain[i]==='building'?'#d9dac6':'#d7d8c8';
      const label=host.GreenCity?host.GreenCity.label(i):String(i);
      tiles.push(`<g transform="translate(${x} ${y})" ${interactive?`data-cell="${i}" role="button" tabindex="${i===selected?0:-1}" aria-label="Tile ${label}, ${terrain[i]}${type?', '+host.GreenCity.upgrades[type].name:', no upgrade'}" aria-pressed="${i===selected}"`:''} class="gc-tile${valid.includes(i)?' gc-eligible':''}${i===selected?' gc-selected':''}">
        <path d="M-46 0 0 24v9l-46-24Z" fill="#9aaf9c"/><path d="M0 24 46 0v9L0 33Z" fill="#7e9e8e"/>
        <path class="gc-tile-top" d="M0-24 46 0 0 24-46 0Z" fill="${colour}" stroke="#f7f8eb" stroke-width="1.4"/>
        ${road&&!type?'<path d="m-35 9 70-36" stroke="#e2e9de" stroke-width="2" stroke-dasharray="6 6"/>':''}
        <g class="${i===last?'gc-just-built':''}">${piece(type,terrain[i],i)}</g>
        ${i===selected?'<path d="M0-24 46 0 0 24-46 0Z" fill="none" stroke="#bd512e" stroke-width="3"/>':''}
      </g>`);
    }
    return `<ellipse cx="340" cy="282" rx="303" ry="151" fill="#26756510"/><path d="M37 365q75-50 120 30t140 0 150 35 190-15" stroke="#b6dee0" stroke-width="18" fill="none"/>${tiles.join('')}`;
  }
  function thumbnail(type){
    const bounds={wind:'-42 -106 84 128',apartment:'-37 -96 74 118',office:'-38 -96 76 118',house:'-36 -60 72 82',roof:'-36 -68 72 90',solar:'-36 -60 72 82',solarfarm:'-39 -42 78 66',road:'-39 -30 78 54',bike:'-43 -38 86 62',bikeshare:'-39 -42 78 66',metro:'-38 -66 76 90',plaza:'-39 -38 78 62',garden:'-36 -38 72 62',wetland:'-36 -42 72 66',recycling:'-36 -48 72 72',ev:'-30 -44 60 66',bus:'-38 -42 76 70',tram:'-42 -49 84 77'};
    Object.assign(bounds,{airport:'-48 -65 96 96',cargoport:'-48 -70 96 103',ferry:'-40 -46 80 76',marina:'-44 -55 88 86',firestation:'-38 -78 76 102',hospital:'-38 -78 76 102',stadium:'-46 -55 92 86'});
    const terrain=type==='roof'||type==='solar'?'building':'land';
    return `<svg class="gc-piece-preview" viewBox="${bounds[type]||'-38 -78 76 102'}" aria-hidden="true" focusable="false"><ellipse cy="7" rx="27" ry="9" fill="#51725713"/>${piece(type,terrain,1)}</svg>`;
  }
  const api={tree,piece,city,thumbnail};if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityArt=api;
})(globalThis);
