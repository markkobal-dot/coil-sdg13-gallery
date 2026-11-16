'use strict';
// Local classroom host: one durable poll shared by every device using this server.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const choices = ['Shade', 'Cool spaces', 'Buildings'];
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.woff2':'font/woff2' };

function createSiteServer({ root = __dirname, databasePath = path.join(__dirname, '.local-data', 'poll.sqlite') } = {}) {
  if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), { recursive:true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS heat_votes (
      voter_hash TEXT PRIMARY KEY,
      choice TEXT NOT NULL CHECK(choice IN ('Shade', 'Cool spaces', 'Buildings'))
    );`);
  const count = db.prepare('SELECT choice, COUNT(*) AS count FROM heat_votes GROUP BY choice');
  const vote = db.prepare('INSERT INTO heat_votes (voter_hash, choice) VALUES (?, ?) ON CONFLICT(voter_hash) DO UPDATE SET choice=excluded.choice');
  const ownVote = db.prepare('SELECT choice FROM heat_votes WHERE voter_hash=?');
  const rootFiles = new Set(fs.readdirSync(root).filter(file => /\.(html|css|js|ico)$/.test(file)));
  function results() {
    const counts = Object.fromEntries(choices.map(choice => [choice, 0]));
    for (const row of count.all()) counts[row.choice] = row.count;
    return { counts, total:choices.reduce((sum, choice) => sum + counts[choice], 0) };
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify(body));
    };
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { return json(400, { error:'Invalid URL.' }); }
    if (url.pathname === '/api/poll') {
      if (req.method === 'GET') {
        const key = req.headers['x-poll-key'];
        if (key && !/^[a-f0-9]{64}$/.test(key)) return json(400, {error:'Invalid voting key.'});
        return json(200, key ? {...results(), choice:ownVote.get(crypto.createHash('sha256').update(key).digest('hex'))?.choice || null} : results());
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return json(405, { error:'Method not allowed.' }); }
      // A shared host accepts votes only from its own page, never cross-origin forms.
      if (req.headers.origin) {
        let sameOrigin = false;
        try { sameOrigin = new URL(req.headers.origin).host === req.headers.host; } catch {}
        if (!sameOrigin) return json(403, { error:'Use the poll on this website.' });
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') return json(403, { error:'Use the poll on this website.' });
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return json(415, { error:'Send a JSON answer.' });
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 2048) return json(413, { error:'Answer is too large.' });
        }
        const answer = JSON.parse(body);
        if (!answer || !choices.includes(answer.choice) || !/^[a-f0-9]{64}$/.test(answer.voter || '')) return json(400, { error:'Choose a valid poll answer.' });
        // No names, IP addresses or timestamps are saved. Store a hash of the random browser key.
        vote.run(crypto.createHash('sha256').update(answer.voter).digest('hex'), answer.choice);
        return json(200, { ...results(), choice:answer.choice });
      } catch (error) {
        return json(error instanceof SyntaxError ? 400 : 500, { error:'The answer could not be saved. Please try again.' });
      }
    }
    if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error:'Method not allowed.' });
    let relative;
    try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'; } catch { return json(400, { error:'Invalid path.' }); }
    // Serve website assets only; never expose Git metadata, tests, server source or the database.
    const parts = relative.split(/[\\/]/);
    const extension = path.extname(relative).toLowerCase();
    const allowed = !parts.some(part => part.startsWith('.') || !part) &&
      (parts.length === 1 ? rootFiles.has(relative) : parts[0] === 'assets' && Boolean(mime[extension]));
    const file = path.resolve(root, relative);
    if (!allowed || !file.startsWith(path.resolve(root) + path.sep)) return json(404, { error:'Not found.' });
    try {
      const real = await fs.promises.realpath(file);
      if (!real.startsWith(path.resolve(root) + path.sep)) return json(404, { error:'Not found.' });
      const data = await fs.promises.readFile(real);
      res.writeHead(200, { 'Content-Type':mime[extension] || 'application/octet-stream', 'Cache-Control':'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { json(404, { error:'Not found.' }); }
  });
  server.requestTimeout = 10000;
  server.on('close', () => db.close());
  return server;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const host = args.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
  const port = Number(process.env.PORT || 4173);
  const server = createSiteServer();
  server.listen(port, host, () => {
    console.log(`Local: http://127.0.0.1:${port}/`);
    if (host === '0.0.0.0') {
      for (const interfaces of Object.values(require('node:os').networkInterfaces())) {
        for (const item of interfaces || []) if (item.family === 'IPv4' && !item.internal) console.log(`Same network: http://${item.address}:${port}/`);
      }
    }
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createSiteServer };
