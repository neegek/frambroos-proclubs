# Frambroos Coach

Tracker en coach-app voor de FC27 Pro Clubs-club Frambroos (PS5, clubId 837250). Eigenaar: Jamal (speler **Neegek**).
Alle teksten in de app zijn Nederlands.

## Lees eerst

- **`docs/coach-logica.md`**: hoe de coach denkt. Maatstaven, drempels, afwegingen per thema, labels en schrijfregels.
  Elke wijziging aan analyse, advies of samenvattingen begint daar: eerst het document, dan de code.
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
- `data/builds.json` bevat de eigen builds die spelers invullen. Wel committen. Test nooit met nepwaarden in dit bestand;
  maak vooraf een kopie en zet die terug.
- Wat EA niet geeft (formatie, exacte positie, "Any", attribuutpunten, AI-spelers): zie coach-logica §2. Niet verzinnen.

## Afspraken

- Advies en samenvattingen: volg coach-logica §1, §8 en §9. Kort gezegd: verder kijken dan één cijfer, twee richtingen,
  build bepaalt wat goed is, iedereen dezelfde opbouw, samenvattingen kwalitatief in drie of vier zinnen.
- Over spelers geen *hij* of *zij*.
- Stijl: donker thuistenue (standaard) en licht uittenue; tokens staan bovenaan `public/style.css`. Nieuwe kleuren eerst
  op contrast controleren: tekst ≥ 4,5:1, grafische elementen ≥ 3:1. Datakleuren (winst blauw, verlies rood) niet aanpassen.
- Menu: Team, Sessies, Wedstrijden, Spelers (met de namen eronder). Geen aparte analysepagina.

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
