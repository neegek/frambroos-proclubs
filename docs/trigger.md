# Betrouwbaar verzamelen in de avond

## Waarom

EA bewaart per club alleen de laatste 10 wedstrijden per type (league, playoff). Dat is ruim 3 uur
spelen. De verzamelaar moet dus minstens één keer per 3 uur draaien terwijl jullie spelen; wat na de
laatste run van de avond gespeeld wordt, pakt de eerste run van de volgende avond nog op.

GitHub's eigen planning (`schedule:` in de workflow) is daarvoor niet betrouwbaar genoeg. Een cron van
elk kwartier draaide in de praktijk maar om de 2 tot 5 uur. GitHub garandeert geen tijdstip en slaat
runs over als het druk is.

## De oplossing

1. **Hoofdtrigger: een externe cron-dienst** start de workflow elk halfuur tussen 19:30 en 01:00
   Nederlandse tijd via de GitHub-API. Zulke diensten draaien op de minuut.
2. **Reserve: GitHub's eigen cron**, één keer per uur in de avond (al ingesteld in
   `.github/workflows/collect.yml`).
3. **Waarschuwing**: als een run ziet dat alle 10 wedstrijden van een type nieuw zijn, kan er iets
   gemist zijn. Dat verschijnt als waarschuwing bij de run in de Actions-tab.

Waarom elk halfuur: een wedstrijd duurt met lobby zo'n 20 minuten (gemeten over 43 wedstrijden, oktober 2026).
Het meeste van één type binnen een uur was 4, binnen twee uur 8. Tien wedstrijden van één type kosten dus ruim
drie uur; een halfuur laat zes keer marge en houdt de site op speelavonden hooguit een halfuur achter.
Kosten: een run telt als één minuut; sinds de repo openbaar is (25 oktober 2026) zijn Actions-minuten gratis.

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
     - Minutes: `0, 30`
     - Hours: `19, 20, 21, 22, 23, 0` (plus één run om 1:00; 19:00 mag ook, dat is gewoon een run extra)
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

Tussen 19:30 en 01:00 hoort daar elk halfuur een `workflow_dispatch`-run te staan. Verloopt het
token, dan geeft cron-job.org een fout (401) en mailt het je.

## De site

Na elke run met nieuwe data publiceert `site.yml` de alleen-lezen app op https://neegek.github.io/frambroos-proclubs/.
De site laadt bij elke verversing de nieuwste `data.json`; EA zelf aanroepen kan een webpagina niet (EA weigert
verzoeken van andere websites, getest op 25 oktober 2026). Bij een push met codewijzigingen wordt de site ook opnieuw
gebouwd.
