// Spelerspagina (docs/coach-logica.md §9 en §9a): kaart met vorm, samenvatting met drie cijfers, één lijst met alle
// cijfers, en de laatste wedstrijden. Alles komt uit DATA (common.js), dus het groeit mee met elke speelavond.
// Het advies (builds.js), Aan de bal in context en de vorm per sessie staan voorlopig niet op de pagina; de code blijft.

const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const minutes = rows => sum(rows, r => r.p.secondsPlayed) / 60;
const per90 = (rows, f) => { const m = minutes(rows); return m ? +(90 * sum(rows, f) / m).toFixed(2) : null; };
const evRows = rows => rows.filter(r => r.p.ev);
const evPer90 = key => rows => { const e = evRows(rows); return e.length ? per90(e, r => r.p.ev[key]) : null; };
const f0 = v => v === null || v === undefined ? '–' : String(Math.round(v));

// Maten waarop een speler de beste van het team kan zijn (voor de derde zin van de samenvatting).
const METRICS = [
  { key: 'ga90', phrase: 'Niemand in het team is bij meer goals betrokken.', calc: rows => per90(rows, r => (r.p.goals || 0) + (r.p.assists || 0)) },
  { key: 'conv', phrase: 'Niemand in het team maakt meer van de kansen af.', min: r => sum(r, x => x.p.shots) >= 10, calc: rows => pct(sum(rows, r => r.p.goals), sum(rows, r => r.p.shots)) },
  { key: 'passAcc', phrase: 'Niemand in het team passt zuiverder.', calc: rows => pct(sum(rows, r => r.p.passesMade), sum(rows, r => r.p.passAttempts)) },
  { key: 'through90', phrase: 'Niemand in het team geeft meer steekpasses.', calc: evPer90('through_balls') },
  { key: 'beaten90', phrase: 'Niemand in het team speelt meer tegenstanders uit.', calc: evPer90('players_beaten') },
  { key: 'won90', phrase: 'Niemand in het team verovert meer ballen.', calc: evPer90('possession_won') },
  { key: 'interceptions90', phrase: 'Niemand in het team onderschept meer ballen.', calc: evPer90('interceptions') },
  { key: 'tacklePct', phrase: 'Niemand in het team wint meer duels.', min: r => sum(r, x => x.p.tackleAttempts) >= 15, calc: rows => pct(sum(rows, r => r.p.tacklesMade), sum(rows, r => r.p.tackleAttempts)) },
];

let selected = null;

function rowsFor(ms, name) { return ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p); }

// Het ene waarin deze speler de beste van het team is: plek 1 en minstens 25 % boven het teamgemiddelde (coach-logica §9).
function bestOfTeam(name, ms, players) {
  const allRows = players.flatMap(n => rowsFor(ms, n));
  let best = null;
  for (const mt of METRICS) {
    const vals = players.map(n => { const rows = rowsFor(ms, n); return { n, v: rows.length >= 3 && (!mt.min || mt.min(rows)) ? mt.calc(rows) : null }; }).filter(x => x.v !== null && x.v !== undefined);
    const team = mt.calc(allRows); if (vals.length < 3 || !team) continue;
    const top = vals.reduce((a, b) => b.v > a.v ? b : a);
    if (top.n !== name) continue;
    const gap = (top.v - team) / Math.abs(team);
    if (gap >= 0.25 && (!best || gap > best.gap)) best = { gap, phrase: mt.phrase };
  }
  return best;
}

const LINE_NL = { keeper: 'in het doel', verdediging: 'in de verdediging', 'verdediging of middenveld': 'achterin of op het middenveld', 'back of middenveld': 'achterin of op het middenveld', middenveld: 'op het middenveld', 'middenveld of aanval': 'op het middenveld of in de aanval', vleugel: 'op de vleugel', aanval: 'in de aanval', spits: 'in de spits' };

// Samenvatting (coach-logica §9): wie en wat, vorm, en alleen als het eruit springt waarin deze speler de beste is.
function playerSummary(name, rows, ms, players) {
  if (!rows.length) return 'Nog geen wedstrijden van deze speler in de gekozen periode.';
  const nm = `<b>${esc(proName(name))}</b>`, n = rows.length, wed = `${n} ${n === 1 ? 'wedstrijd' : 'wedstrijden'}`;
  const arch = [...rows].reverse().find(r => r.p.archetypeId)?.p.archetypeId, line = ARCHETYPES[arch]?.line;
  const pos = rows[rows.length - 1].p.pos;
  const g = sum(rows, r => r.p.goals), a = sum(rows, r => r.p.assists), e = evRows(rows);
  const won = e.length ? sum(e, r => r.p.ev.possession_won) / e.length : null, nul = rows.filter(r => r.m.goalsAgainst === 0).length, saves = sum(rows, r => r.p.saves);
  const who = arch ? `speelt als ${archName(arch)}${line ? ` ${LINE_NL[line] || line}` : ''}` : `speelde ${wed}`;
  let did;
  if (pos === 'goalkeeper') did = `${numWord(saves)} ${saves === 1 ? 'redding' : 'reddingen'} en ${numWord(nul)} keer de nul in ${wed}`;
  else if (pos === 'defender') did = `${won === null ? '' : `gemiddeld ${won.toFixed(1)} veroverde ballen per wedstrijd en `}${numWord(nul)} keer de nul in ${wed}`;
  else did = `${g} ${g === 1 ? 'goal' : 'goals'} en ${a} ${a === 1 ? 'assist' : 'assists'} in ${wed}`;
  const parts = [`${nm} ${who}: ${did}.`];
  const t = window.PlayerCard.tier(name);
  // Vorm per sessie (coach-logica §9c): de laatste speelavond met minstens drie eigen potten.
  if (t.tier === 'top') parts.push('Zit in topvorm: de laatste speelavond op hoog niveau, en het team won er de meeste potten.');
  else if (t.tier === 'zwart') parts.push(t.level >= 7 ? 'Zit in vorm: de laatste speelavond op hoog niveau.' : 'Zit in vorm: de laatste speelavond beter dan het eigen normaal, met winst erbij.');
  else if (t.growth !== null && t.growth <= -0.3) parts.push('De laatste speelavond viel wat tegen vergeleken met het eigen normaal.');
  else if (t.session !== null) parts.push('De laatste speelavond lag op het eigen normale niveau.');
  const best = bestOfTeam(name, ms, players);
  if (best) parts.push(best.phrase);
  return parts.join(' ');
}

// Alles wat voor een speler telt (coach-logica §9a), als losse kaart per groep, in vaste kolommen: label, per wedstrijd (of de breuk bij
// een percentage), en helemaal rechts het totaal.
function statGroups(rows) {
  const n = rows.length, e = evRows(rows), ne = e.length;
  const t = f => sum(rows, r => f(r.p)), te = f => sum(e, r => f(r.p.ev));
  const count = (label, total, games = n) => ({ label, main: String(total), sub: games ? (total / games).toFixed(1) : '' /* de kolomkop zegt al: per wedstrijd */ });
  const ratio = (label, num, den) => ({ label, main: den ? fmtPct(pct(num, den)) : '–', sub: `${num} van ${den}` });
  const plain = (label, main, sub = '') => ({ label, main, sub });
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null), fi = fiForRows(rows.map(r => r.p).filter(p => p.fi !== null));
  const used = {}; for (const r of rows) if (r.p.archetypeId) used[r.p.archetypeId] = (used[r.p.archetypeId] || 0) + 1;
  const last = [...rows].reverse().find(r => r.p.archetypeId)?.p.archetypeId;
  const builds = Object.entries(used).sort((x, y) => (Number(y[0]) === last) - (Number(x[0]) === last) || y[1] - x[1]);
  const gk = rows.some(r => r.p.pos === 'goalkeeper');
  const groups = [
    ['Algemeen', [
      plain('Wedstrijden', String(n)), plain('Minuten per wedstrijd', n ? f0(minutes(rows) / n) : '–'),
      plain('Rating', ratings.length ? f1(avg(ratings)) : '–', 'gemiddeld'), plain('Frambroos-index', fiFmt(fi.score), fi.score === null ? 'minstens 3 wedstrijden' : fiLabel(fi.score)),
      count('Man of the match', t(p => p.mom)),
      { label: 'Builds gespeeld', builds: builds.map(([id, k]) => `<span class="pc-badge ${Number(id) === last ? 'on' : ''}">${esc(archName(id))} <small>${k}×</small></span>`).join('') },
    ]],
    ['Aanvallen', [
      count('Goals', t(p => p.goals)), count('Assists', t(p => p.assists)), ne ? count('Tweede assists', te(v => v.second_assists), ne) : null,
      count('Schoten', t(p => p.shots)), ratio('Conversie', t(p => p.goals), t(p => p.shots)),
      ne ? count('Dribbels', te(v => v.dribbles_completed), ne) : null, ne ? count('Tegenstanders uitgespeeld', te(v => v.players_beaten), ne) : null,
    ]],
    ['Passen', [
      ratio('Passes gelukt', t(p => p.passesMade), t(p => p.passAttempts)), count('Passes per wedstrijd', t(p => p.passesMade)),
      ne ? count('Steekpasses', te(v => v.through_balls), ne) : null, ne ? ratio('Vooruit gespeeld', te(v => v.passes_completed_forward), te(v => v.passes_completed)) : null,
    ]],
    ['Verdedigen', [
      ne ? count('Balwinst', te(v => v.possession_won), ne) : null, ne ? count('Onderscheppingen', te(v => v.interceptions), ne) : null,
      ratio('Tackles gewonnen', t(p => p.tacklesMade), t(p => p.tackleAttempts)), count('De nul gehouden', rows.filter(r => r.m.goalsAgainst === 0).length),
      gk ? count('Reddingen', t(p => p.saves)) : null,
    ]],
    ['Discipline', [
      ne ? count('Balverlies', te(v => v.possession_lost), ne) : null,
      ne ? ratio('Uit positie', te(v => v.out_of_position), te(v => v.out_of_position + v.in_position)) : null,
      ne ? count('Overtredingen', te(v => v.fouls_conceded_total), ne) : null,
      ne ? plain('Kaarten', String(te(v => v.yellow_cards_total) + t(p => p.redCards)), `${te(v => v.yellow_cards_total)} geel · ${t(p => p.redCards)} rood`) : plain('Kaarten', String(t(p => p.redCards)), 'rood'),
    ]],
  ];
  return groups.map(([title, items]) => `<section class="card stat-group"><h2>${title}</h2><div class="stat-head" aria-hidden="true"><span></span><span>per wedstrijd</span><span>totaal</span></div>${items.filter(Boolean).map(it => it.builds !== undefined
    ? `<div class="stat-row has-builds"><span>${it.label}</span><span class="builds">${it.builds || '–'}</span></div>`
    : `<div class="stat-row"><span>${it.label}</span><small>${it.sub}</small><b>${it.main}</b></div>`).join('')}</section>`).join('');
}

function renderPlayer() {
  const ms = filtered(), players = DATA.players;
  // Zonder naam in het adres: de favoriet van wie de app gebruikt, anders Neegek. De favoriet staat vooraan met een ster.
  const fav = players.includes(favorite()) ? favorite() : null;
  if (!selected || !players.includes(selected)) selected = fav || (players.includes('Neegek') ? 'Neegek' : players[0]);
  location.hash = encodeURIComponent(selected);
  const order = fav ? [fav, ...players.filter(p => p !== fav)] : players;
  $('#chips').innerHTML = order.map(p => `<button type="button" class="chip ${p === selected ? 'active' : ''}" data-p="${esc(p)}">${p === fav ? `<span class="fav-star">${STAR}</span>` : ''}${esc(proName(p))}</button>`).join('');
  for (const b of $('#chips').querySelectorAll('.chip')) b.addEventListener('click', () => { selected = b.dataset.p; renderPlayer(); });

  const rows = rowsFor(ms, selected), s = summarize(rows.map(r => r.m));
  const n = rows.length || 1, g = sum(rows, r => r.p.goals), as = sum(rows, r => r.p.assists);
  window.PlayerCard.render(selected);
  const on = fav === selected;
  $('#player-hero').insertAdjacentHTML('afterbegin', `<button type="button" class="fav-btn" aria-pressed="${on}" aria-label="${on ? 'Favoriet, tik om weg te halen' : 'Maak favoriet'}" title="${on ? 'Favoriet: tik om weg te halen' : 'Maak deze speler je favoriet (er kan er één zijn)'}">${STAR}<span>${on ? 'Favoriet' : 'Favoriet maken'}</span></button>`);
  $('#player-hero .fav-btn').addEventListener('click', () => { setFavorite(on ? null : selected); renderPlayer(); });
  document.title = `${proName(selected)} · Frambroos Coach`;
  $('#p-summary').innerHTML = playerSummary(selected, rows, ms, players);
  // Drie cijfers over de gekozen periode (coach-logica §9a).
  const three = (label, value, sub) => `<div class="sfig"><span class="sfig-label">${label}</span><span class="sfig-value">${value}</span><span class="sfig-sub">${sub}</span></div>`;
  $('#p-three').innerHTML = rows.length ? [
    three('Goals per wedstrijd', f1(g / n), `${g} in ${rows.length} wedstrijden`),
    three('Assists per wedstrijd', f1(as / n), `${as} in ${rows.length} wedstrijden`),
    three('Gewonnen', fmtPct(s.winPct), `${s.W}-${s.D}-${s.L} met deze speler`),
  ].join('') : '';
  $('#p-stats').innerHTML = rows.length ? statGroups(rows) : '<p class="empty">Nog geen wedstrijden in de gekozen periode.</p>';

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

for (const id of ['#range', '#type']) $(id).addEventListener('change', () => DATA && renderPlayer());
onWidthChange(() => DATA && renderPlayer());
// Andere speler in het menu: meteen tekenen als de data er is, anders onthouden voor zodra die geladen is.
addEventListener('hashchange', () => { const n = decodeURIComponent(location.hash.slice(1)); if (n && n !== selected) { selected = n; if (DATA) renderPlayer(); } });
selected = decodeURIComponent(location.hash.slice(1)) || null;
window.rerender = () => renderPlayer(); // thema wisselen: kaart opnieuw in thuis- of uitkleuren
Promise.all([loadData(), window.BuildTab.load(), window.PlayerCard.load()]).then(renderPlayer).catch(showError);
