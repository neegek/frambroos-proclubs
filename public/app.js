// Dashboard-logica: alle correlaties worden hier in de browser berekend uit /api/data.
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const SERIES = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8'];
const WEEKDAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const POS_NL = { goalkeeper: 'keeper', defender: 'verdediger', midfielder: 'middenvelder', forward: 'aanvaller' };
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
const fmtDateTime = ts => new Date(ts * 1000).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const pct = (num, den) => den ? Math.round(100 * num / den) : null;
const fmtPct = v => v === null || v === undefined ? '–' : `${v}%`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let DATA = null;
let playerSlot = new Map(); // vaste kleur per speler, onafhankelijk van filters

// ---------- tooltip ----------
const tip = $('#tooltip');
function showTip(html, ev) {
  tip.innerHTML = html; tip.hidden = false;
  const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
  if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
const hideTip = () => { tip.hidden = true; };

// ---------- svg helpers ----------
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}
function text(parent, x, y, str, attrs = {}) {
  const t = el('text', { x, y, ...attrs }, parent); t.textContent = str; return t;
}
function frame(container, width, height, margin) {
  container.innerHTML = '';
  const svg = el('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}`, role: 'img' });
  container.appendChild(svg);
  return { svg, inner: { x: margin.l, y: margin.t, w: width - margin.l - margin.r, h: height - margin.t - margin.b } };
}
function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const step0 = span / count, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= count) || mag * 10;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}
function yAxis(svg, inner, scaleY, ticks, fmt = v => v) {
  const g = el('g', { class: 'grid' }, svg);
  for (const t of ticks) {
    const y = scaleY(t);
    el('line', { x1: inner.x, x2: inner.x + inner.w, y1: y, y2: y }, g);
    text(svg, inner.x - 8, y + 4, fmt(t), { class: 'tick', 'text-anchor': 'end' });
  }
}

// Staafdiagram met categorieën op de x-as. items: {label, value, color, tip, direct}
function barChart(container, items, { height = 220, yMin = 0, yMax, fmt = v => v, zeroLine = false, labelEvery = 1 } = {}) {
  if (!items.length) { container.innerHTML = '<p class="empty">Nog geen data.</p>'; return; }
  const width = Math.max(320, Math.min(1100, container.clientWidth || 600));
  const { svg, inner } = frame(container, width, height, { l: 40, t: 12, r: 8, b: 28 });
  const values = items.map(i => i.value).filter(v => v !== null);
  const lo = Math.min(yMin, ...values), hi = yMax ?? Math.max(1, ...values);
  const ticks = niceTicks(lo, hi);
  const y0 = Math.min(lo, ticks[0]), y1 = Math.max(hi, ticks[ticks.length - 1]);
  const sy = v => inner.y + inner.h - (v - y0) / (y1 - y0) * inner.h;
  yAxis(svg, inner, sy, ticks, fmt);
  const band = inner.w / items.length, bw = Math.max(3, Math.min(36, band - 2));
  const baseline = sy(Math.max(0, y0));
  if (zeroLine || y0 < 0) el('line', { class: 'axis', x1: inner.x, x2: inner.x + inner.w, y1: baseline, y2: baseline, stroke: 'var(--axis)' }, svg);
  items.forEach((it, i) => {
    const x = inner.x + band * i + (band - bw) / 2;
    if (it.value !== null) {
      const top = sy(Math.max(it.value, 0)), bottom = sy(Math.min(it.value, 0));
      const h = Math.max(2, bottom - top);
      // 4px ronde data-uiteinden, verankerd op de nullijn
      const r = Math.min(4, bw / 2, h);
      const up = it.value >= 0;
      const d = up
        ? `M${x},${bottom} V${top + r} a${r},${r} 0 0 1 ${r},-${r} H${x + bw - r} a${r},${r} 0 0 1 ${r},${r} V${bottom} Z`
        : `M${x},${top} V${bottom - r} a${r},${r} 0 0 0 ${r},${r} H${x + bw - r} a${r},${r} 0 0 0 ${r},-${r} V${top} Z`;
      el('path', { d, fill: it.color || 'var(--s1)' }, svg);
      if (it.direct !== undefined) text(svg, x + bw / 2, (up ? top - 5 : bottom + 13), it.direct, { class: 'label-direct', 'text-anchor': 'middle' });
    }
    if (it.label && i % labelEvery === 0) text(svg, x + bw / 2, inner.y + inner.h + 18, it.label, { class: 'tick', 'text-anchor': 'middle' });
    const hit = el('rect', { class: 'hit', x: inner.x + band * i, y: inner.y, width: band, height: inner.h }, svg);
    if (it.tip) { hit.addEventListener('mousemove', e => showTip(it.tip, e)); hit.addEventListener('mouseleave', hideTip); }
  });
}

function scatter(container, points, { height = 240, xLabel, yLabel, xPad = 50, xFmt = v => v } = {}) {
  if (!points.length) { container.innerHTML = '<p class="empty">Nog geen tegenstanders met skill rating.</p>'; return; }
  const width = Math.max(320, Math.min(1100, container.clientWidth || 520));
  const { svg, inner } = frame(container, width, height, { l: 40, t: 12, r: 12, b: 36 });
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xt = niceTicks(Math.min(...xs) - xPad, Math.max(...xs) + xPad, 5), yt = niceTicks(Math.min(0, ...ys) - 1, Math.max(0, ...ys) + 1, 4);
  const x0 = xt[0], x1 = xt[xt.length - 1], y0 = yt[0], y1 = yt[yt.length - 1];
  const sx = v => inner.x + (v - x0) / (x1 - x0) * inner.w, sy = v => inner.y + inner.h - (v - y0) / (y1 - y0) * inner.h;
  yAxis(svg, inner, sy, yt);
  for (const t of xt) text(svg, sx(t), inner.y + inner.h + 18, xFmt(t), { class: 'tick', 'text-anchor': 'middle' });
  el('line', { x1: inner.x, x2: inner.x + inner.w, y1: sy(0), y2: sy(0), stroke: 'var(--axis)' }, svg);
  if (xLabel) text(svg, inner.x + inner.w, inner.y + inner.h + 32, xLabel, { class: 'tick', 'text-anchor': 'end' });
  if (yLabel) text(svg, inner.x, inner.y - 2, yLabel, { class: 'tick' });
  for (const p of points) {
    const c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: 5, fill: p.color, stroke: 'var(--surface)', 'stroke-width': 2 }, svg);
    const hit = el('circle', { class: 'hit', cx: sx(p.x), cy: sy(p.y), r: 12 }, svg);
    hit.addEventListener('mousemove', e => showTip(p.tip, e)); hit.addEventListener('mouseleave', hideTip);
    void c;
  }
}

// Meerdere lijnen op een gedeelde x-as (index). series: {name, color, values: [{i, v}]}
function lineChart(container, series, xLabels, { height = 260, yMin, yMax, tipAt } = {}) {
  if (!series.length || !xLabels.length) { container.innerHTML = '<p class="empty">Nog geen data.</p>'; return; }
  const width = Math.max(320, Math.min(1100, container.clientWidth || 800));
  const { svg, inner } = frame(container, width, height, { l: 40, t: 12, r: 12, b: 28 });
  const all = series.flatMap(s => s.values.map(p => p.v));
  const lo = yMin ?? Math.min(...all), hi = yMax ?? Math.max(...all);
  const yt = niceTicks(lo, hi, 4), y0 = Math.min(lo, yt[0]), y1 = Math.max(hi, yt[yt.length - 1]);
  const n = xLabels.length, sx = i => inner.x + (n === 1 ? inner.w / 2 : i / (n - 1) * inner.w);
  const sy = v => inner.y + inner.h - (v - y0) / (y1 - y0) * inner.h;
  yAxis(svg, inner, sy, yt);
  let lastX = -Infinity;
  xLabels.forEach((l, i) => { if (l && sx(i) - lastX > 56) { text(svg, sx(i), inner.y + inner.h + 18, l, { class: 'tick', 'text-anchor': 'middle' }); lastX = sx(i); } });
  for (const s of series) {
    const d = s.values.map((p, k) => `${k === 0 || s.values[k - 1].i !== p.i - 1 ? 'M' : 'L'}${sx(p.i)},${sy(p.v)}`).join(' ');
    el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    for (const p of s.values) el('circle', { cx: sx(p.i), cy: sy(p.v), r: 3, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 1.5 }, svg);
  }
  const cross = el('line', { x1: 0, x2: 0, y1: inner.y, y2: inner.y + inner.h, stroke: 'var(--axis)', 'stroke-dasharray': '3 3', visibility: 'hidden' }, svg);
  const hit = el('rect', { class: 'hit', x: inner.x, y: inner.y, width: inner.w, height: inner.h }, svg);
  hit.addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * width / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - inner.x) / inner.w * (n - 1))));
    cross.setAttribute('x1', sx(i)); cross.setAttribute('x2', sx(i)); cross.setAttribute('visibility', 'visible');
    if (tipAt) showTip(tipAt(i), e);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });
}

function legend(container, entries, line = false) {
  const div = document.createElement('div'); div.className = 'legend';
  div.innerHTML = entries.map(e => `<span class="${line ? 'line' : ''}" style="--c:${e.color}">${esc(e.label)}</span>`).join('');
  container.prepend(div);
}

function table(container, cols, rows, { empty = 'Nog geen data.', rowClass } = {}) {
  if (!rows.length) { container.innerHTML = `<p class="empty">${empty}</p>`; return; }
  const head = cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('');
  const body = rows.map(r => `<tr class="${rowClass ? rowClass(r) : ''}">${cols.map(c => `<td class="${c.num ? 'num' : ''}${c.wrap ? ' wrap' : ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
  container.innerHTML = `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ---------- berekeningen ----------
const resultColor = r => r === 'W' ? 'var(--pos)' : r === 'L' ? 'var(--neg)' : 'var(--neutral)';
const summarize = list => {
  const W = list.filter(m => m.result === 'W').length, D = list.filter(m => m.result === 'D').length, L = list.length - W - D;
  const gf = list.reduce((a, m) => a + m.goals, 0), ga = list.reduce((a, m) => a + m.goalsAgainst, 0);
  return { n: list.length, W, D, L, winPct: pct(W, list.length), ppg: list.length ? +((3 * W + D) / list.length).toFixed(2) : null, gf, ga, gfAvg: list.length ? +(gf / list.length).toFixed(1) : null, gaAvg: list.length ? +(ga / list.length).toFixed(1) : null };
};
const lineupOf = m => m.players.map(p => p.name).sort().join(' · ');
const deltaCell = d => d === null ? '–' : `<span class="${d > 0 ? 'delta-pos' : d < 0 ? 'delta-neg' : ''}">${d > 0 ? '+' : ''}${d} pt</span>`;
const matchTip = m => `<b>${esc(m.opponent.name || 'Onbekend')} ${m.goals}–${m.goalsAgainst} (${m.result})</b>${fmtDateTime(m.ts)} · ${m.matchType === 'playoffMatch' ? 'playoff' : 'league'}${m.opponent.skillRating ? ` · skill ${m.opponent.skillRating}` : ''}<br>${esc(m.players.map(p => p.name).join(', '))}`;

function enrich(matches) {
  const sorted = [...matches].sort((a, b) => a.ts - b.ts);
  let session = 0, posInSession = 0, prev = null;
  for (const m of sorted) {
    if (!prev || m.ts - prev.ts > 90 * 60) { session++; posInSession = 0; }
    posInSession++;
    const d = new Date(m.ts * 1000);
    Object.assign(m, { session, posInSession, weekday: d.getDay(), hour: d.getHours(), goalDiff: m.goals - m.goalsAgainst, lineup: lineupOf(m) });
    prev = m;
  }
  return sorted;
}

function filtered() {
  const range = $('#range').value, type = $('#type').value;
  const since = range === 'all' ? 0 : Date.now() / 1000 - Number(range) * 86400;
  return DATA.matches.filter(m => m.ts >= since && (type === 'all' || m.matchType === type));
}

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

  // Met / zonder
  const ww = players.map(name => {
    const withP = ms.filter(m => m.players.some(p => p.name === name)), without = ms.filter(m => !m.players.some(p => p.name === name));
    const a = summarize(withP), b = summarize(without);
    const ratings = withP.map(m => m.players.find(p => p.name === name).rating).filter(r => r !== null);
    return { name, n: a.n, nWithout: b.n, withPct: a.winPct, withoutPct: b.winPct, delta: a.winPct !== null && b.winPct !== null ? a.winPct - b.winPct : null, gf: a.gfAvg, ga: a.gaAvg, rating: ratings.length ? +(ratings.reduce((x, y) => x + y, 0) / ratings.length).toFixed(2) : null };
  }).sort((x, y) => (y.delta ?? -999) - (x.delta ?? -999));
  table($('#tbl-with-without'), [
    { label: 'Speler', key: 'name' }, { label: 'Met', num: true, render: r => `${fmtPct(r.withPct)} <small>(${r.n})</small>` },
    { label: 'Zonder', num: true, render: r => `${fmtPct(r.withoutPct)} <small>(${r.nWithout})</small>` },
    { label: 'Verschil', num: true, render: r => deltaCell(r.delta) },
    { label: 'Voor–tegen', num: true, render: r => `${r.gf ?? '–'} – ${r.ga ?? '–'}` }, { label: 'Rating', num: true, render: r => r.rating ?? '–' },
  ], ww, { rowClass: r => (r.n < 3 || r.nWithout < 3) ? 'low' : '' });

  // Opstellingen
  const groups = new Map();
  for (const m of ms) { if (!groups.has(m.lineup)) groups.set(m.lineup, []); groups.get(m.lineup).push(m); }
  const lineups = [...groups].map(([lineup, list]) => ({ lineup, ...summarize(list) })).filter(l => l.n >= 2).sort((a, b) => b.n - a.n || b.winPct - a.winPct);
  table($('#tbl-lineups'), [
    { label: 'Opstelling', wrap: true, render: r => esc(r.lineup) }, { label: 'N', num: true, key: 'n' },
    { label: 'Winst', num: true, render: r => `<span class="bar" style="width:${r.winPct * 0.6}px"></span>${fmtPct(r.winPct)}` },
    { label: 'W-G-V', num: true, render: r => `${r.W}-${r.D}-${r.L}` }, { label: 'Voor–tegen', num: true, render: r => `${r.gfAvg} – ${r.gaAvg}` },
  ], lineups, { empty: 'Nog geen opstelling met 2 of meer wedstrijden.' });

  // Betrokkenheid: aandeel van een speler in de balacties van het team
  const actions = p => (p.passAttempts || 0) + (p.shots || 0) + (p.tackleAttempts || 0);
  const invRows = ms.map(m => { const total = m.players.reduce((a, p) => a + actions(p), 0); return { m, total, byName: Object.fromEntries(m.players.map(p => [p.name, { acts: actions(p), share: total ? actions(p) / total : null, passes: p.passAttempts || 0 }])) }; });
  const avg = xs => xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null;
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

  // Positie per speler
  const posMap = new Map();
  for (const m of ms) for (const p of m.players) { const k = `${p.name}|${p.pos}`; if (!posMap.has(k)) posMap.set(k, { name: p.name, pos: p.pos, list: [], ratings: [], goals: 0, assists: 0 }); const e = posMap.get(k); e.list.push(m); if (p.rating !== null) e.ratings.push(p.rating); e.goals += p.goals || 0; e.assists += p.assists || 0; }
  const positions = [...posMap.values()].map(e => ({ ...e, ...summarize(e.list), rating: e.ratings.length ? +(e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length).toFixed(2) : null })).sort((a, b) => a.name.localeCompare(b.name) || b.n - a.n);
  table($('#tbl-positions'), [
    { label: 'Speler', key: 'name' }, { label: 'Positie', render: r => POS_NL[r.pos] || r.pos }, { label: 'N', num: true, key: 'n' },
    { label: 'Winst', num: true, render: r => fmtPct(r.winPct) }, { label: 'Rating', num: true, render: r => r.rating ?? '–' }, { label: 'G + A', num: true, render: r => `${r.goals} + ${r.assists}` },
  ], positions, { rowClass: r => r.n < 3 ? 'low' : '' });

  // Tegenstanders
  const rated = ms.filter(m => m.opponent.skillRating);
  scatter($('#chart-opponents'), rated.map(m => ({ x: m.opponent.skillRating, y: m.goalDiff, color: resultColor(m.result), tip: matchTip(m) })), { xLabel: 'skill rating tegenstander', yLabel: 'doelsaldo' });
  const buckets = [['< 1500', 0, 1500], ['1500–1699', 1500, 1700], ['1700–1899', 1700, 1900], ['≥ 1900', 1900, 1e9]].map(([label, lo, hi]) => ({ label, ...summarize(rated.filter(m => m.opponent.skillRating >= lo && m.opponent.skillRating < hi)) })).filter(b => b.n);
  table($('#tbl-opponents'), [
    { label: 'Skill rating', key: 'label' }, { label: 'N', num: true, key: 'n' }, { label: 'Winst', num: true, render: r => fmtPct(r.winPct) },
    { label: 'Punten/wed.', num: true, key: 'ppg' }, { label: 'Voor–tegen', num: true, render: r => `${r.gfAvg} – ${r.gaAvg}` },
  ], buckets);

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

  // Alle wedstrijden
  table($('#tbl-matches'), [
    { label: 'Datum', render: r => fmtDateTime(r.ts) }, { label: 'Type', render: r => r.matchType === 'playoffMatch' ? 'playoff' : 'league' },
    { label: 'Tegenstander', render: r => esc(r.opponent.name) }, { label: 'Score', num: true, render: r => `${r.goals}–${r.goalsAgainst}` },
    { label: 'Uitslag', render: r => `<span class="res-${r.result}">${r.result}</span>` }, { label: 'Skill tegenst.', num: true, render: r => r.opponent.skillRating ?? '–' },
    { label: 'Mensen tegenst.', num: true, render: r => r.opponent.humanPlayers ?? '–' }, { label: 'Opstelling', render: r => esc(r.lineup) },
  ], [...ms].reverse());
}

async function load() {
  const res = await fetch('/api/data');
  DATA = await res.json();
  DATA.matches = enrich(DATA.matches);
  const counts = new Map();
  for (const m of DATA.matches) for (const p of m.players) counts.set(p.name, (counts.get(p.name) || 0) + 1);
  [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([name], i) => playerSlot.set(name, i));
  $('#club-name').textContent = DATA.club.name;
  const s = DATA.snapshot;
  $('#club-sub').textContent = `${s ? `${s.wins}W ${s.ties}G ${s.losses}V volgens EA · ` : ''}${DATA.matches.length} wedstrijden in de database · laatst opgehaald ${DATA.lastRun ? fmtDateTime(DATA.lastRun.started_at) : 'nooit'}${DATA.lastRun?.error ? ` (fout: ${DATA.lastRun.error})` : ''}`;
  render();
}

for (const id of ['#range', '#type', '#inv-player']) $(id).addEventListener('change', render);
addEventListener('resize', () => DATA && render());
$('#theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
});
try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
load().catch(e => { $('#club-sub').textContent = `Kon data niet laden: ${e.message}`; });
