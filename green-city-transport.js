/* A local transport office: route planning, operating costs and commute pressure. */
const C=globalThis.GreenCity;
export function createTransport(api,glyph){
 const $=id=>document.getElementById('gc-'+id),shell=$('shell');
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=n=>Math.round(n).toLocaleString('en-GB'),signed=n=>(n>0?'+':'')+number(n);
 let draft=null,editingId=null,lastState=null;
 const dialog=document.createElement('dialog');dialog.id='gc-transport';dialog.className='gc-dialog gc-transport-dialog';dialog.setAttribute('aria-labelledby','gc-transport-title');
 dialog.innerHTML=`<div class="gc-modal-heading"><div><span class="gc-overline">NEW TERRA / TRANSPORT OFFICE</span><h3 id="gc-transport-title">A city that connects.</h3><p>Plan your lines. Follow the demand. Give residents a better journey.</p></div><button type="button" id="gc-transport-close" class="gc-icon-button" aria-label="Close transport office">${glyph('close')}</button></div>
 <div id="gc-transport-summary" class="gc-transport-summary"></div>
 <div class="gc-transport-layout"><section class="gc-network-side"><div class="gc-network-heading"><div><span class="gc-overline">YOUR ISLAND / LIVE NETWORK</span><h4>Every connection counts.</h4></div><span id="gc-network-mode">TRAFFIC PRESSURE</span></div><div id="gc-network-map" class="gc-network-map"></div><div class="gc-network-legend"><span><i></i> Flowing</span><span><i></i> Busy</span><span><i></i> Congested</span><span>B · Bus &nbsp; T · Tram</span></div><p class="gc-network-instructions">Choose a line to edit it. When planning, tap its stops on the map or use the stop selectors.</p><div class="gc-network-priorities"><div><h4>Roads under pressure</h4><div id="gc-traffic-hotspots"></div></div><div><h4>Neighbourhood gaps</h4><div id="gc-transit-gaps"></div></div></div></section>
 <section class="gc-lines-side"><div class="gc-lines-heading"><div><span class="gc-overline">CITY SERVICES</span><h4>Your transport lines</h4></div><button type="button" id="gc-new-line" class="gc-plain-button">+ New line</button></div><div id="gc-lines-list"></div><div id="gc-line-editor"></div></section></div>
 <footer class="gc-transport-footer">The city is paused while you plan. Indicators, demand units and journey loads are simplified game mechanics. Existing stops keep their local service; named lines add a connected service with a monthly operating cost.</footer>`;
 shell.append(dialog);
 const button=document.createElement('button');button.id='gc-transport-button';button.type='button';button.className='gc-icon-button';button.setAttribute('aria-label','Open transport routes and traffic');button.title='Transport routes & traffic';button.innerHTML=glyph('route');shell.querySelector('.gc-window-controls').insertBefore(button,$('command-button'));button.addEventListener('click',open);
 const card=document.createElement('button');card.type='button';card.id='gc-transport-card';card.className='gc-transport-card';$('inspector').before(card);card.addEventListener('click',open);
 $('transport-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{draft=null;editingId=null;api.syncClock();});
 function open(){if(api.hasOverlay())return;draft=null;editingId=null;render(true);dialog.showModal();dialog.scrollTop=0;api.syncClock();}
 function stops(){const state=api.getState();return state.cells.map((c,i)=>c?.type===draft?.type&&c.anchor===undefined?i:-1).filter(i=>i>=0);}
 function newLine(){editingId=null;const routes=api.getState().routes||[];draft={name:'Bus line '+(routes.length+1),type:'bus',colour:C.routeColours[routes.length%4],enabled:true,stops:[null,null]};renderEditor();renderPreview();}
 function editLine(id){const route=(api.getState().routes||[]).find(r=>r.id===id);if(!route)return;editingId=id;draft={...route,stops:[...route.stops]};renderEditor();renderPreview();}
 function renderEditor(){
  if(!draft){$('line-editor').innerHTML='<div class="gc-line-empty"><span>'+glyph('route')+'</span><h4>Start with two stops.</h4><p>Build two electric bus stops or tram stations on connected roads, then create a line between them.</p><button type="button" id="gc-plan-bus">Plan a bus stop ↗</button></div>';$('plan-bus').addEventListener('click',()=>{dialog.close();api.choose('bus');});return;}
  const available=stops(),state=api.getState(),roads=api.getAnalysis().roads;
  $('line-editor').innerHTML=`<form id="gc-route-form" class="gc-route-form"><div class="gc-route-editor-title"><span class="gc-overline">${editingId===null?'NEW LINE / DRAFT':'EDIT LINE / '+editingId}</span><button type="button" id="gc-cancel-line" class="gc-icon-button" aria-label="Cancel line editing">${glyph('close')}</button></div><label class="gc-route-field">Line name<input id="gc-line-name" value="${escape(draft.name)}" maxlength="32" autocomplete="off" required></label><div class="gc-route-form-row"><label class="gc-route-field">Service<select id="gc-line-type"><option value="bus" ${draft.type==='bus'?'selected':''}>Electric bus</option><option value="tram" ${draft.type==='tram'?'selected':''}>Electric tram</option></select></label><label class="gc-route-field">Line colour<select id="gc-line-colour">${C.routeColours.map((colour,n)=>`<option value="${colour}" ${draft.colour===colour?'selected':''}>${['Terracotta','Coastal green','Blue','Heather'][n]}</option>`).join('')}</select></label></div><div class="gc-route-stop-heading"><strong>Stops in order</strong><span>Shuttle · returns along the same route</span></div><div class="gc-route-stops">${draft.stops.map((stop,n)=>`<div><b style="--route-colour:${draft.colour}">${n+1}</b><label class="gc-route-field"><span class="gc-visually-hidden">Stop ${n+1}</span><select data-gc-line-stop="${n}" aria-label="Line stop ${n+1}"><option value="">Choose a ${draft.type} stop</option>${available.map(i=>`<option value="${i}" ${stop===i?'selected':''}>${C.label(i)} · ${roads.has(i)?'Connected':'Disconnected'}</option>`).join('')}${stop!==null&&!available.includes(stop)?`<option value="${stop}" selected>${C.label(stop)} · Stop removed</option>`:''}</select></label><button type="button" data-gc-remove-stop="${n}" aria-label="Remove stop ${n+1}" ${draft.stops.length<=2?'disabled':''}>×</button></div>`).join('')}</div><button type="button" id="gc-add-line-stop" class="gc-add-line-stop" ${draft.stops.length>=6?'disabled':''}>+ Add another stop</button><p class="gc-route-build-note">${available.length} ${draft.type} stops on the map. Stops and roads are built from the city toolkit.</p><div id="gc-line-forecast" class="gc-line-forecast"></div><p id="gc-line-error" class="gc-line-error" role="status" aria-live="polite"></p><div class="gc-route-actions"><button type="button" id="gc-discard-line" class="gc-plain-button">Cancel</button><button type="submit" id="gc-save-line" class="gc-action-button">${editingId===null?'Create line':'Save line'}</button></div></form>`;
  $('line-name').addEventListener('input',()=>{draft.name=$('line-name').value;renderPreview();});
  $('line-type').addEventListener('change',()=>{draft.type=$('line-type').value;draft.stops=[null,null];renderEditor();renderPreview();});
  $('line-colour').addEventListener('change',()=>{draft.colour=$('line-colour').value;renderEditor();renderPreview();});
  $('add-line-stop').addEventListener('click',()=>{draft.stops.push(null);renderEditor();renderPreview();});
  for(const id of ['cancel-line','discard-line'])$(id).addEventListener('click',()=>{draft=null;editingId=null;renderEditor();renderPreview();});
  $('route-form').addEventListener('change',event=>{if(event.target.dataset.gcLineStop!==undefined){draft.stops[Number(event.target.dataset.gcLineStop)]=event.target.value===''?null:Number(event.target.value);renderPreview();}});
  $('route-form').addEventListener('click',event=>{const remove=event.target.closest('[data-gc-remove-stop]');if(remove){draft.stops.splice(Number(remove.dataset.gcRemoveStop),1);renderEditor();renderPreview();}});
  $('route-form').addEventListener('submit',event=>{event.preventDefault();const result=C.setRoute(api.getState(),draft,editingId);if(result.error){$('line-error').textContent=result.error;return;}if(api.commit(result)){draft=null;editingId=null;render(true);}});
 }
 function preview(){
  const state=api.getState(),current=api.getAnalysis();if(!draft)return {state,analysis:current};
  const result=C.setRoute(state,draft,editingId);if(result.error)return {state,analysis:current,error:result.error};
  const id=editingId??result.state.routes.find(r=>!(state.routes||[]).some(old=>old.id===r.id)).id;
  const analysis=C.analyse(result.state);return {state:result.state,analysis,line:analysis.transport.routes.find(r=>r.id===id)};
 }
 function renderPreview(){
  const result=preview();renderMap(result);if(!draft)return;
  $('save-line').disabled=!!result.error;$('line-error').textContent=result.error||'No setup charge. Monthly operation starts after you save.';
  $('line-forecast').innerHTML=result.line?`<span class="gc-overline">DRAFT / MONTHLY FORECAST</span><div><strong>${result.line.riders}<small>riders</small></strong><strong>${result.line.upkeep}<small>EP upkeep</small></strong><strong>${result.line.length}<small>road links</small></strong></div><p>${result.line.passengerDemand} passenger demand / ${result.line.capacity} capacity. Fares use your city budget setting.</p><p>City balance: <b>${signed(result.analysis.net)} EP / month</b> (${signed(result.analysis.net-api.getAnalysis().net)} EP change).</p>`:'<span class="gc-overline">PLAN YOUR CONNECTION</span><p>Choose at least two different stops to preview the route and monthly budget.</p>';
 }
 function renderMap(result){
  const state=api.getState(),a=api.getAnalysis(),dots=[],tiles=[];
  state.cells.forEach((cell,i)=>{
   if(C.terrain[i]==='water')return;const road=C.roadTypes.has(cell?.type),pressure=road?Math.max(0,a.transport.roadLoads[i]/(cell.type==='bike'?22:18)-1)*70:0;
   tiles.push(`<rect x="${i%C.size+.07}" y="${Math.floor(i/C.size)+.07}" width=".86" height=".86" fill="${road?pressure>65?'#ce8a6f':pressure>25?'#c4ad71':'#7d9f87':C.greenTypes.has(cell?.type)?'#53745e':cell?'#b6c0a0':'#354d43'}" opacity="${road||cell?1:.65}"/>`);
   if(['bus','tram'].includes(cell?.type))dots.push(`<g data-gc-map-stop="${i}" tabindex="0" role="button" aria-label="${draft?'Add':'Inspect'} ${cell.type} stop ${C.label(i)}"><circle cx="${i%C.size+.5}" cy="${Math.floor(i/C.size)+.5}" r=".55" fill="${draft?.stops.includes(i)?draft.colour:'#e5e9cd'}" stroke="#1e3a30" stroke-width=".12"/><text x="${i%C.size+.5}" y="${Math.floor(i/C.size)+.7}" text-anchor="middle" fill="#183c30" font-size=".6" font-family="sans-serif" font-weight="700">${cell.type==='bus'?'B':'T'}</text></g>`);
  });
  const lines=result.analysis.transport.routes.filter(r=>r.active||r.id===editingId).map(r=>`<polyline points="${r.path.map(i=>(i%C.size+.5)+','+(Math.floor(i/C.size)+.5)).join(' ')}" fill="none" stroke="${r.colour}" stroke-width=".25" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`).join('');
  $('network-map').innerHTML=`<svg viewBox="-.6 -.6 ${C.size+1.2} ${C.size+1.2}" role="group" aria-label="Island roads, traffic pressure and bus and tram stops">${tiles.join('')}${lines}${dots.join('')}</svg>`;
  $('network-mode').textContent=draft?'PLANNING '+draft.type.toUpperCase()+' LINE':'TRAFFIC PRESSURE';
 }
 function render(force=false){
  const state=api.getState(),a=api.getAnalysis(),t=a.transport,active=t.routes.filter(r=>r.active).length;
  card.innerHTML=`<span>GETTING AROUND</span><strong>${t.congestion}% <small>congestion</small></strong><span>${active} operating ${active===1?'line':'lines'} · ${number(a.ridership)} transit riders / month</span><b>Manage routes & traffic ↗</b>`;
  if(!dialog.open&&!force)return;if(lastState===state&&!force)return;lastState=state;
  $('transport-summary').innerHTML=[['Road congestion',t.congestion+'%',t.congestion>65?'Streets under pressure':t.congestion>35?'Some busy connections':'Traffic is flowing'],['Public transport',number(a.ridership),'Riders / month · '+t.routeRiders+' on named lines'],['Operating lines',active+' / '+t.routes.length,number(t.upkeep)+' EP / month in line operations']].map(([label,value,detail])=>`<div><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`).join('');
  $('lines-list').innerHTML=t.routes.length?t.routes.map(r=>`<article class="gc-line-card"><i style="background:${r.colour}"></i><button type="button" data-gc-edit-line="${r.id}"><strong>${escape(r.name)}</strong><span>${r.type==='bus'?'E-bus':'Tram'} · ${r.stops.length} stops · ${r.status}</span><small>${r.active?r.riders+' riders · '+r.upkeep+' EP / month':escape(r.issue||'No operating cost while paused.')}</small></button><div><button type="button" data-gc-toggle-line="${r.id}" aria-label="${r.enabled?'Pause':'Resume'} ${escape(r.name)}">${glyph(r.enabled?'pause':'play')}</button><button type="button" data-gc-delete-line="${r.id}" aria-label="Delete ${escape(r.name)}">${glyph('demolish')}</button></div></article>`).join(''):'<p class="gc-lines-empty">No named lines yet. Connect existing stops to start a service.</p>';
  $('new-line').disabled=t.routes.length>=12;
  $('traffic-hotspots').innerHTML=t.bottlenecks.length?t.bottlenecks.map(h=>`<button type="button" data-gc-network-focus="${h.i}"><strong>${C.label(h.i)}</strong><span>${h.load} / ${h.capacity} commute load</span><b>↗</b></button>`).join(''):'<p>No road is over its modelled capacity.</p>';
  $('transit-gaps').innerHTML=t.gaps.length?t.gaps.map(h=>`<button type="button" data-gc-network-focus="${h.i}"><strong>${C.label(h.i)}</strong><span>~${h.people} residents · ${h.coverage}/100 access</span><b>↗</b></button>`).join(''):'<p>Connected neighbourhoods have local coverage or a named line.</p>';
  renderEditor();renderPreview();
 }
 $('new-line').addEventListener('click',newLine);
 $('lines-list').addEventListener('click',event=>{
  const edit=event.target.closest('[data-gc-edit-line]'),toggle=event.target.closest('[data-gc-toggle-line]'),remove=event.target.closest('[data-gc-delete-line]');
  if(edit)editLine(Number(edit.dataset.gcEditLine));
  if(toggle){const id=Number(toggle.dataset.gcToggleLine),line=api.getState().routes.find(r=>r.id===id);api.commit(C.setRouteEnabled(api.getState(),id,!line.enabled));}
  if(remove){api.commit(C.removeRoute(api.getState(),Number(remove.dataset.gcDeleteLine)));draft=null;editingId=null;render(true);}
 });
 dialog.addEventListener('click',event=>{const focus=event.target.closest('[data-gc-network-focus]');if(focus){dialog.close();api.focusTile(Number(focus.dataset.gcNetworkFocus));}});
 function mapStop(event){const button=event.target.closest('[data-gc-map-stop]');if(!button)return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;event.preventDefault();const i=Number(button.dataset.gcMapStop);if(!draft){dialog.close();api.focusTile(i);return;}if(api.getState().cells[i]?.type!==draft.type){api.announce('Choose a '+draft.type+' stop for this line.');return;}if(draft.stops.includes(i))return;const empty=draft.stops.indexOf(null);if(empty>=0)draft.stops[empty]=i;else if(draft.stops.length<6)draft.stops.push(i);renderEditor();renderPreview();}
 $('network-map').addEventListener('click',mapStop);$('network-map').addEventListener('keydown',mapStop);
 return {open,render,close:()=>{if(dialog.open)dialog.close();}};
}
