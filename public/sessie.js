// Pagina van één sessie (sessie.html?id=<datum>, een laag onder Sessies): uitslagen, de top drie als sessiekaarten, een
// verhaaltje met een quote van de beste speler, het radardiagram van de avond en de spelers.
// Een sessie is een reeks wedstrijden met minder dan 3 uur ertussen (SESSION_GAP in common.js).
// Samenvatting: docs/coach-logica.md §9 (Sessie).

const WEEKDAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const longDate = ts => { const d = new Date(ts * 1000); return `${WEEKDAY_LONG[d.getDay()]} ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const typeLabel = list => { const t = new Set(list.map(m => m.matchType)); return t.size > 1 ? 'league en playoff' : t.has('playoffMatch') ? 'playoff' : 'league'; };
const strengthLabel = d => d === null ? '' : d >= 250 ? 'veel sterker' : d >= 100 ? 'sterker' : d <= -100 ? 'zwakker' : 'gelijkwaardig';
const pSum = (rows, f) => rows.reduce((a, r) => a + (f(r.p) || 0), 0);

// Adres: sessie.html?id=2026-11-01 (datum van de avond); een oud adres met een volgnummer werkt ook nog.
const ID_PARAM = new URLSearchParams(location.search).get('id');
let sessions = [], selectedId = null;

// De anekdote van de avond (coach-logica §9): het ene moment of de ene speler die de avond kenmerkte, met het thema
// (q) voor de quote van de beste speler (personas.js). Kandidaten krijgen een kracht; de sterkste wint, bij gelijke kracht de laatste.
function anecdote(ms, sm, prow) {
  const c = [], nm = n => `<b>${esc(proName(n))}</b>`, res = ms.map(m => m.result), n = ms.length;
  const pot = i => ['de eerste pot', 'de tweede pot', 'de derde pot', 'de vierde pot', 'de vijfde pot'][i] || `pot ${i + 1}`;
  // Spelersmomenten
  for (const m of ms) for (const p of m.players) if (p.goals >= 3) c.push({ w: 10 + p.goals, text: `${nm(p.name)} schoot er tegen ${esc(m.opponent.name)} in ${numWord(p.goals)} keer in${m.result === 'W' ? '' : ', en toch werd het niets'}.`, q: 'schieten' });
  if (n >= 3) for (const r of prow) {
    const rows = ms.map(m => m.players.find(p => p.name === r.name)).filter(Boolean);
    if (rows.length === n && rows.every(p => p.goals > 0)) c.push({ w: 9, text: `${nm(r.name)} scoorde in elke pot van de avond, ${numWord(pSum(rows.map(p => ({ p })), p => p.goals))} goals in totaal.`, q: 'schieten' });
    if (rows.length === n && rows.every(p => p.mom)) c.push({ w: 9, text: `${nm(r.name)} was elke pot man of the match. De rest mocht meedoen.`, q: 'doorhebben' });
  }
  // Verloop
  if (n >= 4 && res[0] !== 'W' && res[1] !== 'W' && res.slice(2).every(r => r === 'W')) c.push({ w: 8, text: `Na twee potten zonder winst draaide het team de avond om en won het alles wat erna kwam.`, q: 'nadeel' });
  else if (n >= 4 && res[0] !== 'W' && res[1] !== 'W' && res.slice(2).some(r => r === 'W')) c.push({ w: 6, text: `De eerste twee potten leverden niets op; daarna kwam het team op gang.`, q: 'nadeel' });
  if (n >= 4 && res.slice(-2).every(r => r !== 'W') && res.slice(0, -2).every(r => r === 'W')) c.push({ w: 8, text: `Een vliegende start, maar de laatste twee potten gingen verloren. Eerder stoppen was een optie geweest.`, q: 'nietVerliezen' });
  else if (n >= 4 && res.slice(-2).every(r => r !== 'W') && res.slice(0, -2).some(r => r === 'W')) c.push({ w: 6, text: `Na een goed begin zakte het aan het eind in: de laatste twee potten leverden niets op.`, q: 'nietVerliezen' });
  if (n >= 3 && res.every(r => r === 'W')) c.push({ w: 7, text: `Alles gewonnen, ${numWord(n)} uit ${numWord(n)}. Zo'n avond komt niet vaak voorbij.`, q: 'simpel' });
  if (n >= 3 && res.every(r => r !== 'W')) c.push({ w: 7, text: `Geen enkele pot gewonnen. Soms is het gewoon niet de avond.`, q: 'fout' });
  if (n >= 3 && ms.every(m => m.goalsAgainst === 0)) c.push({ w: 7, text: `De hele avond de nul gehouden: ${numWord(n)} potten zonder tegengoal.`, q: 'bal' });
  // Losse momenten
  for (const [i, m] of ms.entries()) {
    if (m.winnerByDnf) c.push({ w: 6, text: `${esc(m.opponent.name)} gaf in ${pot(i)} op bij ${m.goals}–${m.goalsAgainst}. Ook een manier om te winnen.`, q: 'italianen' });
    const sUs = m.players.reduce((a, p) => a + (p.shots || 0), 0), sThem = m.opponentPlayers.reduce((a, p) => a + (p.shots || 0), 0);
    if (m.result === 'L' && sUs >= 8 && sUs >= 2 * sThem) c.push({ w: 5, text: `Tegen ${esc(m.opponent.name)} schoot het team ${numWord(sUs)} keer en zij ${numWord(sThem)} keer, en toch ging die pot verloren.`, q: 'toeval' });
    const d = m.goals - m.goalsAgainst;
    if (d >= 4) c.push({ w: 4 + d / 10, text: `${esc(m.opponent.name)} werd in ${pot(i)} met ${m.goals}–${m.goalsAgainst} van het veld gespeeld.`, q: 'simpel' });
    if (d <= -4) c.push({ w: 4 - d / 10, text: `Tegen ${esc(m.opponent.name)} liep het in ${pot(i)} helemaal uit de hand: ${m.goals}–${m.goalsAgainst}.`, q: 'nadeel' });
  }
  // Ver boven of onder het eigen normaal
  for (const r of prow) if (r.nT >= 3 && r.d !== null) {
    if (r.d >= 1) c.push({ w: 3 + r.d, text: `${nm(r.name)} speelde ver boven het eigen niveau${r.g + r.a ? `, met ${joinAnd([r.g ? `${numWord(r.g)} ${r.g === 1 ? 'goal' : 'goals'}` : '', r.a ? `${numWord(r.a)} ${r.a === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean))}` : ''}.`, q: 'doorhebben' });
    if (r.d <= -1) c.push({ w: 3 - r.d, text: `Voor ${nm(r.name)} was het een avond om snel te vergeten; dat gebeurt de besten.`, q: 'nadeel' });
  }
  // Niets bijzonders: wie het meest bij de goals betrokken was.
  const inv = [...prow].sort((a, b) => (b.g + b.a) - (a.g + a.a))[0];
  if (inv && inv.g + inv.a > 0) c.push({ w: 1, text: `${nm(inv.name)} was bij de meeste goals betrokken: ${joinAnd([inv.g ? `${numWord(inv.g)} ${inv.g === 1 ? 'goal' : 'goals'}` : '', inv.a ? `${numWord(inv.a)} ${inv.a === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean))}.`, q: 'simpel' });
  if (!c.length) return { text: '', q: 'simpel' };
  return c.reduce((best, x) => x.w >= best.w ? x : best);
}

function sessionSummary(ms, sm, opp, own, prow) {
  const parts = [];
  // 1. Karakter van de avond en tegenstand
  const type = typeLabel(ms) === 'playoff' ? 'playoffavond' : typeLabel(ms) === 'league' ? 'competitieavond' : 'avond';
  const lbl = opp !== null ? strengthLabel(opp) : null;
  const vs = lbl ? ` tegen ${{ gelijkwaardig: 'gelijkwaardige', zwakker: 'zwakkere', sterker: 'sterkere', 'veel sterker': 'veel sterkere' }[lbl]} tegenstanders` : '';
  const char = sm.L === 0 && sm.D === 0 ? 'Een perfecte' : sm.ppg >= 2 ? 'Een sterke' : sm.ppg >= 1.2 ? 'Een wisselende' : 'Een moeizame';
  let lead = sm.W + sm.D === 0 ? `Een ${type} om snel te vergeten${vs}` : `${char} ${type}${vs}`;
  const strongOpp = lbl === 'sterker' || lbl === 'veel sterker';
  if (sm.resid >= 0.75) lead += strongOpp ? ', en jullie deden het beter dan je mocht verwachten' : ', beter dan de tegenstand deed vermoeden';
  else if (sm.resid <= -0.75) lead += strongOpp ? ', en zelfs voor die tegenstand viel het tegen' : ', terwijl er meer in had gezeten';
  parts.push(lead + '.');
  // 2. De anekdote
  const a = anecdote(ms, sm, prow);
  if (a.text) parts.push(a.text);
  return { html: parts.join(' '), lead: parts[0], story: a.text || parts[0], theme: a.q };
}

function render() {
  // Onbekende of ontbrekende sessie: de laatste.
  if (!sessions.some(s => s.id === selectedId)) selectedId = sessions.at(-1)?.id ?? null;
  if (selectedId === null) { $('#s-title').textContent = 'Nog geen sessies'; return; }
  const s = sessions.find(x => x.id === selectedId), ms = s.matches, sm = summarize(ms);
  if (new URLSearchParams(location.search).get('id') !== s.key) history.replaceState(null, '', sessionHref(s)); // altijd het leesbare adres
  const others = DATA.matches.filter(m => m.session !== s.id);
  const own = DATA.snapshot?.skillRating;
  const names = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  // Naam van de sessie: voluit, op telefoon afgekort tot drie letters (Don 29 okt).
  const d0 = new Date(ms[0].ts * 1000), short = `${cap(WEEKDAY_LONG[d0.getDay()].slice(0, 3))} ${d0.getDate()} ${d0.toLocaleDateString('nl-NL', { month: 'long' }).slice(0, 3)}`;
  $('#s-title').innerHTML = `<span class="t-long">${cap(longDate(ms[0].ts))}</span><span class="t-short" aria-hidden="true">${short}</span>`;
  document.title = `${cap(longDate(ms[0].ts))} · Frambroos Coach`;
  if (!$('#s-visual .hh-stadium')) $('#s-visual').insertAdjacentHTML('afterbegin', stadiumSvg());
  // Vorige en volgende sessie (op telefoon): alleen een knop als die sessie bestaat.
  // Op telefoon naast de titel; een lege plek houdt de titel in het midden als er geen vorige of volgende is.
  const at = sessions.indexOf(s), nav = (to, cls, label) => navArrow(cls, to ? sessionHref(to) : null, to ? `${label}: ${cap(longDate(to.matches[0].ts))}` : '');
  $('#s-titlebar').querySelectorAll('.ss-nav').forEach(a => a.remove());
  $('#s-title').insertAdjacentHTML('beforebegin', nav(sessions[at - 1], 'prev', 'Vorige sessie'));
  $('#s-title').insertAdjacentHTML('afterend', nav(sessions[at + 1], 'next', 'Volgende sessie'));
  const meta = `${cap(typeLabel(ms))} · ${plural(ms.length, 'wedstrijd', 'wedstrijden')} · ${names.length} spelers`; // alleen voor het kopiëren

  const opp = avg(ms.map(m => gapOf(m, own)).filter(g => g !== null)); // gemiddeld sterkteverschil, met onze rating van toen
  // Sessiekop (coach-logica §9a): het podium als blikvanger, met de naam van de sessie en de uitslag in drie getallen
  // (W-G-V, goals, saldo). Hoe we speelden staat in de radar eronder.
  $('#s-record').innerHTML = `<span class="ss-fig"><b class="ss-rec"><span class="W">${sm.W}</span>-<span class="D">${sm.D}</span>-<span class="L">${sm.L}</span></b><small>W-G-V</small></span>
    <span class="ss-fig"><b>${sm.gf}</b><small>Goals</small></span><span class="ss-fig"><b>${sm.gf - sm.ga > 0 ? '+' : ''}${sm.gf - sm.ga}</b><small>Saldo</small></span>`;
  $('#s-matches').innerHTML = ms.map(m => matchCard(m, { own })).join('');

  // Spelers: rating deze avond tegenover het eigen normaal (alle andere wedstrijden), goals, assists, man of the match.
  const prow = names.map(name => {
    const here = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const there = others.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const rH = avg(here.map(r => r.p.rating).filter(v => v !== null)), rT = avg(there.map(r => r.p.rating).filter(v => v !== null));
    return { name, n: here.length, nT: there.length, rH, rT, d: rT === null || rH === null ? null : rH - rT, g: pSum(here, p => p.goals), a: pSum(here, p => p.assists), mom: pSum(here, p => p.mom) };
  }).map(r => ({ ...r, ...roleOf(ms, r.name) })).sort((x, y) => (y.rH ?? -1) - (x.rH ?? -1) || y.tb - x.tb);
  // Plek: op het exacte gemiddelde; alleen bij precies hetzelfde gemiddelde én dezelfde rolmaat een gedeelde plek.
  prow.forEach((r, i) => { const p = prow[i - 1]; r.place = p && p.rH === r.rH && p.tb === r.tb ? p.place : i + 1; });
  const sum = sessionSummary(ms, sm, opp, own, prow);
  // De quote: een cruijffiaanse uitspraak van de beste speler van de avond, in de eigen stem (personas.js).
  const quote = sessionQuote(s);
  $('#s-quote').innerHTML = quote ? `<p>„${esc(quote.text)}” <cite>— ${esc(quote.who)}</cite></p>` : '';
  SHARE = { ms, sm, quote, prow, meta };
  // Top drie naast elkaar: één in het midden en groter, twee links, drie rechts. Plek als medaille en naam in het kaartje,
  // rand en vlak in de kleur van de plek (coach-logica §9c). Een tik scrollt naar Per wedstrijd.
  const top = prow.filter(r => r.rH !== null).slice(0, 3);
  const pick = (r, i) => `<a class="ss-pick p${i + 1}" href="spelers.html#${encodeURIComponent(r.name)}" data-n="${esc(r.name)}" aria-haspopup="dialog" title="${esc(proName(r.name))}: rating ${f1(r.rH)} deze avond">
      ${PlayerCard.tiny(r.name, { session: s.id, rank: r.place, label: proName(r.name), value: f1(r.rH), key: '-p' })}</a>`;
  $('#s-podium').innerHTML = [1, 0, 2].filter(i => top[i]).map(i => pick(top[i], i)).join('');
  for (const a of $('#s-podium').querySelectorAll('a')) a.addEventListener('click', e => { e.preventDefault(); openPlayer(a.dataset.n); });
  PlayerCard.reveal($('#s-podium'));
  SESSION_ID = s.id;
  // Bezig (coach-logica §9a): alles wat een ranglijst is blijft dicht; alleen de wedstrijden en de uitslag.
  const live = sessionLive(s);
  $('#session-detail').classList.toggle('is-live', live);
  if (live) {
    $('#s-podium').innerHTML = `<div class="ss-sealed"><span class="pack-big" aria-hidden="true"><img src="crest.png" alt=""></span><b>Het pack is nog dicht</b><small>Gaat open als de avond klaar is</small></div>`;
    $('#s-quote').innerHTML = `<p class="ss-live-note">De avond is nog bezig. De wedstrijden werken bij; wie de besten waren, zie je zodra de avond klaar is.</p>`;
    return;
  }
  // De radar als lijst (coach-logica §9a): per as de onderliggende cijfers van de avond, uitgesplitst, met onderaan het team.
  rankCards($('#s-rank'), axisCards(ms, prow), names); // altijd iedereen die meespeelde (coach-logica §9a)
  $('#s-kort').innerHTML = takeawaysHtml(takeaways(ms, others, own));
  renderMatrix(ms, prow);
  renderRadar(s, ms);
  if (revealPending(s, sessions)) playReveal(s, top, quote); // de testsessie opent alleen met de hand (sessielijst, Club)
}

// Kaartjes onder de radar, in de volgorde van de assen. Per speler het totaal van de avond (percentages en rating als
// gemiddelde); onderaan het team: het totaal of gemiddelde van iedereen samen, ook de goals van AI in de uitslag.
function axisCards(ms, prow) {
  const rowsOf = n => ms.map(m => ({ m, p: m.players.find(p => p.name === n) })).filter(r => r.p);
  const all = ms.flatMap(m => m.players.map(p => ({ m, p })));
  const s = (rows, f) => rows.reduce((a, r) => a + (f(r.p) || 0), 0), e = (rows, k) => s(rows, p => p.ev?.[k]);
  const who = 'Iedereen die deze avond meespeelde; onderaan het team.', wed = n => `${n} ${n === 1 ? 'wedstrijd' : 'wedstrijden'}`;
  const count = (key, label, about, f, teamF = f) => ({ key, label, about, who,
    rows: prow.map(r => { const rows = rowsOf(r.name); return { name: r.name, v: f(rows), sub: wed(rows.length) }; }).sort((a, b) => b.v - a.v).map(x => ({ name: x.name, main: String(x.v), sub: x.sub })),
    team: { label: 'Team', main: String(teamF(all)), sub: `samen in ${wed(ms.length)}` } });
  // Percentage groot, met klein het aantal waar het om gaat (small): bij passes de gelukte passes, bij conversie de schoten.
  const ratio = (key, label, about, num, den, min, small) => ({ key, label, about, who: `${who} Minstens ${min} pogingen.`,
    rows: prow.map(r => { const rows = rowsOf(r.name), d = den(rows); return { name: r.name, v: d >= min ? num(rows) / d : null, sub: `${num(rows)} van ${d}`, small: small(rows) }; }).sort((a, b) => (b.v ?? -1) - (a.v ?? -1)).map(x => ({ name: x.name, main: x.v === null ? null : `${Math.round(100 * x.v)}%`, sub: x.v === null ? `${x.sub}, te weinig om te tellen` : x.sub, small: x.small })),
    team: { label: 'Team', main: den(all) ? `${Math.round(100 * num(all) / den(all))}%` : '–', sub: `${num(all)} van ${den(all)}`, small: small(all) } });
  const rated = all.map(r => r.p.rating).filter(v => v !== null);
  return [
    { key: 'a-rating', label: 'Rating', about: 'De gemiddelde matchrating van EA over de wedstrijden van deze avond (de as Rating).', who,
      rows: prow.filter(r => r.rH !== null).sort((a, b) => b.rH - a.rH || b.n - a.n).map(r => ({ name: r.name, main: f1(r.rH), sub: wed(r.n) })),
      team: { label: 'Team', main: rated.length ? f1(avg(rated)) : '–', sub: 'gemiddelde van alle ratings' } },
    count('a-goals', 'Goals', 'Doelpunten deze avond (de as Scoren). Bij het team alle goals van de uitslag, ook die van AI.', r => s(r, p => p.goals), () => ms.reduce((a, m) => a + m.goals, 0)),
    ratio('a-conv', 'Conversie', 'Goals per schot deze avond (de as Scoren kijkt naar goals én naar hoe vaak een schot raak was). Klein goals / schoten.', r => s(r, p => p.goals), r => s(r, p => p.shots), 3, r => `${s(r, p => p.goals)} / ${s(r, p => p.shots)}`),
    count('a-assists', 'Assists', 'De laatste pass voor een doelpunt (de as Creëren).', r => s(r, p => p.assists)),
    count('a-second', 'Tweede assists', 'De pass vóór de assist (telt voor 70% mee in Creëren).', r => e(r, 'second_assists')),
    count('a-through', 'Steekpasses', 'Passes in de ruimte achter de verdediging (tellen voor 35% mee in Creëren).', r => e(r, 'through_balls')),
    ratio('a-pass', 'Passes', 'Geslaagde passes van alle passes (de as Passen). Klein gelukt / pogingen.', r => s(r, p => p.passesMade), r => s(r, p => p.passAttempts), 10, r => `${s(r, p => p.passesMade)} / ${s(r, p => p.passAttempts)}`),
    { ...count('a-dribbles', 'Dribbels', 'Geslaagde dribbels (de as Dribbelen), met klein hoeveel tegenstanders daarbij voorbij werden gespeeld.', r => e(r, 'dribbles_completed')),
      rows: prow.map(r => { const rows = rowsOf(r.name); return { name: r.name, v: e(rows, 'dribbles_completed'), b: e(rows, 'players_beaten'), sub: wed(rows.length) }; }).sort((a, b) => b.v - a.v || b.b - a.b).map(x => ({ name: x.name, main: String(x.v), small: `${x.b} uitgespeeld`, sub: x.sub })),
      team: { label: 'Team', main: String(e(all, 'dribbles_completed')), small: `${e(all, 'players_beaten')} uitgespeeld`, sub: `samen in ${wed(ms.length)}` } },
    count('a-tackles', 'Tackles gewonnen', 'Gewonnen tackles (de as Verdedigen, gewogen met hoe vaak het lukte).', r => s(r, p => p.tacklesMade)),
    count('a-inter', 'Onderscheppingen', 'Onderschepte passes (de as Verdedigen).', r => e(r, 'interceptions')),
    count('a-mom', 'Man of the match', 'Hoe vaak EA iemand deze avond tot man of the match koos.', r => s(r, p => p.mom)),
  ];
}

// De uitspraak van één speler over deze avond (coach-logica §9): de quote van de avond als deze speler de beste was,
// anders een eigen uitspraak over wat er bij deze speler het meest uitstak (personas.js).
// Alleen de winnaar van de avond krijgt de quote (coach-logica §9a); de rest niets.
function playerQuote(name, sess) {
  const q = sessionQuote(sess);
  return q && q.who === proName(name) ? q.text : null;
}

// Sessiekaarten van alle spelers met plek, rating, groei en reeks (wat eerst *Spelers deze sessie* was). Nu niet op de
// pagina (dubbel met *Per wedstrijd*); bewaard voor het FUT-pack per sessie (coach-logica §9a, idee).
function sessionCardsHtml(s, ms, prow) {
  return `<div class="splayers">${prow.map((r, i) => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === r.name) })).filter(x => x.p);
    return `<div class="sp-item">
      <a class="fut-mini" href="spelers.html#${encodeURIComponent(r.name)}" aria-label="${esc(proName(r.name))}">${PlayerCard.html(r.name, { session: s.id, key: '-l', rank: r.rH === null ? null : i + 1 })}</a>
      <div class="sp-info"><div class="pcard-head"><a class="pcard-name" href="spelers.html#${encodeURIComponent(r.name)}">${esc(proName(r.name))}</a>${r.mom ? ' <span class="crown" title="Man of the match">♛</span>' : ''}</div>
        ${formLine(r.name, s.id, r.rH, rows.length)}
        ${ratingDots(rows)}</div></div>`;
  }).join('')}</div>`;
}

// Per speler over deze avond (coach-logica §9c), één keer: de rating van de avond met de groei ernaast (zonder het
// woord). De plek staat op de kaart zelf; geen tier-label (de kaart zegt het al) en geen "normaal" (de groei zegt het al).
function formLine(name, sid, rating, n) {
  const t = PlayerCard.sessionTier(name, sid);
  const extra = n < 3 ? '<span class="sp-note">minder dan 3 potten, telt niet voor de vorm</span>' : t.growth === null ? '' : `<span class="sp-growth" title="Groei: verschil met het eigen normaal, rating plus winst">${growthCell(t.growth)}</span>`;
  return `<div class="pcard-sub sp-line"><b class="sp-rating">${f1(rating)}</b>${extra}</div>`;
}

// ---------- per wedstrijd (coach-logica §9a): kolommen spelers, rijen wedstrijden, cellen de rating ----------
// Bovenaan per speler een minikaartje met foto, het gemiddelde van de avond en of de speler sterker, zwakker of gelijk
// speelde dan normaal (rating, grens 0,3); de kolommen staan op volgorde van dat gemiddelde. Elke cel
// kleurt naar de plek in die rij: goud, zilver, brons, ijzer voor de rest; gelijke ratings delen een plek.
let SESSION_ID = null; // de geopende sessie, voor de minikaartjes in Per wedstrijd
const RIM = rank => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'iron';
const rankIn = (v, list) => 1 + [...new Set(list.filter(x => x > v))].length;
function renderMatrix(ms, prow) {
  const cols = prow.filter(r => r.rH !== null);
  // Kaartjes in de kleur van de plek op het gemiddelde van de avond, zonder medaille (coach-logica §9a).
  const head = cols.map(r => `<th scope="col"><a class="rm-player" href="spelers.html#${encodeURIComponent(r.name)}" data-n="${esc(r.name)}" aria-haspopup="dialog" title="${esc(proName(r.name))}: ${f1(r.rH)} deze avond, plek ${r.place}">${PlayerCard.tiny(r.name, { session: SESSION_ID, rank: r.place, medal: false, value: f1(r.rH), label: proName(r.name), key: '-m' })}</a></th>`).join('');
  const rows = ms.map(m => {
    const ps = cols.map(r => m.players.find(p => p.name === r.name)), vals = ps.filter(p => p && p.rating !== null).map(p => p.rating);
    const cell = p => !p || p.rating === null ? '<td class="rm-none">–</td>'
      : `<td class="rim-${RIM(rankIn(p.rating, vals))}"><button type="button" class="rm-cell" data-m="${m.matchId}" data-n="${esc(p.name)}" aria-haspopup="dialog" aria-label="${esc(proName(p.name))} tegen ${esc(m.opponent.name)}: ${f1(p.rating)}, details">${f1(p.rating)}${p.mom ? '<i title="Man of the match">♛</i>' : ''}</button></td>`;
    return `<tr><th scope="row"><a class="rm-match" href="${matchHref(m)}" title="${esc(m.opponent.name)}"><span class="tl-dot ${m.result}">${letter(m.result)}</span>${oppBadge(m.opponent)}<b>${m.goals}-${m.goalsAgainst}</b></a></th>${ps.map(cell).join('')}</tr>`;
  }).join('');
  $('#s-matrix').innerHTML = `<table class="rmatrix"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  for (const a of $('#s-matrix').querySelectorAll('.rm-player')) a.addEventListener('click', e => { e.preventDefault(); openPlayer(a.dataset.n); });
  for (const b of $('#s-matrix').querySelectorAll('.rm-cell')) b.addEventListener('click', () => openCell(ms.find(m => m.matchId == b.dataset.m), b.dataset.n));
  PlayerCard.reveal($('#s-matrix'));
}

// Eén cijfer in Per wedstrijd (coach-logica §9a): wat de speler in die wedstrijd deed. EA geeft de formule van de
// rating niet; dit is wat erachter zit.
function openCell(m, name) {
  const p = m?.players.find(x => x.name === name); if (!p) return;
  const d = $('#cell-dialog'), ev = p.ev, frac = (a, b) => b ? `${a} van ${b} (${Math.round(100 * a / b)}%)` : '–';
  const rows = [
    ['Goals', p.goals], ['Assists', p.assists], ['Schoten', p.shots],
    ['Passes gelukt', frac(p.passesMade, p.passAttempts)], ['Tackles gewonnen', frac(p.tacklesMade, p.tackleAttempts)],
    ev ? ['Balwinst', ev.possession_won ?? 0] : null, ev ? ['Balverlies', ev.possession_lost ?? 0] : null,
    p.pos === 'goalkeeper' ? ['Reddingen', p.saves ?? 0] : null,
    ['Man of the match', p.mom ? 'ja' : 'nee'], ['Archetype', esc(archName(p.archetypeId))],
  ].filter(Boolean);
  const time = new Date(m.ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  d.querySelector('.rd-body').innerHTML = `<h2 id="cd-title">${esc(proName(name))} <span class="cd-rating">${f1(p.rating)}</span></h2>
    <p><span class="tl-dot ${m.result}">${letter(m.result)}</span> ${m.goals}–${m.goalsAgainst} tegen ${esc(m.opponent.name)} · ${time}</p>
    <dl class="cd-grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <p class="cd-note">EA zegt niet hoe de rating berekend wordt; dit is wat de speler in deze wedstrijd deed.</p>`;
  dialogFoot(d, matchHref(m), 'Naar de wedstrijd');
  d.showModal();
}
$('#cell-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });

// ---------- radar van de avond (coach-logica §9a) ----------
// Zes assen; elke as is een percentiel tegenover al onze eigen avonden (per speler per sessie, minstens 2 wedstrijden),
// zodat "groot" ook echt "goed gespeeld" betekent. null = te weinig om te meten.
// Elke as heeft een samengestelde maat (key, voor de vorm) en een leesbaar getal (show) onder de astitel.
const RADAR_AXES = [
  { key: 'rating', show: 'rating', label: 'Rating', code: 'RAT', fmt: v => f1(v),
    about: 'De gemiddelde EA-rating over de wedstrijden van deze avond.' },
  { key: 'scoring', show: 'gpm', label: 'Scoren', code: 'SCO', count: true,
    about: 'Goals per wedstrijd plus de kwaliteit van de afronding (goals per schot); bij minder dan vijf schoten telt die afronding naar rato minder, zodat één raak schot niet alles bepaalt. Onder de titel het aantal goals.' },
  { key: 'creation', show: 'apm', label: 'Creëren', code: 'CRE', count: true,
    about: 'Assists per wedstrijd, met tweede assists voor 70% en steekpasses voor 35%. Onder de titel het aantal assists.' },
  { key: 'passing', show: 'ppct', label: 'Passen', code: 'PAS', fmt: v => `${Math.round(100 * v)}%`,
    about: 'Geslaagde passes per wedstrijd, gewogen met de passnauwkeurigheid: veel passes én weinig balverlies. Onder de titel de nauwkeurigheid.' },
  { key: 'dribbling', show: 'dpm', label: 'Dribbelen', code: 'DRI', count: true,
    about: 'Tegenstanders uitgespeeld plus geslaagde dribbels per wedstrijd, uit de gebeurtenissen die EA meegeeft. Onder de titel het totaal.' },
  { key: 'defending', show: 'defpm', label: 'Verdedigen', code: 'VER', count: true,
    about: 'Gewonnen tackles per wedstrijd, gewogen met het slagingspercentage, plus onderscheppingen per wedstrijd. Onder de titel gewonnen tackles plus onderscheppingen.' },
];
// De maten van een avond. n = wedstrijden, nEv = wedstrijden met gebeurtenissen (voor het team: per wedstrijd van het
// team, niet per speler); goals = eigen goals (het team: alle goals van de uitslag, ook die van AI).
function nightStats(rows, n = rows.length, nEv = null, goals = null) {
  const sum = f => rows.reduce((a, r) => a + (f(r.p) || 0), 0), ev = rows.filter(r => r.p.ev), evSum = f => ev.reduce((a, r) => a + (f(r.p.ev) || 0), 0);
  const ne = nEv ?? ev.length, rated = rows.map(r => r.p.rating).filter(v => v !== null);
  const G = goals ?? sum(p => p.goals), S = sum(p => p.shots), A = sum(p => p.assists), pm = sum(p => p.passesMade), pa = sum(p => p.passAttempts);
  const tm = sum(p => p.tacklesMade), ta = sum(p => p.tackleAttempts), inter = evSum(e => e.interceptions);
  const conv = S ? Math.min(1, G / S) : 0;
  return {
    rating: rated.length ? avg(rated) : null,
    scoring: G / n + 0.5 * conv * Math.min(1, S / 5), gpm: G / n,
    creation: (A + 0.7 * evSum(e => e.second_assists) + 0.35 * evSum(e => e.through_balls)) / n, apm: A / n,
    passing: pa >= 10 ? (pm / n) * (pm / pa) : null, ppct: pa >= 10 ? pm / pa : null,
    dribbling: ne ? (evSum(e => e.players_beaten) + evSum(e => e.dribbles_completed)) / ne : null,
    dpm: ne ? (evSum(e => e.players_beaten) + evSum(e => e.dribbles_completed)) / ne : null,
    defending: (tm / n) * (ta ? tm / ta : 0) + (ne ? inter / ne : 0), defpm: tm / n + (ne ? inter / ne : 0),
  };
}
// Het team over een avond: dezelfde maten per wedstrijd van het hele team; rating als gemiddelde van alle spelers.
function teamStats(ms) {
  const rows = ms.flatMap(m => m.players.map(p => ({ m, p })));
  const evMatches = new Set(rows.filter(r => r.p.ev).map(r => r.m)).size;
  return nightStats(rows, ms.length, evMatches, ms.reduce((a, m) => a + m.goals, 0));
}
// Referentie, één keer berekend: per as alle waarden van onze avonden, voor het team en voor de spelers, en per
// speler en voor het team de waarden per sessie (voor "normaal").
let radarRef = null;
function radarReference() {
  if (radarRef) return radarRef;
  const empty = () => Object.fromEntries(RADAR_AXES.map(a => [a.key, []]));
  radarRef = { team: empty(), players: empty(), bySession: new Map() }; // bySession: id → { team, [naam]: stats }
  for (const sess of sessions) {
    if (sess.matches.length < 2) continue;
    const entry = { team: teamStats(sess.matches) };
    for (const a of RADAR_AXES) if (entry.team[a.key] !== null) radarRef.team[a.key].push(entry.team[a.key]);
    for (const name of new Set(sess.matches.flatMap(m => m.players.map(p => p.name)))) {
      const rows = sess.matches.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
      if (rows.length < 2) continue;
      entry[name] = nightStats(rows);
      for (const a of RADAR_AXES) if (entry[name][a.key] !== null) radarRef.players[a.key].push(entry[name][a.key]);
    }
    radarRef.bySession.set(sess.id, entry);
  }
  return radarRef;
}
const percentile = (list, v) => v === null || !list.length ? null : 100 * (list.filter(x => x < v).length + 0.5 * list.filter(x => x === v).length) / list.length;
// Normaal: het gemiddelde over de andere avonden, van het team of van die speler.
function normalOf(key, who, sid) {
  const vals = [...radarRef.bySession].filter(([id]) => id !== sid).map(([, e]) => e[who]?.[key]).filter(v => v !== null && v !== undefined);
  return vals.length ? avg(vals) : null;
}

let radarOn = null; // uitgelichte speler; null = het team (standaard). Nog een tik op dezelfde naam: terug naar het team.
// Het team en de spelers van een avond (minstens 2 wedstrijden), met per as het percentiel.
function radarModel(ms) {
  const ref = radarReference();
  const pcOf = (pool, st) => Object.fromEntries(RADAR_AXES.map(a => [a.key, percentile(pool[a.key], st[a.key])]));
  const team = { name: null, n: ms.length, st: teamStats(ms) }; team.pc = pcOf(ref.team, team.st);
  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))].map(name => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const st = nightStats(rows);
    return { name, n: rows.length, st, pc: pcOf(ref.players, st) };
  }).filter(x => x.n >= 2).sort((a, b) => (b.st.rating ?? 0) - (a.st.rating ?? 0));
  return { team, players };
}
const radarColor = name => name === null ? 'var(--brand)' : `var(${SERIES[(playerSlot.get(name) ?? 0) % SERIES.length]})`;
// Onder elke astitel het cijfer van wat is uitgelicht, met klein het normaal (coach-logica §9a). Aantallen als totaal
// van de avond; het normaal dan per wedstrijd van de andere avonden × het aantal wedstrijden van deze avond.
const radarShow = (a, v, n) => v === null ? null : a.count ? String(Math.round(v * n)) : a.fmt(v);
const radarShowNorm = (a, v, n) => a.count ? f1(v * n) : a.fmt(v);
function radarSvg(sel, others, sid, label) {
  // Op telefoon grotere teksten (de radar wordt daar kleiner getekend): ruimte en afstanden schalen mee (z).
  const z = matchMedia('(max-width: 600px)').matches ? 1.6 : 1;
  const S = 360, c = S / 2, R = 118, k = RADAR_AXES.length;
  const pt = (i, v) => { const t = -Math.PI / 2 + i * 2 * Math.PI / k; return [c + Math.cos(t) * R * v / 100, c + Math.sin(t) * R * v / 100]; };
  const ring = v => RADAR_AXES.map((_, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ');
  const axes = RADAR_AXES.map((a, i) => { const [x, y] = pt(i, 100), [lx, ly0] = pt(i, 128);
    const anchor = Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end', ly = ly0 < c - 20 ? ly0 - 30 * z : ly0 + (ly0 > c + 20 ? 12 * z : -6 * z);
    const v = sel.st[a.show], norm = normalOf(a.show, sel.name === null ? 'team' : sel.name, sid);
    return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="radar-label">${a.label}<tspan x="${lx.toFixed(1)}" class="radar-value sel" style="--pc:${radarColor(sel.name)}" dy="${17 * z}">${v === null ? 'te weinig' : radarShow(a, v, sel.n)}</tspan>${norm === null ? '' : `<tspan x="${lx.toFixed(1)}" dy="${14 * z}" class="radar-norm">normaal ${radarShowNorm(a, norm, sel.n)}</tspan>`}</text>`; }).join('');
  const shape = (x, cls) => `<polygon points="${RADAR_AXES.map((a, i) => pt(i, x.pc[a.key] ?? 0).map(n => n.toFixed(1)).join(',')).join(' ')}" style="stroke:${radarColor(x.name)};fill:${radarColor(x.name)}" class="radar-shape ${cls}"><title>${x.name === null ? 'Team' : esc(proName(x.name))}</title></polygon>`;
  const mx = 90 * z, my = 50 * z;
  return `<svg viewBox="${-mx} ${-my} ${S + 2 * mx} ${S + 2 * my}" class="radar-svg" role="img" aria-label="${label}">
    ${[25, 75, 100].map(v => `<polygon points="${ring(v)}" class="radar-ring"/>`).join('')}<polygon points="${ring(50)}" class="radar-ring radar-normal"/>${axes}
    ${others.map(x => shape(x, 'dim')).join('')}${shape(sel, 'on')}</svg>`;
}
function renderRadar(sess, ms) {
  const { team, players } = radarModel(ms);
  if (!players.some(x => x.name === radarOn)) radarOn = null;
  const sel = radarOn === null ? team : players.find(x => x.name === radarOn);
  // Alle vlakken altijd zichtbaar: het uitgelichte (standaard het team) fel bovenop, de rest vaag.
  $('#s-radar').innerHTML = radarSvg(sel, [team, ...players].filter(x => x !== sel), sess.id, `Zo speelden we: zes assen als percentiel tegenover onze eigen avonden, ${sel.name === null ? 'het team' : esc(proName(sel.name))} uitgelicht`);
  // Eerst Team, dan de spelers. Nog een tik op een gekozen speler gaat terug naar het team.
  $('#s-radar-chips').innerHTML = [team, ...players].map(x => `<button type="button" class="radar-chip${sel === x ? ' on' : ''}" aria-pressed="${sel === x}" data-n="${x.name === null ? '' : esc(x.name)}"><i style="background:${radarColor(x.name)}"></i>${x.name === null ? 'Team' : esc(proName(x.name))}</button>`).join('');
  for (const b of $('#s-radar-chips').querySelectorAll('.radar-chip')) b.addEventListener('click', () => { const n = b.dataset.n || null; radarOn = n === null || radarOn === n ? null : n; renderRadar(sess, ms); });
}

// Eén speler over de hele avond (coach-logica §9a): de radar van die speler met het team vaag erachter, dezelfde zes
// maten als tabel (deze avond en normaal), de kerncijfers en de rating per wedstrijd.
function openPlayer(name) {
  const sess = sessions.find(x => x.id === SESSION_ID), ms = sess.matches, { team, players } = radarModel(ms);
  const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
  const me = players.find(x => x.name === name), d = $('#player-dialog');
  const sum = f => rows.reduce((a, r) => a + (f(r.p) || 0), 0), rated = rows.map(r => r.p.rating).filter(v => v !== null);
  const facts = [['Wedstrijden', rows.length], ['Rating', f1(avg(rated))], ['Goals', sum(p => p.goals)], ['Assists', sum(p => p.assists)], ['Man of the match', sum(p => p.mom)]];
  const table = me ? `<table class="pd-table"><thead><tr><th></th><th>Deze avond</th><th>Normaal</th></tr></thead><tbody>${RADAR_AXES.map(a => {
    const v = me.st[a.show], norm = normalOf(a.show, name, SESSION_ID);
    return `<tr><th scope="row">${a.label}</th><td>${v === null ? '–' : radarShow(a, v, me.n)}</td><td>${norm === null ? '–' : radarShowNorm(a, norm, me.n)}</td></tr>`; }).join('')}</tbody></table>` : '';
  const portrait = PlayerCard.portrait(name), place = (SHARE?.prow || []).find(r => r.name === name)?.place;
  d.querySelector('.rd-body').innerHTML = `<div class="pd-head">
      <span class="pd-face">${portrait ? `<img src="${portrait}" alt="">` : `<span class="rd-face-icon">${esc(proName(name).charAt(0))}</span>`}</span>
      <div><h2 id="pd-title">${esc(proName(name))}</h2><p>${esc(cap(longDate(ms[0].ts)))}${place ? ` · ${place === 1 ? 'beste van de avond' : `plek ${place}`}` : ''}</p></div>
    </div>
    ${playerQuote(name, sess) ? `<blockquote class="pd-quote">„${esc(playerQuote(name, sess))}”</blockquote>` : ''}
    <dl class="pd-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${ratingDots(rows)}
    ${me ? `<div class="pd-radar">${radarSvg(me, [team], SESSION_ID, `${esc(proName(name))} deze avond, het team vaag erachter`)}</div>${table}` : '<p class="cd-note">Eén wedstrijd: te weinig voor de radar.</p>'}
`;
  // Vorige en volgende speler in de volgorde van Per wedstrijd (gemiddelde van de avond).
  const order = (SHARE?.prow || []).filter(r => r.rH !== null).map(r => r.name), at = order.indexOf(name);
  const face = n => { const src = PlayerCard.portrait(n); return src ? `<img src="${src}" alt="">` : `<span class="rd-face-icon">${esc(proName(n).charAt(0))}</span>`; };
  const step = n => n ? { label: proName(n), face: face(n), go: () => { d.querySelector('.rd-body').scrollTop = 0; openPlayer(n); } } : null;
  dialogFoot(d, `spelers.html#${encodeURIComponent(name)}`, 'Naar de spelerspagina', { prev: step(order[at - 1]), next: step(order[at + 1]) });
  if (!d.open) d.showModal();
}
// Uitleg van de zes assen (de knop Assen bij Zo speelden we).
$('#axes-btn')?.addEventListener('click', () => {
  const d = $('#axes-dialog');
  d.querySelector('.rd-body').innerHTML = `<h2 id="ax-title">Assen</h2><p>Elke as vergelijkt deze avond met al onze eigen avonden: groot is beter dan meestal, de gestippelde ring is een gewone avond.</p>
    <ul class="axes-list">${RADAR_AXES.map(a => `<li><span class="ax-code">${a.code}</span><div><b>${a.label}</b><p>${a.about}</p></div></li>`).join('')}</ul>`;
  d.showModal();
});
$('#axes-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });
$('#player-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });

onWidthChange(() => DATA && render());
window.rerender = () => render(); // thema wisselen: kaarten opnieuw in thuis- of uitkleuren
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(() => { sessions = sessionsOf(DATA.matches); selectedId = (sessions.find(x => x.key === ID_PARAM) || (/^\d+$/.test(ID_PARAM || '') ? sessions.find(x => x.id === Number(ID_PARAM)) : null))?.id ?? null; render(); }).catch(showError);

// ---------- deelkaart ----------
// Een avond als afbeelding (1080×1080) voor de groepsapp: uitslag, kerncijfers, uitblinker, de eerste zin van de
// samenvatting. Kleuren van het thuistenue. Deelt via het deelmenu van de telefoon, anders als download.
// ---------- delen (coach-logica §9a): een klein menu met afbeelding delen, afbeelding kopiëren en gegevens kopiëren ----------
let SHARE = null; // de geopende avond: { ms, sm, quote, prow }
const toast = msg => { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
// Het adres van deze sessie op de gedeelde site (ook vanuit de lokale app), zodat een link altijd werkt.
const SITE = 'https://neegek.github.io/frambroos-proclubs/';
const sessionUrl = ({ ms }) => `${SITE}sessie.html?id=${ms[0].sessionKey}`;
const fileName = ms => `frambroos-${new Date(ms[0].ts * 1000).toISOString().slice(0, 10)}.png`;
// De avond als tekst: plakklaar in een chat of spreadsheet (kolommen gescheiden door tabs).
function sessionText({ ms, sm, quote, prow, meta }) {
  const t = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const lines = [`Frambroos · ${cap(longDate(ms[0].ts))}`, meta, `W-G-V ${sm.W}-${sm.D}-${sm.L} · Goals ${sm.gf} · Tegen ${sm.ga}`];
  if (quote) lines.push(`„${quote.text}” — ${quote.who}`);
  lines.push(sessionUrl({ ms }));
  lines.push('', ['Tijd', 'Uitslag', 'Score', 'Tegenstander'].join('\t'), ...ms.map(m => [t(m.ts), letter(m.result), `${m.goals}-${m.goalsAgainst}`, m.opponent.name].join('\t')));
  lines.push('', ['Speler', 'Wedstrijden', 'Rating', 'Goals', 'Assists', 'Man of the match'].join('\t'),
    ...prow.map(r => [proName(r.name), r.n, f1(r.rH), r.g, r.a, r.mom].join('\t')));
  return lines.join('\n');
}
async function shareAction(kind) {
  const { ms } = SHARE;
  try {
    if (kind === 'link') { await navigator.clipboard.writeText(sessionUrl(SHARE)); toast('Link gekopieerd'); return; }
    if (kind === 'text') { await navigator.clipboard.writeText(sessionText(SHARE)); toast('Gegevens gekopieerd'); return; }
    if (kind === 'copy') { // de belofte direct meegeven: Safari wil de klembordactie binnen de tik
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareImage(SHARE) })]); toast('Afbeelding gekopieerd'); return; }
    const blob = await shareImage(SHARE), file = new File([blob], fileName(ms), { type: 'image/png' });
    // Een afbeelding kan geen klikbare link bevatten: de link naar deze sessie gaat als tekst mee met het delen.
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Frambroos', text: `Frambroos · ${cap(longDate(ms[0].ts))}`, url: sessionUrl(SHARE) }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch { toast('Dat lukte niet in deze browser'); }
}
(function shareMenu() {
  const btn = $('#s-share'), menu = $('#s-share-menu');
  if (!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }))) menu.querySelector('[data-k="share"] span').textContent = 'Afbeelding downloaden';
  if (!(navigator.clipboard && window.ClipboardItem)) menu.querySelector('[data-k="copy"]').hidden = true;
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
  menu.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b || !SHARE) return; close(); shareAction(b.dataset.k); });
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
})();

// Deelkaart (coach-logica §9a): dezelfde kop als op de pagina, als afbeelding van 1080×1080: stadion, type, naam van
// de sessie, de quote, de top drie als kaartjes op het podium en W-G-V, goals en tegengoals.
const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const SHARE_RIM = { gold: ['#fff1bd', '#d9b04a', '#8d6c15', '#f1d27a'], silver: ['#ffffff', '#c3c9d0', '#737b85', '#e4e8ec'], bronze: ['#f6d2ae', '#c27f45', '#74431c', '#e3a674'], iron: ['#c3ccd7', '#76828f', '#454e5a', '#9ea8b4'] };
async function shareImage({ ms, sm, quote, prow }) {
  // Deelafbeelding (coach-logica §9a): dezelfde stijl als de kop (stadion boven, paneel eronder). Boven de dag en de
  // uitslag; dan de beste speler van de avond met kaartje en quote; dan iedereen van beste tot minste met de maten die
  // de rating dragen (zoals in het spelersscherm), zonder de rating zelf.
  const W = 1080, list = prow.filter(r => r.rH !== null), ROW = 112, LIST_Y = 760;
  const H = LIST_Y + 40 + list.length * ROW + 80;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const font = (size, weight = 500, style = '') => { g.font = `${style} ${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`; };
  const mono = (size, weight = 600) => { g.font = `${weight} ${size}px ui-monospace, "SF Mono", Menlo, monospace`; };
  const lines = (text, maxW) => { const out = []; let line = ''; for (const w of text.split(' ')) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  const fit = (t, maxW) => { while (t.length > 1 && g.measureText(t).width > maxW) t = t.slice(0, -2).trimEnd() + '…'; return t; };
  // Achtergrond: stadion in de kop, daaronder het donkere paneel.
  const HEAD = 300;
  const svg = stadiumSvg().replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * 1200 / 420) / 2}" height="${W / 2}" `);
  const stadium = await loadImg(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
  g.fillStyle = '#17141b'; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.rect(0, 0, W, HEAD); g.clip(); g.fillStyle = '#07050d'; g.fillRect(0, 0, W, HEAD);
  if (stadium) g.drawImage(stadium, (W - stadium.width) / 2, 0);
  let grad = g.createLinearGradient(0, 0, 0, HEAD); grad.addColorStop(0, 'rgba(7,5,13,0.45)'); grad.addColorStop(1, 'rgba(7,5,13,0.85)');
  g.fillStyle = grad; g.fillRect(0, 0, W, HEAD); g.restore();
  g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, HEAD, W, 2);
  // Kop: de dag en de uitslag.
  g.textAlign = 'center'; g.fillStyle = '#fff'; font(72, 800); g.fillText(cap(longDate(ms[0].ts)), W / 2, 120);
  const figs = [['W-G-V'], [String(sm.gf), 'Goals'], [String(sm.ga), 'Tegen']];
  figs.forEach(([val, label], i) => {
    const x = W / 2 + (i - 1) * 230;
    if (i === 0) { mono(54, 700); const parts = [[String(sm.W), '#6aa8f5'], ['-', '#9a95a3'], [String(sm.D), '#c9c4d1'], ['-', '#9a95a3'], [String(sm.L), '#f58a8a']];
      const tw = parts.reduce((a, [t]) => a + g.measureText(t).width, 0); let px = x - tw / 2; g.textAlign = 'left';
      for (const [t, col] of parts) { g.fillStyle = col; g.fillText(t, px, 218); px += g.measureText(t).width; } g.textAlign = 'center'; label = 'W-G-V'; }
    else { g.fillStyle = '#fff'; mono(54, 700); g.fillText(val, x, 218); }
    g.fillStyle = '#d9d4e0'; font(22, 600); g.fillText(label, x, 252);
  });
  // De beste speler: het kaartje van het podium, met de naam en de quote ernaast (het gemiddelde staat al in het kaartje).
  const best = list[0], pick = document.querySelector('#s-podium .ss-pick.p1');
  if (best && pick) {
    const w = 230, h = w * 430 / 300, x0 = 70, y0 = HEAD + 50;
    await drawShareCard(g, pick, x0, y0, w, 'gold', 1, mono, font);
    const tx = x0 + w + 50, tw = W - tx - 70;
    g.textAlign = 'left'; g.fillStyle = '#ffd200'; font(22, 700); g.fillText('BESTE SPELER VAN DE AVOND', tx, y0 + 40);
    g.fillStyle = '#fff'; font(52, 800); g.fillText(fit(proName(best.name), tw), tx, y0 + 100);
    if (quote) { g.fillStyle = '#efeaf3'; font(30, 500, 'italic'); let qy = y0 + 170;
      for (const l of lines(`„${quote.text}”`, tw).slice(0, 4)) { g.fillText(l, tx, qy); qy += 42; } }
  }
  // Iedereen van beste tot minste: plek, portret, naam, rating, en de maten die de rating dragen.
  // Vooral relevante cijfers: aantallen (duels als gewonnen duels), en per speler fel wat bij de rol van die avond hoort.
  const cols = [['Goals', 'goals'], ['Assists', 'assists'], ['Passen', 'pass'], ['Balwinst', 'won'], ['Duels', 'duels']];
  const colX = [645, 750, 855, 955, 1025];
  g.fillStyle = '#9a95a3'; font(20, 650); g.textAlign = 'right';
  g.fillText('Rating', 545, LIST_Y); cols.forEach(([l], i) => g.fillText(l, colX[i], LIST_Y));

  for (const [i, r] of list.entries()) {
    const y = LIST_Y + 24 + i * ROW, mid = y + ROW / 2, rows = ms.map(m => ({ m, p: m.players.find(p => p.name === r.name) })).filter(x => x.p);
    const st = nightStats(rows), n = rows.length, k = r.place;
    if (i % 2 === 0) { g.fillStyle = 'rgba(255,255,255,0.035)'; g.beginPath(); g.roundRect(40, y + 4, W - 80, ROW - 8, 14); g.fill(); }
    const [mc, mi] = k === 1 ? ['#c9a548', '#2a1d05'] : k === 2 ? ['#b9c0c7', '#1d2228'] : k === 3 ? ['#b8794a', '#241205'] : ['#5d6774', '#f4f6f9'];
    g.fillStyle = mc; g.beginPath(); g.arc(84, mid, 20, 0, 7); g.fill(); g.fillStyle = mi; mono(22, 800); g.textAlign = 'center'; g.fillText(String(k), 84, mid + 8);
    // Een klein kaartje zoals boven Per wedstrijd (vorm en kleur van de plek), met alleen de foto.
    const cardEl = [...document.querySelectorAll('#s-matrix .rm-player')].find(a => a.dataset.n === r.name);
    if (cardEl) { const cw = 66; await drawShareCard(g, cardEl, 122, mid - cw * 430 / 300 / 2, cw, cardEl.querySelector('.fut-tiny')?.dataset.rim || 'gold', null, mono, font, { text: false }); }
    g.textAlign = 'left'; g.fillStyle = '#fff'; font(30, 650); g.fillText(fit(proName(r.name), 300), 212, mid + 10);
    g.textAlign = 'right'; mono(32, 700); g.fillStyle = '#ffd200'; g.fillText(f1(r.rH), 545, mid + 11);
    g.fillStyle = '#efeaf3'; mono(28, 600);
    const sum = f => rows.reduce((a, x) => a + (f(x.p) || 0), 0), relevant = ROLE_STATS[r.role] || [];
    const val = { goals: sum(p => p.goals), assists: sum(p => p.assists), pass: st.ppct === null ? '–' : `${Math.round(100 * st.ppct)}%`,
      won: rows.some(x => x.p.ev) ? sum(p => p.ev?.possession_won) : '–', duels: sum(p => p.tacklesMade) };
    cols.forEach(([, key], j) => { g.fillStyle = relevant.includes(key) ? '#ffffff' : '#7d7788'; mono(28, relevant.includes(key) ? 700 : 500); g.fillText(String(val[key]), colX[j], mid + 10); });
  }
  g.textAlign = 'center'; g.fillStyle = '#a9a2b3'; font(22); g.fillText(sessionUrl({ ms }).replace(/^https:\/\//, ''), W / 2, H - 36);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
// Eén kaartje zoals op de pagina (kleuren uit het echte kaartje), met de plek als medaille, rating en naam erin.
// Met text: false alleen het kaartje met een grotere foto (de kleine kaartjes in de lijst).
async function drawShareCard(g, pickEl, x0, y0, w, rim, place, mono, font, { text = true } = {}) {
  const tiny = pickEl.querySelector('.fut-tiny'), cs = getComputedStyle(tiny), v = n => cs.getPropertyValue(n).trim();
  const photo = await loadImg(pickEl.querySelector('image')?.getAttribute('href'));
  const s = w / 300;
  g.save(); g.translate(x0, y0); g.scale(s, s);
  const shape = new Path2D(PlayerCard.shape), inset = (sx, sy) => { g.translate(150, 215); g.scale(sx, sy); g.translate(-150, -215); };
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24 / s * (text ? 1 : 0.3); g.shadowOffsetY = 8 / s * (text ? 1 : 0.3);
  let gr = g.createLinearGradient(0, 0, 300, 430); (SHARE_RIM[rim] || SHARE_RIM.gold).forEach((col, i) => gr.addColorStop([0, 0.35, 0.7, 1][i], col));
  g.fillStyle = gr; g.fill(shape); g.shadowColor = 'transparent';
  g.save(); inset(0.952, 0.966);
  gr = g.createLinearGradient(0, 0, 110, 430); gr.addColorStop(0, v('--t-bg1') || '#241c0e'); gr.addColorStop(0.55, v('--t-bg2') || '#0e0c09'); gr.addColorStop(1, v('--t-bg3') || '#050403');
  g.fillStyle = gr; g.fill(shape); g.restore();
  g.save(); inset(0.952, 0.966); g.clip(shape); inset(1 / 0.952, 1 / 0.966);
  if (photo) {
    const bx = text ? 34 : 20, by = text ? 52 : 46, bw = text ? 240 : 260, bh = text ? 198 : 330;
    const r = Math.max(bw / photo.width, bh / photo.height), sw = bw / r, sh = bh / r;
    g.drawImage(photo, photo.width - sw, 0, sw, sh, bx, by, bw, bh);
    const fy = by + bh - 62; gr = g.createLinearGradient(0, fy, 0, by + bh + 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, v('--t-bg2') || '#0e0c09');
    g.fillStyle = gr; g.fillRect(0, fy - 2, 300, 66);
  }
  g.restore();
  if (!text) { g.restore(); return; }
  const [mc, mi] = { 1: ['#c9a548', '#2a1d05'], 2: ['#b9c0c7', '#1d2228'], 3: ['#b8794a', '#241205'] }[place];
  g.fillStyle = mc; g.beginPath(); g.arc(78, 98, 34, 0, 7); g.fill();
  g.fillStyle = mi; mono(40, 800); g.textAlign = 'center'; g.fillText(String(place), 78, 112);
  g.fillStyle = v('--t-ink') || '#f6e6b8'; mono(88, 800); g.fillText(pickEl.querySelector('.ft-val')?.textContent || '', 150, 318);
  font(30, 700); let nm = pickEl.querySelector('.ft-name')?.textContent.trim() || '';
  while (nm.length > 1 && g.measureText(nm).width > 190) nm = nm.slice(0, -2).trimEnd() + '…';
  g.fillText(nm, 150, 366);
  g.restore();
}
