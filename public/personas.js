// Spelersprofielen (docs/coach-logica.md §9, Sessie): wie de pro's zijn, hoe ze praten en wat ze zeggen.
// Dit is de verzamelplek voor karakter: nieuwe eigenschappen, woorden, beelden en verhalen hier toevoegen (Jamal levert
// ze aan), zodat verhalen en zinnen over spelers erop kunnen bouwen. Sleutel = accountnaam (zoals in DATA); in de app
// staat altijd de pro-naam (proName). Geen hij of zij in deze teksten (CLAUDE.md).
//
// Per speler:
//   achtergrond   wie het is (voor ons; komt niet letterlijk in de app)
//   stem          hoe de speler praat
//   eigenschappen losse kenmerken om op te bouwen (karakter, gewoontes, verhaallijnen)
//   woorden       typische woorden en uitdrukkingen
//   beelden       waar de speler het mee vergelijkt
//   bio           { titel, feiten: [[label, waarde]], tekst: [alinea's] }: de biografie zoals Jamal die aanlevert, op de
//                 spelerspagina als kaartje; inspiratie voor quotes en verhalen. Zonder bio toont de app de achtergrond.
//   rol           vaste rol als EA de speler als middenvelder zet (coach-logica §9b): { standaard, regels: [{ zonder, maxMensen, rol }] }.
//                 Rollen: spits, aanvallend, verdedigend. Een regel geldt als de genoemde speler niet meedoet (en het
//                 team hooguit maxMensen mensen telt). Jamal beschrijft de rolverdeling; hier bijwerken als die verandert.
//   maand         (optioneel) uitspraken voor één avond per maand: de eerste avond van een maand dat deze speler wint.
//   stats         cruijffiaanse uitspraken per statistiek van de avond (zie quoteFor), twee of meer per maat. De
//                 statistiek inspireert de zin, maar er staan geen letterlijke getallen of percentages in (sinds
//                 1 november 2026). Plekhouders blijven mogelijk ({w}, {g2}), maar liever niet gebruiken.
// Maten: goals, assists, mom (man of the match), passes (percentage gelukt), duels (gewonnen tackles), balwinst,
// schoten (veel schoten, weinig goals), rating (terugval).

const PERSONAS = {
  Neegek: {
    pro: 'Terry Yaki',
    rol: { standaard: 'aanvallend', regels: [{ zonder: 'KFH Guip 023', rol: 'spits' }] },
    achtergrond: 'Japanner die geen woord Nederlands of Engels spreekt.',
    stem: 'Verbasterd Engels (en een beetje Nederlands) zoals het in katakana klinkt, in romaji geschreven '
      + '(gōruden gēto burijji = golden gate bridge). Inspiratie: honkballer Munenori Kawasaki: vol energie, '
      + 'stelt zich steeds opnieuw voor, bedankt iedereen, iedereen is een vriend, geeft nooit op, lacht om het '
      + 'eigen Engels. Zegt "Mi" (me) waar het "I" moet zijn. Korte zinnen, uitroepen, lange klinkers met een streep. Geen cijfers of percentages.',
    eigenschappen: ['spreekt alleen klanken na', 'altijd vrolijk en dankbaar', 'stelt zich voor alsof niemand hem kent',
      'iedereen is een vriend', 'nooit opgeven', 'begrijpt het spel beter dan de taal', 'buigt na een goal'],
    woorden: ['Mi amu Japanīzu', 'Sankyū', 'Arigatō', 'Nebā gibu appu', 'Ōh iē', 'evuribadi', 'mai furendo', 'beri'],
    beelden: ['sushi', 'de trein die op tijd rijdt', 'karaoke', 'buigen'],
    bio: {
      titel: 'De vrolijkste Japanner van de competitie',
      feiten: [['Afkomst', 'Japan'], ['Talen', 'Geen Nederlands, geen Engels'], ['Voorbeeld', 'Munenori Kawasaki'], ['Specialiteit', 'Buigen na een goal']],
      tekst: [
        'Terry Yaki komt uit Japan en spreekt geen woord Nederlands of Engels. Wat hij zegt, klinkt als Engels zoals het in katakana wordt uitgesproken: gōru, pasu, sankyū. Toch begrijpt Terry het spel beter dan wie dan ook de taal.',
        'Altijd vrolijk en dankbaar, na elke wedstrijd opnieuw voorstellen alsof niemand Terry kent, en iedereen is mai furendo. Opgeven bestaat niet: nebā gibu appu.',
        'Na een goal volgt een buiging. Naar het publiek, naar de keeper, naar de bal. Iedereen krijgt een arigatō.',
      ],
    },
    stats: {
      goals: ['Mai nēmu izu Terī. Mi amu Japanīzu. Mi raiku gōru!', 'Ōh iē! Gōru! Sankyū bōru, sankyū gōru, sankyū evuribadi!'],
      assists: ['Mi raiku pasu. Yū raiku gōru. Wī ā furendo!', 'Mi nō gōru, nō purobrem. Mai furendo gōru, mi happī.'],
      mom: ['Man obu za matchi? Mī? Sorī fō mai Ingurisshu. Sankyū beri matchi!', 'Mi amu Japanīzu. Mi amu man obu za matchi. Mi bau. Arigatō!'],
      passes: ['Mi raiku tsū pasu. Evuribadi izu mai furendo!', 'Pasu, pasu, pasu. Bōru izu happī, mi amu happī.'],
      duels: ['Mi rabu bōru. Bōru kamu bakku tsū mī. Nebā gibu appu!', 'Bigu man, mi amu sumōru. Bātto mi amu Japanīzu. Nebā gibu appu!'],
      balwinst: ['Bōru, kamu hōmu! Okaeri! Mi mīsu yū.', 'Zei habu bōru. Mi sei: sorī, mai bōru. Sankyū!'],
      schoten: ['Shūto, shūto, shūto. Nō gōru. Nebā gibu appu! Tomorō, gōru!', 'Gōru izu shai. Mi sei harō. Gōru sei nō. Okē!'],
      rating: ['Mi don andāsutando nambā. Bātto mi amu happī. Ōh iē!', 'Mai nēmu izu Terī Yaki. Mi purei futtobōru. Sankyū evuribadi!'],
    },
  },
  'Highnis 023': {
    rol: { standaard: 'verdedigend', regels: [{ zonder: 'KFH Guip 023', maxMensen: 4, rol: 'aanvallend' }] },
    pro: 'Mo van der Kamp',
    achtergrond: 'Komt van het woonwagenkamp en waste jaren geld wit; is in de cel bekeerd tot de islam en wil het oude '
      + 'leven achter zich laten. Jamal, 2 november 2026: de bekering en de Koran vooraan, het kamp en het witwassen '
      + 'komen alleen nog per ongeluk boven.',
    stem: 'Rustig, dankbaar en wijs geworden; haalt de Koran aan (vrij vertaald, met soera en vers) en zegt alhamdulillah, '
      + 'inshallah, subhanallah. Af en toe glipt er een oude uitdrukking van het kamp of uit het witwassen uit, meteen gevolgd '
      + 'door een correctie (astaghfirullah, "dat zeg ik niet meer"). Nooit spottend over het geloof; de grap zit in de slip.',
    eigenschappen: ['bekeerd en oprecht gelovig', 'citeert de Koran bij alles', 'oude woorden glippen er soms uit, en dat wil Mo niet',
      'denkt nog in boekhouding en bewijs', 'rustig en dankbaar', 'trots op het kamp, maar niet op wat er gebeurde'],
    woorden: ['broer', 'alhamdulillah', 'inshallah', 'subhanallah', 'astaghfirullah', 'wallah', 'het kamp', 'de briefjes'],
    beelden: ['de Koran', 'het kamp', 'witwassen', 'de cel', 'boekhouden', 'de recherche'],
    bio: {
      titel: 'Van het kamp naar de moskee',
      feiten: [['Afkomst', 'Het woonwagenkamp'], ['Verleden', 'Jarenlang geld witgewassen'], ['Bekeerd', 'In de cel, tot de islam'], ['Nu', 'Rustig, dankbaar, schoon']],
      tekst: [
        'Mo van der Kamp komt van het woonwagenkamp en waste jarenlang geld wit. In de cel vond Mo de islam, en sindsdien moet het oude leven niets meer met Mo te maken hebben.',
        'Mo citeert de Koran bij alles, zegt alhamdulillah na elke goede pass en is rustig en wijs geworden. Maar soms glipt er nog een woord van vroeger uit, over briefjes, tassen of de recherche, en dan volgt meteen een astaghfirullah.',
        'Het denken in boekhouding en bewijs is gebleven. Alleen is alles nu halal.',
      ],
    },
    stats: {
      goals: ['Met de moeilijkheid komt de verlichting, soera 94. Vanavond kwam de verlichting via mijn rechter.', 'Vroeger telde ik briefjes, nu tel ik ballen. Alhamdulillah, deze zijn schoon.', 'Die ging erin als een tas met… nee. Astaghfirullah. Die ging er gewoon mooi in.'],
      assists: ['Wie goed doet, krijgt het tienvoudig terug, soera 6. Eén pass, één goal, dat is al winst.', 'Ik regel het, een ander zet zijn naam eronder. Dat kende ik al van vroeger, maar nu is het halal.', 'Ik geef en vraag niks terug. Op het kamp noemden we dat anders, maar dit is beter.'],
      mom: ['Man of the match. Eerste keer dat ik in de krant kom zonder advocaat. Alhamdulillah.', 'Wees niet trots, zegt soera 31. Dus ik zeg alleen: dank aan het team, en aan Hem.', 'Ze noemen mijn naam. Vroeger stond ik dan al in de bus naar het kamp. Nu blijf ik gewoon staan.'],
      passes: ['Alles kwam aan. Een sluitende boekhouding, en deze keer echt sluitend.', 'Spreek het goede woord, soera 2. Een goede pass is ook een goed woord.', 'Elke pass moet ergens landen, net als geld vroeg… nee. Net als een gebed. Astaghfirullah.'],
      duels: ['Ik weet hoe het voelt als ze je komen halen. Nu haal ik de bal, en verder niks, wallah.', 'Wees geduldig, Allah is met de geduldigen, soera 2. Geduld, en dan de tackle.', 'Op het kamp pakte je wat je pakken kon. Astaghfirullah. Vanavond alleen de bal.'],
      balwinst: ['Wat van ons is, komt terug, inshallah.', 'Hun bal, onze bal. Vroeger heette dat anders. Nu heet het gewoon voetbal.', 'Alles keert terug naar waar het hoort, soera 2. De bal ook.'],
      schoten: ['Veel geschoten, weinig binnen. Sommige dingen kun je niet witwassen, broer.', 'Allah belast niemand boven zijn vermogen, soera 2. Maar die keeper kwam dichtbij.', 'Ik bleef schieten. Geduld is de helft van het geloof. De andere helft is mikken.'],
      rating: ['Netjes, en alles op de bon. Zo hoort het nu.', 'Geen gedoe, geen vragen. Gewoon voetballen, broer. Alhamdulillah.', 'Een gewone avond is ook een gave, soera 14: wie dankbaar is, krijgt meer.'],
    },
  },
  'GoodTimes 023': {
    rol: { standaard: 'verdedigend' },
    pro: 'J. Wheatley',
    achtergrond: 'Gewone Indonesische man.',
    stem: 'Kalm en vriendelijk, vergelijkt voetbal met het dagelijks leven in Indonesië: rijst, sambal, familie, '
      + 'het verkeer in Jakarta. Af en toe een woord Indonesisch (pelan-pelan = rustig aan).',
    eigenschappen: ['geduldig', 'familieman', 'nuchter, laat zich niet opjagen'],
    woorden: ['pelan-pelan', 'santai', 'enak'],
    beelden: ['rijst koken', 'sambal', 'het verkeer in Jakarta', 'zijn moeder'],
    bio: {
      titel: 'De rustigste man van Jakarta',
      feiten: [['Afkomst', 'Indonesië'], ['Karakter', 'Geduldig, nuchter'], ['Motto', 'Pelan-pelan'], ['Thuis', 'Rijst, sambal en moeder']],
      tekst: [
        'J. Wheatley is een gewone Indonesische man, en trots daarop. Opjagen lukt niemand: pelan-pelan, rustig aan, net als een scooter in het verkeer van Jakarta. Je komt er altijd.',
        'Voetbal is voor Wheatley gewoon het dagelijks leven: rijst koken, sambal, familie. Een goede avond is ook gewoon een goede avond. Enak.',
      ],
    },
    stats: {
      goals: ['Mijn moeder zegt: niet te veel sambal. Ik luisterde niet.', 'Goals zijn als rijst: één korrel tegelijk, pelan-pelan.'],
      assists: ['Ik kook, een ander eet. Zo hoort het in de familie.', 'Goed geven is beter dan goed nemen. Enak.'],
      mom: ['Man of the match. Morgen gewoon weer rijst koken.', 'Ik krijg de prijs, maar de hele familie heeft gekookt.'],
      passes: ['Zonder haast, zoals een scooter in Jakarta: je komt er altijd.', 'Kort, kort, kort. Lange passes zijn voor mensen met haast.'],
      duels: ['In de file leer je wie eerst gaat.', 'Rustig blijven en dan pakken. Santai.'],
      balwinst: ['Wat je uitleent, komt bij ons altijd terug.', 'Geduld. De bal komt vanzelf weer langs, net als de bus.'],
      schoten: ['Rijst die niet gaar is, kook je gewoon langer.', 'Het doel stond stil, ik niet. Volgende keer.'],
      rating: ['Niet te pittig, niet te flauw. Enak.', 'Een gewone avond is ook een goede avond.'],
    },
  },
  'Xero 023': {
    rol: { standaard: 'aanvallend' },
    pro: 'Bennie',
    achtergrond: 'Een beetje onzeker door een broer die heel goed is, maar op een mooi pad van groei: steeds meer zichzelf.',
    stem: 'Begint vaak bij de broer en eindigt bij zichzelf. Twijfelt hardop, maar de conclusie wordt steeds zekerder.',
    eigenschappen: ['vergelijkt zich met de broer', 'groeit zichtbaar', 'twijfelt hardop, eindigt zeker'],
    woorden: ['mijn broer', 'eigenlijk', 'toch'],
    beelden: ['de broer', 'een spiegel', 'een eerste keer'],
    bio: {
      titel: 'Steeds meer zichzelf',
      feiten: [['Familie', 'Een broer die heel goed is'], ['Karakter', 'Twijfelt hardop, eindigt zeker'], ['Pad', 'Groei']],
      tekst: [
        'Bennie is opgegroeid in de schaduw van een broer die heel goed is. Dat maakte Bennie een beetje onzeker: wat zou mijn broer doen?',
        'Maar Bennie is op een mooi pad van groei: vaak beginnen bij de broer en eindigen bij zichzelf, en elke avond wordt die conclusie zekerder. Met het haar los is Bennie bovendien gevaarlijker dan Bennie zelf denkt.',
      ],
    },
    stats: {
      goals: ['Mijn broer heeft er meer. Maar deze zijn van mij.', 'Ik dacht: wat zou mijn broer doen? Toen deed ik het zelf.'],
      assists: ['Ik hoef niet te scoren om er te zijn.', 'Mijn broer zoekt het doel. Ik zoek de ander. Ook een kunst.'],
      mom: ['Man of the match. Ik heb het mijn broer nog niet verteld. Misschien morgen.', 'Ze noemden mijn naam. Niet die van mijn broer. Gek gevoel.'],
      passes: ['Ik twijfelde minder, dus de bal ook.', 'Simpel spelen. Mijn broer kan het, en ik blijkbaar ook.'],
      duels: ['Tegen mijn broer verloor ik ze altijd. Vanavond niet.', 'Eerst twijfel je, dan stap je erin. Ik stap er nu eerder in.'],
      balwinst: ['Ik pak wat ik vroeger liet liggen.', 'De bal kwam terug. Ik ook, eigenlijk.'],
      schoten: ['Mijn broer zou zeggen: blijf schieten. Deze keer heeft mijn broer gelijk.', 'Raak of niet, ik durfde. Dat is nieuw.'],
      rating: ['Niet het cijfer van mijn broer. Het mijne.', 'Een gewone avond. Vroeger was dat voor mij al heel wat.'],
    },
  },
  Konijnenlover22: {
    rol: { standaard: 'aanvallend' },
    pro: 'Petra Selie',
    achtergrond: 'Tweelingzus van Peter en jongere zus van Beter Selie; even goed als Peter maar nooit zo erkend, omdat ze een '
      + 'vrouw is. Bij Frambroos om te laten zien wat ze waard is. Lesbisch, met een zwak voor Yan en Morena, al twijfelt ze '
      + 'als Bennie zijn haar los draagt. Eén keer per maand ongesteld (maandbank).',
    stem: 'Recht voor zijn raap, droog en een tikje grof; trash talk met een knipoog. Wil zich bewijzen tegenover haar '
      + 'broers en iedereen die haar onderschatte. Korte zinnen, punchlines, af en toe een kattengeluid.',
    eigenschappen: ['onderschat, nooit minder getalenteerd', 'tweelingzus van Peter (weer op de middelbare school)',
      'zus van Beter (stratenmaker op zee)', 'single, maar niet zonder opties', 'zwak voor Yan en Morena', 'twijfelt bij Bennie met zijn haar los',
      'grote mond, nog groter hart', 'één keer per maand ongesteld'],
    woorden: ['miauw miauw', 'dubbel B', 'rust op de lijn', 'schat'],
    beelden: ['Peter en Beter', 'een kat met klauwen', 'buitenspel', 'Bennie met zijn haar los'],
    stats: {
      goals: ['Liever 100x buitenspel met 10 kansen, dan 0x buitenspel met 0 kansen.', 'Peter scoort op het schoolplein. Ik scoor hier. Zoek de verschillen.', 'Ze zeiden: goed voor een meisje. Ik ben gewoon goed.'],
      assists: ['The only way is dubbel B.', 'Ik leg hem klaar, Bennie maakt hem af. Met dat haar mag hij alles.', 'Een assist van een vrouw telt ook gewoon voor één. Niet schrikken.'],
      mom: ['Man of the match? Woman of the match, schat.', 'Peter krijgt een sticker op school. Ik krijg dit.', 'Beter legt stenen op zee. Ik leg ze in het doel.'],
      passes: ['Rust op de lijn speelt fijn.', 'Kort, zuiver, en niemand die vraagt of ik dat wel kan.'],
      duels: ['Miauw miauw!', 'Ik wil niet kwaad spreken over je vrouw maar ik vind het een kankerhoer.', 'Ze dachten dat ik ging huilen. Ik ging erin.'],
      balwinst: ['Miauw miauw! Die bal is van mij.', 'Afpakken en niet teruggeven. Zo ging het thuis ook met Peter.'],
      schoten: ['Liever 100x buitenspel met 10 kansen, dan 0x buitenspel met 0 kansen.', 'Wheatley heeft me aangerand in de spelerstunnel. Daarom stond het vizier scheef.'],
      rating: ['Rust op de lijn speelt fijn.', 'Onderschat? Prima. Dan schrik je straks harder.', 'Bennie had zijn haar los. Ik kon me even niet concentreren.'],
    },
    // Eén keer per maand, bij de eerste avond van die maand dat Petra wint (sessie.js, sessionQuote).
    maand: ['Ik bloed als een rund en ik ben nog steeds beter dan jullie. Huilen jullie maar.', 'Kramp in mijn buik, bloed in mijn broek en toch man of the match. Wie is hier nou het zwakke geslacht?', 'Ongesteld, chagrijnig en nergens zin in. Behalve in jullie kapotmaken.', 'Ik zat met een tampon zo dik als een duim in het veld. Jullie hadden alleen maar een excuus.'],
    bio: {
      titel: 'De onderschatte ster van Frambroos',
      feiten: [['Familie', 'Tweelingzus van Peter Selie, jongere zus van Beter Selie'], ['Club', 'Frambroos'], ['Positie', 'Voetbalster'], ['Relatiestatus', 'Single (maar niet zonder opties)']],
      tekst: [
        'Petra Selie is misschien wel het grootste onontdekte voetbaltalent binnen de familie Selie. Als tweelingzus van Peter was ze van jongs af aan minstens even goed als haar broer. Toch kreeg ze nooit dezelfde erkenning. Niet vanwege haar voetbalkwaliteiten, maar simpelweg omdat ze een vrouw was. Waar Peter als talent werd gezien, moest Petra zich telkens opnieuw bewijzen.',
        'Maar Petra laat zich niet zomaar aan de kant zetten. Inmiddels is ze onderdeel van Frambroos en vastbesloten om te laten zien wat ze waard is. Ze heeft het talent, het karakter en de ambitie. Nu de rest van het team nog.',
        'Buiten het veld is Petra minstens zo interessant. Ze is lesbisch en heeft een zwak voor haar teamgenoten Yan en Morena. Of daar ooit iets uit voortkomt, is nog maar de vraag. Al is er één onverwachte concurrent: Bennie. Vooral wanneer hij zijn haar los draagt, begint Petra toch een beetje te twijfelen aan haar eigen voorkeuren.',
        'Binnen de familie Selie heeft Petra een bijzondere positie. Haar tweelingbroer Peter zit inmiddels weer op de middelbare school, terwijl haar oudere broer Beter zijn voetbalschoenen aan de wilgen heeft gehangen en tegenwoordig als stratenmaker op zee werkt.',
        'Petra Selie: jarenlang onderschat, nooit minder getalenteerd en absoluut niet van plan om nog langer in de schaduw van haar broers te staan.',
      ],
    },
  },
  // Nog zonder achtergrond: neutrale cruijffiaanse zinnen (PERSONA_GENERIC) tot Jamal er een geeft.
  'KFH Guip 023': { pro: 'G. Snoek', rol: { standaard: 'spits' }, achtergrond: null, stem: null, eigenschappen: [], woorden: [], beelden: [], stats: null },
};

const PERSONA_GENERIC = {
  goals: ['Als je de bal er niet in schiet, gaat hij er ook niet in.', 'Scoren is simpel. Je moet alleen op het goede moment op de goede plek staan.'],
  assists: ['De beste pass is de pass die niemand ziet aankomen.', 'Wie geeft, scoort ook. Alleen staat het niet op het bord.'],
  mom: ['Man of the match. Het gaat niet om wie het beste speelt, maar wie het minst fout doet.', 'Je bent pas de beste als de anderen het zien.'],
  passes: ['Als wij de bal hebben, kunnen zij niet scoren.', 'Snel spelen is iets anders dan haasten.'],
  duels: ['Wie de bal heeft, hoeft niet te verdedigen.', 'Verdedigen begint met de bal winnen. Logisch.'],
  balwinst: ['Als zij hem niet hebben, kunnen ze niks.', 'Balbezit is geen kwestie van hebben, maar van terugpakken.'],
  schoten: ['Toeval is logisch.', 'Je moet schieten, anders kun je niet scoren. Ook als het niet lukt.'],
  rating: ['Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen.', 'Elk nadeel heb z\'n voordeel.'],
};

const JP_NUM = ['zero', 'wan', 'tsū', 'surī', 'fō', 'faibu', 'shikkusu', 'sebun', 'ēto', 'nain', 'ten'];

// De maat van de avond voor de quote (coach-logica §9, Sessie): van de beste speler de statistiek die die avond het
// meest boven het eigen normaal uitstak. rows = de wedstrijden van die avond, rest = alle andere wedstrijden.
function standoutStat(rows, rest) {
  const sum = (list, f) => list.reduce((a, r) => a + (f(r.p) || 0), 0), n = rows.length, nr = Math.max(1, rest.length);
  const per = (f, list, k) => sum(list, f) / k;
  const lift = (f, min) => { const t = per(f, rows, n), o = per(f, rest, nr); return sum(rows, f) >= min ? (t - o) / (o + 0.25) : -Infinity; };
  const ev = r => r.p.ev || {};
  const pa = sum(rows, p => p.passAttempts), pm = sum(rows, p => p.passesMade), paR = sum(rest, p => p.passAttempts), pmR = sum(rest, p => p.passesMade);
  const goals = sum(rows, p => p.goals), shots = sum(rows, p => p.shots);
  const cand = [
    { key: 'goals', v: goals, s: lift(p => p.goals, 2) },
    { key: 'assists', v: sum(rows, p => p.assists), s: lift(p => p.assists, 2) },
    { key: 'mom', v: sum(rows, p => p.mom), s: sum(rows, p => p.mom) >= 2 ? 1.5 : sum(rows, p => p.mom) === 1 && n <= 3 ? 0.8 : -Infinity },
    { key: 'passes', v: pa ? Math.round(100 * pm / pa) : 0, s: pa >= 20 && paR ? (pm / pa - pmR / paR) * 10 : -Infinity },
    { key: 'duels', v: sum(rows, p => p.tacklesMade), s: lift(p => p.tacklesMade, 3) },
    { key: 'balwinst', v: rows.reduce((a, r) => a + (ev(r).possession_won || 0), 0), s: rows.some(r => r.p.ev) ? lift(p => p.ev?.possession_won, 4) * 0.8 : -Infinity },
    { key: 'schoten', v: shots, v2: goals, s: shots >= 8 && goals <= 1 ? 0.9 : -Infinity },
  ].filter(c => c.s > 0.3).sort((a, b) => b.s - a.s);
  const rated = rows.map(r => r.p.rating).filter(v => v !== null);
  return cand[0] || { key: 'rating', v: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null };
}

// De quote van de avond: een uitspraak van de speler bij die maat, met het getal erin; per sessie een andere variant.
function quoteFor(name, stat, sid) {
  const bank = PERSONAS[name]?.stats?.[stat.key] || PERSONA_GENERIC[stat.key] || PERSONA_GENERIC.rating;
  const t = bank[(sid || 0) % bank.length], v = stat.v ?? 0;
  return capFirst(t.replaceAll('{n}', String(v)).replaceAll('{w}', numWord(v)).replaceAll('{pct}', String(v))
    .replaceAll('{r}', stat.key === 'rating' && stat.v !== null ? (+stat.v).toFixed(1) : String(v))
    .replaceAll('{jp}', JP_NUM[v] || String(v))
    .replaceAll('{g2}', !stat.v2 ? 'geen goals' : stat.v2 === 1 ? 'één goal' : `${numWord(stat.v2)} goals`));
}
