/* Brief photo reveals; photographs and captions stay usable without animation. */
(() => {
  'use strict';
  const home=document.querySelector('#home'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!home||reduced.matches||!('IntersectionObserver' in window))return;
  const elements=[...home.querySelectorAll('[data-photo-reveal]')];
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
  },{threshold:.06,rootMargin:'0px 0px 32px 0px'});
  elements.forEach(element=>{element.classList.add('photo-reveal-ready');observer.observe(element);});
  reduced.addEventListener('change',()=>{if(reduced.matches){elements.forEach(element=>element.classList.add('is-visible'));observer.disconnect();}});
})();
