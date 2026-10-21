// Spelerspagina: berekende samenvatting per speler (sterk in, kan beter, floreert als, speelt minder als).
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

const CONF = (nA, nB) => { const n = Math.min(nA, nB); return n >= 8 ? 'sterk' : n >= 5 ? 'redelijk' : 'zwak'; };
const tag = c => `<span class="tag ${c}">${c}</span>`;
const li = (claim, evidence, conf) => `<li><div class="claim">${claim}${conf ? tag(conf) : ''}</div><div class="evidence">${evidence}</div></li>`;
const signed = (v, d = 1) => v === null ? '–' : `${v > 0 ? '+' : ''}${(+v).toFixed(d)}`;

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

function profileChart(container, name, table) {
  container.innerHTML = '';
  const items = table.filter(mt => mt.values.some(x => x.name === name) && mt.team).map(mt => {
    const v = mt.values.find(x => x.name === name).v;
    const rel = mt.hib ? (v - mt.team) / Math.abs(mt.team) : (mt.team - v) / Math.abs(mt.team);
    return { mt, v, rel: Math.max(-1, Math.min(1, rel)) * 100 };
  });
  if (!items.length) { container.innerHTML = '<p class="empty">Nog te weinig wedstrijden voor een profiel.</p>'; return; }
  const width = Math.max(320, Math.min(1100, container.clientWidth || 800)), rowH = 24, left = 230, height = items.length * rowH + 28;
  const svg = el('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}`, role: 'img' }); container.appendChild(svg);
  const x0 = left, w = width - left - 16, sx = v => x0 + w / 2 + (v / 100) * (w / 2);
  const g = el('g', { class: 'grid' }, svg);
  for (const t of [-100, -50, 0, 50, 100]) { el('line', { x1: sx(t), x2: sx(t), y1: 0, y2: items.length * rowH, stroke: t === 0 ? 'var(--axis)' : undefined }, g); text(svg, sx(t), items.length * rowH + 16, `${t > 0 ? '+' : ''}${t}%`, { class: 'tick', 'text-anchor': 'middle' }); }
  items.forEach((it, i) => {
    const y = i * rowH + 4, h = rowH - 8;
    text(svg, left - 10, y + h - 3, it.mt.label, { 'text-anchor': 'end' });
    const a = sx(0), b = sx(it.rel), x = Math.min(a, b), bw = Math.max(2, Math.abs(b - a));
    el('rect', { x, y, width: bw, height: h, rx: 4, fill: it.rel >= 0 ? 'var(--pos)' : 'var(--neg)' }, svg);
    const hit = el('rect', { class: 'hit', x: 0, y: i * rowH, width, height: rowH }, svg);
    hit.addEventListener('mousemove', e => showTip(`<b>${esc(it.mt.label)}</b>${esc(name)}: ${it.mt.fmt(it.v)} · team: ${it.mt.fmt(it.mt.team)}<br>${it.mt.hib ? 'hoger is beter' : 'lager is beter'} · plek ${it.mt.rank[name]} van ${it.mt.values.length}`, e));
    hit.addEventListener('mouseleave', hideTip);
  });
}

function strengthsWeaknesses(name, table) {
  const strengths = [], weaknesses = [];
  for (const mt of table) {
    const me = mt.values.find(x => x.name === name); if (!me || mt.values.length < 3) continue;
    const k = mt.values.length, rank = mt.rank[name];
    const gap = mt.hib ? (me.v - mt.team) / Math.abs(mt.team) : (mt.team - me.v) / Math.abs(mt.team);
    const conf = me.n >= 10 ? 'sterk' : me.n >= 6 ? 'redelijk' : 'zwak';
    const ev = `${mt.fmt(me.v)} tegenover ${mt.fmt(mt.team)} voor het team · plek ${rank} van ${k} · ${me.n} wedstrijden`;
    if ((rank === 1 && gap >= 0.1) || (rank === 2 && gap >= 0.3)) strengths.push({ gap, html: li(`${rank === 1 ? 'Beste van het team' : 'Top twee'} in ${mt.label.toLowerCase()}`, ev, conf) });
    if ((rank === k && gap <= -0.1) || (rank === k - 1 && gap <= -0.3)) weaknesses.push({ gap, html: li(`${rank === k ? 'Laagste van het team' : 'Onderaan'} in ${mt.label.toLowerCase()}`, ev, conf) });
  }
  return { strengths: strengths.sort((a, b) => b.gap - a.gap).map(x => x.html), weaknesses: weaknesses.sort((a, b) => a.gap - b.gap).map(x => x.html) };
}

function conditions(name, ms, players) {
  const rows = rowsFor(ms, name); if (rows.length < 6) return { thrives: [], struggles: [] };
  const share = r => { const t = r.m.players.reduce((a, p) => a + actionsOf(p), 0); return t ? actionsOf(r.p) / t : 0; };
  const med = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const shareMed = med(rows.map(share));
  const teamFwd = r => { const e = r.m.players.filter(p => p.ev); const c = e.reduce((a, p) => a + p.ev.passes_completed, 0); return c ? e.reduce((a, p) => a + p.ev.passes_completed_forward, 0) / c : null; };
  const fwdMed = med(rows.map(teamFwd).filter(v => v !== null));
  const splits = [];
  for (const t of players) if (t !== name) splits.push({ label: `${t} meespeelt`, neg: `${t} er niet bij is`, test: r => r.m.players.some(p => p.name === t) });
  const positions = [...new Set(rows.map(r => r.p.pos))];
  if (positions.length > 1) for (const pos of positions) splits.push({ label: `hij als ${POS_NL[pos] || pos} speelt`, neg: `hij niet als ${POS_NL[pos] || pos} speelt`, test: r => r.p.pos === pos });
  splits.push({ label: 'hij veel aan de bal komt', neg: 'hij weinig aan de bal komt', test: r => share(r) >= shareMed });
  splits.push({ label: 'het de 1e of 2e pot van de avond is', neg: 'het de 3e pot of later is', test: r => r.m.posInSession <= 2 });
  splits.push({ label: 'de tegenstander skill rating 1700 of hoger heeft', neg: 'de tegenstander zwakker is', test: r => (r.m.opponent.skillRating || 0) >= 1700 });
  splits.push({ label: 'de tegenstander 4 of meer mensen heeft', neg: 'de tegenstander 3 of minder mensen heeft', test: r => r.m.opponentPlayers.length >= 4 });
  splits.push({ label: 'jullie met 6 spelen', neg: 'jullie met 5 of minder spelen', test: r => r.m.players.length >= 6 });
  if (fwdMed !== null) splits.push({ label: 'het team veel vooruit speelt', neg: 'het team weinig vooruit speelt', test: r => (teamFwd(r) ?? 0) >= fwdMed });
  splits.push({ label: 'het een leaguewedstrijd is', neg: 'het een playoffwedstrijd is', test: r => r.m.matchType === 'leagueMatch' });
  const out = [];
  for (const s of splits) {
    const A = rows.filter(s.test), B = rows.filter(r => !s.test(r));
    if (A.length < 3 || B.length < 3) continue;
    const rA = avg(A.map(r => r.p.rating).filter(v => v !== null)), rB = avg(B.map(r => r.p.rating).filter(v => v !== null));
    const eA = avg(A.map(r => r.m.resid)), eB = avg(B.map(r => r.m.resid));
    const dR = rA - rB, dE = eA - eB;
    if (Math.abs(dR) < 0.4 && Math.abs(dE) < 1) continue;
    const score = dR + dE / 3;
    const pos = score > 0;
    out.push({ score, pos, html: li(pos ? `Als ${s.label}` : `Als ${s.neg}`, `rating ${f2(pos ? rA : rB)} (${pos ? A.length : B.length} wedstrijden) tegenover ${f2(pos ? rB : rA)} (${pos ? B.length : A.length}) · team ${signed(pos ? eA : eB)} tov verwachting tegenover ${signed(pos ? eB : eA)}`, CONF(A.length, B.length)) });
  }
  out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  return { thrives: out.filter(o => o.pos).slice(0, 5).map(o => o.html), struggles: out.filter(o => !o.pos).slice(0, 5).map(o => o.html) };
}

function otherInsights(name, ms, players) {
  const rows = rowsFor(ms, name), out = [];
  if (!rows.length) return out;
  const W = rows.filter(r => r.m.result === 'W'), R = rows.filter(r => r.m.result !== 'W');
  const n = rows.length, conf = CONF(W.length, R.length);
  if (W.length >= 3 && R.length >= 3) {
    const aW = avg(W.map(r => actionsOf(r.p))), aR = avg(R.map(r => actionsOf(r.p)));
    const e = evRows(rows);
    const noW = avg(evRows(W).map(r => r.p.ev.fb_no_good_option)), noR = avg(evRows(R).map(r => r.p.ev.fb_no_good_option));
    const lostW = avg(evRows(W).map(r => r.p.ev.possession_lost)), lostR = avg(evRows(R).map(r => r.p.ev.possession_lost));
    if (aR > aW * 1.15) out.push(li('Komt in verloren potten méér aan de bal, niet minder', `${f0(aR)} balacties per wedstrijd bij gelijk of verlies tegenover ${f0(aW)} bij winst${e.length && noR > noW ? ` · het spel meldt dan vaker "geen goede optie" (${f1(noR)} tegenover ${f1(noW)}): minder aanspeelpunten om hem heen` : ''}${e.length && lostR > lostW ? ` · balverlies ${f1(lostR)} tegenover ${f1(lostW)}` : ''}`, conf));
    else if (aW > aR * 1.15) out.push(li('Het team wint vaker als het spel via hem loopt', `${f0(aW)} balacties per wedstrijd bij winst tegenover ${f0(aR)} bij gelijk of verlies`, conf));
    const shW = sum(W, r => r.p.shots), gW = sum(W, r => r.p.goals), shR = sum(R, r => r.p.shots), gR = sum(R, r => r.p.goals);
    if (shW >= 5 && shR >= 5) { const cW = pct(gW, shW), cR = pct(gR, shR); if (cW - cR >= 15) out.push(li('Afwerking maakt het verschil', `conversie ${fmtPct(cW)} bij winst tegenover ${fmtPct(cR)} bij gelijk of verlies, bij een vergelijkbaar aantal schoten (${f1(shW / W.length)} en ${f1(shR / R.length)} per wedstrijd)`, conf)); }
    const rW = avg(W.map(r => r.p.rating)), rR = avg(R.map(r => r.p.rating));
    const all = players.map(p => { const rr = rowsFor(ms, p); const w = rr.filter(r => r.m.result === 'W'), l = rr.filter(r => r.m.result !== 'W'); return w.length >= 3 && l.length >= 3 ? { p, d: avg(w.map(r => r.p.rating)) - avg(l.map(r => r.p.rating)) } : null; }).filter(Boolean).sort((a, b) => b.d - a.d);
    const mine = all.find(x => x.p === name);
    if (mine && all[0].p === name && mine.d >= 0.6) out.push(li('Zijn vorm volgt het resultaat het sterkst van iedereen', `rating ${f2(rW)} bij winst tegenover ${f2(rR)} bij gelijk of verlies: een verschil van ${f2(mine.d)}, het grootste in het team. Als hij goed speelt, wint het team; de vraag is wat oorzaak is.`, conf));
  }
  // constantheid
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null);
  if (ratings.length >= 6) {
    const m = avg(ratings), sd = Math.sqrt(avg(ratings.map(v => (v - m) ** 2)));
    const sds = players.map(p => { const v = rowsFor(ms, p).map(r => r.p.rating).filter(x => x !== null); if (v.length < 6) return null; const mm = avg(v); return { p, sd: Math.sqrt(avg(v.map(x => (x - mm) ** 2))) }; }).filter(Boolean).sort((a, b) => a.sd - b.sd);
    if (sds.length >= 3 && sds[0].p === name) out.push(li('Meest constante speler van het team', `spreiding in rating ${f2(sd)}; laagste van ${sds.length} spelers`, 'redelijk'));
    if (sds.length >= 3 && sds[sds.length - 1].p === name) out.push(li('Grilligste speler van het team', `spreiding in rating ${f2(sd)}; hoogste van ${sds.length} spelers. Uitschieters naar boven (${f1(Math.max(...ratings))}) en beneden (${f1(Math.min(...ratings))})`, 'redelijk'));
  }
  // man of the match, kaarten
  const mom = sum(rows, r => r.p.mom), reds = sum(rows, r => r.p.redCards), yellows = sum(evRows(rows), r => r.p.ev.yellow_cards_total);
  if (mom) out.push(li(`${mom} keer man of the match`, `in ${n} wedstrijden (${fmtPct(pct(mom, n))})`, null));
  if (reds || yellows) out.push(li('Kaarten', `${yellows} geel en ${reds} rood in ${n} wedstrijden`, null));
  // carrière tegenover nu
  const career = DATA.members.find(x => x.name === name);
  if (career) {
    const recent = avg(ratings);
    if (recent !== null && career.ratingAve) { const d = recent - career.ratingAve; if (Math.abs(d) >= 0.3) out.push(li(d > 0 ? 'In betere vorm dan zijn carrièregemiddelde' : 'Onder zijn carrièregemiddelde', `rating ${f2(recent)} in de gekozen periode tegenover ${f2(career.ratingAve)} over ${career.gamesPlayed} wedstrijden volgens EA`, n >= 10 ? 'redelijk' : 'zwak')); }
    const members = [...DATA.members].sort((a, b) => b.winRate - a.winRate);
    if (members[0]?.name === name && members.length >= 3) out.push(li('Hoogste winstpercentage van de club over de hele carrière', `${career.winRate}% in ${career.gamesPlayed} wedstrijden volgens EA`, 'sterk'));
    const gaPer = career.gamesPlayed ? (career.goals + career.assists) / career.gamesPlayed : 0;
    const best = [...DATA.members].sort((a, b) => (b.goals + b.assists) / (b.gamesPlayed || 1) - (a.goals + a.assists) / (a.gamesPlayed || 1))[0];
    if (best?.name === name && career.gamesPlayed >= 20) out.push(li('Productiefste speler van de club over de hele carrière', `${f2(gaPer)} goals plus assists per wedstrijd (${career.goals} goals, ${career.assists} assists in ${career.gamesPlayed} wedstrijden)`, 'sterk'));
  }
  return out;
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
  $('#p-name').textContent = selected;
  $('#p-meta').textContent = `${career ? `Pro ${career.proName} · overall ${career.proOverall} · voorkeur ${POS_NL[career.favoritePosition] || career.favoritePosition} · ` : ''}${rows.length} wedstrijden in de gekozen periode${posText ? ` als ${posText}` : ''}`;
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null);
  const tiles = [
    ['Rating', ratings.length ? f2(avg(ratings)) : '–', career ? `carrière ${career.ratingAve}` : ''],
    ['Punten per wed. met hem', s.ppg ?? '–', `${s.W}W ${s.D}G ${s.L}V`],
    ['Tov verwachting', s.resid === null ? '–' : signed(s.resid, 2), 'team, als hij speelt'],
    ['Goals + assists', `${sum(rows, r => r.p.goals)} + ${sum(rows, r => r.p.assists)}`, career ? `carrière ${career.goals} + ${career.assists}` : ''],
    ['Minuten per wed.', rows.length ? f0(minutes(rows) / rows.length) : '–', ''],
  ];
  $('#p-tiles').innerHTML = tiles.map(([l, v, m]) => `<div class="tile"><div class="label">${l}</div><div class="value">${v}</div><div class="meta">${m}</div></div>`).join('');

  const table_ = metricTable(ms, players);
  profileChart($('#chart-profile'), selected, table_);
  const sw = strengthsWeaknesses(selected, table_), cond = conditions(selected, ms, players), other = otherInsights(selected, ms, players);
  const fill = (id, items, empty) => { $(id).innerHTML = items.length ? items.join('') : `<li class="empty">${empty}</li>`; };
  fill('#list-strengths', sw.strengths, 'Nog geen maat waarop hij bovenaan staat.');
  fill('#list-weaknesses', sw.weaknesses, 'Nog geen maat waarop hij duidelijk onderaan staat.');
  fill('#list-thrives', cond.thrives, 'Nog geen omstandigheid met een duidelijk verschil (minimaal 3 wedstrijden aan beide kanten).');
  fill('#list-struggles', cond.struggles, 'Nog geen omstandigheid met een duidelijk verschil.');
  fill('#list-other', other, 'Nog geen patronen gevonden.');

  table($('#tbl-player-matches'), [
    { label: 'Datum', render: r => fmtDateTime(r.m.ts) }, { label: 'Tegenstander', render: r => esc(r.m.opponent.name) }, { label: 'Score', num: true, render: r => `${r.m.goals}–${r.m.goalsAgainst}` },
    { label: 'Uitslag', render: r => `<span class="res-${r.m.result}">${r.m.result}</span>` }, { label: 'Tov verw.', num: true, render: r => residCell(r.m.resid) },
    { label: 'Positie', render: r => POS_NL[r.p.pos] || r.p.pos }, { label: 'Rating', num: true, render: r => r.p.rating }, { label: 'G + A', num: true, render: r => `${r.p.goals} + ${r.p.assists}` },
    { label: 'Schoten', num: true, render: r => r.p.shots }, { label: 'Pass %', num: true, render: r => fmtPct(pct(r.p.passesMade, r.p.passAttempts)) }, { label: 'Balacties', num: true, render: r => actionsOf(r.p) },
    { label: 'Dribbels', num: true, render: r => r.p.ev ? r.p.ev.dribbles_completed : '–' }, { label: 'Balverlies', num: true, render: r => r.p.ev ? r.p.ev.possession_lost : '–' }, { label: 'Uit positie', num: true, render: r => r.p.ev ? fmtPct(pct(r.p.ev.out_of_position, r.p.ev.out_of_position + r.p.ev.in_position)) : '–' },
  ], [...rows].reverse());
}

for (const id of ['#range', '#type']) $(id).addEventListener('change', renderPlayer);
addEventListener('resize', () => DATA && renderPlayer());
selected = decodeURIComponent(location.hash.slice(1)) || null;
loadData().then(renderPlayer).catch(e => { $('#club-sub').textContent = `Kon data niet laden: ${e.message}`; });
