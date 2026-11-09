import {needIcon} from './green-city-neighbourhood-icons.js?v=98db9558ad';
const C=globalThis.GreenCity;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={shade:'shade',transit:'mobility',care:'health'};
const metricNames={shade:'Local shade',mobility:'Transport access',health:'Healthcare access'};

export function createMissions(api){
  const shell=document.getElementById('gc-shell'),host=document.createElement('section');
  host.className='gc-neighbourhood-missions';host.id='gc-neighbourhood-missions';host.setAttribute('aria-label','Neighbourhood missions');
  document.getElementById('gc-tab-goals').prepend(host);
  const dialog=document.createElement('dialog');dialog.id='gc-mission-completion';dialog.className='gc-mission-completion';dialog.setAttribute('aria-labelledby','gc-mission-celebration-title');shell.append(dialog);
  dialog.innerHTML='<button type="button" class="gc-mission-dismiss" aria-label="Close mission achievement">×</button><div class="gc-mission-seal" aria-hidden="true">✓</div><span class="gc-overline">A BETTER PLACE TO CALL HOME</span><h3 id="gc-mission-celebration-title"></h3><p id="gc-mission-celebration-copy"></p><div class="gc-mission-before-after" id="gc-mission-celebration-result"></div><strong class="gc-mission-reward" id="gc-mission-celebration-reward"></strong><p class="gc-mission-paid">Reward added to your treasury. Saved with your city.</p><button type="button" class="gc-action-button" data-mission-next>Choose your next mission</button><button type="button" class="gc-mission-secondary" data-mission-continue>Keep building</button>';
  const selected=new Map();let pending=null,timer=null;
  function render(){
    const state=api.getState(),reports=C.neighbourhoodMissions(state,api.getAnalysis()),active=reports.find(m=>m.active),done=reports.filter(m=>m.completed).length;
    host.innerHTML=`<span class="gc-overline">NEIGHBOURHOOD MISSIONS · ${done} / 3</span><h3>A better city, one block at a time.</h3><p class="gc-missions-intro">Choose a home that needs help. Make a local improvement and earn a one-time reward. One mission at a time; no timer.</p>${reports.map(report=>{
      const {id,name,reward,detail,completed,active,progress,candidates}=report;
      const options=candidates.map(h=>`<option value="${h.i}"${selected.get(id)===h.i?' selected':''}>${C.label(h.i)} · ${metricNames[report.metric]} ${h[report.metric]}/100</option>`).join('');
      return `<article class="gc-neighbourhood-mission${active?' is-active':''}${completed?' is-completed':''}"><header><span class="gc-mission-icon" aria-hidden="true">${completed?'✓':needIcon(icons[id])}</span><div><small>${completed?'COMPLETED · MONTH '+completed.month:active?'YOUR ACTIVE MISSION':'LOCAL ACTION'}</small><h4>${name}</h4></div><b>+${reward}<small>EP</small></b></header><p>${detail}</p>${completed?`<div class="gc-mission-earned">${C.label(completed.home)} · ${metricNames[report.metric]} ${completed.baseline} → ${completed.value}/100<span>Reward received ✓</span></div>`:active?`<div class="gc-mission-target"><strong>Around ${C.label(active.home)}</strong><span>${progress}%</span></div><div class="gc-mission-progress" role="progressbar" aria-label="${name} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div>${report.missing?'<p class="gc-mission-warning">This home was removed. Rebuild a home at the same plot, or leave this mission and choose another.</p>':''}<ul class="gc-mission-checks">${report.checks.map(check=>`<li class="${check.done?'is-done':''}"><span aria-hidden="true">${check.done?'✓':'○'}</span>${escape(check.name)}</li>`).join('')}</ul><p class="gc-mission-hint">${report.hint}</p><div class="gc-mission-actions"><button type="button" data-mission-view="${active.home}">Plan with local feedback ↗</button><button type="button" class="gc-mission-leave" data-mission-leave>Leave mission</button></div>`:candidates.length?`<label class="gc-mission-home-label" for="gc-mission-home-${id}">Choose a home<select id="gc-mission-home-${id}" data-mission-home="${id}" ${reports.some(m=>m.active)?'disabled':''}>${options}</select></label><button type="button" class="gc-mission-start" data-mission-start="${id}" ${reports.some(m=>m.active)?'disabled':''}>${reports.some(m=>m.active)?'Finish your active mission first':'Start '+name.toLowerCase()}</button>`:'<p class="gc-mission-already">All connected homes already meet this target. No improvement is needed right now.</p>'}</article>`;
    }).join('')}<p class="gc-missions-footnote">These local missions are separate from your long-term city challenge and development grants.</p>`;
    for(const button of shell.querySelectorAll('[data-gc-panel="goals"]')){
      const caption=active?'Goals · '+active.progress+'%':done===3?'Goals ✓':'Goals',span=button.querySelector('span');
      if(span)span.textContent=caption;else button.textContent='⚑ '+caption;
      button.setAttribute('aria-label',active?'Goals: '+active.name+', '+active.progress+'% complete':'City goals and neighbourhood missions');
    }
    if(active)document.getElementById('gc-milestone').textContent=active.name+' · '+C.label(active.active.home)+' · '+active.progress+'% → +'+active.reward+' EP';
  }
  host.addEventListener('change',event=>{if(event.target.dataset.missionHome)selected.set(event.target.dataset.missionHome,Number(event.target.value));});
  host.addEventListener('click',event=>{
    const start=event.target.closest('[data-mission-start]'),view=event.target.closest('[data-mission-view]');
    if(start){const id=start.dataset.missionStart,home=Number(document.getElementById('gc-mission-home-'+id).value);api.commit(C.startNeighbourhoodMission(api.getState(),id,home));}
    if(event.target.closest('[data-mission-leave]'))api.commit(C.leaveNeighbourhoodMission(api.getState()));
    if(view)api.openNeighbourhood(Number(view.dataset.missionView));
  });
  function showCompletion(){
    if(!pending||api.hasOverlay()||document.body.dataset.view!=='game'||document.hidden)return;
    const reward=pending;pending=null;
    if(!api.getState().missions?.completed.some(m=>m.id===reward.id))return;
    dialog.querySelector('h3').textContent=reward.name+' completed';
    dialog.querySelector('#gc-mission-celebration-copy').textContent='You made a measurable difference around '+C.label(reward.home)+'.';
    dialog.querySelector('#gc-mission-celebration-result').innerHTML='<span>'+metricNames[reward.metric]+'</span><strong>'+reward.baseline+' <small>→</small> '+reward.value+'<small>/100</small></strong>';
    dialog.querySelector('#gc-mission-celebration-reward').textContent='+'+reward.reward+' Eco Points';
    dialog.showModal();api.syncClock();
  }
  dialog.querySelector('.gc-mission-dismiss').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-mission-continue]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-mission-next]').addEventListener('click',()=>{dialog.close();api.openPanel('goals');});
  dialog.addEventListener('close',api.syncClock);
  shell.addEventListener('close',()=>{clearTimeout(timer);timer=setTimeout(showCompletion,0);},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)showCompletion();});
  return {render,notify(reward){pending=reward;clearTimeout(timer);timer=setTimeout(showCompletion,0);},close(){pending=null;clearTimeout(timer);if(dialog.open)dialog.close();}};
}
