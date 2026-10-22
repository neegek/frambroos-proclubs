// Tabblad 'Build en advies' op de spelerspagina: advies op basis van de wedstrijddata, aangescherpt met de eigen build.
// Zelfstandig (IIFE) zodat namen niet botsen met spelers.js; spelers.js roept BuildTab.load() en BuildTab.show(naam) aan.
(() => {

// ---------- attributen ----------
// Attributen (Engelse namen, zoals in het spel) met de face stat waar ze onder vallen, als terugval als alleen de face stats zijn ingevuld.
const ATTRS = {
  accel: ['Acceleration', 'pac'], sprint: ['Sprint Speed', 'pac'],
  finishing: ['Finishing', 'sho'], shotPower: ['Shot Power', 'sho'], longShots: ['Long Shots', 'sho'],
  shortPass: ['Short Passing', 'pas'], longPass: ['Long Passing', 'pas'], vision: ['Vision', 'pas'], crossing: ['Crossing', 'pas'], curve: ['Curve', 'pas'],
  ballControl: ['Ball Control', 'dri'], dribbling: ['Dribbling', 'dri'], agility: ['Agility', 'dri'], balance: ['Balance', 'dri'], reactions: ['Reactions', 'dri'], composure: ['Composure', 'dri'],
  defAwareness: ['Defensive Awareness', 'def'], standTackle: ['Standing Tackle', 'def'], slideTackle: ['Sliding Tackle', 'def'], interceptions: ['Interceptions', 'def'], heading: ['Heading Accuracy', 'def'],
  strength: ['Strength', 'phy'], stamina: ['Stamina', 'phy'], jumping: ['Jumping', 'phy'],
}
const FACE = [['pac', 'Pace (PAC)'], ['sho', 'Shooting (SHO)'], ['pas', 'Passing (PAS)'], ['dri', 'Dribbling (DRI)'], ['def', 'Defending (DEF)'], ['phy', 'Physical (PHY)']];
const FACE_SHORT = { pac: 'PAC', sho: 'SHO', pas: 'PAS', dri: 'DRI', def: 'DEF', phy: 'PHY' };
// Namen van attributen die niet in het formulier staan maar wel in de archetypedata.
const EXTRA_ATTR = { attPos: 'Att. Position', volleys: 'Volleys', penalties: 'Penalties', fkAcc: 'FK Accuracy', aggression: 'Aggression', gkDiving: 'GK Diving', gkHandling: 'GK Handling', gkKicking: 'GK Kicking', gkPos: 'GK Positioning', gkReflexes: 'GK Reflexes' };
const attrName = k => ATTRS[k]?.[0] || EXTRA_ATTR[k] || k;
const PLAYSTYLES = ['Finesse Shot', 'Power Shot', 'Chip Shot', 'Low Driven Shot', 'Incisive Pass', 'Pinged Pass', 'Long Ball Pass', 'Tiki Taka', 'Whipped Pass',
  'First Touch', 'Press Proven', 'Technical', 'Flair', 'Trickster', 'Rapid', 'Quick Step', 'Relentless',
  'Intercept', 'Anticipate', 'Jockey', 'Block', 'Bruiser', 'Slide Tackle', 'Aerial', 'Power Header'];

// ---------- maten per speler ----------
const ev = (rows, k) => rows.reduce((a, r) => a + (r.p.ev?.[k] || 0), 0);
const mins = rows => rows.reduce((a, r) => a + (r.p.secondsPlayed || 0), 0) / 60;
const ratio = (num, den, min = 1) => den >= min ? num / den : null;
// lower = true: lager is beter. min: minimale noemer om iets te zeggen.
const METRICS = {
  ballLoss: { lower: true, fmt: v => `${Math.round(v * 100)}% van de balacties`, calc: r => ratio(ev(r, 'possession_lost'), ev(r, 'ball_actions'), 60) },
  lossDef: { lower: true, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'possession_lost_def_third') / mins(r) : null },
  shortFail: { lower: true, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'passes_failed_short'), ev(r, 'passes_failed_short') + ev(r, 'passes_completed_short'), 30) },
  longFail: { lower: true, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'passes_failed_long') + ev(r, 'passes_failed_medium'), ev(r, 'passes_failed_long') + ev(r, 'passes_completed_long') + ev(r, 'passes_failed_medium') + ev(r, 'passes_completed_medium'), 20) },
  fwdFail: { lower: true, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'passes_failed_forward'), ev(r, 'passes_failed_forward') + ev(r, 'passes_completed_forward'), 30) },
  crossFail: { lower: true, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'crosses_failed'), ev(r, 'crosses_failed') + ev(r, 'crosses_completed'), 8) },
  conv: { lower: false, fmt: v => `${Math.round(v * 100)}% van de schoten`, calc: r => ratio(r.reduce((a, x) => a + (x.p.goals || 0), 0), r.reduce((a, x) => a + (x.p.shots || 0), 0), 8) },
  onTarget: { lower: false, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'shots_on_target_inside_box') + ev(r, 'shots_on_target_outside_box'), r.reduce((a, x) => a + (x.p.shots || 0), 0), 8) },
  outside: { lower: true, fmt: v => `${Math.round(v * 100)}% van buiten de zestien`, calc: r => ratio(ev(r, 'shots_on_target_outside_box') + ev(r, 'shots_off_target_outside_box'), r.reduce((a, x) => a + (x.p.shots || 0), 0), 8) },
  tackleWin: { lower: false, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(r.reduce((a, x) => a + (x.p.tacklesMade || 0), 0), r.reduce((a, x) => a + (x.p.tackleAttempts || 0), 0), 15) },
  interceptions: { lower: false, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'interceptions') / mins(r) : null },
  fouls: { lower: true, fmt: v => `${v.toFixed(2)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'fouls_conceded_total') / mins(r) : null },
  outPos: { lower: true, fmt: v => `${Math.round(v * 100)}% van de momenten`, calc: r => ratio(ev(r, 'out_of_position'), ev(r, 'out_of_position') + ev(r, 'in_position'), 30) },
  wrongChoice: { lower: true, fmt: v => `${v.toFixed(1)} keer per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'fb_should_have_passed_elsewhere') / mins(r) : null },
  dribbles: { lower: false, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'dribbles_completed') / mins(r) : null },
  beaten: { lower: false, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'players_beaten') / mins(r) : null },
  passAcc: { lower: false, fmt: v => `${Math.round(v * 100)}% aan`, calc: r => ratio(r.reduce((a, x) => a + (x.p.passesMade || 0), 0), r.reduce((a, x) => a + (x.p.passAttempts || 0), 0), 40) },
  // context: waar en waarom iets gebeurt
  shots90: { lower: false, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * r.reduce((a, x) => a + (x.p.shots || 0), 0) / mins(r) : null },
  lost90: { lower: true, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'possession_lost') / mins(r) : null },
  lossAtt: { lower: true, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'possession_lost_att_third'), ev(r, 'possession_lost'), 15) },
  lossDefShare: { lower: true, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'possession_lost_def_third'), ev(r, 'possession_lost'), 15) },
  beatenPerLoss: { lower: false, fmt: v => `${v.toFixed(2)} per verloren bal`, calc: r => ratio(ev(r, 'players_beaten'), ev(r, 'possession_lost'), 15) },
  dribbleRate: { lower: false, fmt: v => `${Math.round(v * 100)}% van de balacties`, calc: r => ratio(ev(r, 'dribbles_completed'), ev(r, 'ball_actions'), 60) },
  insideShare: { lower: false, fmt: v => `${Math.round(v * 100)}% binnen de zestien`, calc: r => ratio(ev(r, 'shots_on_target_inside_box') + ev(r, 'shots_off_target_inside_box'), r.reduce((a, x) => a + (x.p.shots || 0), 0), 8) },
  savedShare: { lower: true, fmt: v => `${Math.round(v * 100)}% van de schoten op doel gered`, calc: r => ratio(ev(r, 'shots_saved'), ev(r, 'shots_on_target_inside_box') + ev(r, 'shots_on_target_outside_box'), 6) },
  fwdShare: { lower: false, fmt: v => `${Math.round(v * 100)}% van de passes vooruit`, calc: r => ratio(ev(r, 'passes_completed_forward') + ev(r, 'passes_failed_forward'), ev(r, 'passes_completed') + ev(r, 'passes_failed'), 40) },
  through90: { lower: false, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'through_balls') / mins(r) : null },
  assists90: { lower: false, fmt: v => `${v.toFixed(2)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * r.reduce((a, x) => a + (x.p.assists || 0), 0) / mins(r) : null },
  noOption: { lower: true, fmt: v => `${v.toFixed(1)} keer per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'fb_no_good_option') / mins(r) : null },
  wonAtt: { lower: false, fmt: v => `${Math.round(v * 100)}%`, calc: r => ratio(ev(r, 'possession_won_att_third'), ev(r, 'possession_won'), 10) },
  // aan de bal in context (docs/coach-logica.md §4a)
  act90: { lower: false, fmt: v => `${v.toFixed(0)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * ev(r, 'ball_actions') / mins(r) : null },
  create90: { lower: false, fmt: v => `${v.toFixed(1)} per 90 min`, calc: r => mins(r) >= 180 ? 90 * (ev(r, 'through_balls') + ev(r, 'second_assists') + r.reduce((a, x) => a + (x.p.assists || 0), 0)) / mins(r) : null },
  yieldPerLoss: { lower: false, fmt: v => `${v.toFixed(1)} per verloren bal`, calc: r => ratio(ev(r, 'players_beaten') + ev(r, 'through_balls') + ev(r, 'second_assists') + r.reduce((a, x) => a + (x.p.assists || 0), 0), ev(r, 'possession_lost'), 15) },
  noOptShare: { lower: true, fmt: v => `${Math.round(v * 100)}% van de balmomenten`, calc: r => ratio(ev(r, 'fb_no_good_option'), ev(r, 'feedback_passes_graded'), 40) },
};

// ---------- vergelijking met dezelfde positie ----------
function allRows() {
  const out = [];
  for (const m of DATA.matches) { for (const p of m.players) if (p.ev) out.push({ m, p, ours: true }); for (const p of m.opponentPlayers) if (p.ev) out.push({ m, p, ours: false }); }
  return out;
}
// Verwachte waarde voor een speler: per positie de waarde over alle spelers, gewogen naar hoe vaak de speler daar stond.
function benchmark(metric, rows, pool) {
  const count = {}; for (const r of rows) count[r.p.pos] = (count[r.p.pos] || 0) + 1;
  let sum = 0, w = 0;
  for (const [pos, n] of Object.entries(count)) { const v = metric.calc(pool.filter(r => r.p.pos === pos)); if (v !== null && v !== undefined) { sum += v * n; w += n; } }
  return w ? sum / w : null;
}

function attrValue(build, key) {
  if (!build) return null;
  if (build[key]) return { v: build[key], exact: true };
  const face = ATTRS[key]?.[1];
  return face && build[face] ? { v: build[face], exact: false } : null;
}
// Prijsklasse voor het gekozen archetype, met de richting van EA's AP-update van 22-10-2026 (docs/archetypes.md).
function costNote(key) {
  const c = typeof costInfo === 'function' ? costInfo(currentArch, key) : null; if (!c) return '';
  const was = c.tierName ? (c.patch ? `was ${c.tierName}` : c.tierName) : '';
  const p = c.patch === 'up' ? 'sinds 22 okt duurder' : c.patch === 'down' ? 'sinds 22 okt goedkoper' : '';
  return [was, p].filter(Boolean).join(', ');
}
function attrAdvice(build, keys) {
  const parts = keys.map(k => {
    const a = attrValue(build, k), label = attrName(k), cost = costNote(k);
    const withCost = t => cost ? `${t} <small>(${cost})</small>` : t;
    if (!a) return { label, txt: withCost(label), level: null };
    const shown = `${label} ${a.exact ? a.v : `(via ${FACE_SHORT[ATTRS[k][1]]} ${a.v})`}`;
    return { label, txt: withCost(shown), level: a.v >= 82 ? 'hoog' : a.v >= 70 ? 'midden' : 'laag', exact: a.exact };
  });
  const low = parts.filter(p => p.level === 'laag'), mid = parts.filter(p => p.level === 'midden'), high = parts.filter(p => p.level === 'hoog'), unknown = parts.filter(p => p.level === null);
  const out = [];
  if (low.length) out.push(`<b>Verhoog eerst:</b> ${low.map(p => p.txt).join(', ')}.`);
  if (mid.length) out.push(`${low.length ? 'Daarna' : '<b>Verhoog:</b>'} ${mid.map(p => p.txt).join(', ')}.`);
  if (unknown.length) out.push(`${low.length || mid.length ? 'Ook relevant:' : '<b>Attributes:</b>'} ${unknown.map(p => p.txt).join(', ')}.`);
  if (high.length && !low.length && !mid.length && !unknown.length) out.push(`${high.map(p => p.txt).join(', ')} ${high.length > 1 ? 'zijn' : 'is'} al hoog: dit ligt eerder aan keuzes en timing dan aan punten.`);
  else if (high.length) out.push(`Al hoog: ${high.map(p => p.txt).join(', ')}.`);
  return out.join(' ');
}
function psAdvice(build, list) {
  if (!list.length) return '';
  const have = build?.playstyles || {};
  const missing = list.filter(p => !have[p]), owned = list.filter(p => have[p]);
  const bits = [];
  if (missing.length) bits.push(`<b>PlayStyles:</b> ${missing.join(', ')}`);
  if (owned.length) bits.push(`al in bezit: ${owned.map(p => `${p}${have[p] === 'plus' ? '+' : ''}`).join(', ')}`);
  return bits.join('; ') + '.';
}

// ---------- render ----------
let BUILDS = {}, selected = null, currentArch = null, archChoice = {};
const ROWS = () => allRows();
const MIN_ARCH_ROWS = 5, MIN_ARCH_POOL = 20; // zie docs/coach-logica.md §3

// Laatst gespeelde archetype van een speler: de standaard voor het advies.
function lastArchetype(name) {
  const rows = ROWS().filter(r => r.ours && r.p.name === name && r.p.archetypeId).sort((a, b) => a.m.ts - b.m.ts);
  return rows.length ? rows[rows.length - 1].p.archetypeId : null;
}

// Analyse voor één archetype. Eigen wedstrijden met dat archetype als het er minstens MIN_ARCH_ROWS zijn, anders alle.
// Vergelijkingsgroep: alle spelers met hetzelfde archetype als die groep groot genoeg is, anders dezelfde positie.
function analyse(name, arch, matchIds = null) {
  const pool = ROWS(), all = pool.filter(r => r.ours && r.p.name === name && (!matchIds || matchIds.has(r.m.matchId)));
  const own = all.filter(r => r.p.archetypeId === arch);
  const rows = own.length >= MIN_ARCH_ROWS ? own : all;
  const archPool = pool.filter(r => r.p.archetypeId === arch);
  const byArch = archPool.length >= MIN_ARCH_POOL;
  const res = {};
  for (const [k, mt] of Object.entries(METRICS)) {
    const v = mt.calc(rows), b = byArch ? mt.calc(archPool) : benchmark(mt, rows, pool);
    if (v === null || v === undefined || b === null || b === undefined || !b) continue;
    const worse = mt.lower ? (v - b) / b : (b - v) / b;
    res[k] = { v, b, worse, fmt: mt.fmt };
  }
  return { rows, res, scope: { ownArch: own.length, usedArchRows: rows === own, byArch, archPool: archPool.length } };
}

// ---------- genuanceerd advies ----------
// De denkwijze staat uitgeschreven in docs/coach-logica.md. Pas daar eerst de regel aan, dan hier de code.
// Kern: iedereen krijgt dezelfde opbouw. Elk thema levert altijd een score (hoeveel winst er te halen is),
// kijkt in twee richtingen (te veel risico én te veilig) en houdt rekening met de build van de speler.
const pct0 = v => `${Math.round(v * 100)}%`;
const rel = x => x ? (x.v - x.b) / Math.abs(x.b) : 0; // positief = hoger dan spelers op dezelfde positie
const gap = x => x ? x.worse : 0;                    // positief = slechter dan spelers op dezelfde positie

const SIZE = s => s >= 0.25 ? 'grote winst' : s >= 0.12 ? 'duidelijke winst' : 'fijnslijpen';

// ---------- aan de bal in context (docs/coach-logica.md §4a) ----------
// Eén oordeel per speler uit zes vragen: hoe vaak aan de bal, uitspelen, dribbelen, creëren, lastige balmomenten, wat het kost
// en wat een verloren bal oplevert. De kaart op Algemeen en het adviesthema 'Aan de bal' gebruiken dezelfde uitkomst.
const lvl = (x, t = 0.15) => !x ? null : rel(x) >= t ? 'hoog' : rel(x) <= -t ? 'laag' : 'normaal';
const BALL_VERDICT = {
  prijs: { title: 'De prijs van het spel', good: null,
    means: 'Je verliest meer ballen dan gemiddeld, maar je {risk} dan gemiddeld en dat levert op: per verloren bal staat er minstens zoveel tegenover als bij anderen. Het verlies hoort bij je spel; de winst zit in de timing, niet in minder proberen.',
    play: ['Speel sneller af nadat je je man voorbij bent.', 'Ga de tweede dribbel alleen aan als er ruimte voor je ligt.'] },
  duur: { title: 'Risico dat te weinig oplevert', good: false,
    means: 'Je {risk} dan gemiddeld, maar per verloren bal levert het minder op dan bij anderen. De actie komt vaak op het verkeerde moment of de verkeerde plek.',
    play: ['Kijk eerst of er een medespeler vrij staat voordat je de dribbel aangaat.', 'Bewaar de dribbel voor de helft van de tegenstander, met ruimte achter je man.'] },
  druk: { title: 'Vaak zonder opties', good: false,
    means: 'Je neemt niet meer risico dan gemiddeld, maar krijgt de bal vaker op momenten zonder aanspeelpunt. Dat ligt deels bij medespelers die zich te weinig aanbieden, deels bij hoe en waar je de bal aanneemt.',
    play: ['Kijk over je schouder voordat de bal komt, zodat je al weet waar hij heen moet.', 'Laat de bal eerder gaan, voordat de opties verdwijnen.', 'Spreek als team af dat er altijd één korte optie dichtbij is.'] },
  slordig: { title: 'Balverlies zonder risico', good: false,
    means: 'Er staat weinig risico tegenover het balverlies en er zijn niet vaker dan gemiddeld momenten zonder opties. Het gaat eerder mis bij het aannemen of bij een eenvoudige pass.',
    play: ['Neem aan in de looprichting, met je lichaam open naar het veld.', 'Scherm de bal af als er druk in je rug staat, in plaats van weg te draaien.'] },
  gevaarlijk: { title: 'Gevaarlijk zonder extra verlies', good: true,
    means: 'Je {risk} dan gemiddeld, zonder dat je vaker de bal verliest. Dat is een sterk punt.',
    play: ['Zo houden; zoek de actie vooral op de helft van de tegenstander.'] },
  weinigDreiging: { title: 'Weinig dreiging', good: false,
    means: 'Je verliest niet meer ballen dan gemiddeld, maar speelt ook minder mensen uit en creëert minder. Voor deze build mag er meer dreiging vanuit gaan.',
    play: ['Zoek per balbezit één actie vooruit: een dribbel of een pass door de linie.'] },
  rustig: { title: 'Rustig aan de bal', good: null,
    means: 'Je speelt minder mensen uit en creëert minder dan gemiddeld, en verliest niet meer ballen dan normaal. Voor deze build past die rust; winst zit eerder in een bal minder verliezen dan in meer risico.',
    play: ['Speel in één of twee keer raken door; zoek af en toe de pass die een linie overslaat.'] },
  balans: { title: 'In balans', good: null,
    means: 'Balverlies, risico en opbrengst liggen rond het gemiddelde. Niets dat eruit springt.',
    play: [] },
  balvastGevaarlijk: { title: 'Balvast én gevaarlijk', good: true,
    means: 'Je {risk} dan gemiddeld, en verliest toch minder ballen. Een zeldzame combinatie.',
    play: ['Zo houden; zoek de actie vooral op de helft van de tegenstander.'] },
  rustpunt: { title: 'Rustpunt', good: true,
    means: 'Je verliest weinig ballen en neemt weinig risico. Voor deze build is dat de taak: jij houdt de bal in de ploeg zodat anderen risico kunnen nemen.',
    play: ['Blijf het rustpunt; zoek af en toe de pass die een linie overslaat.'] },
  opZeker: { title: 'Op zeker', good: false,
    means: 'Je verliest weinig ballen, maar speelt ook weinig mensen uit en creëert weinig. Voor deze build mag je meer risico nemen: verdedigers hoeven je nu weinig te vrezen.',
    play: ['Ga vaker één-op-één als er ruimte achter je man ligt, vooral op de helft van de tegenstander.', 'Zoek per balbezit één actie vooruit.'] },
  balvast: { title: 'Balvast', good: true,
    means: 'Je verliest minder ballen dan gemiddeld, bij een normale hoeveelheid risico.',
    play: ['Zo houden.'] },
};
function ballContext(res, prof) {
  const lossHigh = gap(res.ballLoss) >= 0.15 || gap(res.lost90) >= 0.15;
  const lossLow = !lossHigh && gap(res.ballLoss) <= -0.15;
  const risk = lvl(res.beaten) === 'hoog' || lvl(res.create90) === 'hoog';
  const quiet = lvl(res.beaten) === 'laag' && lvl(res.create90) === 'laag';
  const pays = !!res.yieldPerLoss && res.yieldPerLoss.v >= res.yieldPerLoss.b * 0.9;
  const hard = lvl(res.noOptShare, 0.1) === 'hoog';
  const front = !!res.lossAtt && res.lossAtt.v >= 0.5;
  const back = !!res.lossDefShare && res.lossDefShare.v >= 0.2 && res.lossDefShare.v >= res.lossDefShare.b * 1.5;
  const control = !!prof.safeFits;
  const key = lossHigh ? (risk ? (pays ? 'prijs' : 'duur') : hard ? 'druk' : 'slordig')
    : lossLow ? (risk ? 'balvastGevaarlijk' : quiet ? (control ? 'rustpunt' : 'opZeker') : 'balvast')
    : risk && pays ? 'gevaarlijk' : quiet ? (control ? 'rustig' : 'weinigDreiging') : 'balans';
  const hi = k => lvl(res[k]) === 'hoog';
  const riskTxt = hi('beaten') && hi('create90') ? 'speelt meer mensen uit en creëert meer' : hi('beaten') ? 'speelt meer mensen uit' : 'creëert meer';
  const extra = [];
  if (hi('act90') && rel(res.lost90) > 0) extra.push('Je bent ook vaker aan de bal dan gemiddeld, dus in aantallen verlies je er meer; per balactie valt het mee.');
  if (back) extra.push('Een opvallend deel van het balverlies valt op eigen helft; daar levert het direct een kans tegen op.');
  else if (front && key !== 'balans') extra.push('Het meeste balverlies valt op de helft van de tegenstander, waar het het minst kost.');
  if (hard && key !== 'druk') extra.push('Je krijgt de bal wel vaker dan gemiddeld op momenten zonder aanspeelpunt.');
  return { key, ...BALL_VERDICT[key], means: BALL_VERDICT[key].means.replace('{risk}', riskTxt), extra, lossHigh, lossLow, risk, quiet, pays, hard, front, back, control };
}

function themes(name, res, build, rows, arch) {
  const C = []; // kandidaten
  const forwardish = rows.filter(r => r.p.pos === 'forward').length > rows.length / 2;
  const buildCount = {}; for (const r of rows) if (r.p.archetypeId) buildCount[r.p.archetypeId] = (buildCount[r.p.archetypeId] || 0) + 1;
  const mainBuild = arch || Number(Object.entries(buildCount).sort((a, b) => b[1] - a[1])[0]?.[0]) || null;
  const prof = ARCHETYPE_PROFILE[mainBuild] || ARCHETYPE_PROFILE[forwardish ? 12 : 8];
  const role = prof.safeFits ? 'controle' : prof.attacker ? 'aanval' : 'loper';
  const plain = (k, v) => (res[k].fmt(v).match(/^[\d.,]+%?/) || [res[k].fmt(v)])[0];
  const vs = k => `${res[k].fmt(res[k].v)} (positiegemiddelde ${plain(k, res[k].b)})`;
  const ourLoss = DATA.players.map(n => ({ n, v: METRICS.lost90.calc(ROWS().filter(r => r.ours && r.p.name === n)) })).filter(x => x.v !== null).sort((a, b) => b.v - a.v);
  const teamLoss = avg(ourLoss.map(x => x.v)), teamRank = ourLoss.findIndex(x => x.n === name) + 1;

  // 1. Aan de bal: risico tegenover opbrengst, en waar het misgaat
  const ctx = ballContext(res, prof);
  if (res.ballLoss) {
    const { risk, pays, hard } = ctx; // §4a
    const defLossReal = res.lossDef && res.lossDef.worse >= 0.3 && res.lossDef.v - res.lossDef.b >= 0.3;
    const teamHigh = res.lost90 && teamLoss && res.lost90.v >= teamLoss * 1.2;
    const lossGap = Math.max(gap(res.ballLoss), gap(res.lost90), defLossReal ? gap(res.lossDef) : 0);
    const safe = ctx.key === 'rustpunt' || ctx.key === 'opZeker';
    const teamOnly = teamHigh && gap(res.ballLoss) < 0.05 && gap(res.lost90) < 0.05; // alleen binnen het team hoog
    if ((lossGap >= 0.05 || teamHigh) && ctx.good !== true) { // geen kanttekening bij wat §4a een sterk punt noemt
      const says = [];
      if (gap(res.ballLoss) >= 0.05) says.push(`Je verliest de bal bij ${vs('ballLoss')}.`);
      else if (gap(res.lost90) >= 0.05) says.push(`Per balactie verlies je de bal niet vaker dan gemiddeld (${plain('ballLoss', res.ballLoss.v)} tegen ${plain('ballLoss', res.ballLoss.b)}), maar omdat je vaak aan de bal bent, verlies je er in totaal meer: ${vs('lost90')}.`);
      else if (teamHigh) says.push(`Binnen Frambroos verlies je ${teamRank === 1 ? 'de meeste' : 'veel'} ballen: ${res.lost90.fmt(res.lost90.v)}, tegen ${teamLoss.toFixed(1)} gemiddeld in het team. Voor spelers op jouw positie is dat normaal (positiegemiddelde ${plain('lost90', res.lost90.b)}).`);
      else says.push(`Je verliest de bal niet vaker dan spelers op dezelfde positie, maar wel vaker op eigen helft: ${vs('lossDef')}.`);
      if (risk && res.beaten && res.create90) says.push(`Daar staat tegenover: uitgespeelde tegenstanders ${vs('beaten')}, gecreëerd (steekpasses, assists en tweede assists) ${vs('create90')}.`);
      if (res.yieldPerLoss) says.push(risk ? `Samen is dat ${vs('yieldPerLoss')}.` : `Opbrengst (uitgespeeld plus gecreëerd): ${vs('yieldPerLoss')}.`);
      if (hard) says.push(`Het spel meldt bij ${vs('noOptShare')} dat er geen goede optie was.`);
      if (res.lossAtt && res.lossDefShare) says.push(`Van je balverlies valt ${pct0(res.lossAtt.v)} op de helft van de tegenstander en ${pct0(res.lossDefShare.v)} op eigen helft (positiegemiddelde ${pct0(res.lossDefShare.b)}).`);
      const means = [];
      if (risk && pays) means.push(`Je neemt bewust meer risico, en dat betaalt zich grotendeels terug: per verloren bal speel je minstens zoveel mensen uit en creëer je minstens zoveel als gemiddeld.${teamHigh && gap(res.lost90) < 0.05 ? ' Dat je binnen het team de bal vaak kwijt bent, komt vooral doordat je het vaakst iets probeert; de rest speelt behoudender.' : ' Het balverlies is deels de prijs van je spel.'}`);
      else if (risk) means.push('Je neemt meer risico dan het oplevert: per verloren bal speel je minder mensen uit en creëer je minder dan gemiddeld. De actie komt vaak op het verkeerde moment.');
      else if (hard) means.push(BALL_VERDICT.druk.means);
      else if (teamOnly && pays) means.push('Per verloren bal levert je spel minstens zoveel op als bij anderen met deze build. Het verschil met de rest van het team komt vooral door je rol: wie voorin speelt, verliest de bal vaker.');
      else means.push(role === 'controle' ? `Voor een ${archName(mainBuild)} telt balvastheid extra: jouw taak is ${prof.task}, dus een verloren bal kost direct.` : 'Er staan niet veel dribbels tegenover het balverlies; het gaat eerder mis bij het aannemen of onder druk.');
      if (res.lossAtt && res.lossAtt.v >= 0.5) means.push('Het meeste balverlies valt voorin, waar het het minst kost.');
      if (defLossReal) means.push('Op eigen helft gaat het vaker mis dan gemiddeld; daar levert balverlies direct een kans tegen op.');
      C.push({ key: 'ball', title: risk ? 'Veel risico aan de bal' : hard ? 'Balverlies in lastige momenten' : 'Balvastheid', short: risk ? 'kiezen wanneer je de actie zoekt' : hard ? 'eerder kijken en de bal eerder laten gaan' : 'balvastheid onder druk',
        score: Math.max(lossGap, teamHigh ? (teamOnly && pays ? 0.06 : 0.12) : 0) * (risk && pays ? 0.6 : 1) * (role === 'controle' && !risk ? 1.2 : 1), says, means,
        play: risk ? ['Speel sneller af nadat je je man voorbij bent; ga de tweede dribbel alleen aan als er ruimte voor je ligt.', 'Scherm de bal af met je lichaam als er druk in je rug staat, in plaats van weg te draaien.', ...(defLossReal ? ['Op eigen helft: één of twee keer raken, geen dribbels.'] : [])]
          : hard ? BALL_VERDICT.druk.play : BALL_VERDICT.slordig.play,
        train: risk ? ['Oefen dribbeltechnieken en skillmoves in de vaardigheidsspellen of de Arena: wegdraaien, afschermen en versnellen na de actie.'] : ['Oefen de eerste aanname onder druk in de vaardigheidsspellen.'],
        attrs: ['ballControl', 'balance', 'strength', ...(risk ? ['dribbling', 'agility'] : ['composure'])], ps: risk ? ['Technical', 'Press Proven', 'Quick Step'] : ['First Touch', 'Press Proven'] });
    } else if (safe) {
      const fits = role === 'controle';
      C.push({ key: 'ball', title: 'Veilig aan de bal', short: 'vaker het risico nemen', score: fits ? 0.03 : Math.min(-gap(res.ballLoss), -rel(res.dribbles)) * 0.6,
        says: [`Je verliest de bal weinig: ${vs('ballLoss')}. Je speelt ook minder mensen uit, ${vs('beaten')}, en creëert minder, ${vs('create90')}.`],
        means: [fits ? `Dat past bij een ${archName(mainBuild)}: jouw taak is ${prof.task}, en jij houdt de bal in de ploeg zodat anderen risico kunnen nemen.` : 'Je speelt op zeker. Dat is waardevol, maar voor jouw build mag er meer dreiging vanuit gaan: verdedigers hoeven je nu weinig te vrezen.'],
        play: fits ? ['Blijf het rustpunt; zoek wel af en toe de pass die een linie overslaat.'] : ['Ga vaker één-op-één als er ruimte achter je man ligt, vooral op de helft van de tegenstander.'],
        train: fits ? [] : ['Oefen één simpele skillmove tot hij automatisch gaat, zodat de dribbel een optie wordt.'],
        attrs: fits ? [] : ['dribbling', 'agility', 'accel'], ps: fits ? [] : ['Quick Step', 'Technical'] });
    }
  }

  // 2. Afronden: kwaliteit van de kansen, raak schieten en plaatsing; en voor aanvallers ook het aantal schoten
  const attacker = prof.attacker;
  const shootGap = Math.max(gap(res.conv), gap(res.onTarget));
  if (shootGap >= 0.05 && (res.conv || res.onTarget)) {
    const far = res.insideShare && res.insideShare.v < res.insideShare.b * 0.85, saved = gap(res.savedShare) >= 0.15, wide = gap(res.onTarget) >= 0.15;
    const says = [res.conv ? `Je scoort uit ${vs('conv')}.` : `Van je schoten gaat ${vs('onTarget')}.`];
    if (res.insideShare) says.push(`${pct0(res.insideShare.v)} van je schoten komt van binnen de zestien (positiegemiddelde ${pct0(res.insideShare.b)}).`);
    if (res.onTarget) says.push(`${pct0(res.onTarget.v)} gaat op doel (positiegemiddelde ${pct0(res.onTarget.b)})${res.savedShare ? `, en daarvan redt de keeper ${pct0(res.savedShare.v)} (positiegemiddelde ${pct0(res.savedShare.b)})` : ''}.`);
    const means = [];
    if (far) means.push('Een groot deel van je schoten komt van afstand, en die hebben voor iedereen een laag rendement. De lage conversie zegt dus vooral iets over de kansen die je kiest, niet per se over je afronding.');
    if (wide && !far) means.push('Veel schoten gaan naast, ook van dichtbij: dat is afronden onder druk of uit balans.');
    if (saved && !far) means.push(wide ? 'En wat wél op doel komt, redt de keeper relatief vaak: vaak te centraal of te hard op de man.' : 'Je raakt het doel genoeg, maar de keeper redt relatief veel: de afronding is te makkelijk voor de keeper, vaak te centraal of te hard op de man.');
    if (!means.length && gap(res.conv) < 0.05 && gap(res.onTarget) >= 0.05) means.push(`Je scoort net zo vaak als gemiddeld, maar raakt het doel iets minder vaak.${gap(res.savedShare) < 0 ? ' Wat wel op doel komt, gaat er relatief vaak in: de schoten zijn goed geplaatst, alleen niet altijd tussen de palen.' : ''}`);
    if (!means.length) means.push('De kansen zijn niet slechter dan gemiddeld, maar ze gaan minder vaak in. Dat kan ook pech zijn; met meer wedstrijden wordt duidelijk of het blijft.');
    C.push({ key: 'shoot', title: far ? 'Moeilijke kansen' : 'Afronding', short: far ? 'de kansen die je kiest' : 'de afronding', score: shootGap * (far ? 0.8 : 1) * (attacker ? 1 : 0.7), says, means,
      play: [...(far ? ['Probeer niet elke kans zelf te maken: leg vaker breed of dring door tot in de zestien.'] : []), ...(saved ? ['Mik op de hoeken; kies de geplaatste of de lage afronding.'] : []), ...(wide && !far ? ['Neem een extra aanname als er tijd is, en schiet niet uit balans.'] : []), ...(!far && !saved && !wide ? ['Blijf dezelfde kansen opzoeken; de afronding volgt meestal vanzelf.'] : [])],
      train: far ? ['Oefen moeilijkere schoten van de rand van de zestien in de vaardigheidsspellen, zodat ze wél een optie worden.', 'Oefen ook de laatste pass vanuit die positie.'] : ['Oefen afronden onder een hoek en een-op-een met de keeper.'],
      attrs: far ? ['longShots', 'shotPower', 'finishing'] : ['finishing', 'composure', ...(saved ? ['curve'] : [])], ps: far ? ['Power Shot', 'Finesse Shot'] : saved ? ['Finesse Shot', 'Low Driven Shot'] : ['Finesse Shot'] });
  } else if (attacker && gap(res.shots90) >= 0.15) {
    C.push({ key: 'shoot', title: 'Weinig schoten', short: 'vaker zelf de afronding zoeken', score: gap(res.shots90) * 0.8,
      says: [`Je schiet ${vs('shots90')}.${res.conv ? ` Als je schiet, scoor je uit ${vs('conv')}.` : ''}`],
      means: [`Voor een ${archName(mainBuild)} kom je weinig tot schieten. ${gap(res.conv) <= 0 ? 'Je afronding is prima, dus meer schoten levert waarschijnlijk meer goals op.' : 'Meer schoten betekent ook meer kans op goals.'}`],
      play: ['Loop vaker in de diepte of naar de tweede paal als de bal op de vleugel is.', 'Schiet als je de keeper ziet staan, in plaats van nog een pass te zoeken.'],
      train: ['Oefen de loopactie in de rug van de verdediger en afronden in één keer.'], attrs: ['finishing', 'accel', 'reactions'], ps: ['Finesse Shot', 'Rapid'] });
  }

  // 3. Passen: ambitie en opbrengst tegenover nauwkeurigheid
  const passKeys = ['shortFail', 'longFail', 'fwdFail', 'crossFail'].filter(k => res[k]).sort((a, b) => res[b].worse - res[a].worse);
  const passGap = passKeys.length ? res[passKeys[0]].worse : 0;
  const ambitious = rel(res.fwdShare) >= 0.1 || rel(res.through90) >= 0.2;
  const payoff = (res.assists90 && res.assists90.v >= res.assists90.b) || rel(res.through90) >= 0.2;
  if (passGap >= 0.05) {
    const issues = passKeys.filter(k => res[k].worse >= 0.05);
    const label = { shortFail: 'korte passes', longFail: 'middellange en lange passes', fwdFail: 'passes vooruit', crossFail: 'voorzetten' };
    const says = issues.slice(0, 2).map(k => `Van je ${label[k]} komt ${vs(k).replace(' (', ' niet aan (')}.`);
    if (res.fwdShare) says.push(`${pct0(res.fwdShare.v)} van je passes gaat vooruit (positiegemiddelde ${pct0(res.fwdShare.b)}).`);
    if (res.assists90) says.push(`Assists: ${vs('assists90')}.`);
    const means = [];
    if (ambitious && payoff) means.push('Je zoekt vaker dan gemiddeld de pass vooruit, en dat levert kansen op. Meer mislukte passes horen daarbij; dit is een afweging, geen fout.');
    else if (ambitious) means.push('Je speelt veel vooruit, maar dat levert nog weinig kansen op. De pass komt vaak te vroeg of op een geblokte lijn.');
    else if (issues.slice(0, 2).includes('shortFail') && res.shortFail.worse >= 0.15) means.push('Ook eenvoudige korte passes komen minder aan; dat wijst op techniek of druk bij de aanname, niet op risico.');
    else means.push(`Vooral de ${label[issues[0]]} gaan mis.`);
    if (!ambitious && payoff && res.assists90 && res.assists90.v >= res.assists90.b * 1.5) means.push(`Tegelijk geef je ${res.assists90.v >= res.assists90.b * 2 ? 'ruim twee keer' : 'duidelijk'} zoveel assists als gemiddeld: je passing levert kansen op, alleen de mislukte ballen kosten veel balbezit. Het doel is dus niet minder vooruit spelen, maar de verkeerde ballen eruit halen.`);
    const attrs = [...new Set(issues.flatMap(k => ({ shortFail: ['shortPass'], longFail: ['longPass', 'curve'], fwdFail: ['vision', 'shortPass'], crossFail: ['crossing', 'curve'] })[k]))];
    const ps = [...new Set(issues.flatMap(k => ({ shortFail: ['Tiki Taka'], longFail: ['Long Ball Pass', 'Pinged Pass'], fwdFail: ['Incisive Pass'], crossFail: ['Whipped Pass'] })[k]))];
    C.push({ key: 'pass', title: ambitious ? 'Risicovol passen' : 'Passes die niet aankomen', short: issues[0] === 'longFail' ? 'de langere passes' : issues[0] === 'crossFail' ? 'de voorzetten' : 'de passkeuze',
      score: passGap * (payoff ? 0.6 : 1), says, means,
      play: [ambitious ? 'Wacht net iets langer op de loopactie; de steekpass werkt het best als de loper al versnelt.' : 'Speel de bal in de looprichting van je medespeler, niet op zijn voeten als hij al loopt.', ...(issues.includes('fwdFail') ? ['Speel eerst breed als de lijn vooruit dicht is; dan gaat de lijn daarna vaak wel open.'] : [])],
      train: ['Oefen het timen van de steekpass en de lage, harde pass (Pinged) in de vaardigheidsspellen.'], attrs, ps });
  } else if (res.fwdShare && rel(res.fwdShare) <= -0.1 && gap(res.passAcc) <= 0) {
    const fits = role === 'controle';
    C.push({ key: 'pass', title: 'Veilig passen', short: 'vaker vooruit spelen', score: fits ? 0.04 : -rel(res.fwdShare) * 0.8,
      says: [`Je passing is zuiver: ${vs('passAcc')}. Maar ${pct0(res.fwdShare.v)} van je passes gaat vooruit (positiegemiddelde ${pct0(res.fwdShare.b)}).`],
      means: [fits ? `Voor een ${archName(mainBuild)} is dat logisch: de bal rond laten gaan hoort bij je taak. Er ligt wel ruimte om af en toe een linie over te slaan.` : 'Je speelt vaak breed of terug. Dat is veilig, maar zo kom je minder vaak tot kansen.'],
      play: ['Kijk eerst vooruit voordat je breed speelt; speel de vrije man tussen de linies aan als die er is.'], train: ['Oefen de pass door de linies en de steekpass in de vaardigheidsspellen.'],
      attrs: ['vision', 'shortPass'], ps: ['Incisive Pass'] });
  }

  // 4. Verdedigen: duels, met onderscheid tussen drukzetten voorin en duels achterin; en betrokkenheid
  if (res.tackleWin && gap(res.tackleWin) >= 0.05) {
    const press = (res.wonAtt && res.wonAtt.v >= 0.35) || (forwardish && (!res.wonAtt || res.wonAtt.v >= 0.2));
    const says = [`Van je duels win je ${vs('tackleWin')}.`];
    if (res.wonAtt) says.push(`${pct0(res.wonAtt.v)} van je balwinst is op de helft van de tegenstander (positiegemiddelde ${pct0(res.wonAtt.b)}).`);
    if (gap(res.fouls) >= 0.2) says.push(`Overtredingen: ${vs('fouls')}.`);
    C.push({ key: 'defend', title: press ? 'Drukzetten' : 'Duels', short: press ? 'slimmer drukzetten' : 'de duels', score: gap(res.tackleWin) * (press ? 0.6 : 1) * (role === 'controle' ? 1.2 : 1), says,
      means: [press ? 'Veel van je duels zijn drukzetten voorin; een verloren duel daar kost weinig, en jagen dwingt de tegenstander tot snelle keuzes. Wel loont het om slimmer te jagen.' : role === 'controle' ? `Voor een ${archName(mainBuild)} is het winnen van duels kernwerk; verloren duels op eigen helft geven direct ruimte.` : 'Verloren duels op eigen helft geven de tegenstander direct ruimte.'],
      play: [press ? 'Jaag in de passlijn in plaats van direct op de man; wacht tot de aanname slecht is en stap dan pas in.' : 'Stap niet in bij een tegenstander die de bal onder controle heeft; jockey en wacht op een slechte aanname.'],
      train: ['Oefen jockeyen en de staande tackle op het juiste moment.'], attrs: ['defAwareness', 'standTackle', 'strength', 'reactions'], ps: press ? ['Anticipate', 'Relentless'] : ['Anticipate', 'Jockey'] });
  } else if (!attacker && res.interceptions && gap(res.interceptions) >= 0.15) {
    C.push({ key: 'defend', title: 'Weinig onderscheppingen', short: 'meer ballen onderscheppen', score: gap(res.interceptions) * 0.8,
      says: [`Je onderschept ${vs('interceptions')}.`], means: ['Voor jouw rol hoort het onderscheppen van ballen bij het werk; daar ligt nog ruimte.'],
      play: ['Sta in de passlijn in plaats van op de man, en lees waar de volgende pass heen gaat.'], train: ['Oefen het afsnijden van passlijnen met de rechterstick (handmatig verplaatsen) in plaats van alleen druk zetten.'],
      attrs: ['interceptions', 'defAwareness', 'reactions'], ps: ['Intercept', 'Anticipate'] });
  }

  // 5. Positiespel en keuzes: geen build, wel winst
  const behaviour = [];
  if (gap(res.outPos) >= 0.15) {
    const roam = forwardish && rel(res.dribbles) >= 0.2;
    behaviour.push({ score: gap(res.outPos), title: 'Vaak uit positie', says: [`Je staat ${pct0(res.outPos.v)} van de momenten uit positie (positiegemiddelde ${pct0(res.outPos.b)}).`],
      means: [roam ? 'Je zoekt de bal op buiten je zone; dat past bij een vrije rol en levert acties op, maar na balverlies staat je plek leeg.' : 'Je zone blijft vaak leeg, ook als het team de bal kwijt is.'],
      play: ['Loop na balverlies eerst terug naar je zone; de AI vult je plek niet goed.', 'Spreek af wie mag doorschuiven, zodat er altijd iemand blijft staan.'] });
  }
  if (gap(res.noOption) >= 0.15) behaviour.push({ score: gap(res.noOption), title: 'Vaak geen aanspeelpunt', says: [`Het spel meldt ${res.noOption.v.toFixed(1)} keer per 90 minuten dat er geen goede passoptie was (positiegemiddelde ${res.noOption.b.toFixed(1)}).`],
    means: ['Dat ligt maar deels bij jou: medespelers bieden zich te weinig aan als jij de bal hebt. Dit is ook een teampunt.'],
    play: ['Speel sneller, voordat de opties verdwijnen.', 'Spreek als team af dat er altijd één korte optie dichtbij is.'] });
  if (gap(res.wrongChoice) >= 0.15) behaviour.push({ score: gap(res.wrongChoice), title: 'De betere pass gemist', says: [`Het spel zag ${res.wrongChoice.v.toFixed(1)} keer per 90 minuten een betere passoptie dan je koos (positiegemiddelde ${res.wrongChoice.b.toFixed(1)}).`],
    means: ['Dit gaat over keuzes, niet over je passing: de vrije man was er wel.'], play: ['Kijk om je heen voordat de bal komt, dan zie je de vrije man eerder.'] });

  // Sterke punten, gesorteerd op hoe ver iemand boven de positie uitsteekt
  const S = [];
  const up = (k, t, txt) => { const r2 = res[k]; if (!r2) return; const g = -r2.worse; if (g >= 0.15) S.push({ g, t, e: txt || `${vs(k)}.` }); };
  up('beaten', 'Tegenstanders uitspelen'); up('dribbles', 'Dribbelen'); up('assists90', 'Assists'); up('through90', 'Steekpasses'); up('conv', 'Afwerken');
  up('passAcc', 'Passing'); up('tackleWin', 'Duels winnen'); up('interceptions', 'Onderscheppen');
  if (res.ballLoss) up('ballLoss', 'Balvast', `Je verliest de bal bij ${vs('ballLoss')}.`);
  if (res.outPos) up('outPos', 'Positiespel', `Je staat ${pct0(res.outPos.v)} van de momenten uit positie (positiegemiddelde ${pct0(res.outPos.b)}).`);

  // Weging per archetype (ARCHETYPE_PROFILE.weight) en kernattributen van de rol vooraan in het build-advies.
  for (const c of C) {
    c.score *= prof.weight[c.key] ?? 1;
    c.attrs = [...new Set([...c.attrs.filter(a => prof.core.includes(a)), ...c.attrs.filter(a => !prof.core.includes(a))])];
  }
  const ranked = C.filter(c => c.score > 0.02).sort((a, b) => b.score - a.score).slice(0, 3).map(c => ({ ...c, size: SIZE(c.score) }));
  return { themes: ranked, behaviour: behaviour.sort((a, b) => b.score - a.score), strengths: S.sort((a, b) => b.g - a.g).map(x => [x.t, x.e]), role, mainBuild, prof };
}

function renderArchPicker(name) {
  const used = {}; for (const r of ROWS().filter(r => r.ours && r.p.name === name && r.p.archetypeId)) used[r.p.archetypeId] = (used[r.p.archetypeId] || 0) + 1;
  const last = lastArchetype(name);
  const opt = id => `<option value="${id}" ${Number(id) === currentArch ? 'selected' : ''}>${archName(id)}${Number(id) === last ? ' · laatst gespeeld' : ''}${used[id] ? ` · ${used[id]} wedstrijden` : ''}</option>`;
  const usedIds = Object.keys(used).map(Number).sort((a, b) => used[b] - used[a]);
  const otherIds = Object.keys(ARCHETYPE_INFO).map(Number).filter(id => !used[id]);
  $('#arch-picker').innerHTML = `<label class="field arch-field"><span>Advies voor build</span><select id="arch-select">
    <optgroup label="Gespeeld">${usedIds.map(opt).join('')}</optgroup><optgroup label="Andere builds">${otherIds.map(opt).join('')}</optgroup></select></label>`;
  $('#arch-select').addEventListener('change', e => { archChoice[name] = Number(e.target.value); renderAdvice(); });
}

function renderArchInfo(arch, scope) {
  const a = ARCHETYPE_INFO[arch], prof = ARCHETYPE_PROFILE[arch]; if (!a) { $('#arch-info').innerHTML = ''; return; }
  const names = ks => joinAnd(ks.map(attrName));
  const cheapest = a.tiers[0];
  const lines = [
    `<b>${a.name}</b> · ${a.line}. Taak: ${prof.task}.`,
    `Signature PlayStyle: ${a.signature}. Masteries: +1 ${names(a.mastery[0])} op level 10, nog +1 ${attrName(a.mastery[1])} op level 30 (voor al je builds).`,
    `Kernattributen voor deze rol: ${prof.core.map(k => { const c = costNote(k); return c ? `${attrName(k)} <small>(${c})</small>` : attrName(k); }).join(', ')}.`,
    `Goedkoopst voor deze build volgens de tabel van vóór 22 okt: ${names(cheapest)}.${a.patch.up.length ? ` Sinds 22 okt duurder: ${names(a.patch.up)}.` : ''}${a.patch.down.length ? ` Goedkoper: ${names(a.patch.down)}.` : ''}`,
    `AP-budget op level ${LEVELS.cap}: ${LEVELS.apAt[LEVELS.cap]}. PlayStyle-slots op level ${joinAnd(LEVELS.playstyleSlots.map(String))}.`,
    `<span class="muted">Vergeleken met ${scope.byArch ? `alle ${a.name}s die we tegenkwamen (${scope.archPool} speler-wedstrijden)` : `spelers op dezelfde positie, omdat er nog te weinig ${a.name}s in de data zitten (${scope.archPool})`}. ${scope.usedArchRows ? `Gebaseerd op ${scope.ownArch} eigen wedstrijden als ${a.name}.` : scope.ownArch ? `Je speelde maar ${scope.ownArch} keer als ${a.name}; het advies gebruikt al je wedstrijden.` : `Je speelde nog niet als ${a.name}; het advies gebruikt al je wedstrijden.`} Bronnen: docs/archetypes.md.</span>`,
  ];
  $('#arch-info').innerHTML = lines.map(l => `<p>${l}</p>`).join('');
}

function renderAdvice() {
  const name = selected;
  currentArch = archChoice[name] || lastArchetype(name);
  const saved = BUILDS[name];
  // Ingevulde build alleen gebruiken als die bij het gekozen archetype hoort (of geen archetype heeft).
  const build = saved && (!saved.archetype || Number(saved.archetype) === currentArch) ? saved : null;
  const { rows, res, scope } = analyse(name, currentArch);
  renderArchPicker(name); renderArchInfo(currentArch, scope);
  const conf = rows.length >= 15 ? 'sterk' : rows.length >= 8 ? 'redelijk' : 'zwak';
  const { themes: T, behaviour, strengths, role, mainBuild, prof } = themes(name, res, build, rows, currentArch);
  const block = (label, items) => items && items.length ? `<div class="adv-block"><span class="adv-label">${label}</span>${items.map(x => `<p>${x}</p>`).join('')}</div>` : '';
  const buildLine = t => { const a = attrAdvice(build, t.attrs), p = psAdvice(build, t.ps); return a || p ? [`${a} ${p}`.trim()] : []; };
  $('#b-problems').innerHTML = T.length ? T.map(t => `<li class="adv-item"><div class="claim">${t.title}<span class="tag size">${t.size}</span>${tagHtml(conf)}</div>
    ${block('Wat de data zegt', [t.says.join(' ')])}${block('Wat het betekent', [t.means.join(' ')])}
    ${block('In het spel', t.play)}${block('Oefenen', t.train)}${block('Build', buildLine(t))}</li>`).join('')
    : '<li class="empty">Op alle punten minstens gemiddeld voor de positie. Kijk bij sterke punten waar je op kunt bouwen.</li>';
  $('#b-behaviour').innerHTML = behaviour.length ? behaviour.map(t => `<li class="adv-item"><div class="claim">${t.title}${tagHtml(conf)}</div>${block('Wat de data zegt', [t.says.join(' ')])}${block('Wat het betekent', [t.means.join(' ')])}${block('In het spel', t.play)}</li>`).join('')
    : '<li class="empty">Geen opvallende punten in positiespel of keuzes.</li>';
  $('#b-strengths').innerHTML = strengths.length ? strengths.map(([t, e]) => `<li><div class="claim">${t}</div><div class="evidence">${e}</div></li>`).join('') : '<li class="empty">Nog niets dat duidelijk boven spelers op dezelfde positie uitsteekt.</li>';

  // Samenvatting, voor iedereen dezelfde opbouw: build en stijl, grootste winst, sterkste punt, positiespel.
  const parts = [];
  const ctx = ballContext(res, prof);
  const riskStyle = ctx.risk ? 'speelt met veel risico aan de bal' : ctx.key === 'rustpunt' || ctx.key === 'opZeker' ? 'speelt veilig en houdt de bal goed in de ploeg' : rel(res.fwdShare) >= 0.1 ? 'zoekt vaak de pass vooruit' : 'speelt een gebalanceerde rol';
  const isLast = mainBuild === lastArchetype(name);
  parts.push(isLast ? `<b>${esc(name)}</b> speelt nu als ${archName(mainBuild)}, met als taak ${prof.task}.` : `Dit advies bekijkt <b>${esc(name)}</b> als ${archName(mainBuild)}, niet de laatst gespeelde build; de taak is dan ${prof.task}.`);
  parts.push(`${esc(name)} ${riskStyle}.`);
  if (T.length) parts.push(`De grootste winst zit in ${joinAnd(T.slice(0, 2).map(t => t.short))}${T[0].means[0].includes('betaalt zich') || T[0].means[0].includes('afweging') ? ', al is een deel daarvan de prijs van een bewuste speelstijl' : ''}.`);
  if (strengths.length) parts.push(`Om op te bouwen: ${joinAnd(strengths.slice(0, 2).map(x => x[0].toLowerCase()))}.`);
  if (behaviour.length) parts.push(`Zonder extra punten valt er winst te halen in het positiespel: ${behaviour[0].title.toLowerCase()}.`);
  if (saved && !build) parts.push(`<span class="muted">De ingevulde build is een ${archName(saved.archetype)}; voor deze build telt die niet mee.</span>`);
  else if (!build || Object.keys(build).length <= 1) parts.push('<span class="muted">Vul de eigen build in, dan zegt het advies ook welke attributen al hoog genoeg zijn.</span>');
  $('#b-title').textContent = `Advies voor ${name}`;
  $('#b-summary').innerHTML = parts.join(' ');
}

function renderForm() {
  const b = BUILDS[selected] || {};
  const num = (k, label, min = 1, max = 99) => `<label class="field"><span>${label}</span><input type="number" inputmode="numeric" name="${k}" min="${min}" max="${max}" value="${b[k] ?? ''}"></label>`;
  const ps = b.playstyles || {};
  $('#build-form').innerHTML = `
    <div class="form-grid">
      <label class="field wide"><span>Build (archetype)</span><select name="archetype"><option value="">Kies…</option>${Object.entries(ARCHETYPES).map(([id, a]) => `<option value="${id}" ${Number(b.archetype || currentArch) === Number(id) ? 'selected' : ''}>${a.name} · ${a.line}</option>`).join('')}</select></label>
      ${num('height', 'Lengte (cm)', 150, 210)}
      <label class="field"><span>Voorkeursvoet</span><select name="foot"><option value="">–</option><option value="rechts" ${b.foot === 'rechts' ? 'selected' : ''}>Rechts</option><option value="links" ${b.foot === 'links' ? 'selected' : ''}>Links</option></select></label>
      ${num('weakFoot', 'Zwakke voet (1–5)', 1, 5)}${num('skillMoves', 'Skillmoves (1–5)', 1, 5)}
    </div>
    <h3>Face stats</h3>
    <div class="form-grid six">${FACE.map(([k, l]) => num(k, l)).join('')}</div>
    <details class="form-details" ${Object.keys(ATTRS).some(k => b[k]) ? 'open' : ''}><summary>Attributes in detail</summary>
      ${FACE.map(([f, fl]) => `<div class="attr-group"><span class="attr-group-label">${fl}</span><div class="form-grid">${Object.entries(ATTRS).filter(([, [, face]]) => face === f).map(([k, [l]]) => num(k, l)).join('')}</div></div>`).join('')}
    </details>
    <h3>PlayStyles</h3>
    <p class="hint">Klik één keer voor de PlayStyle, nog een keer voor PlayStyle+, en nog een keer om weg te halen.</p>
    <div class="ps-grid">${PLAYSTYLES.map(p => `<button type="button" class="ps-chip ${ps[p] || ''}" data-ps="${p}" aria-pressed="${!!ps[p]}">${p}${ps[p] === 'plus' ? '+' : ''}</button>`).join('')}</div>
    <label class="field wide"><span>Notitie</span><textarea name="note" rows="2" maxlength="1000">${esc(b.note || '')}</textarea></label>
    <div class="form-actions"><button type="submit" class="btn">Opslaan</button><span class="form-status" id="form-status" role="status">${b.updatedAt ? `Laatst opgeslagen ${fmtDateTime(b.updatedAt)}` : ''}</span></div>`;
  for (const chip of $('#build-form').querySelectorAll('.ps-chip')) chip.addEventListener('click', () => {
    const next = chip.classList.contains('plus') ? '' : chip.classList.contains('aan') ? 'plus' : 'aan';
    chip.classList.remove('aan', 'plus'); if (next) chip.classList.add(next);
    chip.setAttribute('aria-pressed', String(!!next)); chip.textContent = chip.dataset.ps + (next === 'plus' ? '+' : '');
  });
}

async function save(e) {
  e.preventDefault();
  const f = new FormData($('#build-form')), body = {};
  for (const [k, v] of f.entries()) body[k] = v;
  body.playstyles = {};
  for (const chip of $('#build-form').querySelectorAll('.ps-chip')) { if (chip.classList.contains('plus')) body.playstyles[chip.dataset.ps] = 'plus'; else if (chip.classList.contains('aan')) body.playstyles[chip.dataset.ps] = 'aan'; }
  $('#form-status').textContent = 'Opslaan…';
  try {
    const res = await fetch(`/api/builds/${encodeURIComponent(selected)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    BUILDS[selected] = await res.json();
    $('#form-status').textContent = `Opgeslagen om ${new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
    renderAdvice();
  } catch (err) { $('#form-status').textContent = `Niet opgeslagen: ${err.message}`; }
}

function show(name) { selected = name; renderAdvice(); renderForm(); }
// Aan de bal in context voor de kaart op Algemeen: zelfde archetype en vergelijkingsgroep als het advies (laatst gespeeld).
function context(name, matchIds) {
  const arch = lastArchetype(name); currentArch = arch;
  const { res, scope, rows } = analyse(name, arch, matchIds);
  const prof = ARCHETYPE_PROFILE[arch] || ARCHETYPE_PROFILE[8];
  return { res, scope, rows, arch, ctx: ballContext(res, prof) };
}

$('#build-form').addEventListener('submit', save);
window.BuildTab = {
  load: () => fetch('/api/builds').then(r => r.json()).then(x => { BUILDS = x || {}; }),
  show, context,
  has: name => !!BUILDS[name],
  get: name => BUILDS[name],
};
})();
