# Betrouwbaar verzamelen in de avond

## Waarom

EA bewaart per club alleen de laatste 10 wedstrijden per type (league, playoff). Wat niet op tijd is opgehaald,
is weg. De verzamelaar moet dus vaker draaien dan de tijd die 10 wedstrijden van één type kosten, en dat de hele dag,
zodat het niet uitmaakt wanneer er gespeeld wordt.

Speeltempo, gemeten over 43 wedstrijden (oktober 2026): meestal 20 minuten tussen twee wedstrijden (wedstrijd plus
lobby), de snelste 10% binnen 17 minuten, één keer 5 minuten bij een opgave. De snelste reeks van één type was 8
wedstrijden binnen 2 uur (15 minuten per wedstrijd). Tien wedstrijden kosten dus op zijn snelst zo'n 2,5 uur, normaal
ruim 3 uur.

## De oplossing

1. **Hoofdtrigger: cron-job.org, elke 2 uur, de hele dag** (00:00, 02:00, … 22:00 Nederlandse tijd), via de
   GitHub-API. Tussen twee runs zitten hooguit zo'n 8 wedstrijden van één type, ook op het snelste tempo.
   12 runs per dag.
2. **Reserve: GitHub's eigen cron, elke 3 uur** (`47 */3 * * *`, in `.github/workflows/collect.yml`). Valt
   cron-job.org uit, dan is het gat nog steeds korter dan 10 wedstrijden.
3. **Waarschuwing**: ziet een run dat alle 10 wedstrijden van een type nieuw zijn, dan kan er iets gemist zijn. Dat
   verschijnt als waarschuwing bij de run in de Actions-tab.

De lokale app haalt bij openen zelf live op (`src/live.js`); de site wordt na elke run met nieuwe data opnieuw
gepubliceerd en start bij openen zelf een run (zie *Live op de site*), anders loopt hij hooguit twee uur achter. Kosten: geen, de repo is openbaar (Actions-minuten gratis).

## Instellen (ongeveer 5 minuten)

Ingesteld op 22 oktober 2026. Sinds 25 oktober 2026 staat de repo op het persoonlijke account **neegek** (werkaccount
N33G3K is collaborator). Het token moet daarom van **neegek** zijn: een fine-grained token kan alleen repo's van zijn
eigen account aansturen. Het oude token van N33G3K werkt niet meer. Het token van neegek is op 25 oktober 2026
verlengd tot **oktober 2027**, rond de release van de volgende FC. Maak dan een nieuw token
(zelfde instellingen) en vervang het in de header *Authorization* op cron-job.org.

### Stap 1: toegangstoken op GitHub

1. Ga naar https://github.com/settings/personal-access-tokens/new (Fine-grained token).
2. Naam: `frambroos-trigger`. Vervaldatum: bijvoorbeeld 1 jaar.
3. **Repository access**: *Only select repositories* → `neegek/frambroos-proclubs`.
4. **Permissions** → *Repository permissions* → **Actions: Read and write**. Verder niets.
5. Klik *Generate token* en kopieer het token. Je ziet het maar één keer.

Dit token kan alleen workflows in deze ene repo starten. Het kan geen code of data lezen of wijzigen.

### Stap 2: cron-job.org

1. Maak een gratis account op https://cron-job.org.
2. *Create cronjob*:
   - **Title**: `Frambroos verzamelen`
   - **URL**: `https://api.github.com/repos/neegek/frambroos-proclubs/actions/workflows/collect.yml/dispatches`
   - **Execution schedule** → *Custom*:
     - Minutes: `0`
     - Hours: `0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22`
     - Days of month, months, weekdays: alles
     - **Time zone: Europe/Amsterdam** (dan regelt de dienst zomer- en wintertijd)
3. Tabblad *Advanced*:
   - **Request method**: `POST`
   - **Headers**:
     - `Accept: application/vnd.github+json`
     - `Authorization: Bearer <je token>`
     - `X-GitHub-Api-Version: 2022-11-28`
     - `Content-Type: application/json`
   - **Request body**: `{"ref":"main"}`
4. Opslaan en *Test run* klikken. Het antwoord moet **204** zijn. Anders:
   - **401**: token ontbreekt of klopt niet (let op `Bearer` plus één spatie).
   - **404**: het token is geldig maar ziet de repo niet. Bij een privérepo zegt GitHub dan "Not Found". Controleer
     *Repository access* van het token en klik daar op **Save**; ook een GET in plaats van POST geeft 404.
   - **422**: de body is niet precies `{"ref":"main"}`.
5. Controleer in https://github.com/neegek/frambroos-proclubs/actions dat er een nieuwe run staat met
   als trigger *workflow_dispatch*.

### Controleren of het blijft werken

```bash
gh run list --workflow=collect.yml --limit 20
```

Elke 2 uur hoort daar een `workflow_dispatch`-run te staan, de hele dag. Verloopt het
token, dan geeft cron-job.org een fout (401) en mailt het je.

## De site

Na elke run met nieuwe data publiceert `site.yml` de alleen-lezen app op https://neegek.github.io/frambroos-proclubs/.
De site laadt bij elke verversing de nieuwste `data.json`; EA zelf aanroepen kan een webpagina niet (EA weigert
verzoeken van andere websites, getest op 25 oktober 2026). Bij een push met codewijzigingen wordt de site ook opnieuw
gebouwd.

## Live op de site

Zonder meer loopt de site tot twee uur achter (de tijd tussen twee runs). Daarom start de site bij openen of verversen
zelf een verzamelrun, via een kleine Cloudflare Worker (`worker/trigger.js`). Die bewaart het token, dat niet in de
openbare site mag. Wat er gebeurt:

1. De pagina toont meteen de opgeslagen data en vraagt de worker op de achtergrond om een run.
2. De worker start `collect.yml`, tenzij er al een loopt of de laatste minder dan 3 minuten geleden begon. Veel
   bezoekers tegelijk geven dus hooguit één run per 3 minuten.
3. Zolang de run loopt, staat bovenaan "Nieuwe wedstrijden worden bij EA opgehaald". Een run plus publicatie duurt
   ongeveer anderhalve minuut.
4. Is er iets nieuws, dan verschijnt "Eén nieuwe wedstrijd binnen. *Verversen*". Anders verdwijnt de melding en zegt
   het menu "bij EA gekeken 23:14".

Lukt de worker niet (niet ingesteld, Cloudflare of GitHub weg), dan werkt de site gewoon zoals eerst. Kosten: geen
(Cloudflare gratis: 100.000 verzoeken per dag; Actions-minuten gratis voor een openbare repo).

### Instellen (ongeveer 10 minuten)

1. **Token.** Maak een tweede fine-grained token van **neegek** met precies de instellingen uit stap 1 hierboven
   (naam `frambroos-site-trigger`, alleen deze repo, alleen *Actions: Read and write*). Een eigen token, zodat je het
   los van cron-job.org kunt intrekken.
2. **Cloudflare.** Maak een gratis account op https://dash.cloudflare.com. Dan, in deze repo op de Mac:
   ```bash
   cd worker
   npx wrangler login                 # opent de browser
   npx wrangler secret put GITHUB_TOKEN   # plak het token
   npx wrangler deploy                # geeft het adres, bijv. https://frambroos-trigger.<naam>.workers.dev
   ```
   (Zonder terminal kan het ook in het dashboard: *Workers & Pages* → *Create* → *Hello World*, de inhoud van
   `worker/trigger.js` erin plakken, *Deploy*, dan *Settings* → *Variables and Secrets* → `GITHUB_TOKEN` als *Secret*.)
3. **Controleren.** `curl -X POST <adres>` geeft `{"at":…,"started":true,…}` en in de Actions-tab staat een nieuwe
   run. Een tweede keer geeft `"started":false`.
4. **Aanzetten.** Zet het adres in `config.json` als `"liveTrigger": "https://frambroos-trigger.<naam>.workers.dev/"`,
   commit en push. De site wordt opnieuw gebouwd en start vanaf dan bij elk bezoek de verzamelaar.

Het token verloopt net als het andere; vervang het met `npx wrangler secret put GITHUB_TOKEN`.

De worker staat alleen verzoeken toe die de site kan lezen vanaf `https://neegek.github.io`. Iemand anders kan het
adres wel aanroepen, maar meer dan één run per 3 minuten levert dat niet op.

**Cache.** GitHub Pages laat browsers elk bestand 10 minuten bewaren (`cache-control: max-age=600`, niet aan te passen).
Daarom zet `src/export.js` een versie achter elk script en elke stijl (`common.js?v=…`) en haalt de site `data.json`
altijd vers op. Alleen de HTML-pagina zelf kan nog tot 10 minuten oud zijn; een gewone verversing daarna laadt alles nieuw.
