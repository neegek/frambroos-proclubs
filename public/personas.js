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
//   stats         cruijffiaanse uitspraken per statistiek van de avond (zie quoteFor), twee of meer per maat.
//                 Plekhouders: {n} het getal, {w} het getal in woorden, {r} rating (één decimaal), {pct} percentage,
//                 {jp} het getal zoals Terry het zegt, {g2} het aantal goals erbij in woorden (geen goals, één goal).
// Maten: goals, assists, mom (man of the match), passes (percentage gelukt), duels (gewonnen tackles), balwinst,
// schoten (veel schoten, weinig goals), rating (terugval).

const PERSONAS = {
  Neegek: {
    pro: 'Terry Yaki',
    achtergrond: 'Japanner die geen woord Nederlands of Engels spreekt.',
    stem: 'Alles komt eruit als verbasterd Nederlands of Engels zoals het in katakana klinkt, in romaji geschreven '
      + '(gōruden gēto burijji = golden gate bridge). Korte zinnen, lange klinkers met een streep.',
    eigenschappen: ['spreekt alleen klanken na', 'beleefd, buigt na een goal', 'begrijpt het spel beter dan de taal'],
    woorden: ['beri', 'rojikku', 'simpuru', 'sō', 'hai'],
    beelden: ['sushi', 'de trein die op tijd rijdt', 'karaoke'],
    stats: {
      goals: ['{jp} gōru. Shūto, gōru. Shūto, gōru. Beri simpuru.', 'Wan gōru iz rakkī. {jp} gōru iz rojikku.'],
      assists: ['{jp} pasu, {jp} gōru. Ai nō shūto, ai mēku shūto.', 'Gōru iz nō mai. Pasu iz mai. Hai.'],
      mom: ['Man obu za matchi… {jp} taimu. Ai bau. Arigatō.', 'Beri gūdo. Bātto tomorō, sēmu. Sō.'],
      passes: ['{pct} pāsento pasu. Bōru iz mai furendo.', 'Shōto pasu, shōto pasu. Rongu pasu iz rongu misutēku.'],
      duels: ['{jp} takkuru. Ai nō rubu bōru. Ai teiku bōru.', 'Wen zei habu bōru, ai habu probrem. Ai fikkusu.'],
      balwinst: ['{jp} bōru bakku. Wī habu bōru, zei habu nō gōru.', 'Bōru kamu hōmu. Okaeri, bōru.'],
      schoten: ['{jp} shūto… Shūto iz nō gōru. Bātto nō shūto iz nō gōru tsū.', 'Gōru iz shai. Ai shūto agen.'],
      rating: ['{r}. Beri gūdo nambā. Ai nō andāsutando, bātto ai happī.', 'Futtobōru iz simpuru. Simpuru futtobōru iz beri hādo.'],
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
      goals: ['{w} goals, broer. Vroeger telde ik briefjes, nu tel ik ballen. Alhamdulillah.', 'Die ballen gingen er schoon in. Echt schoon, niet zoals vroeger.'],
      assists: ['{w} assists. Ik regel het, een ander zet zijn naam eronder. Dat kennen we.', 'Ik geef de bal weg. Dat had ik vroeger met geld moeten doen.'],
      mom: ['Man of the match. Eerste keer dat ik zonder advocaat in de krant kom.', 'Ze noemen mijn naam. Vroeger was dat slecht nieuws, broer.'],
      passes: ['{pct} procent aangekomen. Dat noem ik een sluitende boekhouding.', 'Elke pass moet ergens landen. Net als geld, anders vallen ze je lastig.'],
      duels: ['{w} duels gewonnen. Ik weet hoe het voelt als ze je komen halen.', 'Ik pak de bal af zonder dat iemand iets kan bewijzen.'],
      balwinst: ['{w} keer de bal teruggehaald. Wat van ons is, komt terug, inshallah.', 'Hun bal, onze bal. Vroeger heette dat iets anders.'],
      schoten: ['{w} schoten, {g2}. Sommige dingen kun je niet witwassen.', 'Ik bleef schieten. Geduld, broer. Alles staat geschreven.'],
      rating: ['{r}. Netjes, en alles op de bon.', 'Geen gedoe, geen vragen. Gewoon {r}, broer.'],
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
      goals: ['{w} goals. Mijn moeder zegt: niet te veel sambal. Ik luisterde niet.', 'Goals zijn als rijst: één korrel tegelijk, pelan-pelan.'],
      assists: ['{w} assists. Ik kook, een ander eet. Zo hoort het in de familie.', 'Goed geven is beter dan goed nemen. Enak.'],
      mom: ['Man of the match. Morgen gewoon weer rijst koken.', 'Ik krijg de prijs, maar de hele familie heeft gekookt.'],
      passes: ['{pct} procent goed. Zonder haast, zoals een scooter in Jakarta: je komt er altijd.', 'Kort, kort, kort. Lange passes zijn voor mensen met haast.'],
      duels: ['{w} duels gewonnen. In de file leer je wie eerst gaat.', 'Rustig blijven en dan pakken. Santai.'],
      balwinst: ['{w} keer de bal terug. Wat je uitleent, komt bij ons altijd terug.', 'Geduld. De bal komt vanzelf weer langs, net als de bus.'],
      schoten: ['{w} schoten, {g2}. Rijst die niet gaar is, kook je gewoon langer.', 'Het doel stond stil, ik niet. Volgende keer.'],
      rating: ['{r}. Niet te pittig, niet te flauw. Enak.', 'Een gewone avond is ook een goede avond.'],
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
      goals: ['{w} goals. Mijn broer heeft er meer. Maar deze zijn van mij.', 'Ik dacht: wat zou mijn broer doen? Toen deed ik het zelf.'],
      assists: ['{w} assists. Ik hoef niet te scoren om er te zijn.', 'Mijn broer zoekt het doel. Ik zoek de ander. Ook een kunst.'],
      mom: ['Man of the match. Ik heb het mijn broer nog niet verteld. Misschien morgen.', 'Ze noemden mijn naam. Niet die van mijn broer. Gek gevoel.'],
      passes: ['{pct} procent van mijn passes kwam aan. Ik twijfelde minder, dus de bal ook.', 'Simpel spelen. Mijn broer kan het, en ik blijkbaar ook.'],
      duels: ['{w} duels gewonnen. Tegen mijn broer verloor ik er altijd. Vanavond niet.', 'Eerst twijfel je, dan stap je erin. Ik stap er nu eerder in.'],
      balwinst: ['{w} keer de bal veroverd. Ik pak wat ik vroeger liet liggen.', 'De bal kwam terug. Ik ook, eigenlijk.'],
      schoten: ['{w} schoten, {g2}. Mijn broer zou zeggen: blijf schieten. Hij heeft gelijk, deze keer.', 'Raak of niet, ik durfde. Dat is nieuw.'],
      rating: ['{r}. Niet het cijfer van mijn broer. Het mijne.', 'Een gewone avond. Vroeger was dat voor mij al heel wat.'],
    },
  },
  // Nog zonder achtergrond: neutrale cruijffiaanse zinnen (PERSONA_GENERIC) tot Jamal er een geeft.
  Konijnenlover22: { pro: 'Petra Selie', achtergrond: null, stem: null, eigenschappen: [], woorden: [], beelden: [], stats: null },
  'KFH Guip 023': { pro: 'G. Snoek', achtergrond: null, stem: null, eigenschappen: [], woorden: [], beelden: [], stats: null },
};

const PERSONA_GENERIC = {
  goals: ['{w} goals. Als je de bal er niet in schiet, gaat hij er ook niet in.', 'Scoren is simpel. Je moet alleen op het goede moment op de goede plek staan.'],
  assists: ['{w} assists. De beste pass is de pass die niemand ziet aankomen.', 'Wie geeft, scoort ook. Alleen staat het niet op het bord.'],
  mom: ['Man of the match. Het gaat niet om wie het beste speelt, maar wie het minst fout doet.', 'Je bent pas de beste als de anderen het zien.'],
  passes: ['{pct} procent aangekomen. Als wij de bal hebben, kunnen zij niet scoren.', 'Snel spelen is iets anders dan haasten.'],
  duels: ['{w} duels gewonnen. Wie de bal heeft, hoeft niet te verdedigen.', 'Verdedigen begint met de bal winnen. Logisch.'],
  balwinst: ['{w} keer de bal terug. Als zij hem niet hebben, kunnen ze niks.', 'Balbezit is geen kwestie van hebben, maar van terugpakken.'],
  schoten: ['{w} schoten, {g2}. Toeval is logisch.', 'Je moet schieten, anders kun je niet scoren. Ook als het niet lukt.'],
  rating: ['{r}. Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen.', 'Elk nadeel heb z\'n voordeel.'],
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
