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

// Gevaarlijkste spelers (coach-logica §9a): vier domeinen, elk uit meerdere facetten. Per facet een score tegenover
// onze eigen spelers (50 = gemiddeld, 10 = één standaardafwijking, begrensd op 20–80); het domein is het gewogen
// gemiddelde. Compleet: de drie domeinen, het zwakste telt dubbel. v = waarde (null = te weinig basis), fmt = in getallen.
const pct0 = v => `${Math.round(100 * v)}%`;
const DOMAINS = [
  { key: 'att', cls: 'att', label: 'Aanvallend', about: 'Gevaar voor het doel, uit vijf facetten: goals per wedstrijd (telt dubbel), schoten op doel per wedstrijd, conversie (goals per schot, vanaf 15 schoten), tegenstanders voorbij per wedstrijd en gewonnen kopduels voorin (telt half).', facets: [
    { label: 'goals', w: 2, v: t => t.g / t.n, fmt: v => `${f1(v)} goals` },
    { label: 'op doel', w: 1, v: t => t.sot / t.nEv, fmt: v => `${f1(v)} op doel` },
    { label: 'conversie', w: 1, v: t => t.shots >= 15 ? t.g / t.shots : null, fmt: v => `${pct0(v)} raak` },
    { label: 'voorbij', w: 1, v: t => t.beaten / t.nEv, fmt: v => `${f1(v)} voorbij` },
    { label: 'kopduels', w: 0.5, v: t => t.airA / t.nEv, fmt: v => `${f1(v)} kopduels` },
  ] },
  { key: 'pas', cls: 'pas', label: 'Passen', about: 'Gevaar met de bal aan de voet, uit zes facetten: assists plus tweede assists per wedstrijd (telt dubbel), passes per wedstrijd (hoeveel via deze speler loopt), passnauwkeurigheid, steekpasses per wedstrijd, het aandeel steekpasses in alle passes (risico, telt half) en het rendement: assists plus tweede assists per steekpass (vanaf 40 steekpasses).', facets: [
    { label: 'assists', w: 2, v: t => (t.a + t.sa) / t.n, fmt: v => `${f1(v)} (tweede) assists` },
    { label: 'passes', w: 1, v: t => t.pa / t.n, fmt: v => `${f1(v)} passes` },
    { label: 'nauwkeurig', w: 1, v: t => t.pa >= 40 ? t.pm / t.pa : null, fmt: v => `${pct0(v)} passes goed` },
    { label: 'steekpasses', w: 1, v: t => t.through / t.nEv, fmt: v => `${f1(v)} steekpasses` },
    { label: 'risico', w: 0.5, v: t => t.paEv ? t.through / t.paEv : null, fmt: v => `${pct0(v)} steekpass` },
    { label: 'rendement', w: 1, v: t => t.through >= 40 ? (t.aEv + t.sa) / t.through : null, fmt: v => `${f1(10 * v)} assists per 10 steekpasses` },
  ] },
  { key: 'def', cls: 'def', label: 'Verdedigend', about: 'Gevaar zonder bal, uit vijf facetten: gewonnen tackles per wedstrijd en onderscheppingen per wedstrijd (allebei anderhalf keer), tacklesucces (vanaf 15 tackles), balwinst per wedstrijd en gewonnen kopduels achterin (telt half).', facets: [
    { label: 'tackles', w: 1.5, v: t => t.tm / t.n, fmt: v => `${f1(v)} tackles` },
    { label: 'tacklesucces', w: 1, v: t => t.ta >= 15 ? t.tm / t.ta : null, fmt: v => `${pct0(v)} tackles raak` },
    { label: 'onderschept', w: 1.5, v: t => t.inter / t.nEv, fmt: v => `${f1(v)} onderschept` },
    { label: 'balwinst', w: 1, v: t => t.won / t.nEv, fmt: v => `${f1(v)} balwinst` },
    { label: 'kopduels', w: 0.5, v: t => t.airD / t.nEv, fmt: v => `${f1(v)} kopduels` },
  ] },
];
function dangerScores(ms) {
  const T = playerTotals(ms).filter(t => t.n >= 5 && t.nEv >= 5);
  const out = T.map(t => ({ t, d: {} }));
  for (const dom of DOMAINS) {
    for (const r of out) r.d[dom.key] = { s: 0, w: 0, f: [] };
    for (const f of dom.facets) {
      const xs = out.map(r => ({ r, v: f.v(r.t) })).filter(x => x.v !== null && Number.isFinite(x.v));
      if (xs.length < 2) continue;
      const mu = xs.reduce((a, x) => a + x.v, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, x) => a + (x.v - mu) ** 2, 0) / xs.length) || 1;
      for (const { r, v } of xs) { const z = Math.max(20, Math.min(80, 50 + 10 * (v - mu) / sd)); const c = r.d[dom.key]; c.s += f.w * z; c.w += f.w; c.f.push({ f, v, z }); }
    }
    for (const r of out) { const c = r.d[dom.key]; c.score = c.w ? c.s / c.w : null; }
  }
  for (const r of out) { const s = DOMAINS.map(d => r.d[d.key].score); r.d.all = { score: s.includes(null) ? null : (s.reduce((a, b) => a + b, 0) + Math.min(...s)) / 4 }; }
  return out;
}
function threats(ms) {
  const S = dangerScores(ms);
  const doms = [...DOMAINS, { key: 'all', cls: 'all', label: 'Compleet', about: 'Wie op alle fronten gevaarlijk is: de scores voor aanvallend, passen en verdedigend samen, waarbij het zwakste domein dubbel telt. Wie overal goed is, wint het van wie in één ding uitblinkt.' }];
  const subOf = (r, k) => k === 'all' ? DOMAINS.map(d => `${d.label.toLowerCase()} ${Math.round(r.d[d.key].score)}`).join(' · ')
    : [...r.d[k].f].sort((a, b) => b.f.w * (b.z - 50) - a.f.w * (a.z - 50)).slice(0, 2).map(x => x.f.fmt(x.v)).join(' · ');
  const ranked = k => S.filter(r => r.d[k].score !== null).sort((a, b) => b.d[k].score - a.d[k].score);
  $('#threats').innerHTML = doms.map(k => { const r = ranked(k.key)[0]; return r ? `<button type="button" class="threat ${k.cls}" data-dom="${k.key}">
      <span class="th-label">${k.label}</span><b class="th-name">${esc(proName(r.t.name))}</b>
      <span class="th-val"><b>${Math.round(r.d[k.key].score)}</b><small>score</small></span><small class="th-sub">${esc(subOf(r, k.key))}</small></button>` : ''; }).join('');
  $('#threats').onclick = e => {
    const b = e.target.closest('.threat'); if (!b) return; const k = doms.find(x => x.key === b.dataset.dom);
    openRankList({ label: `${k.label} gevaarlijk`, about: `${k.about} Per facet een score tegenover onze eigen spelers: 50 is de gemiddelde Frambroos-speler.`,
      who: 'Minstens vijf gevolgde wedstrijden, waarvan vijf met gebeurtenissen van EA. Alleen de wedstrijden die deze app volgt.',
      rows: ranked(k.key).map(r => ({ name: r.t.name, main: String(Math.round(r.d[k.key].score)), sub: k.key === 'all' ? subOf(r, 'all') : r.d[k.key].f.map(x => x.f.fmt(x.v)).join(' · ') })) });
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
