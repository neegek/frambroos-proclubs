// Spelerspagina (docs/coach-logica.md §9a): kaart met vorm, de cijfers per groep naast die van de club, en de laatste
// wedstrijden. Altijd over alle gevolgde wedstrijden (DATA in common.js), dus het groeit mee met elke speelavond.
// Het advies (builds.js), Aan de bal in context en de vorm per sessie staan voorlopig niet op de pagina; de code blijft.

const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const evRows = rows => rows.filter(r => r.p.ev);

let selected = null;

function rowsFor(ms, name) { return ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p); }

// De cijfers per groep (coach-logica §9a): per regel de plek onder onze spelers, de speler en de club, elk met groot
// het totaal en klein het getal per wedstrijd (bij een percentage de breuk). De club is iedereen van ons; per wedstrijd
// is daar het gemiddelde per speler per wedstrijd. De speler kleurt groen als die beter zit dan de club, rood als
// slechter (lower: lager is beter). Een tik op een regel opent de ranglijst van die maat (openStat).
let statItems = [];
const MIN_N = 3, MIN_DEN = 10; // meedoen in de ranglijst: minstens 3 wedstrijden, bij een percentage 10 pogingen
const RIM = rank => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'iron';

function statGroups(rows, club, name, everyone) {
  const gk = rows.some(r => r.p.pos === 'goalkeeper');
  // Een maat: van een set rijen het totaal, en per wedstrijd (aantal) of de verhouding (ratio). key: het getal zoals
  // het er staat (één decimaal, percentage afgerond), waarop spelers een plek delen.
  // career: het veld met het carrièretotaal bij EA (DATA.members), dat bij een gelijk getal per wedstrijd beslist.
  const count = (label, f, { ev = false, lower = false, cmp = true, career = null } = {}) => ({ label, lower, cmp, career, of: list => {
    const src = ev ? evRows(list) : list, total = sum(src, r => f(ev ? r.p.ev : r.p, r)), v = src.length ? total / src.length : 0;
    return src.length ? { main: String(total), sub: f1(v), v, key: Math.round(10 * v), n: src.length, ok: src.length >= MIN_N, total,
      big: f1(v), small: `${total} in ${plural(src.length, 'wedstrijd', 'wedstrijden')}` } : null; } });
  const ratio = (label, num, den, { ev = false, lower = false, career = null } = {}) => ({ label, lower, cmp: true, pctPts: true, career, of: list => {
    const src = ev ? evRows(list) : list, a = sum(src, r => num(ev ? r.p.ev : r.p)), b = sum(src, r => den(ev ? r.p.ev : r.p));
    return b ? { main: fmtPct(pct(a, b)), sub: `${a} van ${b}`, v: 100 * a / b, key: pct(a, b), n: src.length, ok: src.length >= MIN_N && b >= MIN_DEN, total: a,
      big: fmtPct(pct(a, b)), small: `${a} van ${b}`, pctPts: true } : null; } });
  const groups = [
    ['Aanvallen', [
      count('Goals', p => p.goals, { career: 'goals' }), count('Assists', p => p.assists, { career: 'assists' }), count('Tweede assists', v => v.second_assists, { ev: true }),
      count('Schoten', p => p.shots), ratio('Conversie', p => p.goals, p => p.shots),
      count('Dribbels', v => v.dribbles_completed, { ev: true }), count('Tegenstanders uitgespeeld', v => v.players_beaten, { ev: true }),
    ]],
    ['Passen', [
      ratio('Passes gelukt', p => p.passesMade, p => p.passAttempts, { career: 'passesMade' }), count('Passes', p => p.passesMade, { career: 'passesMade' }),
      count('Steekpasses', v => v.through_balls, { ev: true }), ratio('Vooruit gespeeld', v => v.passes_completed_forward, v => v.passes_completed, { ev: true }),
    ]],
    ['Verdedigen', [
      count('Balwinst', v => v.possession_won, { ev: true }), count('Onderscheppingen', v => v.interceptions, { ev: true }),
      ratio('Tackles gewonnen', p => p.tacklesMade, p => p.tackleAttempts, { career: 'tacklesMade' }), count('De nul gehouden', (p, r) => r.m.goalsAgainst === 0 ? 1 : 0),
      gk ? count('Reddingen', p => p.saves, { cmp: false }) : null,
    ]],
    ['Discipline', [
      count('Balverlies', v => v.possession_lost, { ev: true, lower: true }),
      ratio('Uit positie', v => v.out_of_position, v => v.out_of_position + v.in_position, { ev: true, lower: true }),
      count('Overtredingen', v => v.fouls_conceded_total, { ev: true, lower: true }),
      count('Kaarten', (p, r) => (r.p.ev?.yellow_cards_total || 0) + (p.redCards || 0), { lower: true }),
    ]],
  ];
  // Beter of slechter dan de club: binnen 5 % van elkaar (percentages: 2 punten) is gelijk.
  const verdict = (me, us, it) => { if (!it.cmp || !me || !us) return '';
    const d = me.v - us.v, same = me.pctPts ? Math.abs(d) <= 2 : Math.abs(d) <= 0.05 * Math.max(Math.abs(us.v), 0.01);
    return same ? 'same' : (d > 0) !== it.lower ? 'better' : 'worse'; };
  const cell = (x, cls = '') => x ? `<span class="sv ${cls}"><b>${x.main}</b><small>${x.sub}</small></span>` : '<span class="sv"><b>–</b></span>';
  // De ranglijst van een maat: wie meedoet, op het exacte getal per wedstrijd. Bij hetzelfde getal zoals het er staat
  // (één decimaal, percentage afgerond) beslist het totaal: bij EA als EA het heeft, anders het gevolgde (lager-is-beter:
  // het kleinere). Alleen bij precies hetzelfde getal en totaal een gedeelde plek.
  const ranking = it => {
    const sign = it.lower ? -1 : 1;
    const list = everyone.map(e => { const x = it.of(e.rows), ea = it.career ? DATA.members.find(m => m.name === e.name)?.[it.career] ?? null : null;
      return { name: e.name, x, ea, tb: ea ?? x?.total ?? 0 }; }).filter(e => e.x && e.x.ok)
      .sort((a, b) => sign * (b.x.key - a.x.key) || sign * (b.tb - a.tb) || sign * (b.x.v - a.x.v));
    let rank = 0, prev = null;
    return list.map((e, i) => { if (!prev || e.x.key !== prev.x.key || e.tb !== prev.tb) rank = i + 1; prev = e; return { ...e, rank }; });
  };
  statItems = [];
  return groups.map(([title, items]) => `<section class="card stat-group"><h2>${title}</h2>
    <div class="stat-head" aria-hidden="true"><span></span><span></span><span>${esc(proName(name))}</span><span>Club</span></div>
    ${items.filter(Boolean).map(it => { const me = it.of(rows), us = it.of(club);
      const list = it.cmp ? ranking(it) : null, mine = list?.find(e => e.name === name);
      const i = statItems.push({ it, list, us }) - 1;
      const dot = mine ? `<span class="rank-dot metal-${RIM(mine.rank)}" title="Plek ${mine.rank} van ${list.length}">${mine.rank}</span>` : '<span></span>';
      const inner = `<span>${it.label}</span>${dot}${cell(me, verdict(me, us, it))}${cell(us)}`;
      return list ? `<button type="button" class="stat-row" data-i="${i}" aria-haspopup="dialog" aria-label="${it.label}: ranglijst">${inner}</button>`
        : `<div class="stat-row">${inner}</div>`; }).join('')}</section>`).join('');
}

// De ranglijst van één maat (coach-logica §9a): plek, speler, groot per wedstrijd of percentage, klein totaal of breuk.
function openStat(i) {
  const { it, list, us } = statItems[i], d = $('#rank-dialog');
  const what = list[0]?.x.pctPts ? 'Het percentage' : 'Het gemiddelde per wedstrijd';
  d.querySelector('.rd-body').innerHTML = `<h2 id="rd-title">${it.label}</h2>
    <p>${what}${it.lower ? ', lager is beter' : ''}; bij een gelijk getal beslist het totaal${it.career ? ' bij EA' : ''}. Mee doet wie minstens ${MIN_N} wedstrijden heeft${list[0]?.x.pctPts ? ` en ${MIN_DEN} pogingen` : ''}.</p>
    <ol class="rd-list">${list.map(e => `<li class="${e.name === selected ? 'me' : ''}"><span class="rank-dot metal-${RIM(e.rank)}">${e.rank}</span><span>${esc(proName(e.name))}</span><b>${e.x.big}</b><small>${esc(e.x.small)}${e.ea !== null ? ` · ${e.ea} bij EA` : ''}</small></li>`).join('') || '<li class="empty">Nog te weinig wedstrijden.</li>'}
    ${us ? `<li class="rd-club"><span></span><span>Club</span><b>${us.big}</b><small>${us.pctPts ? esc(us.small) : 'per speler per wedstrijd'}</small></li>` : ''}</ol>`;
  d.showModal();
}

// Groei (coach-logica §9a, 4): eerder (carrière bij EA min de gevolgde wedstrijden) tegenover nu (de gevolgde). Een
// verschil is beduidend boven twee keer de onzekerheid; bij de rating plus de afronding van EA.
const MIN_EARLIER = 10;
function growthCard(name, rows) {
  const c = DATA.members.find(m => m.name === name), n2 = rows.length, n1 = c ? c.gamesPlayed - n2 : 0;
  const since = new Date(DATA.matches[0].ts * 1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '');
  if (!c || n1 < MIN_EARLIER) return `<p class="empty">Te weinig wedstrijden van vóór ${since} om te vergelijken${c ? ` (${n1})` : ''}.</p>`;
  const rated = rows.filter(r => r.p.rating !== null).map(r => r.p.rating), r2 = avg(rated);
  const sd = Math.sqrt(rated.reduce((a, x) => a + (x - r2) ** 2, 0) / Math.max(1, rated.length - 1));
  const r1 = (c.ratingAve * c.gamesPlayed - r2 * n2) / n1;
  const items = [{ label: 'Rating', a: r1, b: r2, lim: 2 * sd * Math.sqrt(1 / n1 + 1 / n2) + 0.05 * c.gamesPlayed / n1 }];
  for (const [label, key, f] of [['Goals', 'goals', p => p.goals], ['Assists', 'assists', p => p.assists], ['Man of the match', 'mom', p => p.mom]]) {
    const now = sum(rows, r => f(r.p)), a = Math.max(0, c[key] - now) / n1, b = now / n2;
    items.push({ label, a, b, lim: 2 * Math.sqrt(a / n1 + b / n2) });
  }
  const tone = it => it.b - it.a > it.lim ? 'better' : it.a - it.b > it.lim ? 'worse' : '';
  const rt = tone(items[0]), d = Math.round(10 * (items[0].b - items[0].a)) / 10 || 0;
  const verdict = rt === 'better' ? `Beduidend beter dan eerder: rating ${signed(d, 1)}.` : rt === 'worse' ? `Beduidend minder dan eerder: rating ${signed(d, 1)}.` : `Geen duidelijk verschil met eerder in rating (${signed(d, 1)}).`;
  return `<p class="growth-verdict ${rt}">${verdict}</p>
    <div class="stat-head growth-head" aria-hidden="true"><span></span><span title="Vóór ${since}">Eerder · ${n1}</span><span title="Sinds ${since}">Nu · ${n2}</span></div>
    ${items.map(it => `<div class="stat-row growth-row"><span>${it.label}</span><span class="sv"><b>${f1(it.a)}</b></span><span class="sv ${tone(it)}"><b>${f1(it.b)}</b></span></div>`).join('')}`;
}

function renderPlayer() {
  const ms = DATA.matches, players = DATA.players; // altijd alle gevolgde wedstrijden: geen filters meer
  // Zonder naam in het adres: de favoriet van wie de app gebruikt, anders Neegek. De favoriet staat vooraan met een ster.
  const fav = players.includes(favorite()) ? favorite() : null;
  if (!selected || !players.includes(selected)) selected = fav || (players.includes('Neegek') ? 'Neegek' : players[0]);
  location.hash = encodeURIComponent(selected);
  const order = fav ? [fav, ...players.filter(p => p !== fav)] : players;
  $('#chips').innerHTML = order.map(p => `<button type="button" class="chip ${p === selected ? 'active' : ''}" data-p="${esc(p)}">${p === fav ? `<span class="fav-star">${STAR}</span>` : ''}${esc(proName(p))}</button>`).join('');
  for (const b of $('#chips').querySelectorAll('.chip')) b.addEventListener('click', () => { selected = b.dataset.p; renderPlayer(); });

  const rows = rowsFor(ms, selected);
  window.PlayerCard.render(selected);
  const on = fav === selected;
  $('#player-hero').insertAdjacentHTML('afterbegin', `<button type="button" class="fav-btn" aria-pressed="${on}" aria-label="${on ? 'Favoriet, tik om weg te halen' : 'Maak favoriet'}" title="${on ? 'Favoriet: tik om weg te halen' : 'Maak deze speler je favoriet (er kan er één zijn)'}">${STAR}<span>${on ? 'Favoriet' : 'Favoriet maken'}</span></button>`);
  $('#player-hero .fav-btn').addEventListener('click', () => { setFavorite(on ? null : selected); renderPlayer(); });
  document.title = `${proName(selected)} · Frambroos Coach`;
  const everyone = players.map(n => ({ name: n, rows: rowsFor(ms, n) })), club = everyone.flatMap(e => e.rows);
  $('#p-stats').innerHTML = rows.length ? statGroups(rows, club, selected, everyone) : '<p class="empty">Nog geen wedstrijden.</p>';
  for (const b of $('#p-stats').querySelectorAll('button.stat-row')) b.addEventListener('click', () => openStat(+b.dataset.i));
  $('#p-growth').innerHTML = growthCard(selected, rows);

  table($('#tbl-player-matches'), [
    { label: 'Datum', render: r => fmtDateTime(r.m.ts) }, { label: 'Tegenstander', render: r => `<a href="wedstrijd.html?id=${r.m.matchId}">${esc(r.m.opponent.name)}</a>` },
    { label: 'Score', num: true, render: r => `${r.m.goals}–${r.m.goalsAgainst}` }, { label: 'Uitslag', render: r => `<span class="pill ${r.m.result}">${r.m.result === 'D' ? 'G' : r.m.result === 'L' ? 'V' : 'W'}</span>` },
    { label: 'Rating', num: true, render: r => r.p.rating }, { label: 'Index', num: true, render: r => fiFmt(r.p.fi) }, { label: 'G + A', num: true, render: r => `${r.p.goals} + ${r.p.assists}` },
  ], [...rows].reverse().map((r, i) => ({ ...r, i })), { rowClass: r => r.i >= PM_SHOWN ? 'pm-extra' : '' });
  // Eerst de laatste acht; de rest achter een knop.
  const wrap = $('#tbl-player-matches'), extra = rows.length - PM_SHOWN;
  wrap.classList.remove('show-all');
  if (extra > 0) {
    wrap.insertAdjacentHTML('beforeend', `<button type="button" class="more-btn">Alle ${rows.length} wedstrijden</button>`);
    wrap.querySelector('.more-btn').addEventListener('click', e => { wrap.classList.add('show-all'); e.currentTarget.remove(); });
  }
}
const PM_SHOWN = 8;

onWidthChange(() => DATA && renderPlayer());
$('#rank-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });
// Andere speler in het menu: meteen tekenen als de data er is, anders onthouden voor zodra die geladen is.
addEventListener('hashchange', () => { const n = decodeURIComponent(location.hash.slice(1)); if (n && n !== selected) { selected = n; if (DATA) renderPlayer(); } });
selected = decodeURIComponent(location.hash.slice(1)) || null;
window.rerender = () => renderPlayer(); // thema wisselen: kaart opnieuw in thuis- of uitkleuren
Promise.all([loadData(), window.BuildTab.load(), window.PlayerCard.load()]).then(renderPlayer).catch(showError);
