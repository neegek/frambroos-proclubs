// Pagina van één sessie (sessie.html?id=<id>, een laag onder Sessies): uitslagen, de top drie als sessiekaarten, een
// verhaaltje met een Cruijff-quote, het radardiagram van de avond en de spelers.
// Een sessie is een reeks wedstrijden met minder dan 3 uur ertussen (SESSION_GAP in common.js).
// Samenvatting: docs/coach-logica.md §9 (Sessie).

const WEEKDAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const longDate = ts => { const d = new Date(ts * 1000); return `${WEEKDAY_LONG[d.getDay()]} ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const typeLabel = list => { const t = new Set(list.map(m => m.matchType)); return t.size > 1 ? 'league en playoff' : t.has('playoffMatch') ? 'playoff' : 'league'; };
const strengthLabel = d => d === null ? '' : d >= 250 ? 'veel sterker' : d >= 100 ? 'sterker' : d <= -100 ? 'zwakker' : 'gelijkwaardig';
const pSum = (rows, f) => rows.reduce((a, r) => a + (f(r.p) || 0), 0);

let sessions = [], selectedId = Number(new URLSearchParams(location.search).get('id')) || null;

// De anekdote van de avond (coach-logica §9): het ene moment of de ene speler die de avond kenmerkte, met de
// Cruijff-quote die erbij hoort. Kandidaten krijgen een kracht; de sterkste wint, bij gelijke kracht de laatste.
const QUOTE = {
  schieten: 'Je moet schieten, anders kun je niet scoren.',
  doorhebben: 'Je gaat het pas zien als je het doorhebt.',
  nadeel: 'Elk nadeel heb z\'n voordeel.',
  nietVerliezen: 'Als je niet kunt winnen, moet je zorgen dat je niet verliest.',
  simpel: 'Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen.',
  fout: 'Voordat ik een fout maak, maak ik die fout niet.',
  bal: 'Als wij de bal hebben, kunnen zij niet scoren.',
  italianen: 'Italianen kunnen niet van je winnen, maar je kan wel van ze verliezen.',
  toeval: 'Toeval is logisch.',
};
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
  const lbl = opp && own ? strengthLabel(opp - own) : null;
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
  return { html: parts.join(' '), lead: parts[0], story: a.text || parts[0], quote: QUOTE[a.q] };
}

function render() {
  // Onbekende of ontbrekende sessie: de laatste.
  if (!sessions.some(s => s.id === selectedId)) selectedId = sessions.at(-1)?.id ?? null;
  if (selectedId === null) { $('#s-title').textContent = 'Nog geen sessies'; return; }
  const s = sessions.find(x => x.id === selectedId), ms = s.matches, sm = summarize(ms);
  const others = DATA.matches.filter(m => m.session !== s.id);
  const own = DATA.snapshot?.skillRating;
  const names = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  $('#s-title').textContent = cap(longDate(ms[0].ts));
  $('#s-meta').textContent = `${typeLabel(ms)} · ${names.length} spelers`;

  const opp = avg(ms.map(m => m.opponent.skillRating).filter(Boolean));
  const no = summarize(others), TN = 'Deze avond tegenover normaal (alle andere wedstrijden)';
  // Scorebord (coach-logica §9a, Sessiekop): de uitslag. W-G-V groot met het doelsaldo en de nul, de wedstrijden als
  // scrollbare kaartjes, de top drie als minikaartjes. Hoe we speelden staat in de radar eronder. Kleurt mee met de avond.
  $('#s-hero').classList.toggle('good', sm.ppg >= 2); $('#s-hero').classList.toggle('bad', sm.ppg < 1);
  const cs = ms.filter(m => m.goalsAgainst === 0).length, res = others.length >= 3 ? deltaOf(sm.resid, no.resid, { digits: 1, title: `${TN}: doelsaldo tov verwachting` }) : null;
  $('#s-record').innerHTML = `<span class="sh-rec"><b class="W">${sm.W}</b><i>-</i><b class="D">${sm.D}</b><i>-</i><b class="L">${sm.L}</b></span>
    <span class="sh-facts"><span><b>${signed(sm.gf - sm.ga, 0)}${res ? `<span class="kpi-badge ${res.good === true ? 'up' : res.good === false ? 'down' : ''}" title="${esc(res.title)}">${res.txt}</span>` : ''}</b><small>doelsaldo · ${sm.gf}–${sm.ga}</small></span><span><b>${cs}×</b><small>de nul</small></span></span>`;
  $('#s-matches').innerHTML = ms.map(m => matchCard(m, { own })).join('');

  // Spelers: rating deze avond tegenover het eigen normaal (alle andere wedstrijden), goals, assists, man of the match.
  const prow = names.map(name => {
    const here = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const there = others.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const rH = avg(here.map(r => r.p.rating).filter(v => v !== null)), rT = avg(there.map(r => r.p.rating).filter(v => v !== null));
    return { name, n: here.length, nT: there.length, rH, rT, d: rT === null || rH === null ? null : rH - rT, g: pSum(here, p => p.goals), a: pSum(here, p => p.assists), mom: pSum(here, p => p.mom) };
  }).sort((x, y) => (y.rH ?? 0) - (x.rH ?? 0));
  const sum = sessionSummary(ms, sm, opp, own, prow);
  $('#s-summary').innerHTML = sum.story; // van de samenvatting alleen de anekdote; de cijfers staan erboven
  $('#s-quote').innerHTML = `„${sum.quote}” <small>— Johan Cruijff</small>`;
  $('#s-share').onclick = () => shareSession(ms, sm, prow, sum.html.replace(/<[^>]+>/g, ''));
  // Top drie als minikaartjes (foto, plek, rating van de avond, naam); een tik scrollt naar Per wedstrijd.
  const top = prow.filter(r => r.rH !== null).slice(0, 3);
  $('#s-podium').innerHTML = top.map((r, i) => `<a class="sh-pick p${i + 1}" href="#per-wedstrijd" title="${esc(proName(r.name))}: rating ${f1(r.rH)} deze avond">
      ${PlayerCard.tiny(r.name, { session: s.id, rank: i + 1, value: f1(r.rH), key: '-p' })}<span class="sh-pick-name">${esc(proName(r.name))}${r.mom ? ' <span class="crown" title="Man of the match">♛</span>' : ''}</span></a>`).join('');
  for (const a of $('#s-podium').querySelectorAll('a')) a.addEventListener('click', e => { e.preventDefault(); $('#per-wedstrijd').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  PlayerCard.reveal($('#s-podium'));
  SESSION_ID = s.id;
  renderMatrix(ms, prow);
  renderRadar(s, ms);
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
// Bovenaan per speler een minikaartje met foto, plek en het gemiddelde van de avond (dat bepaalt de plek). Elke cel
// kleurt naar de plek in die rij: goud, zilver, brons, ijzer voor de rest; gelijke ratings delen een plek.
let SESSION_ID = null; // de geopende sessie, voor de minikaartjes in Per wedstrijd
const RIM = rank => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'iron';
const rankIn = (v, list) => 1 + [...new Set(list.filter(x => x > v))].length;
function renderMatrix(ms, prow) {
  const cols = prow.filter(r => r.rH !== null), avgs = cols.map(r => r.rH);
  const head = cols.map(r => { const k = rankIn(r.rH, avgs);
    return `<th scope="col"><a class="rm-player" href="spelers.html#${encodeURIComponent(r.name)}" title="${esc(proName(r.name))}: plek ${k}, gemiddeld ${f1(r.rH)}">${PlayerCard.tiny(r.name, { session: SESSION_ID, rank: k, value: f1(r.rH), key: '-m' })}<span class="rm-name">${esc(proName(r.name))}</span></a></th>`; }).join('');
  const rows = ms.map(m => {
    const ps = cols.map(r => m.players.find(p => p.name === r.name)), vals = ps.filter(p => p && p.rating !== null).map(p => p.rating);
    const cell = p => !p || p.rating === null ? '<td class="rm-none">–</td>'
      : `<td class="rim-${RIM(rankIn(p.rating, vals))}" title="${esc(proName(p.name))}: ${p.rating}${p.goals ? ` · ${p.goals} G` : ''}${p.assists ? ` · ${p.assists} A` : ''}">${f1(p.rating)}${p.mom ? '<i title="Man of the match">♛</i>' : ''}</td>`;
    return `<tr><th scope="row"><a class="rm-match" href="wedstrijd.html?id=${m.matchId}" title="${esc(m.opponent.name)}"><span class="tl-dot ${m.result}">${letter(m.result)}</span>${kitShirt(m.opponent.kit, m.opponent.name)}<b>${m.goals}-${m.goalsAgainst}</b></a></th>${ps.map(cell).join('')}</tr>`;
  }).join('');
  $('#s-matrix').innerHTML = `<table class="rmatrix"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  PlayerCard.reveal($('#s-matrix'));
}

// ---------- radar van de avond (coach-logica §9a) ----------
// Zes assen; elke as is een percentiel tegenover al onze eigen avonden (per speler per sessie, minstens 2 wedstrijden),
// zodat "groot" ook echt "goed gespeeld" betekent. null = te weinig om te meten.
const RADAR_AXES = [
  { key: 'rating', label: 'Rating', fmt: v => f1(v) },
  { key: 'goals', label: 'Scoren', fmt: v => `${f1(v)} p/w` },
  { key: 'create', label: 'Creëren', fmt: v => `${f1(v)} p/w` },
  { key: 'pass', label: 'Passen', fmt: v => `${Math.round(100 * v)}%` },
  { key: 'won', label: 'Balwinst', fmt: v => `${f1(v)} p/w` },
  { key: 'duels', label: 'Duels', fmt: v => `${Math.round(100 * v)}%` },
];
function nightStats(rows) {
  const n = rows.length, sum = f => rows.reduce((a, r) => a + (f(r.p) || 0), 0), ev = rows.filter(r => r.p.ev);
  const rated = rows.map(r => r.p.rating).filter(v => v !== null), pa = sum(p => p.passAttempts), ta = sum(p => p.tackleAttempts);
  return {
    rating: rated.length ? avg(rated) : null,
    goals: sum(p => p.goals) / n,
    create: (sum(p => p.assists) + ev.reduce((a, r) => a + (r.p.ev.second_assists || 0), 0)) / n,
    pass: pa >= 10 ? sum(p => p.passesMade) / pa : null,
    won: ev.length ? ev.reduce((a, r) => a + (r.p.ev.possession_won || 0), 0) / ev.length : null,
    duels: ta >= 3 ? sum(p => p.tacklesMade) / ta : null,
  };
}
// Het team over een avond: dezelfde zes maten, maar per wedstrijd van het hele team (goals, creëren en balwinst per
// wedstrijd; pass en duels over alle pogingen; rating als gemiddelde van alle spelers).
function teamStats(ms) {
  const rows = ms.flatMap(m => m.players.map(p => ({ m, p }))), n = ms.length;
  const st = nightStats(rows);
  const ev = rows.filter(r => r.p.ev), evMatches = new Set(ev.map(r => r.m)).size;
  return { ...st, goals: st.goals * rows.length / n, create: st.create * rows.length / n,
    won: evMatches ? ev.reduce((a, r) => a + (r.p.ev.possession_won || 0), 0) / evMatches : null };
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

let radarOn = null; // uitgelichte speler; null = het team
function renderRadar(sess, ms) {
  const ref = radarReference();
  const pcOf = (pool, st) => Object.fromEntries(RADAR_AXES.map(a => [a.key, percentile(pool[a.key], st[a.key])]));
  const team = { name: null, st: teamStats(ms) }; team.pc = pcOf(ref.team, team.st);
  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))].map(name => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const st = nightStats(rows);
    return { name, n: rows.length, st, pc: pcOf(ref.players, st) };
  }).filter(x => x.n >= 2).sort((a, b) => (b.st.rating ?? 0) - (a.st.rating ?? 0));
  const color = name => name === null ? 'var(--brand)' : `var(${SERIES[(playerSlot.get(name) ?? 0) % SERIES.length]})`;
  if (!players.some(x => x.name === radarOn)) radarOn = null;
  const sel = radarOn === null ? team : players.find(x => x.name === radarOn);

  // Onder elke astitel het cijfer van wat is uitgelicht, met klein ons normaal (coach-logica §9a).
  const S = 360, c = S / 2, R = 118, k = RADAR_AXES.length;
  const pt = (i, v) => { const t = -Math.PI / 2 + i * 2 * Math.PI / k; return [c + Math.cos(t) * R * v / 100, c + Math.sin(t) * R * v / 100]; };
  const ring = v => RADAR_AXES.map((_, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ');
  const axes = RADAR_AXES.map((a, i) => { const [x, y] = pt(i, 100), [lx, ly0] = pt(i, 128);
    const anchor = Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end', ly = ly0 < c - 20 ? ly0 - 28 : ly0 + (ly0 > c + 20 ? 12 : -6);
    const v = sel.st[a.key], norm = normalOf(a.key, sel.name === null ? 'team' : sel.name, sess.id);
    return `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="radar-label">${a.label}<tspan x="${lx.toFixed(1)}" dy="17" class="radar-value sel" style="--pc:${color(sel.name)}">${v === null ? 'te weinig' : a.fmt(v)}</tspan>${norm === null ? '' : `<tspan x="${lx.toFixed(1)}" dy="14" class="radar-norm">normaal ${a.fmt(norm)}</tspan>`}</text>`; }).join('');
  const shape = (x, cls) => `<polygon points="${RADAR_AXES.map((a, i) => pt(i, x.pc[a.key] ?? 0).map(n => n.toFixed(1)).join(',')).join(' ')}" style="stroke:${color(x.name)};fill:${color(x.name)}" class="radar-shape ${cls}"><title>${x.name === null ? 'Team' : esc(proName(x.name))}</title></polygon>`;
  // Het uitgelichte vlak bovenop; de rest vaag.
  const others = [team, ...players].filter(x => x !== sel);
  $('#s-radar').innerHTML = `<svg viewBox="-90 -50 ${S + 180} ${S + 100}" class="radar-svg" role="img" aria-label="Zo speelden we: zes assen als percentiel tegenover onze eigen avonden, ${sel.name === null ? 'het team' : esc(proName(sel.name))} uitgelicht">
    ${[25, 75, 100].map(v => `<polygon points="${ring(v)}" class="radar-ring"/>`).join('')}<polygon points="${ring(50)}" class="radar-ring radar-normal"/>${axes}
    ${others.map(x => shape(x, 'dim')).join('')}${shape(sel, 'on')}</svg>`;
  $('#s-radar-chips').innerHTML = [team, ...players].map(x => `<button type="button" class="radar-chip${sel === x ? ' on' : ''}" aria-pressed="${sel === x}" data-n="${x.name === null ? '' : esc(x.name)}"><i style="background:${color(x.name)}"></i>${x.name === null ? 'Team' : esc(proName(x.name))}</button>`).join('');
  for (const b of $('#s-radar-chips').querySelectorAll('.radar-chip')) b.addEventListener('click', () => { radarOn = b.dataset.n || null; renderRadar(sess, ms); });
}

onWidthChange(() => DATA && render());
window.rerender = () => render(); // thema wisselen: kaarten opnieuw in thuis- of uitkleuren
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(() => { sessions = sessionsOf(DATA.matches); render(); }).catch(showError);

// ---------- deelkaart ----------
// Een avond als afbeelding (1080×1080) voor de groepsapp: uitslag, kerncijfers, uitblinker, de eerste zin van de
// samenvatting. Kleuren van het thuistenue. Deelt via het deelmenu van de telefoon, anders als download.
async function shareSession(ms, sm, prow, summaryText) {
  const k = DATA.club.kits?.home || ['#090b0d', '#ffd200', '#582063', '#ffd200'];
  const [ink, accent, purple] = ['#f2f2f2', k[1], k[2]];
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1080, 1080); grad.addColorStop(0, purple); grad.addColorStop(1, '#17141b');
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1080);
  const font = (size, weight = 500, family = 'system-ui, -apple-system, "Segoe UI", sans-serif') => { g.font = `${weight} ${size}px ${family}`; };
  const mono = (size, weight = 500) => font(size, weight, 'ui-monospace, "SF Mono", Menlo, monospace');
  const wrap = (text, x, y, maxW, lh) => { const words = text.split(' '); let line = '', yy = y; for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = test; } if (line) g.fillText(line, x, yy); return yy + lh; };
  const crest = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'crest.png'; });
  if (crest) g.drawImage(crest, 72, 64, 120, 120);
  g.fillStyle = ink; font(54, 700); g.fillText('Frambroos', 216, 118);
  g.fillStyle = '#cfc3d4'; font(30); g.fillText(cap(longDate(ms[0].ts)), 216, 164);
  // uitslag
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(72, 230, 936, 250, 28); g.fill();
  mono(132, 600); let x = 108; const y = 365;
  for (const [n, col] of [[sm.W, '#5b9cf0'], [sm.D, '#9a9da3'], [sm.L, '#f07c7c']]) { g.fillStyle = col; g.fillText(String(n), x, y); x += g.measureText(String(n)).width; g.fillStyle = '#6f6e68'; if (col !== '#f07c7c') { g.fillText('-', x, y); x += g.measureText('-').width; } }
  g.fillStyle = '#cfc3d4'; font(26); g.fillText('W – G – V', 112, 430);
  let px = 560; for (const txt of [`winst ${fmtPct(sm.winPct)}`, `${signed(sm.gf - sm.ga, 0)} doelsaldo`]) { font(26, 600); const wdt = g.measureText(txt).width + 40; g.fillStyle = 'rgba(255,210,0,0.14)'; g.beginPath(); g.roundRect(px, 300, wdt, 52, 26); g.fill(); g.fillStyle = accent; g.fillText(txt, px + 20, 336); px += wdt + 14; }
  mono(64, 500); g.fillStyle = ink; g.textAlign = 'right'; g.fillText(`${sm.gf}–${sm.ga}`, 976, 440); g.textAlign = 'left';
  // uitblinker en betrokken bij goals
  const best = prow[0], inv = [...prow].sort((a, b) => (b.g + b.a) - (a.g + a.a))[0];
  const box = (bx, label, name, val) => { g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(bx, 512, 452, 200, 28); g.fill(); g.fillStyle = accent; font(24, 600); g.fillText(label.toUpperCase(), bx + 32, 562); g.fillStyle = ink; font(40, 700); g.fillText(name, bx + 32, 622); mono(56, 500); g.textAlign = 'right'; g.fillText(val, bx + 420, 688); g.textAlign = 'left'; };
  if (best) box(72, 'Uitblinker', proName(best.name), f1(best.rH));
  if (inv) box(556, 'Goals + assists', proName(inv.name), String(inv.g + inv.a));
  // samenvatting (eerste twee zinnen)
  g.fillStyle = ink; font(32, 400);
  const sentences = summaryText.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) || [summaryText];
  wrap(sentences.slice(0, 2).join(' ').trim(), 72, 790, 936, 46);
  g.fillStyle = '#cfc3d4'; font(24); g.fillText('Frambroos Coach · neegek.github.io/frambroos-proclubs', 72, 1016);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], `frambroos-${new Date(ms[0].ts * 1000).toISOString().slice(0, 10)}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Frambroos' }); return; } catch { /* geannuleerd: dan downloaden */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
