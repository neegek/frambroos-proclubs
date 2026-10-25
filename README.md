# Frambroos Coach

De app staat online op https://neegek.github.io/frambroos-proclubs/ en wordt na elke verzamelrun bijgewerkt.

Verzamelt de wedstrijd- en spelersdata van Pro Clubs-club **Frambroos** (FC27, PS5) uit de
onofficiële EA-API en toont een dashboard met correlaties die de bestaande apps niet bieden.

## De app

`npm run dashboard` en open http://localhost:3737. Vier pagina's, via het menu links (op een
telefoon bovenaan):

- **Clubhouse** (startpagina): wie we zijn (logo, stadion, huidige en beste divisie, tenues), clubcijfers van EA,
  vorm, de gevaarlijkste spelers, een ranglijst per stat, de leden, wat opvalt en de beste tweetallen.
- **Sessies**: per speelavond de uitslag, de wedstrijden, wat opviel tegenover normaal en per speler wat er opviel.
- **Wedstrijden**: de lijst van alle wedstrijden per dag. Een klik opent de wedstrijdpagina (een laag dieper, met
  een terugknop): samenvatting, bij één doelpunt hoe de goal viel, beide opstellingen, wij tegen hen, en compacte
  spelerstabellen met *Alle cijfers* achter een knop.
- **Spelers**: direct per naam in het menu. Bovenaan een spelerskaart in FC27-stijl (foto's in `data/players/`).
  Daaronder drie tabbladen: Algemeen (samenvatting, aan de bal in context, sterk en zwak, wanneer het loopt),
  Vorm (laatste wedstrijd en per sessie) en Advies: genuanceerd buildadvies op basis van de wedstrijddata, met een
  ingeklapt formulier voor de eigen build (`data/builds.json`).

Standaard is de app donker, in de kleuren van het thuistenue (zwart, geel, paars). De knop
onderaan het menu wisselt naar licht, in de kleuren van het uittenue (wit, oranje, donkergroen); die
keuze wordt per browser onthouden. Alle tekst haalt WCAG AA (4,5:1), grafische elementen 3:1. Het
logo is het clubwapen uit het spel (`public/crest.png`, van EA's beeldserver).

Alle tekst op de pagina's wordt uit de data berekend en groeit mee met elke speelavond. Een
label (sterk, redelijk, zwak) zegt op hoeveel wedstrijden een inzicht rust.

## Waarom een verzamelaar?

EA geeft per club alleen de **laatste 10 wedstrijden** per type (league / playoff) terug.
Alles wat ouder is, is weg. Daarom draait `collect.js` elk kwartier en bewaart het nieuwe
wedstrijden in `data/proclubs.sqlite`. Hoe langer de verzamelaar draait, hoe rijker het dashboard.

## Waar draait de verzamelaar?

**In GitHub Actions** (`.github/workflows/collect.yml`), ook als je Mac uit staat. De cron vraagt
om elk kwartier, maar GitHub voert geplande workflows naar eigen inzicht uit: in de praktijk om de
2 tot 5 uur. Dat is meestal genoeg (EA bewaart 10 wedstrijden per type), maar bij een lange avond
kan de oudste wedstrijd wegvallen voordat er een run is. Daarom start een externe cron-dienst de workflow elk kwartier
tussen 19:00 en 02:00, met GitHub's eigen cron als reserve één keer per uur in de avond. Instellen:
zie [docs/trigger.md](docs/trigger.md).
Nieuwe wedstrijden worden als commit op `main` gezet in `data/proclubs.sqlite`. Dat is de bron
van waarheid. `npm run dashboard` haalt eerst de nieuwste database op (`npm run sync`, gooit
lokale wijzigingen aan de database weg) en start dan het dashboard.

De lokale launchd-planner is er ook nog (`npm run schedule:install`), maar gebruik niet beide
tegelijk: dan loopt je lokale database uit de pas met de repo en weigert `git pull`.
Let op: GitHub schakelt cron-workflows uit na 60 dagen zonder commits; de databasecommits
tellen mee, dus zolang jullie spelen blijft hij lopen.

## Gebruik

Vereist Node 22.5 of nieuwer (gebruikt de ingebouwde SQLite-module; geen `npm install` nodig).

```bash
npm run collect                 # haalt nieuwe wedstrijden op
npm run dashboard               # dashboard op http://localhost:3737
npm run schedule:install        # lokaal elk kwartier verzamelen (launchd), alleen zonder cloud
npm run schedule:uninstall      # planner weer weghalen
npm run find-club -- "Naam"     # club-ID opzoeken voor config.json
```

De lokale planner logt naar `data/collect.log` en draait alleen als de Mac wakker is.

## Structuur

- `config.json` – club-ID, platform, databasepad, poort.
- `src/ea.js` – API-client. Werkt alleen met Node's eigen `fetch`; curl krijgt 403.
- `src/db.js` – schema: `matches`, `match_clubs`, `player_match_stats` (beide teams),
  `member_snapshots`, `club_snapshots` (ook van tegenstanders, voor skill rating), `collect_runs`.
- `src/collect.js` – de verzamelaar.
- `src/server.js` – serveert `public/` en `/api/data`.
- `public/common.js` – gedeeld: zijmenu, data laden, verwachtingsmodel, grafieken, tabellen, teammaten.
- `public/team.js`, `sessies.js`, `wedstrijden.js`, `wedstrijd.js`, `spelers.js` – de pagina's Team, Sessies, Wedstrijden
  (lijst), Wedstrijd (detail) en Spelers.
- `public/builds.js` – het tabblad Advies op de spelerspagina; `src/server.js` bewaart de eigen builds in `data/builds.json`.
- Builds (`archetypeid` 1–13) staan in `public/common.js`, met als bron MeelanFC/FC-27-ClubsXI.
- `src/events.js` en `docs/event-codes.md` – de ontcijferde eventcodes.
- `src/sessions.js` – schrijft `docs/sessies.md`, dezelfde sessie-indeling als de Sessiepagina.

## Wat de API wél en niet geeft

Per speler per wedstrijd: goals, assists, schoten, passes (gemaakt/gepoogd), tackles, rating,
saves, clean sheets, rode kaarten, man of the match, positie (grof), speelseconden, archetype
en een gecodeerde event-string (`event_aggregate`). Die string is grotendeels ontcijferd: zie
[docs/event-codes.md](docs/event-codes.md) (codeboek met bewijs), `src/events.js` (`decodeEvents`) en
`npm run decode-events` (de analyse). Hij bevat o.a. passrichting en -lengte, schoten binnen/buiten de zestien,
gewonnen tackles, onderscheppingen, balwinst/-verlies per veldderde, gele kaarten, overtredingen en positiefeedback.
Niet beschikbaar: balbezit, xG, exacte positie, echte balcontacten.
