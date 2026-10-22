# Coach-logica van Frambroos Coach

Dit document is de bron van waarheid voor hoe de coach denkt: wat we vergelijken, welke drempels we gebruiken,
hoe advies tot stand komt en hoe teksten geschreven worden. **Pas bij een wijziging eerst dit document aan, dan de
code.** De code verwijst hiernaar. Zo blijft het advies consistent en hoeft niets opnieuw bedacht te worden.

## 1. Uitgangspunten

1. **Vergelijk met de juiste maatstaf.** Een speler wordt vergeleken met alle spelers op dezelfde positie die we
   tegenkwamen, tegenstanders inbegrepen (het *positiegemiddelde*). Het *teamgemiddelde* is alleen context. Teamresultaten
   worden gemeten *tegenover verwachting*: gecorrigeerd voor de sterkte en het aantal mensen van de tegenstander.
2. **Kijk verder dan één cijfer.** Een cijfer zegt pas iets naast zijn tegenhanger. Balverlies naast dribbels en
   uitgespeelde tegenstanders; mislukte passes naast hoeveel er vooruit gaat en wat het oplevert; conversie naast waar
   de schoten vandaan komen en hoeveel de keeper redt; verloren duels naast wáár ze plaatsvinden.
3. **Twee richtingen.** Te veel risico is een punt, maar te veilig ook, als de rol meer vraagt.
4. **De build bepaalt wat "goed" is.** Veilig spelen is de taak van een Disruptor, niet van een Magician.
5. **Iedereen dezelfde behandeling.** Elke speler krijgt dezelfde opbouw en altijd zijn drie grootste kansen, ook als
   die klein zijn. Een label zegt hoe groot de winst is.
6. **Gedrag apart van attributen.** Uit positie staan of de verkeerde pass kiezen los je niet op met punten.
7. **Wees eerlijk over zekerheid.** Elk inzicht krijgt een betrouwbaarheidslabel. Bij twijfel zeggen we dat, of we
   laten het weg. Nooit iets beweren dat niet in de data staat.

## 2. Data: wat er is en wat niet

- Bron: onofficiële EA Pro Clubs-API, maximaal 10 wedstrijden per type. De verzamelaar draait 's avonds (zie
  `docs/trigger.md`).
- Per speler per wedstrijd: grove positie (keeper, verdediger, middenvelder, aanvaller), build (`archetypeid` 1–13),
  rating, goals, assists, schoten, passes, tackles, speeltijd, en de ontcijferde events (`docs/event-codes.md`).
- Per pro: ingestelde hoofdpositie (`proPos`, bijvoorbeeld ST), lengte, overall.
- **Niet beschikbaar:** formatie, exacte positie of links/rechts, of iemand op "Any" speelt, AI-spelers, balbezit, xG,
  attribuutpunten (`vproattr` is altijd `NH`). Eigen builds vullen spelers zelf in op het tabblad Advies.

Builds (`archetypeid`), bron MeelanFC/FC-27-ClubsXI: 1 Shot Stopper, 2 Sweeper Keeper, 3 Progressor, 4 Boss,
5 Disruptor, 6 Marauder, 7 Recycler, 8 Maestro, 9 Creator, 10 Spark, 11 Magician, 12 Finisher, 13 Target.

Rol per build, voor wat bij iemands taak past:

| Rol | Builds | Betekenis voor advies |
|---|---|---|
| controle | Progressor, Boss, Disruptor, Recycler, Maestro | Balvast en duels zijn kernwerk; veilig spelen past. |
| loper | Marauder | Loopwerk en balans tussen aanvallen en verdedigen. |
| creatief | Creator, Spark, Magician | Risico aan de bal en vooruit spelen horen erbij. |
| afmaker | Finisher, Target | Afronden en aantal schoten wegen zwaar. |
| keeper | Shot Stopper, Sweeper Keeper | Eigen maten (nog niet uitgewerkt). |

## 3. Vergelijkingen

- **Positiegemiddelde**: per positie de waarde over alle spelers (ons en tegenstanders), gewogen naar hoe vaak de
  speler op elke positie stond.
- **Teamgemiddelde**: gemiddelde van onze eigen spelers. Alleen als context ("binnen Frambroos verlies je de meeste
  ballen, maar voor je positie is dat normaal").
- **Normaal** (sessies, laatste wedstrijd): het gemiddelde van dezelfde speler of het team over *alle andere* wedstrijden.
- **Verwachtingsmodel** (team): verwacht doelsaldo = a + b·(rating tegenstander − eigen rating)/100 + c·(mensen
  tegenstander − eigen mensen). Kleinste kwadraten op alle wedstrijden; alleen geaccepteerd als b en c ≤ 0. Anders c vast
  op −0,4 en alleen b schatten; bij te weinig data a = 0, b = −0,6, c = −0,4. Het residu (werkelijk − verwacht) is
  "tov verwachting".
- **Sessie**: wedstrijden met minder dan 3 uur ertussen.

## 4. Maten voor het advies

`worse` = relatief verschil met het positiegemiddelde in de slechte richting (positief is slechter).

| Maat | Definitie | Minimum | Richting |
|---|---|---|---|
| ballLoss | balverlies / balacties | 60 balacties | lager beter |
| lost90 | balverlies per 90 min | 180 min | lager beter |
| lossDef | balverlies op eigen helft per 90 min | 180 min | lager beter |
| lossAtt, lossDefShare | aandeel balverlies voorin / op eigen helft | 15 keer balverlies | context |
| beatenPerLoss | uitgespeelde tegenstanders per verloren bal | 15 | hoger beter |
| dribbles, beaten | geslaagde dribbels / uitgespeelde tegenstanders per 90 min | 180 min | hoger beter |
| dribbleRate | dribbels / balacties | 60 | context (risicobereidheid) |
| shortFail, longFail, fwdFail, crossFail | mislukt deel per passoort | 30 / 20 / 30 / 8 | lager beter |
| fwdShare | aandeel passes vooruit | 40 passes | context (ambitie) |
| through90, assists90 | steekpasses / assists per 90 min | 180 min | hoger beter (opbrengst) |
| passAcc | passes gelukt / pogingen | 40 | hoger beter |
| conv | goals / schoten | 8 schoten | hoger beter |
| onTarget | schoten op doel / schoten | 8 | hoger beter |
| insideShare | schoten binnen de zestien / schoten | 8 | context (kwaliteit kans) |
| savedShare | door keeper gered / op doel | 6 | lager beter |
| shots90 | schoten per 90 min | 180 min | hoger beter (aanvallers) |
| tackleWin | gewonnen / gepoogde tackles | 15 | hoger beter |
| wonAtt | aandeel balwinst voorin | 10 | context (drukzetten) |
| interceptions | onderscheppingen per 90 min | 180 min | hoger beter |
| fouls | overtredingen per 90 min | 180 min | lager beter |
| outPos | aandeel momenten uit positie | 30 | lager beter |
| noOption | "geen goede optie" per 90 min | 180 min | lager beter (ook teampunt) |
| wrongChoice | "betere pass gemist" per 90 min | 180 min | lager beter |

## 5. Thema's: afwegingen per onderwerp

Elk thema levert een **score** (hoeveel winst) en een **variant**. De drie hoogste scores boven 0,02 worden getoond.

**Aan de bal**
- Doet mee als `ballLoss`, `lost90` of (echt) `lossDef` minstens 0,05 slechter is, of als de speler binnen het team 20%
  boven het teamgemiddelde zit.
- *Risico* = dribbels, uitgespeelde tegenstanders of dribbelaandeel ≥ 20% boven positie. *Betaalt zich terug* =
  uitgespeelde tegenstanders per verloren bal ≥ 90% van positie.
- Risico dat zich terugbetaalt: score × 0,6 en de uitleg zegt dat balverlies deels de prijs van de speelstijl is.
- Waar: ≥ 50% voorin = "kost het minst"; eigen helft telt alleen als het ≥ 0,3 per 90 én 30% boven positie is.
- Controlerende build zonder risico: score × 1,2 (balvast is kernwerk).
- Variant *veilig*: weinig balverlies én weinig dribbels (beide ≥ 15% onder positie). Past bij controle (score 0,03),
  anders advies om vaker het risico te nemen.
- Acties: sneller afspelen na een geslaagde actie, afschermen, dribbeltechnieken oefenen; attributen balbeheersing,
  balans, kracht (+ dribbelen, wendbaarheid bij risico, + kalmte zonder); PlayStyles Technical, Press Proven, Quick Step
  of First Touch.

**Afronden**
- Doet mee als `conv` of `onTarget` ≥ 0,05 slechter is. Score × 0,7 voor niet-aanvallers.
- *Moeilijke kansen*: aandeel binnen de zestien < 85% van positie. Dan zegt lage conversie vooral iets over de
  kanskeuze: breed leggen of doordringen, en moeilijke schoten oefenen. Score × 0,8.
- *Naast*: `onTarget` ≥ 0,15 slechter: afronden onder druk of uit balans.
- *Gered*: `savedShare` ≥ 0,15 slechter: te centraal of te hard op de man; mik op de hoeken (Finesse, Low Driven).
- Conversie gelijk maar minder op doel: "scoort net zo vaak, raakt het doel iets minder".
- Anders: mogelijk pech, wordt duidelijk met meer wedstrijden.
- Variant *weinig schoten* (aanvallers, `shots90` ≥ 15% lager): zoek vaker zelf de afronding, vooral als `conv` goed is.

**Passen**
- Doet mee als het slechtste passtype ≥ 0,05 slechter is.
- *Ambitieus* = aandeel vooruit ≥ 10% boven positie of steekpasses ≥ 20% boven. *Opbrengst* = assists ≥ positie of
  steekpasses ≥ 20% boven. Met opbrengst: score × 0,6, en de uitleg zegt dat mislukte passes erbij horen.
- Veel assists (≥ 1,5× positie) zonder ambitie: "niet minder vooruit spelen, maar de verkeerde ballen eruit halen".
- Korte passes noemen we alleen als ze bij de twee getoonde passtypes horen en ≥ 0,15 slechter zijn.
- Variant *veilig passen*: aandeel vooruit ≥ 10% onder positie bij goede nauwkeurigheid. Past bij controle (0,04).
- Attributen per passtype: kort → korte pass; lang → lange pass, effect; vooruit → visie, korte pass; voorzet →
  voorzetten, effect. PlayStyles: Tiki Taka, Long Ball Pass, Pinged Pass, Incisive Pass, Whipped Pass.

**Verdedigen**
- Doet mee als `tackleWin` ≥ 0,05 slechter is.
- *Drukzetten*: ≥ 35% van de balwinst voorin, of vooral aanvaller met ≥ 20% balwinst voorin. Verloren duels daar
  kosten weinig: score × 0,6, advies om slimmer te jagen (in de passlijn).
- Controlerende build: score × 1,2 (duels zijn kernwerk).
- Variant *weinig onderscheppingen* (niet-aanvallers, ≥ 15% lager).

**Positiespel en keuzes** (geen build, wel winst; drempel 0,15)
- Uit positie: bij een aanvaller die veel dribbelt is dat een vrije rol, met als prijs een lege zone na balverlies.
- Geen aanspeelpunt: deels een teampunt; medespelers bieden zich te weinig aan.
- Betere pass gemist: keuzes, niet techniek.

**Sterke punten**: ≥ 15% beter dan positie, gesorteerd op afstand.

## 6. Labels

- Grootte van de winst: score ≥ 0,25 *grote winst*, ≥ 0,12 *duidelijke winst*, anders *fijnslijpen*.
- Betrouwbaarheid per speler: ≥ 15 wedstrijden *sterk*, ≥ 8 *redelijk*, anders *zwak*.
- Betrouwbaarheid van een vergelijking tussen groepen: kleinste groep ≥ 8 *sterk*, ≥ 5 *redelijk*, anders *zwak*.
  Groepen kleiner dan 3 tonen we niet.

## 7. Eigen build in het advies

- Attribuut ≥ 82 *hoog* ("ligt eerder aan keuzes en timing"), ≥ 70 *midden* ("verhoog"), anders *laag*
  ("verhoog eerst"). Ontbreekt het detailattribuut, dan gebruiken we het kerncijfer en zeggen dat erbij.
- PlayStyles die de speler al heeft, noemen we als "al in bezit" in plaats van als advies.
- Opslag: `data/builds.json` via de lokale server (`PUT /api/builds/:naam`). Alleen bekende velden, waarden 1–250.

## 8. Advies: vaste opbouw

Elk adviespunt heeft vijf delen: **Wat de data zegt** (met positiegemiddelde), **Wat het betekent** (de afweging),
**In het spel**, **Oefenen**, **Build** (attributen en PlayStyles, rekening houdend met de ingevulde build).
Daarnaast *Positiespel en keuzes* en *Al sterk*.

## 9. Schrijfregels

- Nederlands. Over spelers geen *hij* of *zij*: gebruik de naam, *deze speler* of *je*.
- Samenvattingen zijn **één korte alinea van drie of vier zinnen** die vertelt wat er gebeurde, **zonder cijfers op te
  lezen**. De cijfers staan eronder. Kleine aantallen in woorden ("twee assists").
- In het data-deel van advies wél cijfers, altijd met het positiegemiddelde erbij.
- Noem een factor nooit als oorzaak als hij tegenintuïtief samenhangt (bijvoorbeeld meer balverlies bij winst).
- Bij een opgave van de tegenstander zeggen we niets over verwachting.
- Sterke tegenstander: "sterker" vanaf 100 ratingpunten boven ons, "veel sterker" vanaf 250.

### Samenvattingen per pagina

- **Team**: karakter van de periode en verloop; tegen wie het lukt; waar winst van afhangt (alleen factoren die bij
  winst echt beter zijn); wie het verschil maakt.
- **Sessie**: soort avond en tegenstand (met verwachting); verloop en uitblinker ("hield nog het best stand" bij nul
  punten); het opvallendste verschil met normaal.
- **Wedstrijd**: uitslag, sterkte en mensen van de tegenstander; verloop op basis van kansen; beste speler; opvallendste
  verschil met normaal.
- **Speler, algemeen**: rol en kenmerk, wanneer het het best en minst gaat, opvallendste patroon. De *rol* hier is de
  rol die uit de data blijkt (aangever, afmaker, spelmaker, ballenafpakker, dribbelaar, rustige kracht), op basis van de
  sterkste punten binnen het team. Die kan afwijken van de gekozen build; dat is informatief, geen fout.
- **Speler, advies**: gekozen build en de rol die daarbij hoort (§2), speelstijl, grootste winst, waar op te bouwen,
  positiespel.

## 10. Waar staat wat

| Onderdeel | Bestand |
|---|---|
| Gedeelde helpers, model, teammaten, verhaalzinnen, builds, menu | `public/common.js` |
| Team, Sessies, Wedstrijden, Spelers | `public/team.js`, `sessies.js`, `wedstrijden.js`, `spelers.js` |
| Advies (deze logica) | `public/builds.js` |
| Data-API en opslag builds | `src/server.js` |
| Verzamelaar | `src/collect.js`, `.github/workflows/collect.yml` |
| Eventcodes | `src/events.js`, `docs/event-codes.md` |

## 11. Werkwijze bij wijzigingen

1. Pas eerst dit document aan.
2. Pas de code aan en verwijs in een commentaar naar het onderdeel hier.
3. Controleer de uitkomst voor **alle** spelers, niet één (zie het testscript in `CLAUDE.md`).
4. Lees elke gegenereerde zin na tegen de cijfers die erbij staan: spreekt hij zichzelf niet tegen?
