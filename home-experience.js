/* A photographic contact sheet: three perspectives, chosen by the visitor. */
(() => {
  'use strict';
  const opening=document.querySelector('.home-opening');
  if(!opening)return;
  const scenes={
    home:{heading:'Triglav Glacier, summer 2025',copy:'Very little ice remains in this summer view. See how the glacier’s mapped area has changed since 1946.',caption:'Triglav Glacier · Summer 2025'},
    signs:{heading:'A dry forest floor',copy:'Dry pine needles cover the ground. When vegetation dries out, it can become fuel for wildfires.',caption:'Santiago del Teide, Tenerife · Spain'},
    choices:{heading:'Rooftop solar panels',copy:'Solar panels generate electricity from sunlight and can reduce reliance on fossil fuels.',caption:'Rateče · Slovenia'}
  };
  const controls=opening.querySelector('.home-scenes');
  let request=0;
  controls.hidden=false;
  controls.addEventListener('click',async event=>{
    const button=event.target.closest('[data-home-scene]');
    if(!button)return;
    if(button.getAttribute('aria-pressed')==='true'){
      ++request;controls.querySelectorAll('button').forEach(el=>el.removeAttribute('aria-busy'));return;
    }
    const key=button.dataset.homeScene,scene=scenes[key];
    const token=++request,image=opening.querySelector('[data-home-image="'+key+'"]');
    controls.querySelectorAll('button').forEach(el=>el.removeAttribute('aria-busy'));
    button.setAttribute('aria-busy','true');
    try{
      if(!image.getAttribute('src')){
        image.sizes='(max-width:700px) 100vw, 52vw';image.srcset=image.dataset.homeSrcset;image.src=image.dataset.homeSrc;
      }
      await image.decode();
    }catch{
      if(token===request){button.removeAttribute('aria-busy');document.getElementById('home-scene-announcement').textContent='This photograph could not load. You can keep exploring the current view.';}
      return;
    }
    if(token!==request)return;
    button.removeAttribute('aria-busy');
    opening.dataset.scene=key;
    controls.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    opening.querySelectorAll('[data-home-image]').forEach(el=>{
      const active=el.dataset.homeImage===key;
      el.classList.toggle('is-active',active);
      el.setAttribute('aria-hidden',String(!active));
    });
    document.getElementById('home-scene-heading').textContent=scene.heading;
    document.getElementById('home-scene-copy').textContent=scene.copy;
    const caption=document.getElementById('home-photo-caption');
    caption.textContent=scene.caption;
    document.getElementById('home-scene-announcement').textContent=scene.heading.replace('\n',' ')+'. '+scene.caption+'.';
  });
})();
