// Teampagina: samenvatting voor het hele team. Alles wordt berekend uit DATA (zie common.js).

const has = (m, n) => m.players.some(p => p.name === n);
const rolling = (xs, k) => xs.map((_, i) => { const w = xs.slice(Math.max(0, i - k + 1), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });

function teamInsights(ms) {
  const out = [];
  const W = ms.filter(m => m.result === 'W'), R = ms.filter(m => m.result !== 'W');
  // 1. Waar wedstrijden beslist worden: grootste verschillen tussen winst en gelijk/verlies
  if (W.length >= 3 && R.length >= 3) {
    const diffs = compareTeam(W, R).filter(d => !['gf', 'ga'].includes(d.key) && Math.abs(d.rel) >= 0.15).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel)).slice(0, 3);
    for (const d of diffs) out.push({ w: Math.abs(d.rel), html: insightLi(`${d.label}: ${d.fmt(d.a)} bij winst, ${d.fmt(d.b)} bij gelijk of verlies`, `Een van de grootste verschillen tussen de ${W.length} gewonnen en ${R.length} niet-gewonnen wedstrijden${d.hib ? '' : '; hier is lager beter'}.`, CONF(W.length, R.length)) });
  }
  // 2. Sterkte van de tegenstander
  const own = DATA.snapshot?.skillRating;
  if (own) {
    const strong = ms.filter(m => m.opponent.skillRating && m.opponent.skillRating >= own + 100), weak = ms.filter(m => m.opponent.skillRating && m.opponent.skillRating < own + 100);
    if (strong.length >= 3 && weak.length >= 3) { const a = summarize(strong), b = summarize(weak); out.push({ w: Math.abs(a.ppg - b.ppg) / 3, html: insightLi(`Tegen clubs met ${own + 100}+ rating: ${a.ppg} punten per wedstrijd, daaronder ${b.ppg}`, `${a.n} wedstrijden tegen duidelijk sterkere clubs (${a.W}W ${a.D}G ${a.L}V) tegenover ${b.n} tegen gelijkwaardige of zwakkere (${b.W}W ${b.D}G ${b.L}V). Jullie eigen rating is ${own}.`, CONF(a.n, b.n)) }); }
  }
  if (DATA.model.fitted) { const c = DATA.model.coef; out.push({ w: 0.2, html: insightLi(`100 ratingpunten sterkere tegenstander kost gemiddeld ${Math.abs(c[1]).toFixed(1)} doelpunt`, `Uit het verwachtingsmodel, geschat op ${DATA.model.n} wedstrijden. Een extra mens bij de tegenstander: ${Math.abs(c[2]).toFixed(1)} doelpunt. Alle "tov verwachting"-cijfers corrigeren hiervoor.`, CONF(DATA.model.n, DATA.model.n)) }); }
  // 3. Aantal mensen bij de tegenstander
  const few = ms.filter(m => m.opponentPlayers.length <= 3), many = ms.filter(m => m.opponentPlayers.length >= 4);
  if (few.length >= 3 && many.length >= 3) { const a = summarize(few), b = summarize(many); const d = a.resid - b.resid; if (Math.abs(d) >= 0.5) out.push({ w: Math.abs(d) / 2, html: insightLi(d < 0 ? 'Tegen teams met weinig mensen presteren jullie onder verwachting' : 'Tegen teams met weinig mensen presteren jullie boven verwachting', `Tegen 3 of minder mensen ${signed(a.resid, 2)} tov verwachting (${a.n} wedstrijden), tegen 4 of meer ${signed(b.resid, 2)} (${b.n}). ${d < 0 ? 'Mogelijk lastiger om een AI-blok open te spelen dan een open wedstrijd te spelen.' : ''}`, CONF(a.n, b.n)) }); }
  // 4. Volgorde binnen de avond
  const early = ms.filter(m => m.posInSession <= 2), late = ms.filter(m => m.posInSession > 2);
  if (early.length >= 3 && late.length >= 3) { const a = summarize(early), b = summarize(late); const d = a.resid - b.resid; if (Math.abs(d) >= 0.5) out.push({ w: Math.abs(d) / 2, html: insightLi(d < 0 ? 'De eerste twee potten van de avond gaan slechter' : 'De eerste twee potten van de avond gaan beter', `Eerste twee: ${a.ppg} punten per wedstrijd, ${signed(a.resid, 2)} tov verwachting (${a.n}). Daarna: ${b.ppg} punten, ${signed(b.resid, 2)} (${b.n}). ${d < 0 ? 'Opwarmen of eerst even in een minder belangrijke pot inspelen kan lonen.' : 'Lange avonden kosten energie.'}`, CONF(a.n, b.n)) }); }
  // 5. League tegenover playoff
  const lg = ms.filter(m => m.matchType === 'leagueMatch'), po = ms.filter(m => m.matchType === 'playoffMatch');
  if (lg.length >= 3 && po.length >= 3) { const a = summarize(lg), b = summarize(po); if (Math.abs(a.ppg - b.ppg) >= 0.5) out.push({ w: Math.abs(a.ppg - b.ppg) / 3, html: insightLi(`League ${a.ppg} punten per wedstrijd, playoff ${b.ppg}`, `${a.n} league- en ${b.n} playoffwedstrijden. Tov verwachting: ${signed(a.resid, 2)} en ${signed(b.resid, 2)}, dus ${Math.abs(a.resid - b.resid) < 0.5 ? 'het verschil komt grotendeels door sterkere tegenstanders' : 'het verschil blijft ook na correctie voor de tegenstander'}.`, CONF(a.n, b.n)) }); }
  // 6. Speler met de grootste impact
  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  const impact = players.map(n => { const a = ms.filter(m => has(m, n)), b = ms.filter(m => !has(m, n)); if (a.length < 3 || b.length < 3) return null; const sa = summarize(a), sb = summarize(b); return { n, d: sa.resid - sb.resid, a: sa, b: sb }; }).filter(Boolean).sort((x, y) => y.d - x.d);
  if (impact.length && impact[0].d >= 0.5) { const i = impact[0]; out.push({ w: i.d / 2, html: insightLi(`Met ${esc(i.n)} erbij presteert het team het meest boven verwachting`, `${signed(i.a.resid, 2)} tov verwachting met (${i.a.n} wedstrijden, ${i.a.ppg} punten), ${signed(i.b.resid, 2)} zonder (${i.b.n}, ${i.b.ppg} punten). Let op: dit kan ook samenvallen met het aantal spelers of de avond.`, CONF(i.a.n, i.b.n)) }); }
  // 7. Vijf of zes man
  const six = ms.filter(m => m.players.length >= 6), five = ms.filter(m => m.players.length <= 5);
  if (six.length >= 3 && five.length >= 3) { const a = summarize(six), b = summarize(five); out.push({ w: Math.abs(a.resid - b.resid) / 2, html: insightLi(`Met zes man ${a.ppg} punten per wedstrijd, met vijf of minder ${b.ppg}`, `Tov verwachting ${signed(a.resid, 2)} (${a.n}) tegenover ${signed(b.resid, 2)} (${b.n}). De AI vult de open plek; hoe groot dat gat is, zie je hier.`, CONF(a.n, b.n)) }); }
  return out.sort((a, b) => b.w - a.w).map(o => o.html);
}

function render() {
  const ms = filtered(), s = summarize(ms), snap = DATA.snapshot;
  $('#page-sub').textContent = `Samenvatting van ${ms.length} gevolgde wedstrijden${ms.length ? `, ${fmtDate(ms[0].ts)} tot ${fmtDate(ms[ms.length - 1].ts)}` : ''}.`;
  const last5 = ms.slice(-5);
  $('#tiles').innerHTML = [
    ['Wedstrijden', s.n, snap ? `van ${snap.gamesPlayed} volgens EA · rating ${snap.skillRating}` : ''],
    ['Winst', fmtPct(s.winPct), `${s.W}W ${s.D}G ${s.L}V`],
    ['Punten per wedstrijd', s.ppg ?? '–', 'bij 3 / 1 / 0'],
    ['Doelpunten', `${s.gfAvg ?? '–'} – ${s.gaAvg ?? '–'}`, 'voor en tegen per wedstrijd'],
    ['Tov verwachting', s.resid === null ? '–' : signed(s.resid, 2), 'doelsaldo, gecorrigeerd'],
    ['Vorm', last5.length ? pills(last5) : '–', 'laatste 5'],
  ].map(([l, v, m]) => `<div class="tile"><div class="label">${l}</div><div class="value">${v}</div><div class="meta">${m}</div></div>`).join('');

  const ins = teamInsights(ms);
  $('#team-insights').innerHTML = ins.length ? ins.slice(0, 6).join('') + (ins.length > 6 ? `<li class="more"><details><summary>Nog ${ins.length - 6} patronen</summary><ul class="insight-list">${ins.slice(6).join('')}</ul></details></li>` : '') : '<li class="empty">Nog te weinig wedstrijden voor patronen.</li>';

  const resEl = $('#chart-results');
  barChart(resEl, ms.map((m, i) => ({ label: i === 0 || ms[i - 1].session !== m.session ? fmtDate(m.ts) : '', value: m.goalDiff, color: resultColor(m.result), tip: matchTip(m) })), { yMin: -1, zeroLine: true });
  if (ms.length) legend(resEl, [{ label: 'Gewonnen', color: 'var(--pos)' }, { label: 'Gelijk', color: 'var(--neutral)' }, { label: 'Verloren', color: 'var(--neg)' }]);

  const formEl = $('#chart-form');
  const gd = rolling(ms.map(m => m.goalDiff), 5), rs = rolling(ms.map(m => m.resid), 5);
  lineChart(formEl, [
    { name: 'Doelsaldo', color: 'var(--s1)', values: gd.map((v, i) => ({ i, v })) },
    { name: 'Tov verwachting', color: 'var(--s2)', values: rs.map((v, i) => ({ i, v })) },
  ], ms.map((m, i) => i === 0 || fmtDate(ms[i - 1].ts) !== fmtDate(m.ts) ? fmtDate(m.ts) : ''), { height: 220, tipAt: i => `<b>Na ${esc(ms[i].opponent.name)} (${fmtDate(ms[i].ts)})</b>Doelsaldo, gemiddeld over 5: ${signed(gd[i])}<br>Tov verwachting, gemiddeld over 5: ${signed(rs[i])}` });
  if (ms.length) legend(formEl, [{ label: 'Doelsaldo', color: 'var(--s1)' }, { label: 'Tov verwachting', color: 'var(--s2)' }], true);

  const W = ms.filter(m => m.result === 'W'), R = ms.filter(m => m.result !== 'W');
  table($('#tbl-profile'), [
    { label: '', key: 'label' }, { label: `Winst (${W.length})`, num: true, render: r => `<span class="res-W">${r.fmt(r.a)}</span>` }, { label: `Gelijk/verlies (${R.length})`, num: true, render: r => `<span class="res-L">${r.fmt(r.b)}</span>` },
  ], W.length && R.length ? compareTeam(W, R) : [], { empty: 'Nog geen winst en verlies om te vergelijken.' });

  const own = snap?.skillRating;
  const buckets = own ? [['Zwakker (100+ lager)', -1e9, -100], ['Gelijkwaardig (binnen 100)', -100, 100], ['Sterker (100–250 hoger)', 100, 250], ['Veel sterker (250+ hoger)', 250, 1e9]] : [];
  const groupCols = [{ label: '', key: 'label' }, { label: 'N', num: true, key: 'n' }, { label: 'W-G-V', num: true, render: r => `${r.W}-${r.D}-${r.L}` }, { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Tov verwachting', num: true, render: r => residCell(r.resid) }, { label: 'Voor–tegen', num: true, render: r => `${r.gfAvg} – ${r.gaAvg}` }];
  table($('#tbl-strength'), groupCols, buckets.map(([label, lo, hi]) => ({ label, ...summarize(ms.filter(m => m.opponent.skillRating && m.opponent.skillRating - own >= lo && m.opponent.skillRating - own < hi)) })).filter(b => b.n), { rowClass: r => r.n < 4 ? 'low' : '' });
  const hum = [['1–2 mensen', 1, 2], ['3 mensen', 3, 3], ['4 mensen', 4, 4], ['5 of meer', 5, 99]];
  table($('#tbl-humans'), groupCols, hum.map(([label, lo, hi]) => ({ label, ...summarize(ms.filter(m => m.opponentPlayers.length >= lo && m.opponentPlayers.length <= hi)) })).filter(b => b.n), { rowClass: r => r.n < 4 ? 'low' : '' });

  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  const squad = players.map(name => {
    const rows = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const a = summarize(rows.map(r => r.m)), b = summarize(ms.filter(m => !has(m, name)));
    const mins = rows.reduce((x, r) => x + (r.p.secondsPlayed || 0), 0) / 60;
    const g = rows.reduce((x, r) => x + (r.p.goals || 0), 0), as = rows.reduce((x, r) => x + (r.p.assists || 0), 0);
    return { name, n: rows.length, rating: avg(rows.map(r => r.p.rating).filter(v => v !== null)), g, a: as, ga90: mins ? 90 * (g + as) / mins : null, mom: rows.reduce((x, r) => x + (r.p.mom || 0), 0), ppg: a.ppg, resid: a.resid, delta: b.n ? a.resid - b.resid : null, nWithout: b.n };
  }).sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0));
  table($('#tbl-squad'), [
    { label: 'Speler', render: r => `<a href="/spelers.html#${encodeURIComponent(r.name)}">${esc(r.name)}</a>` }, { label: 'N', num: true, key: 'n' }, { label: 'Rating', num: true, render: r => f2(r.rating) },
    { label: 'Goals', num: true, key: 'g' }, { label: 'Assists', num: true, key: 'a' }, { label: 'G + A per 90', num: true, render: r => f2(r.ga90) }, { label: 'MOTM', num: true, key: 'mom' },
    { label: 'Punten/wed. met', num: true, key: 'ppg' }, { label: 'Tov verwachting met', num: true, render: r => residCell(r.resid) }, { label: 'Met tegenover zonder', num: true, render: r => r.nWithout >= 3 ? residCell(r.delta) : '–' },
  ], squad);

  const pairs = [];
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const A = players[i], B = players[j], both = ms.filter(m => has(m, A) && has(m, B)), one = ms.filter(m => has(m, A) !== has(m, B));
    if (both.length < 3 || one.length < 3) continue;
    const sb = summarize(both), so = summarize(one);
    pairs.push({ pair: `${A} + ${B}`, nBoth: sb.n, ppg: sb.ppg, rb: sb.resid, nOne: so.n, ro: so.resid, syn: sb.resid - so.resid });
  }
  pairs.sort((x, y) => y.syn - x.syn);
  table($('#tbl-pairs'), [{ label: 'Tweetal', key: 'pair' }, { label: 'Samen', num: true, render: r => `${r.ppg} pt <small>(${r.nBoth})</small>` }, { label: 'Tov verw. samen', num: true, render: r => residCell(r.rb) }, { label: 'Apart', num: true, render: r => `${residCell(r.ro)} <small>(${r.nOne})</small>` }, { label: 'Synergie', num: true, render: r => residCell(r.syn) }], pairs.slice(0, 6), { empty: 'Nog geen tweetal dat zowel samen als apart minstens drie keer speelde.', rowClass: r => (r.nBoth < 5 || r.nOne < 5) ? 'low' : '' });

  const groups = new Map();
  for (const m of ms) { if (!groups.has(m.lineup)) groups.set(m.lineup, []); groups.get(m.lineup).push(m); }
  const lineups = [...groups].map(([lineup, list]) => ({ lineup, ...summarize(list) })).filter(l => l.n >= 2).sort((a, b) => b.resid - a.resid);
  table($('#tbl-lineups'), [{ label: 'Opstelling', wrap: true, render: r => esc(r.lineup) }, { label: 'N', num: true, key: 'n' }, { label: 'W-G-V', num: true, render: r => `${r.W}-${r.D}-${r.L}` }, { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Tov verwachting', num: true, render: r => residCell(r.resid) }], lineups, { empty: 'Nog geen opstelling met twee of meer wedstrijden.' });
}

for (const id of ['#range', '#type']) $(id).addEventListener('change', render);
addEventListener('resize', () => DATA && render());
loadData().then(render).catch(showError);
