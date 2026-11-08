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
  const sm = summarize(s.matches), live = sessionSealed(s), pending = !sessionLive(s) && packReady(s, all), mvp = live || pending ? null : bestOfNight(s.matches);
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
// De schaal (coach-logica §9a, Trofeeënkast): een transparant goudverloop met een dunne rand en een fijne zonnestraal
// erin, zoals het guillocheerwerk op een erebord. Subtiel: de badge van EA is het voorwerp, de schaal de achtergrond.
const PLATE = i => `<svg class="tr-plate-svg" viewBox="0 0 120 120" aria-hidden="true"><defs>
    <radialGradient id="pl-fill${i}" cx=".5" cy=".4" r=".62"><stop offset="0" stop-color="#f3d57a" stop-opacity=".30"/><stop offset=".7" stop-color="#d9b04a" stop-opacity=".12"/><stop offset="1" stop-color="#b88a2a" stop-opacity=".04"/></radialGradient></defs>
  <circle cx="60" cy="60" r="57" fill="url(#pl-fill${i})"/>
  <g stroke="#e2bd5c" stroke-opacity=".16" stroke-width=".6">${Array.from({ length: 48 }, (_, k) => { const a = k * Math.PI / 24, c = Math.cos(a), s = Math.sin(a); return `<line x1="${(60 + 30 * c).toFixed(1)}" y1="${(60 + 30 * s).toFixed(1)}" x2="${(60 + 52 * c).toFixed(1)}" y2="${(60 + 52 * s).toFixed(1)}"/>`; }).join('')}</g>
  <circle cx="60" cy="60" r="57" fill="none" stroke="#e2bd5c" stroke-opacity=".55" stroke-width="1.2"/>
  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2bd5c" stroke-opacity=".25" stroke-width=".6"/></svg>`;
function trophies() {
  const t = DATA.trophies, el = $('#trophies'); if (!t) { el.innerHTML = ''; return; }
  let i = 0;
  const badge = n => `<span class="tr-plate">${PLATE(i++)}<span class="tr-crest"><img src="${DIV_CREST(n)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('no-img')">${CUP}</span></span>`;
  // Een voorwerp in de kast, geen kaartje: niets om op te tikken (coach-logica §9a).
  const item = (cls, img, title, sub, kicker) => `<li class="trophy ${cls}">${img}<span class="tr-text">${kicker ? `<small class="tr-kicker">${kicker}</small>` : ''}<b>${title}</b><small>${sub}</small></span></li>`;
  const items = [
    ...[...(t.seasons || [])].sort((a, b) => b.season - a.season).map(x => item('season', badge(x.division), divName(x.division), finishName(x.group), `Seizoen ${x.season ?? '?'}`)),
    t.bestDivision ? item('best', badge(t.bestDivision), divName(t.bestDivision), 'Beste divisie ooit', 'Record') : '',
  ].filter(Boolean);
  el.innerHTML = items.join('') || '<li class="empty">Nog geen afgesloten seizoen.</li>';
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
  const per = (x, n) => n ? f1(x / n) : '–'; // één decimaal, zoals overal (coach-logica §9)
  return [
    career('rating', 'Rating', 'De gemiddelde matchrating over alle wedstrijden voor de club, zoals EA die bijhoudt (één decimaal; bij gelijk telt wie meer wedstrijden speelde).', m => m.ratingAve, m => f1(m.ratingAve), m => `${m.gamesPlayed} wedstrijden`, m => m.gamesPlayed),
    career('goals', 'Goals', 'Doelpunten over de hele carrière bij de club volgens EA.', m => m.goals, m => String(m.goals), m => `${per(m.goals, m.gamesPlayed)} per wedstrijd`, m => -m.gamesPlayed),
    career('assists', 'Assists', 'De laatste pass voor een doelpunt, over de hele carrière bij de club volgens EA.', m => m.assists, m => String(m.assists), m => `${per(m.assists, m.gamesPlayed)} per wedstrijd`, m => -m.gamesPlayed),
    career('mom', 'Man of the match', 'Hoe vaak EA iemand tot man of the match koos, over de hele carrière bij de club.', m => m.mom, m => String(m.mom), m => `${m.gamesPlayed ? Math.round(100 * m.mom / m.gamesPlayed) : 0}% van de wedstrijden`, m => -m.gamesPlayed),
  ];
}

// Gevaarlijkste spelers (coach-logica §9a, sinds 4 november 2026): zes gewone statistieken, geen punten, geen
// weging, geen percentielen. Elke tegel is één getal dat je in het spel zelf ook zou tellen.
const evOf = (p, k) => p.ev?.[k] || 0;
const STATS = [
  { key: 'pass', cls: 'cre', label: 'Passes', unit: 'per wedstrijd', min: 5, minLabel: 'minstens vijf wedstrijden',
    about: 'Geslaagde passes per wedstrijd, over de gevolgde wedstrijden; klein eronder welk deel van al je passes aankomt. Het aantal alleen beloont wie veel aan de bal is, het percentage alleen wie veilig breed speelt; daarom allebei.',
    num: p => evOf(p, 'passes_completed'), also: p => evOf(p, 'passes_completed') + evOf(p, 'passes_failed'),
    sub: (b) => `${Math.round(100 * b.num / Math.max(1, b.also))}% komt aan, in ${plural(b.n, 'wedstrijd', 'wedstrijden')}` },
  { key: 'def', cls: 'def', label: 'Verdedigen', unit: 'per wedstrijd', min: 5, minLabel: 'minstens vijf wedstrijden',
    about: 'Geslaagde verdedigende acties per wedstrijd: gewonnen tackles, onderscheppingen, kopduels achterin, blokken en wegwerken bij elkaar opgeteld.',
    num: p => (p.tacklesMade || 0) + evOf(p, 'interceptions') + evOf(p, 'aerial_duels_won_defending') + evOf(p, 'blocks') + evOf(p, 'clearances') },
];
function statRows(ms, s) {
  const by = new Map();
  for (const m of ms) for (const p of m.players) if (p.ev) {
    const b = by.get(p.name) || { name: p.name, n: 0, num: 0, den: 0, also: 0 };
    b.n++; b.num += s.num(p); b.den += s.den ? s.den(p) : 1; if (s.also) b.also += s.also(p); by.set(p.name, b);
  }
  const all = [...by.values()], ok = b => (s.den ? b.den : b.n) >= s.min;
  const rows = all.filter(ok).sort((x, y) => y.num / y.den - x.num / x.den || y.den - x.den)
    .map(b => ({ name: b.name, v: b.num / b.den, main: s.fmt ? s.fmt(b.num, b.den) : f1(b.num / b.den), sub: s.sub ? s.sub(b) : `${b.num} in ${plural(b.n, 'wedstrijd', 'wedstrijden')}` }));
  return [...rows, ...all.filter(b => !ok(b)).map(b => ({ name: b.name, main: null, sub: s.den ? `${b.den} schoten, ${s.minLabel}` : `${plural(b.n, 'wedstrijd', 'wedstrijden')}, ${s.minLabel}` }))];
}
function threats(ms) {
  // Topscorer en topassist: de carrièretotalen van EA, dezelfde als Algemeen. Goals + assists per wedstrijd ook.
  const C = DATA.members.filter(m => m.gamesPlayed > 0).map(m => ({ name: m.name, n: m.gamesPlayed, g: m.goals || 0, a: m.assists || 0, ga: ((m.goals || 0) + (m.assists || 0)) / m.gamesPlayed }));
  const top = key => [...C].sort((a, b) => b[key] - a[key] || a.n - b.n);
  const tile = (cls, key, label, name, val, unit, sub) => `<button type="button" class="threat ${cls}" data-dom="${key}">
      <span class="th-label">${label}</span><b class="th-name">${esc(proName(name))}</b>
      <span class="th-val"><b>${val}</b><small>${unit}</small></span><small class="th-sub">${esc(sub)}</small></button>`;
  const totalTile = (cls, label, key, unit) => { const t = top(key)[0]; return t && t[key] ? tile(cls, key, label, t.name, t[key], unit, `${f1(t[key] / t.n)} per wedstrijd, in ${t.n}`) : ''; };
  const roster = DATA.members.map(m => m.name);
  const R = Object.fromEntries(STATS.map(s => [s.key, statRows(ms, s)]));
  // Goals + assists per wedstrijd over de carrière: wie het meest bijdraagt aan doelpunten.
  R.ga = top('ga').map(t => ({ name: t.name, v: t.ga, main: f1(t.ga), sub: `${t.g} goals + ${t.a} assists in ${t.n}` }));
  // Compleet (coach-logica §9b): het gemiddelde van vier fronten, elk tegenover alle mensen. 50 = gemiddeld.
  R.all = roster.map(name => ({ name, f: DATA.fi?.[name] })).filter(x => x.f)
    .sort((x, y) => (y.f.score ?? -1) - (x.f.score ?? -1))
    .map(({ name, f }) => ({ name, main: f.score === null ? null : String(Math.round(f.score)),
      sub: f.score === null ? `${plural(f.n, 'wedstrijd', 'wedstrijden')}, minstens drie nodig` : FI_PARTS.map(q => `${q.label.toLowerCase()} ${Math.round(f.parts[q.key])}`).join(' · ') }));
  // Op de tegel het zwakste front: compleet is zo sterk als je zwakste kant.
  const allSub = r => { const f = DATA.fi[r.name], low = [...FI_PARTS].sort((a, b) => f.parts[a.key] - f.parts[b.key])[0]; return `zwakst: ${low.label.toLowerCase()} ${Math.round(f.parts[low.key])}`; };
  const tileOf = (cls, key, label, unit, subOf) => { const r = R[key][0]; return r && r.main !== null ? tile(cls, key, label, r.name, r.main, unit, subOf ? subOf(r) : r.sub) : ''; };
  $('#threats').innerHTML = totalTile('goals', 'Topscorer', 'g', 'goals') + totalTile('assists', 'Topassist', 'a', 'assists')
    + tileOf('att', 'ga', 'Goals + assists', 'per wedstrijd') + tileOf('cre', 'pass', 'Passes', 'per wedstrijd')
    + tileOf('def', 'def', 'Verdedigen', 'per wedstrijd') + tileOf('all', 'all', 'Compleet', '', allSub);
  $('#threats').onclick = e => {
    const btn = e.target.closest('.threat'); if (!btn) return; const k = btn.dataset.dom;
    if (k === 'g' || k === 'a') return openRankList({ label: k === 'g' ? 'Topscorer' : 'Topassist', about: `Het aantal ${k === 'g' ? 'goals' : 'assists'} over de hele carrière bij de club volgens EA, ook van vóór deze app (dezelfde totalen als bij Algemeen). Bij gelijk staat wie het in minder wedstrijden deed hoger.`, who: CAREER,
      rows: top(k).map(t => ({ name: t.name, main: String(t[k]), sub: `${f1(t[k] / t.n)} per wedstrijd, in ${t.n}` })) }, roster);
    if (k === 'ga') return openRankList({ label: 'Goals + assists', about: 'Goals plus assists per wedstrijd, over de hele carrière bij de club volgens EA: wie het meest bijdraagt aan doelpunten.', who: CAREER, rows: R.ga }, roster);
    if (k === 'all') return openRankList({ label: 'Compleet', about: 'Hoe hoog je op elk front scoort, allemaal even zwaar: aanvallen (goals + assists), passen (geslaagde passes), balbehoud (balverlies per keer aan de bal, lager is beter) en verdedigen (tackles, onderscheppingen, kopduels achterin, blokken, wegwerken en balwinst, ook door druk zetten). Per wedstrijd per front: beter dan zoveel procent van alle mensen die we ooit tegenkwamen, tegenstanders inbegrepen. Compleet is het gemiddelde van de vier. 50 is gemiddeld.', who: 'Gevolgde wedstrijden van 45 minuten of langer met gebeurtenissen van EA; minstens drie. Bij weinig wedstrijden trekken we het getal naar 50.', rows: R.all }, roster);
    const s = STATS.find(x => x.key === k);
    openRankList({ label: s.label, about: s.about, who: `Gevolgde wedstrijden met gebeurtenissen van EA; ${s.minLabel}.`, rows: R[k] }, roster);
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
  rankCards($('#rank-cards'), clubCards(), DATA.members.map(m => m.name)); // altijd de hele selectie

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
