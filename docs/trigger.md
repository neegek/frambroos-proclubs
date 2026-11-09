# Betrouwbaar en snel verzamelen

## Waarom

EA bewaart per club alleen de laatste 10 wedstrijden per type (league, playoff). Wat niet op tijd is opgehaald,
is weg. De verzamelaar moet dus vaker draaien dan de tijd die 10 wedstrijden van één type kosten, en dat de hele dag,
zodat het niet uitmaakt wanneer er gespeeld wordt.

Speeltempo, gemeten over 43 wedstrijden (oktober 2026): meestal 20 minuten tussen twee wedstrijden (wedstrijd plus
lobby), de snelste 10% binnen 17 minuten, één keer 5 minuten bij een opgave. De snelste reeks van één type was 8
wedstrijden binnen 2 uur (15 minuten per wedstrijd). Tien wedstrijden kosten dus op zijn snelst zo'n 2,5 uur, normaal
ruim 3 uur.

## De oplossing

1. **Hoofdtrigger: cron-job.org, twee taken** (Nederlandse tijd), via de GitHub-API:
   - **Speelavond**: elke 10 minuten van 18:00 tot en met 00:50. Nieuwe wedstrijden staan dan binnen zo'n
     10 minuten (plus een minuut bouwen) op de site. 42 runs.
   - **Rest van de dag**: elke 2 uur, 02:00 tot en met 16:00. Tussen twee runs zitten hooguit zo'n 8 wedstrijden van
     één type, ook op het snelste tempo. 8 runs.

   Samen 50 runs per dag van elk zo'n 15 seconden. Sinds 27 oktober 2026; daarvoor elke 2 uur de hele dag.
2. **Reserve: GitHub's eigen cron, elke 3 uur** (`47 */3 * * *`, in `.github/workflows/collect.yml`). Valt
   cron-job.org uit, dan is het gat nog steeds korter dan 10 wedstrijden.
3. **Waarschuwing**: ziet een run dat alle 10 wedstrijden van een type nieuw zijn, dan kan er iets gemist zijn. Dat
   verschijnt als waarschuwing bij de run in de Actions-tab.

De lokale app haalt bij openen zelf live op (`src/live.js`); de site wordt na elke run met nieuwe data opnieuw
gepubliceerd en loopt 's avonds hooguit zo'n 10 minuten achter, overdag hooguit twee uur; met de worker start de site bij openen zelf een run (zie *Live op de site*). Kosten: geen. cron-job.org
is gratis (draait op donaties) en stuurt alleen een klein verzoek naar GitHub; GitHub Actions is gratis en onbeperkt
voor openbare repo's. EA krijgt per run twee kleine verzoeken. Lege runs schrijven niets weg en bouwen de site niet.

## Site loopt achter

Op 5 november 2026 om 22:50 werd de wedstrijd tegen House of aces wel opgeslagen, maar bleef GitHub Pages hangen bij het
publiceren; de deploy werd na 5 minuten afgebroken. Latere runs vonden geen nieuwe wedstrijden en bouwden de site dus
niet, waardoor de site die wedstrijd miste tot de volgende speelavond. Sindsdien:
- vergelijkt elke run de nieuwste wedstrijd in de database met die in `data.json` op de site (`siteUrl` in
  `config.json`). Loopt de site achter, dan bouwt de run hem opnieuw, ook zonder nieuwe data (`stale` in
  `collect.yml`). Een mislukte deploy herstelt zich zo bij de volgende run, binnen 10 minuten op een speelavond;
- mag de deploy 12 minuten duren in plaats van 5.

## Melding bij problemen

Sinds 7 november 2026 sluit elke run af met de stap *alert* in `collect.yml`. Die meldt problemen als issue in deze
repo; daar krijgt neegek een mail van (GitHub stuurt issues standaard naar wie de repo volgt).
- **Mogelijk wedstrijden gemist**: waren alle 10 wedstrijden van een type nieuw (`missed` uit `src/collector.js`), dan
  komt er meteen een issue, of een reactie op het issue dat al openstaat. Dat sluit niemand automatisch: kijk in de
  Actions-tab of er runs zijn uitgevallen, en sluit het daarna zelf.
- **Runs mislukken**: pas bij drie mislukte (of afgebroken) runs op rij een issue, want een losse hapering bij EA of
  GitHub Pages herstelt de volgende run zelf. 's Avonds is dat na een halfuur, overdag na een paar uur. De eerste run
  die weer lukt, sluit het issue met een link.

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
2. *Create cronjob* (taak *Rest van de dag*):
   - **Title**: `Frambroos verzamelen`
   - **URL**: `https://api.github.com/repos/neegek/frambroos-proclubs/actions/workflows/collect.yml/dispatches`
   - **Execution schedule** → *Custom*:
     - Minutes: `0`
     - Hours: `2, 4, 6, 8, 10, 12, 14, 16`
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
6. Taak *Speelavond*: kloon de taak (dan gaan URL, headers en body mee) en noem hem `Frambroos speelavond`, met
   *Execution schedule* → *Custom*: Minutes `0, 10, 20, 30, 40, 50`, Hours `18, 19, 20, 21, 22, 23, 0`, zelfde
   tijdzone. Overlappen twee runs toch, dan wacht de tweede (`concurrency` in `collect.yml`) en vindt niets nieuws.

### Controleren of het blijft werken

```bash
gh run list --workflow=collect.yml --limit 20
```

Tussen 18:00 en 01:00 hoort daar elke 10 minuten een `workflow_dispatch`-run te staan, de rest van de dag elke 2 uur. Verloopt het
token, dan geeft cron-job.org een fout (401) en mailt het je.

## De site

Na elke run met nieuwe data publiceert `site.yml` de alleen-lezen app op https://neegek.github.io/frambroos-proclubs/.
De site laadt bij elke verversing de nieuwste `data.json`; EA zelf aanroepen kan een webpagina niet (EA weigert
verzoeken van andere websites, getest op 25 oktober 2026). Bij een push met codewijzigingen wordt de site ook opnieuw
gebouwd.

## Live op de site

Zonder meer loopt de site 's avonds tot 10 minuten en overdag tot twee uur achter (de tijd tussen twee runs). Daarom start de site bij openen of verversen
zelf een verzamelrun, via een kleine Cloudflare Worker (`worker/trigger.js`). Die bewaart het token, dat niet in de
openbare site mag. Wat er gebeurt:

1. De pagina toont meteen de opgeslagen data en vraagt de worker op de achtergrond om een run.
2. De worker start `collect.yml`, tenzij er al een loopt of de laatste minder dan 3 minuten geleden begon. Veel
   bezoekers tegelijk geven dus hooguit één run per 3 minuten.
3. Zolang de run loopt, pulseert er zacht een bolletje bij de versheid in het menu en op de menuknop (geen melding
   meer, sinds 9 november 2026). Een run plus publicatie duurt ongeveer anderhalve minuut.
   Niet steeds opnieuw: is de data op de pagina jonger dan vijf minuten, of heeft deze browser in de laatste vijf
   minuten al gekeken (op welke pagina ook, onthouden in de browser), dan vraagt de site niets. Loopt er nog een run
   die een andere pagina volgde, dan volgt de nieuwe pagina die stil verder in plaats van een nieuwe te vragen.
4. Is er iets nieuws, dan verschijnt "Eén nieuwe wedstrijd binnen. *Verversen*". Anders verdwijnt de melding en zegt
   het menu "bij EA gekeken 23:14".
5. Startte de worker geen run (net al gekeken), dan kijkt de pagina toch of er op de site nieuwere data staat dan op
   de pagina, bijvoorbeeld van een run die een ander startte, en toont dan *Verversen*.
6. Kom je terug naar een tabblad dat open bleef (een telefoon herlaadt dan niet) of via de vorige-knop, dan begint
   het opnieuw bij stap 1, hooguit eens per twee minuten (`liveAgain` in `public/common.js`).

Nieuwe wedstrijden telt de pagina op tijdstip, niet op aantal: in de modus *League* of *Playoff* staan er minder
wedstrijden op de pagina dan in `data.json`.

Lukt de worker niet (niet ingesteld, Cloudflare of GitHub weg), dan werkt de site gewoon zoals eerst. Kosten: geen
(Cloudflare gratis: 100.000 verzoeken per dag; Actions-minuten gratis voor een openbare repo).

### Instellen (ongeveer 10 minuten)

1. **Token.** Maak een tweede fine-grained token van **neegek** met precies de instellingen uit stap 1 hierboven
   (naam `frambroos-site-trigger`, alleen deze repo, alleen *Actions: Read and write*). Een eigen token, zodat je het
   los van cron-job.org kunt intrekken.
2. **Cloudflare.** Maak een gratis account op https://dash.cloudflare.com. De Worker heet **`frambroos-proclubs`**
   (gelijk aan `name` in `worker/wrangler.toml`) en is gekoppeld aan deze GitHub-repo (Workers Builds, 7 november 2026).
   Bij *Settings* → *Build*:
   - **Root directory**: `worker`. Zonder dit zoekt Cloudflare in de hoofdmap, vindt geen `wrangler.toml`, houdt
     `public/` voor een statische site en probeert `npx hugo` te draaien ("could not determine executable to run").
   - **Deploy command**: `npx wrangler deploy`. Geen build command.
   - **Build watch paths**: alleen `worker/*`, anders bouwt Cloudflare bij elke datacommit (tientallen per dag).
   Dan *Settings* → *Variables and Secrets* → `GITHUB_TOKEN` als **Secret** (bij de Worker zelf, niet bij de
   buildvariabelen). Het adres staat bij *Domains & Routes*, bijv. `https://frambroos-proclubs.<naam>.workers.dev`.
   (Zonder koppeling met GitHub kan het ook vanaf de Mac: `cd worker`, `npx wrangler login`,
   `npx wrangler secret put GITHUB_TOKEN`, `npx wrangler deploy`.)
3. **Controleren.** `curl -X POST <adres>` geeft `{"at":…,"started":true,…}` en in de Actions-tab staat een nieuwe
   run. Een tweede keer geeft `"started":false`.
4. **Aanzetten.** Zet het adres in `config.json` als `"liveTrigger": "https://frambroos-proclubs.<naam>.workers.dev/"`,
   commit en push. De site wordt opnieuw gebouwd en start vanaf dan bij elk bezoek de verzamelaar.

Het token verloopt net als het andere; vervang het in het dashboard (*Variables and Secrets*) of met
`npx wrangler secret put GITHUB_TOKEN`.

De worker staat alleen verzoeken toe die de site kan lezen vanaf `https://neegek.github.io`. Iemand anders kan het
adres wel aanroepen, maar meer dan één run per 3 minuten levert dat niet op.

**Cache.** GitHub Pages laat browsers elk bestand 10 minuten bewaren (`cache-control: max-age=600`, niet aan te passen).
Daarom zet `src/export.js` een versie achter elk script en elke stijl (`common.js?v=…`) en haalt de site `data.json`
altijd vers op. Alleen de HTML-pagina zelf kan nog tot 10 minuten oud zijn; een gewone verversing daarna laadt alles nieuw.
