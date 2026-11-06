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

Expanded city builder on `#game`: a 28 × 28 island (784 tiles), a procedural 3D city, and 38 building options in Nature, Energy, Travel and Community. The interface and game are in English. The rest of the gallery stays lightweight: the 3D renderer is loaded only when the game is opened.

### Play and controls

- Drag to pan, scroll/pinch to zoom, right-drag or use rotation buttons to orbit. The mini-map and Fit island button help navigate. Night view, grid toggle, heat/transit/power/resilience overlays and an expanded play view are available.
- Inspect, build, upgrade (up to level 3), relocate, remove for 50% salvage, and draw complete road paths. A road path commits atomically; blocked or unaffordable routes spend nothing. Road upgrades remain connected roads. Removing a transport upgrade restores its underlying plain road.
- Homes and public services need road access connected to the regional gateway at **R11**. Roads that lose that connection stop serving housing and transit. Protected water cannot be built on.
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

### Fullscreen workspace, council inbox and city finance

The corner fullscreen button (or F) requests native browser fullscreen. If an embedded browser blocks it, the same interface uses an edge-to-edge focus view. Escape and the exit control restore the normal layout. Dialogs are mounted inside the fullscreen element. The interface uses system typography, consistent SVG controls, frosted floating panels and a tool dock. Ctrl/Cmd K opens a searchable command palette for all building options, tools, camera commands, saves, reports and time controls. Browser behavior follows the [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API).

Council decisions now pause automatic time and open a large briefing. Deferring leaves an inbox badge and notification; Next month or Play brings the unresolved decision back instead of advancing past it. Five situations (heat, rain, energy, housing and waste) each offer full, basic and explicit no-cost responses. Response costs and wellbeing/monthly-budget effects are shown before committing. A deferred decision is retained in the city save.

Open the budget through the treasury, budget icon or command palette. Residential tax (6–18%), business tax (5–18%), public transport fares (0–5 EP), utility prices (0–4 EP), service funding (70–140%) and cleaner-industry standards have a live, uncommitted forecast. Apply commits them as one undoable action. Higher taxes/prices affect wellbeing, jobs, ridership or consumption; service funding changes upkeep and service outcomes. Income and expense categories are listed separately. Construction purchase prices remain visible in the catalogue.

A development loan provides 1,000 EP and requires 1,080 EP in total, repaid at up to 90 EP per month. Only one loan may be active. It can be repaid early; unpaid amounts remain outstanding if the treasury cannot cover a payment. This is entirely game currency.

Existing expanded saves migrate old low/balanced/high tax and fare-free settings to explicit rates without losing the map, treasury or history. New rates and loan balances are validated on import. `green-city-experience.js` owns the workspace dialogs and command palette; `green-city-ui.css` contains the corresponding interface styles.

### Expanded building catalogue

The toolkit now has 31 build options: nine Nature, six Energy, seven Travel and nine Community. Illustrated cards show the purchase price and monthly upkeep separately; category counts and search help browse the expanded collection. The ten additions have original SVG catalogue art and procedural 3D models: urban orchard, adventure playground, sponge plaza, solar farm, geothermal plant, metro station, bike-share station, local food market, public library and clean-tech offices.

New items use the existing placement, upgrade, move, salvage, budget and save systems. Orchards provide food jobs and cooling; playgrounds and libraries reward proximity to homes; plazas add resilience. Solar farms use a land plot for 44 clean power units, while road-connected geothermal plants produce 60 at higher upkeep. Metros provide wider fare-paying transit coverage and count toward the future-city mission; bike-sharing supports active travel without adding fare revenue. Markets and clean-tech offices provide employment, with offices adding power demand. These are simplified educational game effects. Existing cities keep their map and finances.

### Resident pulse and regional infrastructure

The island now contains 784 tiles (655 land plots). Original 20 × 20 saves migrate by row and column: every building keeps its labelled location. The calendar, treasury, population, policies, loan, grants, journal and undo history are retained. Version 3 saves use `coil-green-city-v3`; the old `coil-green-city-v2` value is read only as a fallback and remains untouched. Exported version 2 files also migrate. Rows continue through AA and AB; camera picking, overlays, mini-map, keyboard navigation, road routes and the fallback grid use the shared map size.

Click the resident counter, city happiness card or command-palette entry for Resident pulse. Seven needs cover housing, jobs, essential services, a quiet environment, transport, community life and affordability. Three simulated household groups have different priorities. Their combined happiness affects monthly population growth; housing and employment still limit growth. The report includes current needs, practical build/budget actions and a population forecast. Happiness history begins with new monthly records; older sustainability values are never reused as happiness data. Home inspection shows local healthcare, emergency coverage, services, shade and noise.

Seven additions bring the total catalogue to 38: regional airport, cargo harbour, electric ferry dock, waterfront marina, fire and rescue station, hospital and community sports centre. Airports occupy 3 × 2 plots; cargo harbours, marinas and sports grounds occupy 2 × 2. Placement is atomic, requires every plot to be clear land, and checks road access along the perimeter. Ports must touch coastal water. Occupied footprint plots belong to one root building: costs, jobs, upkeep, grants, upgrades, relocation, salvage and save validation count it once. One airport is allowed per island. Water stays protected.

Airports and cargo harbours provide employment and regional income while using power, lowering air quality and creating noise near homes. Marinas provide visitor income and leisure, and ferries add paid public-transport coverage. Disconnected infrastructure keeps its maintenance cost but loses its operating benefits. The city-budget ledger lists regional income separately. Hospitals and emergency services improve nearby household needs. All values remain simplified educational game rules.

Rendering retains batched static meshes and instanced ground/overlays, a bounded traffic population, and a 30 fps animation target. Up to 24 wind rotors animate; extra rotors are batched with static geometry. Individual residents are represented by household groups. This follows the [Three.js guidance on merging geometry](https://threejs.org/manual/pages/optimize-lots-of-objects.html). A local simulation-only stress check of a fully occupied island with 641 root structures and 3,500 residents averaged about 2.6 ms per analysis update; graphics performance varies by device. Regression coverage includes legacy migration, multi-plot placement/movement/validation, coastline rules, airport noise, resident needs, growth and history.
