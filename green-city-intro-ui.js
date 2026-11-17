import './green-city-intro.js?v=9ea9a9d344';
import './green-city-life.js?v=acc9a6f5a0';
import './green-city-planning.js?v=91314a0454';
const C=globalThis.GreenCity,I=globalThis.GreenCityIntro,L=globalThis.GreenCityLife,P=globalThis.GreenCityPlanning;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storeKey='coil-green-city-introduction-v1';
export function createIntroduction(api){
  const shell=document.getElementById('gc-shell'),coach=document.createElement('section');coach.className='gc-intro';coach.hidden=true;coach.setAttribute('role','region');coach.setAttribute('aria-labelledby','gc-intro-title');
  const map=shell.querySelector('.gc-world-wrap');map.before(coach);
  const launch=document.createElement('button');launch.type='button';launch.className='gc-intro-launch';launch.textContent='Guided introduction';document.getElementById('gc-tab-help').querySelector('h3').after(launch);
  const residentNext=document.createElement('button');residentNext.type='button';residentNext.className='gc-intro-person-next';residentNext.hidden=true;residentNext.textContent='Continue: plan more shade';shell.querySelector('.gc-person-note').before(residentNext);
  let session=null,plan=null,lastResult=null,blocked=null,lastStage=null;
  try{session=I.restore(C,api.getState(),JSON.parse(localStorage.getItem(storeKey)),api.getAnalysis());}catch{}
  function persist(status='active'){try{localStorage.setItem(storeKey,JSON.stringify({status,...(session?{home:session.home,baseline:session.baseline,started:session.started,stage:session.stage}:{})}));}catch{}}
  function hide(status='skipped'){
    persist(status);session=null;plan=null;blocked=null;coach.hidden=true;residentNext.hidden=true;api.planning().close();api.setMode('inspect');
    api.announce(status==='complete'?'Introduction finished. Keep shaping your city.':'Introduction skipped. Continue your mission in Goals or keep building freely.');
  }
  function focusCoach(){if(!shell.classList.contains('gc-expanded'))coach.scrollIntoView({block:'nearest',behavior:'instant'});coach.querySelector('h3')?.focus({preventScroll:true});}
  function start(){
    api.dismissWelcome();api.pause();api.closePanels();api.planning().close();api.setMode('inspect');plan=null;lastResult=null;blocked=null;
    const state=api.getState(),walkers=L.plan(C,state,api.getAnalysis(),{walkers:72}).walkers,choice=I.entry(C,state,api.getAnalysis(),walkers);
    if(choice.kind==='busy'||choice.kind==='unavailable'){session=null;blocked=choice.kind;render();focusCoach();return;}
    if(choice.kind==='completed'){
      session={home:choice.record.home,baseline:choice.record.baseline,started:choice.record.month,stage:4};render();focusCoach();return;
    }
    session={home:choice.home,baseline:choice.baseline,started:choice.started,stage:1};persist();
    if(choice.kind==='start'&&!api.commit(C.startNeighbourhoodMission(state,'shade',choice.home))){session=null;render();return;}
    render();api.showHome(choice.home);focusCoach();
  }
  function prepare(){
    if(!session)return;
    api.planning().close();plan=I.nextPlan(C,api.getState(),session.home,api.getAnalysis());
    session.stage=3;persist();if(!plan.error)api.previewPlan(plan);render();focusCoach();
  }
  function next(){
    if(blocked){coach.hidden=true;blocked=null;api.openGoals();return;}
    if(!session)return;
    const report=I.status(C,api.getState(),session,api.getAnalysis());
    if(report.kind==='completed'){hide('complete');return;}
    if(['missing','detached'].includes(report.kind)){api.openGoals();return;}
    if(session.stage===1){
      const walkers=L.plan(C,api.getState(),api.getAnalysis(),{walkers:72}).walkers,actor=walkers.find(p=>p.from===session.home);
      session.stage=2;persist();if(actor)api.planning().openResident(actor);else api.openNeighbourhood(session.home);render();
      const personPanel=shell.querySelector('.gc-person-panel');if(innerWidth<=700&&!personPanel.hidden)personPanel.scrollIntoView({block:'center',behavior:'instant'});return;
    }
    if(session.stage===2){prepare();return;}
    if(plan?.error){api.openNeighbourhood(session.home);return;}
    if(!plan)return;
    // The normal action path validates the current site and budget, and awards the real mission once.
    api.executePlan(plan);render();focusCoach();
  }
  function render(){
    residentNext.hidden=true;
    if(!session&&!blocked){coach.hidden=true;return;}
    const state=api.getState(),report=session?I.status(C,state,session,api.getAnalysis()):null;
    if(report?.kind==='completed'){if(session.stage!==4){api.planning().close();api.setMode('inspect');}session.stage=4;plan=null;}
    else if(session?.stage===4){session.stage=2;plan=null;}
    if(session?.stage===3&&plan&&!plan.error){
      const cell=state.cells[plan.target],built=plan.kind==='upgrade'?cell?.type===plan.type&&cell.level>plan.level:cell?.type===plan.type;
      if(built||report?.value!==plan.before){lastResult={before:plan.before,after:report?.value||0};session.stage=2;plan=null;api.setMode('inspect');}
    }
    let title='',copy='',facts='',button='',disabled=false;
    const stage=session?.stage||1,home=session?C.label(session.home):'';
    residentNext.hidden=!session||stage!==2;
    if(blocked){title=blocked==='busy'?'Finish your active mission first':'Your neighbourhood is already shaded';copy=blocked==='busy'?'The introduction uses Cool the block. Your current mission and buildings have been kept. Finish it or leave it in Goals before starting this introduction.':'There is no connected home below the shade target. Explore your city’s other needs in Goals.';button='Open Goals';}
    else if(['missing','detached'].includes(report.kind)){title='Your mission has changed';copy='The original home or mission is no longer available. Review it in Goals, or skip this introduction and keep playing.';button='Review in Goals';}
    else if(stage===4){title='A cooler neighbourhood';copy=home+' now meets the shade target. This is the result of the improvements you built.';facts=`<div class="gc-intro-result"><span>Local shade</span><strong>${report.record.baseline} <small>→</small> ${report.record.value}<small>/100</small></strong><b>+${report.reward} EP · reward paid once</b></div>`;button='Continue building';}
    else if(stage===1){
      const actor=L.plan(C,state,api.getAnalysis(),{walkers:72}).walkers.find(p=>p.from===session.home),person=actor?P.resident(C,state,api.getAnalysis(),actor):null;
      title=person?'Meet '+person.name:'Start with one home';copy=home+' has '+report.value+'/100 shade. Meet a resident, then help this home reach 40/100 in the Cool the block mission.';button=person?'Meet '+person.name:'View this home';
    }else if(stage===2){title=lastResult?'Your first improvement worked':'Choose an improvement';copy=(lastResult?'Shade rose from '+lastResult.before+' to '+lastResult.after+'/100. ':'')+'The target at '+home+' is 40/100. Nearby trees and parks provide shade; preview a suitable plot before spending Eco Points.';facts=`<div class="gc-intro-progress"><span>Shade at ${home}</span><strong>${report.value} / 40</strong><progress max="40" value="${Math.min(40,report.value)}" aria-label="Shade mission progress"></progress></div>`;button='Plan nearby greenery';}
    else{
      title='Preview, then build';
      if(plan?.error){copy=plan.error;button='Open local feedback';}
      else if(!plan){session.stage=2;render();return;}
      else{
        const funded=state.cash>=plan.cost,forecast=P.forecast(C,state,{mode:plan.kind==='upgrade'?'upgrade':'build',type:plan.type,i:plan.target},api.getAnalysis());
        copy=(plan.kind==='upgrade'?'Upgrade ':'Place ')+C.types[plan.type].name.toLowerCase()+' at '+C.label(plan.target)+'. The map highlights affected homes. Check the forecast before confirming.';
        facts=`<dl class="gc-intro-plan"><div><dt>Shade at ${home}</dt><dd>${plan.before} → ${plan.after}/100</dd></div><div><dt>Cost</dt><dd>${plan.cost} EP</dd></div>${!forecast?.error?`<div><dt>Monthly balance after</dt><dd>${forecast.net>=0?'+':''}${forecast.net} EP</dd></div>`:''}</dl>${!funded?'<p class="gc-intro-warning">You need more Eco Points. Your normal budget and monthly controls remain available.</p>':forecast?.error?'<p class="gc-intro-warning">'+escape(forecast.error)+'</p>':''}`;
        disabled=!funded||!!forecast?.error;button=(plan.kind==='upgrade'?'Upgrade':'Build')+' · '+plan.cost+' EP';
      }
    }
    const hadFocus=coach.contains(document.activeElement);
    coach.hidden=false;coach.dataset.stage=String(stage);coach.innerHTML=`<header><span>OPTIONAL INTRODUCTION · ${stage} / 4</span><button type="button" data-intro-skip aria-label="Skip guided introduction">×</button></header><ol class="gc-intro-steps" aria-label="Introduction steps">${['Meet','Plan','Build','Result'].map((name,n)=>`<li${stage===n+1?' aria-current="step"':''} class="${stage>n+1?'is-done':''}">${stage>n+1?'✓':n+1} ${name}</li>`).join('')}</ol><h3 id="gc-intro-title" tabindex="-1">${escape(title)}</h3><p>${escape(copy)}</p>${facts}<div class="gc-intro-actions"><button type="button" id="gc-intro-next" ${disabled?'disabled':''}>${escape(button)}</button>${stage===3?'<button type="button" data-intro-replan>Recheck plan</button>':''}<button type="button" data-intro-skip>${stage===4?'Close introduction':'Skip introduction'}</button></div>`;
    if(session)persist();
    if(hadFocus)coach.querySelector('#gc-intro-next').focus({preventScroll:true});
    if(stage===4&&lastStage!==4)focusCoach();
    lastStage=stage;
  }
  coach.addEventListener('click',e=>{if(e.target.closest('[data-intro-skip]'))hide(session?.stage===4?'complete':'skipped');else if(e.target.closest('[data-intro-replan]'))prepare();else if(e.target.closest('#gc-intro-next'))next();});
  coach.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();hide('skipped');}});
  launch.addEventListener('click',start);residentNext.addEventListener('click',prepare);
  return {start,render,ownsReward:reward=>I.ownsReward(session,reward),reset(){session=null;blocked=null;plan=null;coach.hidden=true;residentNext.hidden=true;api.planning().close();persist('skipped');}};
}
