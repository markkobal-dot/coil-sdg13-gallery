/* A photographic contact sheet: three perspectives, chosen by the visitor. */
(() => {
  'use strict';
  const opening=document.querySelector('.home-opening');
  if(!opening)return;
  const scenes={
    home:{index:'01 / LOOK AROUND',heading:'The places we love.\nThe future we share.',copy:'We are Mark and Lovro. Twelve photographs, one changing climate, and a story that starts where we live.',caption:'Alpine landscape',credit:'Lovro Trošt'},
    signs:{index:'02 / LOOK CLOSER',heading:'Small details.\nA changing climate.',copy:'A dry forest floor. A hot September day. Our photographs ask what everyday observations can tell us, alongside the evidence.',caption:'Dry forest floor · a local observation',credit:'Lovro Trošt'},
    choices:{index:'03 / LOOK AHEAD',heading:'A different future\nstarts with a choice.',copy:'From energy at home to the way we build a city: explore practical responses, then try your own ideas in New Terra.',caption:'Saving energy at home',credit:'Mark Kobal'}
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
        image.sizes='100vw';image.srcset=image.dataset.homeSrcset;image.src=image.dataset.homeSrc;
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
    opening.querySelectorAll('[data-home-image]').forEach(el=>el.classList.toggle('is-active',el.dataset.homeImage===key));
    opening.querySelector('.home-note-index').textContent=scene.index;
    document.getElementById('home-scene-heading').textContent=scene.heading;
    document.getElementById('home-scene-copy').textContent=scene.copy;
    const caption=document.getElementById('home-photo-caption');
    caption.replaceChildren(document.createTextNode(scene.caption),document.createElement('br'));
    const credit=document.createElement('span');credit.textContent='Photograph by '+scene.credit;caption.append(credit);
    document.getElementById('home-scene-announcement').textContent=scene.heading.replace('\n',' ')+' '+scene.caption+'. Photograph by '+scene.credit+'.';
  });
})();
