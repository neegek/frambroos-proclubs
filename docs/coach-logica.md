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
Referentiedata per archetype (signature PlayStyle, masteries, prijsklassen, EA-patch van 22 oktober, AP-budget) staat in
`public/archetypes.js`; bronnen en actualiteit in **`docs/archetypes.md`**.

### 2a. Advies per archetype

- **Standaard het laatst gespeelde archetype.** Dat bepaalt vaak ook de positie. Op het tabblad Advies kun je een ander
  archetype kiezen; gespeelde archetypes staan bovenaan met het aantal wedstrijden.
- **Eigen wedstrijden**: alleen die met dat archetype als het er minstens 5 zijn, anders alle wedstrijden (en dat staat
  erbij).
- **Vergelijkingsgroep**: alle spelers met hetzelfde archetype (ons en tegenstanders) als dat minstens 20
  speler-wedstrijden zijn; anders spelers op dezelfde positie (§3). De app zegt welke het is.
- **Ingevulde build** telt alleen mee als het archetype ervan overeenkomt met het gekozen archetype.
- **Coachprofiel per archetype** (`ARCHETYPE_PROFILE` in `public/archetypes.js`): een taak in één zin, een weging per
  adviesthema, of veilig spelen bij de taak past, of aanvallende maten tellen, en de kernattributen van de rol.
  Kernattributen komen vooraan in het build-advies.

| Archetype | Taak | Weging bal / schieten / passen / verdedigen | Veilig past | Aanvallend |
|---|---|---|---|---|
| Progressor | opbouwen vanuit de verdediging | 1,1 / 0,3 / 1,3 / 1,1 | ja | nee |
| Boss | duels en luchtduels winnen | 0,9 / 0,2 / 0,7 / 1,4 | ja | nee |
| Disruptor | pressen en onderscheppen | 0,9 / 0,3 / 0,8 / 1,4 | ja | nee |
| Marauder | met snelheid verdedigen en mee naar voren | 1,0 / 0,5 / 1,0 / 1,1 | nee | nee |
| Recycler | bal winnen en veilig doorspelen | 1,3 / 0,3 / 1,1 / 1,2 | ja | nee |
| Maestro | regisseren vanaf diep | 1,2 / 0,4 / 1,4 / 0,9 | ja | nee |
| Creator | met scherpe passes openbreken | 1,1 / 0,6 / 1,4 / 0,6 | nee | ja |
| Spark | vleugel openbreken en voorzetten | 1,2 / 0,8 / 0,9 / 0,4 | nee | ja |
| Magician | techniek en dribbels | 1,2 / 1,0 / 1,1 / 0,4 | nee | ja |
| Finisher | afmaken, een-op-een | 0,8 / 1,5 / 0,6 / 0,3 | nee | ja |
| Target | vasthouden, inkoppen, laten aansluiten | 1,3 / 1,3 / 0,9 / 0,3 | nee | ja |

Waar hieronder "controlerende build" staat, gaat het om archetypes waar veilig spelen past; "aanvaller" om de
aanvallende archetypes.

## 3. Vergelijkingen

- **Archetypegemiddelde**: de waarde over alle spelers met hetzelfde archetype (ons en tegenstanders), als dat
  minstens 20 speler-wedstrijden zijn. Heeft voorrang (§2a).
- **Positiegemiddelde**: per positie de waarde over alle spelers (ons en tegenstanders), gewogen naar hoe vaak de
  speler op elke positie stond. Terugval als er te weinig van het archetype is.
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

## 4a. Aan de bal in context

Balverlies zegt pas iets naast wat er tegenover staat. Daarom bekijken we elke speler met dezelfde zes vragen, steeds
tegenover dezelfde vergelijkingsgroep als het advies (archetype, anders positie; §2a, §3). Ze staan op de spelerspagina
(Algemeen, kaart *Aan de bal in context*) en het advies (thema *Aan de bal*) gebruikt dezelfde uitkomst.

| Vraag | Maat | Definitie | Minimum |
|---|---|---|---|
| Hoe vaak ben je aan de bal? | act90 | balacties per 90 min | 180 min |
| Speel je mensen voorbij? | beaten | uitgespeelde tegenstanders per 90 min | 180 min |
| Ga je de dribbel aan? | dribbles | geslaagde dribbels per 90 min | 180 min |
| Creëer je? | create90 | steekpasses + assists + tweede assists per 90 min | 180 min |
| Krijg je de bal in lastige momenten? | noOptShare | "geen goede optie" / alle beoordeelde balmomenten (175 + 176 + 177 + 182) | 40 momenten |
| Wat kost het? | ballLoss, lossAtt, lossDefShare | balverlies per balactie, en waar het valt | 60 / 15 |
| Wat levert een verloren bal op? | yieldPerLoss | (uitgespeeld + steekpasses + assists + tweede assists) / balverlies | 15 keer balverlies |

**Wat EA niet meet.** Of een pass die je krijgt lastig is (te hard, achter je, met een man in je rug) staat niet in de
data, en ook niet wie een mislukte pass had moeten ontvangen. *Geen goede optie* is de beste benadering: het spel zegt
dan dat je de bal had op een moment zonder aanspeelpunt. Dat is deels de positie van medespelers, deels je eigen
positie bij het aannemen. We noemen het daarom *lastige balmomenten*, nooit *slechte passes van anderen*.

**Niveaus.** Per maat: *hoog* als de speler 15% of meer boven de vergelijkingsgroep zit, *laag* bij 15% of meer
eronder, anders *normaal*. Voor noOptShare (een aandeel dat weinig schommelt) is de grens 10%.
- *Risico* = beaten of create90 hoog.
- *Betaalt zich terug* = yieldPerLoss minstens 90% van de vergelijkingsgroep.
- *Lastig* = noOptShare hoog.
- *Plek*: *voorin* als ≥ 50% van het balverlies op de helft van de tegenstander valt; *achterin* als het aandeel op
  eigen helft ≥ 20% is en 1,5× de vergelijkingsgroep.

**Oordeel** (één per speler, in deze volgorde):

| Balverlies | Voorwaarde | Oordeel | Betekenis |
|---|---|---|---|
| hoog | risico, betaalt zich terug | *De prijs van het spel* | Het verlies hoort bij een speelstijl die oplevert; timing aanscherpen, niet minder proberen. |
| hoog | risico, betaalt zich niet terug | *Risico dat te weinig oplevert* | Te vaak de actie op het verkeerde moment; kiezen wanneer. |
| hoog | geen risico, lastig | *Vaak zonder opties* | Je krijgt de bal vaak op momenten zonder aanspeelpunt. Deels teampunt (aanbieden), deels eerder kijken. |
| hoog | geen risico, niet lastig | *Balverlies zonder risico* | Gaat mis bij aannemen of eenvoudig afspelen; techniek en eerste aanraking. |
| normaal | risico, betaalt zich terug | *Gevaarlijk zonder extra verlies* | Sterk punt: dreiging zonder meer balverlies dan normaal. |
| normaal | beaten én create90 laag, controlerende build | *Rustig aan de bal* | Past bij de build; winst eerder in minder verlies dan in meer risico. |
| normaal | beaten én create90 laag, geen controlerende build | *Weinig dreiging* | Veilig zonder dat de rol daarom vraagt. |
| normaal | anders | *In balans* | Niets opvallends. |
| laag | risico | *Balvast én gevaarlijk* | Sterk punt. |
| laag | beaten én create90 laag | *Rustpunt* (controlerende build) of *Op zeker* (anders) | Past bij controle; anders mag er meer dreiging vanuit gaan. |
| laag | anders | *Balvast* | Sterk punt. |

Hoog balverlies betekent: ballLoss of lost90 is hoog. Plek en lastige momenten komen als toevoeging bij elk oordeel
("valt vooral voorin, waar het het minst kost"; "op eigen helft, daar kost het direct een kans"). Is act90 hoog en
lost90 hoger dan de groep, dan staat erbij dat je in aantallen meer verliest omdat je vaker aan de bal bent. De teksten
noemen precies wat hoog is (*meer mensen uitspelen*, *meer creëren* of beide), nooit "of".

**Tips per oordeel** (zelfde lijst voor iedereen; in de code `BALL_TIPS` in `public/builds.js`):
- *De prijs van het spel*: na een geslaagde actie sneller afspelen; de tweede dribbel alleen met ruimte voor je.
- *Risico dat te weinig oplevert*: eerst kijken of er een medespeler vrij staat; de dribbel bewaren voor de helft van
  de tegenstander met ruimte achter de man.
- *Vaak zonder opties*: over de schouder kijken voor de bal komt; de bal eerder laten gaan; als team afspreken dat er
  altijd één korte optie dichtbij is.
- *Balverlies zonder risico*: aannemen in de looprichting, lichaam open; afschermen bij druk in de rug.
- *Weinig dreiging* en *Op zeker*: één simpele actie per balbezit vooruit (dribbel of pass door de linie).
- *Rustpunt*: blijf het rustpunt; af en toe de pass die een linie overslaat.
- *Rustig aan de bal*: in één of twee keer raken doorspelen; af en toe de pass die een linie overslaat.
- Sterke oordelen: zo houden; kijk wat medespelers ervan kunnen gebruiken.

## 5. Thema's: afwegingen per onderwerp

Elk thema levert een **score** (hoeveel winst) en een **variant**. De drie hoogste scores boven 0,02 worden getoond.

**Aan de bal** (gebruikt het oordeel uit §4a)
- Doet mee als `ballLoss`, `lost90` of (echt) `lossDef` minstens 0,05 slechter is, of als de speler binnen het team 20%
  boven het teamgemiddelde zit.
- *Risico* en *betaalt zich terug* komen uit §4a (uitspelen of creëren hoog; opbrengst per verloren bal ≥ 90%).
- Oordeel *Vaak zonder opties* (§4a): het punt heet *Balverlies in lastige momenten*; de uitleg zegt dat het deels een
  teampunt is, en de tips gaan over eerder kijken en de bal eerder laten gaan.
- Hoog alleen binnen het team (niet tegenover de vergelijkingsgroep) en de opbrengst per verloren bal is in orde: score
  0,06 (*fijnslijpen*), en de uitleg zegt dat het verschil vooral uit de rol komt.
- Risico dat zich terugbetaalt: score × 0,6 en de uitleg zegt dat balverlies deels de prijs van de speelstijl is.
- Waar: ≥ 50% voorin = "kost het minst"; eigen helft telt alleen als het ≥ 0,3 per 90 én 30% boven positie is.
- Controlerende build zonder risico: score × 1,2 (balvast is kernwerk).
- Variant *veilig*: weinig balverlies én weinig dribbels (beide ≥ 15% onder positie). Past bij controle (score 0,03),
  anders advies om vaker het risico te nemen.
- Acties: sneller afspelen na een geslaagde actie, afschermen, dribbeltechnieken oefenen; attributes Ball Control,
  Balance, Strength (+ Dribbling, Agility bij risico, + Composure zonder); PlayStyles Technical, Press Proven, Quick Step
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
- Attributes per passtype: kort → Short Passing; lang → Long Passing, Curve; vooruit → Vision, Short Passing; voorzet →
  Crossing, Curve. PlayStyles: Tiki Taka, Long Ball Pass, Pinged Pass, Incisive Pass, Whipped Pass.

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

- Attributen staan in het Engels, zoals in het spel (Ball Control, Short Passing, Defensive Awareness, ...); face stats
  als PAC, SHO, PAS, DRI, DEF, PHY.
- Attribuut ≥ 82 *hoog* ("ligt eerder aan keuzes en timing"), ≥ 70 *midden* ("verhoog"), anders *laag*
  ("verhoog eerst"). Ontbreekt het detailattribuut, dan gebruiken we de face stat en zeggen dat erbij ("via PAS 72").
- PlayStyles die de speler al heeft, noemen we als "al in bezit" in plaats van als advies.
- Bij elk geadviseerd attribuut staat de prijsklasse voor het gekozen archetype (goedkoopst, goedkoop, duur, duurst),
  met de richting van EA's update van 22 oktober erbij als die het attribuut raakte ("was goedkoopst, sinds 22 okt
  duurder"). Exacte nieuwe klassen zijn niet bekend; zie `docs/archetypes.md`.
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

- **Clubhouse** (de startpagina, vroeger Team): karakter van de periode en verloop; tegen wie het lukt; waar winst van
  afhangt (alleen factoren die bij winst echt beter zijn); wie het verschil maakt.
- **Sessie**: soort avond en tegenstand (met verwachting); verloop en uitblinker ("hield nog het best stand" bij nul
  punten); het opvallendste verschil met normaal.
- **Wedstrijd**: uitslag, sterkte en mensen van de tegenstander; verloop op basis van kansen; beste speler; opvallendste
  verschil met normaal.
- **Speler, algemeen**: rol en kenmerk, wanneer het het best en minst gaat, opvallendste patroon. De *rol* hier is de
  rol die uit de data blijkt (aangever, afmaker, spelmaker, ballenafpakker, dribbelaar, rustige kracht), op basis van de
  sterkste punten binnen het team. Die kan afwijken van de gekozen build; dat is informatief, geen fout.
- **Speler, advies**: gekozen archetype met zijn taak (§2a), speelstijl, grootste winst, waar op te bouwen,
  positiespel. Bij een ander archetype dan het laatst gespeelde zegt de eerste zin dat.

## 9a. Clubhouse en tweede assists

**Clubhouse** is de startpagina over de club als geheel, zonder filters. Van boven naar beneden: wie we zijn (logo,
naam, stadion, platform, huidige en beste divisie, skill rating, reputatie, tenues); clubcijfers van EA over alle
wedstrijden (winstpercentage, reeks, wedstrijden, doelsaldo, clean sheets, promoties); vorm en samenvatting; de
gevaarlijkste spelers; de ranglijst per stat; de leden; wat opvalt en de beste tweetallen. EA geeft geen aantal fans;
dat tonen we niet.

- **Clubcijfers** komen uit EA (`overallStats` en `allTimeLeaderboard/search`, samen in het clubsnapshot). Alles over
  spelers en vorm komt uit onze eigen gevolgde wedstrijden, met het aantal erbij.
- **Gevaarlijkst** = betrokken bij goals per wedstrijd: goals + assists + tweede assists, minimaal 3 wedstrijden.
  De top drie, met de verdeling erbij.
- **Ranglijst**: per stat alle spelers met minimaal 3 wedstrijden, totaal en per wedstrijd. Voor percentages
  (passnauwkeurigheid, duels) de minimale aantallen uit §4.
- **Leden**: de carrièrecijfers van EA per lid (wedstrijden, winstpercentage, goals, assists, man of the match,
  gemiddelde rating), met overall en ingestelde positie.

**Tweede assist** (EA-code 115, `second_assists`, zekerheid *waarschijnlijk*): de pass vóór de assist. EA geeft alleen
het aantal per speler per wedstrijd, niet bij welke goal. Alleen als we in een wedstrijd precies één keer scoren, is
de keten te reconstrueren: wie scoorde, wie de assist gaf en wie de tweede assist. Dat tonen we op de wedstrijdpagina
als *Zo viel de goal*. Ontbreekt een schakel, dan zeggen we dat (geen assist, of een AI-speler gaf hem: AI-spelers
staan niet in de data). Bij meer goals verbinden we niets.

## 9b. Frambroos-index

Eén getal per speler (en per speler per wedstrijd) voor wat iemand zelf bijdraagt, **los van de uitslag**. 50 is
gemiddeld voor de rol; hoger is beter. De EA-overall op de spelerskaart blijft apart staan.

**Per wedstrijd** (alleen rijen met minstens 45 minuten en ontcijferde events), vier onderdelen:

| Onderdeel | Gewicht uit `ARCHETYPE_PROFILE` | Cijfers (gelijk gewogen) |
|---|---|---|
| Afronden | `shoot` | goals; schoten op doel (13 + 18) |
| Creëren | `pass` | assists; tweede assists (115); steekpasses (152) |
| Aan de bal | `ball` | uitgespeeld (112); passnauwkeurigheid; balverlies per balactie (lager is beter) |
| Verdedigen | `defend` | onderscheppingen (6); balwinst (108–110); gewonnen tackles |

1. Elk cijfer wordt een percentiel (0–100, gelijke waarden krijgen het midden) binnen **dezelfde positie**, over alle
   menselijke spelers die we tegenkwamen, tegenstanders inbegrepen. Zo wordt een aanvaller alleen met aanvallers
   vergeleken en telt scoren bij hem niet als vanzelfsprekende bonus.
2. Een onderdeel is het gemiddelde percentiel van zijn cijfers.
3. De wedstrijdscore is het gewogen gemiddelde van de vier onderdelen, met de gewichten van het archetype dat in die
   wedstrijd gespeeld werd (§2a). Zonder bekend archetype: Finisher voor aanvallers, Maestro voor de rest.

**Per speler**: het gemiddelde van de wedstrijdscores, naar 50 getrokken bij weinig wedstrijden:
`(som + 5 × 50) / (n + 5)`. Ook per onderdeel. Minimaal 3 wedstrijden om te tonen.

**Labels**: ≥ 58 *uitblinker*, ≥ 53 *boven gemiddeld*, > 47 *gemiddeld*, > 42 *onder gemiddeld*, anders *ver onder*.
Per wedstrijd: ≥ 70 *topwedstrijd*, ≤ 30 *mindere wedstrijd*.

**Toets** (23 okt 2026, 222 speler-wedstrijden): samenhang met de EA-matchrating 0,68; met het doelsaldo van het eigen
team 0,46 (EA-rating 0,51). Bewust lager dan de EA-rating, die ook door winst omhoog gaat. Tegenstanders komen
gemiddeld op 49,9 uit.

**Later te verfijnen**: vergelijken per archetype zodra die groep groot genoeg is (≥ 20 speler-wedstrijden), corrigeren
voor de sterkte van de tegenstander, eigen vergelijking voor verdedigers en keepers (nu te weinig in de data).

## 10. Waar staat wat

| Onderdeel | Bestand |
|---|---|
| Gedeelde helpers, model, teammaten, verhaalzinnen, builds, menu | `public/common.js` |
| Team, Sessies, Wedstrijden (lijst), Wedstrijd (detail), Spelers | `public/team.js`, `sessies.js`, `wedstrijden.js`, `wedstrijd.js`, `spelers.js` |
| Spelerskaart | `public/playercard.js`; foto's in `data/players/` (aangeleverd via de chat) |
| Advies (deze logica) | `public/builds.js` |
| Frambroos-index (§9b) | `public/frambroos-index.js` |
| Archetypes: referentie en coachprofiel | `public/archetypes.js`, `docs/archetypes.md` |
| Data-API en opslag builds | `src/server.js` |
| Verzamelaar | `src/collect.js`, `.github/workflows/collect.yml` |
| Eventcodes | `src/events.js`, `docs/event-codes.md` |

## 11. Werkwijze bij wijzigingen

1. Pas eerst dit document aan.
2. Pas de code aan en verwijs in een commentaar naar het onderdeel hier.
3. Controleer de uitkomst voor **alle** spelers, niet één (zie het testscript in `CLAUDE.md`).
4. Lees elke gegenereerde zin na tegen de cijfers die erbij staan: spreekt hij zichzelf niet tegen?
