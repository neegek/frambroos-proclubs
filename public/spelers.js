// Spelerspagina (docs/coach-logica.md §9a): kaart met vorm, de cijfers per groep naast die van de club, en de laatste
// wedstrijden. Altijd over alle gevolgde wedstrijden (DATA in common.js), dus het groeit mee met elke speelavond.
// Het advies (builds.js), Aan de bal in context en de vorm per sessie staan voorlopig niet op de pagina; de code blijft.

const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const evRows = rows => rows.filter(r => r.p.ev);

let selected = null;

function rowsFor(ms, name) { return ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p); }

// De cijfers per groep (coach-logica §9a): per regel de speler en de club, elk met groot het totaal en klein per
// wedstrijd (bij een percentage de breuk). De club is iedereen van ons; per wedstrijd is daar het gemiddelde per speler
// per wedstrijd. De speler kleurt groen als die beter zit dan de club, rood als slechter (lower: lager is beter).
function statGroups(rows, club, name) {
  const gk = rows.some(r => r.p.pos === 'goalkeeper');
  // Een maat: van een set rijen het totaal, en per wedstrijd (aantal) of de verhouding (ratio).
  const count = (label, f, { ev = false, lower = false, cmp = true } = {}) => ({ label, lower, cmp, of: list => {
    const src = ev ? evRows(list) : list, total = sum(src, r => f(ev ? r.p.ev : r.p, r));
    return src.length ? { main: String(total), sub: `${(total / src.length).toFixed(1)} per wedstrijd`, v: total / src.length } : null; } });
  const ratio = (label, num, den, { ev = false, lower = false } = {}) => ({ label, lower, cmp: true, of: list => {
    const src = ev ? evRows(list) : list, a = sum(src, r => num(ev ? r.p.ev : r.p)), b = sum(src, r => den(ev ? r.p.ev : r.p));
    return b ? { main: fmtPct(pct(a, b)), sub: `${a} van ${b}`, v: 100 * a / b, pctPts: true } : null; } });
  const groups = [
    ['Aanvallen', [
      count('Goals', p => p.goals), count('Assists', p => p.assists), count('Tweede assists', v => v.second_assists, { ev: true }),
      count('Schoten', p => p.shots), ratio('Conversie', p => p.goals, p => p.shots),
      count('Dribbels', v => v.dribbles_completed, { ev: true }), count('Tegenstanders uitgespeeld', v => v.players_beaten, { ev: true }),
    ]],
    ['Passen', [
      ratio('Passes gelukt', p => p.passesMade, p => p.passAttempts), count('Passes', p => p.passesMade),
      count('Steekpasses', v => v.through_balls, { ev: true }), ratio('Vooruit gespeeld', v => v.passes_completed_forward, v => v.passes_completed, { ev: true }),
    ]],
    ['Verdedigen', [
      count('Balwinst', v => v.possession_won, { ev: true }), count('Onderscheppingen', v => v.interceptions, { ev: true }),
      ratio('Tackles gewonnen', p => p.tacklesMade, p => p.tackleAttempts), count('De nul gehouden', (p, r) => r.m.goalsAgainst === 0 ? 1 : 0),
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
  return groups.map(([title, items]) => `<section class="card stat-group"><h2>${title}</h2>
    <div class="stat-head" aria-hidden="true"><span></span><span>${esc(proName(name))}</span><span>Club</span></div>
    ${items.filter(Boolean).map(it => { const me = it.of(rows), us = it.of(club);
      return `<div class="stat-row"><span>${it.label}</span>${cell(me, verdict(me, us, it))}${cell(us)}</div>`; }).join('')}</section>`).join('');
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
  const club = players.flatMap(n => rowsFor(ms, n));
  $('#p-stats').innerHTML = rows.length ? statGroups(rows, club, selected) : '<p class="empty">Nog geen wedstrijden.</p>';

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
// Andere speler in het menu: meteen tekenen als de data er is, anders onthouden voor zodra die geladen is.
addEventListener('hashchange', () => { const n = decodeURIComponent(location.hash.slice(1)); if (n && n !== selected) { selected = n; if (DATA) renderPlayer(); } });
selected = decodeURIComponent(location.hash.slice(1)) || null;
window.rerender = () => renderPlayer(); // thema wisselen: kaart opnieuw in thuis- of uitkleuren
Promise.all([loadData(), window.BuildTab.load(), window.PlayerCard.load()]).then(renderPlayer).catch(showError);
