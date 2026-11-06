# coil-sdg13-gallery

Spletna galerija o cilju trajnostnega razvoja **SDG 13 – Podnebni ukrepi** (projekt COIL).

Objavljena stran: https://markkobal-dot.github.io/coil-sdg13-gallery/#cilj

## Razdelitev dela

- **Student A:** Topic research, photography (6 photos), Picture editing, intro video
- **Student B:** Topic research, photography (6 photos), Gallery, intro video.
- **Together:** interactive quiz and survey, gallery development, testing and publication, 2D climate game.

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
