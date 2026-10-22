# Frambroos Coach

Tracker en coach-app voor de FC27 Pro Clubs-club Frambroos (PS5, clubId 837250). Eigenaar: Jamal (speler **Neegek**).
Alle teksten in de app zijn Nederlands.

## Lees eerst

- **`docs/coach-logica.md`**: hoe de coach denkt. Maatstaven, drempels, afwegingen per thema, labels en schrijfregels.
  Elke wijziging aan analyse, advies of samenvattingen begint daar: eerst het document, dan de code.
- `docs/archetypes.md`: wat we over FC27-archetypes weten (AP-kosten, masteries, signature PlayStyles, EA-patch),
  met bron en datum per gegeven. Bij een nieuwe EA-update eerst daar bijwerken, dan `public/archetypes.js`.
- `docs/event-codes.md`: betekenis van de EA-eventcodes. `docs/trigger.md`: hoe en wanneer de verzamelaar draait.

## Draaien

```bash
npm run dashboard   # haalt eerst de nieuwste database van GitHub, dan http://localhost:3737
npm run collect     # handmatig verzamelen (normaal doet GitHub Actions dit)
```

Geen `npm install` nodig (Node 22.5+, ingebouwde SQLite). De browserpreview heet `dashboard` in `.claude/launch.json`.
Na een wijziging in `src/server.js` de server herstarten; voor `public/` volstaat herladen.

## Data

- De database `data/proclubs.sqlite` wordt beheerd door de cloudverzamelaar (GitHub Actions) en via git gedeeld.
  **Commit nooit een lokaal gewijzigde database**; `npm run sync` gooit lokale wijzigingen weg en haalt de nieuwste op.
- `data/builds.json` bevat de eigen builds die spelers invullen. Wel committen.
- `data/players/<slug>.<webp|png|jpg>` zijn de foto's op de spelerskaarten (geüpload via de kaart, verkleind tot
  900 px). Wel committen. Test-uploads altijd weer verwijderen. Test nooit met nepwaarden in dit bestand;
  maak vooraf een kopie en zet die terug.
- Wat EA niet geeft (formatie, exacte positie, "Any", attribuutpunten, AI-spelers): zie coach-logica §2. Niet verzinnen.

## Afspraken

- Advies en samenvattingen: volg coach-logica §1, §8 en §9. Kort gezegd: verder kijken dan één cijfer, twee richtingen,
  build bepaalt wat goed is, iedereen dezelfde opbouw, samenvattingen kwalitatief in drie of vier zinnen.
- Over spelers geen *hij* of *zij*.
- Attribuutnamen in het Engels zoals in het spel (Ball Control, Short Passing, ...); de rest van de app in het Nederlands.
- Stijl: donker thuistenue (standaard) en licht uittenue; tokens staan bovenaan `public/style.css`. Nieuwe kleuren eerst
  op contrast controleren: tekst ≥ 4,5:1, grafische elementen ≥ 3:1. Datakleuren (winst blauw, verlies rood) niet aanpassen.
- Menu: Team, Sessies, Wedstrijden, Spelers (in- en uitklapbaar, met de namen eronder). Geen aparte analysepagina.
- Spelerspagina begint met de spelerskaart (`public/playercard.js`): FC-stijl in thuis- of uitkleuren, met foto of
  silhouet, overall, ingestelde positie, laatst gespeelde build en seizoenscijfers (of face stats uit de ingevulde build).
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

Controleer ook: geen fouten in de console, licht en donker, en telefoonbreedte (375 px) zonder horizontaal scrollen.

## Git

Commitberichten in het Nederlands. Na controle committen en pushen naar `main` op github.com/N33G3K/frambroos-proclubs.
