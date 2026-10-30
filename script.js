"use strict";

// Collection: one shared data file supplies the gallery and homepage previews.
const galleryGrid = document.getElementById('photo-grid');
const galleryCards = [];
let activeCategory = 'all';
let activeMedia = 'all';
let activeAuthor = 'all';
let visiblePhotoIndices = galleryPhotos.map((_, index) => index);
const mediaType = (photo) => photo.src.endsWith('.svg') ? 'study' : 'photograph';

galleryPhotos.forEach((photo, index) => {
  const card = document.createElement('article');
  card.className = 'photo-card';
  card.dataset.category = photo.category;
  card.dataset.media = mediaType(photo);
  card.dataset.author = photo.photographer;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'photo-open';
  button.setAttribute('aria-label', 'Open ' + photo.title);

  const image = document.createElement('img');
  image.src = photo.src;
  image.alt = photo.description;
  image.width = 720;
  image.height = 540;
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
  const number = document.createElement('span');
  number.className = 'photo-number';
  number.textContent = String(index + 1).padStart(2, '0');
  number.setAttribute('aria-hidden', 'true');

  const title = document.createElement('h3');
  title.textContent = photo.title;
  const author = document.createElement(photo.sourceUrl ? 'a' : 'span');
  author.className = 'photo-author';
  author.textContent = photo.author;
  if (photo.sourceUrl) {
    author.href = photo.sourceUrl;
    author.target = '_blank';
    author.rel = 'noopener noreferrer';
  }
  information.append(number, title, author);
  card.append(button, information);
  galleryGrid.append(card);
  galleryCards.push(card);
});

function filterCollection() {
  visiblePhotoIndices = [];
  galleryCards.forEach((card, index) => {
    const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
    const matchesMedia = activeMedia === 'all' || card.dataset.media === activeMedia;
    const matchesAuthor = activeAuthor === 'all' || card.dataset.author === activeAuthor;
    card.hidden = !(matchesCategory && matchesMedia && matchesAuthor);
    if (!card.hidden) visiblePhotoIndices.push(index);
  });
  const count = visiblePhotoIndices.length;
  document.getElementById('gallery-empty').hidden = count > 0;
  document.getElementById('gallery-count').textContent =
    count + (count === 1 ? ' perspective' : ' perspectives');
}
for (const button of document.querySelectorAll('.filter')) {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    for (const filter of document.querySelectorAll('.filter')) {
      const selected = filter === button;
      filter.classList.toggle('active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    }
    filterCollection();
  });
}
document.getElementById('gallery-author').addEventListener('change', (event) => {
  activeAuthor = event.target.value;
  filterCollection();
});

document.getElementById('gallery-media').addEventListener('change', (event) => {
  activeMedia = event.target.value;
  filterCollection();
});
filterCollection();

// The same accessible viewer opens photographs, field images and the chart.
const lightbox = document.getElementById('lightbox');
const viewerImage = document.getElementById('lightbox-image');
const viewerTitle = document.getElementById('lightbox-title');
const viewerDescription = document.getElementById('lightbox-description');
const viewerCaption = document.getElementById('lightbox-caption');
const viewerCounter = document.getElementById('lightbox-counter');
const viewerType = document.getElementById('lightbox-type');
const viewerClose = document.getElementById('lightbox-close');
const viewerPrevious = document.getElementById('lightbox-previous');
const viewerNext = document.getElementById('lightbox-next');
let viewerIndex = null;
let viewerSequence = [];
let viewerPreviousFocus = null;
let viewerCloseTimer = null;

function showViewerItem(photo) {
  viewerImage.src = photo.fullSrc || photo.src;
  viewerImage.alt = photo.description || photo.title || '';
  viewerTitle.textContent = photo.title || 'A closer look';
  viewerDescription.textContent = photo.description || '';
  viewerCaption.textContent = photo.author || photo.caption || '';
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
  if (lightbox.hidden) return;
  if (event.key === 'Escape') closePhoto();
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveViewer(-1);
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveViewer(1);
  }
  if (event.key === 'Tab') {
    const controls = [...lightbox.querySelectorAll('button:not([hidden])')];
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

// Quiz and browser-local poll.
(() => {
const questions = [ {
  q: 'What can help people stay cooler in a neighbourhood during a heatwave?',
  options: ['Remove trees and add more dark paving',
  'Plant and protect trees that provide shade',
  'Close shaded public spaces'],
  answer: 1,
  explanation: 'Trees provide shade and can help cool nearby streets, making outdoor places more comfortable during hot weather.'
},
{
  q: 'What is a sensible way to keep a home cooler on a hot day?',
  options: ['Use blinds or shutters to block direct sun',
  'Run air conditioning with the windows open',
  'Open windows while outside air is hotter than indoors'],
  answer: 0,
  explanation: 'Shading windows can reduce heat entering the home. Ventilate when the outside air is cooler.'
},
{
  q: 'Which choice can help limit future warming as we travel locally?',
  options: ['Drive alone for every short trip',
  'Walk, cycle or take public transport when practical',
  'Leave the car running while waiting'],
  answer: 1,
  explanation: 'These options can reduce transport emissions. Walking and cycling also create no tailpipe emissions.'
}];
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
// SURVEY: Demo results are stored in localStorage on THIS browser only.
// A public survey that aggregates all visitors needs an external database/backend.
const key = 'coil-sdg-heat-poll-v1', choices = ['Shade',
'Cool spaces',
'Buildings'];
let votes;
try {
  votes = JSON.parse(localStorage.getItem(key)) || {
    Shade: 0,
    'Cool spaces': 0,
    Buildings: 0
  }
} catch {
  votes = {
    Shade: 0,
    'Cool spaces': 0,
    Buildings: 0
  }
};
// Recover from invalid or outdated data without interrupting site navigation.
if (!votes || typeof votes !== 'object' || Array.isArray(votes)) {
  votes = { Shade: 0, 'Cool spaces': 0, Buildings: 0 };
}
for (const c of choices) {
  if (!Number.isSafeInteger(votes[c]) || votes[c] < 0) votes[c] = 0;
}
function drawVotes() {
  const total = choices.reduce((s, c) => s + votes[c], 0),
  target = document.getElementById('poll-bars');
  target.replaceChildren();
  for (const c of choices) {
    const percent = total ? Math.round(votes[c] / total * 100): 0;
    const row = document.createElement('div');
    row.className = 'poll-row';
    const label = document.createElement('div');
    label.className = 'poll-row-top';
    const name = document.createElement('span');
    name.textContent = c;
    const amount = document.createElement('span');
    amount.textContent = `${votes[c]} ${votes[c]===1?'vote':'votes'} | ${percent}%`;
    label.append(name, amount);
    const track = document.createElement('div');
    track.className = 'poll-track';
    const fill = document.createElement('div');
    fill.className = 'poll-fill';
    fill.style.width = percent + '%';
    track.append(fill);
    row.append(label, track);
    target.append(row)
  }
}
document.getElementById('poll-vote').addEventListener('click', () => {
  const selected = document.querySelector('input[name="poll"]:checked');
  if (!selected) {
    document.getElementById('poll-status').textContent = 'Choose an option before submitting your answer.';
    return
  }
  document.getElementById('poll-status').textContent = '';
  votes[selected.value]++;
  try {
    localStorage.setItem(key, JSON.stringify(votes))
  } catch {
  }
  document.getElementById('poll').hidden = true;
  document.getElementById('poll-results').hidden = false;
  drawVotes()
});
document.getElementById('poll-reset').addEventListener('click', () => {
  votes = {
    Shade: 0,
    'Cool spaces': 0,
    Buildings: 0
  };
  try {
    localStorage.removeItem(key)
  } catch {
  }
  document.getElementById('poll').hidden = false;
  document.getElementById('poll-results').hidden = true;
  document.querySelectorAll('input[name="poll"]').forEach(x => x.checked = false)
});

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
    home: { title: 'Overview', sections: ['home'] },
    gallery: { title: 'The gallery', sections: ['gallery'] },
    problem: { title: 'The evidence', sections: ['problem', 'slovenia-data'] },
    'climate-story': { title: 'The climate story', sections: ['climate-story'] },
    solutions: { title: 'Take action', sections: ['solutions', 'closing'] },
    game: { title: 'Climate Mission', sections: ['game'] },
    team: { title: 'About us', sections: ['team', 'journey'] }
  };
  const aliases = { 'slovenia-data': 'problem', journey: 'team', closing: 'solutions' };
  const navDestination = (id) => id === 'game' ? 'solutions' : id;
  let currentView = null;

  function closeMenu() {
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    menuLabel.textContent = 'Menu';
  }

  function renderView(hash, focus = true) {
    const requested = hash.replace(/^#/, '') || 'home';
    const id = aliases[requested] || (views[requested] ? requested : 'home');
    const view = views[id];
    closePhoto(false);
    closeMenu();
    document.body.dataset.view = id;
    for (const section of sections) section.hidden = !view.sections.includes(section.id);
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
      if (aliases[requested]) {
        document.getElementById(requested)?.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      if (focus) {
        const heading = document.querySelector('#' + view.sections[0] + ' h1, #' + view.sections[0] + ' h2');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      }
      updateProgress();
    });
  }

  toggle.addEventListener('click', () => {
    const opening = !nav.classList.contains('open');
    nav.classList.toggle('open', opening);
    document.body.classList.toggle('menu-open', opening);
    toggle.setAttribute('aria-expanded', String(opening));
    menuLabel.textContent = opening ? 'Close' : 'Menu';
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) {
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
    }
  });
  window.addEventListener('popstate', () => renderView(location.hash));
  window.addEventListener('hashchange', () => renderView(location.hash));
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    history.replaceState(null, '', location.pathname + location.search + '#home');
  }

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
  renderView(location.hash, false);
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

// Keep chapter changes tied to the text without a continuously running animation.
(() => {
  const scene = document.querySelector('.climate-scene');
  const steps = [...document.querySelectorAll('.shift-step')];
  const chapterButtons = [...document.querySelectorAll('[data-story-stage]')];
  const previous = document.getElementById('story-previous');
  const next = document.getElementById('story-next');
  const progress = document.getElementById('story-progress');
  const compact = matchMedia('(max-width: 900px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [
    {
      label: 'Where the smoke begins',
      energy: 'Fossil fuels',
      streets: 'Exposed paving',
      focus: 'Emissions'
    },
    {
      label: 'A warming neighbourhood',
      energy: 'Fossil fuels',
      streets: 'Heat retained',
      focus: 'Heat stress'
    },
    {
      label: 'A neighbourhood ready for heat',
      energy: 'Renewable power',
      streets: 'More shade',
      focus: 'Act & adapt'
    }
  ];
  let activeIndex = 0;
  let scrollScheduled = false;
  let requestedChapter = null;
  let chapterSettleTimer = null;

  function releaseChapterSelection() {
    requestedChapter = null;
    window.clearTimeout(chapterSettleTimer);
  }

  function activate(index) {
    activeIndex = Math.max(0, Math.min(steps.length - 1, index));
    const chapter = chapters[activeIndex];
    scene.dataset.state = steps[activeIndex].dataset.sceneState;
    scene.querySelector('.scene-label').textContent = chapter.label;
    scene.querySelector('.scene-stage').textContent =
      String(activeIndex + 1).padStart(2, '0') + ' / 03';
    document.getElementById('story-energy').textContent = chapter.energy;
    document.getElementById('story-streets').textContent = chapter.streets;
    document.getElementById('story-focus').textContent = chapter.focus;
    document.querySelector('.story-progress-fill').style.transform =
      'scaleX(' + ((activeIndex + 1) / steps.length) + ')';
    steps.forEach((step, position) => {
      step.classList.toggle('is-active', position === activeIndex);
    });
    chapterButtons.forEach((button, position) => {
      button.setAttribute('aria-pressed', String(position === activeIndex));
    });
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === steps.length - 1;
    progress.textContent = 'Stage ' + (activeIndex + 1) + ' of ' + steps.length;
  }

  function syncWithScroll() {
    scrollScheduled = false;
    if (compact.matches || document.body.dataset.view !== 'climate-story') return;
    const readingLine = window.innerHeight * 0.53;
    if (requestedChapter !== null) {
      const target = steps[requestedChapter].getBoundingClientRect();
      const targetDistance = Math.abs((target.top + target.bottom) / 2 - readingLine);
      if (targetDistance > Math.max(45, window.innerHeight * 0.1)) return;
      releaseChapterSelection();
    }
    let nearest = 0;
    let smallestDistance = Infinity;
    steps.forEach((step, index) => {
      const bounds = step.getBoundingClientRect();
      const distance = Math.abs((bounds.top + bounds.bottom) / 2 - readingLine);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nearest = index;
      }
    });
    if (nearest !== activeIndex) activate(nearest);
  }

  function scheduleScrollSync() {
    if (compact.matches || document.body.dataset.view !== 'climate-story' || scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(syncWithScroll);
  }

  chapterButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (compact.matches) {
        activate(index);
      } else {
        releaseChapterSelection();
        activate(index);
        if (!reducedMotion.matches) {
          requestedChapter = index;
          chapterSettleTimer = window.setTimeout(() => {
            releaseChapterSelection();
            scheduleScrollSync();
          }, 1100);
        }
        steps[index].scrollIntoView({
          block: 'center',
          behavior: reducedMotion.matches ? 'instant' : 'smooth'
        });
        scheduleScrollSync();
      }
    });
  });
  previous.addEventListener('click', () => activate(activeIndex - 1));
  next.addEventListener('click', () => activate(activeIndex + 1));
  function resumeReading() {
    if (requestedChapter === null) return;
    releaseChapterSelection();
    scheduleScrollSync();
  }
  compact.addEventListener('change', () => {
    releaseChapterSelection();
    scheduleScrollSync();
  });
  window.addEventListener('wheel', resumeReading, { passive: true });
  window.addEventListener('touchstart', resumeReading, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
      resumeReading();
    }
  });
  window.addEventListener('resize', scheduleScrollSync, { passive: true });
  window.addEventListener('scroll', scheduleScrollSync, { passive: true });
  window.addEventListener('app:view', (event) => {
    releaseChapterSelection();
    if (event.detail.id === 'climate-story') {
      // The router restores the scroll position after this event.
      activate(0);
    }
  });
  activate(0);
  scheduleScrollSync();
})();

// Native controls support mouse, touch and keyboard without an animation loop.
(() => {
  const slider = document.getElementById('paris-comparison');
  if (slider) {
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
