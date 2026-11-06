/* City workspace: fullscreen, commands, council briefings and budget controls. */
const C=globalThis.GreenCity;
const paths={
 inspect:'m5 3 14 8-7 2-3 7Z',build:'M12 4v16M4 12h16',road:'M8 3 5 21M16 3l3 18M12 4v3m0 4v3m0 4v3',
 upgrade:'m7 10 5-5 5 5M12 5v14M5 20h14',move:'M12 3v18M3 12h18m-9-9-3 3m3-3 3 3M3 12l3-3m-3 3 3 3m15-3-3-3m3 3-3 3m-6 6-3-3m3 3 3-3',
 demolish:'m4 8 8-5 8 5-8 5ZM5 9v8l7 4 7-4V9M12 13v8',undo:'M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12',redo:'m16 5 5 5-5 5m5-5H11a6 6 0 0 0 0 12',
 expand:'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',close:'m6 6 12 12M18 6 6 18',
 finance:'M4 20h16M6 16V9m6 7V4m6 12v-5',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 search:'M16 16l5 5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15',city:'M3 21V8h6v13m0 0V3h6v18m0 0V11h6v10M6 11v1m6-6v1m6 7v1',
 play:'m8 5 12 7-12 7Z',pause:'M8 5v14M16 5v14',next:'m5 5 10 7-10 7ZM19 5v14',zoomIn:'M12 5v14M5 12h14',zoomOut:'M5 12h14',
 rotateLeft:'M3 10a9 9 0 1 1 2 9M3 4v6h6',rotateRight:'M21 10a9 9 0 1 0-2 9m2-15v6h-6',home:'m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7',
 moon:'M20 15A8 8 0 0 1 9 4a9 9 0 1 0 11 11Z',grid:'M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18',
 sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
 rain:'M6 15a5 5 0 1 1 1-10 6 6 0 0 1 11 3 4 4 0 0 1 0 8M7 18l-1 3m6-3-1 3m6-3-1 3',
 energy:'m13 2-9 12h7l-1 8 10-13h-7Z',recycling:'m10 4 2-2 5 8m-2-2 3 2 1-4M20 12l2 2-5 8m1-4-1 4 4-1M9 21H2l5-10m-1 3 1-4-4 1',
 check:'m5 12 4 4L19 6',save:'M5 3h12l4 4v14H3V3ZM7 3v6h10V3M7 21v-8h10v8',file:'M14 2H5v20h14V7Zm0 0v6h5',
 help:'M9 9a3 3 0 1 1 4 3c-1 1-1 2-1 3M12 19v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
 photo:'M4 7h4l2-3h4l2 3h4v14H4ZM12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8',flag:'M5 22V3c5-4 9 4 14 0v10c-5 4-9-4-14 0'
};
export function glyph(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.city)+'"/></svg>';}
export function createExperience(api){
 const $=id=>document.getElementById('gc-'+id),shell=$('shell'),q=(s)=>shell.querySelector(s);
 const fmt=n=>Math.round(n).toLocaleString('en-GB'),num=n=>Number.isInteger(n)?String(n):n.toFixed(1),signed=n=>(n>0?'+':'')+fmt(n);
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let draft=null,desiredFullscreen=false,nativeEntered=false,fullscreenGeneration=0,toastTimer=null;
 const make=html=>{const box=document.createElement('div');box.innerHTML=html;return [...box.children];};
 const modalMarkup=`
 <dialog id="gc-finance" class="gc-dialog gc-finance-dialog" aria-labelledby="gc-finance-title">
  <div class="gc-modal-heading"><div><span class="gc-overline">CITY CONTROL / ECONOMY</span><h3 id="gc-finance-title">A budget with a purpose.</h3><p>Set the balance between affordability, services and growth.</p></div><button type="button" data-gc-close="finance" class="gc-icon-button" aria-label="Close city budget">${glyph('close')}</button></div>
  <div class="gc-finance-layout"><div class="gc-finance-controls">
   <div class="gc-budget-presets" role="group" aria-label="Budget presets"><button type="button" data-gc-preset="balanced">Balanced</button><button type="button" data-gc-preset="affordable">Affordability first</button><button type="button" data-gc-preset="reserves">Build reserves</button></div>
   <h4>Taxes &amp; prices</h4><div id="gc-finance-sliders"></div>
   <label class="gc-standards-toggle"><span><strong>Cleaner industry standards</strong><small>Improve air quality. Costs 35 EP per month.</small></span><input id="gc-fin-clean-industry" type="checkbox" role="switch"></label>
   <div class="gc-finance-note">${glyph('help')}<p>Fares and utility prices are game prices in Eco Points. Higher charges can reduce demand and wellbeing. Construction prices and upkeep are shown in the building catalogue.</p></div>
  </div><aside class="gc-budget-forecast"><span class="gc-overline">PROJECTED MONTHLY BALANCE</span><div id="gc-fin-net"></div><div id="gc-fin-impact" class="gc-fin-impact"></div><div id="gc-fin-ledger"></div><div id="gc-fin-loan" class="gc-fin-loan"></div></aside></div>
  <footer class="gc-modal-footer"><span id="gc-finance-dirty">Your current city budget.</span><button id="gc-finance-reset" class="gc-plain-button" type="button">Reset changes</button><button id="gc-finance-apply" class="gc-action-button" type="button">Apply budget</button></footer>
 </dialog>
 <dialog id="gc-decision" class="gc-dialog gc-decision-dialog" aria-labelledby="gc-decision-title">
  <div class="gc-decision-scene"><div id="gc-decision-art" aria-hidden="true"></div><span class="gc-overline">NEW TERRA CITY COUNCIL</span><h3 id="gc-decision-title" tabindex="-1" autofocus></h3><p id="gc-decision-description"></p><div id="gc-decision-context"></div><span class="gc-decision-paused">${glyph('pause')} The city is paused while you decide.</span></div>
  <div class="gc-decision-actions"><div class="gc-decision-actions-heading"><div><span class="gc-overline">YOUR NEXT DECISION</span><h4>How should we respond?</h4></div><button class="gc-icon-button" type="button" data-gc-close="decision" aria-label="Decide later">${glyph('close')}</button></div><div id="gc-decision-options"></div><button type="button" id="gc-decision-later" class="gc-decision-later">Decide later · keep in inbox</button></div>
 </dialog>
 <dialog id="gc-commands" class="gc-dialog gc-command-dialog" aria-label="City command palette"><div class="gc-command-search">${glyph('search')}<input id="gc-command-query" type="search" placeholder="Search tools, buildings, actions…" aria-label="Search city commands" autocomplete="off" autofocus><button type="button" data-gc-close="commands" class="gc-keycap" aria-label="Close command palette">Esc</button></div><div id="gc-command-list" class="gc-command-list"></div><footer><span>↑ ↓ to navigate &nbsp; ↵ to run</span><span>City commands</span></footer></dialog>`;
 make(modalMarkup).forEach(el=>shell.append(el));
 // Native dialogs belong inside the fullscreen element.
 for(const id of ['results','confirm','import-file'])if($(id))shell.append($(id));
 const tray=q('.gc-window-controls'),settings=q('.gc-settings');
 const sound=document.getElementById('game-sound');settings.querySelector('div').insertBefore(sound,$('save-status'));
 make(`<button id="gc-finance-button" class="gc-icon-button" type="button" aria-label="Open city budget" title="City budget">${glyph('finance')}</button><button id="gc-inbox-button" class="gc-icon-button gc-inbox-button" type="button" aria-label="Open council inbox" title="Council inbox">${glyph('bell')}<span id="gc-inbox-count" hidden>1</span></button><button id="gc-command-button" class="gc-icon-button" type="button" aria-label="Open city commands" title="City commands (Ctrl+K)">${glyph('search')}</button>`).forEach(el=>tray.insertBefore(el,$('expand')));
 const budget=$('budget').parentElement;budget.id='gc-treasury-button';budget.setAttribute('role','button');budget.tabIndex=0;budget.setAttribute('aria-label','Open city budget and pricing');
 budget.addEventListener('click',openFinance);budget.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openFinance();}});
 const toggles=document.createElement('div');toggles.className='gc-panel-toggles';toggles.innerHTML=`<button type="button" data-gc-panel="build" aria-label="Toggle building catalogue" aria-pressed="false">${glyph('build')}<span>Build</span></button><button type="button" data-gc-panel="city" aria-label="Toggle city dashboard" aria-pressed="false">${glyph('city')}<span>City</span></button><button type="button" data-gc-panel="goals" aria-label="Toggle city goals" aria-pressed="false">${glyph('flag')}<span>Goals</span></button>`;
 $('world-wrap').append(toggles);toggles.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{api.setPanel(b.dataset.gcPanel);renderPanels();}));
 const banner=document.createElement('div');banner.id='gc-alert-banner';banner.className='gc-alert-banner';banner.hidden=true;banner.innerHTML=`<span class="gc-alert-symbol">${glyph('bell')}</span><div><small>CITY COUNCIL / DECISION WAITING</small><strong id="gc-alert-name"></strong></div><button id="gc-review-decision" type="button">Review</button>`;$('world-wrap').append(banner);
 $('review-decision').addEventListener('click',openDecision);$('inbox-button').addEventListener('click',openDecision);$('finance-button').addEventListener('click',openFinance);$('command-button').addEventListener('click',openCommands);
 const policyBox=q('.gc-policies');policyBox.innerHTML=`<summary>City economy</summary><p>Taxes, public fares, utility prices and service funding.</p><button id="gc-budget-from-city" type="button">Manage city budget ${glyph('finance')}</button>`;$('budget-from-city').addEventListener('click',openFinance);
 rootButtons();
 function rootButtons(){
  shell.querySelectorAll('[data-gc-tool]').forEach(button=>{const labels={inspect:'Inspect',build:'Build',road:'Roads',upgrade:'Upgrade',move:'Move',demolish:'Remove'};button.innerHTML=glyph(button.dataset.gcTool)+'<span>'+labels[button.dataset.gcTool]+'</span>';button.setAttribute('aria-label',labels[button.dataset.gcTool]+' tool');});
  $('undo').innerHTML=glyph('undo');$('redo').innerHTML=glyph('redo');
  const cameras={'zoom-in':'zoomIn','zoom-out':'zoomOut','rotate-left':'rotateLeft','rotate-right':'rotateRight',reset:'home',night:'moon',grid:'grid'};
  shell.querySelectorAll('[data-gc-camera]').forEach(b=>b.innerHTML=glyph(cameras[b.dataset.gcCamera]));
  $('focus').innerHTML=glyph('inspect');
  shell.querySelectorAll('.gc-close-panel').forEach(b=>b.innerHTML=glyph('close'));
 }
 const controls=[
  ['residentialTax','Residential tax','6–18% · Higher rates raise revenue but reduce wellbeing.','%'],
  ['businessTax','Business tax','5–18% · High rates can reduce local employment.','%'],
  ['transitFare','Public transport fare','0–5 EP · Lower fares encourage public transport.',' EP'],
  ['utilityTariff','Utility price','1 EP is the standard tariff. Higher prices encourage conservation.',' EP'],
  ['serviceBudget','Service funding','70–140% · Funds maintenance, care, transit and green-space services.','%']
 ];
 $('finance-sliders').innerHTML=controls.map(([key,title,description,unit])=>{const[min,max,step]=C.policyRanges[key];return `<label class="gc-fin-control"><span><strong>${title}</strong><output id="gc-fin-out-${key}" for="gc-fin-${key}"></output></span><input id="gc-fin-${key}" type="range" min="${min}" max="${max}" step="${step}" data-policy="${key}" aria-label="${title}"><small>${description}</small></label>`;}).join('');
 function readDraft(){const patch={};for(const[key]of controls)patch[key]=Number($('fin-'+key).value);patch.cleanIndustry=$('fin-clean-industry').checked;return patch;}
 function fillDraft(){for(const[key]of controls)$('fin-'+key).value=draft[key];$('fin-clean-industry').checked=draft.cleanIndustry;renderFinance();}
 function openFinance(){draft={...C.policies(api.getState().policies)};fillDraft();$('finance').showModal();api.syncClock();}
 function renderFinance(){
  if(!draft)return;const state=api.getState(),before=api.getAnalysis(),after=C.analyse({...state,policies:{...state.policies,...draft,freeTransit:draft.transitFare===0}});
  for(const[key,,,unit]of controls)$('fin-out-'+key).textContent=num(draft[key])+unit;
  shell.querySelectorAll('[data-gc-preset]').forEach(b=>b.setAttribute('aria-pressed',String(Object.entries(presets[b.dataset.gcPreset]).every(([k,v])=>draft[k]===v))));
  const delta=after.net-before.net;$('fin-net').innerHTML='<strong class="'+(after.net<0?'gc-negative':'')+'">'+signed(after.net)+'<small> EP / month</small></strong><span>'+(delta?signed(delta)+' EP compared with your current budget':'At your current population')+'</span>';
  $('fin-impact').innerHTML=[['Wellbeing',after.wellbeing,before.wellbeing,'/100'],['Jobs',after.jobs,before.jobs,''],['Mobility',after.scores[3],before.scores[3],'/100']].map(([name,value,old,suffix])=>'<div><span>'+name+'</span><strong>'+fmt(value)+'<small>'+suffix+'</small></strong><small class="'+(value-old<0?'gc-negative':'')+'">'+(value===old?'No change':signed(value-old))+'</small></div>').join('');
  const b=after.budget;
  $('fin-ledger').innerHTML='<h4>Monthly forecast</h4>'+[['Regional grant',b.grant],['Residential taxes',b.residentialRevenue],['Business taxes',b.businessRevenue],['Transit fares',b.fareRevenue],['Utility margin',b.utilities],['Asset & service upkeep',-b.assetUpkeep],['Imported power',-b.gridCost],['Fare-free transport support',-b.transitSupport],['Cleaner industry standards',-b.industryStandards],['Utility subsidy',-b.utilitySubsidy],['Loan payment',-b.loanPayment]].filter(([name,value])=>value||['Regional grant','Residential taxes','Business taxes'].includes(name)).map(([name,value])=>'<div class="gc-ledger-row"><span>'+name+'</span><strong>'+signed(value)+' EP</strong></div>').join('')+'<p class="gc-forecast-note">Forecast at the current city size. Growth and council responses can change next month’s figures.</p>';
  const loan=state.loan;$('fin-loan').innerHTML=loan?'<div><span>DEVELOPMENT LOAN</span><strong>'+fmt(loan.balance)+' EP remaining</strong><p>Up to 90 EP is repaid each month. Unpaid amounts stay due.</p></div><button type="button" id="gc-loan-repay" '+(state.cash<loan.balance?'disabled':'')+'>Repay '+fmt(loan.balance)+' EP</button>':'<div><span>GROWTH FINANCING</span><strong>Development loan</strong><p>Receive 1,000 EP. Make 12 payments of 90 EP: 1,080 EP total, including an 80 EP borrowing cost.</p></div><button type="button" id="gc-loan-borrow">Review loan</button>';
  $('loan-borrow')?.addEventListener('click',()=>api.confirmAction('Fund the next step?','Receive 1,000 EP now. The city owes 1,080 EP in total, repaid at up to 90 EP per month. Only one loan can be active.',()=>api.commit(C.borrow(api.getState()))));
  $('loan-repay')?.addEventListener('click',()=>api.confirmAction('Repay the development loan?','Spend '+fmt(api.getState().loan.balance)+' EP to clear the remaining loan. Monthly repayments will stop.',()=>api.commit(C.repayLoan(api.getState()))));
  const current=C.policies(state.policies),dirty=Object.keys(draft).some(key=>draft[key]!==current[key]);$('finance-dirty').textContent=dirty?'Preview only · changes have not been applied.':'Your current city budget.';$('finance-apply').disabled=!dirty;
 }
 $('finance-sliders').addEventListener('input',()=>{draft=readDraft();renderFinance();});$('fin-clean-industry').addEventListener('change',()=>{draft=readDraft();renderFinance();});
 $('finance-reset').addEventListener('click',()=>{draft={...C.policies(api.getState().policies)};fillDraft();});
 $('finance-apply').addEventListener('click',()=>{const patch=readDraft();if(api.commit(C.setPolicies(api.getState(),patch)))$('finance').close();});
 const presets={balanced:{residentialTax:10,businessTax:10,transitFare:2,utilityTariff:1,serviceBudget:100},affordable:{residentialTax:8,businessTax:9,transitFare:0,utilityTariff:.5,serviceBudget:110},reserves:{residentialTax:14,businessTax:13,transitFare:3,utilityTariff:1.5,serviceBudget:95}};
 shell.querySelectorAll('[data-gc-preset]').forEach(b=>b.addEventListener('click',()=>{draft={...draft,...presets[b.dataset.gcPreset]};fillDraft();}));
 function renderDecision(){
  const state=api.getState(),event=state.event,def=event&&C.events[event.type];if(!def||event.choice)return;
  const current=api.getAnalysis();$('decision-art').innerHTML=glyph(def.icon);$('decision-title').textContent=def.name;$('decision-description').textContent=def.description;
  $('decision-context').innerHTML='<div><span>Available treasury</span><strong>'+fmt(state.cash)+' EP</strong></div><div><span>Current wellbeing</span><strong>'+current.wellbeing+'/100</strong></div><div><span>Climate resilience</span><strong>'+current.scores[4]+'/100</strong></div>';
  $('decision-options').innerHTML=def.options.map((option,index)=>{const result=C.respond(state,option.id),future=result.error?null:C.analyse(result.state);return '<button type="button" data-gc-decision="'+option.id+'" '+(result.error?'disabled':'')+'><span class="gc-choice-number">0'+(index+1)+'</span><span class="gc-choice-copy"><strong>'+escape(option.name)+'</strong><span>'+escape(option.detail)+'</span><small>'+(future?'Wellbeing '+signed(future.wellbeing-current.wellbeing)+' · Monthly balance '+signed(future.net-current.net)+' EP':'Not enough Eco Points')+'</small></span><b>'+(option.cost?fmt(option.cost)+'<small>EP once</small>':'No cost')+'</b></button>';}).join('');
 }
 function openDecision(){const event=api.getState().event;if(!event||event.choice){api.announce('Your council inbox is clear. New decisions arrive as the city develops.');return;}renderDecision();if(!$('decision').open)$('decision').showModal();api.syncClock();}
 $('decision-options').addEventListener('click',e=>{const b=e.target.closest('[data-gc-decision]');if(b&&api.commit(C.respond(api.getState(),b.dataset.gcDecision)))$('decision').close();});
 $('decision-later').addEventListener('click',()=>$('decision').close());
 function renderInbox(){
  const event=api.getState().event,pending=event&&!event.choice;$('inbox-count').hidden=!pending;banner.hidden=!pending;$('inbox-button').setAttribute('aria-label',pending?'Council inbox: 1 decision waiting':'Council inbox: no decisions waiting');
  if(pending)$('alert-name').textContent=C.events[event.type].name;
  if($('decision').open){if(!pending)$('decision').close();else renderDecision();}
 }
 function renderPanels(){shell.querySelectorAll('.gc-panel-toggles [data-gc-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gcPanel===shell.dataset.panel)));}
 function applyFocus(value){desiredFullscreen=value;shell.classList.toggle('gc-expanded',value);document.body.classList.toggle('gc-game-expanded',value);$('expand').setAttribute('aria-pressed',String(value));$('expand').setAttribute('aria-label',value?'Exit fullscreen':'Enter fullscreen');$('expand').title=value?'Exit fullscreen (Esc)':'Enter fullscreen (F)';$('expand').innerHTML=glyph(value?'close':'expand');if(value)shell.dataset.panel='none';renderPanels();api.resize();}
 async function setExpanded(value){
  const token=++fullscreenGeneration;applyFocus(value);
  if(!value){if(document.fullscreenElement===shell)try{await document.exitFullscreen();}catch{}return;}
  if(document.fullscreenEnabled&&shell.requestFullscreen){try{await shell.requestFullscreen();if(token!==fullscreenGeneration||!desiredFullscreen){if(document.fullscreenElement===shell)await document.exitFullscreen();}}catch{api.announce('Focus view is open. This browser kept its window controls visible.');}}
 }
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===shell){nativeEntered=true;if(!desiredFullscreen)document.exitFullscreen().catch(()=>{});else{shell.classList.add('gc-native-fullscreen');api.resize();}}else if(nativeEntered){nativeEntered=false;shell.classList.remove('gc-native-fullscreen');applyFocus(false);}});
 const commandDefs=()=>{
  const tools=[['inspect','Inspect a tile','I'],['build','Build an improvement','B'],['road','Draw a road route','R'],['upgrade','Upgrade a building','U'],['move','Relocate a building','M'],['demolish','Remove an improvement','X']].map(([key,name,shortcut])=>({id:'tool-'+key,name,group:'Tools',icon:key,shortcut,run:()=>{api.setMode(key);if(key==='build')api.openPanel('build');if(key==='inspect')api.openPanel('city');}}));
  const actions=[
   ['budget','Taxes, prices & city budget','Economy','finance',openFinance],['council','Council decisions & alerts','Council','bell',openDecision],
   ['fullscreen',shell.classList.contains('gc-expanded')?'Exit fullscreen':'Enter fullscreen','View','expand',()=>setExpanded(!shell.classList.contains('gc-expanded'))],
   ['dashboard','Show city dashboard','Panels','city',()=>api.openPanel('city')],['goals','Mission goals & grants','Panels','flag',()=>api.openPanel('goals')],['help','Open the field guide','Panels','help',()=>api.openPanel('help')],
   ['report','Open the mayor’s report','City','file',api.evaluate],['next','Advance to next month','Time','next',api.step],['play','Play / pause simulation','Time','play',()=> $('play').click()],
   ['undo','Undo last city action','History','undo',api.undo],['redo','Redo city action','History','redo',api.redo],
   ['save','Export city save','Files','save',()=> $('export').click()],['import','Open a saved city','Files','file',()=> $('import').click()],['photo','Save a city photo','Files','photo',()=> $('photo').click()],
   ['night','Toggle day / night','Camera','moon',()=>q('[data-gc-camera="night"]').click()],['fit','Fit the whole island','Camera','home',()=>q('[data-gc-camera="reset"]').click()],['grid','Toggle the planning grid','Camera','grid',()=>q('[data-gc-camera="grid"]').click()],
   ['zoom-in','Zoom in','Camera','zoomIn',()=>q('[data-gc-camera="zoom-in"]').click()],['zoom-out','Zoom out','Camera','zoomOut',()=>q('[data-gc-camera="zoom-out"]').click()]
  ].map(([id,name,group,icon,run])=>({id,name,group,icon,run}));
  const buildings=Object.entries(C.upgrades).map(([id,item])=>({id:'build-'+id,name:item.name,group:item.category,icon:'build',shortcut:item.cost+' EP',run:()=>api.choose(id)}));
  return [...actions,...tools,...buildings];
 };
 let visibleCommands=[];
 function renderCommands(){const query=$('command-query').value.toLowerCase().trim();visibleCommands=commandDefs().filter(c=>(c.name+' '+c.group).toLowerCase().includes(query)).slice(0,query?50:12);$('command-list').innerHTML=visibleCommands.length?visibleCommands.map((c,i)=>'<button type="button" data-gc-command="'+i+'"><span class="gc-command-icon">'+glyph(c.icon)+'</span><span><strong>'+escape(c.name)+'</strong><small>'+escape(c.group)+'</small></span><kbd>'+escape(c.shortcut||'↵')+'</kbd></button>').join(''):'<p>No matching command. Try “tax”, “park” or “night”.</p>';}
 function openCommands(){if(api.hasOverlay())return;$('command-query').value='';renderCommands();$('commands').showModal();api.syncClock();}
 $('command-query').addEventListener('input',renderCommands);
 function runCommand(index){const command=visibleCommands[index];if(!command)return;$('commands').close();command.run();}
 $('command-list').addEventListener('click',e=>{const b=e.target.closest('[data-gc-command]');if(b)runCommand(Number(b.dataset.gcCommand));});
 $('command-query').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('commands').close();return;}if(e.key==='ArrowDown'){e.preventDefault();$('command-list').querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();runCommand(0);}});
 $('command-list').addEventListener('keydown',e=>{const b=e.target.closest('[data-gc-command]');if(!b)return;const i=Number(b.dataset.gcCommand);if(e.key==='ArrowDown'){e.preventDefault();$('command-list').querySelector('[data-gc-command="'+Math.min(visibleCommands.length-1,i+1)+'"]')?.focus();}if(e.key==='ArrowUp'){e.preventDefault();if(i===0)$('command-query').focus();else $('command-list').querySelector('[data-gc-command="'+(i-1)+'"]')?.focus();}});
 shell.querySelectorAll('[data-gc-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.gcClose).close()));
 for(const name of ['finance','decision','commands'])$(name).addEventListener('close',()=>{if(name==='finance')draft=null;api.syncClock();});
 document.addEventListener('keydown',e=>{if(document.body.dataset.view!=='game')return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommands();}if(!api.hasOverlay()&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.key.toLowerCase()==='f'){e.preventDefault();setExpanded(!shell.classList.contains('gc-expanded'));}});
 applyFocus(false);
 return {
  render(){renderInbox();renderPanels();if($('finance').open)renderFinance();$('play').innerHTML=glyph($('play').getAttribute('aria-pressed')==='true'?'pause':'play');$('next').innerHTML='<span>Next month</span>'+glyph('next');},
  openDecision,openFinance,openCommands,setExpanded,
  toast(){clearTimeout(toastTimer);shell.classList.add('gc-show-toast');toastTimer=setTimeout(()=>shell.classList.remove('gc-show-toast'),6500);},
  closeOverlays(){for(const name of ['finance','decision','commands'])if($(name).open)$(name).close();}
 };
}
