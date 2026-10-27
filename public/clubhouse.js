// Clubhouse: de startpagina over de club als geheel (docs/coach-logica.md §9a). Clubcijfers komen van EA,
// alles over spelers en vorm uit de gevolgde wedstrijden in DATA (zie common.js).

const rolling = (xs, k) => xs.map((_, i) => { const w = xs.slice(Math.max(0, i - k + 1), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });

function shirt(c, label) {
  // Kleurindicatie van een tenue: romp in kleur 1, mouwen en kraag in kleur 2, bies in kleur 3.
  const [c1, c2, c3] = c;
  return `<figure class="kit"><svg viewBox="0 0 64 60" role="img" aria-label="${label}: ${c.slice(0, 3).join(', ')}">
    <path d="M22 4 L10 9 L2 22 L11 27 L14 22 L14 56 L50 56 L50 22 L53 27 L62 22 L54 9 L42 4 Q32 12 22 4 Z" fill="${c1}" stroke="var(--border-strong)" stroke-width="1"/>
    <path d="M10 9 L2 22 L11 27 L16 18 Z M54 9 L62 22 L53 27 L48 18 Z" fill="${c2}"/>
    <path d="M22 4 Q32 12 42 4 L39 3 Q32 9 25 3 Z" fill="${c2}"/>
    <rect x="14" y="50" width="36" height="6" fill="${c3}"/>
    <path d="M2 22 L11 27" stroke="${c3}" stroke-width="2.5"/><path d="M62 22 L53 27" stroke="${c3}" stroke-width="2.5"/>
  </svg><figcaption>${label}</figcaption></figure>`;
}

// Samenvatting (coach-logica §9): karakter en verloop van de periode, en tegen wie het lukt. Geen verbanden (§9d).
function teamSummary(ms) {
  if (!ms.length) return 'Nog geen wedstrijden in de gekozen periode.';
  const s = summarize(ms), own = DATA.snapshot?.skillRating, parts = [];
  const char = s.ppg >= 2 ? 'sterke' : s.ppg >= 1.5 ? 'goede' : s.ppg >= 1 ? 'wisselende' : 'moeizame';
  let arc = '';
  if (ms.length >= 8) {
    const half = Math.floor(ms.length / 2), a = summarize(ms.slice(0, half)), b = summarize(ms.slice(half)), d = b.ppg - a.ppg;
    arc = d <= -0.5 ? ': een sterke start, daarna werd het moeizamer' : d >= 0.5 ? ': na een stroeve start gaat het steeds beter' : '';
  }
  parts.push(`Een ${char} periode voor Frambroos${arc}.`);
  if (own) {
    const strong = summarize(ms.filter(m => m.opponent.skillRating >= own + 100)), rest = summarize(ms.filter(m => m.opponent.skillRating && m.opponent.skillRating < own + 100));
    if (strong.n >= 3 && rest.n >= 3) {
      if (strong.ppg <= rest.ppg - 0.7) parts.push('Tegen gelijkwaardige teams doen jullie goed mee, maar tegen de sterkere clubs is het nog een stap te ver.');
      else if (strong.ppg >= rest.ppg) parts.push('Ook tegen sterkere clubs houden jullie goed stand.');
    }
  }
  const last = sessionsOf(ms).at(-1);
  if (last && last.matches.length >= 2) { const l = summarize(last.matches); parts.push(l.L === 0 && l.D === 0 ? 'De laatste avond ging alles goed.' : l.W === 0 ? 'De laatste avond wilde het niet lukken.' : l.ppg >= 2 ? 'De laatste avond was een goede.' : 'De laatste avond was wisselend.'); }
  return parts.join(' ');
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
const per = (x, n) => n ? (x / n).toFixed(2) : '–';
const count = (key, label, total, games) => ({ key, label, v: t => games(t) ? total(t) / games(t) : null, main: t => per(total(t), games(t)), sub: t => `${total(t)} in ${games(t)}` });
const RANKS = [
  { key: 'index', label: 'Frambroos-index', v: t => DATA.fi[t.name]?.score ?? null, main: t => fiFmt(DATA.fi[t.name].score), sub: t => fiLabel(DATA.fi[t.name].score) },
  { key: 'rating', label: 'Rating', v: t => t.rating, main: t => f2(t.rating), sub: t => `${t.n} wedstrijden` },
  count('goals', 'Goals per wedstrijd', t => t.g, t => t.n),
  count('assists', 'Assists per wedstrijd', t => t.a, t => t.n),
  count('involved', 'Betrokken bij goals', t => t.involved, t => t.n),
  count('mom', 'Man of the match', t => t.mom, t => t.n),
  { key: 'pass', label: 'Passnauwkeurigheid', v: t => t.pa >= 40 ? t.pm / t.pa : null, main: t => `${Math.round(100 * t.pm / t.pa)}%`, sub: t => `${t.pm} van ${t.pa}` },
  count('won', 'Balwinst per wedstrijd', t => t.won, t => t.nEv),
  { key: 'duels', label: 'Duels gewonnen', v: t => t.ta >= 15 ? t.tm / t.ta : null, main: t => `${Math.round(100 * t.tm / t.ta)}%`, sub: t => `${t.tm} van ${t.ta}` },
];

// Ranglijst als swipebare kaartjes: per stat alle spelers, niets uitklappen.
function renderRanking(totals) {
  const rowsFor = R => totals.filter(t => t.n >= 3).map(t => ({ t, v: R.v(t) })).filter(x => x.v !== null && x.v !== undefined).sort((a, b) => b.v - a.v);
  $('#rank-cards').innerHTML = RANKS.map(R => { const rows = rowsFor(R); return `<div class="rank-card">
      <span class="rank-card-label">${R.label}</span>
      <ol>${rows.map((x, i) => `<li><span>${i + 1}</span><a href="spelers.html#${encodeURIComponent(x.t.name)}" title="${esc(R.sub(x.t))}">${esc(x.t.name)}</a><b>${R.main(x.t)}</b></li>`).join('') || '<li class="empty">Nog te weinig wedstrijden.</li>'}</ol></div>`; }).join('');
}

function clubHero() {
  const c = DATA.club, s = DATA.snapshot, k = c.kits;
  const facts = [
    s?.currentDivision ? `<span class="hero-fact"><b>Divisie ${s.currentDivision}</b>nu</span>` : '',
    s?.bestDivision ? `<span class="hero-fact"><b>Divisie ${s.bestDivision}</b>hoogst bereikt</span>` : '',
    s?.skillRating ? `<span class="hero-fact"><b>${s.skillRating}</b>skill rating</span>` : '',
    s?.gamesPlayed ? `<span class="hero-fact"><b>${s.gamesPlayed}</b>wedstrijden</span>` : '',
  ].join('');
  $('#club-hero').innerHTML = `<div class="hero-id"><img src="crest.png" alt="Clublogo van ${esc(c.name)}" width="96" height="96">
      <div><h2 class="hero-name">${esc(c.name)}</h2><p class="hero-meta">${k?.stadium ? `${esc(k.stadium)} · ` : ''}${c.platform === 'common-gen5' ? 'PS5, Xbox Series, PC' : esc(c.platform)}</p>
      <div class="hero-facts">${facts}</div></div></div>
    ${k ? `<div class="kits" aria-label="Tenues">${shirt(k.home, 'Thuis')}${shirt(k.away, 'Uit')}${shirt(k.third, 'Derde')}</div>` : ''}`;
}

function render() {
  const ms = DATA.matches, snap = DATA.snapshot;
  // Badges: laatste speelavond tegenover de avonden daarvoor (gevolgde wedstrijden).
  const sess = sessionsOf(ms), lastS = sess.length >= 2 ? sess[sess.length - 1].matches : null;
  const sl = lastS ? summarize(lastS) : null, sb = lastS ? summarize(ms.filter(m => !lastS.includes(m))) : null;
  const T = 'Laatste speelavond tegenover de avonden daarvoor (gevolgde wedstrijden)';
  $('#page-sub').textContent = `${ms.length} gevolgde wedstrijden sinds ${ms.length ? fmtDate(ms[0].ts) : '–'}; clubcijfers volgens EA.`;
  clubHero();

  const g = snap?.gamesPlayed, win = g ? Math.round(100 * snap.wins / g) : null;
  const streak = snap?.winStreak ? `${snap.winStreak} gewonnen` : snap?.unbeatenStreak ? `${snap.unbeatenStreak} ongeslagen` : (() => { const r = ms.slice().reverse(); let n = 0; while (n < r.length && r[n].result === r[0]?.result) n++; return n ? `${n} ${r[0].result === 'L' ? 'verloren' : r[0].result === 'D' ? 'gelijk' : 'gewonnen'}` : '–'; })();
  $('#tiles').innerHTML = [
    kpiTile('Winstpercentage', win === null ? '–' : `${win}%`, snap ? `${snap.wins}W ${snap.ties}G ${snap.losses}V` : '', sl && deltaOf(sl.winPct, sb.winPct, { digits: 0, unit: ' pt', min: 1, title: T })),
    kpiTile('Reeks', streak, snap?.unbeatenStreak && snap.unbeatenStreak !== snap.winStreak ? `${snap.unbeatenStreak} ongeslagen op rij` : 'op rij, volgens EA', null, { small: true }),
    kpiTile('Doelpunten', snap ? `${snap.goals}–${snap.goalsAgainst}` : '–', snap ? `doelsaldo ${signed(snap.goals - snap.goalsAgainst, 0)}` : '', sl && deltaOf(sl.gfAvg - sl.gaAvg, sb.gfAvg - sb.gaAvg, { digits: 1, title: `${T} (doelsaldo per wedstrijd)` })),
    kpiTile('Clean sheets', snap?.cleanSheets ?? '–', 'wedstrijden zonder tegengoal'),
    kpiTile('Promoties', snap?.promotions ?? '–', snap?.relegations !== null && snap?.relegations !== undefined ? `${numWord(snap.relegations)} ${snap.relegations === 1 ? 'degradatie' : 'degradaties'}` : ''),
  ].join('');

  // Vorm: laatste tien als pillen, en het doelsaldo gemiddeld over vijf wedstrijden.
  $('#form-pills').innerHTML = ms.length ? pills(ms.slice(-10)) : '';
  const gd = rolling(ms.map(m => m.goalDiff), 5);
  lineChart($('#chart-form'), [
    { name: 'Doelsaldo', color: 'var(--s1)', area: true, values: gd.map((v, i) => ({ i, v })) },
  ], ms.map((m, i) => i === 0 || fmtDate(ms[i - 1].ts) !== fmtDate(m.ts) ? fmtDate(m.ts) : ''), { height: 200, tipAt: i => `<b>Na ${esc(ms[i].opponent.name)} (${fmtDate(ms[i].ts)})</b>Doelsaldo, gemiddeld over 5: ${signed(gd[i])}` });
  const li = gd.length - 1;
  $('#fig-form').innerHTML = ms.length ? figsHtml([
    { label: 'Doelsaldo', color: 'var(--s1)', value: signed(gd[li], 1), delta: li >= 5 ? deltaOf(gd[li], gd[li - 5], { digits: 1, title: 'Tegenover het gemiddelde vijf wedstrijden eerder' }) : null },
  ]) : '';
  $('#team-summary').innerHTML = teamSummary(ms);

  renderRanking(playerTotals(ms));

  // Leden als spelerskaarten (playercard.js), gesorteerd op vorm: tier, dan de rating van de laatste vijf, dan wedstrijden.
  const members = DATA.members.map(m => ({ m, t: PlayerCard.tier(m.name) }))
    .sort((a, b) => PlayerCard.TIER_RANK[b.t.tier] - PlayerCard.TIER_RANK[a.t.tier] || (b.t.level ?? 0) - (a.t.level ?? 0) || (b.m.gamesPlayed || 0) - (a.m.gamesPlayed || 0));
  $('#members').innerHTML = members.map(({ m }) => `<a class="member" href="spelers.html#${encodeURIComponent(m.name)}">
      <span class="fut-mini">${PlayerCard.html(m.name)}</span><span class="member-tag">${esc(m.name)}</span></a>`).join('');
}

addEventListener('resize', () => DATA && render());
window.rerender = () => render();
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
