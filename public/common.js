// Gedeelde helpers voor alle dashboardpagina's: data laden, model, grafieken, tabellen.
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
// Naam van de pro (Terry Yaki) voor een accountnaam (Neegek): zo praat de app over spelers. Onbekend: de accountnaam.
const proName = n => DATA?.members?.find(x => x.name === n)?.proName || n;


// ---------- app-shell: zijmenu ----------
const ICONS = {
  club: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  sessions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  players: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.7 2.6 3 5.2"/></svg>',
  matches: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.5 4.5h-4.6l-1.5-4.5z"/><path d="M12 3v4.5M15.8 10.3l4.6-1.5M14.3 14.8l2.8 3.9M9.7 14.8l-2.8 3.9M8.2 10.3L3.6 8.8"/></svg>',
  builds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.3-.6-.6-2.3z"/></svg>',
  analysis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none"/></svg>',
};
// Paden zijn relatief, zodat de app ook als losse bestanden werkt (statische export, src/export.js).
// In de export staat window.FRAMBROOS_STATIC: data komt dan uit bestanden naast de pagina en alles is alleen-lezen.
const STATIC = !!window.FRAMBROOS_STATIC;
const API = STATIC ? { data: 'data.json', builds: 'builds.json', photos: 'photos.json' } : { data: '/api/data', builds: '/api/builds', photos: '/api/photos' };
const PAGE = location.pathname.split('/').pop() || 'index.html';
const LOGO = '<span class="mark"><img src="crest.png" alt="" width="44" height="44"></span>';
const NAV = [
  { href: 'index.html', label: 'Clubhouse', icon: 'club' },
  { href: 'sessies.html', label: 'Sessies', icon: 'sessions' },
  { href: 'wedstrijden.html', label: 'Wedstrijden', short: 'Games', icon: 'matches' },
  { href: 'spelers.html', label: 'Spelers', icon: 'players', group: true },
];
(function mountShell() {
  const side = $('#sidebar'); if (!side) return;
  // Een laag dieper: het tabblad erboven. Een sessie niet: daar is Sessies niet actief, zodat een tik terug naar de lijst gaat.
  const path = { 'wedstrijd.html': 'wedstrijden.html', 'nieuws.html': 'index.html' }[PAGE] || PAGE;
  side.innerHTML = `<a class="brand" href="index.html">${LOGO}<span>Frambroos<b>Coach</b></span></a>
    <nav class="side-nav" aria-label="Hoofdmenu">${NAV.map(n => n.group ? `<div class="nav-group" id="nav-group-players"><a href="${n.href}" class="nav-group-head ${n.href === path ? 'in-group' : ''}" aria-controls="player-nav" aria-expanded="true">${ICONS[n.icon]}<span>${n.label}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></a><div class="sub-nav" id="player-nav" aria-label="Spelers"></div></div>` : `<a href="${n.href}" class="${n.href === path ? 'active' : ''}${n.short ? ' has-short' : ''}"${n.href === path ? ' aria-current="page"' : ''}>${ICONS[n.icon]}<span class="nl-long">${n.label}</span>${n.short ? `<span class="nl-short" aria-hidden="true">${n.short}</span>` : ''}</a>`).join('')}</nav>
    <div class="side-foot"><div class="club" id="club-box"><div class="club-meta">Data laden…</div></div>
    <button id="menu-btn" class="icon-btn" type="button" title="Menu: zoeken, modus en instellingen" aria-label="Menu" aria-haspopup="dialog">${ICONS.menu}</button></div>`;
  // Het menu (coach-logica §9a, Menu): zoeken door wedstrijden, sessies en spelers, de modus, en instellingen.
  document.body.insertAdjacentHTML('beforeend', `<dialog class="rank-dialog app-menu" id="app-menu" aria-labelledby="am-title"><button type="button" class="icon-btn rd-close" aria-label="Sluiten">✕</button>
    <div class="rd-body"><h2 id="am-title">Menu</h2>
      <label class="am-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="am-q" placeholder="Zoek een tegenstander, speler of datum" autocomplete="off" enterkeyhint="search"></label>
      <ul class="am-results" id="am-results"></ul>
      <h3>Modus</h3>
      <div class="am-seg" role="radiogroup" aria-label="Modus">${[['all', 'Alles'], ['leagueMatch', 'League'], ['playoffMatch', 'Playoff']].map(([v, l]) => `<button type="button" role="radio" data-mode="${v}">${l}</button>`).join('')}</div>
      <p class="am-note">Geldt voor de hele app: alleen die wedstrijden tellen mee.</p>
      <h3>Rating</h3>
      <div class="am-seg" role="radiogroup" aria-label="Rating"><button type="button" role="radio" aria-checked="true" class="on">EA</button><button type="button" role="radio" aria-checked="false" disabled>Eigen <small>binnenkort</small></button></div>
      <h3>Weergave</h3>
      <div class="am-seg" role="radiogroup" aria-label="Weergave"><button type="button" role="radio" data-theme-pick="dark">Thuis (donker)</button><button type="button" role="radio" data-theme-pick="light">Uit (licht)</button></div>
      <p class="am-note" id="am-fresh"></p>
    </div></dialog>`);
})();
// Spelersnamen onder het kopje Spelers in het menu; de actieve speler volgt de hash op de spelerspagina.
function fillPlayerNav() {
  const nav = $('#player-nav'); if (!nav || !DATA) return;
  const onPlayers = PAGE === 'spelers.html';
  const current = onPlayers ? decodeURIComponent(location.hash.slice(1)) || (DATA.players.includes('Neegek') ? 'Neegek' : DATA.players[0]) : null;
  nav.innerHTML = DATA.players.map(n => `<a href="spelers.html#${encodeURIComponent(n)}" class="${n === current ? 'active' : ''}"${n === current ? ' aria-current="page"' : ''}>${esc(proName(n))}</a>`).join('');
}
addEventListener('hashchange', () => fillPlayerNav());

// Alleen opnieuw tekenen als de breedte echt verandert: op een telefoon geeft het in- en uitklappen van de adresbalk bij
// het scrollen ook een resize, en dan zouden kaarten en foto's opnieuw verschijnen.
function onWidthChange(fn) { let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; fn(); } }); }

// Favoriete speler van wie de app gebruikt (coach-logica §9a): er is er hooguit één, onthouden per browser.
const FAV_KEY = 'favoritePlayer';
const favorite = () => { try { return localStorage.getItem(FAV_KEY); } catch { return null; } };
const setFavorite = name => { try { name ? localStorage.setItem(FAV_KEY, name) : localStorage.removeItem(FAV_KEY); } catch {} };
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/></svg>';

const showError = e => { const b = $('#club-box .club-meta'); if (b) b.textContent = `Kon data niet laden: ${e.message}`; console.error(e); };

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
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
const hideTip = () => { tip.hidden = true; };
// Telefoon: een tik op een grafiek toont dezelfde tooltip als bewegen met de muis; een tik ernaast sluit hem.
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  if (e.target.closest?.('svg.chart .hit')) e.target.dispatchEvent(new MouseEvent('mousemove', { clientX: e.clientX, clientY: e.clientY, bubbles: true }));
  else hideTip();
});

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
  const band = inner.w / items.length, bw = Math.max(3, Math.min(26, band * 0.62));
  const baseline = sy(Math.max(0, y0));
  if (zeroLine || y0 < 0) el('line', { class: 'axis', x1: inner.x, x2: inner.x + inner.w, y1: baseline, y2: baseline, stroke: 'var(--axis)' }, svg);
  let lastRight = -Infinity; // rechterrand van het vorige x-label, zodat labels op een smal scherm niet overlappen
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
    const half = String(it.label || '').length * 3.4 + 4;
    if (it.label && i % labelEvery === 0 && x + bw / 2 - half > lastRight) { text(svg, x + bw / 2, inner.y + inner.h + 18, it.label, { class: 'tick', 'text-anchor': 'middle' }); lastRight = x + bw / 2 + half; }
    const hit = el('rect', { class: 'hit', x: inner.x + band * i, y: inner.y, width: band, height: inner.h }, svg);
    if (it.tip) { hit.addEventListener('mousemove', e => showTip(it.tip, e)); hit.addEventListener('mouseleave', hideTip); }
  });
}

function scatter(container, points, { height = 240, xLabel, yLabel, xPad = 50, xFmt = v => v, yZero = true } = {}) {
  if (!points.length) { container.innerHTML = '<p class="empty">Nog geen tegenstanders met skill rating.</p>'; return; }
  const width = Math.max(320, Math.min(1100, container.clientWidth || 520));
  const { svg, inner } = frame(container, width, height, { l: 40, t: 12, r: 12, b: 36 });
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const xt = niceTicks(Math.min(...xs) - xPad, Math.max(...xs) + xPad, 5), yt = yZero ? niceTicks(Math.min(0, ...ys) - 1, Math.max(0, ...ys) + 1, 4) : niceTicks(Math.min(...ys) - 0.5, Math.max(...ys) + 0.5, 4);
  const x0 = xt[0], x1 = xt[xt.length - 1], y0 = yt[0], y1 = yt[yt.length - 1];
  const sx = v => inner.x + (v - x0) / (x1 - x0) * inner.w, sy = v => inner.y + inner.h - (v - y0) / (y1 - y0) * inner.h;
  yAxis(svg, inner, sy, yt);
  for (const t of xt) text(svg, sx(t), inner.y + inner.h + 18, xFmt(t), { class: 'tick', 'text-anchor': 'middle' });
  if (yZero) el('line', { x1: inner.x, x2: inner.x + inner.w, y1: sy(0), y2: sy(0), stroke: 'var(--axis)' }, svg);
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
// Monotone kubische spline (Fritsch–Carlson) als SVG-pad door de punten.
function smoothPath(pts) {
  const n = pts.length; if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); dy.push((pts[i + 1][1] - pts[i][1]) / dx[i]); }
  m.push(dy[0]); for (let i = 1; i < n - 1; i++) m.push(dy[i - 1] * dy[i] <= 0 ? 0 : (dy[i - 1] + dy[i]) / 2); m.push(dy[n - 2]);
  for (let i = 0; i < n - 1; i++) { if (dy[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; } const a = m[i] / dy[i], b = m[i + 1] / dy[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * dy[i]; m[i + 1] = t * b * dy[i]; } }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`; }
  return d;
}
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
  // Vloeiende lijn (monotone kubische interpolatie: schiet niet over de punten heen) en optioneel een zachte vlakvulling.
  const gid = `g${Math.random().toString(36).slice(2, 8)}`;
  const defs = el('defs', {}, svg);
  series.forEach((s, si) => {
    const runs = []; for (const p of s.values) { const r = runs[runs.length - 1]; if (r && r[r.length - 1].i === p.i - 1) r.push(p); else runs.push([p]); }
    for (const run of runs) {
      const pts = run.map(p => [sx(p.i), sy(p.v)]);
      const d = smoothPath(pts);
      if (s.area && pts.length > 1) {
        if (!defs.querySelector(`#${gid}-${si}`)) {
          const g = el('linearGradient', { id: `${gid}-${si}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
          el('stop', { offset: '0%', 'stop-color': s.color, 'stop-opacity': 0.22 }, g); el('stop', { offset: '100%', 'stop-color': s.color, 'stop-opacity': 0 }, g);
        }
        const base = inner.y + inner.h;
        el('path', { d: `${d} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`, fill: `url(#${gid}-${si})`, stroke: 'none' }, svg);
      }
      el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    }
  });
  const dots = series.map(s => el('circle', { r: 4.5, fill: s.color, stroke: 'var(--surface)', 'stroke-width': 2, visibility: 'hidden' }, svg));
  const cross = el('line', { x1: 0, x2: 0, y1: inner.y, y2: inner.y + inner.h, stroke: 'var(--axis)', 'stroke-dasharray': '3 3', visibility: 'hidden' }, svg);
  const hit = el('rect', { class: 'hit', x: inner.x, y: inner.y, width: inner.w, height: inner.h }, svg);
  hit.addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * width / r.width;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - inner.x) / inner.w * (n - 1))));
    cross.setAttribute('x1', sx(i)); cross.setAttribute('x2', sx(i)); cross.setAttribute('visibility', 'visible');
    series.forEach((s, si) => { const p = s.values.find(q => q.i === i); if (p) { dots[si].setAttribute('cx', sx(i)); dots[si].setAttribute('cy', sy(p.v)); dots[si].setAttribute('visibility', 'visible'); } else dots[si].setAttribute('visibility', 'hidden'); });
    if (tipAt) showTip(tipAt(i), e);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('visibility', 'hidden'); dots.forEach(d => d.setAttribute('visibility', 'hidden')); hideTip(); });
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
  const resid = list.length ? +(list.reduce((a, m) => a + (m.resid ?? 0), 0) / list.length).toFixed(2) : null;
  return { n: list.length, W, D, L, winPct: pct(W, list.length), ppg: list.length ? +((3 * W + D) / list.length).toFixed(2) : null, resid, gf, ga, gfAvg: list.length ? +(gf / list.length).toFixed(1) : null, gaAvg: list.length ? +(ga / list.length).toFixed(1) : null };
};
const lineupOf = m => m.players.map(p => proName(p.name)).sort().join(' · ');
const deltaCell = (d, unit = ' pt', digits = 0) => d === null || d === undefined ? '–' : `<span class="${d > 0.005 ? 'delta-pos' : d < -0.005 ? 'delta-neg' : ''}">${d > 0 ? '+' : ''}${(+d).toFixed(digits)}${unit}</span>`;
const avg = xs => xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null;
const residCell = v => deltaCell(v, '', 1);
// Groei (coach-logica §9c): één decimaal, zonder ",0" bij een heel getal (+1, -0.4); groen boven nul, rood eronder.
const fmtGrowth = v => { const r = Math.round(v * 10) / 10; return `${r > 0 ? '+' : ''}${Number.isInteger(r) ? r : r.toFixed(1)}`; };
const growthCell = v => v === null || v === undefined ? '' : `<span class="${v >= 0.05 ? 'delta-pos' : v <= -0.05 ? 'delta-neg' : ''}">${fmtGrowth(v)}</span>`;
const f1 = v => v === null || v === undefined ? '–' : (+v).toFixed(1);
const splitCell = (w, r, fmt = v => v) => (w === null || w === undefined) && (r === null || r === undefined) ? '–' : `<span class="split"><span class="res-W">${fmt(w)}</span> <small>/</small> <span class="res-L">${fmt(r)}</span></span>`;
// Correlatie waarbij positief slecht nieuws is (meer gemiste tackles, meer schoten tegen): rood boven 0,3.
const corrCell = v => v === null || v === undefined ? '–' : `<span class="${v >= 0.3 ? 'delta-neg' : v <= -0.3 ? 'delta-pos' : ''}">${v.toFixed(2)}</span>`;
const corr = (xs, ys) => { const n = xs.length; if (n < 3) return null; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2; } return sx && sy ? +(sxy / Math.sqrt(sx * sy)).toFixed(2) : null; };
const oppShots = m => m.opponentPlayers.reduce((a, p) => a + (p.shots || 0), 0);
const hasHumanGk = m => m.opponentPlayers.some(p => p.pos === 'goalkeeper');
const shapeOf = m => { const c = { defender: 0, midfielder: 0, forward: 0 }; for (const p of m.opponentPlayers) if (c[p.pos] !== undefined) c[p.pos]++; return `${c.defender}-${c.midfielder}-${c.forward}${hasHumanGk(m) ? ' +K' : ''}`; };
const matchTip = m => `<b>${esc(m.opponent.name || 'Onbekend')} ${m.goals}–${m.goalsAgainst} (${m.result})</b>${fmtDateTime(m.ts)} · ${m.matchType === 'playoffMatch' ? 'playoff' : 'league'}${m.opponent.skillRating ? ` · skill ${m.opponent.skillRating}` : ''} · ${m.opponentPlayers.length} mensen${m.resid !== undefined ? ` · tov verwachting ${m.resid > 0 ? '+' : ''}${m.resid.toFixed(1)}` : ''}<br>${esc(m.players.map(p => p.name).join(', '))}`;

// Nieuwe sessie na 3 uur zonder wedstrijd (zelfde grens als src/sessions.js).
const SESSION_GAP = 180 * 60;
function enrich(matches) {
  const sorted = [...matches].sort((a, b) => a.ts - b.ts);
  let session = 0, posInSession = 0, prev = null;
  for (const m of sorted) {
    if (!prev || m.ts - prev.ts > SESSION_GAP) { session++; posInSession = 0; }
    posInSession++;
    const d = new Date(m.ts * 1000);
    Object.assign(m, { session, posInSession, weekday: d.getDay(), hour: d.getHours(), goalDiff: m.goals - m.goalsAgainst, lineup: lineupOf(m) });
    prev = m;
  }
  // Leesbare adressen (coach-logica §9a): een sessie heet naar de datum van de eerste wedstrijd (2026-11-01), een
  // wedstrijd naar datum en tegenstander (2026-11-01-war-team). Zelfde dag of tegenstander nog eens: -2, -3, ...
  const seen = new Map(), uniq = k => { const n = (seen.get(k) || 0) + 1; seen.set(k, n); return n === 1 ? k : `${k}-${n}`; };
  const firstOf = new Map();
  for (const m of sorted) {
    if (!firstOf.has(m.session)) firstOf.set(m.session, uniq(dayKey(m.ts)));
    m.sessionKey = firstOf.get(m.session);
    m.slug = uniq(`${dayKey(m.ts)}-${slugText(m.opponent?.name) || 'onbekend'}`);
  }
  return sorted;
}
// Datum zoals in het adres, in Nederlandse tijd (voor iedereen hetzelfde): 2026-11-01.
const dayKey = ts => new Date(ts * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
const slugText = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const matchHref = m => `wedstrijd.html?id=${m.slug}`;
// Sessie bezig (coach-logica §9a): de laatste wedstrijd is minder dan SESSION_GAP geleden, dus er kan nog iets bij.
const sessionLive = s => Date.now() / 1000 - s.matches[s.matches.length - 1].ts < SESSION_GAP;
// Reveal: alleen de nieuwste sessie, als die klaar is en deze kijker hem nog niet heeft geopend (onthouden in de browser).
const revealKey = s => `reveal:${s.key}`;
const revealSeen = s => { try { return !!localStorage.getItem(revealKey(s)); } catch { return true; } };
const markRevealed = s => { try { localStorage.setItem(revealKey(s), String(Date.now())); } catch {} };
const revealPending = (s, all) => s === all[all.length - 1] && !sessionLive(s) && !revealSeen(s);
const sessionHref = s => `sessie.html?id=${s.key ?? s.matches?.[0]?.sessionKey ?? s.sessionKey}`;

// Verwachtingsmodel: doelsaldo ~ a + b·(skillverschil/100) + c·(mensen tegenstander − eigen mensen).
// Kleinste kwadraten op alle wedstrijden; bij te weinig data vaste, voorzichtige coëfficiënten.
function solve3(A, b) {
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    if (Math.abs(M[c][c]) < 1e-9) return null;
    for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => row[3] / row[i]);
}
function fitModel(matches, ownRating) {
  const rows = matches.map(m => ({ x1: m.opponent.skillRating && ownRating ? (m.opponent.skillRating - ownRating) / 100 : 0, x2: m.opponentPlayers.length - m.players.length, y: m.goalDiff }));
  let coef = null, fitted = false;
  if (rows.length >= 10) {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (const r of rows) { const x = [1, r.x1, r.x2]; for (let i = 0; i < 3; i++) { b[i] += x[i] * r.y; for (let k = 0; k < 3; k++) A[i][k] += x[i] * x[k]; } }
    coef = solve3(A, b);
    // Alleen accepteren als de richting klopt (sterkere tegenstander of meer mensen = lager saldo).
    if (coef && coef[1] <= 0 && coef[2] <= 0 && Math.abs(coef[1]) < 5 && Math.abs(coef[2]) < 3) fitted = true;
    else {
      // Mensen-effect vast op −0,4; alleen intercept en skill-effect schatten.
      const C2 = -0.4, ys = rows.map(r => r.y - C2 * r.x2), xs = rows.map(r => r.x1);
      const n = rows.length, mx = avg(xs), my = avg(ys);
      let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
      const b1 = sxx ? sxy / sxx : 0;
      coef = b1 <= 0 && b1 > -5 ? [my - b1 * mx, b1, C2] : null;
      fitted = !!coef;
    }
  }
  if (!coef) coef = [0, -0.6, -0.4];
  const predict = m => coef[0] + coef[1] * (m.opponent.skillRating && ownRating ? (m.opponent.skillRating - ownRating) / 100 : 0) + coef[2] * (m.opponentPlayers.length - m.players.length);
  return { coef, fitted, n: rows.length, predict };
}

function filtered() {
  const range = $('#range')?.value || 'all', type = $('#type')?.value || 'all';
  const since = range === 'all' ? 0 : Date.now() / 1000 - Number(range) * 86400;
  return DATA.matches.filter(m => m.ts >= since && (type === 'all' || m.matchType === type));
}


// ---------- laden ----------
async function loadData() {
  // Zolang de data laadt: een dun lijntje bovenaan en pulserende vlakken (html.loading, .skel in style.css).
  document.documentElement.classList.add('loading');
  try { return await loadDataInner(); } finally { document.documentElement.classList.remove('loading'); }
}
async function loadDataInner() {
  // Site: bij elke verversing de nieuwste data, ook langs de cache van GitHub Pages heen.
  const res = await fetch(STATIC ? `${API.data}?t=${Date.now()}` : API.data, { cache: STATIC ? 'no-store' : 'default' });
  DATA = await res.json();
  DATA.matches = enrich(DATA.matches);
  DATA.model = fitModel(DATA.matches, DATA.snapshot?.skillRating);
  for (const m of DATA.matches) { m.expected = DATA.model.predict(m); m.resid = m.goalDiff - m.expected; }
  // Modus uit het menu: alleen league of alleen playoff. Na het model en de sessies, zodat die op alles gerekend blijven.
  const mode = getMode(); if (mode !== 'all') DATA.matches = DATA.matches.filter(m => m.matchType === mode);
  const counts = new Map();
  for (const m of DATA.matches) for (const p of m.players) counts.set(p.name, (counts.get(p.name) || 0) + 1);
  DATA.players = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  DATA.players.forEach((name, i) => playerSlot.set(name, i));
  if (typeof computeFrambroosIndex === 'function') computeFrambroosIndex(); // frambroos-index.js, waar geladen
  fillPlayerNav();
  const s = DATA.snapshot, box = $('#club-box');
  // Lokale app: de server haalt bij het laden de nieuwste wedstrijden live bij EA op (src/live.js).
  const L = DATA.live, freshness = L ? (L.error ? `live ophalen lukte niet (${esc(L.error)}); opgeslagen data` : `live bijgewerkt ${new Date(L.at * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`)
    : STATIC ? `bijgewerkt ${fmtDateTime(DATA.generatedAt)}`
    : `laatste nieuwe data ${DATA.lastRun ? fmtDateTime(DATA.lastRun.started_at) : 'nooit'}${DATA.lastRun?.error ? ` · fout: ${esc(DATA.lastRun.error)}` : ''}`;
  DATA.freshness = freshness.replace(/<[^>]+>/g, ''); // ook voor de startpagina, want op telefoon is het menu een balk
  if (box) box.innerHTML = `<div class="club-meta"><span class="freshness">${freshness}</span></div>`; // het menu zegt alleen hoe vers de data is
  if (L?.newMatches) {
    const note = document.createElement('p'); note.className = 'live-note'; note.setAttribute('role', 'status');
    note.textContent = `${capFirst(numWord(L.newMatches))} ${L.newMatches === 1 ? 'wedstrijd is' : 'wedstrijden zijn'} net live bij EA opgehaald en ${L.newMatches === 1 ? 'telt' : 'tellen'} al mee. Opslaan gebeurt bij de volgende verzamelrun.`;
    $('.page-head, .home-hero, .back-link, .player-hero, .sess-stage')?.insertAdjacentElement('afterend', note);
  }
  liveTrigger(); // site: op de achtergrond, de pagina wacht er niet op
  return DATA;
}

// Site: bij openen of verversen start de site de verzamelaar via een Cloudflare Worker (worker/trigger.js; een
// webpagina mag EA niet zelf aanroepen). Zodra die klaar is en nieuwe data heeft gepubliceerd, verschijnt een knop.
// Lukt iets niet, dan blijft gewoon de opgeslagen data staan.
let liveRunning = false;
async function liveTrigger() {
  const url = window.FRAMBROOS_TRIGGER;
  if (!STATIC || !url || liveRunning) return;
  liveRunning = true;
  const call = method => fetch(url, { method, cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clock = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const setFresh = text => { const f = $('#club-box .freshness'); if (f) f.textContent = text; };
  let res;
  try { res = await call('POST'); } catch { return; }
  const busy = res.run && res.run.status !== 'completed';
  if (!res.started && !busy) { if (res.run?.conclusion === 'success') setFresh(`bij EA gekeken ${clock(res.run.updatedAt)}`); return; }
  // De run die we volgen: de net gestarte (verschijnt pas na een paar seconden) of de run die al liep.
  const since = res.started ? res.at - 5 : res.run.createdAt;
  const note = document.createElement('p'); note.className = 'live-note'; note.setAttribute('role', 'status');
  note.textContent = 'Nieuwe wedstrijden worden bij EA opgehaald, dat duurt ongeveer twee minuten.';
  $('.page-head, .home-hero, .back-link, .player-hero, .sess-stage')?.insertAdjacentElement('afterend', note);
  for (let i = 0; i < 24; i++) { // hooguit zes minuten volgen
    await wait(15000);
    const run = (await call('GET').catch(() => ({}))).run;
    if (!run || run.createdAt < since || run.status !== 'completed') continue;
    if (run.conclusion === 'success') setFresh(`bij EA gekeken ${clock(run.updatedAt)}`);
    // De run publiceert de site zelf; GitHub Pages kan een paar seconden achterlopen.
    for (let j = 0; j < 4; j++) {
      const fresh = await fetch(`${API.data}?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
      const added = fresh && fresh.generatedAt > DATA.generatedAt ? fresh.matches.length - DATA.matches.length : 0;
      if (added > 0) {
        note.innerHTML = `${capFirst(numWord(added))} nieuwe ${added === 1 ? 'wedstrijd' : 'wedstrijden'} binnen. <button type="button" class="more-btn">Verversen</button>`;
        note.querySelector('button').addEventListener('click', () => location.reload());
        return;
      }
      if (fresh && fresh.generatedAt > DATA.generatedAt) break; // nieuwe publicatie zonder nieuwe wedstrijden
      await wait(5000);
    }
    note.remove();
    return;
  }
  note.remove();
}

// ---------- menu: zoeken, modus en instellingen ----------
// Modus: alle wedstrijden, alleen league of alleen playoff (onthouden per browser; loadData filtert erop).
const MODE_KEY = 'mode';
const getMode = () => { try { return localStorage.getItem(MODE_KEY) || 'all'; } catch { return 'all'; } };
function syncMenu() {
  const mode = getMode(), light = document.documentElement.dataset.theme === 'light';
  for (const b of document.querySelectorAll('#app-menu [data-mode]')) { const on = b.dataset.mode === mode; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
  for (const b of document.querySelectorAll('#app-menu [data-theme-pick]')) { const on = (b.dataset.themePick === 'light') === light; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
  $('#menu-btn')?.classList.toggle('has-mode', mode !== 'all');
  const f = $('#am-fresh'); if (f) f.textContent = DATA?.freshness ? `Data: ${DATA.freshness}.` : '';
}
// Zoeken: tegenstanders (wedstrijden), spelers (pro-naam of accountnaam) en datums (sessies), hooguit twaalf treffers.
function menuSearch(q) {
  const out = $('#am-results'); q = q.trim().toLowerCase();
  if (!q || !DATA) { out.innerHTML = ''; return; }
  const hits = [];
  for (const name of DATA.players) if (proName(name).toLowerCase().includes(q) || name.toLowerCase().includes(q)) hits.push(`<li><a href="spelers.html#${encodeURIComponent(name)}"><span class="am-kind">Speler</span><b>${esc(proName(name))}</b></a></li>`);
  for (const s of sessionsOf(DATA.matches).reverse()) { const d = dayLabel(s.matches[0].ts); if (d.toLowerCase().includes(q)) hits.push(`<li><a href="${sessionHref(s)}"><span class="am-kind">Sessie</span><b>${esc(d)}</b><small>${s.matches.length} ${s.matches.length === 1 ? 'wedstrijd' : 'wedstrijden'}</small></a></li>`); }
  for (const m of [...DATA.matches].reverse()) if (m.opponent.name.toLowerCase().includes(q)) hits.push(`<li><a href="${matchHref(m)}"><span class="am-kind">${letter(m.result)}</span><b>${esc(m.opponent.name)}</b><small>${m.goals}–${m.goalsAgainst} · ${esc(dayLabel(m.ts))}</small></a></li>`);
  out.innerHTML = hits.slice(0, 12).join('') || '<li class="empty">Niets gevonden.</li>';
}
$('#menu-btn')?.addEventListener('click', () => { syncMenu(); $('#app-menu').showModal(); });
$('#am-q')?.addEventListener('input', e => menuSearch(e.target.value));
for (const b of document.querySelectorAll('#app-menu [data-mode]')) b.addEventListener('click', () => {
  try { b.dataset.mode === 'all' ? localStorage.removeItem(MODE_KEY) : localStorage.setItem(MODE_KEY, b.dataset.mode); } catch {}
  location.reload(); // de hele app rekent opnieuw met de gekozen wedstrijden
});
// Standaard donker (thuistenue); licht (uittenue) wordt onthouden per browser.
for (const b of document.querySelectorAll('#app-menu [data-theme-pick]')) b.addEventListener('click', () => {
  const root = document.documentElement, light = b.dataset.themePick === 'light';
  if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
  try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch {}
  syncMenu();
  if (DATA && typeof window.rerender === 'function') window.rerender();
});

const tagHtml = c => c ? `<span class="tag ${c}">${c}</span>` : '';
const signed = (v, d = 1) => v === null || v === undefined ? '–' : `${v > 0 ? '+' : ''}${(+v).toFixed(d)}`;
const pills = ms => `<span class="pills">${ms.map(m => `<span class="pill ${m.result}" title="${esc(m.opponent.name)} ${m.goals}–${m.goalsAgainst}">${m.result === 'D' ? 'G' : m.result === 'L' ? 'V' : 'W'}</span>`).join('')}</span>`;
const sessionsOf = ms => { const g = new Map(); for (const m of ms) { if (!g.has(m.session)) g.set(m.session, []); g.get(m.session).push(m); } return [...g].map(([id, list]) => ({ id, key: list[0].sessionKey, matches: list })); };

// Uitslag als letter (W/G/V), meervoud, korte datum, en wedstrijden als rondjes (oudste links, de laatste omlijnd).
// Met links opent elk rondje de wedstrijd; zonder links (in een kaart die zelf een link is) zijn het gewone rondjes.
const letter = r => r === 'D' ? 'G' : r === 'L' ? 'V' : 'W';
const plural = (n, one, more) => `${n} ${n === 1 ? one : more}`;
const dayLabel = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });

// Beste speler van een avond: de hoogste gemiddelde rating onder wie minstens de helft van de wedstrijden speelde.
function bestOfNight(night) {
  const per = new Map();
  for (const m of night) for (const p of m.players) {
    const x = per.get(p.name) || { n: p.name, r: [], g: 0, a: 0, mom: 0 };
    if (p.rating !== null) x.r.push(p.rating);
    x.g += p.goals || 0; x.a += p.assists || 0; x.mom += p.mom || 0;
    per.set(p.name, x);
  }
  return [...per.values()].filter(x => x.r.length && x.r.length >= Math.max(1, night.length / 2))
    .map(x => ({ ...x, v: avg(x.r) })).sort((a, b) => b.v - a.v)[0] || null;
}

// Reeks van één speler (coach-logica §9c): per wedstrijd een rondje in de kleur van de uitslag met de rating die de
// speler kreeg. rows = [{ m, p }]; met links opent een rondje de wedstrijd.
const ratingDots = (rows, { links = true } = {}) => `<ol class="rdots">${rows.map(({ m, p }) => {
  const v = p.rating === null ? '–' : p.rating >= 10 ? '10' : f1(p.rating), title = `${letter(m.result)} ${m.goals}–${m.goalsAgainst} tegen ${esc(m.opponent.name)}: rating ${p.rating ?? '–'}`;
  return `<li>${links ? `<a class="tl-dot ${m.result}" href="${matchHref(m)}" title="${title}">${v}</a>` : `<span class="tl-dot ${m.result}" title="${title}">${v}</span>`}</li>`;
}).join('')}</ol>`;
const formDots = (ms, { links = true } = {}) => `<ol class="form-dots">${ms.map((m, i) => {
  const cls = `dot ${m.result}${i === ms.length - 1 ? ' last' : ''}`, title = `${letter(m.result)} ${m.goals}–${m.goalsAgainst} tegen ${esc(m.opponent.name)}, ${dayLabel(m.ts)}`;
  return `<li>${links ? `<a class="${cls}" href="${matchHref(m)}" title="${title}">` : `<span class="${cls}" title="${title}">`}${letter(m.result)}${links ? '</a>' : '</span>'}</li>`;
}).join('')}</ol>`;

const joinAnd = xs => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} en ${xs[xs.length - 1]}`;
const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ---------- archetypes (builds) ----------
// archetypeid → naam uit het spel. Bron: MeelanFC/FC-27-ClubsXI, docs/03-ea-api.md (alle 13 bevestigd in FC27).
const ARCHETYPES = {
  1: { name: 'Shot Stopper', line: 'keeper' }, 2: { name: 'Sweeper Keeper', line: 'keeper' },
  3: { name: 'Progressor', line: 'verdediging' }, 4: { name: 'Boss', line: 'verdediging' }, 5: { name: 'Disruptor', line: 'verdediging of middenveld' },
  6: { name: 'Marauder', line: 'back of middenveld' }, 7: { name: 'Recycler', line: 'middenveld' }, 8: { name: 'Maestro', line: 'middenveld' },
  9: { name: 'Creator', line: 'middenveld of aanval' }, 10: { name: 'Spark', line: 'vleugel' }, 11: { name: 'Magician', line: 'aanval' },
  12: { name: 'Finisher', line: 'spits' }, 13: { name: 'Target', line: 'spits' },
};
const archName = id => ARCHETYPES[id]?.name ?? (id ? `Build ${id}` : '–');
const NUM_WORD = ['geen', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];
const numWord = n => NUM_WORD[n] ?? String(n);

// Kleurindicatie van een tenue (romp, mouwen en kraag, bies).
// Logo van de tegenstander (docs/ea-data.md): EA's CDN voor clublogo's, met het eigen logo-id (crestAssetId) of bij
// een echt clublogo het teamId. Laadt het niet, dan het shirt in de clubkleuren.
const CREST_URL = id => `https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l${id}.png`;
function oppBadge(opp) {
  const id = opp?.club?.crestAssetId || opp?.club?.teamId;
  if (!id) return kitShirt(opp?.kit, opp?.name || '');
  return `<span class="opp-badge"><img src="${CREST_URL(id)}" alt="${esc(opp.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('no-crest')">${kitShirt(opp.kit, opp.name)}</span>`;
}
// Dialoog met een vaste balk onderaan (blijft staan bij scrollen): in het midden een rustige knop naar een andere pagina,
// links en rechts eventueel kleine knoppen naar de vorige en volgende (nav.prev/next: { label, face, go }).
// Ranglijstkaartjes (coach-logica §9a, Algemeen): per kaartje een label en alle spelers met één getal, zonder
// sublabels; een tik opent #rank-dialog met de uitleg, wie meetelt en de hele lijst met het kleine cijfer erbij.
// cards: [{ key, label, about, who, rows: [{ name, main, sub }], team?: { label, main, sub } }]. team staat onderaan,
// zonder plek: het totaal of gemiddelde van het team. Gedeeld door het Clubhouse en een sessie.
function rankCards(container, cards) {
  // Een kaartje met small (bij een percentage het aantal) krijgt twee regels per speler: groot het getal, klein eronder.
  const val = r => `<b>${r.main}${r.small ? `<small>${esc(r.small)}</small>` : ''}</b>`;
  container.innerHTML = cards.map(c => `<button type="button" class="rank-card${c.rows.some(r => r.small) ? ' two' : ''}" data-key="${c.key}" aria-haspopup="dialog">
      <span class="rank-card-label">${c.label}<span class="rank-more" aria-hidden="true">i</span></span>
      <ol>${c.rows.map((r, i) => `<li><span>${i + 1}</span><span>${esc(proName(r.name))}</span>${val(r)}</li>`).join('') || `<li class="empty">${c.empty || 'Nog te weinig wedstrijden.'}</li>`}${c.team ? `<li class="team"><span></span><span>${esc(c.team.label)}</span>${val(c.team)}</li>` : ''}</ol></button>`).join('');
  for (const b of container.querySelectorAll('.rank-card')) b.addEventListener('click', () => openRankList(cards.find(c => c.key === b.dataset.key)));
}
function openRankList(c) {
  const d = $('#rank-dialog'); if (!d) return;
  d.querySelector('.rd-body').innerHTML = `<h2 id="rd-title">${c.label}</h2>
    <h3>Waar het op gebaseerd is</h3><p>${c.about}</p>
    <h3>Wie meetelt</h3><p>${c.who}</p>
    <h3>De hele lijst</h3>
    <ol class="rd-list">${c.rows.map((r, i) => `<li><span>${i + 1}</span><span>${esc(proName(r.name))}</span><b>${r.main}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</li>`).join('') || `<li class="empty">${c.empty || 'Nog te weinig wedstrijden.'}</li>`}${c.team ? `<li class="rd-club"><span></span><span>${esc(c.team.label)}</span><b>${c.team.main}</b>${c.team.sub ? `<small>${esc(c.team.sub)}</small>` : ''}</li>` : ''}</ol>`;
  d.showModal();
}
// Sluiten werkt overal hetzelfde, ook op telefoon: een tik op het kruisje of naast het scherm. Op pointerup én click,
// zodat een tik in een omhoog geschoven paneel nooit verloren gaat (coach-logica §9a).
// Sluiten met een animatie (coach-logica §9a): elk scherm schuift weg zoals het kwam (telefoon naar beneden, groot scherm
// vervagend), ook bij Esc. Zonder beweging (prefers-reduced-motion) meteen dicht.
const nativeClose = HTMLDialogElement.prototype.close;
HTMLDialogElement.prototype.close = function (value) {
  if (!this.open || this.classList.contains('closing') || matchMedia('(prefers-reduced-motion: reduce)').matches) return nativeClose.call(this, value);
  this.classList.add('closing');
  setTimeout(() => { this.classList.remove('closing'); nativeClose.call(this, value); }, 220);
};
document.addEventListener('cancel', e => { if (e.target instanceof HTMLDialogElement) { e.preventDefault(); e.target.close(); } }, true);
// Ronde pijltjes naar de vorige en volgende (sessie, wedstrijd): één element, overal hetzelfde. Zonder doel een lege
// plek, zodat de titel in het midden blijft.
const NAV_PATH = { prev: 'M15 18l-6-6 6-6', next: 'M9 18l6-6-6-6' };
const navArrow = (dir, href, label) => href ? `<a class="ss-nav ${dir}" href="${href}" aria-label="${esc(label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${NAV_PATH[dir]}"/></svg></a>`
  : `<span class="ss-nav ${dir} empty" aria-hidden="true"></span>`;
// Na een tik die het scherm sloot, wordt de klik die erop volgt ingeslikt: anders raakt die wat eronder ligt.
let swallowClick = 0;
const closeDialog = e => { const d = e.target.closest?.('dialog'); if (!d?.open) return false; if (e.target.closest('.rd-close') || e.target === d) { e.preventDefault(); d.close(); return true; } return false; };
document.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse' && closeDialog(e)) swallowClick = Date.now(); });
document.addEventListener('click', e => { if (Date.now() - swallowClick < 600) { e.preventDefault(); e.stopPropagation(); swallowClick = 0; return; } closeDialog(e); }, true);
function dialogFoot(d, href, label, nav = {}) {
  let f = d.querySelector('.rd-foot');
  if (!f) { f = document.createElement('div'); f.className = 'rd-foot'; d.append(f); }
  const arrow = dir => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}"/></svg>`;
  // Vlakke knoppen die de hele balk vullen, met alleen scheidingslijnen; zonder vorige of volgende vult de middelste knop de ruimte.
  const side = dir => { const x = nav[dir]; return x ? `<button type="button" class="rd-foot-nav ${dir}" aria-label="${dir === 'prev' ? 'Vorige' : 'Volgende'}: ${esc(x.label)}" title="${esc(x.label)}">${dir === 'prev' ? arrow(dir) : ''}<span class="rd-face">${x.face}</span>${dir === 'next' ? arrow(dir) : ''}</button>` : ''; };
  const any = href || nav.prev || nav.next;
  f.hidden = !any;
  f.innerHTML = any ? `${side('prev')}${href ? `<a class="rd-foot-btn" href="${href}">${label}</a>` : '<span></span>'}${side('next')}` : '';
  for (const dir of ['prev', 'next']) f.querySelector(`button.${dir}`)?.addEventListener('click', () => nav[dir].go());
}
function kitShirt(c, label) {
  const [c1, c2, c3] = c || ['#888888', '#666666', '#444444'];
  return `<svg class="shirt" viewBox="0 0 64 60" role="img" aria-label="${esc(label)}">
    <path d="M22 4 L10 9 L2 22 L11 27 L14 22 L14 56 L50 56 L50 22 L53 27 L62 22 L54 9 L42 4 Q32 12 22 4 Z" fill="${c1}" stroke="var(--border-strong)" stroke-width="1"/>
    <path d="M10 9 L2 22 L11 27 L16 18 Z M54 9 L62 22 L53 27 L48 18 Z" fill="${c2}"/><path d="M22 4 Q32 12 42 4 L39 3 Q32 9 25 3 Z" fill="${c2}"/>
    <rect x="14" y="50" width="36" height="6" fill="${c3}"/></svg>`;
}

// EA-positiecodes (proPos van een pro: de ingestelde hoofdpositie).
const POS_CODE = ['GK', 'SW', 'RWB', 'RB', 'RCB', 'CB', 'LCB', 'LB', 'LWB', 'RDM', 'CDM', 'LDM', 'RM', 'RCM', 'CM', 'LCM', 'LM', 'RAM', 'CAM', 'LAM', 'RF', 'CF', 'LF', 'RW', 'RS', 'ST', 'LS', 'LW'];

// ---------- wedstrijdkaart ----------
// Eén kaartje per wedstrijd: uitslag, tegenstander, score, beste speler (of de eigen cijfers van één speler) en de
// badge "tov verwachting". Gedeeld door Wedstrijden, Sessies en de Vorm van een speler. Container: .match-cards.
function matchCard(m, { own = null, player = null } = {}) {
  const t = new Date(m.ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const diff = m.opponent.skillRating && own ? m.opponent.skillRating - own : null;
  const str = diff === null ? '' : diff >= 250 ? 'veel sterker' : diff >= 100 ? 'sterker' : diff <= -100 ? 'zwakker' : '';
  const p = player ? m.players.find(x => x.name === player) : [...m.players].sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))[0];
  const foot = !p ? '' : player ? `<b>${p.rating ?? '–'}</b> ${p.goals} G, ${p.assists} A${p.mom ? ' · ★' : ''}`
    : `<b>${p.rating ?? '–'}</b> ${esc(proName(p.name))}`;
  const r = m.resid, badge = r === null || r === undefined ? '' : `<span class="kpi-badge ${r >= 0.5 ? 'up' : r <= -0.5 ? 'down' : ''}" title="Tov verwachting: doelsaldo tegenover wat de tegenstander deed verwachten">${signed(r, 1)}</span>`;
  return `<a class="mcard" href="${matchHref(m)}">
    <span class="mcard-top"><span class="pill ${m.result}">${m.result === 'D' ? 'G' : m.result === 'L' ? 'V' : 'W'}</span><span class="mcard-type">${m.matchType === 'playoffMatch' ? 'playoff' : 'league'} · ${t}${m.winnerByDnf ? ' · opgave' : ''}${m.live ? ' · live' : ''}</span></span>
    <span class="mcard-opp">${oppBadge(m.opponent)}<span><b>${esc(m.opponent.name)}</b><small>${m.opponent.skillRating ? `rating ${m.opponent.skillRating}${str ? `, ${str}` : ''}` : ''}${m.players.length !== m.opponentPlayers.length ? ` · ${m.players.length} tegen ${m.opponentPlayers.length}` : ''}</small></span></span>
    <span class="mcard-score">${m.goals}–${m.goalsAgainst}</span>
    <span class="mcard-foot"><span class="mcard-best">${foot}</span>${badge}</span></a>`;
}

// ---------- wedstrijdrij ----------
// Eén regel per wedstrijd met datum, uitslag, tegenstander, de beste speler en de score; klik opent de wedstrijdpagina.
// Beste speler: de hoogste EA-rating, met een kroon als die ook man of the match was (coach-logica §9a, Wedstrijden).
function matchRow(m, own) {
  const when = new Date(m.ts * 1000).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const diff = m.opponent.skillRating && own ? m.opponent.skillRating - own : null;
  const str = diff === null ? '' : diff >= 250 ? 'veel sterker' : diff >= 100 ? 'sterker' : diff <= -100 ? 'zwakker' : 'gelijkwaardig';
  const best = [...m.players].filter(p => p.rating !== null).sort((x, y) => y.rating - x.rating)[0];
  const bestHtml = best ? `<span class="mr-best-name">${esc(proName(best.name))}${best.mom ? ' <span class="crown" title="Man of the match">♛</span>' : ''}</span><b>${f1(best.rating)}</b>` : '';
  return `<a class="match-row" href="${matchHref(m)}">
    <span class="mr-time">${when}</span>
    <span class="pill ${m.result}">${letter(m.result)}</span>
    <span class="mr-opp">${oppBadge(m.opponent)}<span><b>${esc(m.opponent.name)}</b><small>${m.matchType === 'playoffMatch' ? 'playoff' : 'league'}${m.opponent.skillRating ? ` · rating ${m.opponent.skillRating}${str ? `, ${str}` : ''}` : ''}${m.winnerByDnf ? ' · opgave' : ''}${m.live ? ' · live, nog niet opgeslagen' : ''}</small><small class="mr-when">${best ? `${esc(best.name)} ${f1(best.rating)}${best.mom ? ' ♛' : ''} · ` : ''}${dayLabel(m.ts)}</small></span></span>
    <span class="mr-best" title="Beste speler van de wedstrijd">${bestHtml}</span>
    <span class="mr-score">${m.goals}–${m.goalsAgainst}</span></a>`;
}

// ---------- KPI-tegels ----------
// Label met badge (verandering; groen = beter, rood = slechter, grijs = gelijk), groot cijfer, korte regel.
function kpiTile(label, value, meta, delta, { small = false } = {}) {
  const badge = delta ? `<span class="kpi-badge ${delta.good === true ? 'up' : delta.good === false ? 'down' : ''}"${delta.title ? ` title="${esc(delta.title)}"` : ''}>${delta.txt}</span>` : '';
  return `<div class="tile"><div class="tile-head"><span class="label">${label}</span>${badge}</div><div class="value${small ? ' small' : ''}">${value}</div><div class="meta">${meta || ''}</div></div>`;
}
// Kerncijfers rechtsboven in een kaart: gekleurd bolletje, label, groot cijfer en optioneel een badge.
function figsHtml(items) {
  return items.map(f => `<div class="fig"><span class="fig-label">${f.color ? `<i style="--c:${f.color}"></i>` : ''}${f.label}</span><span class="fig-value">${f.value}${f.delta ? `<span class="kpi-badge ${f.delta.good === true ? 'up' : f.delta.good === false ? 'down' : ''}"${f.delta.title ? ` title="${esc(f.delta.title)}"` : ''}>${f.delta.txt}</span>` : ''}</span></div>`).join('');
}
// Verschil a − b als badge. hib: hoger is beter. min: kleiner verschil telt als gelijk.
function deltaOf(a, b, { digits = 1, unit = '', hib = true, min = 0.05, title = '' } = {}) {
  if (a === null || a === undefined || b === null || b === undefined || Number.isNaN(a) || Number.isNaN(b)) return null;
  const d = a - b;
  if (Math.abs(d) < min) return { txt: `±0${unit}`, good: null, title };
  return { txt: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(digits)}${unit}`, good: hib ? d > 0 : d < 0, title };
}

// ---------- uitleg achter een i-knop ----------
// Elke uitlegregel (p.hint) direct onder een kaarttitel is standaard verborgen; de i-knop in de titel klapt hem uit.
// Zo blijft een pagina rustig en blijft de uitleg wel bereikbaar. Kaarten met data-keep-hint houden de uitleg zichtbaar.
(function hintToggles() {
  for (const hint of document.querySelectorAll('.card p.hint')) {
    const prev = hint.previousElementSibling, head = prev?.classList.contains('sec-head') ? prev.querySelector('h2') : prev; // .sec-head: titel met link ernaast
    if (!head || !/^H[23]$/.test(head.tagName) || hint.closest('[data-keep-hint]')) continue;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'info'; btn.textContent = 'i';
    btn.setAttribute('aria-label', 'Uitleg'); btn.setAttribute('aria-expanded', 'false');
    head.appendChild(btn); hint.hidden = true;
    btn.addEventListener('click', () => { hint.hidden = !hint.hidden; btn.setAttribute('aria-expanded', String(!hint.hidden)); });
  }
})();

// ---------- stadion bij avond (Clubhouse-hero en sessiekop) ----------
// Eigen tekening met vaste kleuren, los van het thema (zoals de spelerskaart): lucht, vier lichtmasten, tribune met
// publiek in clubkleuren en een gemaaid veld in perspectief. Bijgesneden vanaf de bovenkant, zodat de lichtmasten
// altijd in beeld zijn. De tekst erop staat op een donkere overloop.
function stadiumSvg() {
  const masts = [110, 400, 800, 1090].map(x => `
    <circle cx="${x}" cy="46" r="130" fill="url(#hh-glow)"/>
    <path d="M${x} 52 V220" stroke="#2a2335" stroke-width="5"/>
    <rect x="${x - 26}" y="34" width="52" height="18" rx="3" fill="#fff7d6"/>
    <path d="M${x - 26} 43 H${x + 26} M${x - 9} 34 V52 M${x + 9} 34 V52" stroke="#d9cc8c" stroke-width="1.5"/>`).join('');
  const stripes = Array.from({ length: 12 }, (_, i) => {
    const t0 = i / 12, t1 = (i + 1) / 12, xa = 600 + (t0 - 0.5) * 1000, xb = 600 + (t1 - 0.5) * 1000, xc = 600 + (t1 - 0.5) * 2400, xd = 600 + (t0 - 0.5) * 2400;
    return `<path d="M${xa} 262 L${xb} 262 L${xc} 420 L${xd} 420 Z" fill="${i % 2 ? '#1d5a2b' : '#226833'}"/>`;
  }).join('');
  return `<svg class="hh-stadium" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hh-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07050d"/><stop offset="1" stop-color="#241233"/></linearGradient>
      <radialGradient id="hh-glow"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.55"/><stop offset="0.35" stop-color="#ffd76a" stop-opacity="0.16"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>
      <pattern id="hh-crowd" width="18" height="11" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="2.2" fill="#ffd200" fill-opacity="0.32"/><circle cx="9" cy="7" r="2.2" fill="#b07ac0" fill-opacity="0.30"/><circle cx="15" cy="3.5" r="2.2" fill="#f2f2f2" fill-opacity="0.18"/>
      </pattern>
      <linearGradient id="hh-pitch-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1200" height="420" fill="url(#hh-sky)"/>
    ${masts}
    <path d="M-20 120 Q600 92 1220 120 L1220 268 L-20 268 Z" fill="#150f1d"/>
    <path d="M-20 132 Q600 104 1220 132 L1220 266 L-20 266 Z" fill="url(#hh-crowd)"/>
    <path d="M-20 112 Q600 82 1220 112 L1220 128 Q600 98 -20 128 Z" fill="#2b2236"/>
    <path d="M-20 196 Q600 178 1220 196" stroke="#2b2236" stroke-width="5" fill="none"/>
    <rect x="-20" y="250" width="1240" height="14" fill="#582063"/>
    <path d="M-20 252 H1220" stroke="#ffd200" stroke-opacity="0.6" stroke-width="2"/>
    ${stripes}
    <rect x="0" y="262" width="1200" height="158" fill="url(#hh-pitch-fade)"/>
    <g stroke="#ffffff" stroke-opacity="0.3" stroke-width="2.5" fill="none">
      <path d="M100 272 H1100"/><path d="M600 272 V420"/><ellipse cx="600" cy="352" rx="150" ry="44"/>
    </g>
  </svg>`;
}

