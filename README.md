# COIL SDG 13 Gallery

We are **Mark Kobal and Lovro Trošt**, students at **ERŠ Nova Gorica**.
Our COIL project explores **SDG 13 — Climate Action**, with a focus on
**rising temperatures in Slovenia**. Our mentor is **Elizaveta Galič**.

Website: https://markkobal-dot.github.io/coil-sdg13-gallery/

## Explore the project

- **Overview:** our local perspective, a sourced European temperature graph,
  selected photographs and links into the project.
- **The gallery:** 12 perspectives with category and media filters, photo
  credits and a keyboard-accessible image viewer.
- **The evidence:** an introduction to SDG 13, Slovenian temperature data,
  the Triglav Glacier and flood risk, with linked sources.
- **The story:** an illustrated neighbourhood that changes as the story develops.
- **Take action:** an interactive quiz, a browser-local poll and practical ideas.
- **Climate Mission:** a 2D neighbourhood game with shuffled questions and
  answers, keyboard/touch controls, optional sound and a results review.
- **About us:** our portraits, individual introduction videos and project process.

The destinations use URL fragments, so they work as a static GitHub Pages
project without a build system or server-side application. Browser back and
forward navigation are supported. Refreshing returns to the overview.

## Agreed division of work

| Contributor | Individual contribution |
| --- | --- |
| **Mark Kobal — Student A** | Topic research, photography (6 photos), picture editing and introduction video. |
| **Lovro Trošt — Student B** | Topic research, photography (6 photos), gallery and introduction video. |
| **Together** | Interactive quiz and survey, gallery development, testing and publication, and the 2D climate game. |

Each student uses their own GitHub account and records their own contributions
with clear commit messages. The shared work is maintained in one repository.

## Photography status

The current collection contains **six supplied photographs credited to Lovro**,
**three additional project photographs** and **three concept illustrations**.
Confirm the photographer credits for the three project photographs and replace
the remaining illustrations with original photographs before final submission.
Each student must contribute at least six original photographs. Illustrations
are not counted as original photographs.

Edit the matching objects in **gallery-data.js** when adding photographs:
update the image path, optional full-size image path, title, description,
category and photographer credit. Keep descriptions specific to what the
photograph actually shows.

Both portrait photographs and both introduction video links are included.
The videos load only when a visitor chooses to play them, and direct YouTube
links are also available.

## Files

| File or folder | Purpose |
| --- | --- |
| index.html | English content, accessible structure and all destinations |
| style.css | Base layout, story illustration and game components |
| editorial.css | Shared visual system, responsive layouts and collection viewer |
| gallery-data.js | The 12 gallery records and photo credits |
| script.js | Navigation, gallery, viewer, quiz, poll, story and video launchers |
| climate-game.js | The 2D game, questions, sound and mission review |
| assets/images/ | Photographs, responsive gallery copies and SVG illustrations |
| assets/images/team/ | Our portrait photographs |

No package installation or build step is required. Open index.html for a
local preview, or serve the folder with a static HTTP server. YouTube embeds
may require an HTTP/HTTPS origin; the direct YouTube links provide a fallback.

## Sources and credits

Sources are linked beside the relevant data and images on the website.

- United Nations, SDG 13: https://sdgs.un.org/goals/goal13
- IPCC, AR6 Synthesis Report: https://www.ipcc.ch/report/ar6/syr/
- ARSO climate summaries: https://meteo.arso.gov.si/met/sl/climate/current/climate_year/
- Copernicus European State of the Climate graphics:
  https://climate.copernicus.eu/esotc/2024/graphics-gallery/temperature
- GOV.SI, glacier and flood summaries (individual links are on the evidence page)
- Wikimedia Commons, historical glacier and flood-damage photographs
  (individual authors and licences are credited beside each image)

Published research imagery is separate from our own gallery photographs.

## Poll and performance

The poll stores votes **only in the current browser**. It is a demonstration,
not an aggregated public survey. It needs no account or external database.

Photographs use WebP copies, off-screen images load lazily, videos load on
request, and the game sound stops when its destination is hidden. The site
respects reduced-motion preferences.

## GitHub Pages

In the shared repository, choose **Settings → Pages → Deploy from a branch**,
then select **main** and **/(root)**. After saving changes locally, commit and
push them to update the published site.

Before submitting, add the remaining original photographs and check the
published site, image credits, video links and interactive activities.
