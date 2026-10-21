# Eventcodes in context: wat de cijfers over spelstijl zeggen

Het [codeboek](event-codes.md) zegt wat een code telt. Dit document zet die tellingen tegen elkaar af, zodat je
een getal kunt lezen als onderdeel van een spelstijl in plaats van als los feit. Alle cijfers komen uit
`node src/context-events.js --player Neegek` op 163 speler-wedstrijden (18 wedstrijden, beide clubs, alleen de
menselijke spelers; keepers en AI-spelers zitten niet in de data). Dat is weinig: lees de richting van een verband, niet
de tweede decimaal. Het script draait opnieuw zodra er meer wedstrijden zijn.

## Eerst: hoe lees je een verband

Bijna alles hangt samen met **hoe vaak iemand aan de bal is** (`ball_actions`: passpogingen + schoten + geslaagde
dribbels + balwinst). Wie veel aan de bal is, heeft meer assists, meer mislukte passes én meer balverlies. Een ruwe
correlatie tussen twee van die dingen zegt dan vooral "deze speler doet veel". Daarom staat bij elk verband ook de
**correlatie na correctie voor volume**: wat er overblijft als je twee spelers vergelijkt die even vaak aan de bal zijn.
Die tweede waarde is de interessante.

Een correlatie (r) loopt van −1 tot 1. Rond 0 is er geen verband, boven 0,3 is er bij deze aantallen iets zichtbaars,
boven 0,5 is het duidelijk. Een correlatie zegt niet wat oorzaak is.

## 1. Balverlies: niet de verkeerde keuze, maar geen keuze

**Wat is gemeten.** Balverlies is 105 + 106 + 107 (verliezen op eigen helft, middenveld, helft van de tegenstander).
De game geeft na elke passsituatie een oordeel: 175 "geen goede optie", 176 "goede optie", 177 "beste optie",
182 "had elders moeten passen". Die vier samen beoordelen ~90 % van alle passes.

**Wat zien we** (per speler-wedstrijd, na volumecorrectie):

| Balverlies hangt samen met | r | Lezen als |
|---|---|---|
| 175 "geen goede optie" | 0,46 | wie vaak zonder aanspeelpunt staat, verliest de bal |
| 112 tegenstanders uitgespeeld | 0,34 | wie mensen opzoekt, verliest de bal vaker |
| 174 geslaagde dribbels | −0,31 | wie met de bal loopt zonder iemand uit te spelen, verliest hem juist minder |
| 143 passes ineens | 0,21 | direct spelen kost af en toe de bal |
| 152 geslaagde steekpasses | 0,16 | zwak; zie punt 3 |
| 216 mislukte passes | 0,05 | een mislukte pass is meestal géén balverlies in deze telling |
| 182 "had elders moeten passen" | −0,10 | de verkeerde optie kiezen leidt niet tot balverlies |

**Wat betekent dat.** EA meet geen druk, maar 175 komt er het dichtst bij: de game constateert op dat moment dat er
geen goede pass beschikbaar was. Dat is precies de situatie waarin je óf wordt afgejaagd óf alleen staat. Dat 175 wél en
182 níet met balverlies samenhangt, zegt: balverlies ontstaat in deze data vooral uit situaties zonder uitweg, niet uit
slechte keuzes met een uitweg. Het antwoord op "wordt balverlies gekenmerkt door hogere druk" is dus: ja, voor zover de
game druk registreert, en het is eerder de omgeving (geen aanspeelpunt) dan de keuze.

Het dribbel-contrast is leerzaam: 174 telt geslaagde carries, 112 telt uitgespeelde tegenstanders. Carries zonder
duel zijn veilig; het duel aangaan kost ballen. Dat is geen advies om niet uit te spelen (zie punt 4), wel een prijs
om bewust te betalen.

**Voorbehoud.** Op teamniveau (36 team-wedstrijden) is het verband tussen 175 en balverlies weg (r 0,03) en gaat
een hoger aandeel 175 zelfs samen met een beter doelsaldo (r 0,26). Dat lijkt tegenstrijdig, maar past: binnen een
wedstrijd is het de aanvaller die vaak geïsoleerd staat die de bal verliest, terwijl een team dat veel 175 krijgt vooral
een team is dat de bal vaak op de helft van de tegenstander heeft. Hetzelfde label betekent iets anders op een ander
niveau.

Dat 105–107 echt balverlies meten blijkt uit de kruistoets: het balverlies van een team correleert 0,69 met de balwinst
(108–110) van de tegenstander in dezelfde wedstrijd, en 0,33 met diens gewonnen tackles + onderscheppingen. De rest
van de balwinst van de tegenstander zit bij diens AI-spelers, die niet in de data staan.

## 2. Assists en mislukte passes: niet dezelfde munt

**Wat is gemeten.** 11 assists, 216 mislukte passes, 31 mislukte passes vooruit, 30 geslaagde passes vooruit,
152 geslaagde steekpasses.

**Wat zien we.** Over alle 163 speler-wedstrijden: assists ~ mislukte passes r 0,08 ruw en −0,07 na volumecorrectie.
Assists ~ passnauwkeurigheid −0,01. Assists ~ steekpasses 0,19 ruw, 0,10 na correctie.

Voor Neegek apart (18 wedstrijden, 9 met en 9 zonder assist):

| | met assist | zonder assist |
|---|---|---|
| passpogingen | 19,0 | 19,0 |
| mislukte passes | 5,8 | 6,8 |
| geslaagde passes vooruit | 7,3 | 5,2 |
| geslaagde steekpasses | 3,2 | 3,1 |
| balverlies | 2,7 | 3,2 |
| schoten | 2,3 | 1,9 |
| doelsaldo van het team | +1,6 | −1,7 |

**Wat betekent dat.** De aanname "veel assists gaan samen met veel pogingen die niet aankomen" klopt in deze data niet:
in wedstrijden met een assist pass je evenveel, mis je iets minder en komt er vooral méér vooruit aan. Assists zijn
hier een teken dat de vooruitpass aankwam, niet een bijproduct van gokken. Het doelsaldo-verschil laat zien dat die
wedstrijden ook de wedstrijden zijn waarin het team loopt; dat kan twee kanten op werken (jij maakt het verschil, of
een lopend team geeft je ruimte).

**Voorbehoud, en dat is een echte.** 152 telt alleen *geslaagde* steekpasses. Een steekpass die niet aankomt verdwijnt
in 216 (mislukt) en 31 (mislukt vooruit). Je kunt dus niet zien hoeveel steekpasses je probéérde. Wat wel zichtbaar is:
67 % van je mislukte passes ging vooruit (31 gedeeld door 216). Je missers zijn dus overwegend pogingen om iets te
forceren, niet slordige breedtepasses. Dat is de risicokant van je profiel, en hij is zichtbaar, alleen niet onder de
noemer "steekpass".

## 3. Risico in de pass loont, passnauwkeurigheid niet

**Wat is gemeten.** Per team per wedstrijd: passnauwkeurigheid (215 / (215 + 216 + 153)), balverlies per 100
balacties, geslaagde steekpasses per 100 balacties, schoten per 100 balacties, afgezet tegen het doelsaldo.

**Wat zien we** (36 team-wedstrijden):

| Doelsaldo hangt samen met | r |
|---|---|
| steekpasses per 100 acties | 0,49 |
| schoten per 100 acties | 0,41 |
| aandeel 175 "geen optie" | 0,26 |
| uitgespeeld per 100 acties | 0,15 |
| aandeel goede/beste optie (176 + 177) | 0,00 |
| passnauwkeurigheid | −0,03 |
| balverlies per 100 acties | −0,05 |

**Wat betekent dat.** Teams die vaker een steekpass laten aankomen, winnen vaker; hoe netjes ze passen en hoe vaak ze de
bal verliezen doet er voor de uitslag niet toe. Een team dat 56 % van zijn passes laat aankomen won met 5–0; het team
dat 79 % liet aankomen verloor. Passnauwkeurigheid is in deze data een stijlkenmerk, geen kwaliteitskenmerk. Dat is
ook het antwoord op de vraag of je balverlies "erg" is: niet voor het resultaat, zolang het de prijs is voor
steekpasses en schoten.

**Voorbehoud.** 36 team-wedstrijden is weinig en de tegenstanders hebben wisselend veel menselijke spelers (2 tot 7),
wat de per-100-maten beïnvloedt. Een grotere steekproef uit de community (CapUnc, 67.399 wedstrijden) vond dat het
aandeel goede/beste opties de winnaar in 63,5 % voorspelt tegen 53,4 % voor passnauwkeurigheid; dat is dezelfde
richting (beslissingen boven netheid), al zien wij het 176/177-effect hier niet terug.

## 4. Neegek in profiel: de speler die de bal komt halen

Per 90 minuten, vergeleken met de rest van Frambroos en met de tegenstanders:

| | Neegek | Frambroos | tegenstanders | Lezen als |
|---|---|---|---|---|
| balacties | 39,6 | 32,3 | 35,3 | meest aan de bal van het team |
| passpogingen | 19,4 | 16,2 | 18,7 | |
| passnauwkeurigheid | 0,66 | 0,69 | 0,77 | iets onder het team, duidelijk onder tegenstanders |
| aandeel passes vooruit | 0,51 | 0,58 | 0,53 | je speelt relatief vaak terug of opzij: de bal komt halen en doorgeven |
| geslaagde steekpasses | 3,2 | 2,8 | 3,5 | |
| mislukte passes | 6,4 | 4,8 | 4,5 | meeste van het team, en 67 % daarvan vooruit |
| assists | 0,8 | 0,3 | 0,4 | met afstand de meeste |
| schoten | 2,2 | 1,4 | 1,7 | |
| geslaagde dribbels | 16,5 | 13,2 | 13,9 | |
| tegenstanders uitgespeeld | 2,4 | 1,5 | 2,5 | op het niveau van de tegenstanders, hoogste van het team |
| balverlies | 3,0 | 2,0 | 3,9 | |
| balverlies per 100 acties | 7,6 | 6,3 | 11,2 | iets boven het team, ver onder de tegenstanders |
| aandeel balverlies op hun helft | 0,40 | 0,47 | 0,51 | je verliest hem relatief vaak op het middenveld, waar hij meer kost |
| "uit positie" (219) | 8,9 | 6,6 | 5,3 | vaakst van iedereen |
| "goed gepositioneerd" (111) | 9,4 | 15,8 | 15,3 | minst van iedereen |
| rating | 7,5 | 7,2 | 7,4 | gedeeld hoogste van het team |

**Wat betekent dat.** De twee positiecodes vertellen het verhaal: de game vindt je het vaakst "uit positie" en het
minst "goed gepositioneerd", en tegelijk ben je het meest aan de bal. Dat is geen tegenstrijdigheid maar dezelfde
keuze: wie als aanvaller de bal komt halen, verlaat de plek waar de game hem wil hebben. Over alle spelers geldt
hetzelfde: meer 111 gaat samen met minder balacties (r −0,23). "Aan de bal komen" en "in positie staan" zijn in Pro
Clubs elkaars tegenpool; de vraag is niet welke je kiest, maar of de bal die je haalt vooruit komt. Je assists en je
aandeel mislukte passes vooruit zeggen dat dat redelijk lukt; je aandeel vooruitpasses (0,51) zegt dat een flink deel
van het halen eindigt in teruggeven.

Het balverlies-aandeel op het middenveld (hoger dan bij anderen) is de kostenpost van dat profiel: een bal die je op
het middenveld komt halen en verliest, ligt dichter bij je eigen doel dan een steekpass die op hun helft mislukt.

## 5. Wat je hieruit níet mag concluderen

- **Geen oorzaak-gevolg.** "Steekpasses ~ doelsaldo" kan ook betekenen dat een team dat voorstaat ruimte krijgt voor
  steekpasses.
- **Geen druk-meting.** 175 is een oordeel van de game over opties, niet over tegenstanders in de buurt. Een speler
  die alleen staat zonder medespelers in de buurt krijgt ook 175.
- **Geen mislukte steekpasses.** Alles wat niet aankwam is "mislukte pass (vooruit)". Hoeveel daarvan steekpasses
  waren, weet niemand.
- **Kleine aantallen.** 18 wedstrijden, 6 vaste spelers. Draai `npm run decode-events` en
  `node src/context-events.js --player Neegek` opnieuw na een week verzamelen.
- **Tegenstanders zijn geen zuivere referentie.** Hun rijen bevatten 2 tot 7 mensen; de rest is AI en ontbreekt.
