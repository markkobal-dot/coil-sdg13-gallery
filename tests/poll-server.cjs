'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSiteServer } = require('../server.cjs');

async function start(options) {
  const server = createSiteServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url:`http://127.0.0.1:${server.address().port}` };
}
async function stop(server) { await new Promise(resolve => server.close(resolve)); }
async function submit(url, voter, choice, headers = {}) {
  return fetch(url + '/api/poll', {
    method:'POST', headers:{'Content-Type':'application/json', ...headers},
    body:JSON.stringify({voter, choice})
  });
}

test('independent voters share totals, retries are idempotent, and edits move a vote', async () => {
  const {server,url} = await start({databasePath:':memory:'});
  try {
    assert.deepEqual(await (await fetch(url+'/api/poll')).json(), {counts:{Shade:0,'Cool spaces':0,Buildings:0},total:0});
    await Promise.all(Array.from({length:30},(_,i) => submit(url,i.toString(16).padStart(64,'0'), ['Shade','Cool spaces','Buildings'][i%3])));
    let data=await (await fetch(url+'/api/poll')).json();
    assert.deepEqual(data, {counts:{Shade:10,'Cool spaces':10,Buildings:10},total:30});
    await Promise.all(Array.from({length:10},() => submit(url,'0'.repeat(64),'Shade')));
    assert.equal((await (await fetch(url+'/api/poll')).json()).total,30);
    data=await (await submit(url,'0'.repeat(64),'Buildings')).json();
    assert.deepEqual(data.counts,{Shade:9,'Cool spaces':10,Buildings:11});
    assert.equal(data.total,30);
    const own=await (await fetch(url+'/api/poll',{headers:{'X-Poll-Key':'0'.repeat(64)}})).json();
    assert.equal(own.choice,'Buildings');
    const absent=await (await fetch(url+'/api/poll',{headers:{'X-Poll-Key':'f'.repeat(64)}})).json();
    assert.equal(absent.choice,null);
  } finally { await stop(server); }
});

test('votes survive server restarts, and storage keeps no raw browser keys', async () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'coil-poll-test-'));
  const databasePath=path.join(directory,'poll.sqlite');
  let instance;
  try {
    instance=await start({databasePath});
    const voter='a'.repeat(64);
    await submit(instance.url,voter,'Shade');
    await stop(instance.server); instance=null;
    instance=await start({databasePath});
    assert.equal((await (await fetch(instance.url+'/api/poll')).json()).counts.Shade,1);
    const {DatabaseSync}=require('node:sqlite');
    const db=new DatabaseSync(databasePath);
    const record=db.prepare('SELECT * FROM heat_votes').get();
    assert.deepEqual(Object.keys(record),['voter_hash','choice']);
    assert.notEqual(record.voter_hash,voter);
    db.close();
  } finally {
    if(instance)await stop(instance.server);
    assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('coil-poll-test-'));
    fs.rmSync(directory,{recursive:true,force:true});
  }
});

test('invalid, cross-origin and oversized submissions cannot change totals', async () => {
  const {server,url}=await start({databasePath:':memory:'});
  try {
    assert.equal((await submit(url,'bad','Shade')).status,400);
    assert.equal((await submit(url,'b'.repeat(64),'Invalid choice')).status,400);
    assert.equal((await submit(url,'b'.repeat(64),'Shade',{Origin:'https://other.example'})).status,403);
    assert.equal((await fetch(url+'/api/poll',{method:'POST',body:'choice=Shade'})).status,415);
    assert.equal((await fetch(url+'/api/poll',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(2200)})).status,413);
    assert.equal((await fetch(url+'/api/poll',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
    assert.equal((await fetch(url+'/api/poll')).headers.get('cache-control'),'no-store');
    assert.equal((await (await fetch(url+'/api/poll')).json()).total,0);
  } finally { await stop(server); }
});

test('only public website files are served; Git, database and server source stay private', async () => {
  const {server,url}=await start({databasePath:':memory:'});
  try {
    for(const file of ['/','/index.html','/script.js','/assets/brand/favicon.svg']) {
      assert.equal((await fetch(url+file)).status,200,file);
    }
    for(const file of ['/.git/config','/.local-data/poll.sqlite','/server.cjs','/tests/poll-server.cjs','/package.json','/assets/%2e%2e%5c.git/config']) {
      assert.equal((await fetch(url+file)).status,404,file);
    }
    assert.equal((await fetch(url+'/',{method:'HEAD'})).status,200);
  } finally { await stop(server); }
});
