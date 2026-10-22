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
    if ((rank === 1 && gap >= 0.1) || (rank === 2 && gap >= 0.3)) strengths.push({ gap, key: mt.key, label: mt.label.toLowerCase(), html: li(`${rank === 1 ? 'Beste van het team' : 'Top twee'} in ${mt.label.toLowerCase()}`, ev, conf) });
    if ((rank === k && gap <= -0.1) || (rank === k - 1 && gap <= -0.3)) weaknesses.push({ gap, key: mt.key, label: mt.label.toLowerCase(), html: li(`${rank === k ? 'Laagste van het team' : 'Onderaan'} in ${mt.label.toLowerCase()}`, ev, conf) });
  }
  strengths.sort((a, b) => b.gap - a.gap); weaknesses.sort((a, b) => a.gap - b.gap);
  return { strengths: strengths.map(x => x.html), weaknesses: weaknesses.map(x => x.html), sRaw: strengths, wRaw: weaknesses };
}

function conditions(name, ms, players) {
  const rows = rowsFor(ms, name); if (rows.length < 6) return { thrives: [], struggles: [], tRaw: [], sRaw: [] };
  const share = r => { const t = r.m.players.reduce((a, p) => a + actionsOf(p), 0); return t ? actionsOf(r.p) / t : 0; };
  const med = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const shareMed = med(rows.map(share));
  const teamFwd = r => { const e = r.m.players.filter(p => p.ev); const c = e.reduce((a, p) => a + p.ev.passes_completed, 0); return c ? e.reduce((a, p) => a + p.ev.passes_completed_forward, 0) / c : null; };
  const fwdMed = med(rows.map(teamFwd).filter(v => v !== null));
  const splits = [];
  for (const t of players) if (t !== name) splits.push({ label: `${t} meespeelt`, neg: `${t} er niet bij is`, test: r => r.m.players.some(p => p.name === t) });
  const positions = [...new Set(rows.map(r => r.p.pos))];
  if (positions.length > 1) for (const pos of positions) splits.push({ label: `de positie ${POS_NL[pos] || pos} is`, neg: `de positie niet ${POS_NL[pos] || pos} is`, test: r => r.p.pos === pos });
  splits.push({ label: 'er veel balcontact is', neg: 'er weinig balcontact is', test: r => share(r) >= shareMed });
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
    out.push({ score, pos, text: pos ? s.label : s.neg, html: li(pos ? `Als ${s.label}` : `Als ${s.neg}`, `rating ${f2(pos ? rA : rB)} (${pos ? A.length : B.length} wedstrijden) tegenover ${f2(pos ? rB : rA)} (${pos ? B.length : A.length}) · team ${signed(pos ? eA : eB)} tov verwachting tegenover ${signed(pos ? eB : eA)}`, CONF(A.length, B.length)) });
  }
  out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const th = out.filter(o => o.pos).slice(0, 5), st = out.filter(o => !o.pos).slice(0, 5);
  return { thrives: th.map(o => o.html), struggles: st.map(o => o.html), tRaw: th, sRaw: st };
}

function otherInsights(name, ms, players) {
  const rows = rowsFor(ms, name), out = [], claims = [];
  const push = (claim, ev, conf) => { out.push(li(claim, ev, conf)); claims.push(claim); };
  if (!rows.length) return { html: out, claims };
  const W = rows.filter(r => r.m.result === 'W'), R = rows.filter(r => r.m.result !== 'W');
  const n = rows.length, conf = CONF(W.length, R.length);
  if (W.length >= 3 && R.length >= 3) {
    const aW = avg(W.map(r => actionsOf(r.p))), aR = avg(R.map(r => actionsOf(r.p)));
    const e = evRows(rows);
    const noW = avg(evRows(W).map(r => r.p.ev.fb_no_good_option)), noR = avg(evRows(R).map(r => r.p.ev.fb_no_good_option));
    const lostW = avg(evRows(W).map(r => r.p.ev.possession_lost)), lostR = avg(evRows(R).map(r => r.p.ev.possession_lost));
    if (aR > aW * 1.15) push('Komt in verloren potten méér aan de bal, niet minder', `${f0(aR)} balacties per wedstrijd bij gelijk of verlies tegenover ${f0(aW)} bij winst${e.length && noR > noW ? ` · het spel meldt dan vaker "geen goede optie" (${f1(noR)} tegenover ${f1(noW)}): minder aanspeelpunten in de buurt` : ''}${e.length && lostR > lostW ? ` · balverlies ${f1(lostR)} tegenover ${f1(lostW)}` : ''}`, conf);
    else if (aW > aR * 1.15) push('Het team wint vaker als het spel via deze speler loopt', `${f0(aW)} balacties per wedstrijd bij winst tegenover ${f0(aR)} bij gelijk of verlies`, conf);
    const shW = sum(W, r => r.p.shots), gW = sum(W, r => r.p.goals), shR = sum(R, r => r.p.shots), gR = sum(R, r => r.p.goals);
    if (shW >= 5 && shR >= 5) { const cW = pct(gW, shW), cR = pct(gR, shR); if (cW - cR >= 15) push('Afwerking maakt het verschil', `conversie ${fmtPct(cW)} bij winst tegenover ${fmtPct(cR)} bij gelijk of verlies, bij een vergelijkbaar aantal schoten (${f1(shW / W.length)} en ${f1(shR / R.length)} per wedstrijd)`, conf); }
    const rW = avg(W.map(r => r.p.rating)), rR = avg(R.map(r => r.p.rating));
    const all = players.map(p => { const rr = rowsFor(ms, p); const w = rr.filter(r => r.m.result === 'W'), l = rr.filter(r => r.m.result !== 'W'); return w.length >= 3 && l.length >= 3 ? { p, d: avg(w.map(r => r.p.rating)) - avg(l.map(r => r.p.rating)) } : null; }).filter(Boolean).sort((a, b) => b.d - a.d);
    const mine = all.find(x => x.p === name);
    if (mine && all[0].p === name && mine.d >= 0.6) push('Eigen vorm volgt het resultaat het sterkst van iedereen', `rating ${f2(rW)} bij winst tegenover ${f2(rR)} bij gelijk of verlies: een verschil van ${f2(mine.d)}, het grootste in het team. Goed spelen en winnen gaan hier het sterkst samen; wat oorzaak is, zegt de data niet.`, conf);
  }
  // constantheid
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null);
  if (ratings.length >= 6) {
    const m = avg(ratings), sd = Math.sqrt(avg(ratings.map(v => (v - m) ** 2)));
    const sds = players.map(p => { const v = rowsFor(ms, p).map(r => r.p.rating).filter(x => x !== null); if (v.length < 6) return null; const mm = avg(v); return { p, sd: Math.sqrt(avg(v.map(x => (x - mm) ** 2))) }; }).filter(Boolean).sort((a, b) => a.sd - b.sd);
    if (sds.length >= 3 && sds[0].p === name) push('Meest constante speler van het team', `spreiding in rating ${f2(sd)}; laagste van ${sds.length} spelers`, 'redelijk');
    if (sds.length >= 3 && sds[sds.length - 1].p === name) push('Grilligste speler van het team', `spreiding in rating ${f2(sd)}; hoogste van ${sds.length} spelers. Uitschieters naar boven (${f1(Math.max(...ratings))}) en beneden (${f1(Math.min(...ratings))})`, 'redelijk');
  }
  // man of the match, kaarten
  const mom = sum(rows, r => r.p.mom), reds = sum(rows, r => r.p.redCards), yellows = sum(evRows(rows), r => r.p.ev.yellow_cards_total);
  if (mom) push(`${mom} keer man of the match`, `in ${n} wedstrijden (${fmtPct(pct(mom, n))})`, null);
  if (reds || yellows) push('Kaarten', `${yellows} geel en ${reds} rood in ${n} wedstrijden`, null);
  // carrière tegenover nu
  const career = DATA.members.find(x => x.name === name);
  if (career) {
    const recent = avg(ratings);
    if (recent !== null && career.ratingAve) { const d = recent - career.ratingAve; if (Math.abs(d) >= 0.3) push(d > 0 ? 'In betere vorm dan het carrièregemiddelde' : 'Onder het carrièregemiddelde', `rating ${f2(recent)} in de gekozen periode tegenover ${f2(career.ratingAve)} over ${career.gamesPlayed} wedstrijden volgens EA`, n >= 10 ? 'redelijk' : 'zwak'); }
    const members = [...DATA.members].sort((a, b) => b.winRate - a.winRate);
    if (members[0]?.name === name && members.length >= 3) push('Hoogste winstpercentage van de club over de hele carrière', `${career.winRate}% in ${career.gamesPlayed} wedstrijden volgens EA`, 'sterk');
    const gaPer = career.gamesPlayed ? (career.goals + career.assists) / career.gamesPlayed : 0;
    const best = [...DATA.members].sort((a, b) => (b.goals + b.assists) / (b.gamesPlayed || 1) - (a.goals + a.assists) / (a.gamesPlayed || 1))[0];
    if (best?.name === name && career.gamesPlayed >= 20) push('Productiefste speler van de club over de hele carrière', `${f2(gaPer)} goals plus assists per wedstrijd (${career.goals} goals, ${career.assists} assists in ${career.gamesPlayed} wedstrijden)`, 'sterk');
  }
  return { html: out, claims };
}

function playerSummary(name, rows, career, sw, cond, other) {
  if (!rows.length) return 'Nog geen wedstrijden van deze speler in de gekozen periode.';
  const ROLE = {
    assists90: 'de aangever', ga90: 'de aangever', conv: 'de afmaker', dribbles90: 'de dribbelaar', beaten90: 'de dribbelaar',
    through90: 'de spelmaker', fwdShare: 'de spelmaker', won90: 'de ballenafpakker', interceptions90: 'de ballenafpakker', tacklePct: 'de ballenafpakker',
    passAcc: 'de rustige kracht', lost90: 'de rustige kracht', lostDef90: 'de rustige kracht', outPos: 'de rustige kracht', noOption90: 'de rustige kracht', fouls90: 'de rustige kracht', rating: 'een vaste waarde',
  };
  const GOOD = {
    assists90: 'geeft de meeste assists', ga90: 'is bij veel goals betrokken', conv: 'maakt de kansen af', dribbles90: 'gaat graag de dribbel aan', beaten90: 'speelt tegenstanders uit',
    through90: 'geeft veel steekpasses', fwdShare: 'speelt veel vooruit', won90: 'wint veel ballen', interceptions90: 'onderschept veel', tacklePct: 'wint de duels',
    passAcc: 'passt zuiver', lost90: 'verliest weinig ballen', lostDef90: 'verliest achterin zelden de bal', outPos: 'staat bijna altijd goed', noOption90: 'heeft bijna altijd een aanspeelpunt', fouls90: 'speelt netjes', rating: 'speelt constant op niveau',
  };
  const BAD = {
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
  // 2. Wanneer het wel en niet loopt
  const th = cond.tRaw[0], sg = cond.sRaw[0];
  if (th && sg) parts.push(`Het gaat het best als ${th.text}, en minder als ${sg.text}.`);
  else if (th) parts.push(`Het gaat het best als ${th.text}.`);
  else if (sg) parts.push(`Het gaat minder als ${sg.text}.`);
  // 3. Het opvallendste patroon, in gewone taal
  const STORY = [
    ['Komt in verloren potten', `In verloren wedstrijden komt ${esc(name)} juist vaker aan de bal, maar dan met minder opties.`],
    ['Het team wint vaker als het spel via', `Als het spel via ${esc(name)} loopt, wint het team vaker.`],
    ['Afwerking maakt het verschil', 'Of het lukt, hangt vooral af van de afwerking.'],
    ['Eigen vorm volgt het resultaat', `Als ${esc(name)} goed speelt, wint het team meestal ook.`],
    ['Meest constante speler', `Daarbij is ${esc(name)} de constantste speler van het team.`],
    ['Grilligste speler', 'Het niveau wisselt wel sterk per wedstrijd.'],
  ];
  const story = STORY.find(([k]) => other.claims.some(c => c.startsWith(k)));
  if (story) parts.push(story[1]);
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
    return { s, r, normal, d: normal === null ? null : r - normal, notes: others.length >= 3 ? notesFor(s.rows, others) : [], g: sum(s.rows, x => x.p.goals), a: sum(s.rows, x => x.p.assists), mom: sum(s.rows, x => x.p.mom) };
  });
  $('#ps-title').textContent = `${name} per sessie`;
  const best = [...items].filter(i => i.d !== null).sort((a, b) => b.d - a.d)[0], worst = [...items].filter(i => i.d !== null).sort((a, b) => a.d - b.d)[0];
  const trend = items.length >= 3 ? items[items.length - 1].r - avg(items.slice(0, -1).map(i => i.r)) : null;
  const parts = [`<b>${esc(name)}</b> speelde ${numWord(items.length)} ${items.length === 1 ? 'sessie' : 'sessies'} mee.`];
  if (best && best !== worst && best.d >= 0.3) parts.push(`De beste avond was ${pDay(best.s.matches[0].ts).toLowerCase()}${best.notes.find(n => n.better) ? `, met ${best.notes.find(n => n.better).text} dan normaal` : ''}.`);
  if (worst && best !== worst && worst.d <= -0.3) parts.push(`De minste was ${pDay(worst.s.matches[0].ts).toLowerCase()}${worst.notes.find(n => n.better === false) ? `, met ${worst.notes.find(n => n.better === false).text} dan normaal` : ''}.`);
  if (trend !== null) parts.push(Math.abs(trend) < 0.3 ? 'De laatste sessie lag op het normale niveau.' : trend > 0 ? 'De laatste sessie was beter dan de avonden daarvoor.' : 'De laatste sessie was minder dan de avonden daarvoor.');
  $('#ps-summary').innerHTML = parts.join(' ');
  barChart($('#ps-chart'), items.map(i => ({ label: pDay(i.s.matches[0].ts).split(' ').slice(1, 3).join(' '), value: i.d === null ? 0 : +i.d.toFixed(2), color: (i.d ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)',
    tip: `<b>${pDay(i.s.matches[0].ts)}</b>rating ${f2(i.r)} tegen normaal ${f2(i.normal)}<br>${i.g} goals, ${i.a} assists in ${i.s.rows.length} wedstrijden` })), { yMin: -0.5, zeroLine: true, height: 180, fmt: v => (v > 0 ? '+' : '') + v });
  $('#ps-cards').innerHTML = [...items].reverse().map(i => `<section class="card ps-card">
    <div class="ps-card-head"><div><h2>${pDay(i.s.matches[0].ts)}</h2><div class="pcard-sub">${i.s.rows.length} van ${i.s.matches.length} wedstrijden · ${pills(i.s.rows.map(x => x.m))}</div></div>
      <div class="pcard-rating">${f2(i.r)} <small>${i.d === null ? '' : residCell(i.d)}</small></div></div>
    <div class="pcard-stats"><span><b>${i.g}</b> goals</span><span><b>${i.a}</b> assists</span><span><b>${i.mom}</b> MOTM</span><span>${[...new Set(i.s.rows.map(x => archName(x.p.archetypeId)))].join(', ')}</span></div>
    <div class="pcard-notes">${i.notes.length ? i.notes.slice(0, 3).map(n => `<div>${n.html}</div>`).join('') : '<small>Op het eigen normale niveau.</small>'}</div>
    <a class="more-link" href="/sessies.html#${i.s.id}">Naar deze sessie</a></section>`).join('');
}

// ---------- tabblad Laatste wedstrijd ----------
function renderLastTab(name) {
  const all = rowsFor(DATA.matches, name);
  if (!all.length) { $('#pl-summary').textContent = 'Nog geen wedstrijden.'; return; }
  const last = all[all.length - 1], others = all.slice(0, -1), m = last.m, p = last.p;
  $('#pl-score').innerHTML = `<div class="sl-team">${kitShirt(DATA.club.kits?.home, 'Frambroos')}<span>Frambroos</span></div>
    <div class="sl-score"><span>${m.goals}–${m.goalsAgainst}</span><span class="pill ${m.result}">${m.result === 'W' ? 'Gewonnen' : m.result === 'L' ? 'Verloren' : 'Gelijk'}</span></div>
    <div class="sl-team">${kitShirt(m.opponent.kit, m.opponent.name)}<span>${esc(m.opponent.name)}</span></div>`;
  $('#pl-meta').innerHTML = `${pDay(m.ts)}, ${pTime(m.ts)} · ${POS_NL[p.pos] || p.pos} · ${esc(archName(p.archetypeId))} · rating ${p.rating}${p.mom ? ' · man van de wedstrijd' : ''} · <a href="/wedstrijden.html#${m.matchId}">hele wedstrijd</a>`;
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
  const rows = [
    ['Rating', p.rating, normal, true, f2], ['Goals', p.goals, avg(others.map(r => r.p.goals)), true, f1], ['Assists', p.assists, avg(others.map(r => r.p.assists)), true, f1],
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
  const buildCount = {}; for (const r of rows) if (r.p.archetypeId) buildCount[r.p.archetypeId] = (buildCount[r.p.archetypeId] || 0) + 1;
  const buildText = Object.entries(buildCount).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${archName(id)} (${n})`).join(', ');
  $('#p-meta').textContent = `${career ? `Pro ${career.proName} · overall ${career.proOverall} · ${career.proHeight} cm · ingestelde positie ${POS_CODE[career.proPos] ?? '–'} · ` : ''}${rows.length} wedstrijden in de gekozen periode${posText ? ` als ${posText}` : ''}${buildText ? ` · builds: ${buildText}` : ''}`;
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null);
  const tiles = [
    ['Rating', ratings.length ? f2(avg(ratings)) : '–', career ? `carrière ${career.ratingAve}` : ''],
    ['Punten per wedstrijd', s.ppg ?? '–', `${s.W}W ${s.D}G ${s.L}V`],
    ['Tov verwachting', s.resid === null ? '–' : signed(s.resid, 2), 'team, met deze speler erbij'],
    ['Goals + assists', `${sum(rows, r => r.p.goals)} + ${sum(rows, r => r.p.assists)}`, career ? `carrière ${career.goals} + ${career.assists}` : ''],
    ['Minuten per wed.', rows.length ? f0(minutes(rows) / rows.length) : '–', ''],
  ];
  $('#p-tiles').innerHTML = tiles.map(([l, v, m]) => `<div class="tile"><div class="label">${l}</div><div class="value">${v}</div><div class="meta">${m}</div></div>`).join('');

  const table_ = metricTable(ms, players);
  profileChart($('#chart-profile'), selected, table_);
  const sw = strengthsWeaknesses(selected, table_), cond = conditions(selected, ms, players), other = otherInsights(selected, ms, players);
  const fill = (id, items, empty) => { $(id).innerHTML = items.length ? items.join('') : `<li class="empty">${empty}</li>`; };
  fill('#list-strengths', sw.strengths, 'Nog geen maat waarop deze speler bovenaan staat.');
  fill('#list-weaknesses', sw.weaknesses, 'Nog geen maat waarop deze speler duidelijk onderaan staat.');
  fill('#list-thrives', cond.thrives, 'Nog geen omstandigheid met een duidelijk verschil (minimaal 3 wedstrijden aan beide kanten).');
  fill('#list-struggles', cond.struggles, 'Nog geen omstandigheid met een duidelijk verschil.');
  fill('#list-other', other.html, 'Nog geen patronen gevonden.');
  $('#p-summary').innerHTML = playerSummary(selected, rows, career, sw, cond, other);
  renderSessionsTab(selected);
  renderLastTab(selected);
  window.BuildTab.show(selected);

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
addEventListener('hashchange', () => { const n = decodeURIComponent(location.hash.slice(1)); if (n && n !== selected) { selected = n; renderPlayer(); } });
selected = decodeURIComponent(location.hash.slice(1)) || null;
// Tabbladen: Overzicht en Build en advies. De keuze blijft bewaard tijdens de sessie.
function setTab(tab) {
  for (const [id, panel] of [['overview', '#tab-overview'], ['sessions', '#tab-sessions'], ['last', '#tab-last'], ['build', '#tab-build']]) {
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
$('#tab-btn-last').addEventListener('click', () => setTab('last'));
let startTab = 'overview'; try { startTab = sessionStorage.getItem('spelersTab') || 'overview'; } catch {}
if (new URLSearchParams(location.search).get('tab') === 'build') startTab = 'build';
setTab(startTab);
Promise.all([loadData(), window.BuildTab.load()]).then(renderPlayer).catch(showError);
