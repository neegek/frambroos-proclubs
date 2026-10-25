# Frambroos Coach

Tracker en coach-app voor de FC27 Pro Clubs-club Frambroos (PS5, clubId 837250). Eigenaar: Jamal (speler **Neegek**).
Alle teksten in de app zijn Nederlands.

## Persoonlijk project, los van werk

Dit is een persoonlijk project van Jamal, helemaal van scratch. Het heeft **niets** met Jamals werk te maken.
Gebruik hier geen werk-skills, -plugins of -connectors (design system, UX-copy, prototype-toolbar, publisher,
Smartcat, realistic content, manager personas, Piwik, Figma-structuur), geen huisstijl, content of
conventies van het werk, en geen werkaccounts. `.claude/settings.local.json` zet die skills, de claude.ai-plugins en de
claude.ai-connectors in deze map uit. Alle stijl, logica en teksten komen uit dit project zelf (zie hieronder).

## Lees eerst

- **`docs/coach-logica.md`**: hoe de coach denkt. Maatstaven, drempels, afwegingen per thema, labels en schrijfregels.
  Elke wijziging aan analyse, advies of samenvattingen begint daar: eerst het document, dan de code.
- `docs/archetypes.md`: wat we over FC27-archetypes weten (AP-kosten, masteries, signature PlayStyles, EA-patch),
  met bron en datum per gegeven. Bij een nieuwe EA-update eerst daar bijwerken, dan `public/archetypes.js`.
- `docs/event-codes.md`: betekenis van de EA-eventcodes. `docs/trigger.md`: hoe en wanneer de verzamelaar draait.

## Draaien

```bash
npm run dashboard   # haalt eerst de nieuwste database van GitHub, dan http://localhost:3737 (live)
npm run collect     # handmatig verzamelen (normaal doet GitHub Actions dit)
npm run export      # statische, alleen-lezen kopie in dist/ (om te delen)
```

Geen `npm install` nodig (Node 22.5+, ingebouwde SQLite). De browserpreview heet `dashboard` in `.claude/launch.json`.
Na een wijziging in `src/server.js` of `src/data.js` de server herstarten; voor `public/` volstaat herladen.

**Live.** Bij het openen of verversen van de lokale app haalt de server de nieuwste wedstrijden bij EA op
(`src/live.js`), in een tijdelijke kopie van de database: de echte database verandert nooit. Het resultaat wordt een
minuut bewaard; lukt het niet binnen 10 seconden, dan toont de app de opgeslagen data en zegt dat in het menu.
Nog niet opgeslagen wedstrijden krijgen `live: true` en een melding bovenaan. Opslaan blijft het werk van de
verzamelaar in GitHub Actions; de verzamellogica zelf staat in `src/collector.js` (gedeeld door beide).
`/api/data?live=0` geeft alleen de opgeslagen data. De gedeelde versie (artifact) kan niet live ophalen: die mag
geen andere sites aanroepen.

**Delen.** De gedeelde versie is de site op GitHub Pages: https://neegek.github.io/frambroos-proclubs/ (openbaar voor
wie het adres kent). `.github/workflows/site.yml` bouwt hem met `npm run export` na elke verzamelrun met nieuwe data en
bij elke push met codewijzigingen; niets met de hand publiceren. In de export staat `window.FRAMBROOS_STATIC`: data uit
`data.json` naast de pagina (bij elke verversing opnieuw geladen) en geen buildformulier. Links en paden in `public/`
zijn daarom altijd relatief (`spelers.html#naam`, nooit `/spelers.html`), en data laden gaat altijd via `API` uit
`public/common.js`. De repo is openbaar: zet er nooit tokens, wachtwoorden of andere geheimen in.

## Data

- De database `data/proclubs.sqlite` wordt beheerd door de cloudverzamelaar (GitHub Actions) en via git gedeeld.
  **Commit nooit een lokaal gewijzigde database**; `npm run sync` gooit lokale wijzigingen weg en haalt de nieuwste op.
- `data/builds.json` bevat de eigen builds die spelers invullen. Wel committen.
- `data/players/<slug>.<webp|png|jpg>` zijn de foto's op de spelerskaarten. Jamal levert ze aan via de chat; zet ze
  er zelf in. Slug = naam in kleine letters, niet-letters/cijfers worden `-` (bijv. `neegek`, `xero-023`). Verklein
  tot maximaal 900 px aan de lange kant, bij voorkeur WebP of PNG met transparante achtergrond. Wel committen.
  Zonder foto toont de kaart een icoon, geen silhouet. De app heeft geen uploadknop. Test nooit met nepwaarden in dit bestand;
  maak vooraf een kopie en zet die terug.
- Wat EA niet geeft (formatie, exacte positie, "Any", attribuutpunten, AI-spelers): zie coach-logica §2. Niet verzinnen.

## Afspraken

- Balverlies en risico altijd in context: zes vragen en één oordeel per speler (coach-logica §4a), gedeeld door de
  kaart *Aan de bal in context* en het advies (`ballContext` in `public/builds.js`). Hoe lastig ontvangen passes
  zijn meet EA niet; "geen goede optie" is de benadering en heet *lastige balmomenten*.
- Advies en samenvattingen: volg coach-logica §1, §8 en §9. Kort gezegd: verder kijken dan één cijfer, twee richtingen,
  build bepaalt wat goed is, iedereen dezelfde opbouw, samenvattingen kwalitatief in drie of vier zinnen.
- Over spelers geen *hij* of *zij*.
- Attribuutnamen in het Engels zoals in het spel (Ball Control, Short Passing, ...); de rest van de app in het Nederlands.
- Stijl: donker thuistenue (standaard) en licht uittenue; tokens staan bovenaan `public/style.css`. Nieuwe kleuren eerst
  op contrast controleren: tekst ≥ 4,5:1, grafische elementen ≥ 3:1. Datakleuren (winst blauw, verlies rood) niet aanpassen.
- Opbouw: het menu is een zwevende kaart (afgeronde hoeken, eigen schaduw `--float`) los van de paginarand; op
  telefoon (≤ 600 px) is het één balk onderin met de vier tabbladen met labels en de themaknop; geen tweede balk
  bovenaan. Tablet: één balk bovenaan. Alleen het menu heeft de paarse gloed (`--side-bg`), zonder kleurenbies.
  Kaarten, tegels en sessie-items zijn effen donkerpaars (`--panel`) met dezelfde rand (`--panel-border`) en
  schaduw als het menu; in het uittenue wit. Pagina's zijn een strak raster van kaarten met 12 px tussenruimte. Titel en
  filters staan op één rij (filters rechts). Op het Clubhouse komt eerst wie we zijn, dan de KPI-tegels. Een
  grafiekkaart toont zijn kerncijfers rechts in de kop via `figsHtml(...)` uit `public/common.js`, niet als legenda.
- Kaartjes (geïnspireerd op FC Clubs, in eigen stijl): één wedstrijd is één `matchCard(m, {own, player})` uit
  `public/common.js` in een `.match-cards`-raster (op telefoon horizontaal swipebaar); een sessie begint met één kop
  met zes vaste cijfers (`.sess-figs`, coach-logica §9a) en een deelknop; de spelerspagina heeft vier kaartjes
  (Highlights, Precisie, Frambroos-index met balkjes, Impact); de ranglijst op het Clubhouse is een rij
  `.rank-card`-kaartjes met de top vier, een tik opent de hele lijst; de leden staan in dezelfde swipebare rij.
  Geen tabellen waar een kaartje volstaat.
- Weinig tekst op het eerste gezicht: een uitlegregel (`p.hint` direct onder een kaarttitel) is standaard verborgen
  achter de i-knop in de titel (`hintToggles` in `public/common.js`). Houd zo'n regel op één zin. Samenvattingen
  blijven zichtbaar; die zijn de kern.
- Dashboardstijl: rustige kaarten met een dunne rand en geen zware schaduw; kaarttitel ingetogen met een korte uitleg
  achter de i-knop; filters als pil-knoppen met icoon (`data-icon` op `.filter`); grote cijfers in `--num-font`.
- KPI-tegels altijd via `kpiTile(label, waarde, regel, deltaOf(...))` uit `public/common.js`. De badge toont een
  verandering: groen beter, rood slechter, grijs gelijk, met een `title` die zegt waartegen. Clubhouse: laatste speelavond
  tegenover de avonden daarvoor. Sessie: deze avond tegenover normaal. Speler: met tegenover zonder deze speler.
- Lijngrafieken: vloeiend (monotone spline), hoofdlijn met `area: true` voor een zachte vlakvulling, geen vaste
  stippen (alleen bij hover). Klassenamen in componenten specifiek houden (bijv. `.pitch-line`, niet `.line`).
- Menu: Clubhouse (startpagina, coach-logica §9a), Sessies, Wedstrijden, Spelers (in- en uitklapbaar, met de namen
  eronder). Geen aparte analysepagina. De app is bewust eenvoudig: liever één duidelijke kaart dan drie tabellen.
- Spelerspagina: drie tabbladen (Algemeen, Vorm, Advies). Samengevoegde kaarten tonen hooguit drie punten per kant;
  spelerstabellen zijn compact, met *Alle cijfers* achter een knop.
- Spelerspagina begint met de spelerskaart (`public/playercard.js`): FC-vorm met een tier die met de vorm meebeweegt
  (goud, zwart-goud bij *in vorm*, topvorm; coach-logica §9c; kleuren los van het thema), met foto of
  silhouet, overall, ingestelde positie, laatst gespeelde build en zes cijfers (seizoen, of face stats uit de ingevulde
  build). Ernaast alleen wat níét op de kaart staat (pro, taak, builds, signature, vorm, carrière). Geen dubbele info:
  wat op de kaart staat, komt niet terug in tegels of teksten eronder. Geen clubnaam- of FC27-teksten op de kaart.
- Wedstrijden is alleen de lijst; een wedstrijd opent op `/wedstrijd.html?id=<matchId>` (een laag dieper) met
  "Terug naar wedstrijden" bovenaan. Link naar wedstrijden altijd via dat adres.

## Controleren na een wijziging

Altijd voor **alle** spelers, en elke zin lezen tegen de cijfers ernaast. Plak dit in de console op
`/spelers.html` (of draai het via de browsertool):

```js
const out = {};
for (const a of document.querySelectorAll('#player-nav a')) {
  location.hash = a.getAttribute('href').split('#')[1]; await new Promise(r => setTimeout(r, 250));
  out[decodeURIComponent(location.hash.slice(1))] = {
    algemeen: document.querySelector('#p-summary').innerText,
    advies: document.querySelector('#b-summary').innerText,
    punten: [...document.querySelectorAll('#b-problems > li.adv-item')].map(li => li.innerText.replace(/\n+/g, ' | ')),
  };
}
out
```

Controleer ook: geen fouten in de console, licht en donker, en telefoonbreedte (375, 390 en 430 px, iPhone mini tot
Pro Max) zonder horizontaal scrollen en zonder overlappende grafieklabels. Tikvlakken op telefoon minstens 40 px;
grafiektooltips openen ook met een tik.

## Git

Commitberichten in het Nederlands. Na controle committen en pushen naar `main` op github.com/neegek/frambroos-proclubs.
De repo is openbaar en van het persoonlijke account **neegek**; het werkaccount N33G3K is collaborator. Op deze Mac is
N33G3K het standaardaccount, maar **deze map gebruikt neegek**: git heeft hier een eigen credential helper
(`gh auth token --user neegek`) en commit als neegek. Voor `gh`-opdrachten in dit project:
`GH_TOKEN=$(gh auth token --user neegek) gh ...`. Nooit `gh auth switch` gebruiken; dan verandert het hele systeem.
