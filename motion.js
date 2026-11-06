/* A small, optional climate atmosphere; animation itself stays in CSS. */
(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'coil-visual-effects';
  let enabled = true;
  try { enabled = localStorage.getItem(storageKey) !== 'off'; } catch { /* Optional preference. */ }

  const atmosphere = document.createElement('div');
  atmosphere.className = 'climate-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.setAttribute('inert', '');
  const positions = [2, 95, 7, 91, 4, 97, 10, 89, 1, 94, 6, 98];
  const leaf = '<svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 3C9 7 0 22 8 36c7 12 28 7 27-12L32 3Z" fill="currentColor"/><path d="M5 52C10 34 20 22 29 12M12 37l-1-13m9 2 10-3" stroke="var(--leaf-vein, #f7f6f0)" stroke-width="1.8" stroke-linecap="round"/></svg>';
  positions.forEach((x, index) => {
    const particle = document.createElement('span');
    particle.className = 'climate-leaf';
    particle.style.setProperty('--leaf-x', x + '%');
    particle.style.setProperty('--leaf-size', (18 + index % 4 * 5) + 'px');
    particle.style.setProperty('--leaf-duration', (22 + index % 5 * 5) + 's');
    particle.style.setProperty('--leaf-delay', -(index * 6.7 + 3) + 's');
    particle.style.setProperty('--leaf-turn', (index % 2 ? -1 : 1) * (15 + index * 9) + 'deg');
    particle.innerHTML = leaf;
    atmosphere.append(particle);
  });
  document.body.append(atmosphere);

  const image = document.querySelector('.hero-visual');
  if (image) {
    const heat = document.createElement('div');
    heat.className = 'climate-heat';
    heat.setAttribute('aria-hidden', 'true');
    heat.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 110C-2 86 31 71 15 48S28 12 18-10M50 110C31 86 66 70 49 48S62 12 52-10M83 110C64 86 98 70 82 48S96 12 85-10" stroke="currentColor" stroke-width=".35"/></svg>';
    image.append(heat);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'effects-toggle';
  toggle.innerHTML = leaf + '<span></span>';
  document.body.append(toggle);
  function update() {
    const on = enabled && !preference.matches;
    document.documentElement.dataset.motion = on ? 'on' : 'off';
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', 'Animated visual effects');
    toggle.querySelector('span').textContent = on ? 'Effects on' : 'Effects off';
    toggle.disabled = preference.matches;
    toggle.title = preference.matches ? 'Effects are off to respect your reduced-motion setting.' : on ? 'Pause decorative motion' : 'Enable decorative motion';
    document.body.classList.toggle('effects-paused', document.hidden);
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(storageKey, enabled ? 'on' : 'off'); } catch { /* Preference still works for this visit. */ }
    update();
  });
  preference.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
})();
