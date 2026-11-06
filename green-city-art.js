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
  const api={tree,piece,city};if(typeof module==='object'&&module.exports)module.exports=api;else host.GreenCityArt=api;
})(globalThis);
