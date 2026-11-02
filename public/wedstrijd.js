// Wedstrijdpagina (een laag onder Wedstrijden): verhaal, de opstelling van beide teams op één veld, wij tegen hen en spelers van één wedstrijd.
// Adres: wedstrijd.html?id=<datum>-<tegenstander>. Logica van de samenvatting: docs/coach-logica.md §9.

const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const fmtDayLong = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const LINES = [['forward', 'Aanval'], ['midfielder', 'Middenveld'], ['defender', 'Verdediging'], ['goalkeeper', 'Keeper']];
const resLetter = r => r === 'D' ? 'G' : r === 'L' ? 'V' : 'W';


const side = (players, k) => players.reduce((a, p) => a + (p[k] || 0), 0);
const sideEv = (players, k) => players.some(p => p.ev) ? players.reduce((a, p) => a + (p.ev?.[k] || 0), 0) : null;

// Opstelling (coach-logica §9a, Opstelling): één veld, de kaart zelf is het gras. Per linie één rij, aanval bovenaan:
// wij links, zij rechts, met de naam van de linie één keer in het midden, op de stippellijn van de middenlijn.
// Elke speler is een rondje met de rating eronder: bij ons het portret, bij de tegenstander het archetype-icoon.
// AI per linie geeft EA niet, dus een lege kant van een linie heet "AI".
function lineup(m) {
  const by = players => { const o = Object.fromEntries(LINES.map(([k]) => [k, []])); for (const p of players) (o[p.pos] || o.midfielder).push(p); return o; };
  const us = by(m.players), them = by(m.opponentPlayers);
  const token = (p, mine) => {
    const photo = mine && PlayerCard.portrait(p.name), name = mine ? proName(p.name) : p.name;
    const face = photo ? `<img class="fade-img" src="${photo}" alt="">` : archIcon(p.archetypeId);
    const inner = `<span class="ftok-c">${face}</span><b>${p.rating === null ? '–' : f1(p.rating)}${p.mom ? '<i title="Man of the match">★</i>' : ''}</b><small>${esc(name)}</small>`;
    const title = `${esc(name)} · ${esc(archName(p.archetypeId))} · rating ${p.rating ?? '–'}`;
    return mine ? `<a class="ftok us" href="spelers.html#${encodeURIComponent(p.name)}" title="${title}">${inner}</a>` : `<span class="ftok" title="${title}">${inner}</span>`;
  };
  const toks = (list, mine) => list.length ? list.map(p => token(p, mine)).join('') : '<span class="ftok-ai">AI</span>';
  const head = (name, players, ai, right) => `<span class="fh-team${right ? ' right' : ''}"><b>${esc(name)}</b><small>${numWord(players.length)} ${players.length === 1 ? 'mens' : 'mensen'} · ${numWord(ai)} AI</small></span>`;
  return `<div class="pitch">
    <div class="pitch-head">${head('Frambroos', m.players, m.ai.players)}${head(m.opponent.name, m.opponentPlayers, m.ai.opponentPlayers ?? Math.max(0, 11 - m.opponentPlayers.length), true)}</div>
    ${LINES.map(([k, label]) => `<div class="prow"><div class="pside us">${toks(us[k], true)}</div><span class="prow-label">${label}</span><div class="pside them">${toks(them[k], false)}</div></div>`).join('')}
  </div>`;
}

function h2h(m) {
  const us = m.players, them = m.opponentPlayers;
  const pctOf = (a, b) => b ? Math.round(100 * a / b) : null;
  const out = (us.length ? us : them).length;
  const rows = [
    ['Doelpunten', m.goals, m.goalsAgainst, true],
    ['Schoten', side(us, 'shots'), side(them, 'shots'), true],
    ['Passnauwkeurigheid', pctOf(side(us, 'passesMade'), side(us, 'passAttempts')), pctOf(side(them, 'passesMade'), side(them, 'passAttempts')), true, '%'],
    ['Balwinst', sideEv(us, 'possession_won'), sideEv(them, 'possession_won'), true],
    ['Balverlies', sideEv(us, 'possession_lost'), sideEv(them, 'possession_lost'), false],
    ['Geslaagde dribbels', sideEv(us, 'dribbles_completed'), sideEv(them, 'dribbles_completed'), true],
    ['Overtredingen', sideEv(us, 'fouls_conceded_total'), sideEv(them, 'fouls_conceded_total'), false],
  ].filter(r => r[1] !== null && r[2] !== null);
  void out;
  return `<div class="legend"><span style="--c:var(--s1)">Frambroos</span><span style="--c:var(--s2)">${esc(m.opponent.name)}</span></div>
    <div class="h2h">${rows.map(([label, a, b, hib, unit = '']) => {
      const tot = (a || 0) + (b || 0), wa = tot ? 100 * (a || 0) / tot : 50;
      const better = a === b ? 0 : (hib ? a > b : a < b) ? 1 : -1;
      return `<div class="h2h-row"><span class="h2h-val ${better > 0 ? 'lead' : ''}">${a}${unit}</span><div class="h2h-mid"><span class="h2h-label">${label}</span><div class="h2h-bar"><span style="width:${wa}%"></span><span style="width:${100 - wa}%"></span></div></div><span class="h2h-val ${better < 0 ? 'lead' : ''}">${b}${unit}</span></div>`;
    }).join('')}</div>`;
}

// Zo viel de goal: alleen bij precies één eigen doelpunt is de keten scorer, assist en tweede assist te
// reconstrueren (docs/coach-logica.md §9a). EA geeft per speler alleen aantallen, niet bij welke goal.
function goalChain(m) {
  if (m.goals !== 1) return '';
  const who = f => m.players.filter(f).map(p => `<b>${esc(proName(p.name))}</b>`);
  const scorer = who(p => p.goals > 0), assist = who(p => p.assists > 0), second = who(p => p.ev?.second_assists > 0);
  if (scorer.length > 1 || assist.length > 1 || second.length > 1) return '';
  const steps = [];
  if (second.length) steps.push(`${second[0]} gaf de pass vóór de assist`);
  if (assist.length) steps.push(`${assist[0]} gaf de assist`);
  const goal = scorer.length ? `${scorer[0]} scoorde` : assist.length ? 'een AI-speler scoorde' : 'een AI-speler scoorde, of het was een eigen doelpunt';
  const tail = assist.length ? '' : ', zonder geregistreerde assist van een van jullie';
  return `<span class="goal-chain"><span class="adv-label">Zo viel de goal</span>${steps.length ? `${steps.join(', ')}, en ` : ''}${goal}${tail}.</span>`;
}

// Spelerstabel: compact de kerncijfers; de rest achter "Alle cijfers".
function playerTable(el, players, link) {
  const rows = [...players].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (!rows.length) { el.innerHTML = '<p class="empty">Geen menselijke spelers.</p>'; return; }
  const name = { label: 'Speler', render: p => link ? `<a href="spelers.html#${encodeURIComponent(p.name)}">${esc(proName(p.name))}</a>${p.mom ? ' ★' : ''}` : `${esc(p.name)}${p.mom ? ' ★' : ''}` };
  const compact = [name,
    { label: 'Rating', num: true, render: p => p.rating ?? '–' }, { label: 'Index', num: true, render: p => p.fi === null ? '–' : `<span title="Frambroos-index: 50 is gemiddeld voor de rol${fiMatchLabel(p.fi) ? ` · ${fiMatchLabel(p.fi)}` : ''}">${fiFmt(p.fi)}</span>` },
    { label: 'Goals', num: true, key: 'goals' }, { label: 'Assists', num: true, key: 'assists' },
    { label: '2e assist', num: true, render: p => p.ev ? (p.ev.second_assists || 0) : '–' }, { label: 'Schoten', num: true, key: 'shots' },
    { label: 'Pass %', num: true, render: p => p.passAttempts ? `${Math.round(100 * p.passesMade / p.passAttempts)}%` : '–' },
    { label: 'Balverlies', num: true, render: p => p.ev ? p.ev.possession_lost : '–' }];
  el.innerHTML = '<div class="pt-compact"></div><details class="all-stats"><summary>Alle cijfers</summary><div class="pt-full"></div></details>';
  table(el.querySelector('.pt-compact'), compact, rows);
  table(el.querySelector('.pt-full'), [
    { label: 'Speler', render: p => link ? `<a href="spelers.html#${encodeURIComponent(p.name)}">${esc(proName(p.name))}</a>${p.mom ? ' ★' : ''}` : `${esc(p.name)}${p.mom ? ' ★' : ''}` },
    { label: 'Positie', render: p => POS_NL[p.pos] || p.pos }, { label: 'Build', render: p => esc(archName(p.archetypeId)) },
    { label: 'Rating', num: true, render: p => p.rating ?? '–' }, { label: 'Goals', num: true, key: 'goals' }, { label: 'Assists', num: true, key: 'assists' }, { label: '2e assist', num: true, render: p => p.ev ? (p.ev.second_assists || 0) : '–' },
    { label: 'Schoten', num: true, key: 'shots' }, { label: 'Passes', num: true, render: p => `${p.passesMade}/${p.passAttempts}` },
    { label: 'Tackles', num: true, render: p => `${p.tacklesMade}/${p.tackleAttempts}` },
    { label: 'Balacties', num: true, render: p => p.ev ? p.ev.ball_actions : '–' }, { label: 'Dribbels', num: true, render: p => p.ev ? p.ev.dribbles_completed : '–' },
    { label: 'Balverlies', num: true, render: p => p.ev ? p.ev.possession_lost : '–' }, { label: 'Min.', num: true, render: p => Math.round((p.secondsPlayed || 0) / 60) },
  ], rows);
}


const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function render() {
  const id = new URLSearchParams(location.search).get('id');
  // Adres: wedstrijd.html?id=2026-11-01-war-team (datum en tegenstander); een oud adres met het EA-nummer werkt ook nog.
  const idx = DATA.matches.findIndex(x => x.slug === id || x.matchId === id);
  if (idx < 0) { $('#page-title').textContent = 'Wedstrijd niet gevonden'; $('#page-sub').textContent = 'Deze wedstrijd staat niet (meer) in de data.'; $('#m-detail').hidden = true; return; }
  const m = DATA.matches[idx];
  if (id !== m.slug) history.replaceState(null, '', matchHref(m)); // altijd het leesbare adres
  const own = DATA.snapshot?.skillRating, kits = DATA.club.kits;
  document.title = `Frambroos tegen ${m.opponent.name} · Frambroos Coach`;
  // Kop (coach-logica §9a, Wedstrijdpagina): de dag met de ronde pijltjes naar de vorige en volgende wedstrijd, zoals bij een sessie.
  const d0 = new Date(m.ts * 1000), short = `${cap(fmtDayLong(m.ts).slice(0, 3))} ${d0.getDate()} ${d0.toLocaleDateString('nl-NL', { month: 'long' }).slice(0, 3)}`;
  $('#page-title').innerHTML = `<span class="t-long">${cap(fmtDayLong(m.ts))}</span><span class="t-short" aria-hidden="true">${short}</span>`;
  const prev = DATA.matches[idx - 1], next = DATA.matches[idx + 1];
  $('#m-titlebar').querySelectorAll('.ss-nav').forEach(a => a.remove());
  $('#page-title').insertAdjacentHTML('beforebegin', navArrow('prev', prev && matchHref(prev), prev ? `Vorige wedstrijd: ${prev.opponent.name}` : ''));
  $('#page-title').insertAdjacentHTML('afterend', navArrow('next', next && matchHref(next), next ? `Volgende wedstrijd: ${next.opponent.name}` : ''));
  if (!$('#m-visual .hh-stadium')) $('#m-visual').insertAdjacentHTML('afterbegin', stadiumSvg());
  $('#m-score').innerHTML = `<div class="sl-team"><img class="own-crest" src="crest.png" alt="Frambroos" width="72" height="72"><span>Frambroos</span></div>
    <div class="sl-score"><span>${m.goals}–${m.goalsAgainst}</span><span class="pill ${m.result}">${m.result === 'W' ? 'Gewonnen' : m.result === 'L' ? 'Verloren' : 'Gelijk'}</span></div>
    <div class="sl-team">${oppBadge(m.opponent)}<span>${esc(m.opponent.name)}</span></div>`;
  // De tegenstander in woorden: hoeveel mensen er speelden, staat al in het veld.
  const diff = m.opponent.skillRating && own ? m.opponent.skillRating - own : null;
  $('#m-meta').textContent = [diff === null ? '' : diff >= 100 ? 'Sterkere tegenstander' : diff <= -100 ? 'Zwakkere tegenstander' : 'Gelijkwaardige tegenstander', m.winnerByDnf ? 'gaf op' : ''].filter(Boolean).join(' · ');
  const chain = goalChain(m);
  $('#m-goal').hidden = !chain; $('#m-goal').innerHTML = chain;
  $('#m-pitches').innerHTML = lineup(m);
  PlayerCard.reveal($('#m-pitches'));
  $('#m-h2h').innerHTML = h2h(m);
  $('#m-theirs-title').textContent = m.opponent.name;
  playerTable($('#m-ours'), m.players, true);
  playerTable($('#m-theirs'), m.opponentPlayers, false);
}

Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
