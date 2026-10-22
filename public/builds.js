// Tabblad 'Build en advies' op de spelerspagina: advies op basis van de wedstrijddata, aangescherpt met de eigen build.
// Zelfstandig (IIFE) zodat namen niet botsen met spelers.js; spelers.js roept BuildTab.load() en BuildTab.show(naam) aan.
(() => {

// ---------- attributen ----------
// Detailattributen met het kerncijfer waar ze onder vallen (als terugval als alleen de kerncijfers zijn ingevuld).
const ATTRS = {
  accel: ['Acceleratie', 'pac'], sprint: ['Sprintsnelheid', 'pac'],
  finishing: ['Afwerken', 'sho'], shotPower: ['Schotkracht', 'sho'], longShots: ['Afstandsschoten', 'sho'],
  shortPass: ['Korte pass', 'pas'], longPass: ['Lange pass', 'pas'], vision: ['Visie', 'pas'], crossing: ['Voorzetten', 'pas'], curve: ['Effect', 'pas'],
  ballControl: ['Balbeheersing', 'dri'], dribbling: ['Dribbelen', 'dri'], agility: ['Wendbaarheid', 'dri'], balance: ['Balans', 'dri'], reactions: ['Reactievermogen', 'dri'], composure: ['Kalmte', 'dri'],
  defAwareness: ['Verdedigend inzicht', 'def'], standTackle: ['Staande tackle', 'def'], slideTackle: ['Sliding', 'def'], interceptions: ['Onderscheppen', 'def'], heading: ['Koppen', 'def'],
  strength: ['Kracht', 'phy'], stamina: ['Uithoudingsvermogen', 'phy'], jumping: ['Springen', 'phy'],
};
const FACE = [['pac', 'Snelheid'], ['sho', 'Schieten'], ['pas', 'Passen'], ['dri', 'Dribbelen'], ['def', 'Verdedigen'], ['phy', 'Fysiek']];
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
function attrAdvice(build, keys) {
  const parts = keys.map(k => {
    const a = attrValue(build, k), label = ATTRS[k][0];
    if (!a) return { label, txt: label, level: null };
    const shown = `${label} ${a.exact ? a.v : `(kerncijfer ${a.v})`}`;
    return { label, txt: shown, level: a.v >= 82 ? 'hoog' : a.v >= 70 ? 'midden' : 'laag', exact: a.exact };
  });
  const low = parts.filter(p => p.level === 'laag'), mid = parts.filter(p => p.level === 'midden'), high = parts.filter(p => p.level === 'hoog'), unknown = parts.filter(p => p.level === null);
  const out = [];
  if (low.length) out.push(`<b>Verhoog eerst:</b> ${low.map(p => p.txt).join(', ')}.`);
  if (mid.length) out.push(`${low.length ? 'Daarna' : '<b>Verhoog:</b>'} ${mid.map(p => p.txt).join(', ')}.`);
  if (unknown.length) out.push(`${low.length || mid.length ? 'Ook relevant:' : '<b>Attributen:</b>'} ${unknown.map(p => p.label).join(', ')}.`);
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
let BUILDS = {}, selected = null;
const ROWS = () => allRows();

function analyse(name) {
  const pool = ROWS(), rows = pool.filter(r => r.ours && r.p.name === name);
  const res = {};
  for (const [k, mt] of Object.entries(METRICS)) {
    const v = mt.calc(rows), b = benchmark(mt, rows, pool);
    if (v === null || v === undefined || b === null || !b) continue;
    const worse = mt.lower ? (v - b) / b : (b - v) / b;
    res[k] = { v, b, worse, fmt: mt.fmt };
  }
  return { rows, res };
}

// ---------- genuanceerd advies ----------
// Elk thema weegt meerdere signalen tegen elkaar af: hoeveel risico iemand neemt, wat dat oplevert, en waar het gebeurt.
// Uitkomst per thema: wat de data zegt, wat het betekent, en acties voor het spel, oefenen en de build.
const pct0 = v => `${Math.round(v * 100)}%`;
const rel = x => x ? (x.v - x.b) / Math.abs(x.b) : 0; // positief = hoger dan spelers op dezelfde positie

function themes(name, res, build, rows) {
  const T = [], forwardish = rows.filter(r => r.p.pos === 'forward').length > rows.length / 2;
  const plain = (k, v) => (res[k].fmt(v).match(/^[\d.,]+%?/) || [res[k].fmt(v)])[0];
  const vs = k => `${res[k].fmt(res[k].v)} (positiegemiddelde ${plain(k, res[k].b)})`;

  // 1. Balbezit en dribbelen
  const ourLoss = DATA.players.map(n => ({ n, v: METRICS.lost90.calc(ROWS().filter(r => r.ours && r.p.name === n)) })).filter(x => x.v !== null).sort((a, b) => b.v - a.v);
  const teamLoss = avg(ourLoss.map(x => x.v)), teamHigh = res.lost90 && teamLoss && res.lost90.v >= teamLoss * 1.2;
  const defLossReal = res.lossDef && res.lossDef.worse >= 0.3 && res.lossDef.v - res.lossDef.b >= 0.3;
  if ((res.ballLoss && res.ballLoss.worse >= 0.2) || (res.lost90 && res.lost90.worse >= 0.2) || defLossReal || teamHigh) {
    const risk = (res.dribbles && rel(res.dribbles) >= 0.2) || (res.beaten && rel(res.beaten) >= 0.2) || (res.dribbleRate && rel(res.dribbleRate) >= 0.2);
    const pays = res.beatenPerLoss && res.beatenPerLoss.v >= res.beatenPerLoss.b * 0.9;
    // Welke signalen spelen: vaker per balactie, meer in totaal, veel binnen het team, of vooral op eigen helft.
    const teamRank = ourLoss.findIndex(x => x.n === name) + 1;
    const says = [];
    if (res.ballLoss && res.ballLoss.worse >= 0.2) says.push(`Je verliest de bal bij ${vs('ballLoss')}.`);
    else if (res.lost90 && res.lost90.worse >= 0.2) says.push(`Per balactie verlies je de bal niet vaker dan gemiddeld (${plain('ballLoss', res.ballLoss.v)} tegen ${plain('ballLoss', res.ballLoss.b)}), maar omdat je zo vaak aan de bal bent, verlies je er in totaal meer: ${vs('lost90')}.`);
    else if (teamHigh) says.push(`Binnen Frambroos verlies je ${teamRank === 1 ? 'de meeste' : 'veel'} ballen: ${res.lost90.fmt(res.lost90.v)}, tegen ${teamLoss.toFixed(1)} gemiddeld in het team. Voor spelers op jouw positie is dat normaal (positiegemiddelde ${plain('lost90', res.lost90.b)}).`);
    else says.push(`Je verliest de bal niet vaker dan spelers op dezelfde positie, maar wel vaker op eigen helft: ${vs('lossDef')}.`);
    if (risk && res.dribbles && res.beaten) says.push(`Tegelijk ga je vaker de dribbel aan, ${vs('dribbles')}, en speel je meer tegenstanders uit, ${vs('beaten')}.`);
    if (res.lossAtt && res.lossDefShare) says.push(`Van je balverlies valt ${pct0(res.lossAtt.v)} op de helft van de tegenstander en ${pct0(res.lossDefShare.v)} op eigen helft (positiegemiddelde ${pct0(res.lossDefShare.b)}).`);
    const means = [];
    if (risk && pays) means.push(`Je neemt bewust meer risico, en dat betaalt zich grotendeels terug: per verloren bal speel je minstens zoveel tegenstanders uit als gemiddeld.${teamHigh && !(res.lost90?.worse >= 0.2) ? ' Dat je binnen het team de bal vaak kwijt bent, komt vooral doordat je het vaakst iets probeert; de rest speelt behoudender.' : ' Het balverlies is deels de prijs van je spel.'}`);
    else if (risk) means.push('Je neemt meer risico dan het oplevert: per verloren bal speel je minder tegenstanders uit dan gemiddeld. De dribbel komt vaak op het verkeerde moment.');
    else means.push('Er staan niet veel dribbels tegenover het balverlies; het gaat eerder mis bij het aannemen of onder druk.');
    if (res.lossAtt && res.lossAtt.v >= 0.5) means.push('Het meeste balverlies valt voorin, waar het het minst kost.');
    if (defLossReal) means.push('Op eigen helft gaat het vaker mis dan gemiddeld; daar levert balverlies direct een kans tegen op.');
    T.push({ key: 'ball', short: risk ? 'kiezen wanneer je de dribbel aangaat' : 'balvastheid onder druk', sev: Math.max(res.ballLoss?.worse || 0, res.lost90?.worse || 0, defLossReal ? res.lossDef.worse : 0, teamHigh ? 0.15 : 0) * (risk && pays ? 0.6 : 1), title: risk ? 'Veel risico aan de bal' : 'Vaak de bal kwijt', says, means,
      play: risk ? ['Speel sneller af nadat je je man voorbij bent; ga de tweede dribbel alleen aan als er ruimte voor je ligt.', 'Scherm de bal af met je lichaam als er druk in je rug staat, in plaats van weg te draaien.', ...(defLossReal ? ['Op eigen helft: één of twee keer raken, geen dribbels.'] : [])]
        : ['Kijk over je schouder voordat de bal komt, zodat je weet waar de druk vandaan komt.', 'Open je lichaam bij het aannemen en speel in de looprichting door.'],
      train: risk ? ['Oefen dribbeltechnieken en skillmoves in de vaardigheidsspellen of de Arena: wegdraaien, afschermen en versnellen na de actie.'] : ['Oefen de eerste aanname onder druk in de vaardigheidsspellen.'],
      attrs: ['ballControl', 'balance', 'strength', ...(risk ? ['dribbling', 'agility'] : ['composure'])], ps: risk ? ['Technical', 'Press Proven', 'Quick Step'] : ['First Touch', 'Press Proven'] });
  }

  // 2. Afronden
  if ((res.conv && res.conv.worse >= 0.2) || (res.onTarget && res.onTarget.worse >= 0.2)) {
    const far = res.insideShare && res.insideShare.v < res.insideShare.b * 0.85, saved = res.savedShare && res.savedShare.worse >= 0.15, wide = res.onTarget && res.onTarget.worse >= 0.15;
    const says = [res.conv ? `Je scoort uit ${vs('conv')}.` : `Van je schoten gaat ${vs('onTarget')}.`];
    if (res.insideShare) says.push(`${pct0(res.insideShare.v)} van je schoten komt van binnen de zestien (positiegemiddelde ${pct0(res.insideShare.b)}).`);
    if (res.onTarget) says.push(`${pct0(res.onTarget.v)} gaat op doel (positiegemiddelde ${pct0(res.onTarget.b)})${res.savedShare ? `, en daarvan redt de keeper ${pct0(res.savedShare.v)} (positiegemiddelde ${pct0(res.savedShare.b)})` : ''}.`);
    const means = [];
    if (far) means.push('Een groot deel van je schoten komt van afstand, en die hebben voor iedereen een laag rendement. De lage conversie zegt dus vooral iets over de kansen die je kiest, niet per se over je afronding.');
    if (wide && !far) means.push('Veel schoten gaan naast, ook van dichtbij: dat is afronden onder druk of uit balans.');
    if (saved && !far) means.push(wide ? 'En wat wél op doel komt, redt de keeper relatief vaak: vaak te centraal of te hard op de man.' : 'Je raakt het doel genoeg, maar de keeper redt relatief veel: de afronding is te makkelijk voor de keeper, vaak te centraal of te hard op de man.');
    if (!means.length) means.push('De kansen zijn niet slechter dan gemiddeld, maar ze gaan minder vaak in. Dat kan ook pech zijn; met meer wedstrijden wordt duidelijk of het blijft.');
    T.push({ key: 'shoot', short: far ? 'de kansen die je kiest' : 'de afronding', sev: Math.max(res.conv?.worse || 0, res.onTarget?.worse || 0) * (far ? 0.8 : 1), title: far ? 'Moeilijke kansen' : 'Afronding', says, means,
      play: [...(far ? ['Probeer niet elke kans zelf te maken: leg vaker breed of dring door tot in de zestien.'] : []), ...(saved ? ['Mik op de hoeken; kies de geplaatste of de lage afronding.'] : []), ...(wide && !far ? ['Neem een extra aanname als er tijd is, en schiet niet uit balans.'] : [])],
      train: far ? ['Oefen moeilijkere schoten van de rand van de zestien in de vaardigheidsspellen, zodat ze wél een optie worden.', 'Oefen ook de laatste pass vanuit die positie.'] : ['Oefen afronden onder een hoek en een-op-een met de keeper.'],
      attrs: far ? ['longShots', 'shotPower', 'finishing'] : ['finishing', 'composure', ...(saved ? ['curve'] : [])], ps: far ? ['Power Shot', 'Finesse Shot'] : saved ? ['Finesse Shot', 'Low Driven Shot'] : ['Finesse Shot'] });
  }

  // 3. Passen
  const passIssues = ['shortFail', 'longFail', 'fwdFail', 'crossFail'].filter(k => res[k] && res[k].worse >= 0.2).sort((a, b) => res[b].worse - res[a].worse);
  if (passIssues.length) {
    const ambitious = (res.fwdShare && rel(res.fwdShare) >= 0.1) || (res.through90 && rel(res.through90) >= 0.2);
    const payoff = (res.assists90 && res.assists90.v >= res.assists90.b) || (res.through90 && rel(res.through90) >= 0.2);
    const label = { shortFail: 'korte passes', longFail: 'middellange en lange passes', fwdFail: 'passes vooruit', crossFail: 'voorzetten' };
    const says = passIssues.slice(0, 2).map(k => `Van je ${label[k]} komt ${vs(k).replace(' (', ' niet aan (')}.`);
    if (res.fwdShare) says.push(`${pct0(res.fwdShare.v)} van je passes gaat vooruit (positiegemiddelde ${pct0(res.fwdShare.b)}).`);
    if (res.assists90) says.push(`Assists: ${vs('assists90')}.`);
    const means = [];
    if (ambitious && payoff) means.push('Je zoekt vaker dan gemiddeld de pass vooruit, en dat levert kansen op. Meer mislukte passes horen daarbij; dit is een afweging, geen fout.');
    else if (ambitious) means.push('Je speelt veel vooruit, maar dat levert nog weinig kansen op. De pass komt vaak te vroeg of op een geblokte lijn.');
    else if (passIssues.includes('shortFail')) means.push('Ook eenvoudige korte passes komen minder aan; dat wijst op techniek of druk bij de aanname, niet op risico.');
    else means.push(`Vooral de ${label[passIssues[0]]} gaan mis.`);
    if (!ambitious && payoff && res.assists90 && res.assists90.v >= res.assists90.b * 1.5) means.push(`Tegelijk geef je ${res.assists90.v >= res.assists90.b * 2 ? 'ruim twee keer' : 'duidelijk'} zoveel assists als gemiddeld: je passing levert kansen op, alleen de mislukte ballen kosten veel balbezit. Het doel is dus niet minder vooruit spelen, maar de verkeerde ballen eruit halen.`);
    const attrs = [...new Set(passIssues.flatMap(k => ({ shortFail: ['shortPass'], longFail: ['longPass', 'curve'], fwdFail: ['vision', 'shortPass'], crossFail: ['crossing', 'curve'] })[k]))];
    const ps = [...new Set(passIssues.flatMap(k => ({ shortFail: ['Tiki Taka'], longFail: ['Long Ball Pass', 'Pinged Pass'], fwdFail: ['Incisive Pass'], crossFail: ['Whipped Pass'] })[k]))];
    T.push({ key: 'pass', short: passIssues[0] === 'longFail' ? 'de langere passes' : passIssues[0] === 'crossFail' ? 'de voorzetten' : 'de passkeuze', sev: res[passIssues[0]].worse * (payoff ? 0.6 : 1), title: ambitious ? 'Risicovol passen' : 'Passes die niet aankomen', says, means,
      play: [ambitious ? 'Wacht net iets langer op de loopactie; de steekpass werkt het best als de loper al versnelt.' : 'Speel de bal in de looprichting van je medespeler, niet op zijn voeten als hij al loopt.', ...(passIssues.includes('fwdFail') ? ['Speel eerst breed als de lijn vooruit dicht is; dan gaat de lijn daarna vaak wel open.'] : [])],
      train: ['Oefen het timen van de steekpass en de lage, harde pass (Pinged) in de vaardigheidsspellen.'], attrs, ps });
  }

  // 4. Verdedigen
  if (res.tackleWin && res.tackleWin.worse >= 0.2) {
    const press = (res.wonAtt && res.wonAtt.v >= 0.35) || (forwardish && (!res.wonAtt || res.wonAtt.v >= 0.2));
    const says = [`Van je duels win je ${vs('tackleWin')}.`];
    if (res.wonAtt) says.push(`${pct0(res.wonAtt.v)} van je balwinst is op de helft van de tegenstander.`);
    if (res.fouls && res.fouls.worse >= 0.2) says.push(`Overtredingen: ${vs('fouls')}.`);
    const means = [press ? 'Veel van je duels zijn drukzetten voorin; een verloren duel daar kost weinig, en jagen dwingt de tegenstander tot snelle keuzes. Wel loont het om slimmer te jagen.' : 'Verloren duels op eigen helft geven de tegenstander direct ruimte.'];
    T.push({ key: 'defend', short: press ? 'slimmer drukzetten' : 'de duels', sev: res.tackleWin.worse * (press ? 0.6 : 1), title: press ? 'Drukzetten' : 'Duels verliezen', says, means,
      play: [press ? 'Jaag in de passlijn in plaats van direct op de man; wacht tot de aanname slecht is en stap dan pas in.' : 'Stap niet in bij een tegenstander die de bal onder controle heeft; jockey en wacht op een slechte aanname.'],
      train: ['Oefen jockeyen en de staande tackle op het juiste moment.'], attrs: ['defAwareness', 'standTackle', 'strength', 'reactions'], ps: press ? ['Anticipate', 'Relentless'] : ['Anticipate', 'Jockey'] });
  }

  // 5. Positiespel en aanspeelpunten (geen build)
  const behaviour = [];
  if (res.outPos && res.outPos.worse >= 0.2) {
    const roam = forwardish && res.dribbles && rel(res.dribbles) >= 0.2;
    behaviour.push({ title: 'Vaak uit positie', says: [`Je staat ${pct0(res.outPos.v)} van de momenten uit positie (positiegemiddelde ${pct0(res.outPos.b)}).`],
      means: [roam ? 'Je zoekt de bal op buiten je zone; dat past bij een vrije rol en levert acties op, maar na balverlies staat je plek leeg.' : 'Je zone blijft vaak leeg, ook als het team de bal kwijt is.'],
      play: ['Loop na balverlies eerst terug naar je zone; de AI vult je plek niet goed.', 'Spreek met de andere middenvelders af wie mag doorschuiven.'] });
  }
  if (res.noOption && res.noOption.worse >= 0.2) behaviour.push({ title: 'Vaak geen aanspeelpunt', says: [`Het spel meldt ${res.noOption.v.toFixed(1)} keer per 90 minuten dat er geen goede passoptie was (positiegemiddelde ${res.noOption.b.toFixed(1)}).`],
    means: ['Dat ligt maar deels bij jou: medespelers bieden zich te weinig aan als jij de bal hebt. Dit is ook een teampunt.'],
    play: ['Speel sneller, voordat de opties verdwijnen.', 'Spreek als team af dat er altijd één korte optie dichtbij is.'] });
  if (res.wrongChoice && res.wrongChoice.worse >= 0.2) behaviour.push({ title: 'De betere pass gemist', says: [`Het spel zag ${res.wrongChoice.v.toFixed(1)} keer per 90 minuten een betere passoptie dan je koos (positiegemiddelde ${res.wrongChoice.b.toFixed(1)}).`],
    means: ['Dit gaat over keuzes, niet over je passing: de vrije man was er wel.'], play: ['Kijk om je heen voordat de bal komt, dan zie je de vrije man eerder.'] });

  // Sterke punten, met context
  const strengths = [];
  if (res.beaten && rel(res.beaten) >= 0.2) strengths.push(['Tegenstanders uitspelen', `${vs('beaten')}.`]);
  if (res.dribbles && rel(res.dribbles) >= 0.2) strengths.push(['Dribbelen', `${vs('dribbles')}.`]);
  if (res.assists90 && rel(res.assists90) >= 0.2) strengths.push(['Assists', `${vs('assists90')}.`]);
  if (res.through90 && rel(res.through90) >= 0.2) strengths.push(['Steekpasses', `${vs('through90')}.`]);
  if (res.conv && res.conv.worse <= -0.2) strengths.push(['Afwerken', `${vs('conv')}.`]);
  if (res.passAcc && res.passAcc.worse <= -0.1) strengths.push(['Passing', `${vs('passAcc')}.`]);
  if (res.tackleWin && res.tackleWin.worse <= -0.2) strengths.push(['Duels winnen', `${vs('tackleWin')}.`]);
  if (res.interceptions && res.interceptions.worse <= -0.2) strengths.push(['Onderscheppen', `${vs('interceptions')}.`]);
  if (res.ballLoss && res.ballLoss.worse <= -0.2) strengths.push(['Balvast', `Je verliest de bal bij ${vs('ballLoss')}.`]);
  if (res.outPos && res.outPos.worse <= -0.2) strengths.push(['Positiespel', `Je staat ${pct0(res.outPos.v)} van de momenten uit positie (positiegemiddelde ${pct0(res.outPos.b)}).`]);
  return { themes: T.sort((a, b) => b.sev - a.sev), behaviour, strengths };
}

function renderAdvice() {
  const name = selected, build = BUILDS[name], { rows, res } = analyse(name);
  const conf = rows.length >= 15 ? 'sterk' : rows.length >= 8 ? 'redelijk' : 'zwak';
  const { themes: T, behaviour, strengths } = themes(name, res, build, rows);
  const block = (label, items) => items && items.length ? `<div class="adv-block"><span class="adv-label">${label}</span>${items.map(x => `<p>${x}</p>`).join('')}</div>` : '';
  $('#b-problems').innerHTML = T.length ? T.map(t => `<li class="adv-item"><div class="claim">${t.title}${tagHtml(conf)}</div>
    ${block('Wat de data zegt', [t.says.join(' ')])}${block('Wat het betekent', [t.means.join(' ')])}
    ${block('In het spel', t.play)}${block('Oefenen', t.train)}${block('Build', [`${attrAdvice(build, t.attrs)} ${psAdvice(build, t.ps)}`])}</li>`).join('')
    : '<li class="empty">Niets dat duidelijk achterblijft bij spelers op dezelfde positie.</li>';
  $('#b-behaviour').innerHTML = behaviour.length ? behaviour.map(t => `<li class="adv-item"><div class="claim">${t.title}${tagHtml(conf)}</div>${block('Wat de data zegt', [t.says.join(' ')])}${block('Wat het betekent', [t.means.join(' ')])}${block('In het spel', t.play)}</li>`).join('')
    : '<li class="empty">Geen opvallende punten in positiespel of keuzes.</li>';
  $('#b-strengths').innerHTML = strengths.length ? strengths.map(([t, e]) => `<li><div class="claim">${t}</div><div class="evidence">${e}</div></li>`).join('') : '<li class="empty">Nog niets dat duidelijk boven spelers op dezelfde positie uitsteekt.</li>';

  // Samenvatting: het grote verhaal in een paar zinnen
  const builds = {}; for (const r of rows) if (r.p.archetypeId) builds[r.p.archetypeId] = (builds[r.p.archetypeId] || 0) + 1;
  const mainBuild = Object.entries(builds).sort((a, b) => b[1] - a[1])[0];
  const parts = [];
  const style = T.find(t => t.key === 'ball' && t.title.includes('risico')) ? 'speelt met veel risico aan de bal' : T.find(t => t.key === 'pass' && t.title.includes('Risicovol')) ? 'zoekt vaak de risicovolle pass vooruit' : strengths.length ? `is sterk in ${joinAnd(strengths.slice(0, 2).map(x => x[0].toLowerCase()))}` : 'speelt een dienende rol';
  parts.push(`<b>${esc(name)}</b> speelt meestal als ${mainBuild ? archName(mainBuild[0]) : 'onbekende build'} en ${style}.`);
  if (T.length) parts.push(`De grootste winst zit in ${joinAnd(T.slice(0, 2).map(t => t.short))}${T[0].means[0].includes('betaalt zich') || T[0].means[0].includes('afweging') ? ', al is een deel daarvan de prijs van een bewuste speelstijl' : ''}.`);
  if (behaviour.length) parts.push(`Zonder extra punten valt er winst te halen in het positiespel: ${behaviour[0].title.toLowerCase()}.`);
  if (!build || Object.keys(build).length <= 1) parts.push('<span class="muted">Vul de eigen build in, dan zegt het advies ook welke attributen al hoog genoeg zijn.</span>');
  $('#b-title').textContent = `Advies voor ${name}`;
  $('#b-summary').innerHTML = parts.join(' ');
}

function renderForm() {
  const b = BUILDS[selected] || {};
  const num = (k, label, min = 1, max = 99) => `<label class="field"><span>${label}</span><input type="number" inputmode="numeric" name="${k}" min="${min}" max="${max}" value="${b[k] ?? ''}"></label>`;
  const ps = b.playstyles || {};
  $('#build-form').innerHTML = `
    <div class="form-grid">
      <label class="field wide"><span>Build</span><select name="archetype"><option value="">Kies…</option>${Object.entries(ARCHETYPES).map(([id, a]) => `<option value="${id}" ${Number(b.archetype) === Number(id) ? 'selected' : ''}>${a.name} · ${a.line}</option>`).join('')}</select></label>
      ${num('height', 'Lengte (cm)', 150, 210)}
      <label class="field"><span>Voorkeursvoet</span><select name="foot"><option value="">–</option><option value="rechts" ${b.foot === 'rechts' ? 'selected' : ''}>Rechts</option><option value="links" ${b.foot === 'links' ? 'selected' : ''}>Links</option></select></label>
      ${num('weakFoot', 'Zwakke voet (1–5)', 1, 5)}${num('skillMoves', 'Skillmoves (1–5)', 1, 5)}
    </div>
    <h3>Kerncijfers</h3>
    <div class="form-grid six">${FACE.map(([k, l]) => num(k, l)).join('')}</div>
    <details class="form-details" ${Object.keys(ATTRS).some(k => b[k]) ? 'open' : ''}><summary>Attributen in detail</summary>
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

$('#build-form').addEventListener('submit', save);
window.BuildTab = {
  load: () => fetch('/api/builds').then(r => r.json()).then(x => { BUILDS = x || {}; }),
  show,
  has: name => !!BUILDS[name],
};
})();
