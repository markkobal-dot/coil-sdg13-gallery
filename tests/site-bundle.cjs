'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSiteBundle } = require('../scripts/build-site-bundle.cjs');

test('source edits refresh the bundle and cache version; daily weather stays independent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coil-bundle-'));
  try {
    for (const file of ['gallery-data.js', 'script.js', 'weather-data.js', 'evidence.js', 'home-experience.js', 'site-polish.js', 'index.html']) {
      fs.copyFileSync(path.join(__dirname, '..', file), path.join(root, file));
    }
    const first = buildSiteBundle(root);
    assert.equal(first.changed, true);
    assert.equal(buildSiteBundle(root).changed, false);
    fs.appendFileSync(path.join(root, 'home-experience.js'), '\n// Source edit\n');
    const next = buildSiteBundle(root);
    assert.equal(next.changed, true);
    assert.notEqual(next.version, first.version);
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, new RegExp(`site\\.js\\?v=${next.version}`));
    assert.match(html, /weather-snapshot\.js" defer><\/script>\s*<script src="site\.js/);
    fs.mkdirSync(path.join(root, 'assets', 'data'), {recursive:true});
    fs.writeFileSync(path.join(root, 'assets', 'data', 'weather-snapshot.js'), 'globalThis.COIL_WEATHER_SNAPSHOT={};');
    assert.deepEqual(buildSiteBundle(root), {changed:false, version:next.version});
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'site.js'), 'utf8'), /Source: green-city\.js/);
  } finally { fs.rmSync(root, {recursive:true, force:true}); }
});
