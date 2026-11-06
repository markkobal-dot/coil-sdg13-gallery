# coil-sdg13-gallery

Spletna galerija o cilju trajnostnega razvoja **SDG 13 – Podnebni ukrepi** (projekt COIL).

Objavljena stran: https://markkobal-dot.github.io/coil-sdg13-gallery/#cilj

## Razdelitev dela

- **Student A:** Topic research, photography (6 photos), Picture editing, intro video
- **Student B:** Topic research, photography (6 photos), Gallery, intro video.
- **Together:** interactive quiz and survey, gallery development, testing and publication, Build Your Green City.

## Struktura

- `index.html` – struktura in vsebina
- `style.css` – oblikovanje
- `script.js` – galerija s filtri, kviz, anketa
- `images/dijakA`, `images/dijakB` – fotografije
- `videos/` – videoposnetki (večje objavita na YouTube kot Unlisted)

## Viri

- Vpišita uporabljene vire (Združeni narodi, ARSO, IPCC ...).

## Hiter prikaz vremenske primerjave

`assets/data/weather-snapshot.js` vsebuje resnične podatke Open-Meteo za vsa štiri mesta: sedemdnevno napoved in približno mesec zgodovinskih primerjav. Naloži se pred `evidence.js`, zato prvi prikaz ni odvisen od arhivskega API-ja. Brskalnik dodatno shrani prejete podatke, jih ohrani med osveževanjem in nove zahteve združuje. Datum primerjave sledi lokalnemu dnevu izbranega mesta, tudi ob vrnitvi na odprt zavihek.

GitHub Actions (`Refresh weather snapshot`) ob prvem pushu tega popravka in nato vsakih šest ur zažene `node scripts/update-weather.cjs`, shrani dosegljive nove podatke in zahteva novo gradnjo GitHub Pages. Zgodovinski arhiv se ponovno pridobi šele, ko manjka prihodnja pokritost. Ob napaki se zadnji veljavni podatki ohranijo; nepopolna prva priprava je vidna kot neuspešen Actions zagon. Workflow je namenjen obstoječi objavi Pages iz veje `main`; Actions in pisanje v vejo morata biti dovoljena. Razporedi GitHub Actions lahko zamujajo, zato napoved in arhiv vključujeta več prihodnjih dni.

Trenutno vreme se v brskalniku preverja vsakih 15 minut. Gumb Refresh takoj osveži napoved, pri čemer že znani zgodovinski zapis za isti datum ponovno uporabi. Pri nedosegljivem viru stran pokaže čas shranjenih podatkov. Ob prvem obisku po izteku vseh shranjenih podatkov je za nove meritve še vedno potreben dosegljiv API.

Preizkusi brez omrežja: `node --test tests/evidence-data.cjs tests/evidence-loading.cjs`.

## Build Your Green City / New Terra

Expanded city builder on `#game`: a 20 × 20 island (400 tiles), a procedural 3D city, and 21 building options in Nature, Energy, Travel and Community. The interface and game are in English. The rest of the gallery stays lightweight: the 3D renderer is loaded only when the game is opened.

### Play and controls

- Drag to pan, scroll/pinch to zoom, right-drag or use rotation buttons to orbit. The mini-map and Fit island button help navigate. Night view, grid toggle, heat/transit/power/resilience overlays and an expanded play view are available.
- Inspect, build, upgrade (up to level 3), relocate, remove for 50% salvage, and draw complete road paths. A road path commits atomically; blocked or unaffordable routes spend nothing. Road upgrades remain connected roads. Removing a transport upgrade restores its underlying plain road.
- Homes and public services need road access connected to the harbour entrance at **R11**. Roads that lose that connection stop serving housing and transit. Protected water cannot be built on.
- The city starts paused. **Next month** collects income, pays upkeep and grid power costs, and changes population based on connected housing, jobs and wellbeing. Play advances every 12 seconds; 3× advances every 4 seconds. Time and rendering stop while the page/game is hidden; reports and reset dialogs pause the simulation clock.
- Advance to month 3 or reach 35 sustainability to unlock advanced buildings; Creative mode starts with everything unlocked. Development grants are paid once per city. Undo/Redo also restore finances, grants, policies, events and monthly changes.
- Heatwaves, heavy rain and energy price spikes cycle every four months. Fund a full or basic council response, or prepare through city design. Taxes, fare-free transit and cleaner-industry standards affect the monthly balance and city indicators.
- Solar/green roofs retrofit existing buildings. Nature cools nearby homes, connected transit provides coverage, jobs support growth, renewable generation reduces imported-power costs, and coastal rain gardens offer more resilience. Scores, power units and costs are simplified teaching mechanics, not real emissions, prices or climate predictions.
- On phones, the catalogue and dashboard become drawers over the map. Keyboard: arrows select tiles, Enter applies the tool; I/B/R/U/M/X choose tools; Ctrl Z/Ctrl Y undo/redo; Escape cancels a route/move or exits expanded view. Row/column selectors provide precise placement without relying on 3D picking.

### Missions and saves

Green Revolution starts with **2,800 EP**; Low-Carbon City with **3,000 EP**; City of the Future with **4,200 EP**; Creative mode with **14,000 EP**. Monthly income and one-time grants support continued development. Mission goals are shown in the Goals dashboard and checked against the actual city state.

Expanded progress and the last 16 undo states are saved in `localStorage` under `coil-green-city-v2`. The earlier 6 × 6 save under `coil-green-city-v1` is left untouched. Export/Open city save transfers validated JSON files; imported saves start with an empty undo history. City photo exports a PNG from the 3D view. No account or game server is needed. If WebGL 2 is unavailable, a navigable planning grid retains all simulation/building tools. Reduced-motion settings stop decorative animation.

### Source and local development

- `green-city-core.js`: deterministic terrain, placement, connectivity, economics, growth, policies, events, grants, missions and save validation.
- `green-city-world.js`: procedural 3D models, batched geometry, terrain, water, shadows, traffic, camera, overlays and pointer picking.
- `green-city-art.js`: original SVG catalogue art and the lightweight Solutions teaser.
- `green-city.js` / `green-city.css`: interaction, local persistence, responsive interface and opt-in music.
- `assets/vendor/three/`: pinned **Three.js 0.187.0** plus OrbitControls and BufferGeometryUtils, with the MIT license and source attribution. Imports resolve locally; no runtime CDN is required. See [official installation documentation](https://threejs.org/manual/pages/installation.html).

Serve the repository over local HTTP; ES modules do not work reliably from `file://`. GitHub Pages can serve it without a build step. Tests: `node --test tests/green-city-core.cjs tests/evidence-data.cjs tests/evidence-loading.cjs`.

The tests cover all catalogue types, road connectivity and edges, atomic road paths, upgrades, moving, salvage, location effects, monthly finances, policy tradeoffs, one-time grants, climate responses, corrupted saves, bounded long-running games, and a legal winning plan for each mission. The weather regression checks remain included.
