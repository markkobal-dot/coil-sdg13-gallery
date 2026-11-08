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
  controls.hidden=false;
  controls.addEventListener('click',event=>{
    const button=event.target.closest('[data-home-scene]');
    if(!button||button.getAttribute('aria-pressed')==='true')return;
    const key=button.dataset.homeScene,scene=scenes[key];
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
