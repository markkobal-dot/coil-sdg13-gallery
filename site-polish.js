/* Small reading and layout helpers; city saves and simulation rules stay independent. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-evidence-open]').forEach(button=>button.addEventListener('click',()=>{
    const detail=document.getElementById(button.dataset.evidenceOpen);
    if(!detail)return;
    detail.open=true;
    detail.querySelector('summary').focus({preventScroll:true});
    detail.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
  }));
  const shell=document.getElementById('gc-shell'),header=shell?.querySelector('.gc-topbar');
  if(!header)return;
  let frame=0;
  function measure(){
    frame=0;
    const bottom=Math.ceil(header.getBoundingClientRect().bottom-shell.getBoundingClientRect().top);
    const value=bottom+'px';
    if(bottom>0&&shell.style.getPropertyValue('--gc-hud-bottom')!==value)shell.style.setProperty('--gc-hud-bottom',value);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
  new ResizeObserver(schedule).observe(header);
  new MutationObserver(schedule).observe(shell,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('app:view',schedule);
  document.addEventListener('fullscreenchange',schedule);
  schedule();
})();
