// Clubhouse: de startpagina over de club als geheel (docs/coach-logica.md §9a), visueel en eenvoudig. Clubcijfers komen
// van EA, alles over spelers, vorm en nieuws uit de gevolgde wedstrijden in DATA (zie common.js).

const rolling = (xs, k) => xs.map((_, i) => { const w = xs.slice(Math.max(0, i - k + 1), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });

// ---------- hero ----------
// Het stadion (stadiumSvg) staat in common.js: de sessiekop gebruikt het ook.
function homeHero(ms) {
  const c = DATA.club, s = DATA.snapshot, k = c.kits;
  const kicker = k?.stadium ? esc(k.stadium) : '';
  const meta = [s?.skillRating ? `Skill rating ${s.skillRating}` : '', s?.currentDivision ? `Divisie ${s.currentDivision}` : ''].filter(Boolean).join(' · ');
  $('#home-hero').innerHTML = `${stadiumSvg()}
    <div class="hh-body">
      <img class="hh-crest" src="crest.png" alt="Clublogo van ${esc(c.name)}" width="256" height="256">
      <div class="hh-id">
        ${kicker ? `<p class="hh-kicker">${kicker}</p>` : ''}
        <h1 class="hh-name">${esc(c.name)}</h1>
        ${meta ? `<p class="hh-meta">${meta}</p>` : ''}
      </div>
      ${ms.length ? `<div class="hh-form" aria-label="Laatste ${Math.min(10, ms.length)} wedstrijden">${formDots(ms.slice(-10))}</div>` : ''}
    </div>`;
}

// ---------- seizoen: totalen volgens EA en de vorm over de gevolgde wedstrijden ----------
function totals() {
  const s = DATA.snapshot; if (!s) { $('#totals').hidden = true; return; }
  const items = [
    ['Wedstrijden', s.gamesPlayed], ['Gewonnen', s.wins], ['Gelijk', s.ties], ['Verloren', s.losses],
    ['Winst', s.gamesPlayed ? `${Math.round(100 * s.wins / s.gamesPlayed)}%` : '–'], ['Doelpunten', s.goals], ['Tegengoals', s.goalsAgainst], ['Clean sheets', s.cleanSheets ?? '–'],
  ];
  $('#totals').innerHTML = items.map(([l, v]) => `<div><dt>${l}</dt><dd>${v ?? '–'}</dd></div>`).join('');
}

// Vormgrafiek (coach-logica §9a): per wedstrijd een staafje (doelsaldo, kleur = uitslag), met daardoorheen één lijn:
// het doelsaldo gemiddeld over vijf. Een tik of muis toont de wedstrijd.
function formChart(container, ms) {
  if (!ms.length) { container.innerHTML = '<p class="empty">Nog geen wedstrijden.</p>'; return; }
  const width = Math.max(320, Math.min(1400, container.clientWidth || 800)), height = 230;
  const { svg, inner } = frame(container, width, height, { l: 34, t: 10, r: 8, b: 26 });
  const n = ms.length, own = DATA.snapshot?.skillRating;
  const gd = rolling(ms.map(m => m.goalDiff), 5);
  const all = [...ms.map(m => m.goalDiff), ...gd, 0];
  const yt = niceTicks(Math.min(...all), Math.max(...all), 4), y0 = Math.min(...all, yt[0]), y1 = Math.max(...all, yt.at(-1));
  const step = inner.w / n, sx = i => inner.x + (i + 0.5) * step, sy = v => inner.y + inner.h - (v - y0) / (y1 - y0) * inner.h;
  yAxis(svg, inner, sy, yt, v => v > 0 ? `+${v}` : v);
  el('line', { x1: inner.x, x2: inner.x + inner.w, y1: sy(0), y2: sy(0), stroke: 'var(--axis)', 'stroke-width': 1 }, svg);
  let lastX = -Infinity;
  ms.forEach((m, i) => {
    if ((i === 0 || m.session !== ms[i - 1].session) && sx(i) - lastX > 56) { text(svg, sx(i), inner.y + inner.h + 18, fmtDate(m.ts), { class: 'tick', 'text-anchor': 'middle' }); lastX = sx(i); }
  });
  const bw = Math.max(2, Math.min(18, step * 0.62)), fill = { W: 'var(--pos)', L: 'var(--neg)', D: 'var(--neutral)' };
  const bars = ms.map((m, i) => {
    const top = Math.min(sy(0), sy(m.goalDiff)), h = Math.max(2, Math.abs(sy(m.goalDiff) - sy(0)));
    return el('rect', { x: sx(i) - bw / 2, y: m.goalDiff === 0 ? sy(0) - 1 : top, width: bw, height: h, rx: Math.min(3, bw / 3), fill: fill[m.result], 'fill-opacity': 0.5 }, svg);
  });
  el('path', { d: smoothPath(gd.map((v, i) => [sx(i), sy(v)])), fill: 'none', stroke: 'var(--brand)', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const hit = el('rect', { class: 'hit', x: inner.x, y: inner.y, width: inner.w, height: inner.h }, svg);
  let on = null, pointer = 'mouse';
  hit.addEventListener('pointerdown', e => { pointer = e.pointerType; });
  hit.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') pointer = 'mouse'; });
  hit.addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) * width / r.width - inner.x) / step))), m = ms[i];
    if (on !== null) bars[on].setAttribute('fill-opacity', 0.5);
    bars[i].setAttribute('fill-opacity', 1); on = i;
    const opp = m.opponent.skillRating ? `rating ${m.opponent.skillRating}${own ? ` (${signed(m.opponent.skillRating - own, 0)} tegenover ons)` : ''}` : 'rating onbekend';
    showTip(`<b>${letter(m.result)} ${m.goals}–${m.goalsAgainst} tegen ${esc(m.opponent.name)}</b>${dayLabel(m.ts)} · ${opp}${m.winnerByDnf ? ' · opgave' : ''}<br>Doelsaldo gemiddeld over 5: ${signed(gd[i], 1)}`, e);
  });
  // Na een tik stuurt de browser soms meteen mouseleave; dan blijft de tooltip staan tot een tik ernaast (common.js).
  hit.addEventListener('mouseleave', () => { if (pointer !== 'mouse') return; if (on !== null) bars[on].setAttribute('fill-opacity', 0.5); on = null; hideTip(); });
  // Muis: een klik opent de wedstrijd. Telefoon: een tik toont alleen de tooltip (common.js); naar de wedstrijd via de rondjes.
  hit.addEventListener('click', e => pointer === 'mouse' && (location.href = matchHref(ms[Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - svg.getBoundingClientRect().left) * width / svg.getBoundingClientRect().width - inner.x) / step)))])));
}

// Kerncijfers in de kop: de laatste tien tegenover de wedstrijden daarvoor.
function seasonFigs(ms) {
  if (ms.length < 3) { $('#fig-season').innerHTML = ''; return; }
  const last = ms.slice(-10), before = ms.slice(0, -10), T = 'Laatste tien tegenover de gevolgde wedstrijden daarvoor';
  const a = summarize(last), b = before.length >= 5 ? summarize(before) : null;
  $('#fig-season').innerHTML = figsHtml([
    { label: 'Punten per wedstrijd', value: a.ppg.toFixed(1), delta: b && deltaOf(a.ppg, b.ppg, { digits: 1, title: T }) },
    { label: 'Doelsaldo', color: 'var(--brand)', value: signed(a.gfAvg - a.gaAvg, 1), delta: b && deltaOf(a.gfAvg - a.gaAvg, b.gfAvg - b.gaAvg, { digits: 1, title: `${T} (per wedstrijd)` }) },
  ]);
}

// In het kort (coach-logica §9a): drie regels in woorden, elk één vergelijking met een duidelijke basis.
function kort(ms) {
  const lines = [];
  const won = list => `${list.filter(m => m.result === 'W').length} van de ${list.length}`;
  const pctW = list => Math.round(100 * list.filter(m => m.result === 'W').length / list.length);
  const tone = (good, txt) => `<span class="kort-tag ${good === true ? 'up' : good === false ? 'down' : ''}">${txt}</span>`;
  // 1. Laatste avond tegenover normaal
  const sess = sessionsOf(ms), last = sess.at(-1);
  if (last && last.matches.length >= 2) {
    const rest = ms.filter(m => m.session !== last.id), a = summarize(last.matches), b = rest.length >= 3 ? summarize(rest) : null;
    const d = b ? a.ppg - b.ppg : null;
    lines.push({ label: 'Laatste avond', main: `${won(last.matches)} gewonnen`, tag: d === null ? '' : tone(d >= 0.3 ? true : d <= -0.3 ? false : null, d >= 0.3 ? 'beter dan normaal' : d <= -0.3 ? 'slechter dan normaal' : 'zoals normaal') });
  }
  // 2. Deze week tegenover vorige week
  const now = ms.at(-1)?.ts ?? 0, week = 7 * 86400;
  const thisW = ms.filter(m => m.ts > now - week), prevW = ms.filter(m => m.ts <= now - week && m.ts > now - 2 * week);
  if (thisW.length >= 3) lines.push({ label: 'Deze week', main: `${pctW(thisW)}% gewonnen`, tag: prevW.length >= 3 ? tone(pctW(thisW) - pctW(prevW) >= 10 ? true : pctW(prevW) - pctW(thisW) >= 10 ? false : null, `vorige week ${pctW(prevW)}%`) : '' });
  // 3. Tegen sterkere clubs tegenover de rest
  const own = DATA.snapshot?.skillRating;
  if (own) {
    const strong = ms.filter(m => m.opponent.skillRating >= own + 100), rest = ms.filter(m => m.opponent.skillRating && m.opponent.skillRating < own + 100);
    if (strong.length >= 3 && rest.length >= 3) lines.push({ label: 'Tegen sterkere clubs', main: `${pctW(strong)}% gewonnen`, tag: tone(null, `tegen de rest ${pctW(rest)}%`) });
  }
  $('#kort').innerHTML = lines.map(l => `<div class="kort-row"><span class="kort-label">${l.label}</span><b>${l.main}</b>${l.tag}</div>`).join('');
}

// ---------- per speler: totalen uit de gevolgde wedstrijden ----------
function playerTotals(ms) {
  const out = new Map();
  for (const m of ms) for (const p of m.players) {
    const t = out.get(p.name) || { name: p.name, n: 0, nEv: 0, g: 0, a: 0, sa: 0, mom: 0, ratings: [], pm: 0, pa: 0, tm: 0, ta: 0, won: 0 };
    t.n++; t.g += p.goals || 0; t.a += p.assists || 0; t.mom += p.mom || 0; if (p.rating !== null) t.ratings.push(p.rating);
    t.pm += p.passesMade || 0; t.pa += p.passAttempts || 0; t.tm += p.tacklesMade || 0; t.ta += p.tackleAttempts || 0;
    if (p.ev) { t.nEv++; t.sa += p.ev.second_assists || 0; t.won += p.ev.possession_won || 0; }
    out.set(p.name, t);
  }
  return [...out.values()].map(t => ({ ...t, involved: t.g + t.a + t.sa, rating: avg(t.ratings) }));
}

// Ranglijst: negen stats die iedereen snapt (coach-logica §9a). v = waarde om op te sorteren, main = wat er staat,
// sub = het totaal eronder. null = niet genoeg data.
const per = (x, n) => n ? (x / n).toFixed(1) : '–'; // sorteren gebeurt op het exacte getal (v)
const count = (key, label, total, games, { about, who = 'Minstens 3 wedstrijden.' }) => ({ key, label, about, who, v: t => games(t) ? total(t) / games(t) : null, main: t => per(total(t), games(t)), sub: t => `${total(t)} in ${games(t)}` });
// about: waar de score op gebaseerd is; who: wie meetelt. Staat in het uitlegscherm van elke ranglijst.
// Algemeen (coach-logica §9a): één rij kaartjes. De eerste vier over de hele carrière bij de club volgens EA
// (rating, goals, assists, man of the match; ook van vóór deze app), de rest over de gevolgde wedstrijden. Op het
// kaartje alleen het getal; het kleine cijfer staat in het uitlegscherm. Gelijk: wie meer wedstrijden speelde hoger
// (rating), wie het in minder wedstrijden deed hoger (totalen).
const BASE = 'Alleen de wedstrijden die deze app volgt, niet de hele EA-carrière.';
const CAREER = 'Iedereen in de selectie, over alle wedstrijden voor de club volgens EA, ook van vóór deze app.';
const career = (key, label, about, v, main, sub, tie) => ({ key, label, about, who: CAREER,
  rows: DATA.members.filter(m => m.gamesPlayed > 0 && v(m) !== null && v(m) !== undefined).sort((a, b) => v(b) - v(a) || tie(b) - tie(a)).map(m => ({ name: m.name, main: main(m), sub: sub(m) })) });
const tracked = (key, label, about, who, totals, v, main, sub) => ({ key, label, about, who: `${who} ${BASE}`,
  rows: totals.filter(t => t.n >= 3).map(t => ({ t, v: v(t) })).filter(x => x.v !== null && x.v !== undefined).sort((a, b) => b.v - a.v).map(x => ({ name: x.t.name, main: main(x.t), sub: sub(x.t) })) });
function clubCards(totals) {
  const per = (x, n) => n ? (x / n).toFixed(2) : '–';
  return [
    career('rating', 'Rating', 'De gemiddelde matchrating over alle wedstrijden voor de club, zoals EA die bijhoudt (één decimaal; bij gelijk telt wie meer wedstrijden speelde).', m => m.ratingAve, m => f1(m.ratingAve), m => `${m.gamesPlayed} wedstrijden`, m => m.gamesPlayed),
    career('goals', 'Goals', 'Doelpunten over de hele carrière bij de club volgens EA.', m => m.goals, m => String(m.goals), m => `${per(m.goals, m.gamesPlayed)} per wedstrijd`, m => -m.gamesPlayed),
    career('assists', 'Assists', 'De laatste pass voor een doelpunt, over de hele carrière bij de club volgens EA.', m => m.assists, m => String(m.assists), m => `${per(m.assists, m.gamesPlayed)} per wedstrijd`, m => -m.gamesPlayed),
    career('mom', 'Man of the match', 'Hoe vaak EA iemand tot man of the match koos, over de hele carrière bij de club.', m => m.mom, m => String(m.mom), m => `${m.gamesPlayed ? Math.round(100 * m.mom / m.gamesPlayed) : 0}% van de wedstrijden`, m => -m.gamesPlayed),
    tracked('index', 'Frambroos-index', 'Wat iemand zelf bijdraagt, los van de uitslag. Per wedstrijd vier onderdelen: afronden, creëren, aan de bal en verdedigen. Elk cijfer wordt vergeleken met alle spelers op dezelfde positie die we tegenkwamen, tegenstanders inbegrepen, en de onderdelen tellen mee naar de build van die wedstrijd. 50 is gemiddeld voor de rol; bij weinig wedstrijden wordt de score naar 50 getrokken.', 'Minstens 3 wedstrijden van 45 minuten of langer.', totals, t => DATA.fi[t.name]?.score ?? null, t => fiFmt(DATA.fi[t.name].score), t => fiLabel(DATA.fi[t.name].score)),
    tracked('involved', 'Betrokken bij goals', 'Goals, assists en tweede assists (de pass vóór de assist) samen, per wedstrijd. Zo telt ook wie de aanval opzet.', 'Minstens 3 wedstrijden.', totals, t => t.n ? t.involved / t.n : null, t => per(t.involved, t.n), t => `${t.involved} in ${t.n} wedstrijden`),
    tracked('pass', 'Passnauwkeurigheid', 'Geslaagde passes gedeeld door alle passes. Wie veel risico neemt met steekpasses komt lager uit dan wie vooral breed speelt; kijk dus ook naar de rol.', 'Minstens 3 wedstrijden en 40 passes.', totals, t => t.pa >= 40 ? t.pm / t.pa : null, t => `${Math.round(100 * t.pm / t.pa)}%`, t => `${t.pm} van ${t.pa}`),
    tracked('won', 'Balwinst', 'Hoe vaak iemand de bal verovert per wedstrijd: onderscheppingen, gewonnen duels en losse ballen volgens de gebeurtenissen die EA meegeeft.', 'Minstens 3 wedstrijden waarvan EA de gebeurtenissen meegaf.', totals, t => t.nEv ? t.won / t.nEv : null, t => per(t.won, t.nEv), t => `${t.won} in ${t.nEv} wedstrijden`),
    tracked('duels', 'Duels gewonnen', 'Gewonnen tackles gedeeld door alle tackles.', 'Minstens 3 wedstrijden en 15 tackles.', totals, t => t.ta >= 15 ? t.tm / t.ta : null, t => `${Math.round(100 * t.tm / t.ta)}%`, t => `${t.tm} van ${t.ta}`),
  ];
}

function render() {
  const ms = DATA.matches;
  homeHero(ms);
  kort(ms);
  totals();
  seasonFigs(ms);
  formChart($('#chart-form'), ms);
  const latest = newsArticles()[0];
  $('#news').innerHTML = latest ? newsCard(latest, { lead: true }) : '<p class="empty">Nog geen nieuws: speel een avond, dan schrijft het zichzelf.</p>';
  PlayerCard.reveal($('#news'));
  $('#results').innerHTML = ms.slice(-4).reverse().map(m => matchCard(m, { own: DATA.snapshot?.skillRating })).join('') || '<p class="muted">Nog geen wedstrijden.</p>';
  rankCards($('#rank-cards'), clubCards(playerTotals(ms)));

  // Selectie als spelerskaarten (playercard.js), gesorteerd op vorm: tier, dan de rating van de laatste sessie, dan wedstrijden.
  // De favoriet van wie de app gebruikt vooraan (coach-logica §9a), daarna op vorm.
  const fav = favorite();
  const members = DATA.members.map(m => ({ m, t: PlayerCard.tier(m.name) }))
    .sort((a, b) => (b.m.name === fav) - (a.m.name === fav) || PlayerCard.TIER_RANK[b.t.tier] - PlayerCard.TIER_RANK[a.t.tier] || (b.t.level ?? 0) - (a.t.level ?? 0) || (b.m.gamesPlayed || 0) - (a.m.gamesPlayed || 0));
  $('#members').innerHTML = members.map(({ m }) => `<a class="member" href="spelers.html#${encodeURIComponent(m.name)}" aria-label="${esc(proName(m.name))}">
      <span class="fut-mini">${PlayerCard.html(m.name)}</span>${m.name === fav ? `<span class="member-tag"><span class="fav-star" title="Je favoriet">${STAR}</span></span>` : ''}</a>`).join('');
  PlayerCard.reveal($('#members'));
}

// Uitlegscherm van een ranglijst: sluiten met de knop, Esc of een tik naast het scherm.
$('#rank-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });

// Topspelers: de eerste vier ranglijsten open, de rest achter de knop.
$('#rank-more').addEventListener('click', e => {
  const open = $('#rank-cards').classList.toggle('all');
  e.currentTarget.setAttribute('aria-expanded', String(open));
  e.currentTarget.textContent = open ? 'Minder ranglijsten' : 'Alle ranglijsten';
});

onWidthChange(() => DATA && formChart($('#chart-form'), DATA.matches));
window.rerender = () => render();
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
