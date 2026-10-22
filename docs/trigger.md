# Betrouwbaar verzamelen in de avond

## Waarom

EA bewaart per club alleen de laatste 10 wedstrijden per type (league, playoff). Dat is ruim 3 uur
spelen. De verzamelaar moet dus minstens één keer per 3 uur draaien terwijl jullie spelen; wat na de
laatste run van de avond gespeeld wordt, pakt de eerste run van de volgende avond nog op.

GitHub's eigen planning (`schedule:` in de workflow) is daarvoor niet betrouwbaar genoeg. Een cron van
elk kwartier draaide in de praktijk maar om de 2 tot 5 uur. GitHub garandeert geen tijdstip en slaat
runs over als het druk is.

## De oplossing

1. **Hoofdtrigger: een externe cron-dienst** start de workflow elk kwartier tussen 19:00 en 02:00
   Nederlandse tijd via de GitHub-API. Zulke diensten draaien op de minuut.
2. **Reserve: GitHub's eigen cron**, één keer per uur in de avond (al ingesteld in
   `.github/workflows/collect.yml`).
3. **Waarschuwing**: als een run ziet dat alle 10 wedstrijden van een type nieuw zijn, kan er iets
   gemist zijn. Dat verschijnt als waarschuwing bij de run in de Actions-tab.

Kosten: een run duurt minder dan een minuut en telt als één minuut. 28 externe runs plus hooguit
8 reserveruns per avond is ongeveer 1.100 minuten per maand. Een privérepo op een gratis GitHub-account
heeft 2.000 minuten per maand.

## Instellen (ongeveer 5 minuten)

### Stap 1: toegangstoken op GitHub

1. Ga naar https://github.com/settings/personal-access-tokens/new (Fine-grained token).
2. Naam: `frambroos-trigger`. Vervaldatum: bijvoorbeeld 1 jaar.
3. **Repository access**: *Only select repositories* → `N33G3K/frambroos-proclubs`.
4. **Permissions** → *Repository permissions* → **Actions: Read and write**. Verder niets.
5. Klik *Generate token* en kopieer het token. Je ziet het maar één keer.

Dit token kan alleen workflows in deze ene repo starten. Het kan geen code of data lezen of wijzigen.

### Stap 2: cron-job.org

1. Maak een gratis account op https://cron-job.org.
2. *Create cronjob*:
   - **Title**: `Frambroos verzamelen`
   - **URL**: `https://api.github.com/repos/N33G3K/frambroos-proclubs/actions/workflows/collect.yml/dispatches`
   - **Execution schedule** → *Custom*:
     - Minutes: `0, 15, 30, 45`
     - Hours: `19, 20, 21, 22, 23, 0, 1`
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
4. Opslaan en *Test run* klikken. Het antwoord moet **204** zijn.
5. Controleer in https://github.com/N33G3K/frambroos-proclubs/actions dat er een nieuwe run staat met
   als trigger *workflow_dispatch*.

### Controleren of het blijft werken

```bash
gh run list --workflow=collect.yml --limit 20
```

Tussen 19:00 en 02:00 hoort daar elk kwartier een `workflow_dispatch`-run te staan. Verloopt het
token, dan geeft cron-job.org een fout (401) en mailt het je.
