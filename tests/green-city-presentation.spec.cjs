'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { chromium } = require('playwright');
const { createSiteServer } = require('../server.cjs');

test('Take action opens Harbour Green and its soundtrack plays', { timeout: 45000 }, async (t) => {
  const server = createSiteServer({ databasePath: ':memory:' });
  let browser;
  t.after(async () => {
    try {
      await browser?.close();
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROMIUM_PATH;
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
    args: ['--mute-audio']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(10000);
  await page.route('**/*', route => {
    const requestOrigin = new URL(route.request().url()).origin;
    return requestOrigin === origin ? route.continue() : route.abort();
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: 'Take action', exact: true }).click();
  await page.locator('#solutions').getByRole('link', { name: /Build your green city/ }).click();
  await page.getByRole('link', { name: /Open presentation city/ }).click();
  await page.waitForURL('**/?city=presentation#game');
  await page.locator('#gc-presentation-badge').waitFor({ state: 'visible' });
  await page.locator('#gc-loading').waitFor({ state: 'hidden' });

  assert.equal(await page.locator('#gc-title').innerText(), 'Harbour Green');
  assert.equal((await page.locator('#gc-overall').textContent()).trim(), '100/100');
  assert.equal(await page.locator('#gc-start-status').isVisible(), false);
  assert.equal(await navigation.getByRole('link', { name: 'Take action', exact: true }).getAttribute('aria-current'), 'page');

  await page.locator('.gc-settings > summary').click();
  const musicToggle = page.getByRole('button', { name: 'Music off', exact: true });
  await musicToggle.click();
  await page.waitForFunction(() => {
    const music = document.getElementById('gc-music');
    return music && !music.paused && music.currentTime > 0.1;
  });
  assert.equal(await page.getByRole('button', { name: 'Music on', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(pageErrors, []);
});
