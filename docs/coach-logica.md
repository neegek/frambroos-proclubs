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

**AI-spelers**: EA geeft per wedstrijd alleen de menselijke spelers; `aggregate` is precies de som van die spelers
(gecontroleerd op 28 oktober 2026 over 24 clubwedstrijden). Van AI-spelers is er dus niets, behalve indirect: de
clubscore min de goals van de mensen zijn goals van AI (of eigen doelpunten). Geen assists, ratings of andere cijfers.

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
- **Aantal mensen** (onderzocht op 1 november 2026, 67 wedstrijden): de **rating** hangt nauwelijks af van met hoeveel
  mensen we spelen (gemiddeld 7,2 met drie, 7,3 met vier, 7,1 met vijf, 7,3 met zes); de **uitslag** zegt veel meer
  (winst 7,5, gelijk 7,3, verlies 6,8). **Aantallen per speler** stijgen wél met minder mensen: met drie mensen
  17,4 passes per speler per wedstrijd, met zes 10,1 (meer ballen per mens, minder AI ertussen). Een getal per
  wedstrijd (passes, dribbels, balwinst) bevoordeelt dus wie vaak in een klein team speelt; percentages en de rating
  niet. Nog niet gecorrigeerd. Mogelijke correctie later: het aandeel van de speler in wat de mensen samen deden.
- **Eerder en nu** (§9a, *Groei*): EA geeft per lid de carrièretotalen (wedstrijden, goals, assists, man of the match,
  gemiddelde rating). Carrière min de gevolgde wedstrijden = alles **vóór** de eerste gevolgde wedstrijd. Gecontroleerd op
  1 november 2026: tussen twee ledensnapshots groeit de carrière precies zo hard als de gevolgde wedstrijden (op één
  wedstrijd na), dus die aftrek klopt.

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

- **Getallen** (sinds 30 oktober 2026): overal **één decimaal** (8.4, 0.6 per wedstrijd). Sorteren en rangschikken
  gebeurt op het exacte getal, zodat twee gelijk afgeronde scores toch een vaste volgorde hebben. De **groei** (§9c)
  ook met één decimaal en zonder ",0" als het een heel getal is (+1, −0.4); het woord *groei* staat er niet bij.
- **Horizontaal scrollen in een kaart**: de rij loopt door tot de rand van de kaart en wordt daar afgesneden, niet
  door de binnenruimte; aan het begin en het eind staat dezelfde ruimte als de kaart heeft (sinds 1 november 2026).
  Een vaste eerste kolom (*Per wedstrijd*) dekt ook de ruimte ernaast af, zodat er niets tussendoor schemert; de
  hoek erboven is niet vast, zodat de spelerskaartjes bij het scrollen tot de linkerrand zichtbaar blijven.
- **Dialogen**: de sluitknop blijft rechtsboven staan en een knop naar een andere pagina (*Naar de spelerspagina*,
  *Naar de wedstrijd*) staat vast onderaan; alleen de inhoud ertussen scrolt. Die knop is rustig (alleen tekst, een
  achtergrond pas bij aanwijzen of indrukken). Bij een speler van een sessie staan links en rechts ervan kleine knoppen
  met de portretfoto en een pijltje naar de vorige en volgende speler (volgorde van *Per wedstrijd*).
- **Radar op telefoon**: grotere teksten bij de assen.
- **Logo's van tegenstanders**: waar een tegenstander staat, het clublogo van EA's CDN (docs/ea-data.md); laadt dat
  niet, dan het shirt in de clubkleuren. Ons eigen logo is `crest.png`.
- **Naam bij een kaart**: staat een naam naast of onder een spelerskaart(je), dan hoort hij **in** het kaartje
  (sinds 1 november 2026); geen losse naam eronder.
- **Namen** overal voluit zoals EA ze geeft (Petra Selie, niet P. Selie); alleen een naam die in het spel al met een
  voorletter is ingevuld (M. Van der Kamp) blijft zo. Past een naam niet, dan afkappen met …, nooit zelf afkorten.
- Nederlands. Over spelers geen *hij* of *zij*: gebruik de naam, *deze speler* of *je*. De naam is die van de pro
  (Terry Yaki, Petra Selie), niet de accountnaam; dat houdt de roleplay heel (sinds 27 oktober 2026).
- Samenvattingen zijn **één korte alinea van drie of vier zinnen** die vertelt wat er gebeurde, **zonder cijfers op te
  lezen**. De cijfers staan eronder. Kleine aantallen in woorden ("twee assists").
- In het data-deel van advies wél cijfers, altijd met het positiegemiddelde erbij.
- Noem een factor nooit als oorzaak als hij tegenintuïtief samenhangt (bijvoorbeeld meer balverlies bij winst).
- Bij een opgave van de tegenstander zeggen we niets over verwachting.
- Sterke tegenstander: "sterker" vanaf 100 ratingpunten boven ons, "veel sterker" vanaf 250.

### Samenvattingen per pagina

- **Clubhouse** (de startpagina, vroeger Team): karakter van de periode en verloop; tegen wie het lukt. Niet meer:
  waar winst van afhangt en wie het verschil maakt (verbanden, zie §9d).
- **Sessie**: drie delen, elk één of twee zinnen. (1) Het karakter van de avond en de tegenstand, in gewone taal.
  (2) **De anekdote**: het ene moment of de ene speler die de avond kenmerkte, als een verhaaltje en niet als cijfer
  ("Konijnenlover22 schoot er in één pot drie in", "na twee verloren potten draaide het team de avond om").
  (3) **Een quote van de beste speler van de avond** (sinds 1 november 2026; daarvoor een echte Cruijff-quote): een
  cruijffiaanse uitspraak in de stem van die speler, met de pro-naam erbij, **geïnspireerd door één statistiek van
  die speler die avond**: de maat die het meest boven het eigen normaal uitstak (goals of assists vanaf twee, man of
  the match vanaf twee keer, passnauwkeurigheid vanaf twintig passes, gewonnen tackles vanaf drie, balwinst vanaf vier,
  veel schoten met hooguit één goal); de maat inspireert de zin, maar er staan **geen letterlijke getallen of
  percentages** in ("ik pass graag, iedereen is mijn vriend" in plaats van "75 procent passes"); steekt niets uit,
  dan de rating. Terry Yaki praat als honkballer Munenori Kawasaki: vol energie, stelt zich voor, bedankt iedereen. **Elke sessie een nieuwe
  quote**: komt dezelfde speler met dezelfde maat terug, dan de volgende variant. Karakter (achtergrond, stem,
  eigenschappen, woorden, beelden) en de uitspraken per maat staan in `public/personas.js`, de verzamelplek om verder
  op te bouwen. Spelers zonder achtergrond krijgen een neutrale cruijffiaanse zin.
  Wie de beste was staat niet in de tekst: dat laat de top drie als kaarten zien (§9a).
  Anekdotes, in volgorde van kracht (de sterkste wint; bij gelijke kracht de meest recente):
  hattrick of meer in één pot; iemand scoorde in elke wedstrijd; iemand was elke wedstrijd man of the match;
  comeback (eerste twee potten geen winst, daarna wel); inzakker (goed begin, de laatste twee niet gewonnen);
  alles gewonnen of niets gewonnen; de hele avond de nul gehouden; een tegenstander gaf op; een verloren pot met
  veel meer schoten dan de tegenstander (minstens dubbel, en minstens acht); een monsterscore (vier of meer verschil);
  iemand speelde ver boven of ver onder het eigen normaal (minstens 1,0 rating, bij minstens drie andere wedstrijden).
  Is er niets van dit alles, dan zegt de anekdote wie het meest bij de goals betrokken was.
  Thema's per anekdote (in `personas.js` met de Cruijff-uitspraak waar het thema op leunt):
  hattrick en scoren in elke pot: "Je moet schieten, anders kun je niet scoren." · elke pot man of the match:
  "Je gaat het pas zien als je het doorhebt." · comeback: "Elk nadeel heb z'n voordeel." · inzakker:
  "Als je niet kunt winnen, moet je zorgen dat je niet verliest." · alles gewonnen: "Voetbal is simpel, maar het
  moeilijkste wat er is, is simpel voetballen." · niets gewonnen: "Voordat ik een fout maak, maak ik die fout niet." ·
  de nul gehouden: "Als wij de bal hebben, kunnen zij niet scoren." · tegenstander gaf op: "Italianen kunnen niet van
  je winnen, maar je kan wel van ze verliezen." · verloren met veel schoten: "Toeval is logisch." · ver boven normaal:
  "Je gaat het pas zien als je het doorhebt." · ver onder normaal: "Elk nadeel heb z'n voordeel." · monsterscore en
  overig: "Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen."
- **In het kort** (sessie en wedstrijd, sinds 4 november 2026; vervangt *Waar het schuurde*): één kaart met **hooguit
  één min en één plus**, elk één korte zin, cruijffiaans, zonder tussenkopjes of cijfers (een uitleg komt later). Alleen
  wat er echt is: het mag één min zijn, één plus, of één neutrale zin. Voor mobiel eerst. Maten (alleen met verband, §9e):
  1. *Schoten op doel tegen* en *eigen schoten op doel*, per mens, tegenover het normaal over alle andere wedstrijden.
     Sessie: minstens 25 % verschil en 1,5 standaardfout. Wedstrijd: minstens 40 % en 1,25 keer de gewone spreiding.
  2. *Afronding*: goals van mensen tegenover wat je met zoveel schoten op doel normaal maakt (sessie minstens acht,
     wedstrijd minstens vier schoten op doel; 1,5 standaardfout en 25 % verschil).
  3. *Sterkte* (skill rating van toen, §3): wedstrijd verloren van 100+ sterker ("Ze waren gewoon beter."), niet
     verloren van 100+ sterker (plus), verloren van 100+ zwakker (min). Sessie: de niet-gewonnen potten gemiddeld 100+
     sterker (min), doelsaldo gemiddeld 0,7 of meer boven verwachting over minstens drie potten (plus).
  **Het waarom** (4 november 2026): een regel over sterkte zegt erbij hoe het verschil zichtbaar werd, met de duidelijkste
  maat uit 1 of 2 die de bijpassende kant op ging (zwakke drempel: de helft van de gewone), in woorden ("ze kwamen twee
  keer zo vaak voor ons doel dan normaal", "wat we kregen, ging er niet in"). Zonder zo'n maat: "Ze waren een maatje te
  groot, al gaven we niet meer weg dan anders." Alleen "ze waren gewoon beter" zei te weinig.
  Een min bij winst (of een plus bij verlies) alleen als hij er echt uitspringt. Bij een slechte uitslag staat de min
  eerst, anders de plus. Niets gevonden: winst "Niets sprong eruit. Als het goed gaat, moet je niets veranderen.",
  verlies "Geen duidelijke oorzaak: het zat in de details." (gelijk telt als niet-slecht).
  **Opstellingen van de tegenstander staan er bewust niet in**: getoetst op 4 november 2026 (tegenstanders met een
  menselijke verdediger, twee of meer aanvallers, drie of meer middenvelders, vier of vijf mensen op hun aanvallende
  helft, meer mensen op hun aanvallende helft dan wij, meer mensen dan wij): na correctie voor sterkte en mensen geen
  enkel verschil (p 0,13 tot 0,99). Het dichtst bij: een menselijke verdediger (−0,4 goal tov verwachting, 13
  wedstrijden, p 0,48), niet genoeg om te noemen. Opnieuw toetsen bij meer wedstrijden.
  Volgende stap (nog niet gebouwd): per min of plus wat je ermee doet.
- **Wedstrijd**: uitslag, sterkte en mensen van de tegenstander; verloop op basis van kansen; beste speler. Niet meer:
  het verschil met normaal.
- **Speler, algemeen** (sinds 28 oktober 2026, twee of drie zinnen, geen afgeleide "rollen" meer):
  1. **Wie en wat**: de naam van de pro, de laatst gespeelde build en de linie, en wat die in de gekozen periode
     opleverde, in gewone woorden met hooguit twee getallen. Aanval en middenveld: goals en assists. Verdediging:
     veroverde ballen per wedstrijd en hoe vaak de nul werd gehouden. Keeper: reddingen en de nul.
     Voorbeeld: "Terry Yaki speelt als Magician in de aanval: 24 goals en 23 assists in 39 wedstrijden."
  2. **Vorm** van de laatste sessie (§9c): in topvorm, in vorm, op het eigen niveau, of een mindere avond.
  3. Alleen als het er echt uitspringt: het ene waarin deze speler **de beste van het team** is (plek 1, minstens
     25 % boven het teamgemiddelde), in gewone taal ("Niemand in het team speelt meer tegenstanders uit."). Anders
     geen derde zin. Nooit een zwak punt in de samenvatting: dat staat in de cijfers.
- **Speler, advies**: gekozen archetype met zijn taak (§2a), speelstijl, grootste winst, waar op te bouwen,
  positiespel. Bij een ander archetype dan het laatst gespeelde zegt de eerste zin dat.

## 9a. Clubhouse en tweede assists

**Clubhouse** is de startpagina over de club als geheel, zonder filters, en bewust visueel en eenvoudig (geïnspireerd
op de clubpagina's van de Premier League). Van boven naar beneden:

1. **Hero**: een getekend stadion bij avond als achtergrond (eigen SVG, vaste kleuren los van het thema), het clublogo
   groot, het stadion erboven, de clubnaam, en daaronder skill rating en huidige divisie. Dan de **laatste 10
   wedstrijden** als rondjes (W/G/V, oudste links, nieuwste rechts en omlijnd; een tik opent de wedstrijd), zonder
   label en zonder reeks: de rondjes zeggen het zelf. Niet alles hoeft benoemd te worden.
2. **Seizoen**: één kaart, bewust simpel (sinds 27 oktober 2026). Bovenin **In het kort**: drie regels die iedereen
   snapt, elk een vergelijking met één duidelijke basis, in woorden met hooguit twee getallen:
   - *Laatste avond*: "5 van de 7 gewonnen", met **beter / slechter / zoals normaal** (punten per wedstrijd tegenover
     het eigen gemiddelde over alle andere gevolgde wedstrijden; verschil ≥ 0,3 telt).
   - *Deze week tegenover vorige week*: winstpercentage van de laatste 7 dagen naast dat van de 7 dagen ervoor
     (alleen als beide minstens 3 wedstrijden hebben; anders de laatste 7 dagen alleen).
   - *Tegen sterkere clubs*: winstpercentage tegen clubs met een skill rating ≥ 100 boven de onze naast dat tegen de
     rest (alleen als beide minstens 3 wedstrijden hebben). Dit is het ene verband dat in de data overeind blijft en
     dat je kunt gebruiken: tegen de rest niet achteroverleunen.
   Daaronder de totalen volgens EA over alle wedstrijden (wedstrijden, gewonnen, gelijk, verloren, winstpercentage,
   doelpunten voor en tegen, clean sheets; geen badges, dit zijn feiten) en de **vormgrafiek** over de gevolgde
   wedstrijden: per wedstrijd een staafje (hoogte = doelsaldo, kleur = uitslag) met daardoorheen **één lijn**, het
   doelsaldo gemiddeld over vijf. Rechts in de kop twee cijfers over de laatste tien met een badge tegenover de
   wedstrijden daarvoor: punten per wedstrijd en doelsaldo per wedstrijd. Niet meer: de lijn en het cijfer *verwacht
   doelsaldo* en *tegenstanders tov ons* (jargon; het verwachtingsmodel uit §3 blijft wel in de badges op de
   wedstrijdkaarten). De tooltip per wedstrijd noemt uitslag, tegenstander en diens rating.
   **Niet mogelijk**: "nog X punten tot promotie". EA's `lastMatch0..9` is een rollend venster van de laatste vijf
   uitslagen (1 = winst, 2 = verlies, 3 = gelijk, −1 = leeg), geen seizoensstand; de divisieregels (`settings`) slaan we
   wel op voor als dat ooit kan.
3. **Nieuws**: één kaart met het nieuwste artikel en een link naar de nieuwspagina (`nieuws.html`) met alle artikelen.
4. **Laatste uitslagen**: weg sinds 3 november 2026 (de laatste sessie toont ze al).
5. **Topspelers**: opgegaan in *Algemeen* (vier ranglijstkaartjes over de carrière; zie verderop).
   Een tik op een kaartje opent geen speler maar een **uitlegscherm** over die ranglijst: waar de score op gebaseerd
   is, wie meetelt (minimaal aantal wedstrijden of pogingen) en de hele lijst met de onderliggende aantallen.
6. **Selectie**: de leden als spelerskaarten.

Niet meer op de startpagina: de KPI-tegels met badges, de tenues, de reeks en de losse samenvatting (die is nu het
nieuwsbericht over de laatste speelavond). *Gevaarlijkst*, *Wat opvalt* en *Beste
tweetallen* blijven weg (verbanden, §9d). EA geeft geen aantal fans; dat tonen we niet.

**Nieuws** schrijft zichzelf uit de gevolgde wedstrijden: **één artikel per sessie** (minstens 2 wedstrijden), gerekend
met wat er tot en met die avond bekend was. Het artikel krijgt de kop van het sterkste bericht van die avond, in de
volgorde van de tabel; is er niets bijzonders, of haalde het team minder dan één punt per wedstrijd (dan is de avond
zelf het nieuws), dan de kop van *Speelavond*. De tekst is de uitleg van dat bericht plus de
zin over de avond (uitslag, doelsaldo, beste speler). Elk artikel heeft een label, een kop van hooguit tien woorden, een
datum en een beeld (spelerskaarten bij het nieuwste topvormbericht, anders rondjes of één groot cijfer) en linkt naar
die sessie. De nieuwspagina toont alle artikelen, nieuwste eerst en groot.

| Bericht | Wanneer | Voorbeeldkop |
|---|---|---|
| Topvorm | spelers die die avond de blauwe kaart kregen (§9c, dus topvorm over die sessie) en hem daarvoor niet hadden | *Neegek en KFH Guip 023 in topvorm* |
| Uitschieter | hoogste rating van de avond, als die ≥ 9,0 is | *9.9 voor Neegek tegen X* |
| Hattrick | 3+ goals van één speler in één wedstrijd die avond | *Hattrick voor Xero 023* |
| Grote zege | winst met ≥ 4 verschil die avond (de grootste) | *7–1 tegen X* |
| Scoort op rij | een speler scoorde in elk van de laatste ≥ 3 eigen wedstrijden, tot en met die avond | *Xero 023 scoort vier keer op rij* |
| De nul | ≥ 2 clean sheets die avond | *Twee keer de nul gehouden* |
| Speelavond | anders | *Vier zeges en een gelijkspel* |

Geen reeksen: die staan al in de rondjes bovenaan.

- **Clubcijfers** komen uit EA (`overallStats` en `allTimeLeaderboard/search`, samen in het clubsnapshot). Alles over
  spelers en vorm komt uit onze eigen gevolgde wedstrijden, met het aantal erbij.
- **Ranglijst** (*Algemeen*): vier kaartjes met **alle** spelers erop (rating, goals, assists, man of the match over
  de carrière volgens EA); de ranglijsten over de gevolgde wedstrijden staan sinds 2 november 2026 alleen nog achter
  de regels op de spelerspagina.
- **Leden**: elk lid als spelerskaart (§9c), **gesorteerd op vorm**: eerst topvorm, dan in vorm, dan de rest; binnen
  een tier op de rating van de laatste sessie, dan op aantal wedstrijden.

**Spelerspagina** (sinds 28 oktober 2026, zonder tabbladen; sinds 1 november 2026 zonder filters, samenvatting en
*Algemeen*: wat daar stond, staat op de kaart): één pagina, van boven naar beneden, altijd over alle gevolgde wedstrijden:
1. De spelerskaart, met daaronder alleen de **vorm**: de reeks van de sessie die de vorm bepaalt (§9c), per wedstrijd
   de rating als rondje, de datum erboven en de rondjes op **één rij** (past het niet, dan horizontaal scrollen; nooit
   meer dan de wedstrijden van één sessie).
2. **Cijfers** in losse kaarten per groep (Aanvallen, Passen, Verdedigen, Discipline), elk met **twee kolommen**: de
   speler (kop: de naam van de pro) en **de club**. In elke kolom groot het totaal en klein daaronder het getal per
   wedstrijd, zonder de woorden *per wedstrijd* (bij een percentage de breuk). De club is iedereen van ons over alle gevolgde wedstrijden; *per wedstrijd* is daar
   het gemiddelde per speler per wedstrijd, zodat het naast de speler te leggen is. De speler kleurt **groen** als die
   per wedstrijd beter zit dan de club, **rood** als slechter, gewoon als het gelijk is (binnen 5 % van elkaar; bij
   percentages binnen 2 punten). Bij balverlies, uit positie, overtredingen en kaarten is lager beter. Reddingen
   (alleen keepers) kleuren niet. *Aanvallen*: goals, assists, tweede assists, schoten, conversie, dribbels,
   tegenstanders uitgespeeld. *Passen*: passes gelukt van pogingen, passes, steekpasses, aandeel vooruit.
   *Verdedigen*: balwinst, onderscheppingen, tackles gewonnen van pogingen, de nul gehouden, reddingen (keepers).
   *Discipline*: balverlies, uit positie, overtredingen, kaarten. Alleen wat EA telt (§2 en docs/event-codes.md).
   Vóór de speler staat per regel een **rondje met de plek** van de speler onder onze spelers (sinds 31 oktober 2026),
   in goud, zilver, brons of leigrijs zoals bij de sessies. De plek gaat op het getal per wedstrijd (bij een percentage
   het percentage), niet op het totaal: wie meer speelt, telt anders vanzelf meer. Wie hetzelfde getal heeft zoals het
   er staat (één decimaal, percentage afgerond), deelt de plek; de volgende plek telt door (1, 1, 2). Lager is beter
   bij balverlies, uit positie, overtredingen en kaarten. Mee doet wie minstens **3 wedstrijden** heeft voor die maat
   (bij gebeurtenissen van EA: 3 wedstrijden met gebeurtenissen); bij een percentage ook minstens **10 pogingen**, anders
   zegt één schot of tackle te veel. Wie daar niet aan voldoet, krijgt geen rondje. Reddingen hebben geen plek (alleen
   keepers). **Een tik op een regel** opent de ranglijst van die maat: alle spelers die meedoen, met plek, getal per
   wedstrijd (of percentage) en klein het totaal (of de breuk), de gekozen speler gemarkeerd, en onderaan de club.
   **Gelijk getal per wedstrijd: het totaal beslist** (sinds 1 november 2026). Waar EA een carrièretotaal heeft (goals,
   assists, passes, gewonnen tackles) telt dat totaal, anders het totaal van de gevolgde wedstrijden; bij
   lager-is-beter wint het kleinere totaal. Alleen bij precies hetzelfde getal én totaal delen spelers de plek. In de
   ranglijst staat het carrièretotaal klein achter het gevolgde totaal (*120 bij EA*).
4. **Groei** (sinds 1 november 2026): eerder tegenover nu. *Eerder* is de carrière volgens EA min de gevolgde
   wedstrijden (§3, *Eerder en nu*), *nu* zijn de gevolgde wedstrijden. Per regel beide (kop: *Eerder* en *Nu* met het aantal
   wedstrijden): rating, goals, assists en man of the match per wedstrijd, zonder die woorden. Een verschil is **beduidend** als het groter is dan twee keer de onzekerheid: bij de
   rating de spreiding van de eigen ratings × √(1/n₁ + 1/n₂), plus de afronding van EA (0,05 × carrière / eerder); bij
   aantallen √(eerder/n₁ + nu/n₂) per wedstrijd (telling). Beduidend beter groen, slechter rood, de rest gewoon.
   Bovenaan één zin met het oordeel op de rating (*beduidend beter dan eerder*, *beduidend minder*, *geen duidelijk
   verschil*). Minder dan 10 eerdere wedstrijden: geen vergelijking, alleen dat er te weinig is. Let op: eerder kan
   in een lagere divisie en met andere medespelers zijn; het oordeel zegt *anders dan eerder*, niet waarom.
5. De laatste acht wedstrijden, de rest achter een knop.
Het advies (§8), *Aan de bal in context* (§4a), de vormgrafiek per sessie en het buildformulier staan voorlopig niet
op de pagina; de code blijft, zodat ze terug kunnen als het eerste scherm klaar is.

**Favoriet** (sinds 31 oktober 2026): wie de app gebruikt, kan één speler als favoriet kiezen met de ster rechtsboven
in het vlak van de spelerskaart (nog eens tikken haalt hem weg). Dat wordt per browser onthouden, niet gedeeld. De favoriet opent als je
*Spelers* opent zonder naam, staat vooraan bij de namen en in de Selectie op het Clubhouse, met een ster.

**Laden**: elke pagina toont meteen de opbouw met grijze, zacht pulserende vlakken op de plek van kaart, tekst en
lijsten tot de data er is, en een dun bewegend lijntje bovenaan zolang er wordt geladen. Foto's op de kaart komen
met een korte fade tevoorschijn, met tot die tijd een pulserend vlak; na twee seconden verschijnt een foto hoe dan
ook.

**Sessies** begint met een kaart per avond, nieuwste eerst (geïnspireerd op de sessiekaart van FC Clubs): de datum,
de uitslag groot als W-G-V, en twee cijfers: doelpunten en de gemiddelde rating van het team. Geen punten per
wedstrijd: de W-G-V zegt het al. Daaronder de tijdlijn: per wedstrijd een rondje
met de uitslag, het shirt van de tegenstander en de score. Onderaan de **speler van de sessie**: de hoogste gemiddelde
rating onder wie minstens de helft van de wedstrijden speelde, met een kleine foto (zonder foto een icoon) in een
rondje met de rand- en achtergrondkleur van de huidige vorm van die speler (goud, zwart-goud of blauw, §9c) en
altijd de portretfoto (geen vormfoto: in een klein rondje is een gezicht herkenbaarder), goals en
assists. Geen duur van de avond: die zegt niets. Het kopvlak kleurt zacht mee met de avond: blauw bij ≥ 2 punten per wedstrijd, rood bij < 1. Een tik opent de
sessie op een eigen pagina, `sessie.html?id=<datum>` (een laag dieper; sinds 1 november 2026 een leesbaar adres:
`sessie.html?id=2026-11-01`, een tweede avond op dezelfde dag `-2`; een wedstrijd `wedstrijd.html?id=2026-11-01-war-team`,
datum en tegenstander, bij een tweede keer dezelfde tegenstander die dag `-2`; datums in Nederlandse tijd; oude adressen
met een volgnummer of het EA-nummer werken nog en worden omgezet), zonder terugknop: *Sessies* in het menu is daar
niet actief, zodat een tik erop terug naar de lijst gaat (sinds 1 november 2026).

**Wedstrijden** is één lijst van alle wedstrijden, nieuwste eerst, niet per avond verdeeld. Per wedstrijd: datum en
tijd, uitslag, tegenstander, score en de beste speler van de wedstrijd (hoogste EA-rating, met een kroon als die ook man of
the match was). Eerst de laatste twintig, de rest achter een knop. Filters (sinds 2 november 2026): type *Alles*, *League*, *Playoff*,
*Vriendschappelijk*, en de uitslag. Vriendschappelijke wedstrijden haalt de verzamelaar sinds 2 november 2026 ook op
(`friendlyMatch`; EA gaf er op 27 oktober nog niets, mogelijk omdat we er toen geen hadden gespeeld). Ze staan apart in
`DATA.friendlies` en tellen **nergens** mee: niet in cijfers, vorm, sessies, ranglijsten of het advies. Alleen in de
lijst (bij *Alles* en *Vriendschappelijk*) en op hun eigen wedstrijdpagina. Naast de filters een knop *Rivalen*.

**Rivalen** (`rivalen.html`, een laag dieper, "Terug naar wedstrijden"; sinds 2 november 2026). Eerst de kaart
**Waar we verliezen**, dan de lijst **Rivalen**: elke club waar we vaker dan één keer tegen speelden (alle typen,
vriendschappelijk inbegrepen, want het gaat om de onderlinge stand), meeste wedstrijden eerst, dan de laatste. Per club
het logo, de naam, de stand (W-G-V) en de doelpunten. Een tik opent een dialoog: de stand groot, goals voor en tegen,
het grootste verschil (beste winst, zwaarste nederlaag), hun skill rating en aantal mensen gemiddeld, en alle
wedstrijden als `matchRow`, nieuwste eerst. Onderaan een knop naar de laatste wedstrijd en vorige/volgende rivaal.

**Waar we verliezen** (advies over de tegenstander). Per kenmerk van de tegenstander het winstpercentage mét tegenover
zónder dat kenmerk, over league en playoff (niet vriendschappelijk), alleen wedstrijden waarvan EA de tegenstanders
meegaf. Kenmerken, alleen wat EA geeft (mensen en hun ingestelde positie; AI per linie geeft EA niet):
- meer mensen dan wij; minder mensen dan wij;
- een menselijke keeper; minstens één menselijke verdediger;
- minstens twee menselijke aanvallers; minstens drie menselijke middenvelders;
- sterker volgens EA (skill rating ≥ 100 hoger dan de onze nu).

Een kenmerk telt pas als beide groepen minstens acht wedstrijden hebben. Sinds 3 november 2026 (§9e) beslist niet
het winstpercentage maar het **doelsaldo tov verwachting** (§3, dus gecorrigeerd voor sterkte en mensen): duidelijk is
een verschil van minstens een halve goal per wedstrijd dat ook minstens twee keer zo groot is als de onzekerheid
(standaardfout van het verschil). De balken tonen nog wel het winstpercentage met en zonder, want dat snapt iedereen;
is het verschil in winst groot maar na correctie niet duidelijk, dan staat erbij *komt door hoe sterk ze waren*.
Vroeger (tot 3 november 2026): duidelijk bij minstens 15 procentpunt winst, zonder correctie. De duidelijke slechte kenmerken staan bovenaan (rood, hooguit drie open, de grootste verschillen eerst), elk met één praktische tip; duidelijk goede
(blauw) daarna als *Hier halen we punten*; de rest, zonder duidelijk verschil, achter een knop. Eerlijk erbij (achter de
i-knop): de kenmerken overlappen (wie meer mensen heeft, heeft vaker een menselijke verdediger), dus het zijn signalen,
geen oorzaken. Geen kenmerk duidelijk: dat zeggen, niets verzinnen. In het kort bovenaan één zin met de twee grootste. De tips:
- meer mensen: korter en sneller spelen, niet blijven dribbelen in een vol veld;
- menselijke keeper: laag en in de hoek afronden, niet hard op de keeper;
- menselijke verdediger: de steekpass wordt gelezen; eerst combineren, de bal ook laten lopen naar de flank;
- twee of meer menselijke aanvallers: een middenvelder blijft achter de bal, niet met z'n allen mee naar voren;
- drie of meer menselijke middenvelders: het midden zit dicht; sneller over de flank en in de diepte;
- sterker: eerst de nul houden, compacter staan, minder risico op eigen helft.

**Algemeen** (Clubhouse; sinds 2 november 2026 één rij, *Topspelers* is erin opgegaan omdat het dubbel was): één rij
ranglijstkaartjes (`rankCards` in `public/common.js`). De eerste vier over de hele carrière bij de club volgens EA,
ook van vóór deze app: **Rating**, **Goals**, **Assists**, **Man of the match**. Sinds 2 november 2026 alleen die
vier: de knop *Alle ranglijsten* met de ranglijsten over de gevolgde wedstrijden is weg (deed te weinig; de
spelerspagina heeft per maat al een ranglijst achter elke regel, en *Gevaarlijkste spelers* toont de uitschieters).
Op een kaartje staat alleen het getal, geen sublabel (wedstrijden, per wedstrijd); dat staat in het uitlegscherm
dat een tik opent, samen met waar het op gebaseerd is en wie meetelt. Bij gelijk staat wie meer wedstrijden speelde
hoger (rating) of wie het in minder wedstrijden deed (totalen).

**Zo speelden we** (sessie, sinds 2 november 2026 één kaart): bovenin de radar, daaronder dezelfde assen als lijst,
uitgesplitst in de cijfers die erin zitten, in de volgorde van de assen: Rating; Goals en Conversie (Scoren); Assists,
Tweede assists en Steekpasses (Creëren); Passes (Passen); Dribbels (Dribbelen); Tackles gewonnen en Onderscheppingen
(Verdedigen); Man of the match. Sinds 3 november 2026 hebben drie kaartjes twee regels per speler: Conversie (groot het
percentage, klein het aantal schoten), Passes (groot het percentage, klein het aantal gelukte passes) en Dribbels
(groot de geslaagde dribbels, klein hoeveel tegenstanders voorbij werden gespeeld). Per speler het totaal van de avond (percentages en rating
als gemiddelde), zonder sublabel; onderaan elke lijst, zonder plek, het **Team**: het totaal of gemiddelde van iedereen
samen (bij goals alle goals van de uitslag, ook die van AI). Een tik op een kaartje opent de hele lijst met uitleg en
het kleine cijfer (aantal wedstrijden, of de breuk bij percentages). Zo zie je hetzelfde als beeld en als lijst.

**Club** (sinds 2 november 2026 heet het Clubhouse in het menu *Club*). Elke sectie is een eigen kaart met de titel
erin, ook het nieuws. Volgorde: de **kop** in clubkleuren (een verloop van paars naar geel, geen stadion) met logo,
naam, skill rating en divisie, daarin de **balans van het seizoen** (W-G-V groot met balk en winstpercentage; goals,
tegen, saldo en de nul) en de laatste tien als rondjes; geen aparte kaart *Seizoen* en geen chips *In het kort* meer.
Dan **Gevaarlijkste spelers** (zie hieronder), de laatste sessie en de
trofeeënkast, **Nieuws** (kleine kaartjes: beeld links, tekst rechts; op telefoon de laatste vijf als rij), Algemeen
en Selectie. *Laatste uitslagen* is sinds 3 november 2026 weg: de laatste sessie toont ze al.

**Gevaarlijkste spelers** (herzien op 4 november 2026: zo simpel mogelijk; Afmaker en Druk zetten dezelfde dag
vervangen door Goals + assists en Compleet: conversie zegt weinig zolang je niet weet hoe moeilijk de kansen waren, en
goals plus assists per wedstrijd is de hardste maat voor bijdrage). Zes tegels, elk **één gewone statistiek**,
zonder punten, weging of percentielen:
| Tegel | Wat | Over | Wie telt mee |
|---|---|---|---|
| Topscorer | goals | hele carrière bij de club volgens EA (zoals *Algemeen*) | iedereen |
| Topassist | assists | idem | iedereen |
| Goals + assists | goals plus assists per wedstrijd | hele carrière bij de club volgens EA | iedereen |
| Verdedigen | gewonnen tackles + onderscheppingen + kopduels achterin + blokken + wegwerken, per wedstrijd | idem | idem |
| Passes | geslaagde passes per wedstrijd, klein het deel dat aankomt | gevolgde wedstrijden | minstens vijf wedstrijden |
| Compleet | Frambroos-index (§9b): gemiddelde van vier fronten | gevolgde wedstrijden | minstens drie |
Elk uitlegscherm toont **alle** spelers van de selectie; wie de drempel niet haalt, staat onderaan met een streepje.
Op de tegel: naam, het getal groot, klein waar het op rust (bijv. *36 goals uit 103 schoten*).

*Waarom zo*: de vorige versie (punten per wedstrijd, omgerekend naar een percentiel per teamgrootte, en *Compleet*)
was niet na te rekenen en bevoordeelde wie veel dribbelt: Terry Yaki stond bovenaan Aanvallend door "tegenstander
voorbij ½", terwijl Petra Selie meer scoort en Bennie en G. Snoek een hogere conversie hebben. Een gewone statistiek
zegt precies wat hij zegt. Druk zetten telt niet mee bij Verdedigen (een tackle hoog op het veld zou dan dubbel
tellen) en staat als balwinst op de spelerspagina.
Of een statistiek samenhangt met winnen, staat in §9e; dat is geen reden om actief werk niet te tonen.
Vervallen (4 november 2026): de scores Aanvallend, Creëren, Verdedigend en Compleet (3 november 2026), en daarvoor
een score tegenover alleen onze zes spelers.

Meer lucht tussen de kaarten (20 px). Op telefoon staat de laatste sessie als
dezelfde kaart als in de sessielijst (`sessionCardHtml`) met het label *Huidige sessie* of *Laatste sessie*.
**Selectie** (Spelers): per speler de spelerskaart groter, met rechts de titel en de biografie, visueel afgekapt
(twee regels op telefoon, drie op een tablet, vier op een groot scherm; geen eigen tekst); linksboven in de rij een zwevend sterretje om de favoriet te kiezen (vol als
favoriet); geen losse
cijfers ernaast (die staan op de kaart) en geen vorm per wedstrijd (iedereen speelt dezelfde wedstrijden).
**Opstelling** (wedstrijd, sinds 2 november 2026): één staand veld met per linie **wij links en de tegenstander rechts**,
het label (Aanval, Middenveld, Verdediging, Keeper) in het midden, zodat je per linie van links naar rechts vergelijkt;
onderaan het eigen doel, bovenaan het doel waar op wordt aangevallen. Een linie zonder mensen heet *AI*. Het veld is
twaalf banen hoog in licht- en donkergroen, en de lijnen vallen precies op de baangrenzen: strafschopgebied twee banen,
doelgebied één, middenlijn na zes; verder middencirkel en -stip, penaltystip, boog en doel aan beide kanten. Op
telefoon smallere banen en rondjes zonder naam.
**Wij tegen hen** (wedstrijd): per cijfer één regel met beide totalen en een verdeelde balk; een tik klapt de regel
open met alle spelers van beide kanten als balkjes (wij blauw, zij oranje), de beste bovenaan. Vervangt de losse
ranglijstkaartjes *Spelers* op de wedstrijdpagina. Nieuwe cijfers: één regel in `VS_STATS` (`wedstrijd.js`).
**Trofeeënkast** (stijl sinds 3 november 2026, subtieler sinds 4 november): geen kaartjes, want die lijken aan te tikken
en dat zijn ze niet. Elke prijs staat als voorwerp: EA's gouden badge op een **subtiele schaal** (transparant goudverloop,
een dunne rand en een fijne zonnestraal zoals guillocheerwerk; vaste kleuren los van het thema), met eronder het seizoen,
de divisie en hoe ver we kwamen. Geen plankje, geen schaduw, geen rand, geen achtergrond, geen hover.
Inhoud: wat EA per afgesloten seizoen bewaart (`club/playoffAchievements`): de divisie met EA's eigen
divisiebadge (`divisioncrest<n>.png` op EA's CDN, met onze beker als terugval) en hoe ver we kwamen (eindgroep 1
*Kampioen*, 6 *Deelnemer*, daartussen *Eindgroep n*), plus de beste divisie ooit. EA's schaal begint bij Elite: 1 is
Elite, 2 is Divisie 1 (zoals andere apps het tonen). Seizoen 1: Divisie 1, deelnemer. Promoties en degradaties staan
niet in de kast.
**Pack**: de reveal (`pack.js`) speelt op de sessiepagina één keer voor de nieuwste afgeronde sessie die deze kijker
nog niet zag. Op de sessielijst en de Club staat bij zo'n sessie (en bij de testsessie) een knop *Openen*: een tik speelt
de reveal op dezelfde pagina; verversen speelt hem niet opnieuw af.
**Ranglijstkaartjes**: **altijd alle spelers** (sinds 3 november 2026): elk kaartje in een rij toont iedereen die op
één van de kaartjes in die rij staat (bij een sessie iedereen die meespeelde, bij *Algemeen* de hele selectie). Wie
voor een maat te weinig heeft (te weinig pogingen of wedstrijden), staat onderaan met een streepje en zonder plek, zodat
er nooit ineens een speler ontbreekt. Elke regel even hoog, of er één of twee regels in staan. Het totaal (team) staat onderaan over de
hele breedte van het kaartje, met een lijn erboven en een net iets lichtere achtergrond. Bij een percentage klein de breuk
zonder woorden: conversie *5 / 10* (goals / schoten), passes *gelukt / pogingen*.

**Sessiekop** (sinds 1 november 2026; daarvoor een scorebord zonder duidelijk middelpunt): één kaart met een
**split**, zodat elk deel bij zijn soort hoort en het met de thema's meeschaalt.
- **Boven: het beeld** op het stadion van het Clubhouse (vaste kleuren, los van het thema): groot de **naam van de
  sessie** (de datum; sinds 1 november 2026 zonder gele regel met type en aantallen: niet boeiend genoeg); op
  telefoon afgekort tot drie letters (*Don 29 okt*), met links en rechts ervan de knoppen naar de vorige en volgende
  sessie; daaronder de **quote van de beste
  speler** (§9, Sessie) met de naam erachter op dezelfde regel; en de **top drie** als kaartjes naast elkaar (sinds
  1 november 2026 zonder podium): de nummer één in het midden en groter, twee links, drie rechts, met de onderkanten
  op één lijn. De **plek staat in het kaartje** als medaille linksboven, de **naam in het kaartje** onder de rating
  (afgekapt met … als hij niet past, met ruim afstand tot de rand). Rand en vlak in de kleur van de plek (zie
  *Kleur van de plek*, §9c). Een tik scrollt naar *Per wedstrijd*. Op een groot scherm de tekst links en de kaartjes
  rechts, op telefoon alles onder elkaar en gecentreerd, met ruimte tussen titel, quote en kaartjes.
  **Vorige en volgende sessie**: op telefoon een rond icoonknopje links (vorige, ouder) en rechts (volgende, nieuwer)
  van de titel; een knop staat er alleen als die sessie bestaat (anders een lege plek, zodat de titel in het midden
  blijft). **Een tik op een kaartje** (ook boven *Per wedstrijd*) opent de speler over de hele avond: wedstrijden,
  rating, goals, assists en man of the match, de rating per wedstrijd als rondjes, de radar van die speler met het
  team vaag erachter, en dezelfde zes maten als tabel (deze avond en normaal); met een link naar de spelerspagina.
  **Medaille in het kaartje**: iets van de hoek af (naar rechts en omlaag), zodat er kaart omheen zichtbaar blijft.
  Op telefoon staan W-G-V links en Goals en Tegengoals rechts, direct links van de deelknop.
- **Onder: een paneel** in de kleuren van het thema (donker of licht): de uitslag in drie getallen, **W-G-V** in de
  uitslagkleuren, **Goals** en **Tegen** (rechts uitgelijnd; geen doelsaldo, geen *de nul*), met op dezelfde regel rechts een
  ingetogen **deelknop** (rond icoon met een dunne rand, zonder label). Die opent een klein menu: *Afbeelding delen*
  (of downloaden waar delen niet kan), *Afbeelding kopiëren* (naar het klembord) en *Gegevens kopiëren* (de avond als
  tekst: datum, uitslag, alle wedstrijden met tijd, uitslag, score en tegenstander, en per speler wedstrijden, rating,
  goals, assists en man of the match; plakklaar in een chat of spreadsheet). Een afbeelding kan geen klikbare link bevatten: bij *Afbeelding delen* gaat de link naar deze sessie als tekst mee
  (de app waarin je deelt zet hem bij de afbeelding), onderaan de afbeelding staat dat adres, en *Link kopiëren* zet
  het op het klembord. Een korte melding bevestigt het kopiëren; daaronder de **wedstrijden als scrollbare rij kaartjes** (een tik
  opent de wedstrijd). Geen anekdote als tekst: die bepaalt alleen het thema van de quote.
De radar eronder vertelt **hoe we speelden**; geen cijfers dubbel. De top drie staat op rating over deze avond.
**Deelkaart** (afbeelding van 1080 breed, zo hoog als nodig; sinds 1 november 2026): in de stijl van de kop. Boven
het stadion met de dag en de uitslag (W-G-V, Goals, Tegen); dan de **beste speler van de avond** met het kaartje (plek,
rating, naam), de naam en de quote ernaast (het gemiddelde staat al in het kaartje); dan **iedereen van beste tot
minste**: plek als medaille, een klein kaartje met foto (vorm en kleur van de plek, zoals boven *Per wedstrijd*), naam, rating van de avond en rechts de maten die de rating dragen (dezelfde als in het spelersscherm, zonder
de rating zelf): goals, assists, passen (percentage), balwinst en gewonnen duels (aantallen, geen percentage bij
weinig pogingen). Per speler staan de cijfers die bij de rol van die avond horen fel, de rest gedimd: aanval goals en
assists; middenveld assists, passen en balwinst; verdediging balwinst, duels en passen; keeper passen.

**Plek op een avond** (top drie, *Per wedstrijd*, deelkaart): op het exacte gemiddelde van de rating, niet op het
afgeronde getal (7,10 gaat voor 7,08, ook al staat er twee keer 7,1). Alleen bij precies hetzelfde gemiddelde beslist
een succesmaat van de rol van die avond (de positie die het vaakst voorkwam): aanval goals plus assists per
wedstrijd, middenveld passnauwkeurigheid, verdediging gewonnen tackles van de pogingen, keeper reddingen per wedstrijd.
Pas als ook die gelijk is, delen spelers de plek.

**Per wedstrijd** (sinds 31 oktober 2026, vervangt *Spelers deze sessie*): een raster met per speler een kolom en
per wedstrijd een rij (uitslag, shirt, score). Bovenaan per speler een **minikaartje** met foto, het gemiddelde van de
avond en de **naam in het kaartje**, in de kleur van de plek op dat gemiddelde (*Kleur van de plek*, zonder
medaille); geen vergelijking met normaal (sinds 1 november 2026 weggehaald:
te ingewikkeld voor wat het zei). De kolommen staan op volgorde van het gemiddelde.
**Het spelersscherm** (een tik op een speler in het podium of de radar) begint met een kop: het portret in een
rondje, de naam, de datum en de plek van de avond. Alleen bij de **winnaar** (plek 1) staat daaronder de quote van de
avond (sinds 3 november 2026; even daarvoor had iedereen een eigen uitspraak). De quote is de beloning: kort en
raak, een punchline, geen analyse.

**Clubhouse, seizoen** (sinds 3 november 2026): bovenin de balans volgens EA: groot W-G-V in de uitslagkleuren met
een balk eronder en het winstpercentage, daarnaast doelpunten, tegengoals, saldo en clean sheets; dan *In het kort* als
drie vakjes, dan de vormgrafiek. Daaronder naast elkaar **Laatste sessie** (één tik naar de avond: datum, W-G-V,
rondjes, en de speler van de sessie of het dichte pack) en **Trofeeën**: per promotie (of degradatie) die we zagen
gebeuren een beker met het moment en de wedstrijd ervoor (uit de snapshots: de teller van EA ging omhoog), plus één
regel voor wat er al was voordat de app meekeek; verticaal te scrollen. Het nieuws is één compacte rij.

**Menu** (sinds 3 november 2026): een pagina een laag dieper (sessie, wedstrijd, rivalen, nieuws, een spelersprofiel) zet **geen** tabblad actief, zodat een tik op het tabblad terug naar de lijst gaat; overal hetzelfde (4 november 2026). rechts in de menubalk een menuknop (op telefoon in de balk onderin) met zoeken door
tegenstanders, spelers en sessies; de **modus** (alles, alleen league, alleen playoff; geldt voor de hele app en
wordt per browser onthouden); de rating (nu alleen EA, *eigen* volgt); en thuis- of uittenue. Op telefoon heet
Wedstrijden in de balk *Games*, zodat alles past.

**Wedstrijdpagina** (sinds 3 november 2026, één kaart): bovenin, met het stadion erachter, de dag als titel met de
ronde pijltjes naar de vorige en volgende wedstrijd (hetzelfde element als bij een sessie, `navArrow` in
`common.js`), de twee logo's met de score en de tegenstander in woorden: *sterkere*, *gelijkwaardige* of *zwakkere
tegenstander* (100 ratingpunten verschil, zoals overal). Geen terugknop, geen titel "Tegen …", geen tijd of soort,
geen samenvatting en geen aantal mensen (dat zie je in het veld). Direct daaronder, in dezelfde kaart, het gras met de
**opstelling**: per linie één rij (aanval bovenaan), wij links en zij rechts, elk in een eigen vlak met de rondjes in
het midden, en de naam van de linie één keer in een vaste middenkolom op de gestippelde middenlijn, zodat alle linies
recht onder elkaar staan. Het veld lijkt op een echt veld: banen in donker- en lichtgroen per linie (geen
stippellijnen), de middenlijn, de middencirkel in het middenveld, en onderaan bij de keeper het strafschopgebied, het
doelgebied en het doel. Geen teamnamen of aantallen mensen en AI in het veld (die staan in de kop en zie je aan de
rondjes). Man of the match is de ster bij de rating. Geen *Zo viel de goal* meer.

Daaronder *Wij tegen hen* (de ploegen naast elkaar) en **Spelers**: dezelfde ranglijstkaartjes als op het Clubhouse en
bij een sessie, maar met iedereen van beide kanten in één lijst per cijfer (wij met een blauwe stip, zij oranje) en
onderaan beide ploegen: Rating, Goals (bij de ploegen de stand), Assists, Conversie (klein de schoten), Passes (klein de
gelukte passes), Dribbels (klein uitgespeeld), Balwinst, Tackles gewonnen (klein de pogingen) en Balverlies (wie het
minst verloor bovenaan). Geen tabellen meer.

**Spelers** (menu, sinds 3 november 2026): eerst de **selectie**, een lijst van iedereen op vorm (de favoriet bovenaan):
links de kaart, de naam met het vormlabel, de accountnaam en het laatste archetype, en vier cijfers volgens EA
(wedstrijden, goals, assists, rating); rechts het begin van de bio en de vorm van de laatste vijf wedstrijden met
"x van de laatste 5 gewonnen". Onderaan **de AI**: hoeveel wedstrijden er AI meedeed, gemiddeld hoeveel plekken, en de
goals die geen mens van ons maakte (soms ook een eigen doelpunt van de tegenstander). Een tik op een speler opent het
profiel; daar wissel je van speler met een keuzemenu bovenaan (geen pillen meer).

**Schermen** (menu, spelers, uitleg) openen en sluiten met een animatie: op telefoon schuiven ze van onder omhoog en
weer omlaag, op een groot scherm vervagen ze; ook bij Esc of een tik ernaast.

**Sessie bezig en de reveal** (sinds 3 november 2026, als een FUT-pack): een sessie is **bezig** zolang de laatste
wedstrijd minder dan 3 uur geleden is (dezelfde grens als waarmee wedstrijden een sessie vormen, `SESSION_GAP`); daarna
kan er niets meer bij en is hij **klaar**. Zolang een sessie bezig is, is alles wat een ranglijst is dicht: geen
podium, geen quote, geen speler van de sessie, geen *Zo speelden we* of *Ratings per wedstrijd*, geen deelknop en geen
nieuwsartikel. Wel zichtbaar: datum, W-G-V, goals, saldo en de wedstrijden zelf (die werken gewoon bij). Op de plek
van het podium staat een dicht pack met "Gaat open als de avond klaar is". Op *Sessies* staat bij die avond "Bezig".
Is de **nieuwste** sessie klaar en heeft deze kijker hem nog niet geopend, dan staat er op *Sessies* "Pack staat
klaar" en speelt de sessiepagina eerst de **reveal**: een pack in clubkleuren, een tik opent het (trillen, lichtflits,
stralen), dan komen nummer drie, twee en één één voor één tevoorschijn, met als laatste de quote van de winnaar en een
knop *Bekijk de avond*. Overslaan kan altijd. Daarna is de sessie open zoals altijd. Alleen de nieuwste sessie en alleen
de eerste keer (onthouden per kijker in de browser): wie een avond heeft gemist toen er alweer een nieuwe was, ziet
die oudere gewoon open. Het nieuwsartikel van die avond verschijnt pas na de reveal, zodat het niets verklapt. Op telefoon is elk scherm een paneel dat van onderen omhoog schuift, bijna
schermvullend met wat lucht bovenaan en een handvat; de knoppen onderin (vorige speler, naar de spelerspagina,
volgende speler) zijn drie losse, omrande knoppen.

De kaart onder de radar heet **Ratings per wedstrijd** (de titel zegt wat eronder staat). In de sessiekop staan
W-G-V, goals en het **saldo** (+5, 0, −2), niet meer de tegengoals.

**Knoppen onderin een scherm**: vlakke knoppen die de hele balk vullen, alleen gescheiden door dunne lijnen; geen
eigen achtergrond of rand per knop. Zonder vorige of volgende speler vult de middelste knop de ruimte. Sluiten werkt
met het kruisje of een tik naast het scherm; op telefoon reageert het kruisje al bij loslaten en wordt de klik
erna ingeslikt, zodat die niet op de pagina eronder belandt.

**Een tik op een cijfer** opent wat die speler in die wedstrijd deed (sinds 1 november 2026): de rating, en waar die
op rust: goals, assists, schoten, passes gelukt van pogingen, tackles gewonnen van pogingen, balwinst en balverlies
(uit de events), reddingen bij een keeper, man of the match, en het archetype. EA zegt niet hoe de rating berekend
wordt; dit is wat erachter zit, niet de formule. Met een link naar de wedstrijd.
Elke cel kleurt naar de plek in die rij: goud, zilver en brons voor de beste drie, leigrijs voor de rest (gelijke ratings
delen een plek). Man of the match met een kroon. Geen oplichten bij aanraken: aanklikken van een rij of kolom voor
meer details is een latere stap. Op telefoon horizontaal scrollen met de wedstrijden vast links.
**Metaalkleuren** (medailles, cellen): vlak met een heel zachte glans bovenaan, geen felle verlopen.

**FUT-pack (idee, nog niet gebouwd)**: de sessiekaarten van alle spelers (wat eerst *Spelers deze sessie* was) als
een pack dat je per sessie kunt openen, kaart voor kaart, van ijzer naar goud. De code voor de kaarten met plek staat
er al (`PlayerCard.html(naam, { session, rank })`).

**Radar van de avond** (op de sessiepagina, na de kop): **hoe we speelden**, standaard als team; een tik op een naam
licht die speler uit, nog een tik op dezelfde naam zet hem uit en toont weer het team (sinds 1 november 2026; daarvoor
een aparte knop *Team*). Knoppen: eerst *Team*, dan de spelers; uitzetten van een speler gaat terug naar Team.
**Alle vlakken zijn altijd zichtbaar**: zonder keuze is het team het felst en de spelers vaag,
met een naam gekozen is die speler het felst en de rest (het team ook) vaag. Zes assen; elke as is een **percentiel tegenover onze eigen avonden**. Het teamvlak (standaard) vergelijkt
het team deze avond met alle avonden van het team (minstens 2 wedstrijden); een spelersvlak vergelijkt die speler
met alle avonden van al onze spelers. 50 is een gewone avond (de gestippelde ring), 100 de beste ooit. De assen:

| As | Maat over de avond (voor de vorm) | Onder de titel |
|---|---|---|
| Rating | gemiddelde EA-rating | de rating |
| Scoren | goals per wedstrijd + ½ × goals per schot; bij minder dan vijf schoten telt dat tweede deel naar rato minder | goals |
| Creëren | (assists + 0,7 × tweede assists + 0,35 × steekpasses) per wedstrijd | assists |
| Passen | geslaagde passes per wedstrijd × passnauwkeurigheid (minstens 10 passes) | passnauwkeurigheid |
| Dribbelen | (tegenstanders uitgespeeld + geslaagde dribbels) per wedstrijd, uit de events | totaal |
| Verdedigen | gewonnen tackles per wedstrijd × slagingspercentage + onderscheppingen per wedstrijd | gewonnen tackles + onderscheppingen |

Sinds 2 november 2026 (daarvoor scoren, creëren, passnauwkeurigheid, balwinst en duels als losse cijfers): bredere
maten die meer van het spel vangen en beter aansluiten bij wat de EA-rating draagt (goals, assists, dribbels,
balafpakken; §3). Een knop **Assen** bij de radar opent de uitleg per as (code, naam, één zin). **Normaal** onder een
as is het gemiddelde van dezelfde speler (of het team) over **alle andere** avonden, dus zonder deze avond zelf; bij
aantallen omgerekend naar het aantal wedstrijden van deze avond.

Ontbreekt een maat (te weinig pogingen), dan staat de speler daar op 0. Elke speler heeft een vaste kleur, het team
de clubkleur. Onder elke **astitel staat het cijfer** van wat is uitgelicht, met daaronder klein het normaal. Bij
aantallen (scoren, creëren, balwinst) is dat cijfer het **totaal van de avond** (20 goals), niet het gemiddelde; het
normaal is dan het gemiddelde per wedstrijd van de andere avonden × het aantal wedstrijden van deze avond, zodat een
lange en een korte avond eerlijk te vergelijken zijn. Rating is altijd een gemiddelde, passen en duels een
percentage. De vorm van het vlak blijft per wedstrijd gerekend (anders wint een lange avond altijd). Standaard het
teamvlak fel en de spelers vaag; met een speler uitgelicht dat spelersvlak fel en de rest vaag. Spelers met één wedstrijd die avond doen niet mee: één pot zegt te weinig.

**Opstelling** (wedstrijdpagina, sinds 30 oktober 2026): één veld met beide teams. Op een groot scherm liggend: links
wij van keeper naar aanval, rechts de tegenstander gespiegeld, zodat de aanvallers elkaar in het midden treffen. Op een
telefoon (vanaf 900 px) staan de teams **naast elkaar** in vier vlakken onder elkaar (aanval, middenveld, verdediging,
keeper), wij links en de tegenstander rechts. Elke speler is een **rondje met de rating eronder**: bij ons het
portret (zonder foto het archetype-icoon), bij de tegenstander het archetype-icoon van de gespeelde build; de naam
staat erbij als het past en altijd in de tooltip. Per linie het aantal mensen; per team bovenaan het aantal mensen en
het aantal AI-spelers (11 min de mensen). Hoeveel AI-spelers er per linie stonden geeft EA niet (geen formatie, geen
posities van AI; gecontroleerd op 30 oktober 2026), dus dat tonen we niet; een linie zonder mensen heet "AI".

**Tweede assist** (EA-code 115, `second_assists`, zekerheid *waarschijnlijk*): de pass vóór de assist. EA geeft alleen
het aantal per speler per wedstrijd, niet bij welke goal. Alleen als we in een wedstrijd precies één keer scoren, is
de keten te reconstrueren: wie scoorde, wie de assist gaf en wie de tweede assist. Dat tonen we op de wedstrijdpagina
als *Zo viel de goal*. Ontbreekt een schakel, dan zeggen we dat (geen assist, of een AI-speler gaf hem: AI-spelers
staan niet in de data). Bij meer goals verbinden we niets.

**Radar: normaal van het team** (sinds 4 november 2026): tellingen van het team (creëren, passen, dribbelen,
verdedigen) hangen af van hoeveel mensen er meedoen, want EA telt geen AI. Het team wordt daarom per mens vergeleken met
andere avonden, en het normaal onder de astitel is omgerekend naar het aantal mensen van deze avond. Daarvoor leek een
avond met zes man vanzelf beter dan normaal (2 november: 120 verdedigende acties tegen een normaal van 91, terwijl het per
mens gewoon gemiddeld was). Bij een speler blijft het zoals het was.

## 9b. Frambroos-index (Compleet)

Eén getal per speler (en per speler per wedstrijd): **hoe hoog iemand op elk front scoort**, los van de uitslag. 50 is
gemiddeld; hoger is beter. Op het Clubhouse de tegel *Compleet*. Versimpeld op 4 november 2026 op verzoek van Jamal:
geen rollen, geen gewichten, vier fronten met elk één gewoon getal.

**Vier fronten**, per wedstrijd (alleen rijen met minstens 45 minuten en gebeurtenissen van EA):
| Front | Getal |
|---|---|
| Aanvallen | goals + assists |
| Passen | geslaagde passes (215) |
| Balbehoud | balverlies per balactie (lager is beter; minstens vijf balacties) |
| Verdedigen | gewonnen tackles + onderscheppingen + kopduels achterin + blokken + wegwerken + balwinst (ook druk zetten) |

1. Elk getal wordt een percentiel (0–100, gelijke waarden in het midden) tegenover **alle mensen** die we tegenkwamen,
   tegenstanders inbegrepen, ongeacht positie.
2. De wedstrijdscore is het gewone gemiddelde van de vier fronten.
3. Per speler het gemiddelde van de wedstrijdscores, naar 50 getrokken bij weinig wedstrijden: `(som + 5 × 50) / (n + 5)`.
   Ook per front. Minimaal 3 wedstrijden. Op de tegel staat het zwakste front: compleet is zo sterk als je zwakste kant.

**Wat dit wel en niet is**: het beloont breedte, niet winnen. Middenvelders komen er gemiddeld hoger uit (53) dan
aanvallers (44), want een spits hoeft niet te verdedigen. Samenhang met het doelsaldo (gecorrigeerd voor sterkte, 670
speler-wedstrijden): 0,23; de vorige versie met rollen 0,30, die daarvoor 0,35, de EA-matchrating 0,39. Balwinst telt
deels dubbel met tackles en onderscheppingen (bewust: Jamal wil druk zetten meetellen).

**Labels**: ≥ 58 *uitblinker*, ≥ 53 *boven gemiddeld*, > 47 *gemiddeld*, > 42 *onder gemiddeld*, anders *ver onder*.
Per wedstrijd: ≥ 70 *topwedstrijd*, ≤ 30 *mindere wedstrijd*.

**Rollen** (`rol` in `personas.js`, `rolOf` in `frambroos-index.js`) staan vast zoals Jamal ze beschreef (4 november
2026): G. Snoek spits; Petra Selie en Bennie aanvallend middenveld; Terry Yaki aanvallend middenveld, zonder G. Snoek
spits; Mo van der Kamp verdedigend middenveld, zonder G. Snoek en met vier of minder aanvallend; J. Wheatley verdedigend.
De index gebruikt ze niet meer; ze blijven als kennis voor later (bijv. vergelijken binnen een rol).

## 9c. Spelerskaart: tiers

De kaart op de spelerspagina heeft de vorm van een FC-kaart (één pad in `playercard.js`: scherpe hoeken bovenaan met één boog
ertussen, punt met inkeping, dubbele gouden rand) en een tier die met de vorm meebeweegt. Zonder foto staat er een icoon. Bovenste helft: overall, archetype-icoon
(`ARCHETYPE_ICON` in `public/archetypes.js`, eigen lijniconen), logo en foto; de foto staat rechts van rating en iconen, met wat lucht boven het hoofd.
Eén verloop over de hele kaart; alleen een foto krijgt een eigen vlak (`--t-photo`) dat zacht overloopt in het
verloop, met een gloed achter de overall. Zonder foto een gevuld, licht transparant silhouet in de tekstkleur (donker op
goud, licht op zwart en blauw). Onderste helft: de naam van de pro voluit zoals in FC
(uit `proName`, bijvoorbeeld Petra Selie; sinds 1 november 2026, daarvoor afgekort tot P. Selie) en zes cijfers in twee kolommen: de carrièretotalen volgens EA (WED, RAT, GLS | ASS, MOTM, WIN), of de
face stats van de ingevulde build. Ernaast staan de cijfers uit de gevolgde wedstrijden (*Gevolgd*). Geen archetype-
tekst op de kaart: het icoon zegt het.
Geen scheidingslijnen; de tier zie je aan de kaart zelf, zonder label.

Vorm wordt **per sessie** bepaald (sinds 28 oktober 2026; daarvoor de laatste vijf wedstrijden): een speelavond is
een afgerond geheel, en zo betekent de kaart "hoe was je de laatste keer dat we speelden". De vorm van nu is die van
de **laatste sessie waarin de speler minstens 3 wedstrijden speelde** (een avond van twee potten zegt te weinig en telt
niet mee). Er zijn twee wegen naar *in vorm*: een hoog niveau, of groei. Een vaste goede speler wordt zo niet gestraft
omdat het eigen normaal al hoog ligt.

- **Niveau**: de gemiddelde EA-rating over die sessie.
- **Groei** (vormscore): (rating in de sessie − eigen normaal) + ¼ × (punten per wedstrijd in de sessie − eigen
  normaal). Eigen normaal = alle andere wedstrijden van die speler. Punten: winst 3, gelijk 1, verlies 0.

| Tier | Voorwaarde (over de sessie) | Uiterlijk |
|---|---|---|
| **Goud** | standaard, of minder dan 3 wedstrijden in die sessie | goud verloop met een zachte, schuine lichtere baan, donkere tekst |
| **Zwart-goud** (in vorm) | niveau ≥ 7,0, afgerond op één decimaal zoals het er staat (6,95 telt als 7,0; sinds 1 november 2026) (sinds 29 oktober 2026; daarvoor 7,5) **of** (minstens 8 wedstrijden in totaal en groei ≥ 0,3) | zwart met gouden rand en gouden cijfers |
| **Topvorm** | niveau ≥ 8,0 (afgerond, dus vanaf 7,95) **en** minstens 60 % van de sessie gewonnen | diepblauw met gouden stippen en gouden accenten |

In de sessiedetails staat bij elke speler de **rating van de avond** met de groei ernaast, zonder het woord *groei*
(sinds 30 oktober 2026). Geen tier-label (de kaart zegt het al) en geen "normaal": de groei zegt al of het beter of
slechter was. De **plek op rating** staat op de sessiekaart zelf, op de plek van de overall (zie Sessiekaart). Speelde iemand minder dan 3 potten,
dan staat er dat het niet telt voor de vorm.

Doorgerekend op 28 oktober 2026 (laatste sessie): KFH Guip 023 en Neegek topvorm, Xero 023 en Highnis 023 in vorm, de
rest goud; dezelfde verdeling als met de laatste vijf.

**Sessiekaart**: elke speler krijgt per sessie een eigen kaart, zoals een in-form-kaart in FC. Tier en foto volgen die
sessie (minder dan 3 wedstrijden: goud), de zes cijfers zijn die van de avond: WED, RAT (gemiddeld), GLS | ASS, MOTM,
WIN. Bij een sessie (top drie, en later het FUT-pack) krijgt de **buitenste rand** de kleur van de plek op
rating die avond: goud (1), zilver (2), brons (3), en leigrijs voor de rest. De binnenste rand blijft goud,
zodat de tier (het vlak) en de plek (de rand) los te lezen zijn.

**Kleur van de plek** (sinds 1 november 2026): waar kaartjes een plek hebben (top drie en *Per wedstrijd* op de
sessiepagina), volgen de **rand** én, bij een gewone kaart (tier goud, dus niet in vorm), ook het **vlak** de plek:
goud voor één, zilver voor twee, brons voor drie (de gewone gouden kaart is iets lichter, zodat de gouden medaille
erop uitkomt), en **leigrijs** (koel blauwgrijs, met lichte tekst) voor de rest:
duidelijk buiten de prijzen en niet te verwarren met het zwart van *in vorm*. Zo is een gouden kaart altijd de
nummer één en niet "geen vorm". Een kaart in vorm of topvorm houdt het eigen vlak; alleen de rand toont de plek.
Hetzelfde leigrijs voor de cellen en medailles buiten de top drie (vroeger ijzer). Linksboven staat dan **de plek** in plaats van de
overall van de pro (die zegt over één avond niets), in een medaille in de kleur van de buitenrand; de top drie heeft
daardoor geen apart nummerbolletje meer. Op een telefoon vallen archetype, clublogo en vlag op die kaart weg (te klein);
op een groter scherm blijven ze staan. Elders (nieuws) blijft de buitenrand goud. De kaart van nu (spelerspagina, Selectie) blijft de carrièrecijfers van EA tonen, met de tier van de laatste
sessie.

**Reeks per sessie**: waar het over één speler gaat, staat de vorm als de wedstrijden van één sessie, elk als rondje met
de kleur van de uitslag en de **rating die de speler in die wedstrijd kreeg** (een tik opent de wedstrijd). Onder de
kaart op de spelerspagina: de sessie die de vorm bepaalt, met de datum. Bij een geopende sessie: per speler de
sessiekaart en deze reeks. Alleen het Clubhouse houdt de laatste tien uitslagen van de club.

Vlak en rustig: een lichte schaduw, geen gloed, geen strepen en geen bewegende glans; alleen een zachte, schuine
lichtere baan in het verloop zelf (`--t-sheen`). Onder het clublogo staat de vlag van het land
van de pro (`proNationality` van EA, een FC-landennummer: Europa alfabetisch 1–51, Azië vanaf 149; getekend in
`NATIONS` in `playercard.js`). Een nummer dat daar niet in staat krijgt geen vlag; niet gokken, eerst toevoegen.

Bij *in vorm* en *topvorm* toont de kaart de **vormfoto** (`data/players/<slug>-vorm.webp`, een juichende of
stoere pose) als die er is; anders de gewone foto. Onderaan de kaart, onder de cijfers, staat een klein label als de speler in vorm is: *IN VORM* (zwart-goud) of
*TOPVORM* (blauw). Goud heeft geen label.

Dezelfde kaart staat klein (56 %) in de ledenrij op het Clubhouse en in de top drie van een sessie op het Clubhouse, met de accountnaam eronder; cijfers en labels zijn
daar iets groter gezet zodat ze klein leesbaar blijven. Eén functie (`PlayerCard.html`) maakt beide, met SVG-ids per speler.

De tier staat ook als `title` op de kaart, met de sessie waarop hij rust.

## 9e. Verbanden: methode en uitkomst (3 november 2026, ratings van toen sinds 4 november)

**Sterkte op het moment van de wedstrijd** (logische fout tot 4 november 2026): het sterkteverschil gebruikte voor elke
wedstrijd onze skill rating van nu (1804), terwijl die in deze periode van 1598 naar 1804 steeg. Oude tegenstanders leken
daardoor zwakker dan ze waren. Nu: onze rating uit het laatste snapshot vóór de wedstrijd (vóór het eerste snapshot het
eerste, als schatting), die van de tegenstander uit het snapshot het dichtst bij de wedstrijd (`ownRating` in
`src/data.js`, `gapOf(m)` in `common.js`). De conclusies hieronder blijven gelijk (opnieuw gedraaid).

**Methode** (zo toetsen we elk nieuw verband, en zo is dit gedaan):
1. **Eenheid is de wedstrijd**, uitkomst het doelsaldo. Alleen league en playoff, geen opgave, alleen wedstrijden met
   bekende tegenstanders en gebeurtenissen (68 wedstrijden).
2. **Geen uitkomst als verklaring**: goals en assists doen niet mee (die zíjn het doelsaldo). Alleen procesmaten.
3. **Wij min zij, per mens**: EA telt alleen mensen, dus een team met meer mensen telt vanzelf meer. Elke maat is het
   gemiddelde per mens, en het verschil met de tegenstander haalt het tempo van de wedstrijd eruit (wie veel verdedigt,
   heeft de tegenstander vaak aan de bal).
4. **Corrigeren voor sterkte en mensen**: partiële rangcorrelatie (Spearman) met het ratingverschil en het verschil in
   mensen eruit gehaald. Zonder die correctie lijkt alles wat bij sterke tegenstanders hoort een oorzaak.
5. **Onzekerheid**: 95%-interval met bootstrap; **Benjamini-Hochberg** over alle ~90 toetsen (q < 0,1), anders vind je
   bij zoveel maten altijd wel iets.
6. **Herhaling**: de even en oneven wedstrijden apart moeten dezelfde kant op wijzen.
Alleen wat alle zes doorstaat, noemen we een verband. De rest heet *geen duidelijk verband*, hoe aannemelijk het ook klinkt.

**Uitkomst (teamniveau, partieel)**:
| Maat | Samenhang met doelsaldo | Oordeel |
|---|---|---|
| Schoten op doel, wij min zij | 0,60 (helften 0,62 en 0,54) | **verband** |
| Schoten, wij min zij | 0,56 | **verband** |
| Schoten op doel tegen | −0,55 | **verband** |
| Sterkte tegenstander (rating) | −0,46 | **verband** |
| Eigen schoten op doel | 0,38 | **verband** |
| Luchtduels achterin, wij min zij | 0,34 (q 0,05; helften 0,23 en 0,45) | zwak verband |
| Steekpasses, wij min zij; balwinst op het middenveld | 0,29 (q 0,14) | aanwijzing, geen verband |
| Passnauwkeurigheid, aantal passes, dribbels, uitgespeeld, balverlies (elk derde), uit positie, geen goede optie | tussen −0,15 en 0,15 | geen verband |
| **Balwinst op hun helft (druk zetten)** | 0,01 tot 0,05 | geen verband |
| Tackles, onderscheppingen | 0,12 tot 0,19 | geen verband |

**Kenmerken van de tegenstander** (*Waar we verliezen*): zonder correctie lijkt er veel te spelen (twee of meer menselijke
aanvallers 41% winst tegen 71% zonder; meer mensen 33% tegen 56%). Na correctie voor sterkte en mensen (doelsaldo tov
verwachting, §3) is **geen enkel kenmerk** duidelijk (alle p > 0,4). Het verschil in winst komt door hoe sterk ze zijn,
niet door hoe ze zijn opgesteld. Daarom oordeelt *Waar we verliezen* sinds 3 november 2026 op het doelsaldo tov verwachting.

**Spelersniveau** (608 keer een mens met 45+ minuten, doelsaldo van het eigen team, gecorrigeerd voor sterkte, mensen
en teamgrootte): goals 0,28, assists 0,29, tweede assists 0,18, schoten op doel 0,17, steekpasses 0,12, luchtduels
achterin 0,12, uitgespeeld 0,09; tackles, onderscheppingen, blokken en balwinst in welk derde ook rond 0.

**Teamgrootte**: aantallen per wedstrijd hangen af van met hoeveel mensen je speelt (aanvalsacties 4,2 per wedstrijd
met drie mensen, 3,0 met zes). Bij onze spelers scheelt het weinig (gemiddeld 4,8 tot 5,3 mensen), dus de gewone
statistieken van *Gevaarlijkste spelers* corrigeren er niet voor; bij een vergelijking met tegenstanders wel.

**Samenhang is geen voorwaarde om te tonen** (4 november 2026): tackles, onderscheppingen en druk zetten hangen niet
samen met winnen, maar zijn wel actief werk. Ze staan daarom gewoon als statistiek in de app. Samenhang bepaalt alleen
wat we als *verband* of oorzaak brengen (samenvattingen, *Waar het schuurde*, *Waar we verliezen*).

## 9d. Verbanden: weggehaald, eerst naar de tekentafel

Op 27 oktober 2026 zijn alle "verbanden" uit de app gehaald omdat ze vaag of nietszeggend waren voor wie niet in
data zit: *Wat opvalt* en *Beste tweetallen* (Clubhouse), *Wanneer het loopt* en *Patronen* (speler), *Opvallend* en
de vergelijkingen per maat bij spelers (sessie), *Impact* met en zonder speler, en de zinnen "opvallend was dat …"
in samenvattingen. De rekencode is mee weggehaald. Wat terugkomt, wordt eerst hier uitgewerkt en pas daarna gebouwd.
Blijft wel: *tov verwachting* (§3) in badges en op de wedstrijdkaarten, en *Aan de bal in context* (§4a); ook die
staan op de lijst om opnieuw te bekijken.

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
