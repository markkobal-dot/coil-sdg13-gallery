'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSiteBundle } = require('../scripts/build-site-bundle.cjs');
const { updateGameCache } = require('../scripts/update-game-cache.cjs');

test('changed game helpers refresh their importers transitively and remain stable on the next build',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'coil-game-cache-'));
  try{
    fs.writeFileSync(path.join(root,'green-city-planning.js'),'// first\n');
    fs.writeFileSync(path.join(root,'green-city-planning-ui.js'),"import './green-city-planning.js';\n");
    fs.writeFileSync(path.join(root,'green-city.js'),"import './green-city-planning-ui.js';\n");
    fs.writeFileSync(path.join(root,'script.js'),"import('./green-city.js');\n");
    updateGameCache(root);const before=fs.readFileSync(path.join(root,'script.js'),'utf8');
    fs.appendFileSync(path.join(root,'green-city-planning.js'),'// changed\n');updateGameCache(root);
    const after=fs.readFileSync(path.join(root,'script.js'),'utf8');assert.notEqual(after,before);updateGameCache(root);assert.equal(fs.readFileSync(path.join(root,'script.js'),'utf8'),after);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

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

test('Arctic camera and renderer edits refresh the lazy story import transitively',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'coil-arctic-cache-'));
  try{
    fs.writeFileSync(path.join(root,'arctic-model.js'),'// camera one\n');
    fs.writeFileSync(path.join(root,'arctic-world.js'),'// renderer one\n');
    fs.writeFileSync(path.join(root,'arctic-story.js'),"import './arctic-model.js';import('./arctic-world.js');\n");
    fs.writeFileSync(path.join(root,'script.js'),"import('./arctic-story.js');\n");
    updateGameCache(root);const before=fs.readFileSync(path.join(root,'script.js'),'utf8');
    fs.appendFileSync(path.join(root,'arctic-model.js'),'// camera changed\n');updateGameCache(root);
    assert.notEqual(fs.readFileSync(path.join(root,'script.js'),'utf8'),before);
    const stable=fs.readFileSync(path.join(root,'script.js'),'utf8');updateGameCache(root);assert.equal(fs.readFileSync(path.join(root,'script.js'),'utf8'),stable);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
