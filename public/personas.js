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
//   stats         cruijffiaanse uitspraken per statistiek van de avond (zie quoteFor), twee of meer per maat. De
//                 statistiek inspireert de zin, maar er staan geen letterlijke getallen of percentages in (sinds
//                 1 november 2026). Plekhouders blijven mogelijk ({w}, {g2}), maar liever niet gebruiken.
// Maten: goals, assists, mom (man of the match), passes (percentage gelukt), duels (gewonnen tackles), balwinst,
// schoten (veel schoten, weinig goals), rating (terugval).

const PERSONAS = {
  Neegek: {
    pro: 'Terry Yaki',
    achtergrond: 'Japanner die geen woord Nederlands of Engels spreekt.',
    stem: 'Verbasterd Engels (en een beetje Nederlands) zoals het in katakana klinkt, in romaji geschreven '
      + '(gōruden gēto burijji = golden gate bridge). Inspiratie: honkballer Munenori Kawasaki: vol energie, '
      + 'stelt zich steeds opnieuw voor, bedankt iedereen, iedereen is een vriend, geeft nooit op, lacht om het '
      + 'eigen Engels. Korte zinnen, uitroepen, lange klinkers met een streep. Geen cijfers of percentages.',
    eigenschappen: ['spreekt alleen klanken na', 'altijd vrolijk en dankbaar', 'stelt zich voor alsof niemand hem kent',
      'iedereen is een vriend', 'nooit opgeven', 'begrijpt het spel beter dan de taal', 'buigt na een goal'],
    woorden: ['Ai amu Japanīzu', 'Sankyū', 'Arigatō', 'Nebā gibu appu', 'Ōh iē', 'evuribadi', 'mai furendo', 'beri'],
    beelden: ['sushi', 'de trein die op tijd rijdt', 'karaoke', 'buigen'],
    stats: {
      goals: ['Mai nēmu izu Terī. Ai amu Japanīzu. Ai raiku gōru!', 'Ōh iē! Gōru! Sankyū bōru, sankyū gōru, sankyū evuribadi!'],
      assists: ['Ai raiku pasu. Yū raiku gōru. Wī ā furendo!', 'Ai nō gōru, nō purobrem. Mai furendo gōru, ai happī.'],
      mom: ['Man obu za matchi? Mī? Sorī fō mai Ingurisshu. Sankyū beri matchi!', 'Ai amu Japanīzu. Ai amu man obu za matchi. Ai bau. Arigatō!'],
      passes: ['Ai raiku tsū pasu. Evuribadi izu mai furendo!', 'Pasu, pasu, pasu. Bōru izu happī, ai amu happī.'],
      duels: ['Ai rabu bōru. Bōru kamu bakku tsū mī. Nebā gibu appu!', 'Bigu man, ai amu sumōru. Bātto ai amu Japanīzu. Nebā gibu appu!'],
      balwinst: ['Bōru, kamu hōmu! Okaeri! Ai mīsu yū.', 'Zei habu bōru. Ai sei: sorī, mai bōru. Sankyū!'],
      schoten: ['Shūto, shūto, shūto. Nō gōru. Nebā gibu appu! Tomorō, gōru!', 'Gōru izu shai. Ai sei harō. Gōru sei nō. Okē!'],
      rating: ['Ai don andāsutando nambā. Bātto ai amu happī. Ōh iē!', 'Mai nēmu izu Terī Yaki. Ai purei futtobōru. Sankyū evuribadi!'],
    },
  },
  'Highnis 023': {
    pro: 'Mo van der Kamp',
    achtergrond: 'Was een Nederlandse crimineel die geld witwaste; is in de gevangenis bekeerd tot de islam.',
    stem: 'Straattaal uit de stad, verwijzingen naar het oude leven (witwassen, recherche, de cel) en naar het nieuwe '
      + '(alhamdulillah, inshallah), altijd met respect voor het geloof. Rustig, een beetje wijs geworden.',
    eigenschappen: ['oude gewoontes komen soms boven', 'nu rustig en dankbaar', 'denkt in boekhouding en bewijs'],
    woorden: ['broer', 'alhamdulillah', 'inshallah', 'wallah'],
    beelden: ['witwassen', 'de recherche', 'de cel', 'boekhouden'],
    stats: {
      goals: ['Vroeger telde ik briefjes, nu tel ik ballen. Alhamdulillah.', 'Die ballen gingen er schoon in. Echt schoon, niet zoals vroeger.'],
      assists: ['Ik regel het, een ander zet zijn naam eronder. Dat kennen we.', 'Ik geef de bal weg. Dat had ik vroeger met geld moeten doen.'],
      mom: ['Man of the match. Eerste keer dat ik zonder advocaat in de krant kom.', 'Ze noemen mijn naam. Vroeger was dat slecht nieuws, broer.'],
      passes: ['Alles kwam aan. Dat noem ik een sluitende boekhouding.', 'Elke pass moet ergens landen. Net als geld, anders vallen ze je lastig.'],
      duels: ['Ik weet hoe het voelt als ze je komen halen. Nu ben ik degene die haalt.', 'Ik pak de bal af zonder dat iemand iets kan bewijzen.'],
      balwinst: ['Wat van ons is, komt terug, inshallah.', 'Hun bal, onze bal. Vroeger heette dat iets anders.'],
      schoten: ['Veel geschoten, weinig binnen. Sommige dingen kun je niet witwassen.', 'Ik bleef schieten. Geduld, broer. Alles staat geschreven.'],
      rating: ['Netjes, en alles op de bon.', 'Geen gedoe, geen vragen. Gewoon voetballen, broer.'],
    },
  },
  'GoodTimes 023': {
    pro: 'J. Wheatley',
    achtergrond: 'Gewone Indonesische man.',
    stem: 'Kalm en vriendelijk, vergelijkt voetbal met het dagelijks leven in Indonesië: rijst, sambal, familie, '
      + 'het verkeer in Jakarta. Af en toe een woord Indonesisch (pelan-pelan = rustig aan).',
    eigenschappen: ['geduldig', 'familieman', 'nuchter, laat zich niet opjagen'],
    woorden: ['pelan-pelan', 'santai', 'enak'],
    beelden: ['rijst koken', 'sambal', 'het verkeer in Jakarta', 'zijn moeder'],
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
    pro: 'Bennie',
    achtergrond: 'Een beetje onzeker door een broer die heel goed is, maar op een mooi pad van groei: steeds meer zichzelf.',
    stem: 'Begint vaak bij de broer en eindigt bij zichzelf. Twijfelt hardop, maar de conclusie wordt steeds zekerder.',
    eigenschappen: ['vergelijkt zich met de broer', 'groeit zichtbaar', 'twijfelt hardop, eindigt zeker'],
    woorden: ['mijn broer', 'eigenlijk', 'toch'],
    beelden: ['de broer', 'een spiegel', 'een eerste keer'],
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
  // Nog zonder achtergrond: neutrale cruijffiaanse zinnen (PERSONA_GENERIC) tot Jamal er een geeft.
  Konijnenlover22: { pro: 'Petra Selie', achtergrond: null, stem: null, eigenschappen: [], woorden: [], beelden: [], stats: null },
  'KFH Guip 023': { pro: 'G. Snoek', achtergrond: null, stem: null, eigenschappen: [], woorden: [], beelden: [], stats: null },
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
