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

## Build Your Green City

Igra na `#game` nadomešča prejšnjo igro Climate Mission. Gre za izometrično, potezno mini igro v angleščini: 36 polj, devet nadgradenj in pet kazalnikov. Ne potrebuje strežnika, računa ali zunanjih slik; izvirne stavbe, vozila in zelenje so narisani s SVG.

- `green-city-core.js`: pravila, proračun, dovoljene postavitve, kazalniki in preverjanje shranjene igre.
- `green-city-art.js`: izometrični prikaz in ponovni prikaz mesta na strani Solutions.
- `green-city.js` in `green-city.css`: upravljanje, prilagodljiv vmesnik, poročilo, lokalno shranjevanje in glasba.

Green Revolution in Low-Carbon City začneta s 1.000 EP. City of the Future ima 1.800 EP, saj samo pet parkov, tri sončne strehe in E-Bus stanejo 1.230 EP. Nadgradnje se postavljajo na ustrezne površine: zelenje na prosta polja, strehe na stavbe in promet na ceste. Ponavljanje ima manjši učinek; sosednje kolesarske steze, senca ob stavbah in povezave med obnovljivo energijo ter električnim prometom prinesejo dodatne točke. To so poenostavljeni učni kazalniki, ne realne emisije ali stroški.

Napredek in zgodovina potez se samodejno shranita v `localStorage` pod `coil-green-city-v1`, samo v trenutnem brskalniku. Undo vrne celotno ceno zadnje poteze. Nova misija ali novo mesto po začetku gradnje zahteva potrditev. Če shranjevanje ni omogočeno, igra deluje do zaprtja strani. Na telefonu so poleg dotika na voljo veliki gumbi za premik izbranega polja in gradnjo. Tipkovnica: Tab do zemljevida, smerne tipke za premik, Enter ali preslednica za gradnjo. Animacije spoštujejo nastavitev zmanjšanega gibanja.

Preizkusi pravil in dosegljivosti vseh misij: `node --test tests/green-city-core.cjs`.
