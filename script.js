"use strict";
// GALLERY: Photos and captions are edited in gallery-data.js.
const grid=document.getElementById('photo-grid');
for(const photo of galleryPhotos){const card=document.createElement('article');card.className='photo-card';card.dataset.category=photo.category;const btn=document.createElement('button');btn.className='photo-open';btn.type='button';btn.setAttribute('aria-label','Open '+photo.title);const img=document.createElement('img');img.src=photo.src;img.alt=photo.description;img.loading='lazy';btn.append(img);btn.addEventListener('click',()=>openPhoto(photo));const info=document.createElement('div');info.className='info';const author=document.createElement('span');author.textContent=photo.author;const heading=document.createElement('h3');heading.textContent=photo.title;const desc=document.createElement('p');desc.textContent=photo.description;info.append(author,heading,desc);card.append(btn,info);grid.append(card)}
for(const filter of document.querySelectorAll('.filter'))filter.addEventListener('click',()=>{const choice=filter.dataset.filter;for(const f of document.querySelectorAll('.filter')){f.classList.toggle('active',f===filter);f.setAttribute('aria-pressed',String(f===filter))}for(const c of document.querySelectorAll('.photo-card'))c.hidden=choice!=='all'&&c.dataset.category!==choice});
const lightbox=document.getElementById('lightbox'),lightboxImage=document.getElementById('lightbox-image');let previousFocus=null;function openPhoto(photo){previousFocus=document.activeElement;lightboxImage.src=photo.src;lightboxImage.alt=photo.description;document.getElementById('lightbox-caption').textContent=photo.title+'\n\n'+photo.description+(photo.action?'\n\nAn action we can take: '+photo.action:'');lightbox.hidden=false;document.body.style.overflow='hidden';document.getElementById('lightbox-close').focus()}function closePhoto(){lightbox.hidden=true;lightboxImage.removeAttribute('src');document.body.style.overflow='';if(previousFocus)previousFocus.focus()}document.getElementById('lightbox-close').addEventListener('click',closePhoto);lightbox.addEventListener('click',e=>{if(e.target===lightbox)closePhoto()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lightbox.hidden)closePhoto();if(e.key==='Tab'&&!lightbox.hidden){e.preventDefault();document.getElementById('lightbox-close').focus()}});
// QUIZ: Replace these questions with your own SDG topic.
const questions=[{q:'What can help people stay cooler in a neighbourhood during a heatwave?',options:['Remove trees and add more dark paving','Plant and protect trees that provide shade','Close shaded public spaces'],answer:1,explanation:'Trees provide shade and can help cool nearby streets, making outdoor places more comfortable during hot weather.'},{q:'What is a sensible way to keep a home cooler on a hot day?',options:['Use blinds or shutters to block direct sun','Run air conditioning with the windows open','Open windows while outside air is hotter than indoors'],answer:0,explanation:'Shading windows can reduce heat entering the home. Ventilate when the outside air is cooler.'},{q:'Which choice can help limit future warming as we travel locally?',options:['Drive alone for every short trip','Walk, cycle or take public transport when practical','Leave the car running while waiting'],answer:1,explanation:'These options can reduce transport emissions. Walking and cycling also create no tailpipe emissions.'}];let qi=0,score=0,answered=false;const qtext=document.getElementById('quiz-question'),qopts=document.getElementById('quiz-options'),feedback=document.getElementById('quiz-feedback'),next=document.getElementById('quiz-next');function showQuestion(){answered=false;const q=questions[qi];document.getElementById('quiz-progress').textContent=`Question ${qi+1} of ${questions.length}`;document.getElementById('quiz-score').textContent=`Score: ${score}`;document.getElementById('quiz-bar').style.width=`${qi/questions.length*100}%`;qtext.textContent=q.q;qopts.replaceChildren();feedback.textContent='';next.hidden=true;const answerOrder=q.options.map((_,index)=>index);for(let i=answerOrder.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[answerOrder[i],answerOrder[j]]=[answerOrder[j],answerOrder[i]]}answerOrder.forEach((optionIndex,displayIndex)=>{const b=document.createElement('button');b.type='button';b.dataset.optionIndex=String(optionIndex);b.textContent=q.options[optionIndex];b.addEventListener('click',()=>choose(optionIndex));qopts.append(b)})}function choose(index){if(answered)return;answered=true;const q=questions[qi];if(index===q.answer)score++;[...qopts.children].forEach((b,i)=>{b.disabled=true;if(Number(b.dataset.optionIndex)===q.answer)b.classList.add('correct');else if(Number(b.dataset.optionIndex)===index)b.classList.add('wrong')});feedback.textContent=(index===q.answer?'Correct! ':'Not quite. ')+q.explanation;document.getElementById('quiz-score').textContent=`Score: ${score}`;next.hidden=false;next.textContent=qi===questions.length-1?'See my results ->':'Next question ->'}next.addEventListener('click',()=>{qi++;if(qi<questions.length){showQuestion()}else{qtext.hidden=true;qopts.hidden=true;next.hidden=true;feedback.textContent='';document.getElementById('quiz-bar').style.width='100%';document.getElementById('quiz-finish').hidden=false;document.getElementById('quiz-result').textContent=`You scored ${score} out of ${questions.length}!`}});document.getElementById('quiz-restart').addEventListener('click',()=>{qi=0;score=0;qtext.hidden=false;qopts.hidden=false;document.getElementById('quiz-finish').hidden=true;showQuestion()});showQuestion();
// SURVEY: Demo results are stored in localStorage on THIS browser only.
// A public survey that aggregates all visitors needs an external database/backend.
const key='coil-sdg-heat-poll-v1',choices=['Shade','Cool spaces','Buildings'];let votes;try{votes=JSON.parse(localStorage.getItem(key))||{Shade:0,'Cool spaces':0,Buildings:0}}catch{votes={Shade:0,'Cool spaces':0,Buildings:0}};for(const c of choices)if(!Number.isFinite(votes[c])||votes[c]<0)votes[c]=0;function drawVotes(){const total=choices.reduce((s,c)=>s+votes[c],0),target=document.getElementById('poll-bars');target.replaceChildren();for(const c of choices){const percent=total?Math.round(votes[c]/total*100):0;const row=document.createElement('div');row.className='poll-row';const label=document.createElement('div');label.className='poll-row-top';const name=document.createElement('span');name.textContent=c;const amount=document.createElement('span');amount.textContent=`${votes[c]} ${votes[c]===1?'vote':'votes'} | ${percent}%`;label.append(name,amount);const track=document.createElement('div');track.className='poll-track';const fill=document.createElement('div');fill.className='poll-fill';fill.style.width=percent+'%';track.append(fill);row.append(label,track);target.append(row)}}document.getElementById('poll-vote').addEventListener('click',()=>{const selected=document.querySelector('input[name="poll"]:checked');if(!selected){alert('Please select an option first.');return}votes[selected.value]++;try{localStorage.setItem(key,JSON.stringify(votes))}catch{}document.getElementById('poll').hidden=true;document.getElementById('poll-results').hidden=false;drawVotes()});document.getElementById('poll-reset').addEventListener('click',()=>{votes={Shade:0,'Cool spaces':0,Buildings:0};try{localStorage.removeItem(key)}catch{}document.getElementById('poll').hidden=false;document.getElementById('poll-results').hidden=true;document.querySelectorAll('input[name="poll"]').forEach(x=>x.checked=false)});
const toggle=document.querySelector('.menu-toggle'),nav=document.getElementById('navlinks');
const mobileQuery=window.matchMedia('(max-width: 640px)');
const mobileViewBar=document.getElementById('mobile-view-bar');
const mobileViewTitle=document.getElementById('mobile-view-title');
const mobileHomeButton=document.getElementById('mobile-home');
const mobileViews=new Map([
  ['#home',{id:'home',title:'Home',focus:'#home h1'}],
  ['#problem',{id:'problem',title:'Climate & Slovenia',focus:'#problem h2'}],
  ['#climate-story',{id:'climate-story',title:'Our Climate Story',focus:'#climate-story h2'}],
  ['#gallery',{id:'gallery',title:'Gallery',focus:'#gallery h2'}],
  ['#game',{id:'game',title:'Climate Mission',focus:'#game h2'}],
  ['#solutions',{id:'solutions',title:'Take Action',focus:'#solutions h2'}],
  ['#journey',{id:'journey',title:'Our Journey',focus:'#journey h2'}],
  ['#team',{id:'team',title:'Our Team',focus:'#team h2'}]
]);
function closeMobileMenu(){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='Menu'}
function showMobileView(hash,addHistory=false){
  const entry=mobileViews.get(hash)||mobileViews.get('#home');
  document.body.dataset.mobileView=entry.id;
  window.dispatchEvent(new CustomEvent('mobileviewchange',{detail:{id:entry.id}}));
  mobileViewBar.hidden=entry.id==='home';
  mobileViewTitle.textContent=entry.title;
  closeMobileMenu();
  if(addHistory&&window.location.hash!==hash)history.pushState({mobileView:entry.id},'',hash);
  window.scrollTo(0,0);
  const heading=document.querySelector(entry.focus);
  if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true})}
}
toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Close menu':'Menu'});
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link)return;
  const hash=link.getAttribute('href');
  if(!mobileViews.has(hash))return;
  if(!mobileQuery.matches){if(link.closest('#navlinks'))closeMobileMenu();return}
  event.preventDefault();showMobileView(hash,true);
});
mobileHomeButton.addEventListener('click',()=>showMobileView('#home',true));
window.addEventListener('popstate',()=>{if(mobileQuery.matches)showMobileView(window.location.hash||'#home')});
mobileQuery.addEventListener('change',event=>{
  if(event.matches)showMobileView(window.location.hash||'#home');
  else{delete document.body.dataset.mobileView;mobileViewBar.hidden=true;closeMobileMenu();const target=document.getElementById(window.location.hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView())}
});
if(mobileQuery.matches)showMobileView(window.location.hash||'#home');



// Reveal page sections gently as they enter the viewport.
(() => {
  const targets = document.querySelectorAll(
    '.section-heading, .game-frame, .problem-main, .fact-card, .photo-card, .interactive-card, .tips, .timeline > div, .video-panel, .student, .closing'
  );
  if (!targets.length) return;
  document.documentElement.classList.add('js-enabled');
  targets.forEach((item) => item.classList.add('reveal'));
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
  targets.forEach((item) => observer.observe(item));
})();

(() => {
  const scene = document.querySelector('.climate-scene');
  const steps = [...document.querySelectorAll('.shift-step[data-scene-state]')];
  if (!scene || !steps.length) return;
  const previous = document.getElementById('story-previous');
  const next = document.getElementById('story-next');
  const progress = document.getElementById('story-progress');
  const mobileQuery = window.matchMedia('(max-width: 640px)');
  let activeIndex = 0;
  let observer = null;
  const activate = (step) => {
    activeIndex = steps.indexOf(step);
    scene.dataset.state = step.dataset.sceneState;
    steps.forEach((item) => item.classList.toggle('is-active', item === step));
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === steps.length - 1;
    progress.textContent = `Stage ${activeIndex + 1} of ${steps.length}`;
  };
  const updateMode = () => {
    if (observer) { observer.disconnect(); observer = null; }
    if (mobileQuery.matches) {
      if (document.body.dataset.mobileView === 'climate-story') activate(steps[activeIndex]);
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top - window.innerHeight / 2) - Math.abs(b.boundingClientRect.top - window.innerHeight / 2))[0];
      if (current) activate(current.target);
    }, { threshold: 0, rootMargin: '-40% 0px -40% 0px' });
    steps.forEach((step) => observer.observe(step));
  };
  previous.addEventListener('click', () => { if (mobileQuery.matches && activeIndex > 0) activate(steps[activeIndex - 1]); });
  next.addEventListener('click', () => { if (mobileQuery.matches && activeIndex < steps.length - 1) activate(steps[activeIndex + 1]); });
  window.addEventListener('mobileviewchange', updateMode);
  mobileQuery.addEventListener('change', updateMode);
  activate(steps[0]);
  updateMode();
})();
