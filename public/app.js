// Overzichtspagina: alle correlaties worden hier in de browser berekend uit DATA (zie common.js).
// ---------- render ----------
function render() {
  const ms = filtered();
  const all = summarize(ms);
  const players = [...new Set(DATA.matches.flatMap(m => m.players.map(p => p.name)))];

  // Tegels
  const form = ms.slice(-5).map(m => `<span class="res-${m.result}">${m.result}</span>`).join(' ');
  const snap = DATA.snapshot;
  $('#tiles').innerHTML = [
    ['Wedstrijden gevolgd', all.n, snap ? `van ${snap.gamesPlayed} totaal volgens EA` : ''],
    ['Winst', fmtPct(all.winPct), `${all.W}W ${all.D}G ${all.L}V`],
    ['Punten per wedstrijd', all.ppg ?? '–', 'bij 3 / 1 / 0'],
    ['Doelpunten', `${all.gfAvg ?? '–'} – ${all.gaAvg ?? '–'}`, 'gemiddeld voor en tegen'],
    ['Vorm', form || '–', 'laatste 5'],
    ['Skill rating', snap?.skillRating ?? '–', snap ? `beste divisie ${snap.bestDivision}` : ''],
  ].map(([l, v, m]) => `<div class="tile"><div class="label">${l}</div><div class="value ${l === 'Vorm' ? 'form' : ''}">${v}</div><div class="meta">${m}</div></div>`).join('');

  // Resultaten
  const resEl = $('#chart-results');
  barChart(resEl, ms.map((m, i) => ({ label: i === 0 || ms[i - 1].session !== m.session ? fmtDate(m.ts) : '', value: m.goalDiff, color: resultColor(m.result), tip: matchTip(m) })), { yMin: -1, zeroLine: true });
  if (ms.length) legend(resEl, [{ label: 'Gewonnen', color: 'var(--pos)' }, { label: 'Gelijk', color: 'var(--neutral)' }, { label: 'Verloren', color: 'var(--neg)' }]);

  // Prestatie tegenover verwachting
  const mdl = DATA.model, c = mdl.coef;
  $('#model-hint').textContent = `Verwacht doelsaldo = ${c[0].toFixed(2)} ${c[1] < 0 ? '−' : '+'} ${Math.abs(c[1]).toFixed(2)} per 100 punten skill rating boven jullie (${DATA.snapshot?.skillRating ?? '?'}) ${c[2] < 0 ? '−' : '+'} ${Math.abs(c[2]).toFixed(2)} per extra mens bij de tegenstander. ${mdl.fitted ? `Geschat op ${mdl.n} wedstrijden.` : `Standaardwaarden; vanaf 10 wedstrijden met skill rating wordt het model op jullie eigen data geschat.`} De balk is wat jullie méér of minder deden dan verwacht.`;
  barChart($('#chart-residual'), ms.map((m, i) => ({ label: i === 0 || ms[i - 1].session !== m.session ? fmtDate(m.ts) : '', value: +m.resid.toFixed(2), color: m.resid >= 0 ? 'var(--pos)' : 'var(--neg)', tip: `${matchTip(m)}<br>verwacht ${m.expected > 0 ? '+' : ''}${m.expected.toFixed(1)}, werkelijk ${m.goalDiff > 0 ? '+' : ''}${m.goalDiff}` })), { yMin: -1, zeroLine: true });
  if (ms.length) legend($('#chart-residual'), [{ label: 'Beter dan verwacht', color: 'var(--pos)' }, { label: 'Slechter dan verwacht', color: 'var(--neg)' }]);

  // Met / zonder
  const ww = players.map(name => {
    const withP = ms.filter(m => m.players.some(p => p.name === name)), without = ms.filter(m => !m.players.some(p => p.name === name));
    const a = summarize(withP), b = summarize(without);
    const ratings = withP.map(m => m.players.find(p => p.name === name).rating).filter(r => r !== null);
    return { name, n: a.n, nWithout: b.n, withPpg: a.ppg, withoutPpg: b.ppg, delta: a.ppg !== null && b.ppg !== null ? +(a.ppg - b.ppg).toFixed(2) : null, residWith: a.resid, residWithout: b.resid, rating: avg(ratings) };
  }).sort((x, y) => (y.residWith ?? -99) - (x.residWith ?? -99));
  table($('#tbl-with-without'), [
    { label: 'Speler', key: 'name' },
    { label: 'Met: punten/wed.', num: true, render: r => `${r.withPpg ?? '–'} <small>(${r.n})</small>` },
    { label: 'Zonder', num: true, render: r => `${r.withoutPpg ?? '–'} <small>(${r.nWithout})</small>` },
    { label: 'Verschil', num: true, render: r => deltaCell(r.delta, '', 2) },
    { label: 'Tov verwachting met', num: true, render: r => residCell(r.residWith) },
    { label: 'Zonder', num: true, render: r => residCell(r.residWithout) },
    { label: 'Rating', num: true, render: r => r.rating === null ? '–' : r.rating.toFixed(2) },
  ], ww, { rowClass: r => (r.n < 5 || r.nWithout < 5) ? 'low' : '' });

  // Synergie: tweetallen
  const pairs = [];
  for (let a = 0; a < players.length; a++) for (let b = a + 1; b < players.length; b++) {
    const A = players[a], B = players[b];
    const has = (m, n) => m.players.some(p => p.name === n);
    const both = ms.filter(m => has(m, A) && has(m, B)), one = ms.filter(m => has(m, A) !== has(m, B));
    if (both.length < 3) continue;
    const sb = summarize(both), so = summarize(one);
    pairs.push({ pair: `${A} + ${B}`, nBoth: sb.n, ppgBoth: sb.ppg, residBoth: sb.resid, nOne: so.n, residOne: so.resid, synergy: sb.resid !== null && so.resid !== null ? +(sb.resid - so.resid).toFixed(2) : null });
  }
  pairs.sort((x, y) => (y.synergy ?? -99) - (x.synergy ?? -99));
  table($('#tbl-pairs'), [
    { label: 'Tweetal', key: 'pair' }, { label: 'Samen', num: true, render: r => `${r.ppgBoth} pt <small>(${r.nBoth})</small>` },
    { label: 'Tov verwachting samen', num: true, render: r => residCell(r.residBoth) },
    { label: 'Apart', num: true, render: r => `${residCell(r.residOne)} <small>(${r.nOne})</small>` },
    { label: 'Synergie', num: true, render: r => residCell(r.synergy) },
  ], pairs, { empty: 'Nog geen tweetal dat zowel samen als apart speelde.', rowClass: r => (r.nBoth < 5 || r.nOne < 3) ? 'low' : '' });

  // Opstellingen
  const groups = new Map();
  for (const m of ms) { if (!groups.has(m.lineup)) groups.set(m.lineup, []); groups.get(m.lineup).push(m); }
  const lineups = [...groups].map(([lineup, list]) => ({ lineup, ...summarize(list) })).filter(l => l.n >= 2).sort((a, b) => b.n - a.n || b.winPct - a.winPct);
  table($('#tbl-lineups'), [
    { label: 'Opstelling', wrap: true, render: r => esc(r.lineup) }, { label: 'N', num: true, key: 'n' },
    { label: 'Punten/wed.', num: true, render: r => `<span class="bar" style="width:${r.ppg * 20}px"></span>${r.ppg}` },
    { label: 'W-G-V', num: true, render: r => `${r.W}-${r.D}-${r.L}` }, { label: 'Tov verwachting', num: true, render: r => residCell(r.resid) }, { label: 'Voor–tegen', num: true, render: r => `${r.gfAvg} – ${r.gaAvg}` },
  ], lineups, { empty: 'Nog geen opstelling met 2 of meer wedstrijden.' });

  // Betrokkenheid: aandeel van een speler in de balacties van het team
  const actions = p => p.ev ? p.ev.ball_actions : (p.passAttempts || 0) + (p.shots || 0) + (p.tackleAttempts || 0);
  const invRows = ms.map(m => { const total = m.players.reduce((a, p) => a + actions(p), 0); return { m, total, byName: Object.fromEntries(m.players.map(p => [p.name, { acts: actions(p), share: total ? actions(p) / total : null, passes: p.passAttempts || 0 }])) }; });
  const invTable = players.map(name => {
    const rows = invRows.filter(r => r.byName[name]?.share !== null && r.byName[name] !== undefined);
    if (!rows.length) return null;
    const shares = rows.map(r => r.byName[name].share).sort((x, y) => x - y);
    const median = shares[Math.floor(shares.length / 2)];
    const high = rows.filter(r => r.byName[name].share >= median).map(r => r.m), low = rows.filter(r => r.byName[name].share < median).map(r => r.m);
    const wins = rows.filter(r => r.m.result === 'W'), rest = rows.filter(r => r.m.result !== 'W');
    const h = summarize(high), l = summarize(low);
    return { name, n: rows.length, median: Math.round(median * 100), shareW: avg(wins.map(r => r.byName[name].share)), shareR: avg(rest.map(r => r.byName[name].share)),
      passW: avg(wins.map(r => r.byName[name].passes)), passR: avg(rest.map(r => r.byName[name].passes)), highPct: h.winPct, nHigh: h.n, lowPct: l.winPct, nLow: l.n, delta: h.winPct !== null && l.winPct !== null ? h.winPct - l.winPct : null };
  }).filter(Boolean).sort((x, y) => (y.delta ?? -999) - (x.delta ?? -999));
  const invSel = $('#inv-player');
  if (!invSel.options.length) { for (const name of players) invSel.add(new Option(name, name)); invSel.value = players.includes('Neegek') ? 'Neegek' : players[0]; }
  const who = invSel.value;
  const invPts = invRows.filter(r => r.byName[who]?.share !== null && r.byName[who] !== undefined).map(r => ({ x: Math.round(r.byName[who].share * 1000) / 10, y: r.m.goalDiff, color: resultColor(r.m.result), tip: `<b>${esc(r.m.opponent.name)} ${r.m.goals}–${r.m.goalsAgainst} (${r.m.result})</b>${esc(who)}: ${r.byName[who].acts} balacties van ${r.total} (${Math.round(r.byName[who].share * 100)}%)<br>${fmtDateTime(r.m.ts)}` }));
  scatter($('#chart-involvement'), invPts, { xLabel: `aandeel balacties ${who}`, yLabel: 'doelsaldo', xPad: 2, xFmt: v => v + '%' });
  const qualPts = invRows.filter(r => r.byName[who]).map(r => { const p = r.m.players.find(p => p.name === who); return { x: p.passAttempts || 0, y: p.rating ?? 0, color: resultColor(r.m.result), tip: `<b>${esc(r.m.opponent.name)} ${r.m.goals}–${r.m.goalsAgainst} (${r.m.result})</b>${esc(who)}: ${p.passAttempts} passpogingen (${fmtPct(pct(p.passesMade, p.passAttempts))} raak), ${p.goals} goals, ${p.assists} assists, rating ${p.rating}<br>${fmtDateTime(r.m.ts)}` }; });
  scatter($('#chart-quality'), qualPts, { xLabel: `passpogingen ${who}`, yLabel: 'rating', xPad: 2, yZero: false });
  legend($('#chart-quality'), [{ label: 'Gewonnen', color: 'var(--pos)' }, { label: 'Gelijk', color: 'var(--neutral)' }, { label: 'Verloren', color: 'var(--neg)' }]);

  // Kwaliteit versus kwantiteit per speler, gesplitst op resultaat
  const qualRows = players.map(name => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    if (!rows.length) return null;
    const side = list => {
      const n = list.length, sum = k => list.reduce((a, r) => a + (r.p[k] || 0), 0);
      const ratings = list.map(r => r.p.rating).filter(v => v !== null);
      return { n, passes: n ? sum('passAttempts') / n : null, passPct: pct(sum('passesMade'), sum('passAttempts')), ga: n ? (sum('goals') + sum('assists')) / n : null, rating: avg(ratings), perGA: (sum('goals') + sum('assists')) ? sum('passAttempts') / (sum('goals') + sum('assists')) : null };
    };
    return { name, n: rows.length, w: side(rows.filter(r => r.m.result === 'W')), r: side(rows.filter(r => r.m.result !== 'W')) };
  }).filter(Boolean).sort((x, y) => (y.w.rating ?? 0) - (x.w.rating ?? 0));
  table($('#tbl-quality'), [
    { label: 'Speler', key: 'name' }, { label: 'N (W / GV)', num: true, render: r => `${r.n} <small>(${r.w.n} / ${r.r.n})</small>` },
    { label: 'Passpogingen', num: true, render: r => splitCell(r.w.passes, r.r.passes, f1) },
    { label: 'Pass %', num: true, render: r => splitCell(r.w.passPct, r.r.passPct, fmtPct) },
    { label: 'G + A per wedstrijd', num: true, render: r => splitCell(r.w.ga, r.r.ga, f2) },
    { label: 'Passes per G + A', num: true, render: r => splitCell(r.w.perGA, r.r.perGA, f1) },
    { label: 'Rating', num: true, render: r => splitCell(r.w.rating, r.r.rating, f2) },
  ], qualRows, { rowClass: r => r.n < 6 ? 'low' : '' });
  $('#tbl-quality').insertAdjacentHTML('afterbegin', '<div class="legend"><span style="--c:var(--pos)">bij winst</span><span style="--c:var(--neg)">bij gelijk/verlies</span></div>');

  table($('#tbl-involvement'), [
    { label: 'Speler', key: 'name' }, { label: 'N', num: true, key: 'n' },
    { label: 'Aandeel bij winst', num: true, render: r => r.shareW === null ? '–' : `${Math.round(r.shareW * 100)}%` },
    { label: 'Aandeel bij gelijk/verlies', num: true, render: r => r.shareR === null ? '–' : `${Math.round(r.shareR * 100)}%` },
    { label: 'Passes bij winst', num: true, render: r => r.passW === null ? '–' : Math.round(r.passW) },
    { label: 'Passes bij gelijk/verlies', num: true, render: r => r.passR === null ? '–' : Math.round(r.passR) },
    { label: 'Winst bij veel bal', num: true, render: r => `${fmtPct(r.highPct)} <small>(${r.nHigh})</small>` },
    { label: 'Winst bij weinig bal', num: true, render: r => `${fmtPct(r.lowPct)} <small>(${r.nLow})</small>` },
    { label: 'Verschil', num: true, render: r => deltaCell(r.delta) },
  ], invTable, { rowClass: r => r.n < 6 ? 'low' : '' });

  // Aan de bal per speler (ontcijferde events), bij winst / bij gelijk of verlies
  const evAvg = (rows, k) => rows.length && rows.every(r => r.p.ev) ? rows.reduce((a, r) => a + (r.p.ev[k] || 0), 0) / rows.length : null;
  const ballRows = players.map(name => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p && r.p.ev);
    if (!rows.length) return null;
    const W = rows.filter(r => r.m.result === 'W'), R = rows.filter(r => r.m.result !== 'W');
    const both = k => [evAvg(W, k), evAvg(R, k)];
    const fwdShare = list => { const c = list.reduce((a, r) => a + r.p.ev.passes_completed, 0); return c ? pct(list.reduce((a, r) => a + r.p.ev.passes_completed_forward, 0), c) : null; };
    return { name, n: rows.length, nW: W.length, nR: R.length, actions: both('ball_actions'), dribbles: both('dribbles_completed'), beaten: both('players_beaten'), through: both('through_balls'), won: both('possession_won'), lost: both('possession_lost'), lostDef: both('possession_lost_def_third'), fwd: [fwdShare(W), fwdShare(R)], noOption: both('fb_no_good_option') };
  }).filter(Boolean).sort((x, y) => (y.actions[0] ?? 0) - (x.actions[0] ?? 0));
  const sp = (pair, fmt = f1) => splitCell(pair[0], pair[1], fmt);
  table($('#tbl-ball'), [
    { label: 'Speler', key: 'name' }, { label: 'N (W / GV)', num: true, render: r => `${r.n} <small>(${r.nW} / ${r.nR})</small>` },
    { label: 'Balacties', num: true, render: r => sp(r.actions) }, { label: 'Dribbels', num: true, render: r => sp(r.dribbles) }, { label: 'Uitgespeeld', num: true, render: r => sp(r.beaten) },
    { label: 'Steekpasses', num: true, render: r => sp(r.through) }, { label: 'Passes vooruit', num: true, render: r => sp(r.fwd, fmtPct) },
    { label: 'Balwinst', num: true, render: r => sp(r.won) }, { label: 'Balverlies', num: true, render: r => sp(r.lost) }, { label: 'Balverlies eigen helft', num: true, render: r => sp(r.lostDef) },
    { label: '"Geen goede optie"', num: true, render: r => sp(r.noOption) },
  ], ballRows, { empty: 'Nog geen ontcijferde events in deze periode.', rowClass: r => (r.nW < 3 || r.nR < 3) ? 'low' : '' });
  $('#tbl-ball').insertAdjacentHTML('afterbegin', '<div class="legend"><span style="--c:var(--pos)">bij winst</span><span style="--c:var(--neg)">bij gelijk/verlies</span></div>');

  // Positie per speler
  const posMap = new Map();
  for (const m of ms) for (const p of m.players) { const k = `${p.name}|${p.pos}`; if (!posMap.has(k)) posMap.set(k, { name: p.name, pos: p.pos, list: [], ratings: [], goals: 0, assists: 0 }); const e = posMap.get(k); e.list.push(m); if (p.rating !== null) e.ratings.push(p.rating); e.goals += p.goals || 0; e.assists += p.assists || 0; }
  const positions = [...posMap.values()].map(e => ({ ...e, ...summarize(e.list), rating: e.ratings.length ? +(e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length).toFixed(2) : null })).sort((a, b) => a.name.localeCompare(b.name) || b.n - a.n);
  table($('#tbl-positions'), [
    { label: 'Speler', key: 'name' }, { label: 'Positie', render: r => POS_NL[r.pos] || r.pos }, { label: 'N', num: true, key: 'n' },
    { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Tov verwachting', num: true, render: r => residCell(r.resid) }, { label: 'Rating', num: true, render: r => r.rating ?? '–' }, { label: 'G + A', num: true, render: r => `${r.goals} + ${r.assists}` },
  ], positions, { rowClass: r => r.n < 3 ? 'low' : '' });

  // Tegenstanders
  const rated = ms.filter(m => m.opponent.skillRating);
  scatter($('#chart-opponents'), rated.map(m => ({ x: m.opponent.skillRating, y: m.goalDiff, color: resultColor(m.result), tip: matchTip(m) })), { xLabel: 'skill rating tegenstander', yLabel: 'doelsaldo' });
  const buckets = [['< 1500', 0, 1500], ['1500–1699', 1500, 1700], ['1700–1899', 1700, 1900], ['≥ 1900', 1900, 1e9]].map(([label, lo, hi]) => ({ label, ...summarize(rated.filter(m => m.opponent.skillRating >= lo && m.opponent.skillRating < hi)) })).filter(b => b.n);
  table($('#tbl-opponents'), [
    { label: 'Skill rating', key: 'label' }, { label: 'N', num: true, key: 'n' }, { label: 'Winst', num: true, render: r => fmtPct(r.winPct) },
    { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Voor–tegen', num: true, render: r => `${r.gfAvg} – ${r.gaAvg}` },
  ], buckets);

  // Verdedigend lek
  const defEl = $('#chart-defence');
  barChart(defEl, ms.map((m, i) => ({ label: i === 0 || ms[i - 1].session !== m.session ? fmtDate(m.ts) : '', value: oppShots(m), color: resultColor(m.result), tip: `${matchTip(m)}<br>${oppShots(m)} schoten tegen, ${m.goalsAgainst} goals tegen (${fmtPct(pct(m.goalsAgainst, oppShots(m)))})` })), { height: 200 });
  if (ms.length) legend(defEl, [{ label: 'Gewonnen', color: 'var(--pos)' }, { label: 'Gelijk', color: 'var(--neutral)' }, { label: 'Verloren', color: 'var(--neg)' }]);
  const teamSide = list => { const n = list.length; if (!n) return null; const own = k => list.reduce((a, m) => a + m.players.reduce((x, p) => x + (p[k] || 0), 0), 0); const opp = k => list.reduce((a, m) => a + m.opponentPlayers.reduce((x, p) => x + (p[k] || 0), 0), 0);
    const ownEv = k => list.reduce((a, m) => a + m.players.reduce((x, p) => x + (p.ev?.[k] || 0), 0), 0), hasEv = list.some(m => m.players.some(p => p.ev));
    const e = k => hasEv ? (ownEv(k) / n).toFixed(1) : '–';
    return { n, shotsAg: (opp('shots') / n).toFixed(1), ga: (list.reduce((a, m) => a + m.goalsAgainst, 0) / n).toFixed(1), convAg: fmtPct(pct(list.reduce((a, m) => a + m.goalsAgainst, 0), opp('shots'))), tackles: `${(own('tacklesMade') / n).toFixed(1)} / ${(own('tackleAttempts') / n).toFixed(1)}`, tacklePct: fmtPct(pct(own('tacklesMade'), own('tackleAttempts'))), shotsFor: (own('shots') / n).toFixed(1),
      interceptions: e('interceptions'), blocks: e('blocks'), lostDef: e('possession_lost_def_third'), wonDef: e('possession_won_def_third'), fouls: e('fouls_conceded_total'), yellows: e('yellow_cards_total'), outPos: hasEv ? fmtPct(pct(ownEv('out_of_position'), ownEv('out_of_position') + ownEv('in_position'))) : '–' }; };
  const dW = teamSide(ms.filter(m => m.result === 'W')), dR = teamSide(ms.filter(m => m.result !== 'W'));
  const defRows = [['Wedstrijden', 'n'], ['Schoten tegen', 'shotsAg'], ['Goals tegen', 'ga'], ['Conversie tegenstander', 'convAg'], ['Tackles geslaagd / pogingen', 'tackles'], ['Tackle-percentage', 'tacklePct'], ['Onderscheppingen (team)', 'interceptions'], ['Blocks (team)', 'blocks'], ['Balverlies eigen helft (team)', 'lostDef'], ['Balwinst eigen helft (team)', 'wonDef'], ['Overtredingen', 'fouls'], ['Gele kaarten', 'yellows'], ['Uit positie', 'outPos'], ['Eigen schoten', 'shotsFor']].map(([label, k]) => ({ label, w: dW?.[k] ?? '–', r: dR?.[k] ?? '–' }));
  table($('#tbl-defence-team'), [{ label: '', key: 'label' }, { label: 'Winst', num: true, key: 'w' }, { label: 'Gelijk/verlies', num: true, key: 'r' }], defRows);
  const defPlayers = players.map(name => {
    const withP = ms.filter(m => m.players.some(p => p.name === name)), without = ms.filter(m => !m.players.some(p => p.name === name));
    if (!withP.length) return null;
    const rows = withP.map(m => ({ p: m.players.find(p => p.name === name), m }));
    const att = rows.reduce((a, r) => a + (r.p.tackleAttempts || 0), 0), made = rows.reduce((a, r) => a + (r.p.tacklesMade || 0), 0);
    const missed = rows.map(r => (r.p.tackleAttempts || 0) - (r.p.tacklesMade || 0));
    const defShare = pct(rows.filter(r => r.p.pos === 'defender').length, rows.length);
    const evRows = rows.filter(r => r.p.ev), per = k => evRows.length ? (evRows.reduce((a, r) => a + (r.p.ev[k] || 0), 0) / evRows.length).toFixed(1) : null;
    const lostDef = evRows.map(r => r.p.ev.possession_lost_def_third || 0);
    const outPos = evRows.length ? pct(evRows.reduce((a, r) => a + (r.p.ev.out_of_position || 0), 0), evRows.reduce((a, r) => a + (r.p.ev.out_of_position || 0) + (r.p.ev.in_position || 0), 0)) : null;
    return { name, n: rows.length, attPer: (att / rows.length).toFixed(1), tacklePct: pct(made, att), missedPer: (missed.reduce((a, b) => a + b, 0) / rows.length).toFixed(1), corrShots: corr(missed, rows.map(r => oppShots(r.m))), corrGa: corr(missed, rows.map(r => r.m.goalsAgainst)), shotsAgWith: (withP.reduce((a, m) => a + oppShots(m), 0) / withP.length).toFixed(1), shotsAgWithout: without.length ? (without.reduce((a, m) => a + oppShots(m), 0) / without.length).toFixed(1) : null, defShare,
      interceptions: per('interceptions'), blocks: per('blocks'), lostDef: per('possession_lost_def_third'), corrLostDef: corr(lostDef, evRows.map(r => oppShots(r.m))), outPos, fouls: per('fouls_conceded_total'), yellows: per('yellow_cards_total') };
  }).filter(Boolean).sort((x, y) => (y.corrShots ?? -9) - (x.corrShots ?? -9));
  table($('#tbl-defence'), [
    { label: 'Speler', key: 'name' }, { label: 'N', num: true, key: 'n' }, { label: 'Als verdediger', num: true, render: r => fmtPct(r.defShare) },
    { label: 'Tackle-pogingen/wed.', num: true, key: 'attPer' }, { label: 'Geslaagd', num: true, render: r => fmtPct(r.tacklePct) }, { label: 'Gemist/wed.', num: true, key: 'missedPer' },
    { label: 'Corr. gemist ↔ schoten tegen', num: true, render: r => corrCell(r.corrShots) },
    { label: 'Onderschep./wed.', num: true, render: r => r.interceptions ?? '–' }, { label: 'Blocks/wed.', num: true, render: r => r.blocks ?? '–' },
    { label: 'Balverlies eigen helft/wed.', num: true, render: r => r.lostDef ?? '–' }, { label: 'Corr. balverlies eigen helft ↔ schoten tegen', num: true, render: r => corrCell(r.corrLostDef) },
    { label: 'Uit positie', num: true, render: r => fmtPct(r.outPos) }, { label: 'Overtr./wed.', num: true, render: r => r.fouls ?? '–' }, { label: 'Geel', num: true, render: r => r.yellows ?? '–' },
    { label: 'Schoten tegen met / zonder', num: true, render: r => `${r.shotsAgWith} / ${r.shotsAgWithout ?? '–'}` },
  ], defPlayers, { rowClass: r => r.n < 5 ? 'low' : '' });

  // Aanval en rolverdeling
  const attack = players.map(name => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    if (!rows.length) return null;
    const own = k => rows.reduce((a, r) => a + (r.p[k] || 0), 0), team = k => rows.reduce((a, r) => a + r.m.players.reduce((x, p) => x + (p[k] || 0), 0), 0);
    const mins = rows.reduce((a, r) => a + (r.p.secondsPlayed || 0), 0) / 60, per90 = v => mins ? (90 * v / mins).toFixed(2) : '–';
    return { name, n: rows.length, minPer: (mins / rows.length).toFixed(0), shotShare: pct(own('shots'), team('shots')), goalShare: pct(own('goals'), team('goals')), assistShare: pct(own('assists'), team('assists')), conv: pct(own('goals'), own('shots')), shots90: per90(own('shots')), ga90: per90(own('goals') + own('assists')), goals: own('goals'), assists: own('assists') };
  }).filter(Boolean).sort((x, y) => parseFloat(y.ga90) - parseFloat(x.ga90));
  table($('#tbl-attack'), [
    { label: 'Speler', key: 'name' }, { label: 'N', num: true, key: 'n' }, { label: 'Min/wed.', num: true, key: 'minPer' },
    { label: 'Aandeel schoten', num: true, render: r => fmtPct(r.shotShare) }, { label: 'Aandeel goals', num: true, render: r => fmtPct(r.goalShare) }, { label: 'Aandeel assists', num: true, render: r => fmtPct(r.assistShare) },
    { label: 'Conversie', num: true, render: r => fmtPct(r.conv) }, { label: 'Schoten per 90', num: true, key: 'shots90' }, { label: 'G + A per 90', num: true, key: 'ga90' }, { label: 'G + A', num: true, render: r => `${r.goals} + ${r.assists}` },
  ], attack, { rowClass: r => r.n < 5 ? 'low' : '' });

  // Tegenstanderscontext: mensen, keeper, opstelling, archetypes
  const groupTable = (elId, keyFn, labelFn = k => k, sortFn) => {
    const g = new Map();
    for (const m of ms) { const k = keyFn(m); if (k === null || k === undefined) continue; if (!g.has(k)) g.set(k, []); g.get(k).push(m); }
    const rows = [...g].map(([k, list]) => ({ key: k, label: labelFn(k), ...summarize(list) })).sort(sortFn || ((a, b) => (typeof a.key === 'number' ? a.key - b.key : b.n - a.n)));
    table($(elId), [{ label: '', key: 'label' }, { label: 'N', num: true, key: 'n' }, { label: 'W-G-V', num: true, render: r => `${r.W}-${r.D}-${r.L}` }, { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Tov verwachting', num: true, render: r => residCell(r.resid) }, { label: 'Voor–tegen', num: true, render: r => `${r.gfAvg} – ${r.gaAvg}` }], rows, { rowClass: r => r.n < 4 ? 'low' : '' });
  };
  groupTable('#tbl-opp-humans', m => m.opponentPlayers.length, k => `${k} mensen`);
  groupTable('#tbl-opp-gk', m => hasHumanGk(m) ? 1 : 0, k => k ? 'Menselijke keeper' : 'AI-keeper');
  groupTable('#tbl-opp-shape', m => m.opponentPlayers.length ? shapeOf(m) : null);
  const arch = new Map();
  for (const m of ms) for (const id of new Set(m.opponentPlayers.map(p => p.archetypeId).filter(v => v !== null))) { if (!arch.has(id)) arch.set(id, { id, matches: [], count: 0 }); arch.get(id).matches.push(m); }
  for (const m of ms) for (const p of m.opponentPlayers) if (p.archetypeId !== null && arch.has(p.archetypeId)) arch.get(p.archetypeId).count++;
  const archRows = [...arch.values()].map(a => ({ label: `Archetype ${a.id}`, count: a.count, ...summarize(a.matches) })).sort((x, y) => y.count - x.count);
  table($('#tbl-opp-archetypes'), [{ label: '', key: 'label' }, { label: 'Spelers gezien', num: true, key: 'count' }, { label: 'Wedstrijden', num: true, key: 'n' }, { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Tov verwachting', num: true, render: r => residCell(r.resid) }, { label: 'Goals tegen', num: true, key: 'gaAvg' }], archRows, { rowClass: r => r.n < 4 ? 'low' : '' });

  // Sessie, weekdag, uur
  const bucketChart = (elId, keyFn, labels) => {
    const items = labels.map(([key, label]) => { const s = summarize(ms.filter(m => keyFn(m) === key)); return { label, value: s.n ? s.winPct : null, color: 'var(--s1)', direct: s.n ? `${s.winPct}%` : undefined, tip: s.n ? `<b>${esc(label)}</b>${s.W} gewonnen, ${s.D} gelijk, ${s.L} verloren (${s.n})` : null }; });
    barChart($(elId), items.filter(i => i.value !== null || labels.length <= 7), { yMax: 100, fmt: v => v + '%', height: 200 });
  };
  const maxPos = Math.max(0, ...ms.map(m => m.posInSession));
  bucketChart('#chart-session', m => m.posInSession, Array.from({ length: maxPos }, (_, i) => [i + 1, `${i + 1}e`]));
  bucketChart('#chart-weekday', m => m.weekday, [1, 2, 3, 4, 5, 6, 0].map(d => [d, WEEKDAYS[d]]));
  const hours = [...new Set(ms.map(m => m.hour))].sort((a, b) => a - b);
  bucketChart('#chart-hour', m => m.hour, hours.map(h => [h, `${h}u`]));

  // Vorm per speler
  const formEl = $('#chart-form');
  const series = players.filter(name => ms.some(m => m.players.some(p => p.name === name))).map(name => ({
    name, color: `var(${SERIES[playerSlot.get(name) % SERIES.length]})`,
    values: ms.map((m, i) => ({ i, v: m.players.find(p => p.name === name)?.rating ?? null })).filter(p => p.v !== null),
  }));
  lineChart(formEl, series, ms.map((m, i) => i === 0 || fmtDate(ms[i - 1].ts) !== fmtDate(m.ts) ? fmtDate(m.ts) : ''), { yMin: Math.min(4, ...ms.flatMap(m => m.players.map(p => p.rating ?? 10))), yMax: 10, tipAt: i => { const m = ms[i]; return `<b>${esc(m.opponent.name)} ${m.goals}–${m.goalsAgainst}</b>${fmtDateTime(m.ts)}<br>${m.players.map(p => `${esc(p.name)}: ${p.rating}`).join('<br>')}`; } });
  if (series.length) legend(formEl, series.map(s => ({ label: s.name, color: s.color })), true);

  // Afwerking en opbouw
  const totals = players.map(name => {
    const rows = ms.flatMap(m => m.players.filter(p => p.name === name));
    const sum = k => rows.reduce((a, p) => a + (p[k] || 0), 0);
    const ratings = rows.map(p => p.rating).filter(r => r !== null);
    return { name, n: rows.length, goals: sum('goals'), assists: sum('assists'), shots: sum('shots'), passA: sum('passAttempts'), passM: sum('passesMade'), tackA: sum('tackleAttempts'), tackM: sum('tacklesMade'), mom: sum('mom'), reds: sum('redCards'), rating: ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : null };
  }).filter(t => t.n).sort((a, b) => b.goals - a.goals);
  table($('#tbl-players'), [
    { label: 'Speler', key: 'name' }, { label: 'N', num: true, key: 'n' }, { label: 'Goals', num: true, key: 'goals' }, { label: 'Assists', num: true, key: 'assists' },
    { label: 'Schoten', num: true, key: 'shots' }, { label: 'Schoten/goal', num: true, render: r => r.goals ? (r.shots / r.goals).toFixed(1) : '–' },
    { label: 'Pass %', num: true, render: r => fmtPct(pct(r.passM, r.passA)) }, { label: 'Tackle %', num: true, render: r => fmtPct(pct(r.tackM, r.tackA)) },
    { label: 'Rating', num: true, render: r => r.rating ?? '–' }, { label: 'MOTM', num: true, key: 'mom' }, { label: 'Rood', num: true, key: 'reds' },
  ], totals);

  // Totalen volgens EA over alle wedstrijden (ook die van vóór de verzamelaar)
  table($('#tbl-totals'), [
    { label: 'Speler', key: 'name' }, { label: 'Pro', render: r => `${esc(r.proName || '')} <small>(${r.proOverall ?? '–'})</small>` },
    { label: 'Wedstrijden', num: true, key: 'gamesPlayed' }, { label: 'Winst', num: true, render: r => fmtPct(r.winRate) },
    { label: 'Goals', num: true, key: 'goals' }, { label: 'Assists', num: true, key: 'assists' },
    { label: 'G + A per wedstrijd', num: true, render: r => r.gamesPlayed ? ((r.goals + r.assists) / r.gamesPlayed).toFixed(2) : '–' },
    { label: 'Rating', num: true, key: 'ratingAve' }, { label: 'MOTM', num: true, key: 'mom' },
    { label: 'Pass %', num: true, render: r => fmtPct(r.passSuccessRate) }, { label: 'Schot %', num: true, render: r => fmtPct(r.shotSuccessRate) }, { label: 'Tackle %', num: true, render: r => fmtPct(r.tackleSuccessRate) },
  ], [...DATA.members].sort((a, b) => b.gamesPlayed - a.gamesPlayed), { empty: 'Nog geen ledensnapshot opgehaald.' });

  // Alle wedstrijden
  table($('#tbl-matches'), [
    { label: 'Datum', render: r => fmtDateTime(r.ts) }, { label: 'Type', render: r => r.matchType === 'playoffMatch' ? 'playoff' : 'league' },
    { label: 'Tegenstander', render: r => esc(r.opponent.name) }, { label: 'Score', num: true, render: r => `${r.goals}–${r.goalsAgainst}` },
    { label: 'Uitslag', render: r => `<span class="res-${r.result}">${r.result}</span>` }, { label: 'Skill tegenst.', num: true, render: r => r.opponent.skillRating ?? '–' },
    { label: 'Mensen tegenst.', num: true, render: r => r.opponentPlayers.length }, { label: 'Vorm tegenst.', render: r => r.opponentPlayers.length ? shapeOf(r) : '–' }, { label: 'Tov verw.', num: true, render: r => residCell(r.resid) }, { label: 'Opstelling', render: r => esc(r.lineup) },
  ], [...ms].reverse());
}

for (const id of ['#range', '#type', '#inv-player']) $(id).addEventListener('change', render);
addEventListener('resize', () => DATA && render());
loadData().then(render).catch(e => { $('#club-sub').textContent = `Kon data niet laden: ${e.message}`; });
