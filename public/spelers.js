// Spelerspagina: samenvatting per speler (rol en vorm), sterk en zwak binnen het team, en de cijfers.
// Alles wordt uit DATA afgeleid (zie common.js), dus de tekst groeit mee met elke speelavond.

const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const minutes = rows => sum(rows, r => r.p.secondsPlayed) / 60;
const per90 = (rows, f) => { const m = minutes(rows); return m ? +(90 * sum(rows, f) / m).toFixed(2) : null; };
const evRows = rows => rows.filter(r => r.p.ev);
const evPer90 = key => rows => { const e = evRows(rows); return e.length ? per90(e, r => r.p.ev[key]) : null; };
const actionsOf = p => p.ev ? p.ev.ball_actions : (p.passAttempts || 0) + (p.shots || 0) + (p.tackleAttempts || 0);
const f0 = v => v === null || v === undefined ? '–' : String(Math.round(v));

// Maten: hib = hoger is beter. calc krijgt rijen {m, p}.
const METRICS = [
  { key: 'rating', label: 'Rating', hib: true, fmt: f2, calc: rows => avg(rows.map(r => r.p.rating).filter(v => v !== null)) },
  { key: 'ga90', label: 'Goals + assists per 90', hib: true, fmt: f2, calc: rows => per90(rows, r => (r.p.goals || 0) + (r.p.assists || 0)) },
  { key: 'conv', label: 'Conversie (goals per schot)', hib: true, fmt: fmtPct, min: r => sum(r, x => x.p.shots) >= 5, calc: rows => pct(sum(rows, r => r.p.goals), sum(rows, r => r.p.shots)) },
  { key: 'assists90', label: 'Assists per 90', hib: true, fmt: f2, calc: rows => per90(rows, r => r.p.assists) },
  { key: 'sa90', label: 'Tweede assists per 90', hib: true, fmt: f2, ev: true, calc: evPer90('second_assists') },
  { key: 'inv90', label: 'Betrokken bij goals per 90', hib: true, fmt: f2, ev: true, calc: rows => { const e = evRows(rows); return e.length ? per90(e, r => (r.p.goals || 0) + (r.p.assists || 0) + (r.p.ev.second_assists || 0)) : null; } },
  { key: 'passAcc', label: 'Passnauwkeurigheid', hib: true, fmt: fmtPct, calc: rows => pct(sum(rows, r => r.p.passesMade), sum(rows, r => r.p.passAttempts)) },
  { key: 'fwdShare', label: 'Aandeel passes vooruit', hib: true, fmt: fmtPct, ev: true, calc: rows => { const e = evRows(rows); return pct(sum(e, r => r.p.ev.passes_completed_forward), sum(e, r => r.p.ev.passes_completed)); } },
  { key: 'through90', label: 'Steekpasses per 90', hib: true, fmt: f2, ev: true, calc: evPer90('through_balls') },
  { key: 'dribbles90', label: 'Dribbels per 90', hib: true, fmt: f1, ev: true, calc: evPer90('dribbles_completed') },
  { key: 'beaten90', label: 'Tegenstanders uitgespeeld per 90', hib: true, fmt: f1, ev: true, calc: evPer90('players_beaten') },
  { key: 'won90', label: 'Balwinst per 90', hib: true, fmt: f1, ev: true, calc: evPer90('possession_won') },
  { key: 'interceptions90', label: 'Onderscheppingen per 90', hib: true, fmt: f1, ev: true, calc: evPer90('interceptions') },
  { key: 'tacklePct', label: 'Tackle-rendement', hib: true, fmt: fmtPct, min: r => sum(r, x => x.p.tackleAttempts) >= 10, calc: rows => pct(sum(rows, r => r.p.tacklesMade), sum(rows, r => r.p.tackleAttempts)) },
  { key: 'lost90', label: 'Balverlies per 90', hib: false, fmt: f1, ev: true, calc: evPer90('possession_lost') },
  { key: 'lostDef90', label: 'Balverlies op eigen helft per 90', hib: false, fmt: f2, ev: true, calc: evPer90('possession_lost_def_third') },
  { key: 'outPos', label: 'Uit positie', hib: false, fmt: fmtPct, ev: true, calc: rows => { const e = evRows(rows); return pct(sum(e, r => r.p.ev.out_of_position), sum(e, r => r.p.ev.out_of_position + r.p.ev.in_position)); } },
  { key: 'fouls90', label: 'Overtredingen per 90', hib: false, fmt: f2, ev: true, calc: evPer90('fouls_conceded_total') },
  { key: 'noOption90', label: '"Geen goede optie" per 90', hib: false, fmt: f1, ev: true, calc: evPer90('fb_no_good_option') },
];

const tag = c => `<span class="tag ${c}">${c}</span>`;
const li = (claim, evidence, conf) => `<li><div class="claim">${claim}${conf ? tag(conf) : ''}</div><div class="evidence">${evidence}</div></li>`;

let selected = null;

function rowsFor(ms, name) { return ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p); }

function metricTable(ms, players) {
  // per maat: waarde per speler (alleen met genoeg rijen), teamwaarde (gepoold), rangorde
  const allRows = players.flatMap(n => rowsFor(ms, n));
  return METRICS.map(mt => {
    const values = players.map(n => { const rows = rowsFor(ms, n); const ok = rows.length >= 3 && (!mt.min || mt.min(rows)); const v = ok ? mt.calc(rows) : null; return { name: n, v, n: rows.length }; }).filter(x => x.v !== null && x.v !== undefined);
    const team = mt.calc(allRows);
    const sorted = [...values].sort((a, b) => mt.hib ? b.v - a.v : a.v - b.v);
    return { ...mt, team, values: sorted, rank: Object.fromEntries(sorted.map((x, i) => [x.name, i + 1])) };
  }).filter(mt => mt.team !== null && mt.team !== undefined);
}

function strengthsWeaknesses(name, table) {
  const strengths = [], weaknesses = [];
  for (const mt of table) {
    const me = mt.values.find(x => x.name === name); if (!me || mt.values.length < 3) continue;
    const k = mt.values.length, rank = mt.rank[name];
    const gap = mt.hib ? (me.v - mt.team) / Math.abs(mt.team) : (mt.team - me.v) / Math.abs(mt.team);
    const conf = me.n >= 10 ? 'sterk' : me.n >= 6 ? 'redelijk' : 'zwak';
    const ev = `${mt.fmt(me.v)} tegenover ${mt.fmt(mt.team)} voor het team · plek ${rank} van ${k} · ${me.n} wedstrijden`;
    if ((rank === 1 && gap >= 0.1) || (rank === 2 && gap >= 0.3)) strengths.push({ gap, key: mt.key, label: mt.label.toLowerCase(), html: li(`${rank === 1 ? 'Beste van het team' : 'Top twee'} in ${mt.label.toLowerCase()}`, ev, conf) });
    if ((rank === k && gap <= -0.1) || (rank === k - 1 && gap <= -0.3)) weaknesses.push({ gap, key: mt.key, label: mt.label.toLowerCase(), html: li(`${rank === k ? 'Laagste van het team' : 'Onderaan'} in ${mt.label.toLowerCase()}`, ev, conf) });
  }
  strengths.sort((a, b) => b.gap - a.gap); weaknesses.sort((a, b) => a.gap - b.gap);
  return { strengths: strengths.map(x => x.html), weaknesses: weaknesses.map(x => x.html), sRaw: strengths, wRaw: weaknesses };
}

function playerSummary(name, rows, career, sw) {
  if (!rows.length) return 'Nog geen wedstrijden van deze speler in de gekozen periode.';
  const ROLE = {
    sa90: 'de verbinder', inv90: 'de aangever',
    assists90: 'de aangever', ga90: 'de aangever', conv: 'de afmaker', dribbles90: 'de dribbelaar', beaten90: 'de dribbelaar',
    through90: 'de spelmaker', fwdShare: 'de spelmaker', won90: 'de ballenafpakker', interceptions90: 'de ballenafpakker', tacklePct: 'de ballenafpakker',
    passAcc: 'de rustige kracht', lost90: 'de rustige kracht', lostDef90: 'de rustige kracht', outPos: 'de rustige kracht', noOption90: 'de rustige kracht', fouls90: 'de rustige kracht', rating: 'een vaste waarde',
  };
  const GOOD = {
    sa90: 'geeft vaak de pass vóór de assist', inv90: 'is bij veel goals betrokken',
    assists90: 'geeft de meeste assists', ga90: 'is bij veel goals betrokken', conv: 'maakt de kansen af', dribbles90: 'gaat graag de dribbel aan', beaten90: 'speelt tegenstanders uit',
    through90: 'geeft veel steekpasses', fwdShare: 'speelt veel vooruit', won90: 'wint veel ballen', interceptions90: 'onderschept veel', tacklePct: 'wint de duels',
    passAcc: 'passt zuiver', lost90: 'verliest weinig ballen', lostDef90: 'verliest achterin zelden de bal', outPos: 'staat bijna altijd goed', noOption90: 'heeft bijna altijd een aanspeelpunt', fouls90: 'speelt netjes', rating: 'speelt constant op niveau',
  };
  const BAD = {
    inv90: 'is weinig bij goals betrokken', // weinig tweede assists is geen zwak punt: een spits geeft ze zelden
    assists90: 'geeft weinig assists', ga90: 'is weinig bij goals betrokken', conv: 'mist relatief veel kansen', dribbles90: 'gaat de dribbel weinig aan', beaten90: 'speelt zelden iemand uit',
    through90: 'geeft weinig steekpasses', fwdShare: 'speelt weinig vooruit', won90: 'wint weinig ballen', interceptions90: 'onderschept weinig', tacklePct: 'verliest veel duels',
    passAcc: 'passt slordig', lost90: 'verliest relatief veel ballen', lostDef90: 'verliest ballen op eigen helft', outPos: 'staat vaak uit positie', noOption90: 'staat vaak zonder aanspeelpunt', fouls90: 'maakt veel overtredingen', rating: 'haalt het niveau van de rest nog niet',
  };
  const s = sw.sRaw.filter(x => GOOD[x.key]), w = sw.wRaw.filter(x => BAD[x.key]);
  const parts = [];
  const nm = `<b>${esc(name)}</b>`;
  // 1. Rol en kenmerk
  const traits = s.slice(0, 2).map(x => GOOD[x.key]).filter((v, i, a) => a.indexOf(v) === i);
  const flaws = w.slice(0, 2).map(x => BAD[x.key]).filter((v, i, a) => a.indexOf(v) === i);
  if (s.length) parts.push(`${nm} is ${ROLE[s[0].key]} van het team: ${joinAnd(traits)}${flaws.length ? `, maar ${joinAnd(flaws)}` : ''}.`);
  else parts.push(`${nm} doet vooral het werk in de schaduw${flaws.length ? `, maar ${joinAnd(flaws)}` : ''}.`);
  // 2. Vorm van de laatste vijf (coach-logica §9c), in woorden.
  const t = window.PlayerCard.tier(name);
  if (t.tier === 'top') parts.push('Zit in topvorm: de laatste vijf potten op hoog niveau, en het team won er de meeste van.');
  else if (t.tier === 'zwart') parts.push(t.level >= 7.5 ? 'Zit in vorm: de laatste vijf potten op hoog niveau.' : 'Zit in vorm: de laatste vijf potten beter dan het eigen normaal, met winst erbij.');
  else if (t.growth !== null && t.growth <= -0.3) parts.push('De laatste vijf potten vielen wat tegen vergeleken met het eigen normaal.');
  else if (t.level !== null && rows.length >= 5) parts.push('De laatste vijf potten lagen op het eigen normale niveau.');
  return parts.join(' ');
}

// ---------- tabblad Per sessie ----------
const pTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const pDay = ts => { const s = new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const PS_METRICS = [
  { label: 'schoten', per: true, hib: true, f: p => p.shots },
  { label: 'balacties', per: true, hib: null, f: p => p.ev?.ball_actions },
  { label: 'dribbels', per: true, hib: true, f: p => p.ev?.dribbles_completed },
  { label: 'balverlies', per: true, hib: false, f: p => p.ev?.possession_lost },
  { label: 'onderscheppingen', per: true, hib: true, f: p => p.ev?.interceptions },
  { label: 'steekpasses', per: true, hib: true, f: p => p.ev?.through_balls },
  { label: 'passnauwkeurigheid', pct: true, hib: true, n: p => p.passesMade, d: p => p.passAttempts },
  { label: 'uit positie', pct: true, hib: false, n: p => p.ev?.out_of_position, d: p => (p.ev?.out_of_position || 0) + (p.ev?.in_position || 0) },
];
const psValue = (mt, rows) => {
  if (mt.pct) { const d = sum(rows, r => mt.d(r.p)); return d >= 10 ? 100 * sum(rows, r => mt.n(r.p)) / d : null; }
  const m = minutes(rows); return m >= 60 ? 90 * sum(rows, r => mt.f(r.p)) / m : null;
};
function notesFor(here, there) {
  const out = [];
  for (const mt of PS_METRICS) {
    const a = psValue(mt, here), b = psValue(mt, there); if (a === null || b === null || !b) continue;
    const rel = (a - b) / Math.abs(b); if (Math.abs(rel) < 0.3) continue;
    const better = mt.hib === null ? null : mt.hib ? a > b : a < b;
    out.push({ rel: Math.abs(rel), better, text: `${a > b ? 'meer' : 'minder'} ${mt.label}`, html: `<span class="${better === null ? '' : better ? 'delta-pos' : 'delta-neg'}">${a > b ? 'meer' : 'minder'} ${mt.label}</span> (${mt.pct ? Math.round(a) + '%' : a.toFixed(1)} tegen ${mt.pct ? Math.round(b) + '%' : b.toFixed(1)}${mt.pct ? '' : ' per 90'})` });
  }
  return out.sort((x, y) => y.rel - x.rel);
}

function renderSessionsTab(name) {
  const all = rowsFor(DATA.matches, name);
  const avgAll = avg(all.map(r => r.p.rating).filter(v => v !== null));
  const sess = sessionsOf(DATA.matches).map(s => ({ ...s, rows: s.matches.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p) })).filter(s => s.rows.length);
  if (!sess.length) { $('#ps-summary').textContent = 'Nog geen sessies van deze speler.'; $('#ps-chart').innerHTML = ''; $('#ps-cards').innerHTML = ''; return; }
  const items = sess.map(s => {
    const others = all.filter(r => r.m.session !== s.id);
    const r = avg(s.rows.map(x => x.p.rating).filter(v => v !== null)), normal = avg(others.map(x => x.p.rating).filter(v => v !== null));
    return { s, r, normal, d: normal === null ? null : r - normal, g: sum(s.rows, x => x.p.goals), a: sum(s.rows, x => x.p.assists), mom: sum(s.rows, x => x.p.mom) };
  });
  $('#ps-title').textContent = `${name} per sessie`;
  const best = [...items].filter(i => i.d !== null).sort((a, b) => b.d - a.d)[0], worst = [...items].filter(i => i.d !== null).sort((a, b) => a.d - b.d)[0];
  const trend = items.length >= 3 ? items[items.length - 1].r - avg(items.slice(0, -1).map(i => i.r)) : null;
  const parts = [`<b>${esc(name)}</b> speelde ${numWord(items.length)} ${items.length === 1 ? 'sessie' : 'sessies'} mee.`];
  if (best && best !== worst && best.d >= 0.3) parts.push(`De beste avond was ${pDay(best.s.matches[0].ts).toLowerCase()}${best.g + best.a ? `, met ${joinAnd([best.g ? `${numWord(best.g)} ${best.g === 1 ? 'goal' : 'goals'}` : '', best.a ? `${numWord(best.a)} ${best.a === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean))}` : ''}.`);
  if (worst && best !== worst && worst.d <= -0.3) parts.push(`De minste was ${pDay(worst.s.matches[0].ts).toLowerCase()}.`);
  if (trend !== null) parts.push(Math.abs(trend) < 0.3 ? 'De laatste sessie lag op het normale niveau.' : trend > 0 ? 'De laatste sessie was beter dan de avonden daarvoor.' : 'De laatste sessie was minder dan de avonden daarvoor.');
  $('#ps-summary').innerHTML = parts.join(' ');
  barChart($('#ps-chart'), items.map(i => ({ label: pDay(i.s.matches[0].ts).split(' ').slice(1, 3).join(' '), value: i.d === null ? 0 : +i.d.toFixed(2), color: (i.d ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)',
    tip: `<b>${pDay(i.s.matches[0].ts)}</b>rating ${f2(i.r)} tegen normaal ${f2(i.normal)}<br>${i.g} goals, ${i.a} assists in ${i.s.rows.length} wedstrijden` })), { yMin: -0.5, zeroLine: true, height: 180, fmt: v => (v > 0 ? '+' : '') + v });
  $('#ps-cards').innerHTML = [...items].reverse().map(i => `<section class="card ps-card">
    <div class="ps-card-head"><div><h2>${pDay(i.s.matches[0].ts)}</h2><div class="pcard-sub">${i.s.rows.length} van ${i.s.matches.length} wedstrijden · ${pills(i.s.rows.map(x => x.m))}</div></div>
      <div class="pcard-rating">${f2(i.r)} <small>${i.d === null ? '' : residCell(i.d)}</small></div></div>
    <div class="pcard-stats"><span><b>${i.g}</b> goals</span><span><b>${i.a}</b> assists</span><span><b>${i.mom}</b> MOTM</span><span>${[...new Set(i.s.rows.map(x => archName(x.p.archetypeId)))].join(', ')}</span></div>
    <a class="more-link" href="sessies.html#${i.s.id}">Naar deze sessie</a></section>`).join('');
}

// ---------- tabblad Laatste wedstrijd ----------
function renderLastTab(name) {
  const all = rowsFor(DATA.matches, name);
  if (!all.length) { $('#pl-summary').textContent = 'Nog geen wedstrijden.'; return; }
  const last = all[all.length - 1], others = all.slice(0, -1), m = last.m, p = last.p;
  $('#pl-score').innerHTML = `<div class="sl-team">${kitShirt(DATA.club.kits?.home, 'Frambroos')}<span>Frambroos</span></div>
    <div class="sl-score"><span>${m.goals}–${m.goalsAgainst}</span><span class="pill ${m.result}">${m.result === 'W' ? 'Gewonnen' : m.result === 'L' ? 'Verloren' : 'Gelijk'}</span></div>
    <div class="sl-team">${kitShirt(m.opponent.kit, m.opponent.name)}<span>${esc(m.opponent.name)}</span></div>`;
  $('#pl-meta').innerHTML = `${pDay(m.ts)}, ${pTime(m.ts)} · ${POS_NL[p.pos] || p.pos} · ${esc(archName(p.archetypeId))} · rating ${p.rating}${p.mom ? ' · man van de wedstrijd' : ''} · <a href="wedstrijd.html?id=${m.matchId}">hele wedstrijd</a>`;
  const normal = avg(others.map(r => r.p.rating).filter(v => v !== null)), d = normal === null ? null : p.rating - normal;
  const notes = others.length >= 3 ? notesFor([last], others) : [];
  const bits = [p.goals ? `${numWord(p.goals)} ${p.goals === 1 ? 'doelpunt' : 'doelpunten'}` : '', p.assists ? `${numWord(p.assists)} ${p.assists === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean);
  const level = d === null ? '' : d >= 0.5 ? 'een van de betere wedstrijden' : d <= -0.5 ? 'een mindere wedstrijd' : 'een wedstrijd op het normale niveau';
  const parts = [`In de laatste wedstrijd, tegen ${esc(m.opponent.name)}, speelde <b>${esc(name)}</b> ${level}${bits.length ? `, met ${joinAnd(bits)}` : ''}${p.mom ? ', en was man van de wedstrijd' : ''}.`];
  const good = notes.filter(n => n.better).slice(0, 2).map(n => n.text), bad = notes.filter(n => n.better === false).slice(0, 2).map(n => n.text);
  if (good.length && bad.length) parts.push(`Opvallend: ${joinAnd(good)} dan normaal, maar ook ${joinAnd(bad)}.`);
  else if (good.length) parts.push(`Opvallend: ${joinAnd(good)} dan normaal.`);
  else if (bad.length) parts.push(`Opvallend: ${joinAnd(bad)} dan normaal.`);
  $('#pl-summary').innerHTML = parts.join(' ');
  $('#pv-cards').innerHTML = all.slice(-8).reverse().map(r => matchCard(r.m, { own: DATA.snapshot?.skillRating, player: name })).join('');
  const rows = [
    ['Rating', p.rating, normal, true, f2], ...(p.fi !== null ? [['Frambroos-index', Math.round(p.fi), avg(others.map(r => r.p.fi).filter(x => x !== null)), true, f0]] : []), ['Goals', p.goals, avg(others.map(r => r.p.goals)), true, f1], ['Assists', p.assists, avg(others.map(r => r.p.assists)), true, f1], ...(p.ev ? [['Tweede assists', p.ev.second_assists || 0, avg(evRows(others).map(r => r.p.ev.second_assists || 0)), true, f1]] : []),
    ['Schoten', p.shots, avg(others.map(r => r.p.shots)), true, f1], ['Passnauwkeurigheid', pct(p.passesMade, p.passAttempts), pct(sum(others, r => r.p.passesMade), sum(others, r => r.p.passAttempts)), true, v => v === null ? '–' : `${v}%`],
    ['Tackles gewonnen', p.tacklesMade, avg(others.map(r => r.p.tacklesMade)), true, f1],
    ...(p.ev ? [['Balacties', p.ev.ball_actions, avg(evRows(others).map(r => r.p.ev.ball_actions)), null, f1], ['Dribbels', p.ev.dribbles_completed, avg(evRows(others).map(r => r.p.ev.dribbles_completed)), true, f1],
      ['Tegenstanders uitgespeeld', p.ev.players_beaten, avg(evRows(others).map(r => r.p.ev.players_beaten)), true, f1], ['Balverlies', p.ev.possession_lost, avg(evRows(others).map(r => r.p.ev.possession_lost)), false, f1],
      ['Onderscheppingen', p.ev.interceptions, avg(evRows(others).map(r => r.p.ev.interceptions)), true, f1], ['Steekpasses', p.ev.through_balls, avg(evRows(others).map(r => r.p.ev.through_balls)), true, f1]] : []),
  ];
  table($('#pl-compare'), [
    { label: '', key: 0 }, { label: 'Deze wedstrijd', num: true, render: r => r[4](r[1]) }, { label: 'Normaal', num: true, render: r => r[4](r[2]) },
    { label: 'Verschil', num: true, render: r => { if (r[1] === null || r[2] === null) return '–'; const d = r[1] - r[2], rel = r[2] ? Math.abs(d / r[2]) : 1; const good = r[3] === null ? null : r[3] ? d > 0 : d < 0; return `<span class="${rel < 0.15 || good === null ? '' : good ? 'delta-pos' : 'delta-neg'}">${d > 0 ? '+' : ''}${r[4] === f2 ? d.toFixed(2) : String(r[4]).includes('%') ? Math.round(d) + ' pt' : d.toFixed(1)}</span>`; } },
  ], rows);
}

// ---------- aan de bal in context (docs/coach-logica.md §4a) ----------
function renderContext(name, ms) {
  const { res, scope, arch, ctx } = window.BuildTab.context(name, new Set(ms.map(m => m.matchId)));
  $('#ctx-group').textContent = scope.byArch ? `andere ${archName(arch)}s` : 'spelers op dezelfde positie';
  const T = scope.byArch ? `Tegenover andere ${archName(arch)}s` : 'Tegenover spelers op dezelfde positie';
  // Badge: verschil met de vergelijkingsgroep in procenten. good: true/false/null (null = context, geen oordeel).
  const badge = (x, good) => { if (!x) return null; const r = (x.v - x.b) / Math.abs(x.b); if (Math.abs(r) < 0.05) return { txt: '±0%', good: null, title: T };
    return { txt: `${r > 0 ? '+' : '−'}${Math.round(Math.abs(r) * 100)}%`, good: good === null ? null : good ? r > 0 : r < 0, title: T }; };
  const tile = (label, k, val, meta, good) => kpiTile(label, res[k] ? val(res[k].v) : '–', res[k] ? `${meta} · groep ${val(res[k].b)}` : 'nog te weinig minuten', badge(res[k], good));
  const pc = v => `${Math.round(v * 100)}%`;
  $('#ctx-tiles').innerHTML = [
    tile('Aan de bal', 'act90', v => v.toFixed(0), 'balacties per 90', null),
    tile('Mensen voorbij', 'beaten', v => v.toFixed(1), 'uitgespeeld per 90', true),
    tile('Dribbels', 'dribbles', v => v.toFixed(1), 'geslaagd per 90', null),
    tile('Creëren', 'create90', v => v.toFixed(1), 'steekpasses en assists per 90', true),
    tile('Zonder opties', 'noOptShare', pc, 'van de balmomenten', null),
    tile('Balverlies', 'ballLoss', pc, res.lossAtt ? `per balactie · ${pc(res.lossAtt.v)} voorin` : 'per balactie', false),
  ].join('');
  const y = res.yieldPerLoss;
  $('#ctx-figs').innerHTML = y ? figsHtml([{ label: 'Opbrengst per verloren bal', color: 'var(--pos)', value: y.v.toFixed(1), delta: badge(y, true) }]) : '';
  const tone = ctx.good === true ? 'good' : ctx.good === false ? 'bad' : '';
  $('#ctx-verdict').innerHTML = `<div class="ctx-claim ${tone}">${ctx.title}</div><p>${[ctx.means, ...ctx.extra].join(' ')}</p>${ctx.play.length ? `<ul class="ctx-tips">${ctx.play.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}`;
}

function renderPlayer() {
  const ms = filtered(), players = DATA.players;
  if (!selected || !players.includes(selected)) selected = players.includes('Neegek') ? 'Neegek' : players[0];
  location.hash = encodeURIComponent(selected);
  $('#chips').innerHTML = players.map(p => `<button type="button" class="chip ${p === selected ? 'active' : ''}" data-p="${esc(p)}">${esc(p)}</button>`).join('');
  for (const b of $('#chips').querySelectorAll('.chip')) b.addEventListener('click', () => { selected = b.dataset.p; renderPlayer(); });

  const rows = rowsFor(ms, selected), career = DATA.members.find(x => x.name === selected);
  const s = summarize(rows.map(r => r.m));
  const posCount = {}; for (const r of rows) posCount[r.p.pos] = (posCount[r.p.pos] || 0) + 1;
  const posText = Object.entries(posCount).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${POS_NL[p] || p} (${n})`).join(', ');
  const buildCount = {}; for (const r of rows) if (r.p.archetypeId) buildCount[r.p.archetypeId] = (buildCount[r.p.archetypeId] || 0) + 1;
  const buildText = Object.entries(buildCount).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${archName(id)} (${n})`).join(', ');
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null);
  // Rating, goals, assists en carrièrecijfers staan al op de spelerskaart; hier alleen wat daar niet staat.
  const fi = fiForRows(rows.map(r => r.p).filter(p => p.fi !== null));
  // Drie kaartjes naast de samenvatting: highlights (per wedstrijd en precisie samen), Frambroos-index en het resultaat
  // met deze speler erbij.
  const n = rows.length || 1, g = sum(rows, r => r.p.goals), as = sum(rows, r => r.p.assists), sa = sum(evRows(rows), r => r.p.ev.second_assists);
  const sh = sum(rows, r => r.p.shots), pm = sum(rows, r => r.p.passesMade), pa = sum(rows, r => r.p.passAttempts), tm = sum(rows, r => r.p.tacklesMade), ta = sum(rows, r => r.p.tackleAttempts);
  const hl = (label, v) => `<div class="hl-row"><span>${label}</span><b>${v}</b></div>`;
  // Highlights: links wat iemand per wedstrijd oplevert, rechts hoe nauwkeurig; per rij wat bij elkaar hoort.
  const cell = (label, v, frac = '') => `<div><span>${label}</span><b>${v}</b>${frac ? `<small>${frac}</small>` : ''}</div>`;
  const prec = (label, num, den) => cell(label, den ? fmtPct(pct(num, den)) : '–', `${num}/${den}`);
  const bar = (label, v) => `<div class="fi-bar"><span>${label}</span><i style="--w:${Math.max(2, Math.min(100, v ?? 0))}%"></i><b>${fiFmt(v)}</b></div>`;
  $('#p-cards').innerHTML = [
    `<section class="card"><h2>Highlights</h2><div class="hl-grid">
      <span class="hl-col">Per wedstrijd</span><span class="hl-col">Precisie</span>
      ${cell('Goals', f2(g / n))}${prec('Conversie', g, sh)}
      ${cell('Assists', f2(as / n))}${prec('Pass', pm, pa)}
      ${cell('Betrokken bij goals', f2((g + as + sa) / n))}${prec('Duels', tm, ta)}</div></section>`,
    `<section class="card"><h2>Frambroos-index</h2><div class="fi-card"><span class="fi-num">${fiFmt(fi.score)}</span><span class="fi-label">${fi.score === null ? 'minstens 3 wedstrijden' : fiLabel(fi.score)}</span><div class="fi-bars">${bar('Afronden', fi.parts.shoot)}${bar('Creëren', fi.parts.pass)}${bar('Aan de bal', fi.parts.ball)}${bar('Verdedigen', fi.parts.defend)}</div></div></section>`,
    `<section class="card"><h2>Resultaat met deze speler</h2>${hl('Gewonnen', s.n ? `${fmtPct(s.winPct)}` : '–')}${hl('Winst, gelijk, verlies', s.n ? `${s.W}-${s.D}-${s.L}` : '–')}${hl('Doelsaldo per wedstrijd', s.n ? signed(s.gfAvg - s.gaAvg, 1) : '–')}</section>`,
  ].join('');

  const table_ = metricTable(ms, players);
  const sw = strengthsWeaknesses(selected, table_);
  const fill = (id, items, empty) => { $(id).innerHTML = items.length ? items.join('') : `<li class="empty">${empty}</li>`; };
  fill('#list-strengths', sw.strengths.slice(0, 3), 'Nog geen maat waarop deze speler bovenaan staat.');
  fill('#list-weaknesses', sw.weaknesses.slice(0, 3), 'Nog geen maat waarop deze speler duidelijk onderaan staat.');
  $('#p-summary').innerHTML = playerSummary(selected, rows, career, sw);
  // Drie cijfers over de gekozen periode (coach-logica §9a); de rest staat achter Meer cijfers.
  const three = (label, value, sub) => `<div class="sfig"><span class="sfig-label">${label}</span><span class="sfig-value">${value}</span><span class="sfig-sub">${sub}</span></div>`;
  $('#p-three').innerHTML = rows.length ? [
    three('Goals per wedstrijd', f2(g / n), `${g} in ${rows.length} wedstrijden`),
    three('Assists per wedstrijd', f2(as / n), `${as} in ${rows.length} wedstrijden`),
    three('Gewonnen', fmtPct(s.winPct), `${s.W}-${s.D}-${s.L} met deze speler`),
  ].join('') : '';
  renderContext(selected, ms);
  window.PlayerCard.render(selected);
  document.title = `${selected} · Frambroos Coach`;
  renderSessionsTab(selected);
  renderLastTab(selected);
  window.BuildTab.show(selected);

  table($('#tbl-player-matches'), [
    { label: 'Datum', render: r => fmtDateTime(r.m.ts) }, { label: 'Tegenstander', render: r => `<a href="wedstrijd.html?id=${r.m.matchId}">${esc(r.m.opponent.name)}</a>` },
    { label: 'Score', num: true, render: r => `${r.m.goals}–${r.m.goalsAgainst}` }, { label: 'Uitslag', render: r => `<span class="pill ${r.m.result}">${r.m.result === 'D' ? 'G' : r.m.result === 'L' ? 'V' : 'W'}</span>` },
    { label: 'Rating', num: true, render: r => r.p.rating }, { label: 'Index', num: true, render: r => fiFmt(r.p.fi) }, { label: 'G + A', num: true, render: r => `${r.p.goals} + ${r.p.assists}` },
  ], [...rows].reverse().map((r, i) => ({ ...r, i })), { rowClass: r => r.i >= PM_SHOWN ? 'pm-extra' : '' });
  // Eerst de laatste acht; de rest achter een knop.
  const wrap = $('#tbl-player-matches'), extra = rows.length - PM_SHOWN;
  wrap.classList.remove('show-all');
  if (extra > 0) {
    wrap.insertAdjacentHTML('beforeend', `<button type="button" class="more-btn">Alle ${rows.length} wedstrijden</button>`);
    wrap.querySelector('.more-btn').addEventListener('click', e => { wrap.classList.add('show-all'); e.currentTarget.remove(); });
  }
}
const PM_SHOWN = 8;

for (const id of ['#range', '#type']) $(id).addEventListener('change', () => DATA && renderPlayer());
addEventListener('resize', () => DATA && renderPlayer());
// Andere speler in het menu: meteen tekenen als de data er is, anders onthouden voor zodra die geladen is.
addEventListener('hashchange', () => { const n = decodeURIComponent(location.hash.slice(1)); if (n && n !== selected) { selected = n; if (DATA) renderPlayer(); } });
selected = decodeURIComponent(location.hash.slice(1)) || null;
// Tabbladen: Overzicht en Build en advies. De keuze blijft bewaard tijdens de sessie.
function setTab(tab) {
  for (const [id, panel] of [['overview', '#tab-overview'], ['sessions', '#tab-sessions'], ['build', '#tab-build']]) {
    const on = id === tab;
    $(panel).hidden = !on;
    $(`#tab-btn-${id}`).setAttribute('aria-selected', String(on));
    $(`#tab-btn-${id}`).classList.toggle('active', on);
  }
  $('.filters').style.display = tab === 'overview' ? '' : 'none';
  if (DATA) renderPlayer();
  try { sessionStorage.setItem('spelersTab', tab); } catch {}
}
$('#tab-btn-overview').addEventListener('click', () => setTab('overview'));
$('#tab-btn-build').addEventListener('click', () => setTab('build'));
$('#tab-btn-sessions').addEventListener('click', () => setTab('sessions'));
let startTab = 'overview'; try { startTab = sessionStorage.getItem('spelersTab') || 'overview'; } catch {}
if (startTab === 'last') startTab = 'sessions'; // Laatste wedstrijd zit nu in Vorm
if (new URLSearchParams(location.search).get('tab') === 'build') startTab = 'build';
setTab(startTab);
window.rerender = () => renderPlayer(); // thema wisselen: kaart opnieuw in thuis- of uitkleuren
Promise.all([loadData(), window.BuildTab.load(), window.PlayerCard.load()]).then(renderPlayer).catch(showError);
