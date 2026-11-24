import './arctic-model.js?v=c154fe78a5';

const root=document.getElementById('climate-story');
const M=globalThis.ArcticModel;
if(root&&M){
  const journey=root.querySelector('#arctic-journey'),stage=root.querySelector('#arctic-stage'),canvas=root.querySelector('#arctic-canvas');
  const steps=[...root.querySelectorAll('[data-arctic-step]')],nav=root.querySelector('.arctic-chapters'),buttons=[...nav.querySelectorAll('button')];
  const explorer=root.querySelector('#arctic-explorer'),mode=root.querySelector('#arctic-mode'),poster=root.querySelector('#arctic-poster');
  const navHome=document.createComment('chapter navigation'),explorerHome=document.createComment('September explorer');
  nav.before(navHome);explorer.before(explorerHome);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Start the module download beside the data requests, rather than after them.
  let worldModule=null;
  const loadWorld=()=>worldModule||(worldModule=import('./arctic-world.js?v=df8d39088e'));
  const posterSources=steps.map(step=>step.querySelector('img')?.getAttribute('src')||'assets/arctic/record-map.svg');
  const portraitPoster='assets/arctic/chapter-0-portrait.webp';
  const availablePosters=new Set([poster.getAttribute('src')]);
  let world=null,worldPromise=null,data=null,mapData=null,live=false,visible=true,raf=0,active=-1,selectedYear=1979,manualStill=false,lastProgress=0,disposed=false;
  let route=document.body.dataset.view==='climate-story',pendingChapter=null,hasActivated=false,renderProgress=null,lastFrameTime=0,assetsReady=false,activation=0;
  const top=()=>['.nav','.view-bar'].reduce((height,selector)=>{const el=document.querySelector(selector);return height+(el&&['sticky','fixed'].includes(getComputedStyle(el).position)?el.getBoundingClientRect().height:0);},0);
  const bounds=()=>({start:journey.getBoundingClientRect().top+scrollY,height:journey.offsetHeight,stage:stage.offsetHeight});
  const progress=()=>{const b=bounds();return M.progressAt(scrollY,b.start,b.height,b.stage);};
  function syncSize(){
    root.style.setProperty('--arctic-top',top()+'px');
    if(world&&live&&route)world.resize(stage.clientWidth,stage.clientHeight);
    schedule();
  }
  function syncChapter(frame){
    if(frame.chapter===active)return;
    const hadChapter=active>=0;
    active=frame.chapter;
    stage.dataset.chapter=String(active);
    stage.querySelector('#arctic-stage-kind').textContent=steps[active].dataset.kind;
    stage.querySelector('#arctic-stage-date').textContent=steps[active].querySelector('h3').textContent;
    stage.querySelector('#arctic-stage-caption').replaceChildren(...[...steps[active].querySelector('.arctic-caption').childNodes].map(n=>n.cloneNode(true)));
    syncSelectedSeptember();
    if(hadChapter&&!reduced.matches&&active!==3){for(const el of [stage.querySelector('.arctic-stage-heading'),stage.querySelector('#arctic-stage-caption')])el.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'});}
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));
    stage.querySelector('#arctic-previous').disabled=active===0;
    stage.querySelector('#arctic-next').disabled=active===steps.length-1;
    stage.querySelector('#arctic-progress').textContent=(active+1)+' / '+steps.length;
    explorer.hidden=active!==3;
    if(world)world.setYear(selectedYear);
    // Keep the selected chapter visible in the horizontally scrollable mobile strip.
    const b=buttons[active],left=b.offsetLeft-nav.clientWidth/2+b.offsetWidth/2;
    nav.scrollLeft=Math.max(0,left);
  }
  function draw(timestamp){
    raf=0;if(!live||!route||!visible||document.hidden)return;
    lastProgress=progress();
    const dt=lastFrameTime?timestamp-lastFrameTime:16;lastFrameTime=timestamp;
    renderProgress=renderProgress===null?lastProgress:M.follow(renderProgress,lastProgress,dt);
    const frame=M.frameAt(renderProgress,stage.clientWidth<701||stage.clientWidth/stage.clientHeight<1.2);
    stage.dataset.aboveWater=String(frame.camera[1]>1);
    root.dataset.progress=lastProgress.toFixed(6);stage.style.setProperty('--progress',lastProgress);stage.style.setProperty('--underwater',frame.underwater);
    root.dataset.renderProgress=renderProgress.toFixed(6);
    stage.style.setProperty('--satellite-reveal',frame.mapBlend);
    explorer.inert=frame.chapter!==3||frame.mapBlend<.95;
    syncChapter(frame);
    const note=stage.querySelector('#arctic-map-note');note.hidden=frame.mapBlend<.95;
    note.textContent='Ice: September '+selectedYear+' · NSIDC. Land: NASA Blue Marble.';
    if(assetsReady&&world){
      world.render(frame);
      if(root.dataset.renderer==='loading'){
        root.classList.remove('arctic-loading');
        root.dataset.renderer='webgl';
      }
    }
    else{
      const source=frame.portrait&&frame.chapter===0?portraitPoster:posterSources[frame.chapter];
      if(availablePosters.has(source)&&poster.getAttribute('src')!==source)poster.src=source;
    }
    if(renderProgress!==lastProgress)schedule();
  }
  function schedule(){if(!raf&&live&&route&&visible&&!document.hidden)raf=requestAnimationFrame(draw);}
  function go(index,instant=false){
    index=Math.max(0,Math.min(steps.length-1,index));
    if(live){const b=bounds();window.scrollTo({top:b.start+M.chapters[index]*(b.height-b.stage),behavior:reduced.matches||instant?'instant':'smooth'});schedule();}
    else{pendingChapter=index;steps[index].scrollIntoView({block:'start',behavior:'instant'});buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}
  }
  function updateYear(){
    if(!data)return;
    const rows=data.rows,row=rows.find(r=>r.year===selectedYear),previous=rows.find(r=>r.year===selectedYear-1);
    root.querySelector('#arctic-year-output').textContent=String(row.year);
    root.querySelector('#arctic-extent-output').textContent=row.extent.toFixed(2);
    const input=root.querySelector('#arctic-year');input.value=String(row.year);input.setAttribute('aria-valuetext',row.year+': '+row.extent.toFixed(2)+' million square kilometres');
    root.querySelector('#arctic-year-previous').disabled=row.year===rows[0].year;root.querySelector('#arctic-year-next').disabled=row.year===rows.at(-1).year;
    const delta=previous?row.extent-previous.extent:null;
    root.querySelector('#arctic-year-change').textContent=previous?(delta>0?'Up ':'Down ')+Math.abs(delta).toFixed(2)+' million km² from '+previous.year+'. The long-term trend is downward.':'The first complete September in this satellite record.';
    const dot=root.querySelector('#arctic-chart-dot');if(dot){const [x,y]=M.chartPoint(row,rows.indexOf(row),rows.length);dot.setAttribute('cx',x);dot.setAttribute('cy',y);}
    buttons[4].textContent=live?String(selectedYear):'2026';
    syncSelectedSeptember();
    if(world){world.setYear(selectedYear);schedule();}
    updateReaderMap();
  }
  function syncSelectedSeptember(){
    if(active!==4||!data)return;
    const row=data.rows.find(r=>r.year===selectedYear);
    stage.querySelector('#arctic-stage-kind').textContent='Your selected September';
    stage.querySelector('#arctic-stage-date').textContent='September '+selectedYear;
    stage.querySelector('#arctic-stage-caption').innerHTML=`<p>Arctic sea-ice extent in the September you selected.</p><strong class="arctic-minimum">${row.extent.toFixed(2)}<span>million km²</span></strong><span class="arctic-daily-note">Monthly mean extent. Ocean with at least 15% ice cover.</span><a class="arctic-source-link" href="assets/data/arctic-september-original.csv" target="_blank" rel="noopener noreferrer">NSIDC monthly data (CSV)</a>`;
  }
  function updateReaderMap(){
    const svg=root.querySelector('#arctic-reader-svg');if(!svg||!mapData)return;
    const path=rings=>(rings||[]).map(r=>M.smoothIceRing(r).map(([x,y],i)=>(i?'L':'M')+(400+x/10000).toFixed(1)+' '+(400-y/10000).toFixed(1)).join('')+'Z').join('');
    svg.querySelector('[data-map-ice]').setAttribute('d',path(mapData.years[String(selectedYear)]));
    svg.setAttribute('aria-label','Arctic coastline and September '+selectedYear+' monthly sea-ice extent, '+data.rows.find(r=>r.year===selectedYear).extent.toFixed(2)+' million square kilometres.');
  }
  function makeDataViews(){
    const rows=data.rows,points=rows.map((r,i)=>M.chartPoint(r,i,rows.length).join(','));
    const chart=document.createElementNS('http://www.w3.org/2000/svg','svg');chart.setAttribute('viewBox','0 0 720 270');chart.setAttribute('role','img');chart.setAttribute('aria-label','September monthly sea-ice extent, 1979 to 2026. All 48 measurements, including year-to-year increases. Units: million square kilometres.');
    chart.innerHTML=`<g fill="none" stroke="#d5dcd4" stroke-width="1"><path d="M48 32H672M48 96.7H672M48 161.3H672M48 226H672"/></g><path d="M${points.join('L')}" fill="none" stroke="#284e42" stroke-width="3.5" stroke-linejoin="round"/><g fill="#52645a" font-family="Arial,sans-serif" font-size="24"><text x="10" y="40">9</text><text x="10" y="234">0</text><text x="48" y="264">1979</text><text x="608" y="264">2026</text></g><circle id="arctic-chart-dot" r="7" fill="#143c30" stroke="#d6f35b" stroke-width="4"/>`;
    root.querySelector('#arctic-chart-image').replaceWith(chart);
    if(mapData){
      const map=document.createElementNS('http://www.w3.org/2000/svg','svg');map.id='arctic-reader-svg';map.setAttribute('viewBox','0 0 800 800');map.setAttribute('role','img');map.style.width='100%';
      const coast=mapData.coast.map(r=>r.map(([x,y],i)=>(i?'L':'M')+(400+x/10000).toFixed(1)+' '+(400-y/10000).toFixed(1)).join('')+'Z').join('');
      const basemap='assets/arctic/'+(innerWidth<701?'polar-land-mobile.webp':'polar-land.webp');
      map.innerHTML=`<defs><clipPath id="arctic-map-clip"><circle cx="400" cy="400" r="394"/></clipPath><clipPath id="arctic-land-clip"><path d="${coast}" clip-rule="evenodd"/></clipPath></defs><g clip-path="url(#arctic-map-clip)"><rect width="800" height="800" fill="#102b42"/><path data-map-ice fill="#edf2e9" stroke="#ccdddd" stroke-width=".6" fill-rule="evenodd"/><path d="${coast}" fill="#70837c" fill-rule="evenodd"/><image href="${basemap}" width="800" height="800" clip-path="url(#arctic-land-clip)"/><path d="${coast}" fill="none" stroke="#9eaaa3" stroke-width=".6"/></g>`;
      root.querySelector('#arctic-reader-map').replaceWith(map);
    }
    updateYear();
  }
  function stillViews(){
    activation++;
    if(raf)cancelAnimationFrame(raf);raf=0;
    const prior=active<0?0:active;live=false;assetsReady=false;root.classList.remove('arctic-live','arctic-loading');root.dataset.renderer='still';stage.hidden=true;
    renderProgress=null;lastFrameTime=0;
    steps.forEach(step=>{step.querySelector('.arctic-step-copy').inert=false;});
    navHome.after(nav);explorerHome.after(explorer);explorer.hidden=false;explorer.inert=false;buttons[4].textContent='2026';
    if(world){world.dispose();world=null;}worldPromise=null;
    mode.hidden=false;mode.textContent=reduced.matches?'Still views · reduced motion':'Use 3D walkthrough';mode.disabled=reduced.matches;
    if(route&&prior>0)steps[prior].scrollIntoView({block:'start',behavior:'instant'});
  }
  function prepareLive(){
    buttons[4].textContent=String(selectedYear);
    stage.hidden=false;stage.append(nav,explorer);root.classList.add('arctic-live','arctic-loading');root.dataset.renderer='loading';live=true;
    steps.forEach(step=>{step.querySelector('.arctic-step-copy').inert=true;});
    mode.hidden=false;mode.disabled=false;mode.textContent='Use still views';active=-1;syncChapter(M.frameAt(0));syncSize();
    positionLive();
  }
  function positionLive(){
    if(!route||!live)return;
    const saved=history.state?.coilContext;
    if(pendingChapter!==null){const selected=pendingChapter;pendingChapter=null;go(selected,true);}
    else if(!hasActivated&&performance.getEntriesByType('navigation')[0]?.type==='reload'&&saved?.hash==='#climate-story'&&Number.isFinite(saved.arcticProgress)){
      const b=bounds();window.scrollTo({top:b.start+M.clamp(saved.arcticProgress)*(b.height-b.stage),behavior:'instant'});
    }
    hasActivated=true;
  }
  async function liveViews(){
    if(reduced.matches||manualStill||world||worldPromise||disposed)return;
    const attempt=++activation;
    if(!live){if(hasActivated&&pendingChapter===null)pendingChapter=Math.max(0,active);prepareLive();}
    worldPromise=loadWorld().then(async({ArcticWorld})=>{
      if(attempt!==activation||disposed||reduced.matches||manualStill)return;
      const candidate=new ArcticWorld(canvas,mapData,selectedYear);
      if(disposed||reduced.matches||manualStill){candidate.dispose();return;}
      world=candidate;
      syncSize();
      await candidate.ready;
      if(world!==candidate||manualStill||reduced.matches)return;
      assetsReady=true;
      schedule();
    }).catch(error=>{if(attempt===activation){console.warn('Arctic still views remain available:',error);stillViews();}}).finally(()=>{if(attempt===activation)worldPromise=null;});
    return worldPromise;
  }
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>go(index));
    button.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      let next=index;if(event.key==='ArrowRight')next=Math.min(5,index+1);else if(event.key==='ArrowLeft')next=Math.max(0,index-1);else if(event.key==='Home')next=0;else if(event.key==='End')next=5;else return;
      event.preventDefault();buttons[next].focus({preventScroll:true});go(next);
    });
  });
  stage.querySelector('#arctic-previous').addEventListener('click',()=>go(active-1));stage.querySelector('#arctic-next').addEventListener('click',()=>go(active+1));
  root.querySelector('#arctic-year').addEventListener('input',event=>{selectedYear=Number(event.target.value);updateYear();});
  root.querySelector('#arctic-year').addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    const changes={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-5,PageUp:5};
    if(event.key!=='Home'&&event.key!=='End'&&!(event.key in changes))return;
    event.preventDefault();event.stopPropagation();
    selectedYear=event.key==='Home'?1979:event.key==='End'?2026:Math.max(1979,Math.min(2026,selectedYear+changes[event.key]));updateYear();
  });
  root.querySelector('#arctic-year-previous').addEventListener('click',()=>{selectedYear=Math.max(1979,selectedYear-1);updateYear();});
  root.querySelector('#arctic-year-next').addEventListener('click',()=>{selectedYear=Math.min(2026,selectedYear+1);updateYear();});
  mode.addEventListener('click',()=>{manualStill=live;if(live)stillViews();else liveViews();});
  reduced.addEventListener('change',()=>{if(reduced.matches)stillViews();else if(!manualStill)liveViews();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(live)stillViews();});
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',syncSize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else schedule();});
  window.addEventListener('app:view',event=>{
    route=event.detail.id==='climate-story';
    if(!route&&raf){cancelAnimationFrame(raf);raf=0;}
    if(route){renderProgress=null;lastFrameTime=0;syncSize();positionLive();}
  });
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else if(raf){cancelAnimationFrame(raf);raf=0;}},{rootMargin:'80px'});observer.observe(journey);
  window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});
  syncSize();
  if(!reduced.matches){
    prepareLive();
    loadWorld().catch(()=>{});
    for(const source of new Set([...posterSources,portraitPoster])){
      if(availablePosters.has(source))continue;
      const image=new Image();
      image.fetchPriority='low';
      image.src=source;
      image.decode().then(()=>{availablePosters.add(source);if(!assetsReady)schedule();}).catch(()=>{});
    }
  }
  Promise.all([fetch(new URL('./assets/data/arctic-september.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Missing sea-ice record');return r.json();}),fetch(new URL('./assets/data/arctic-map.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Missing coastlines');return r.json();})]).then(([series,map])=>{
    data=series;mapData=map;makeDataViews();if(reduced.matches)stillViews();else liveViews();
  }).catch(error=>{console.warn('Using the complete static Arctic story:',error);stillViews();});
}
