# Frambroos Pro Clubs tracker

Verzamelt de wedstrijd- en spelersdata van Pro Clubs-club **Frambroos** (FC27, PS5) uit de
onofficiële EA-API en toont een dashboard met correlaties die de bestaande apps niet bieden.

## Waarom een verzamelaar?

EA geeft per club alleen de **laatste 10 wedstrijden** per type (league / playoff) terug.
Alles wat ouder is, is weg. Daarom draait `collect.js` elk kwartier en bewaart het nieuwe
wedstrijden in `data/proclubs.sqlite`. Hoe langer de verzamelaar draait, hoe rijker het dashboard.

## Gebruik

Vereist Node 22.5 of nieuwer (gebruikt de ingebouwde SQLite-module; geen `npm install` nodig).

```bash
npm run collect                 # haalt nieuwe wedstrijden op
npm run dashboard               # dashboard op http://localhost:3737
npm run schedule:install        # elk kwartier automatisch verzamelen (launchd)
npm run schedule:uninstall      # planner weer weghalen
npm run find-club -- "Naam"     # club-ID opzoeken voor config.json
```

De planner logt naar `data/collect.log`. Draait alleen als de Mac aan is (slaapstand telt niet).

## Structuur

- `config.json` – club-ID, platform, databasepad, poort.
- `src/ea.js` – API-client. Werkt alleen met Node's eigen `fetch`; curl krijgt 403.
- `src/db.js` – schema: `matches`, `match_clubs`, `player_match_stats` (beide teams),
  `member_snapshots`, `club_snapshots` (ook van tegenstanders, voor skill rating), `collect_runs`.
- `src/collect.js` – de verzamelaar.
- `src/server.js` – serveert `public/` en `/api/data`.
- `public/app.js` – alle correlaties worden in de browser berekend; nieuwe analyses voeg je hier toe.

## Wat de API wél en niet geeft

Per speler per wedstrijd: goals, assists, schoten, passes (gemaakt/gepoogd), tackles, rating,
saves, clean sheets, rode kaarten, man of the match, positie (grof), speelseconden, archetype
en een gecodeerde event-string (`event_aggregate`, nog niet ontcijferd).
Niet beschikbaar: balbezit, xG, gele kaarten, exacte positie.
