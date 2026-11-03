// Clubhouse: de startpagina over de club als geheel (docs/coach-logica.md §9a), visueel en eenvoudig. Clubcijfers komen
// van EA, alles over spelers, vorm en nieuws uit de gevolgde wedstrijden in DATA (zie common.js).


// ---------- hero ----------
// Het stadion (stadiumSvg) staat in common.js: de sessiekop gebruikt het ook.
function homeHero(ms) {
  const c = DATA.club, s = DATA.snapshot, k = c.kits;
  const kicker = k?.stadium ? esc(k.stadium) : '';
  const meta = [s?.skillRating ? `Skill rating ${s.skillRating}` : '', s?.currentDivision ? `Divisie ${s.currentDivision}` : ''].filter(Boolean).join(' · ');
  // Kop (coach-logica §9a): clubkleuren in een verloop (paars en geel), logo, naam, en de balans van het seizoen erin.
  $('#home-hero').innerHTML = `
    <div class="hh-body">
      <img class="hh-crest" src="crest.png" alt="Clublogo van ${esc(c.name)}" width="256" height="256">
      <div class="hh-id">
        ${kicker ? `<p class="hh-kicker">${kicker}</p>` : ''}
        <h1 class="hh-name">${esc(c.name)}</h1>
        ${meta ? `<p class="hh-meta">${meta}</p>` : ''}
      </div>
      <div class="hh-season season-top" id="season-top"></div>
      ${ms.length ? `<div class="hh-form" aria-label="Laatste ${Math.min(10, ms.length)} wedstrijden">${formDots(ms.slice(-10))}</div>` : ''}
    </div>`;
}

// ---------- seizoen (coach-logica §9a): de balans volgens EA ----------
// Groot de W-G-V met een balk in de uitslagkleuren, daarnaast doelpunten, tegengoals en clean sheets.
function seasonTop() {
  const s = DATA.snapshot, el = $('#season-top'); if (!s) { el.innerHTML = ''; return; }
  const g = s.gamesPlayed || 0, w = g ? 100 * s.wins / g : 0, d = g ? 100 * s.ties / g : 0;
  const stat = (label, v, sub) => `<div class="st-stat"><b>${v}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  // Eén rij (coach-logica §9a): W-G-V met de balk en het winstpercentage, daarnaast goals, tegen, saldo en de nul.
  el.innerHTML = `<div class="st-record">
      <div class="st-nums"><span class="W">${s.wins}</span><i>-</i><span class="D">${s.ties}</span><i>-</i><span class="L">${s.losses}</span></div>
      <div class="st-bar" aria-hidden="true"><span class="W" style="width:${w}%"></span><span class="D" style="width:${d}%"></span><span class="L" style="width:${100 - w - d}%"></span></div>
      <div class="st-cap"><b>${g ? Math.round(w) : '–'}% gewonnen</b> · ${g} wedstrijden</div>
    </div>
    <div class="st-stats">${stat('Goals', s.goals)}${stat('Tegen', s.goalsAgainst)}${stat('Saldo', `${s.goals - s.goalsAgainst > 0 ? '+' : ''}${s.goals - s.goalsAgainst}`)}${stat('De nul', s.cleanSheets ?? '–')}</div>`;
}

// Laatste sessie: één tik naar de avond. Bezig of nog niet geopend: het pack, anders de speler van de sessie.
function lastSession() {
  const all = sessionsOf(DATA.matches), s = all.at(-1), el = $('#last-session'); if (!s) { el.innerHTML = '<p class="empty">Nog geen sessies.</p>'; return; }
  const sm = summarize(s.matches), live = sessionLive(s), pending = !live && packReady(s, all), mvp = live || pending ? null : bestOfNight(s.matches);
  const photo = mvp && PlayerCard.portrait(mvp.n);
  el.href = sessionHref(s);
  el.innerHTML = `<span class="ls-kicker">${live ? 'Nu bezig' : 'Laatste sessie'}</span>
    <span class="ls-date">${esc(dayLabel(s.matches[0].ts))}</span>
    <span class="ls-rec"><span class="W">${sm.W}</span>-<span class="D">${sm.D}</span>-<span class="L">${sm.L}</span><small>${sm.gf}–${sm.ga}</small></span>
    <span class="ls-dots">${formDots(s.matches, { links: false })}</span>
    ${live || pending ? `<span class="ls-pack"${pending ? ` role="button" tabindex="0" data-pack="${s.key}"` : ''}><span class="pack-mini" aria-hidden="true"></span>${live ? 'Het pack gaat open als de avond klaar is' : 'Pack staat klaar: tik om te openen'}</span>`
      : mvp ? `<span class="ls-mvp"><span class="mvp-avatar">${photo ? `<img class="fade-img" src="${photo}" alt="">` : ''}</span><span><small>Speler van de sessie</small><b>${esc(proName(mvp.n))}</b></span><b class="ls-mvp-r">${f1(mvp.v)}</b></span>` : ''}
    <span class="ls-go">Naar de sessie <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></span>`;
}

// Trofeeën (coach-logica §9a): per promotie een beker met het moment en de wedstrijd ervoor; eerdere als één regel.
const CUP = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="cup-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1bd"/><stop offset=".45" stop-color="#e2b649"/><stop offset="1" stop-color="#8d6c15"/></linearGradient></defs>
  <path d="M18 8h28v10c0 9-6 16-14 16S18 27 18 18z" fill="url(#cup-g)"/><path d="M18 12H9c0 8 4 13 11 14M46 12h9c0 8-4 13-11 14" fill="none" stroke="url(#cup-g)" stroke-width="4" stroke-linecap="round"/>
  <path d="M28 34h8v8h-8z" fill="url(#cup-g)"/><path d="M20 46h24l2 8H18z" fill="url(#cup-g)"/><path d="M26 14l3 6 6 1-5 4 2 6-6-3-6 3 2-6-5-4 6-1z" fill="#fff6d8" opacity=".55" transform="translate(3 -2) scale(.9)"/></svg>`;
// Trofeeënkast (coach-logica §9a): per afgesloten seizoen wat EA bewaart (club/playoffAchievements): de divisie met
// EA's eigen badge en hoe ver we kwamen, plus de beste divisie ooit. EA's schaal: 1 is Elite, 2 is Divisie 1, enzovoort.
const DIV_CREST = n => `https://media.contentapi.ea.com/content/dam/eacom/fc/pro-clubs/divisioncrest${n}.png`;
const divName = n => !n ? '–' : n === 1 ? 'Elite' : `Divisie ${n - 1}`;
const finishName = g => !g ? '' : g === 1 ? 'Kampioen' : g >= 6 ? 'Deelnemer' : `Eindgroep ${g}`;
function trophies() {
  const t = DATA.trophies, el = $('#trophies'); if (!t) { el.innerHTML = ''; return; }
  const badge = n => `<span class="tr-crest"><img src="${DIV_CREST(n)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('no-img')">${CUP}</span>`;
  const item = (cls, img, title, sub, kicker) => `<li class="trophy ${cls}"><span class="tr-img">${img}</span><span class="tr-text">${kicker ? `<small class="tr-kicker">${kicker}</small>` : ''}<b>${title}</b><small>${sub}</small></span></li>`;
  const items = [
    ...[...(t.seasons || [])].sort((a, b) => b.season - a.season).map(x => item('season', badge(x.division), divName(x.division), finishName(x.group), `Seizoen ${x.season ?? '?'}`)),
    t.bestDivision ? item('best', badge(t.bestDivision), divName(t.bestDivision), 'Beste divisie ooit', 'Record') : '',
  ].filter(Boolean);
  el.innerHTML = items.join('') || '<li class="empty">Nog geen afgesloten seizoen.</li>';
}


// ---------- per speler: totalen uit de gevolgde wedstrijden ----------
function playerTotals(ms) {
  const out = new Map();
  for (const m of ms) for (const p of m.players) {
    const t = out.get(p.name) || { name: p.name, n: 0, nEv: 0, g: 0, a: 0, sa: 0, mom: 0, ratings: [], pm: 0, pa: 0, tm: 0, ta: 0, won: 0, shots: 0, inter: 0, beaten: 0, through: 0, airA: 0, airD: 0, sot: 0, paEv: 0, aEv: 0 };
    t.n++; t.g += p.goals || 0; t.a += p.assists || 0; t.mom += p.mom || 0; if (p.rating !== null) t.ratings.push(p.rating);
    t.pm += p.passesMade || 0; t.pa += p.passAttempts || 0; t.tm += p.tacklesMade || 0; t.ta += p.tackleAttempts || 0; t.shots += p.shots || 0;
    if (p.ev) { t.nEv++; t.sa += p.ev.second_assists || 0; t.won += p.ev.possession_won || 0; t.inter += p.ev.interceptions || 0;
      t.beaten += p.ev.players_beaten || 0; t.through += p.ev.through_balls || 0; t.airA += p.ev.aerial_duels_won_attacking || 0; t.airD += p.ev.aerial_duels_won_defending || 0;
      t.sot += p.ev.shots_on_target || 0; t.paEv += p.passAttempts || 0; t.aEv += p.assists || 0; }
    out.set(p.name, t);
  }
  return [...out.values()].map(t => ({ ...t, involved: t.g + t.a + t.sa, rating: avg(t.ratings) }));
}

// Ranglijst: negen stats die iedereen snapt (coach-logica §9a). v = waarde om op te sorteren, main = wat er staat,
// sub = het totaal eronder. null = niet genoeg data.
const per = (x, n) => n ? (x / n).toFixed(1) : '–'; // sorteren gebeurt op het exacte getal (v)
const count = (key, label, total, games, { about, who = 'Minstens 3 wedstrijden.' }) => ({ key, label, about, who, v: t => games(t) ? total(t) / games(t) : null, main: t => per(total(t), games(t)), sub: t => `${total(t)} in ${games(t)}` });
// about: waar de score op gebaseerd is; who: wie meetelt. Staat in het uitlegscherm van elke ranglijst.
// Algemeen (coach-logica §9a): één rij van vier kaartjes over de hele carrière bij de club volgens EA
// (rating, goals, assists, man of the match; ook van vóór deze app). Op het
// kaartje alleen het getal; het kleine cijfer staat in het uitlegscherm. Gelijk: wie meer wedstrijden speelde hoger
// (rating), wie het in minder wedstrijden deed hoger (totalen).
const CAREER = 'Iedereen in de selectie, over alle wedstrijden voor de club volgens EA, ook van vóór deze app.';
const career = (key, label, about, v, main, sub, tie) => ({ key, label, about, who: CAREER,
  rows: DATA.members.filter(m => m.gamesPlayed > 0 && v(m) !== null && v(m) !== undefined).sort((a, b) => v(b) - v(a) || tie(b) - tie(a)).map(m => ({ name: m.name, main: main(m), sub: sub(m) })) });
function clubCards() {
  const per = (x, n) => n ? (x / n).toFixed(2) : '–';
  return [
    career('rating', 'Rating', 'De gemiddelde matchrating over alle wedstrijden voor de club, zoals EA die bijhoudt (één decimaal; bij gelijk telt wie meer wedstrijden speelde).', m => m.ratingAve, m => f1(m.ratingAve), m => `${m.gamesPlayed} wedstrijden`, m => m.gamesPlayed),
    career('goals', 'Goals', 'Doelpunten over de hele carrière bij de club volgens EA.', m => m.goals, m => String(m.goals), m => `${per(m.goals, m.gamesPlayed)} per wedstrijd`, m => -m.gamesPlayed),
    career('assists', 'Assists', 'De laatste pass voor een doelpunt, over de hele carrière bij de club volgens EA.', m => m.assists, m => String(m.assists), m => `${per(m.assists, m.gamesPlayed)} per wedstrijd`, m => -m.gamesPlayed),
    career('mom', 'Man of the match', 'Hoe vaak EA iemand tot man of the match koos, over de hele carrière bij de club.', m => m.mom, m => String(m.mom), m => `${m.gamesPlayed ? Math.round(100 * m.mom / m.gamesPlayed) : 0}% van de wedstrijden`, m => -m.gamesPlayed),
  ];
}

// Gevaarlijkste spelers (coach-logica §9a): topscorer en topassist, dan vier scores. Per wedstrijd punten (zoals
// fantasy football), vergeleken met elke keer dat een mens in onze wedstrijden speelde (wij en tegenstanders): het
// percentiel. De score is het gemiddelde percentiel: 64 = in een gemiddelde wedstrijd beter dan 64 van de 100 spelers.
const evOf = (p, k) => p.ev?.[k] || 0;
const DOMAINS = [
  { key: 'att', label: 'Aanvallend', how: 'goal 3, schot op doel 1, tegenstander voorbij ½', parts: [
    { w: 3, v: p => p.goals || 0, fmt: v => `${f1(v)} goals` },
    { w: 1, v: p => evOf(p, 'shots_on_target'), fmt: v => `${f1(v)} op doel` },
    { w: 0.5, v: p => evOf(p, 'players_beaten'), fmt: v => `${f1(v)} voorbij` },
  ] },
  { key: 'cre', label: 'Creëren', how: 'assist 3, tweede assist 2, geslaagde steekpass ½, mislukte pass −0,2', parts: [
    { w: 3, v: p => p.assists || 0, fmt: v => `${f1(v)} assists` },
    { w: 2, v: p => evOf(p, 'second_assists'), fmt: v => `${f1(v)} tweede assists` },
    { w: 0.5, v: p => evOf(p, 'through_balls'), fmt: v => `${f1(v)} steekpasses` },
    { w: -0.2, v: p => Math.max(0, (p.passAttempts || 0) - (p.passesMade || 0)), fmt: v => `${f1(v)} mislukte passes` },
  ] },
  { key: 'def', label: 'Verdedigend', how: 'gewonnen tackle, onderschepping, kopduel achterin, blok en wegwerken elk 1, balverlies op eigen helft −1', parts: [
    { w: 1, v: p => p.tacklesMade || 0, fmt: v => `${f1(v)} tackles` },
    { w: 1, v: p => evOf(p, 'interceptions'), fmt: v => `${f1(v)} onderschept` },
    { w: 1, v: p => evOf(p, 'aerial_duels_won_defending'), fmt: v => `${f1(v)} kopduels` },
    { w: 1, v: p => evOf(p, 'blocks') + evOf(p, 'clearances'), fmt: v => `${f1(v)} blok of weg` },
    { w: -1, v: p => evOf(p, 'possession_lost_def_third'), fmt: v => `${f1(v)} balverlies achterin` },
  ] },
];
const pointsOf = (dom, p) => dom.parts.reduce((a, x) => a + x.w * x.v(p), 0);
const countsForScore = p => p.ev && (p.secondsPlayed ?? 5400) >= 2700; // gebeurtenissen van EA en minstens 45 minuten
function dangerScores(ms) {
  const ref = Object.fromEntries(DOMAINS.map(d => [d.key, []]));
  for (const m of ms) for (const p of [...m.players, ...m.opponentPlayers]) if (countsForScore(p)) for (const d of DOMAINS) ref[d.key].push(pointsOf(d, p));
  const pctl = (k, v) => { let lo = 0, eq = 0; for (const x of ref[k]) { if (x < v) lo++; else if (x === v) eq++; } return 100 * (lo + eq / 2) / ref[k].length; };
  const by = new Map();
  for (const m of ms) for (const p of m.players) if (countsForScore(p)) {
    const b = by.get(p.name) || { name: p.name, n: 0, d: Object.fromEntries(DOMAINS.map(d => [d.key, { pct: 0, pts: 0, parts: d.parts.map(() => 0) }])) };
    b.n++; for (const d of DOMAINS) { const x = b.d[d.key], pts = pointsOf(d, p); x.pct += pctl(d.key, pts); x.pts += pts; d.parts.forEach((q, i) => { x.parts[i] += q.v(p); }); }
    by.set(p.name, b);
  }
  const out = [...by.values()].filter(b => b.n >= 5);
  for (const b of out) { for (const d of DOMAINS) { const x = b.d[d.key]; x.score = x.pct / b.n; x.pts /= b.n; x.parts = x.parts.map(v => v / b.n); } b.d.all = { score: DOMAINS.reduce((a, d) => a + b.d[d.key].score, 0) / DOMAINS.length }; }
  return { out, refN: ref.att.length };
}
function threats(ms) {
  const { out: S, refN } = dangerScores(ms);
  const T = playerTotals(ms).filter(t => t.n >= 3);
  const top = key => [...T].sort((a, b) => b[key] - a[key] || a.n - b.n);
  const totalTile = (cls, label, key, unit) => { const t = top(key)[0]; return t && t[key] ? `<button type="button" class="threat ${cls}" data-dom="${key}">
      <span class="th-label">${label}</span><b class="th-name">${esc(proName(t.name))}</b>
      <span class="th-val"><b>${t[key]}</b><small>${unit}</small></span><small class="th-sub">${f1(t[key] / t.n)} per wedstrijd, in ${t.n}</small></button>` : ''; };
  const doms = [...DOMAINS, { key: 'all', label: 'Compleet' }];
  const ranked = k => [...S].sort((a, b) => b.d[k].score - a.d[k].score);
  // Klein op de tegel: de twee onderdelen die de meeste punten gaven (bij Compleet de drie scores).
  const subOf = (b, k) => k === 'all' ? DOMAINS.map(d => `${d.label.toLowerCase()} ${Math.round(b.d[d.key].score)}`).join(' · ')
    : DOMAINS.find(d => d.key === k).parts.map((q, i) => ({ q, v: b.d[k].parts[i] })).filter(x => x.q.w > 0).sort((x, y) => y.q.w * y.v - x.q.w * x.v).slice(0, 2).map(x => x.q.fmt(x.v)).join(' · ');
  $('#threats').innerHTML = totalTile('goals', 'Topscorer', 'g', 'goals') + totalTile('assists', 'Topassist', 'a', 'assists')
    + doms.map(k => { const b = ranked(k.key)[0]; return b ? `<button type="button" class="threat ${k.key}" data-dom="${k.key}">
      <span class="th-label">${k.label}</span><b class="th-name">${esc(proName(b.name))}</b>
      <span class="th-val"><b>${Math.round(b.d[k.key].score)}</b><small>van 100</small></span><small class="th-sub">${esc(k.key === 'all' ? 'aanvallend, creëren en verdedigend samen' : subOf(b, k.key))}</small></button>` : ''; }).join('');
  const explain = `Die punten vergelijken we met alle ${refN} keer dat een mens in onze wedstrijden speelde, wij én de tegenstanders (minstens 45 minuten). De score is het gemiddelde over alle wedstrijden: 64 betekent dat deze speler in een gemiddelde wedstrijd meer punten haalt dan 64 van de 100 spelers op het veld. 50 is gemiddeld.`;
  $('#threats').onclick = e => {
    const btn = e.target.closest('.threat'); if (!btn) return; const k = btn.dataset.dom;
    if (k === 'g' || k === 'a') return openRankList({ label: k === 'g' ? 'Topscorer' : 'Topassist', about: `Het aantal ${k === 'g' ? 'goals' : 'assists'} over de gevolgde wedstrijden. Bij gelijk staat wie het in minder wedstrijden deed hoger.`, who: 'Minstens 3 gevolgde wedstrijden.',
      rows: top(k).map(t => ({ name: t.name, main: String(t[k]), sub: `${f1(t[k] / t.n)} per wedstrijd, in ${t.n}` })) });
    const d = DOMAINS.find(x => x.key === k);
    openRankList({ label: k === 'all' ? 'Compleet' : `${d.label}`,
      about: k === 'all' ? `Het gemiddelde van de scores voor aanvallend, creëren en verdedigend. Elk domein geeft per wedstrijd punten (tik op die tegel voor de waarden). ${explain}` : `Punten per wedstrijd: ${d.how}. ${explain}${k === 'def' ? ' Let op: dit meet geslaagd verdedigend werk, niet of er goals zijn voorkomen; dat hangt in onze wedstrijden nauwelijks samen.' : ''}`,
      who: 'Minstens vijf gevolgde wedstrijden van 45 minuten of langer met gebeurtenissen van EA.',
      rows: ranked(k).map(b => ({ name: b.name, main: String(Math.round(b.d[k].score)), sub: k === 'all' ? subOf(b, 'all') : `${f1(b.d[k].pts)} punten p/w: ${d.parts.map((q, i) => q.fmt(b.d[k].parts[i])).join(' · ')}` })) });
  };
}

function render() {
  const ms = DATA.matches;
  homeHero(ms);
  seasonTop();
  lastSession();
  // Op telefoon dezelfde kaart als in de sessielijst, met een label (coach-logica §9a).
  { const all = sessionsOf(DATA.matches), s = all.at(-1); $('#last-session-m').innerHTML = s ? sessionCardHtml(s, all, { kicker: sessionLive(s) ? 'Huidige sessie' : 'Laatste sessie' }) : ''; }
  PlayerCard.reveal($('#last-session')); PlayerCard.reveal($('#last-session-m'));
  trophies();
  threats(ms);
  // Op een groot scherm het nieuwste artikel; op telefoon de laatste vijf als horizontale rij.
  const recent = newsArticles().slice(0, 5);
  $('#news').innerHTML = recent.length ? recent.map((a, i) => newsCard(a, { lead: i === 0 })).join('') : '<p class="empty">Nog geen nieuws: speel een avond, dan schrijft het zichzelf.</p>';
  PlayerCard.reveal($('#news'));
  rankCards($('#rank-cards'), clubCards());

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

window.rerender = () => render();
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
addEventListener('pack-closed', () => DATA && render());
