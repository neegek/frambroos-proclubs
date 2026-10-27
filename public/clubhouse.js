// Clubhouse: de startpagina over de club als geheel (docs/coach-logica.md §9a), visueel en eenvoudig. Clubcijfers komen
// van EA, alles over spelers, vorm en nieuws uit de gevolgde wedstrijden in DATA (zie common.js).

const letter = r => r === 'D' ? 'G' : r === 'L' ? 'V' : 'W';
const plural = (n, one, more) => `${n} ${n === 1 ? one : more}`;
const dayLabel = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });

// ---------- hero: stadion bij avond ----------
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

// Wedstrijden als rondjes, oudste links; in de hero opent elk rondje de wedstrijd. In een nieuwsbericht (zelf een link)
// zijn het gewone rondjes: een link in een link breekt de pagina.
const formDots = (ms, { links = true } = {}) => `<ol class="form-dots">${ms.map((m, i) => {
  const cls = `dot ${m.result}${i === ms.length - 1 ? ' last' : ''}`, title = `${letter(m.result)} ${m.goals}–${m.goalsAgainst} tegen ${esc(m.opponent.name)}, ${dayLabel(m.ts)}`;
  return `<li>${links ? `<a class="${cls}" href="wedstrijd.html?id=${m.matchId}" title="${title}">` : `<span class="${cls}" title="${title}">`}${letter(m.result)}${links ? '</a>' : '</span>'}</li>`;
}).join('')}</ol>`;

// Huidige reeks uit de gevolgde wedstrijden: gewonnen, ongeslagen of verloren op rij.
function streakOf(ms) {
  const r = ms.slice().reverse(), run = pred => { let n = 0; while (n < r.length && pred(r[n])) n++; return n; };
  const w = run(m => m.result === 'W'), u = run(m => m.result !== 'L'), l = run(m => m.result === 'L');
  if (w >= 2) return { kind: 'W', n: w, text: `${w} keer op rij gewonnen` };
  if (u >= 2) return { kind: 'U', n: u, text: `${u} wedstrijden ongeslagen` };
  if (l >= 2) return { kind: 'L', n: l, text: `${l} keer op rij verloren` };
  return { kind: '', n: 0, text: '' };
}

function homeHero(ms) {
  const c = DATA.club, s = DATA.snapshot, k = c.kits, st = streakOf(ms);
  const kicker = [k?.stadium, s?.currentDivision ? `Divisie ${s.currentDivision}` : ''].filter(Boolean).map(esc).join(' · ');
  const meta = [s?.skillRating ? `Skill rating ${s.skillRating}` : '', s?.bestDivision ? `hoogst bereikt: divisie ${s.bestDivision}` : ''].filter(Boolean).join(' · ');
  $('#home-hero').innerHTML = `${stadiumSvg()}
    <div class="hh-body">
      <img class="hh-crest" src="crest.png" alt="Clublogo van ${esc(c.name)}" width="256" height="256">
      <div class="hh-id">
        ${kicker ? `<p class="hh-kicker">${kicker}</p>` : ''}
        <h1 class="hh-name">${esc(c.name)}</h1>
        ${meta ? `<p class="hh-meta">${meta}</p>` : ''}
      </div>
      ${ms.length ? `<div class="hh-form"><span class="hh-label">Laatste ${Math.min(10, ms.length)}</span>${formDots(ms.slice(-10))}${st.text ? `<span class="hh-streak ${st.kind}">${st.text}</span>` : ''}</div>` : ''}
    </div>`;
}

// ---------- totalen volgens EA ----------
function totals() {
  const s = DATA.snapshot; if (!s) { $('#totals').hidden = true; return; }
  const items = [
    ['Wedstrijden', s.gamesPlayed], ['Gewonnen', s.wins], ['Gelijk', s.ties], ['Verloren', s.losses],
    ['Winst', s.gamesPlayed ? `${Math.round(100 * s.wins / s.gamesPlayed)}%` : '–'], ['Doelpunten', s.goals], ['Tegengoals', s.goalsAgainst], ['Clean sheets', s.cleanSheets ?? '–'],
  ];
  $('#totals').innerHTML = `<dl class="totals-band">${items.map(([l, v]) => `<div><dt>${l}</dt><dd>${v ?? '–'}</dd></div>`).join('')}</dl>`;
}

// ---------- nieuws uit de cijfers (coach-logica §9a) ----------
// Elk bericht: { key, tag, title, body, ts, href, visual }. Alleen wat waar en opvallend is.
function newsItems(ms) {
  const out = [], sess = sessionsOf(ms), last = sess.at(-1)?.matches || [];
  const night = last.length >= 2 ? last : [];
  const bigNum = (v, small = '') => `<span class="news-big">${v}${small ? `<small>${small}</small>` : ''}</span>`;

  // Topvorm: spelers met de blauwe kaart (§9c).
  const top = DATA.players.map(n => ({ n, t: PlayerCard.tier(n) })).filter(x => x.t.tier === 'top').sort((a, b) => b.t.level - a.t.level);
  if (top.length) {
    const lastTs = Math.max(...top.map(x => [...ms].reverse().find(m => m.players.some(p => p.name === x.n))?.ts || 0));
    out.push({ key: 'top', tag: 'Topvorm', ts: lastTs, href: `spelers.html#${encodeURIComponent(top[0].n)}`,
      title: `${joinAnd(top.map(x => esc(x.n)))} in topvorm`,
      body: `${joinAnd(top.map(x => `${esc(x.n)} ${f2(x.t.level)}`))} gemiddeld over de laatste vijf wedstrijden, met minstens drie zeges.`,
      visual: `<div class="news-cards">${top.slice(0, 3).map(x => `<span class="fut-mini">${PlayerCard.html(x.n)}</span>`).join('')}</div>` });
  }

  // Speelavond: de laatste avond in het kort.
  if (night.length) {
    const s = summarize(night), endTs = night.at(-1).ts;
    const parts = [s.W ? `${numWord(s.W)} ${s.W === 1 ? 'zege' : 'zeges'}` : '', s.D ? `${numWord(s.D)} ${s.D === 1 ? 'gelijkspel' : 'gelijke spelen'}` : '', s.L ? `${numWord(s.L)} ${s.L === 1 ? 'nederlaag' : 'nederlagen'}` : ''].filter(Boolean);
    const per = new Map();
    for (const m of night) for (const p of m.players) if (p.rating !== null) { const x = per.get(p.name) || []; x.push(p.rating); per.set(p.name, x); }
    const best = [...per].filter(([, r]) => r.length >= Math.max(2, night.length / 2)).map(([n, r]) => ({ n, v: avg(r) })).sort((a, b) => b.v - a.v)[0];
    const gd = night.reduce((a, m) => a + m.goalDiff, 0);
    out.push({ key: 'night', tag: 'Speelavond', ts: endTs, href: 'sessies.html',
      title: capFirst(joinAnd(parts)),
      body: `${plural(night.length, 'wedstrijd', 'wedstrijden')} op ${new Date(endTs * 1000).toLocaleDateString('nl-NL', { weekday: 'long' })}, doelsaldo ${signed(gd, 0)}.${best ? ` Beste speler: ${esc(best.n)} met gemiddeld ${f2(best.v)}.` : ''}`,
      visual: formDots(night, { links: false }) });
  }

  // Uitschieter, hattrick en grote zege: alleen over de laatste avond.
  const perfs = night.flatMap(m => m.players.map(p => ({ m, p })));
  const peak = perfs.filter(x => x.p.rating !== null).sort((a, b) => b.p.rating - a.p.rating)[0];
  if (peak && peak.p.rating >= 9) {
    const { m, p } = peak;
    out.push({ key: 'peak', tag: 'Uitschieter', ts: m.ts, href: `wedstrijd.html?id=${m.matchId}`,
      title: `${f1(p.rating)} voor ${esc(p.name)} tegen ${esc(m.opponent.name)}`,
      body: `${capFirst(joinAnd([p.goals ? plural(p.goals, 'goal', 'goals') : '', p.assists ? plural(p.assists, 'assist', 'assists') : ''].filter(Boolean))) || 'Zonder goal of assist'}${p.mom ? ', man of the match' : ''}. De hoogste rating van de avond.`,
      visual: bigNum(f1(p.rating)) });
  }
  // Hattrick: niet als dezelfde wedstrijd van dezelfde speler al de uitschieter is.
  for (const { m, p } of perfs.filter(x => (x.p.goals || 0) >= 3 && !(peak?.p.rating >= 9 && x.m === peak.m && x.p.name === peak.p.name)).sort((a, b) => b.p.goals - a.p.goals).slice(0, 2)) {
    out.push({ key: `hat-${m.matchId}-${p.name}`, tag: 'Hattrick', ts: m.ts, href: `wedstrijd.html?id=${m.matchId}`,
      title: p.goals === 3 ? `Hattrick voor ${esc(p.name)}` : `${capFirst(numWord(p.goals))} goals voor ${esc(p.name)}`,
      body: `${p.goals} keer raak tegen ${esc(m.opponent.name)}, eindstand ${m.goals}–${m.goalsAgainst}.`,
      visual: bigNum(p.goals, 'goals') });
  }

  const big = night.filter(m => m.goalDiff >= 4).sort((a, b) => b.goalDiff - a.goalDiff || b.goals - a.goals)[0];
  if (big) {
    const scorers = big.players.filter(p => p.goals).sort((a, b) => b.goals - a.goals).map(p => `${esc(p.name)}${p.goals > 1 ? ` (${p.goals})` : ''}`);
    out.push({ key: 'bigwin', tag: 'Grote zege', ts: big.ts, href: `wedstrijd.html?id=${big.matchId}`,
      title: `${big.goals}–${big.goalsAgainst} tegen ${esc(big.opponent.name)}`,
      body: scorers.length ? `Doelpunten: ${joinAnd(scorers)}.` : 'De grootste zege van de avond.', visual: bigNum(`${big.goals}–${big.goalsAgainst}`) });
  }

  // Reeks: nu minstens drie zeges, vier ongeslagen of drie nederlagen op rij.
  const st = streakOf(ms);
  if ((st.kind === 'W' && st.n >= 3) || (st.kind === 'U' && st.n >= 4) || (st.kind === 'L' && st.n >= 3)) {
    const before = ms[ms.length - 1 - st.n];
    const title = st.kind === 'W' ? `${capFirst(numWord(st.n))} zeges op rij` : st.kind === 'U' ? `${capFirst(numWord(st.n))} wedstrijden ongeslagen` : `${capFirst(numWord(st.n))} nederlagen op rij`;
    const body = before ? (st.kind === 'L' ? `Voor het laatst gewonnen of gelijk: ${before.goals}–${before.goalsAgainst} tegen ${esc(before.opponent.name)} op ${dayLabel(before.ts)}.`
      : `De laatste ${before.result === 'L' ? 'nederlaag' : 'wedstrijd zonder zege'} was ${before.goals}–${before.goalsAgainst} tegen ${esc(before.opponent.name)} op ${dayLabel(before.ts)}.`)
      : `Sinds het begin van de gevolgde wedstrijden.`;
    out.push({ key: 'streak', tag: 'Reeks', ts: ms.at(-1).ts, href: 'wedstrijden.html', title, body, visual: formDots(ms.slice(-Math.min(st.n, 10)), { links: false }) });
  }

  // Scoort op rij: in elk van de laatste drie of meer eigen wedstrijden, met de laatste op de laatste avond.
  for (const n of DATA.players) {
    const own = ms.filter(m => m.players.some(p => p.name === n)).map(m => ({ m, p: m.players.find(p => p.name === n) }));
    let k = 0; while (k < own.length && (own[own.length - 1 - k].p.goals || 0) > 0) k++;
    if (k >= 3 && night.includes(own.at(-1).m)) {
      const sum = own.slice(-k).reduce((a, x) => a + x.p.goals, 0);
      out.push({ key: `scorer-${n}`, tag: 'Scoort op rij', ts: own.at(-1).m.ts, href: `spelers.html#${encodeURIComponent(n)}`,
        title: `${esc(n)} scoort ${numWord(k)} keer op rij`,
        body: `In elk van de laatste ${k} eigen wedstrijden minstens één goal, samen ${sum}.`, visual: bigNum(`${k}×`) });
    }
  }

  const cs = night.filter(m => m.goalsAgainst === 0).length;
  if (cs >= 2) out.push({ key: 'clean', tag: 'De nul', ts: night.at(-1).ts, href: 'sessies.html',
    title: `${capFirst(numWord(cs))} keer de nul gehouden`, body: `${cs} van de ${night.length} wedstrijden van de laatste avond zonder tegengoal.`, visual: bigNum(0, 'tegen') });

  // Volgorde van belang (coach-logica §9a): de berichten staan hierboven al zo; het grote is topvorm, anders de speelavond.
  return out.slice(0, 6);
}

function renderNews(ms) {
  const items = newsItems(ms);
  $('#news').innerHTML = items.length ? items.map((n, i) => `<a class="news-item${i === 0 ? ' lead' : ''}" href="${n.href}">
      <span class="news-visual">${n.visual}</span>
      <span class="news-text"><span class="news-tag">${n.tag}</span><span class="news-title">${n.title}</span><span class="news-body">${n.body}</span><time datetime="${new Date(n.ts * 1000).toISOString()}">${dayLabel(n.ts)}</time></span>
    </a>`).join('') : '<p class="muted">Nog geen nieuws: speel een avond, dan schrijft het zichzelf.</p>';
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

function render() {
  const ms = DATA.matches;
  homeHero(ms);
  totals();
  renderNews(ms);
  $('#results').innerHTML = ms.slice(-4).reverse().map(m => matchCard(m, { own: DATA.snapshot?.skillRating })).join('') || '<p class="muted">Nog geen wedstrijden.</p>';
  renderRanking(playerTotals(ms));

  // Selectie als spelerskaarten (playercard.js), gesorteerd op vorm: tier, dan de rating van de laatste vijf, dan wedstrijden.
  const members = DATA.members.map(m => ({ m, t: PlayerCard.tier(m.name) }))
    .sort((a, b) => PlayerCard.TIER_RANK[b.t.tier] - PlayerCard.TIER_RANK[a.t.tier] || (b.t.level ?? 0) - (a.t.level ?? 0) || (b.m.gamesPlayed || 0) - (a.m.gamesPlayed || 0));
  $('#members').innerHTML = members.map(({ m }) => `<a class="member" href="spelers.html#${encodeURIComponent(m.name)}">
      <span class="fut-mini">${PlayerCard.html(m.name)}</span><span class="member-tag">${esc(m.name)}</span></a>`).join('');
}

// Topspelers: de eerste vier ranglijsten open, de rest achter de knop.
$('#rank-more').addEventListener('click', e => {
  const open = $('#rank-cards').classList.toggle('all');
  e.currentTarget.setAttribute('aria-expanded', String(open));
  e.currentTarget.textContent = open ? 'Minder ranglijsten' : 'Alle ranglijsten';
});

window.rerender = () => render();
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
