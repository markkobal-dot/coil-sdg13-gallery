'use strict';

/* Meni postane poln, ko se stran pomakne */
const topbar = document.getElementById('top');
const onScroll = () => topbar.classList.toggle('solid', window.scrollY > 60);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ========== Galerija ========== */
/* Vsak dijak doda svoje fotografije v ta seznam.
   file: pot do slike (npr. images/dijakA/foto1.jpg)
   cat: tezava | resitev | narava
   author: dijakA | dijakB */
const photos = [
  { file: 'images/dijakA/foto1.jpg', title: 'Naslov fotografije A1', desc: 'Kratek opis, kje in zakaj.', cat: 'tezava',  author: 'dijakA' },
  { file: 'images/dijakA/foto2.jpg', title: 'Naslov fotografije A2', desc: 'Kratek opis, kje in zakaj.', cat: 'resitev', author: 'dijakA' },
  { file: 'images/dijakA/foto3.jpg', title: 'Naslov fotografije A3', desc: 'Kratek opis, kje in zakaj.', cat: 'narava',  author: 'dijakA' },
  { file: 'images/dijakA/foto4.jpg', title: 'Naslov fotografije A4', desc: 'Kratek opis, kje in zakaj.', cat: 'tezava',  author: 'dijakA' },
  { file: 'images/dijakA/foto5.jpg', title: 'Naslov fotografije A5', desc: 'Kratek opis, kje in zakaj.', cat: 'resitev', author: 'dijakA' },
  { file: 'images/dijakA/foto6.jpg', title: 'Naslov fotografije A6', desc: 'Kratek opis, kje in zakaj.', cat: 'narava',  author: 'dijakA' },
  { file: 'images/dijakB/foto1.jpg', title: 'Naslov fotografije B1', desc: 'Kratek opis, kje in zakaj.', cat: 'tezava',  author: 'dijakB' },
  { file: 'images/dijakB/foto2.jpg', title: 'Naslov fotografije B2', desc: 'Kratek opis, kje in zakaj.', cat: 'resitev', author: 'dijakB' },
  { file: 'images/dijakB/foto3.jpg', title: 'Naslov fotografije B3', desc: 'Kratek opis, kje in zakaj.', cat: 'narava',  author: 'dijakB' },
  { file: 'images/dijakB/foto4.jpg', title: 'Naslov fotografije B4', desc: 'Kratek opis, kje in zakaj.', cat: 'tezava',  author: 'dijakB' },
  { file: 'images/dijakB/foto5.jpg', title: 'Naslov fotografije B5', desc: 'Kratek opis, kje in zakaj.', cat: 'resitev', author: 'dijakB' },
  { file: 'images/dijakB/foto6.jpg', title: 'Naslov fotografije B6', desc: 'Kratek opis, kje in zakaj.', cat: 'narava',  author: 'dijakB' }
];

const authorNames = { dijakA: 'Dijak A', dijakB: 'Dijak B' };
const grid = document.getElementById('grid');
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-cap');
let filter = { cat: 'vse', author: null };
let shown = [], current = 0;

function renderGrid() {
  grid.innerHTML = '';
  shown = photos.filter(p =>
    (filter.cat === 'vse' || p.cat === filter.cat) &&
    (!filter.author || p.author === filter.author));
  if (!shown.length) {
    grid.innerHTML = '<p class="empty">Ni fotografij za izbrani filter.</p>';
    return;
  }
  shown.forEach((p, idx) => {
    const b = document.createElement('button');
    b.className = 'item';
    b.type = 'button';
    const img = document.createElement('img');
    img.src = p.file;
    img.alt = p.title + ': ' + p.desc;
    img.loading = 'lazy';
    img.onerror = () => {
      const ph = document.createElement('div');
      ph.className = 'ph g' + (idx % 3);
      ph.textContent = 'Dodaj sliko: ' + p.file;
      img.replaceWith(ph);
    };
    const cap = document.createElement('figcaption');
    cap.innerHTML = '<strong></strong><span class="by"></span>';
    cap.querySelector('strong').textContent = p.title;
    cap.querySelector('.by').textContent = authorNames[p.author] + ' · ' + p.desc;
    b.append(img, cap);
    b.addEventListener('click', () => openLightbox(idx));
    grid.appendChild(b);
  });
}

function openLightbox(i) {
  current = (i + shown.length) % shown.length;
  const p = shown[current];
  lbImg.src = p.file;
  lbImg.alt = p.title;
  lbCap.textContent = p.title + ' (' + authorNames[p.author] + ')';
  lb.hidden = false;
  document.getElementById('lb-close').focus();
}
function closeLightbox() { lb.hidden = true; lbImg.src = ''; }
document.getElementById('lb-close').addEventListener('click', closeLightbox);
document.getElementById('lb-prev').addEventListener('click', () => openLightbox(current - 1));
document.getElementById('lb-next').addEventListener('click', () => openLightbox(current + 1));
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') openLightbox(current - 1);
  if (e.key === 'ArrowRight') openLightbox(current + 1);
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (chip.dataset.filter) {
      filter.cat = chip.dataset.filter;
    } else {
      filter.author = filter.author === chip.dataset.author ? null : chip.dataset.author;
    }
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active',
        (c.dataset.filter && c.dataset.filter === filter.cat) ||
        (c.dataset.author && c.dataset.author === filter.author));
    });
    renderGrid();
  });
});
renderGrid();

/* ========== 3. Kviz ========== */
const questions = [
  { q: 'Kateri plin je glavni vzrok sodobnega segrevanja ozračja zaradi človeka?',
    a: ['Kisik', 'Ogljikov dioksid (CO₂)', 'Dušik', 'Helij'], c: 1,
    why: 'CO₂ nastaja pri zgorevanju fosilnih goriv (nafta, premog, plin).' },
  { q: 'Katera številka je cilj trajnostnega razvoja "Podnebni ukrepi"?',
    a: ['SDG 7', 'SDG 11', 'SDG 13', 'SDG 15'], c: 2,
    why: 'SDG 13 poziva k nujnim ukrepom proti podnebnim spremembam.' },
  { q: 'Kateri mednarodni sporazum želi omejiti segrevanje precej pod 2 °C, po možnosti na 1,5 °C?',
    a: ['Pariški sporazum', 'Kjotski protokol iz leta 1900', 'Schengenski sporazum', 'Bernska konvencija'], c: 0,
    why: 'Pariški sporazum je bil sprejet leta 2015.' },
  { q: 'Kaj od naštetega najbolj zmanjša tvoj ogljični odtis pri vsakdanjem prevozu?',
    a: ['Vožnja z avtom samega', 'Hoja, kolo ali javni prevoz', 'Kratek polet', 'Motorni skuter'], c: 1,
    why: 'Aktivna mobilnost in javni prevoz sproščata bistveno manj CO₂ na osebo.' },
  { q: 'Zakaj so drevesa in gozdovi pomembni za podnebje?',
    a: ['Vežejo CO₂ in ohlajajo okolico', 'Povečujejo količino CO₂', 'Ne vplivajo na podnebje', 'Samo zakrivajo razgled'], c: 0,
    why: 'Drevesa med rastjo vežejo ogljik, njihova senca in izparevanje pa ohlajata mesta.' }
];

const quiz = document.getElementById('quiz');
let qi = 0, score = 0;

function showQuestion() {
  const item = questions[qi];
  quiz.innerHTML = `
    <div class="progress"><div style="width:${(qi / questions.length) * 100}%"></div></div>
    <p class="small">Vprašanje ${qi + 1} od ${questions.length}</p>
    <h3 style="margin-top:0">${item.q}</h3>
    <div id="opts"></div>
    <p class="feedback" id="fb"></p>
    <button class="btn" id="next" hidden>${qi === questions.length - 1 ? 'Poglej rezultat' : 'Naslednje vprašanje'}</button>`;
  const opts = document.getElementById('opts');
  item.a.forEach((text, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', () => answer(i));
    opts.appendChild(b);
  });
  document.getElementById('next').addEventListener('click', () => {
    qi++;
    qi < questions.length ? showQuestion() : showResult();
  });
}

function answer(i) {
  const item = questions[qi];
  const buttons = document.querySelectorAll('#opts .opt');
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === item.c) b.classList.add('right');
  });
  if (i === item.c) {
    score++;
    document.getElementById('fb').textContent = 'Pravilno! ' + item.why;
  } else {
    buttons[i].classList.add('wrong');
    document.getElementById('fb').textContent = 'Ni pravilno. ' + item.why;
  }
  document.getElementById('next').hidden = false;
  document.getElementById('next').focus();
}

function showResult() {
  const msg = score === questions.length ? 'Odlično, podnebni strokovnjak!'
    : score >= 3 ? 'Dobro znanje, še malo do vrha.'
    : 'Še malo se pouči, galerija ti pri tem pomaga.';
  quiz.innerHTML = `
    <p class="small">Rezultat</p>
    <p class="score">${score} / ${questions.length}</p>
    <p>${msg}</p>
    <button class="btn" id="again">Poskusi znova</button>`;
  document.getElementById('again').addEventListener('click', () => { qi = 0; score = 0; showQuestion(); });
}
showQuestion();

/* ========== 4. Anketa (shranjeno v brskalniku) ========== */
const pollForm = document.getElementById('poll');
const pollOut = document.getElementById('poll-results');
const KEY = 'sdg13-poll';
const options = [...pollForm.querySelectorAll('input[name="poll"]')].map(i => i.value);

function loadVotes() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function saveVotes(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* brskalnik ne dovoli shranjevanja */ }
}
function showPoll() {
  const votes = loadVotes();
  const total = options.reduce((s, o) => s + (votes[o] || 0), 0);
  if (!total) { pollOut.innerHTML = ''; return; }
  pollOut.innerHTML = '<h3>Rezultati (' + total + ' glasov)</h3>' + options.map(o => {
    const n = votes[o] || 0, pct = Math.round((n / total) * 100);
    return `<div class="bar"><span><b>${o}</b><b>${pct} %</b></span><div><i style="width:${pct}%"></i></div></div>`;
  }).join('');
}
pollForm.addEventListener('submit', e => {
  e.preventDefault();
  const choice = pollForm.querySelector('input[name="poll"]:checked');
  if (!choice) return;
  const votes = loadVotes();
  votes[choice.value] = (votes[choice.value] || 0) + 1;
  saveVotes(votes);
  pollForm.reset();
  showPoll();
});
showPoll();
