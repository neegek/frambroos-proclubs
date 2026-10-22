// Sessiepagina: per speelavond uitslagen, tegenstanders en wat beter of slechter ging dan normaal.
// Een sessie is een reeks wedstrijden met minder dan 3 uur ertussen (SESSION_GAP in common.js).

const WEEKDAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const longDate = ts => { const d = new Date(ts * 1000); return `${WEEKDAY_LONG[d.getDay()]} ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const typeLabel = list => { const t = new Set(list.map(m => m.matchType)); return t.size > 1 ? 'league en playoff' : t.has('playoffMatch') ? 'playoff' : 'league'; };
const strengthLabel = d => d === null ? '' : d >= 250 ? 'veel sterker' : d >= 100 ? 'sterker' : d <= -100 ? 'zwakker' : 'gelijkwaardig';

// Spelersmaten voor "wat viel op" (rijen {m, p}).
const pSum = (rows, f) => rows.reduce((a, r) => a + (f(r.p) || 0), 0);
const pMin = rows => pSum(rows, p => p.secondsPlayed) / 60;
const p90 = f => rows => { const m = pMin(rows); return m ? 90 * pSum(rows, f) / m : null; };
const pEv = rows => rows.filter(r => r.p.ev);
const pEv90 = k => rows => { const e = pEv(rows); return e.length ? p90(p => p.ev[k])(e) : null; };
const P_METRICS = [
  { label: 'schoten per 90', hib: true, fmt: f1, calc: p90(p => p.shots) },
  { label: 'conversie', hib: true, fmt: fmtPct, min: rows => pSum(rows, p => p.shots) >= 3, calc: rows => pct(pSum(rows, p => p.goals), pSum(rows, p => p.shots)) },
  { label: 'passnauwkeurigheid', hib: true, fmt: fmtPct, calc: rows => pct(pSum(rows, p => p.passesMade), pSum(rows, p => p.passAttempts)) },
  { label: 'balacties per 90', hib: null, fmt: f1, calc: pEv90('ball_actions') },
  { label: 'dribbels per 90', hib: true, fmt: f1, calc: pEv90('dribbles_completed') },
  { label: 'balverlies per 90', hib: false, fmt: f1, calc: pEv90('possession_lost') },
  { label: 'onderscheppingen per 90', hib: true, fmt: f1, calc: pEv90('interceptions') },
  { label: 'tackle-rendement', hib: true, fmt: fmtPct, min: rows => pSum(rows, p => p.tackleAttempts) >= 5, calc: rows => pct(pSum(rows, p => p.tacklesMade), pSum(rows, p => p.tackleAttempts)) },
  { label: 'uit positie', hib: false, fmt: fmtPct, calc: rows => { const e = pEv(rows); const o = pSum(e, p => p.ev.out_of_position); return e.length ? pct(o, o + pSum(e, p => p.ev.in_position)) : null; } },
];

let sessions = [], selectedId = null;

function renderList() {
  $('#session-list').innerHTML = [...sessions].reverse().map(s => {
    const sm = summarize(s.matches), opp = avg(s.matches.map(m => m.opponent.skillRating).filter(Boolean));
    return `<button type="button" role="option" class="session-item ${s.id === selectedId ? 'active' : ''}" aria-selected="${s.id === selectedId}" data-id="${s.id}">
      <div class="s-date">${cap(longDate(s.matches[0].ts))}</div>
      <div>${pills(s.matches)}</div>
      <div class="s-meta">${sm.n} ${sm.n === 1 ? 'wedstrijd' : 'wedstrijden'} · ${sm.gf}–${sm.ga} · ${typeLabel(s.matches)}${opp ? ` · tegenstanders gem. ${Math.round(opp)}` : ''}</div>
    </button>`;
  }).join('');
  for (const b of $('#session-list').querySelectorAll('.session-item')) b.addEventListener('click', () => { selectedId = Number(b.dataset.id); render(); });
}

function sessionSummary(ms, others, sm, names, opp, own, cmp, prow) {
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
  // 2. Verloop en uitblinker
  const res = ms.map(m => m.result), best = prow[0];
  let course = '';
  if (res.length >= 4 && res[0] !== 'W' && res[1] !== 'W' && res.slice(2).some(r => r === 'W')) course = 'Na een stroeve start kwam het team op gang';
  else if (res.length >= 4 && res.slice(-2).every(r => r !== 'W') && res.slice(0, -2).some(r => r === 'W')) course = 'Na een goed begin zakte het aan het eind in';
  else if (res.length >= 3 && res.every(r => r === 'W')) course = 'Het team won alles';
  else if (res.length >= 3 && res.every(r => r !== 'W')) course = 'Het wilde de hele avond niet lukken';
  else if (res.length >= 4) course = 'Winst en verlies wisselden elkaar af';
  const star = best && best.rH !== null ? `<b>${esc(best.name)}</b>` : '';
  if (course && star) parts.push(sm.W === 0 ? `${course}; ${star} hield nog het best stand.` : `${course}, met ${star} als uitblinker.`);
  else if (course) parts.push(`${course}.`);
  else if (star) parts.push(sm.W === 0 ? `${star} hield nog het best stand.` : `${star} was de uitblinker.`);
  // 3. Wat opviel tegenover normaal
  const notable = cmp.filter(d => TEAM_PHRASE[d.key] && Math.abs(d.rel) >= 0.2 && Math.abs(d.diff) > 0.15).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
  const good = notable.find(d => d.good && !['gf', 'ga'].includes(d.key)), bad = notable.find(d => !d.good && !['gf', 'ga'].includes(d.key));
  if (good && bad) parts.push(`Opvallend was dat ${TEAM_PHRASE[good.key][0]}, maar ${TEAM_PHRASE[bad.key][1]}.`);
  else if (good) parts.push(`Opvallend was dat ${TEAM_PHRASE[good.key][0]}.`);
  else if (bad) parts.push(`Wat tegenviel, was dat ${TEAM_PHRASE[bad.key][1]}.`);
  return parts.join(' ');
}

function render() {
  if (!sessions.length) { $('#s-title').textContent = 'Nog geen sessies'; return; }
  if (!sessions.some(s => s.id === selectedId)) selectedId = sessions[sessions.length - 1].id;
  history.replaceState(null, '', `#${selectedId}`);
  renderList();
  const s = sessions.find(x => x.id === selectedId), ms = s.matches, sm = summarize(ms);
  const others = DATA.matches.filter(m => m.session !== s.id);
  const own = DATA.snapshot?.skillRating;
  const names = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  $('#s-title').textContent = `${cap(longDate(ms[0].ts))} · ${typeLabel(ms)}`;
  $('#s-meta').textContent = `${fmtTime(ms[0].ts)} tot ${fmtTime(ms[ms.length - 1].ts)} · ${names.length} spelers: ${names.join(', ')}`;

  const opp = avg(ms.map(m => m.opponent.skillRating).filter(Boolean));
  const moms = ms.flatMap(m => m.players.filter(p => p.mom).map(p => p.name));
  const momCount = Object.entries(moms.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]);
  $('#s-tiles').innerHTML = [
    ['Uitslag', `${sm.W}-${sm.D}-${sm.L}`, 'gewonnen, gelijk, verloren'],
    ['Punten per wedstrijd', sm.ppg, `normaal ${summarize(others).ppg ?? '–'}`],
    ['Doelpunten', `${sm.gf} – ${sm.ga}`, `${sm.gfAvg} – ${sm.gaAvg} per wedstrijd`],
    ['Tov verwachting', signed(sm.resid, 2), 'doelsaldo per wedstrijd'],
    ['Tegenstanders', opp ? Math.round(opp) : '–', opp && own ? `${strengthLabel(opp - own)} dan jullie (${own})` : ''],
    ['Man of the match', momCount.length ? esc(momCount[0][0]) : '–', momCount.length ? momCount.map(([n, c]) => `${esc(n)} ${c}×`).join(', ') : ''],
  ].map(([l, v, m]) => `<div class="tile"><div class="label">${l}</div><div class="value" style="font-size:${String(v).length > 10 ? 18 : 28}px">${v}</div><div class="meta">${m}</div></div>`).join('');

  const chartEl = $('#s-chart');
  barChart(chartEl, ms.map(m => ({ label: fmtTime(m.ts), value: m.goalDiff, color: resultColor(m.result), tip: matchTip(m) })), { yMin: -1, zeroLine: true, height: 180 });
  table($('#s-matches'), [
    { label: 'Tijd', render: r => fmtTime(r.ts) }, { label: 'Tegenstander', render: r => esc(r.opponent.name) },
    { label: 'Rating', num: true, render: r => r.opponent.skillRating ? `${r.opponent.skillRating} <small>${own ? strengthLabel(r.opponent.skillRating - own) : ''}</small>` : '–' },
    { label: 'Mensen', num: true, render: r => r.opponentPlayers.length }, { label: 'Score', num: true, render: r => `${r.goals}–${r.goalsAgainst}${r.winnerByDnf ? ' <small>opgave</small>' : ''}` },
    { label: 'Uitslag', render: r => `<span class="pill ${r.result}">${r.result === 'D' ? 'G' : r.result === 'L' ? 'V' : 'W'}</span>` }, { label: 'Tov verw.', num: true, render: r => residCell(r.resid) },
    { label: 'Beste speler', render: r => { const b = [...r.players].sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))[0]; return b ? `${esc(b.name)} <small>${b.rating}</small>` : '–'; } },
  ], ms);

  // Team tegenover normaal
  const cmp = others.length >= 3 ? compareTeam(ms, others) : [];
  const notable = cmp.filter(d => Math.abs(d.rel) >= 0.2 && Math.abs(d.diff) > 0.15).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
  const conf = CONF(ms.length, others.length);
  const item = d => insightLi(`${d.label}: ${d.fmt(d.a)} tegenover ${d.fmt(d.b)} normaal`, `${d.good ? 'Beter' : 'Slechter'} dan in de ${others.length} andere wedstrijden${d.hib ? '' : ' (lager is hier beter)'}.`, conf);
  const good = notable.filter(d => d.good).map(item), bad = notable.filter(d => !d.good).map(item);
  if (sm.resid >= 0.75) good.unshift(insightLi('Beter dan je mocht verwachten', `Gemiddeld ${signed(sm.resid, 2)} doelsaldo per wedstrijd boven wat de sterkte en het aantal mensen van de tegenstander voorspelden.`, null));
  if (sm.resid <= -0.75) bad.unshift(insightLi('Slechter dan je mocht verwachten', `Gemiddeld ${signed(sm.resid, 2)} doelsaldo per wedstrijd onder wat de sterkte en het aantal mensen van de tegenstander voorspelden.`, null));
  $('#s-good').innerHTML = good.length ? good.slice(0, 5).join('') : `<li class="empty">${others.length < 3 ? 'Te weinig andere wedstrijden om mee te vergelijken.' : 'Niets dat duidelijk beter ging dan normaal.'}</li>`;
  $('#s-bad').innerHTML = bad.length ? bad.slice(0, 5).join('') : `<li class="empty">${others.length < 3 ? 'Te weinig andere wedstrijden om mee te vergelijken.' : 'Niets dat duidelijk slechter ging dan normaal.'}</li>`;
  table($('#s-compare'), [
    { label: '', key: 'label' }, { label: 'Deze sessie', num: true, render: r => r.fmt(r.a) }, { label: 'Normaal', num: true, render: r => r.fmt(r.b) },
    { label: 'Verschil', num: true, render: r => `<span class="${Math.abs(r.rel) < 0.1 ? '' : r.good ? 'delta-pos' : 'delta-neg'}">${r.diff > 0 ? '+' : ''}${r.fmt === fmtPct ? `${Math.round(r.diff)} pt` : f1(r.diff)}</span>` },
  ], cmp, { empty: 'Te weinig andere wedstrijden om mee te vergelijken.' });

  // Spelers
  const prow = names.map(name => {
    const here = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const there = others.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const rH = avg(here.map(r => r.p.rating).filter(v => v !== null)), rT = avg(there.map(r => r.p.rating).filter(v => v !== null));
    const notes = [];
    if (there.length >= 3) for (const mt of P_METRICS) {
      if (mt.min && (!mt.min(here) || !mt.min(there))) continue;
      const a = mt.calc(here), b = mt.calc(there); if (a === null || b === null || !b) continue;
      const rel = (a - b) / Math.abs(b); if (Math.abs(rel) < 0.3) continue;
      const better = mt.hib === null ? null : mt.hib ? a > b : a < b;
      notes.push({ rel: Math.abs(rel), html: `<span class="${better === null ? '' : better ? 'delta-pos' : 'delta-neg'}">${a > b ? 'meer' : 'minder'} ${mt.label}</span> (${mt.fmt(a)} tegen ${mt.fmt(b)})` });
    }
    notes.sort((x, y) => y.rel - x.rel);
    const evH = pEv(here);
    return { name, n: here.length, rH, rT, d: rT === null || rH === null ? null : rH - rT, g: pSum(here, p => p.goals), a: pSum(here, p => p.assists), mom: pSum(here, p => p.mom), actions: evH.length ? pSum(evH, p => p.ev.ball_actions) / evH.length : null, notes: there.length < 3 ? '<small>Te weinig andere wedstrijden om mee te vergelijken.</small>' : notes.slice(0, 3).map(x => `<div>${x.html}</div>`).join('') || '<small>Op het eigen normale niveau.</small>' };
  }).sort((x, y) => (y.rH ?? 0) - (x.rH ?? 0));
  $('#s-summary').innerHTML = sessionSummary(ms, others, sm, names, opp, own, cmp, prow);
  $('#s-players').innerHTML = `<div class="pcards">${prow.map(r => `<a class="pcard" href="/spelers.html#${encodeURIComponent(r.name)}">
    <div class="pcard-head"><span class="pcard-name">${esc(r.name)}</span><span class="pcard-rating">${f2(r.rH)}</span></div>
    <div class="pcard-sub">${r.n} ${r.n === 1 ? 'wedstrijd' : 'wedstrijden'} · normaal ${f2(r.rT)} ${r.d === null ? '' : residCell(r.d)}</div>
    <div class="pcard-stats"><span><b>${r.g}</b> goals</span><span><b>${r.a}</b> assists</span><span><b>${r.mom}</b> MOTM</span><span><b>${f1(r.actions)}</b> balacties</span></div>
    <div class="pcard-notes">${r.notes}</div></a>`).join('')}</div>`;
}

addEventListener('resize', () => DATA && render());
addEventListener('hashchange', () => { const id = Number(location.hash.slice(1)); if (id && id !== selectedId) { selectedId = id; render(); } });
selectedId = Number(location.hash.slice(1)) || null;
loadData().then(() => { sessions = sessionsOf(DATA.matches); render(); }).catch(showError);
