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
- `public/personas.js`: wie de pro's zijn (achtergrond, stem) en hun cruijffiaanse uitspraken per thema. Nieuwe
  eigenschappen van een speler daar opslaan; verhalen en zinnen over spelers bouwen daarop.
- `docs/ea-data.md`: alles wat EA geeft (en niet geeft, zoals logo's van tegenstanders), en wat al in `DATA` zit.

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
`public/common.js`. Bij openen start de site via een Cloudflare Worker (`worker/trigger.js`, adres als `liveTrigger` in
`config.json`) een verzamelrun en biedt na afloop *Verversen* aan als er iets nieuws is (docs/trigger.md, *Live op de
site*). De repo is openbaar: zet er nooit tokens, wachtwoorden of andere geheimen in; het token van de worker staat
alleen in Cloudflare.

## Data

- De database `data/proclubs.sqlite` wordt beheerd door de cloudverzamelaar (GitHub Actions) en via git gedeeld.
  **Commit nooit een lokaal gewijzigde database**; `npm run sync` gooit lokale wijzigingen weg en haalt de nieuwste op.
- `data/builds.json` bevat de eigen builds die spelers invullen. Wel committen.
- `data/players/<slug>.<webp|png|jpg>` zijn de foto's op de spelerskaarten. Jamal levert ze aan via de chat; zet ze
  er zelf in. Slug = naam in kleine letters, niet-letters/cijfers worden `-` (bijv. `neegek`, `xero-023`). Verklein
  tot maximaal 900 px aan de lange kant, bij voorkeur WebP of PNG met transparante achtergrond. Wel committen.
  Een tweede foto `<slug>-vorm.<ext>` is de vormfoto: die staat op de kaart bij *in vorm* en *topvorm*.
  Zonder foto toont de kaart een icoon, geen silhouet. De app heeft geen uploadknop. Test nooit met nepwaarden in dit bestand;
  maak vooraf een kopie en zet die terug.
- Wat EA niet geeft (formatie, exacte positie, "Any", attribuutpunten, AI-spelers): zie coach-logica §2. Niet verzinnen.

## Afspraken

- Balverlies en risico altijd in context: zes vragen en één oordeel per speler (coach-logica §4a), gedeeld door de
  kaart *Aan de bal in context* en het advies (`ballContext` in `public/builds.js`). Hoe lastig ontvangen passes
  zijn meet EA niet; "geen goede optie" is de benadering en heet *lastige balmomenten*.
- Advies en samenvattingen: volg coach-logica §1, §8 en §9. Kort gezegd: verder kijken dan één cijfer, twee richtingen,
  build bepaalt wat goed is, iedereen dezelfde opbouw, samenvattingen kwalitatief in drie of vier zinnen.
- Kleur van de plek (coach-logica §9c): bij kaartjes met `rank` volgen rand en, bij een gewone kaart (tier goud), ook het
  vlak de plek: goud, zilver, brons, leigrijs voor de rest (`faceOf` in `playercard.js`); in vorm en topvorm houden hun vlak.
- `public/pack.js`: rangorde van een avond (`sessionRanking`, `roleOf`), de quote (`sessionQuote`), de pack-reveal (`playReveal`, `packOnLoad`) en de sessiekaart (`sessionCardHtml`); geladen door sessie, sessielijst en Club. In het menu heet de startpagina *Club*.
- Horizontaal scrollen in een kaart: de rij loopt tot de rand van de kaart (negatieve marge en binnenruimte van `--px`),
  niet afgesneden door de binnenruimte. Tegenstanders met logo via `oppBadge(m.opponent)` (terugval: shirt).
- Dialogen: sluitknop vast rechtsboven, onderaan een vaste balk met een rustige knop naar een andere pagina en eventueel
  vorige/volgende met portret (`dialogFoot(d, href, label, { prev, next })` in `common.js`).
- Plek op een avond: op het exacte gemiddelde; bij precies gelijk beslist de rolmaat (`roleOf` in `sessie.js`), pas dan een gedeelde plek (`r.place`).
- Een naam bij een spelerskaart(je) staat ín het kaartje (`label` bij `PlayerCard.tiny`), niet eronder.
- Namen voluit zoals EA ze geeft (Petra Selie, niet P. Selie); te lang: afkappen met …, nooit zelf afkorten.
- Over spelers geen *hij* of *zij*. Waar de app over onze spelers praat of ze noemt (samenvattingen, nieuws, ranglijsten,
  menu, knoppen), staat de **naam van de pro** (Terry Yaki), niet de accountnaam (Neegek): `proName(naam)` uit
  `public/common.js`. Links en hashes houden de accountnaam; tegenstanders houden hun EA-naam.
- Getallen overal met **één decimaal** (`f1`); sorteren op het exacte getal. Groei via `fmtGrowth`/`growthCell`: één
  decimaal, zonder ",0" bij een heel getal, zonder het woord *groei* (coach-logica §9).
- Attribuutnamen in het Engels zoals in het spel (Ball Control, Short Passing, ...); de rest van de app in het Nederlands.
- Stijl: donker thuistenue (standaard) en licht uittenue; tokens staan bovenaan `public/style.css`. Nieuwe kleuren eerst
  op contrast controleren: tekst ≥ 4,5:1, grafische elementen ≥ 3:1. Datakleuren (winst blauw, verlies rood) niet aanpassen.
- Opbouw: het menu is één zwevende balk **bovenaan** (afgeronde hoeken, eigen schaduw `--float`) los van de
  paginarand, met logo, de vier tabbladen met labels, de versheid van de data en de menuknop (zoeken, modus, rating,
  thema; coach-logica §9a, *Menu*); op telefoon (≤ 600 px) is het één balk onderin met de vier tabbladen (Wedstrijden
  heet daar *Games*, lange labels worden afgekapt) en de menuknop; geen tweede balk bovenaan. Alleen het menu heeft de paarse gloed (`--side-bg`), zonder kleurenbies.
  Kaarten, tegels en sessie-items zijn effen donkerpaars (`--panel`) met dezelfde rand (`--panel-border`) en
  schaduw als het menu; in het uittenue wit. Pagina's zijn een raster van kaarten met 20 px tussenruimte (16 px op telefoon). Titel en
  filters staan op één rij (filters rechts). Het Clubhouse heeft geen paginatitel maar een hero (stadion,
  groot logo, skill rating en divisie, de laatste 10 als rondjes zonder label), dan *Seizoen*, één nieuwskaart en de
  rest (coach-logica §9a). Niet alles hoeft benoemd te worden: geen labels die het beeld al zegt. Een
  grafiekkaart toont zijn kerncijfers rechts in de kop via `figsHtml(...)` uit `public/common.js`, niet als legenda.
- Kaartjes (geïnspireerd op FC Clubs, in eigen stijl): één wedstrijd is één `matchCard(m, {own, player})` uit
  `public/common.js` in een `.match-cards`-raster (op telefoon horizontaal swipebaar), behalve op de pagina
  Wedstrijden: die is één lijst van `matchRow`-regels, nieuwste eerst, met de beste speler per wedstrijd. Sessies
  begint met een `.scard` per avond (datum, W-G-V, goals, team rating, tijdlijn met
  uitslagen en shirts, speler van de sessie met de portretfoto (`PlayerCard.portrait`, ook bij in vorm) of een icoon in een rondje in de kleuren van de vorm; nergens de duur van een avond); een tik opent
  `sessie.html?id=<datum>` (bijv. `?id=2026-11-01`, via `sessionHref(s)`; eigen pagina, een laag dieper, zonder terugknop; geen tabblad actief).
  Een sessie begint met één kaart met een split (`.sess-stage`, coach-logica §9a): boven het beeld (`.ss-visual`) op
  het stadion (`stadiumSvg()` in `common.js`, vaste kleuren) met gele regel, naam van de sessie, de quote van de beste
  speler (`sessionQuote`: per sessie nieuw, over de statistiek die uitstak, uit `personas.js`) en de top drie als `PlayerCard.tiny` naast elkaar (geen podium; één in het midden, groter;
  plek als medaille en naam via `label` in het kaartje; geen kroon; een tik opent `openPlayer`: de speler over de
  avond met radar en tabel); geen gele regel; op telefoon de titel afgekort (*Don 29 okt*) met links en rechts ervan
  ronde knoppen naar de vorige en volgende sessie (`.ss-nav`, alleen als die bestaat); onder een paneel (`.ss-panel`, themakleuren) met W-G-V, Goals en
  Tegen (rechts uitgelijnd), rechts op dezelfde regel een ingetogen deelknop met menu (afbeelding delen of downloaden, afbeelding
  kopiëren, gegevens kopiëren als tekst),
  en de wedstrijden als scrollbare `matchCard`-rij. Daaronder *In het kort* (`takeaways`/`takeawaysHtml` in `common.js`,
  coach-logica §9: hooguit één min en één plus, elk één korte cruijffiaanse zin, geen tussenkopjes; dezelfde kaart op
  de wedstrijdpagina). De deelafbeelding
  (`shareSession`) tekent dezelfde kop; dan *Zo speelden we*: de radar met alle vlakken zichtbaar, standaard het team het felst, aantallen als totaal van de
  avond, assen Rating, Scoren, Creëren, Passen, Dribbelen, Verdedigen met uitleg achter de knop *Assen*; een tik op een naam licht die speler uit, nog een tik zet hem uit (eerst de knop *Team*); dan *Per wedstrijd* (`renderMatrix`: kolommen spelers met een minikaartje (foto, gemiddelde, naam in het kaartje, kleur van de plek zonder medaille; geen normaal), rijen
  wedstrijden, cellen in goud/zilver/brons/ijzer naar de plek in die rij, een tik op een cel opent `#cell-dialog` met wat de speler die wedstrijd deed; *Spelers deze sessie* is weg, de kaarten
  bewaard in `sessionCardsHtml` voor een later FUT-pack; de tabel licht niet op bij aanraken). De radar (`renderRadar`
  in `public/sessie.js`): assen als percentiel tegenover onze eigen avonden, onder elke astitel de waarde en ons normaal.
  Metaalkleuren (goud/zilver/brons/ijzer: `.metal-*`/`.rim-*`) zijn vlak met een zachte glans, geen felle verlopen; de spelerspagina heeft drie kaartjes
  (Highlights met per wedstrijd en precisie naast elkaar, Frambroos-index met balkjes, Resultaat met deze speler); de ranglijst op het Clubhouse
  (*Algemeen*) is een rij van vier `.rank-card`-kaartjes (carrière volgens EA) met per stat **alle** spelers, zonder knop voor meer; een tik op een kaartje opent geen speler maar het uitlegscherm van die ranglijst (`#rank-dialog`: waar de score
  op gebaseerd is, wie meetelt, de hele lijst); de leden (*Selectie*) staan in een swipebare rij als kleine spelerskaarten, gesorteerd op vorm. Nieuws: één artikel per
  sessie (`public/news.js`, coach-logica §9a); het Clubhouse toont het nieuwste als één `.news-item`-kaart, de pagina
  `nieuws.html` (een laag dieper, "Terug naar Clubhouse") toont ze allemaal. Een sessie toont de top drie van de avond als waaier van kleine
  spelerskaarten (`.podium`), met een anekdote en een Cruijff-quote in plaats van een tekst over wie de beste was.
  Geen tabellen waar een kaartje volstaat.
- Sessie bezig of nog niet geopend (coach-logica §9a, *Sessie bezig en de reveal*): `sessionLive(s)` en
  `revealPending(s, sessions)` uit `public/common.js`. Bezig: alleen wedstrijden en uitslag, alle ranglijsten dicht.
  De nieuwste sessie krijgt na afloop één keer per kijker een pack-reveal (`playReveal` in `public/sessie.js`).
  Rechtsboven in de kop van de nieuwste sessie, op de plek van *volgende sessie*, de vasthoudknop (`packHoldBtn` in
  `public/pack.js`): 0,7 s ingedrukt houden speelt de reveal, ook tijdens de avond. Geopend is geopend: daarna is de sessie open en werkt
  alles bij; dicht is alleen bezig én nog niet geopend (`sessionSealed(s)`).
- Biografie per speler: `bio` in `public/personas.js` (Jamal levert de tekst; verhaal, feiten, quotes en stem
  bouwen erop), op de spelerspagina als ingeklapt kaartje onder de spelerskaart.
- Verbanden: eerst toetsen volgens coach-logica §9e (per mens, wij min zij, gecorrigeerd voor sterkte en mensen,
  Benjamini-Hochberg, herhaling in twee helften). Ranglijstkaartjes tonen altijd alle spelers (`rankCards(el, cards,
  roster)`; zonder getal onderaan met een streepje). Trofeeën zijn voorwerpen (subtiele gouden schaal, `PLATE` in `clubhouse.js`), geen kaartjes.
  Sterkteverschil altijd via `gapOf(m, own)` (onze rating van toen, `m.ownRating`), nooit met de rating van nu.
- Een laag dieper (sessie, wedstrijd, rivalen, nieuws, spelersprofiel): geen tabblad actief in het menu.
- Geen vage verbanden: *Wat opvalt*, *Beste tweetallen*, *Wanneer het loopt*, *Patronen*, *Opvallend* (sessie) en
  *Impact* zijn op 27 oktober 2026 weggehaald (coach-logica §9d). Een nieuw verband eerst in coach-logica uitwerken.
- Compact: kaarten 16 × 18 px binnenruimte, tegels 12 × 16 px, paginatitel 26 px met hooguit één korte regel eronder.
  Lange lijsten tonen eerst een handvol (bijv. de laatste acht wedstrijden van een speler) met de rest achter een knop
  (`.more-btn`). Geen tegel die herhaalt wat het menu al zegt (zoals het aantal gevolgde wedstrijden).
- Weinig tekst op het eerste gezicht: een uitlegregel (`p.hint` direct onder een kaarttitel) is standaard verborgen
  achter de i-knop in de titel (`hintToggles` in `public/common.js`). Houd zo'n regel op één zin. Samenvattingen
  blijven zichtbaar; die zijn de kern.
- Dashboardstijl: rustige kaarten met een dunne rand en geen zware schaduw; kaarttitel ingetogen met een korte uitleg
  achter de i-knop; filters als pil-knoppen met icoon (`data-icon` op `.filter`); grote cijfers in `--num-font`.
- KPI-tegels altijd via `kpiTile(label, waarde, regel, deltaOf(...))` uit `public/common.js`. De badge toont een
  verandering: groen beter, rood slechter, grijs gelijk, met een `title` die zegt waartegen. Sessie: deze avond tegenover normaal. Speler: met tegenover zonder deze speler.
- Lijngrafieken: vloeiend (monotone spline), hoofdlijn met `area: true` voor een zachte vlakvulling, geen vaste
  stippen (alleen bij hover). Klassenamen in componenten specifiek houden (bijv. `.pitch-line`, niet `.line`).
- Menu: Clubhouse (startpagina, coach-logica §9a), Sessies, Wedstrijden, Spelers. De spelers staan in de selectie (lijst) en
  op een profiel in het keuzemenu bovenaan, niet in het menu. Op het Clubhouse staat boven *Topspelers* de kaart *Algemeen* (`renderGeneral`: rating, man of the match en goals + assists over de carrière volgens EA, groot totaal en klein per wedstrijd). Het Clubhouse heeft geen KPI-tegels maar één kaart *Seizoen*:
  eerst *In het kort* (`.kort`: drie regels in woorden, coach-logica §9a), dan de totalen zonder badges
  (`.totals-band`) en de vormgrafiek (staafjes per wedstrijd plus één lijn: doelsaldo over vijf), met twee kerncijfers
  via `figsHtml` in de kop. Geen "verwacht" of "tov ons" op de startpagina. Geen aparte analysepagina. De app is bewust eenvoudig: liever één duidelijke kaart dan drie tabellen.
- *Spelers* opent de selectie (`renderSquad` in `spelers.js`, met de AI onderaan); `spelers.html#<accountnaam>` is het
  profiel, met een keuzemenu (`#p-pick`) om te wisselen, geen pillen.
- Spelerspagina (coach-logica §9a): zonder tabbladen, filters, samenvatting en *Algemeen* (dat staat op de kaart);
  altijd over alle gevolgde wedstrijden. Kaart met alleen de vorm eronder; *Cijfers* in vier losse kaarten
  (`.stat-groups`: Aanvallen, Passen, Verdedigen, Discipline) met per regel de speler (kop: pro-naam) en de club, elk
  groot het totaal en klein het getal per wedstrijd (zonder die woorden); ervoor een rondje met de plek onder onze
  spelers (`.rank-dot` in metaalkleur, per wedstrijd, gedeelde plek bij gelijk getal); een tik op een regel opent de
  ranglijst van die maat in `#rank-dialog` (bij gelijk getal beslist het totaal, bij EA waar EA het heeft); de speler
  groen als beter dan de club, rood als slechter; *Groei* (eerder volgens EA tegenover nu, alleen gekleurd als het
  beduidend is); de laatste acht wedstrijden. Advies, *Aan de bal in context* en het buildformulier staan voorlopig niet op de pagina (code blijft in
  `builds.js`).
- Laden: elke pagina heeft `.skel`-vlakken in de containers die de render vervangt, `html.loading` (gezet door
  `loadData`) toont een lijntje bovenaan, en foto's (kaarten en rondjes, `img.fade-img`) faden pas in als ze geladen
  zijn, in 0,3 s via `PlayerCard.reveal(container)` na elke render; geen laadanimatie voor foto's.
- Spelerspagina begint met de spelerskaart (`public/playercard.js`): FC-vorm met een tier die met de vorm meebeweegt
  (goud, zwart-goud bij *in vorm*, topvorm; coach-logica §9c; kleuren los van het thema), met foto of
  silhouet, overall, vlag, ingestelde positie, laatst gespeelde build en zes cijfers (seizoen, of face stats uit de ingevulde
  build) en onderaan een klein label bij *in vorm* of *topvorm*. Ernaast alleen wat níét op de kaart staat (pro,
  taak, builds, signature, vorm, carrière). Geen dubbele info:
  wat op de kaart staat, komt niet terug in tegels of teksten eronder. Geen clubnaam- of FC27-teksten op de kaart.
  De **vorm is per sessie** (coach-logica §9c): de tier van nu komt uit de laatste sessie met minstens drie eigen
  wedstrijden, niet uit de laatste vijf. Dezelfde kaart staat klein in de ledenrij op het Clubhouse (`PlayerCard.html(naam)`
  in een `.fut-mini`); `index.html` en `sessies.html` laden daarvoor `playercard.js`. `PlayerCard.tier(naam)` geeft
  de tier voor sorteren en samenvattingen. Per sessie heeft elke speler een **sessiekaart**
  (`PlayerCard.html(naam, { session, rank })`: tier, foto en zes cijfers van die avond; met rank een buitenrand in goud,
  zilver, brons of ijzer naar de plek op rating, de binnenrand blijft goud), in de top drie (en later het FUT-pack). Waar het over één speler gaat, staat de vorm als **reeks van één sessie** met per wedstrijd de rating
  (`ratingDots(rows)` uit `public/common.js`): onder de kaart op de spelerspagina.
  Alleen de hero op het Clubhouse houdt de laatste tien uitslagen van de club.
- Bij een sessie staat op de sessiekaart linksboven de plek op rating in een medaille in de kleur van de
  buitenrand in plaats van de overall (`rank` in `PlayerCard.html`; op telefoon zonder archetype, logo en vlag). De wedstrijdpagina toont de opstelling als één veld met
  beide teams (`lineup(m)` in `public/wedstrijd.js`): elke speler een rondje (bij ons het portret via
  `PlayerCard.portrait`, bij de tegenstander het archetype-icoon) met de rating eronder; per linie het aantal mensen,
  per team het aantal AI-spelers (`m.ai`). Liggend op een groot scherm; vanaf 900 px de teams naast elkaar in vier
  vlakken onder elkaar. `wedstrijd.html` laadt daarvoor `playercard.js`. AI per linie geeft EA niet.
- Favoriet: één speler per browser (`favorite()`/`setFavorite()` in `public/common.js`, localStorage), te kiezen met de
  ster rechtsboven in het vlak van de spelerskaart; opent standaard bij *Spelers*, staat vooraan bij de namen en in de Selectie. Opnieuw tekenen
  bij een andere breedte gaat via `onWidthChange(fn)`, nooit via een kale resize (adresbalk op telefoon).
- Wedstrijden is de lijst (eerst twintig, de rest achter een knop) met filters type (Alles, League, Playoff, Vriendschappelijk)
  en uitslag, en een knop *Rivalen* naar `rivalen.html` (een laag dieper): eerst *Waar we verliezen* (winst% per kenmerk
  van de tegenstander, coach-logica §9a), dan elke club waar we vaker dan één keer tegen speelden; een tik opent `#rival-dialog`.
  Vriendschappelijke wedstrijden staan apart in `DATA.friendlies` en tellen nergens mee, alleen in die lijst; een wedstrijd opent op `wedstrijd.html?id=<datum>-<tegenstander>` (bijv. `2026-11-01-war-team`, altijd via `matchHref(m)`; een laag dieper) met
  "Terug naar wedstrijden" bovenaan. Link naar wedstrijden en sessies altijd via `matchHref`/`sessionHref` (leesbare adressen; oude nummers worden omgezet).

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
