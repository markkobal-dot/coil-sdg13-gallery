"use strict";

// Let the browser restore scrolling on reload; keep the visible UI consistent.
const isPageReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
const reloadContext = isPageReload && history.state?.coilContext?.hash === location.hash
  ? history.state.coilContext : null;


// Collection: one shared data file supplies the gallery and homepage previews.
const galleryGrid = document.getElementById('photo-grid');
const galleryCards = [];
let activeCategory = ['all', 'challenge', 'solutions'].includes(reloadContext?.category)
  ? reloadContext.category : 'all';
let visiblePhotoIndices = galleryPhotos.map((_, index) => index);
const mediaType = (photo) => photo.src.endsWith('.svg') ? 'study' : 'photograph';

function photoEvidenceLink(evidence) {
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = '#' + evidence.id;
  link.textContent = evidence.label + ' ↗';
  return link;
}

galleryPhotos.forEach((photo, index) => {
  const card = document.createElement('article');
  card.className = 'photo-card';
  if (photo.featured) card.classList.add('photo-feature');
  card.dataset.category = photo.category;
  card.dataset.media = mediaType(photo);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'photo-open';
  button.setAttribute('aria-label', 'Open ' + photo.title);

  const image = document.createElement('img');
  image.src = photo.previewSrc || photo.src;
  if (photo.srcSet) { image.srcset = photo.srcSet; image.sizes = '(max-width: 700px) calc(100vw - 48px), (max-width: 1600px) calc(45vw - 20px), 45vw'; }
  image.alt = photo.alt || photo.description;
  image.width = photo.width || 720;
  image.height = photo.height || 540;
  image.loading = 'lazy';
  image.decoding = 'async';
  if (photo.objectPosition) image.style.objectPosition = photo.objectPosition;

  const openMark = document.createElement('span');
  openMark.className = 'image-open';
  openMark.textContent = '↗';
  openMark.setAttribute('aria-hidden', 'true');
  button.append(image, openMark);
  button.addEventListener('click', () => openPhoto(index));

  const information = document.createElement('div');
  information.className = 'info';
  const title = document.createElement('h3');
  title.textContent = photo.title;
  information.append(title);
  if (photo.caption) {
    const context = document.createElement('p');
    context.className = 'photo-context';
    context.textContent = photo.caption;
    information.append(context);
  }
  if (photo.featured) {
    const note = document.createElement('p');
    note.className = 'photo-note';
    note.textContent = photo.description;
    information.append(note);
  }
  if (photo.evidence) information.append(photoEvidenceLink(photo.evidence));
  card.append(button, information);
  galleryGrid.append(card);
  galleryCards.push(card);
});

function filterCollection(animate = false) {
  visiblePhotoIndices = [];
  galleryCards.forEach((card, index) => {
    const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
    card.hidden = !matchesCategory;
    if (!card.hidden) visiblePhotoIndices.push(index);
  });
  const count = visiblePhotoIndices.length;
  document.getElementById('gallery-empty').hidden = count > 0;
  document.getElementById('gallery-count').textContent =
    count + (count === 1 ? ' photograph' : ' photographs');
  if (animate && galleryGrid.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    galleryGrid.getAnimations().forEach(animation => animation.cancel());
    galleryGrid.animate([{ opacity: .65, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], {
      duration: 150, easing: 'ease-out'
    });
  }
}
for (const button of document.querySelectorAll('.filter')) {
  const selected = button.dataset.filter === activeCategory;
  button.classList.toggle('active', selected);
  button.setAttribute('aria-pressed', String(selected));
  button.addEventListener('click', () => {
    if (activeCategory === button.dataset.filter) return;
    activeCategory = button.dataset.filter;
    for (const filter of document.querySelectorAll('.filter')) {
      const selected = filter === button;
      filter.classList.toggle('active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    }
    filterCollection(true);
  });
}
filterCollection();

// The same accessible viewer opens photographs, field images and the chart.
const lightbox = document.getElementById('lightbox');
const viewerImage = document.getElementById('lightbox-image');
const viewerTitle = document.getElementById('lightbox-title');
const viewerDescription = document.getElementById('lightbox-description');
const viewerCaption = document.getElementById('lightbox-caption');
const viewerEvidence = document.getElementById('lightbox-evidence');
const viewerCounter = document.getElementById('lightbox-counter');
const viewerType = document.getElementById('lightbox-type');
const viewerClose = document.getElementById('lightbox-close');
const viewerPrevious = document.getElementById('lightbox-previous');
const viewerNext = document.getElementById('lightbox-next');
let viewerIndex = null;
let viewerSequence = [];
let viewerPreviousFocus = null;
let viewerCloseTimer = null;
const viewerStatus = document.getElementById('lightbox-status');
let viewerBackground = [];
function restoreViewerBackground() {
  viewerBackground.forEach(([element, inert]) => { element.inert = inert; });
  viewerBackground = [];
}
viewerImage.addEventListener('load', () => {
  viewerImage.width = viewerImage.naturalWidth;
  viewerImage.height = viewerImage.naturalHeight;
  viewerImage.parentElement.removeAttribute('aria-busy');
  viewerStatus.textContent = '';
  viewerStatus.className = 'sr-only';
});
viewerImage.addEventListener('error', () => {
  if (lightbox.hidden || !viewerImage.getAttribute('src')) return;
  viewerImage.parentElement.removeAttribute('aria-busy');
  viewerStatus.className = 'viewer-image-status';
  viewerStatus.textContent = 'This image could not load. Close the viewer and try opening it again.';
});

function showViewerItem(photo) {
  viewerImage.parentElement.setAttribute('aria-busy', 'true');
  viewerStatus.className = 'sr-only';
  viewerStatus.textContent = 'Loading image…';
  viewerImage.width = photo.width || 720;
  viewerImage.height = photo.height || 540;
  viewerImage.src = photo.fullSrc || photo.src;
  viewerImage.alt = photo.alt || photo.description || photo.title || 'Selected photograph';
  viewerTitle.textContent = photo.title || 'A closer look';
  viewerDescription.textContent = photo.description || '';
  viewerCaption.textContent = photo.caption || '';
  if (photo.sourceUrl) {
    const source = document.createElement('a');
    source.href = photo.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'Photo source ↗';
    viewerCaption.append(document.createTextNode(' · '), source);
  }
  viewerCaption.hidden = !viewerCaption.textContent;
  viewerEvidence.replaceChildren(...(photo.evidence ? [photoEvidenceLink(photo.evidence)] : []));
  viewerEvidence.hidden = !photo.evidence;
  viewerType.textContent = viewerIndex === null ? 'THE EVIDENCE' :
    mediaType(photo) === 'study' ? 'VISUAL STUDY' : 'FROM OUR COLLECTION';
  const hasNeighbours = viewerIndex !== null && viewerSequence.length > 1;
  viewerPrevious.hidden = !hasNeighbours;
  viewerNext.hidden = !hasNeighbours;
  viewerCounter.textContent = viewerIndex === null ? 'A CLOSER LOOK' :
    String(viewerSequence.indexOf(viewerIndex) + 1).padStart(2, '0') +
    ' / ' + String(viewerSequence.length).padStart(2, '0');
}

function openPhoto(photoOrIndex) {
  window.clearTimeout(viewerCloseTimer);
  viewerPreviousFocus = document.activeElement;
  if (typeof photoOrIndex === 'number') {
    viewerIndex = photoOrIndex;
    viewerSequence = document.body.dataset.view === 'gallery' && visiblePhotoIndices.includes(viewerIndex)
      ? [...visiblePhotoIndices]
      : galleryPhotos.map((_, index) => index);
    showViewerItem(galleryPhotos[viewerIndex]);
  } else {
    viewerIndex = null;
    viewerSequence = [];
    showViewerItem(photoOrIndex);
  }
  if (!viewerBackground.length) {
    viewerBackground = [...document.querySelectorAll('body > header, body > main, body > footer, body > .view-bar, body > .skip')].map(element => [element, element.inert]);
    viewerBackground.forEach(([element]) => { element.inert = true; });
  }
  lightbox.hidden = false;
  document.body.classList.add('viewer-open');
  requestAnimationFrame(() => {
    lightbox.classList.add('is-open');
    viewerClose.focus({ preventScroll: true });
  });
}

function closePhoto(restoreFocus = true) {
  if (lightbox.hidden) return;
  lightbox.classList.remove('is-open');
  document.body.classList.remove('viewer-open');
  restoreViewerBackground();
  if (restoreFocus && viewerPreviousFocus?.isConnected) {
    viewerPreviousFocus.focus({ preventScroll: true });
  }
  viewerCloseTimer = window.setTimeout(() => {
    lightbox.hidden = true;
    viewerImage.removeAttribute('src');
  }, 220);
}

function moveViewer(direction) {
  if (viewerIndex === null || viewerSequence.length < 2) return;
  const nextPosition = (viewerSequence.indexOf(viewerIndex) + direction + viewerSequence.length) % viewerSequence.length;
  viewerIndex = viewerSequence[nextPosition];
  showViewerItem(galleryPhotos[viewerIndex]);
}
viewerClose.addEventListener('click', () => closePhoto());
viewerPrevious.addEventListener('click', () => moveViewer(-1));
viewerNext.addEventListener('click', () => moveViewer(1));
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closePhoto();
});
document.addEventListener('keydown', (event) => {
  if (lightbox.hidden || !lightbox.classList.contains('is-open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closePhoto(); }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveViewer(-1);
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveViewer(1);
  }
  if (event.key === 'Tab') {
    const controls = [...lightbox.querySelectorAll('button:not(:disabled), a[href]')].filter(element => !element.closest('[hidden]') && element.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
let touchOrigin = null;
viewerImage.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchOrigin = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
viewerImage.addEventListener('touchend', (event) => {
  if (!touchOrigin) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchOrigin.x;
  const dy = touch.clientY - touchOrigin.y;
  if (Math.abs(dx) > 65 && Math.abs(dy) < 80) moveViewer(dx > 0 ? -1 : 1);
  touchOrigin = null;
}, { passive: true });

for (const button of document.querySelectorAll('[data-open-photo]')) {
  button.addEventListener('click', () => openPhoto(Number(button.dataset.openPhoto)));
}
for (const figure of document.querySelectorAll('.climate-photo')) {
  const button = figure.querySelector('.photo-zoom');
  const image = button.querySelector('img');
  button.addEventListener('click', () => openPhoto({
    src: image.currentSrc || image.src,
    title: image.alt,
    caption: figure.querySelector('figcaption').textContent.trim()
  }));
}
const chartButton = document.querySelector('.chart-open');
chartButton.addEventListener('click', () => {
  const image = chartButton.querySelector('img');
  openPhoto({
    src: image.currentSrc || image.src,
    title: 'Europe’s temperature record',
    description: image.alt,
    caption: chartButton.closest('figure').querySelector('figcaption').textContent.trim()
  });
});

// Introduction videos load on demand and stop when leaving the about section.
for (const slot of document.querySelectorAll('[data-video-id]')) {
  const launch = slot.querySelector('.video-launch');
  launch.style.backgroundImage = 'url("' + slot.dataset.videoFallback + '")';
  const thumbnail = launch.querySelector('.video-thumbnail');
  if (thumbnail) {
    const usePortraitFallback = () => {
      thumbnail.src = slot.dataset.videoFallback;
      thumbnail.classList.add('is-portrait-fallback');
    };
    thumbnail.addEventListener('error', usePortraitFallback, { once: true });
    if (thumbnail.complete && thumbnail.naturalWidth === 0) usePortraitFallback();
  }
  launch.addEventListener('click', () => {
    if (slot.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + slot.dataset.videoId + '?autoplay=1';
    frame.title = slot.dataset.videoTitle;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    launch.hidden = true;
    slot.insertBefore(frame, launch);
    slot.classList.add('is-playing');
  });
}
window.addEventListener('app:view', (event) => {
  if (event.detail.id === 'team') return;
  for (const slot of document.querySelectorAll('.video-slot.is-playing')) {
    slot.querySelector('iframe')?.remove();
    slot.querySelector('.video-launch').hidden = false;
    slot.classList.remove('is-playing');
  }
});

// Quiz and shared community poll.
(() => {
const questions = [
  {
    q: 'People at an exposed bus stop need relief from the heat this summer. Which option most directly provides shade now?',
    options: [
      'Plant young trees and wait for their canopies to grow',
      'Install a well-ventilated shade structure and plan suitable tree planting',
      'Resurface the waiting area with lighter paving alone'
    ],
    answer: 1,
    explanation: 'Built shade can block direct sun immediately. Trees can add shade and other benefits as they grow. Lighter paving can help address surface heating, but does not itself shade a waiting passenger.'
  },
  {
    q: 'A growing town funds tree planting and adds solar panels. What would best show whether its wider climate impact is improving?',
    options: [
      'Track emissions, land cover and tree survival over time alongside the projects',
      'Compare the amount of money spent with another town',
      'Use the number of newly announced projects as the main measure'
    ],
    answer: 0,
    explanation: 'Funding and completed projects show action, but outcomes also need monitoring. Emissions data, changes in land cover and the survival of planted trees help reveal what has actually improved.'
  },
  {
    q: 'Outside air is hotter than the air inside your home. Which approach makes the most sense?',
    options: [
      'Open all windows immediately to create airflow',
      'Shade sun-facing windows and ventilate when the outside air becomes cooler',
      'Keep windows shut through the cooler night as well as the hot afternoon'
    ],
    answer: 1,
    explanation: 'Shading limits incoming solar heat. Ventilation can help when outside air is cooler; opening windows while it is hotter outside can add heat. A fan may improve comfort without bringing in hotter air.'
  }
];
let qi = 0, score = 0, answered = false;
const qtext = document.getElementById('quiz-question'), qopts = document.getElementById('quiz-options'), feedback = document.getElementById('quiz-feedback'), next = document.getElementById('quiz-next');
function showQuestion() {
  answered = false;
  const q = questions[qi];
  document.getElementById('quiz-progress').textContent = `Question ${qi+1} of ${questions.length}`;
  document.getElementById('quiz-score').textContent = `Score: ${score}`;
  document.getElementById('quiz-bar').style.width = `${qi/questions.length*100}%`;
  qtext.textContent = q.q;
  qopts.replaceChildren();
  feedback.textContent = '';
  next.hidden = true;
  const answerOrder = q.options.map((_, index) => index);
  for (let i = answerOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answerOrder[i],
    answerOrder[j]] = [answerOrder[j],
    answerOrder[i]]
  }
  answerOrder.forEach((optionIndex, displayIndex) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.optionIndex = String(optionIndex);
    b.textContent = q.options[optionIndex];
    b.addEventListener('click', () => choose(optionIndex));
    qopts.append(b)
  })
}
function choose(index) {
  if (answered) return;
  answered = true;
  const q = questions[qi];
  if (index === q.answer) score++;
  [...qopts.children].forEach((b, i) => {
    b.disabled = true;
    if (Number(b.dataset.optionIndex) === q.answer) b.classList.add('correct');
    else if (Number(b.dataset.optionIndex) === index) b.classList.add('wrong')
  });
  feedback.textContent = (index === q.answer ? 'Correct! ': 'Not quite. ') + q.explanation;
  document.getElementById('quiz-score').textContent = `Score: ${score}`;
  next.hidden = false;
  next.textContent = qi === questions.length - 1 ? 'See my results →': 'Next question →'
}
next.addEventListener('click', () => {
  qi++;
  if (qi < questions.length) {
    showQuestion()
  } else {
    qtext.hidden = true;
    qopts.hidden = true;
    next.hidden = true;
    feedback.textContent = '';
    document.getElementById('quiz-bar').style.width = '100%';
    document.getElementById('quiz-finish').hidden = false;
    document.getElementById('quiz-result').textContent = `You scored ${score} out of ${questions.length}!`
  }
});
document.getElementById('quiz-restart').addEventListener('click', () => {
  qi = 0;
  score = 0;
  qtext.hidden = false;
  qopts.hidden = false;
  document.getElementById('quiz-finish').hidden = true;
  showQuestion()
});
showQuestion();
// Shared totals live on the server. A random browser key makes retries idempotent.
const choices = ['Shade', 'Cool spaces', 'Buildings'];
const choiceLabels = ['Trees and shaded routes', 'Cool public spaces', 'Better buildings'];
const key = 'coil-shared-heat-poll-v1';
const form = document.getElementById('poll'), results = document.getElementById('poll-results');
const status = document.getElementById('poll-status'), submit = document.getElementById('poll-vote');
const refresh = document.getElementById('poll-refresh');
let voter, chosen = null, posting = false, fetching = false, revision = 0, pollTimer;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (/^[a-f0-9]{64}$/.test(saved?.voter || '')) voter = saved.voter;
  if (voter && choices.includes(saved.choice)) chosen = saved.choice;
} catch {}
if (!voter) voter = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
function remember() {
  try { localStorage.setItem(key, JSON.stringify({ voter, choice:chosen })); } catch {}
}
remember();
function validResults(data) {
  return data && choices.every(c => Number.isSafeInteger(data.counts?.[c]) && data.counts[c] >= 0) &&
    Number.isSafeInteger(data.total) && data.total === choices.reduce((n,c) => n + data.counts[c], 0);
}
function drawVotes(data) {
  const exact = choices.map(c => data.total ? data.counts[c] / data.total * 100 : 0);
  const percentages = exact.map(Math.floor);
  const order = exact.map((n,i) => i).sort((a,b) => (exact[b] - percentages[b]) - (exact[a] - percentages[a]));
  const remainder = data.total ? 100 - percentages.reduce((a,b) => a+b, 0) : 0;
  for (let i=0; i<remainder; i++) percentages[order[i]]++;
  const target = document.getElementById('poll-bars');
  target.replaceChildren();
  choices.forEach((choice,i) => {
    const row = document.createElement('div'); row.className = 'poll-row';
    const label = document.createElement('div'); label.className = 'poll-row-top';
    const name = document.createElement('span'); name.textContent = choiceLabels[i];
    const amount = document.createElement('span');
    amount.textContent = `${percentages[i]}% · ${data.counts[choice]} ${data.counts[choice] === 1 ? 'vote' : 'votes'}`;
    label.append(name, amount);
    const track = document.createElement('div'); track.className = 'poll-track'; track.setAttribute('aria-hidden','true');
    const fill = document.createElement('div'); fill.className = 'poll-fill'; fill.style.width = percentages[i] + '%';
    track.append(fill); row.append(label, track); target.append(row);
  });
  document.getElementById('poll-total').textContent = data.total
    ? `${data.total} ${data.total === 1 ? 'vote' : 'votes'} so far` : 'No answers yet. Be the first to vote.';
  document.getElementById('poll-updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
async function requestPoll(body) {
  const response = await fetch(new URL('./api/poll', document.baseURI), {
    method:body ? 'POST' : 'GET', cache:'no-store', credentials:'omit',
    headers:body ? {'Content-Type':'application/json'} : {'X-Poll-Key':voter},
    body:body ? JSON.stringify(body) : undefined, signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('Poll unavailable');
  const data = await response.json();
  if (!validResults(data)) throw new Error('Invalid poll results');
  return data;
}
async function loadResults(manual = false) {
  if (fetching || posting) return;
  fetching = true; refresh.disabled = true;
  const requestRevision = revision;
  try {
    const data = await requestPoll();
    if (revision !== requestRevision) return;
    drawVotes(data);
    if (chosen && data.choice === null) {
      chosen = null; remember(); form.hidden = false; results.hidden = true; scheduleResults();
    }
    if (manual || status.textContent.includes('unavailable') || status.textContent.includes('connected')) status.textContent = '';
  } catch {
    if (revision === requestRevision) status.textContent = results.hidden
      ? 'Shared voting is not connected in this preview. Open the shared classroom link to vote.'
      : 'Shared results are unavailable. Check the connection and try Refresh results.';
  } finally { fetching = false; refresh.disabled = false; }
}
function scheduleResults() {
  clearInterval(pollTimer);
  if (document.body.dataset.view === 'solutions' && !document.hidden && !results.hidden) pollTimer = setInterval(() => loadResults(), 30000);
}
function showResults() { form.hidden = true; results.hidden = false; scheduleResults(); }
if (chosen) {
  document.querySelector('input[name="poll"][value="' + chosen + '"]').checked = true;
  showResults();
}
submit.addEventListener('click', async () => {
  const selected = document.querySelector('input[name="poll"]:checked');
  if (!selected) { status.textContent = 'Choose an option before submitting your answer.'; return; }
  if (posting) return;
  posting = true; revision++; submit.disabled = true; form.setAttribute('aria-busy','true');
  submit.textContent = 'Saving your answer…'; status.textContent = '';
  try {
    const data = await requestPoll({voter, choice:selected.value});
    chosen = selected.value; remember(); drawVotes(data); showResults(); status.textContent = 'Your answer is saved.';
  } catch {
    status.textContent = 'Your answer could not be confirmed. Check the shared classroom connection and submit again; a retry will not add a second vote.';
  } finally { posting = false; submit.disabled = false; submit.textContent = 'Submit my answer'; form.removeAttribute('aria-busy'); }
});
document.getElementById('poll-change').addEventListener('click', () => {
  form.hidden = false; results.hidden = true; status.textContent = ''; scheduleResults();
  document.querySelector('input[name="poll"]:checked')?.focus();
});
refresh.addEventListener('click', () => loadResults(true));
window.addEventListener('app:view', event => {
  scheduleResults(); if (event.detail.id === 'solutions') loadResults();
});
document.addEventListener('visibilitychange', () => {
  scheduleResults(); if (!document.hidden && document.body.dataset.view === 'solutions' && !results.hidden) loadResults();
});

})();

// Load the city simulation and artwork only when a visitor enters the game.
(() => {
  let loading;
  async function loadGame() {
    if (loading) return;
    loading = (async () => {
      await import('./green-city-development.js?v=5d7445afae');
      await Promise.all([import('./green-city-core.js?v=bdd17488b8'), import('./green-city-art.js?v=ca8be4039d')]);
      await import('./green-city.js?v=4d923732cc');
    })();
    try { await loading; }
    catch { document.getElementById('gc-start-status').hidden = false; }
  }
  document.getElementById('gc-reload').addEventListener('click', () => location.reload());
  window.addEventListener('app:view', event => { if (event.detail.id === 'game') loadGame(); });
})();

// Static, deep-linkable destinations work equally on a phone and a computer.
(() => {
  const nav = document.getElementById('navlinks');
  const toggle = document.querySelector('.menu-toggle');
  const menuLabel = toggle.querySelector('.menu-label');
  const viewBar = document.getElementById('mobile-view-bar');
  const viewTitle = document.getElementById('mobile-view-title');
  const sections = [...document.querySelectorAll('main > section')];
  const views = {
    home: { title: 'Where’s the shade?', sections: ['home'] },
    gallery: { title: 'The gallery', sections: ['gallery'] },
    problem: { title: 'The evidence', sections: ['problem', 'slovenia-data'] },
    'climate-story': { title: 'The Arctic in September', sections: ['climate-story'] },
    cities: { title: 'Cities in transition', sections: ['cities'] },
    solutions: { title: 'Take action', sections: ['solutions', 'closing'] },
    game: { title: 'Build Your Green City', sections: ['game'] },
    team: { title: 'About us', sections: ['team', 'journey'] }
  };
  const aliases = {
    'slovenia-data': 'problem', 'evidence-glacier': 'problem', 'evidence-flood': 'problem',
    journey: 'team', closing: 'solutions'
  };
  const navDestination = (id) => id === 'game' ? 'solutions' : id;
  let currentView = null;

  function setMenuOpen(opening) {
    nav.classList.toggle('open', opening);
    document.body.classList.toggle('menu-open', opening);
    toggle.setAttribute('aria-expanded', String(opening));
    menuLabel.textContent = opening ? 'Close' : 'Menu';
    document.querySelector('main').inert = opening;
    document.querySelector('.site-footer').inert = opening;
  }
  function closeMenu() {
    setMenuOpen(false);
  }

  function renderView(hash, focus = true, preserveScroll = false) {
    const requested = hash.replace(/^#/, '') || 'home';
    const id = aliases[requested] || (views[requested] ? requested : 'home');
    const view = views[id];
    const target = aliases[requested] ? document.getElementById(requested) : null;
    const summary = target?.matches('details') ? target.querySelector('summary') : null;
    closePhoto(false);
    closeMenu();
    document.body.dataset.view = id;
    for (const section of sections) section.hidden = !view.sections.includes(section.id);
    if (summary) target.open = true;
    viewBar.hidden = id === 'home';
    viewTitle.textContent = view.title;
    for (const link of nav.querySelectorAll('a')) {
      const active = link.hash === '#' + navDestination(id);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.title = view.title + ' — COIL SDG 13 Gallery';
    window.dispatchEvent(new CustomEvent('app:view', { detail: { id, previous: currentView } }));
    currentView = id;
    requestAnimationFrame(() => {
      if (preserveScroll) {
        // Browser scroll restoration runs after the correct sections are visible.
      } else if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      if (focus) {
        const focusTarget = summary || document.querySelector('#' + view.sections[0] + ' h1, #' + view.sections[0] + ' h2');
        if (focusTarget) {
          if (!summary) focusTarget.setAttribute('tabindex', '-1');
          focusTarget.focus({ preventScroll: true });
        }
      }
      updateProgress();
    });
  }

  toggle.addEventListener('click', () => {
    setMenuOpen(!nav.classList.contains('open'));
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      const hash = link.getAttribute('href');
      const id = hash.slice(1);
      if (views[id] || aliases[id]) {
        event.preventDefault();
        if (location.hash !== hash) history.pushState(null, '', hash);
        renderView(hash);
        return;
      }
    }
    if (nav.classList.contains('open') && !event.target.closest('.nav')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    } else if (event.key === 'Tab' && nav.classList.contains('open')) {
      const first = nav.querySelector('a');
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        toggle.focus();
      } else if (!event.shiftKey && document.activeElement === toggle) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  window.addEventListener('popstate', () => renderView(location.hash));
  window.addEventListener('hashchange', () => renderView(location.hash));
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';

  let progressScheduled = false;
  function updateProgress() {
    const available = document.documentElement.scrollHeight - innerHeight;
    const amount = available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0;
    document.querySelector('.scroll-progress').style.transform = 'scaleX(' + amount + ')';
    progressScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!progressScheduled) {
      progressScheduled = true;
      requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  renderView(location.hash, false, isPageReload);
})();

// Gentle, one-time reveals; no scroll animation runs continuously.
(() => {
  const targets = document.querySelectorAll('.home-photo, .discovery-grid > a, .photo-card, .interactive-card, .student, .timeline > div');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-enabled');
  targets.forEach((target) => target.classList.add('reveal'));
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.05 });
  targets.forEach((target) => observer.observe(target));
})();

// Warm the Arctic after the homepage has loaded, or as soon as a visitor heads there.
(() => {
  let loading;
  function loadArctic() {
    if (loading) return;
    loading=import('./arctic-story.js?v=0e4f0ce6a3').catch(error=>{console.warn('Using Arctic still views:',error);loading=null;});
  }
  function warmArctic() {
    const connection = navigator.connection;
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches ||
        connection?.saveData || /2g$/.test(connection?.effectiveType || '')) return;
    loadArctic();
  }
  function queueWarmup() {
    const warmHomepage = () => {
      if (document.body.dataset.view === 'home') warmArctic();
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(warmHomepage, { timeout: 1500 });
    else window.setTimeout(warmHomepage, 300);
  }
  window.addEventListener('app:view', event => {
    if (event.detail.id === 'climate-story') loadArctic();
  });
  if (document.body.dataset.view === 'climate-story') loadArctic();
  for (const event of ['pointerover', 'focusin']) {
    document.addEventListener(event, ({ target }) => {
      if (target.closest?.('a[href="#climate-story"]')) warmArctic();
    }, { passive: true });
  }
  if (document.readyState === 'complete') queueWarmup();
  else window.addEventListener('load', queueWarmup, { once: true });
})();

// Native controls support mouse, touch and keyboard without an animation loop.
(() => {
  const slider = document.getElementById('paris-comparison');
  if (slider) {
    if (Number.isFinite(reloadContext?.comparison)) {
      slider.value = String(Math.max(0, Math.min(100, reloadContext.comparison)));
    }
    const updateComparison = () => {
      const value = Math.max(0, Math.min(100, Number(slider.value)));
      document.getElementById('paris-before-overlay').style.clipPath = `inset(0 ${100 - value}% 0 0)`;
      document.getElementById('paris-comparison-divider').style.left = value + '%';
      slider.setAttribute('aria-valuetext', `${value} percent before, ${100 - value} percent after`);
    };
    slider.addEventListener('input', updateComparison);
    updateComparison();
  }
})();

// City case studies use native buttons; only the incoming case briefly animates.
(() => {
  const buttons = [...document.querySelectorAll('[data-city]')];
  if (reloadContext?.city && buttons.some(button => button.dataset.city === reloadContext.city)) {
    for (const button of buttons) {
      const selected = button.dataset.city === reloadContext.city;
      button.setAttribute('aria-pressed', String(selected));
      document.getElementById('city-' + button.dataset.city).hidden = !selected;
    }
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let cityAnimation = null;

  function stopCityAnimation() {
    cityAnimation?.cancel();
    cityAnimation = null;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      stopCityAnimation();
      for (const option of buttons) {
        const selected = option === button;
        option.setAttribute('aria-pressed', String(selected));
        document.getElementById('city-' + option.dataset.city).hidden = !selected;
      }
      const panel = document.getElementById('city-' + button.dataset.city);
      if (!reducedMotion.matches && typeof panel.animate === 'function') {
        cityAnimation = panel.animate([
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 180, easing: 'ease-out' });
      }
    });
  }

  reducedMotion.addEventListener('change', stopCityAnimation);
  window.addEventListener('app:view', stopCityAnimation);
})();

// Per-history-entry context: no cookies, account or persistent storage required.
(() => {
  const details = [...document.querySelectorAll('details')];
  for (const saved of reloadContext?.openDetails || []) {
    const item = details[saved.index];
    if (item?.querySelector('summary')?.textContent.trim() === saved.label) {
      item.setAttribute('open', '');
    }
  }
  function rememberContext() {
    const city = document.querySelector('[data-city][aria-pressed="true"]')?.dataset.city;
    const chapter = Number(document.querySelector('[data-story-stage][aria-pressed="true"]')?.dataset.storyStage);
    const openDetails = details.flatMap((item, index) => item.getAttribute('open') !== null
      ? [{ index, label: item.querySelector('summary')?.textContent.trim() }] : []);
    try {
      history.replaceState({ ...history.state,
        coilContext: {
          hash: location.hash, city, chapter, openDetails,
          arcticProgress: Number(document.getElementById('climate-story')?.dataset.progress) || 0,
          category: activeCategory,
          comparison: Number(document.getElementById('paris-comparison')?.value)
        }
      }, '', location.pathname + location.search + location.hash);
    } catch {
      // Native scroll restoration still works if history writes are unavailable.
    }
  }
  window.addEventListener('pagehide', rememberContext);
  window.addEventListener('beforeunload', rememberContext);
})();

// Initial visibility is now owned by the fully initialised router.
document.documentElement.removeAttribute('data-initial-view');
