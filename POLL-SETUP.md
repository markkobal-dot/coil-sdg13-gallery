# Shared classroom poll

Use Node.js 24 or later. No packages or accounts are required.

- On this computer: run `npm start`, then open the printed Local URL.
- For classmates on the same Wi-Fi: run `npm run start:lan`. Everyone must open the **same printed Same network URL**, including the presenter. Keep the host running. A guest network may block communication between devices.

The server hosts the website and `/api/poll`. Votes are stored durably in `.local-data/poll.sqlite`, which Git ignores. Back up that directory if the results matter. Restarting the server preserves votes.

Each browser stores a random voting key and its selected answer. Re-submitting updates that browser's vote; it does not add another vote. The database stores only a hash of that key and the chosen option. It does not store names, IP addresses or timestamps. This is a classroom opinion poll, not identity verification: another browser or clearing local storage permits another vote.

Results show actual shared totals and percentages. They refresh after voting, on request, and every 30 seconds while the results are visible. Old browser-only demo votes are not imported.

Opening `index.html` directly, using a static preview server, or GitHub Pages alone does **not** run the poll API. The page clearly reports when shared voting is unavailable. For voting across unrelated networks, the Node server needs an HTTPS host with persistent storage; that has not been published or configured. Do not put credentials or the vote database in GitHub.
