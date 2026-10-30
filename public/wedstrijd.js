// Wedstrijdpagina (een laag onder Wedstrijden): verhaal, de opstelling van beide teams op één veld, wij tegen hen en spelers van één wedstrijd.
// Adres: /wedstrijd.html?id=<matchId>. Logica van de samenvatting: docs/coach-logica.md §9.

const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const fmtDayLong = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const LINES = [['forward', 'Aanval'], ['midfielder', 'Middenveld'], ['defender', 'Verdediging'], ['goalkeeper', 'Keeper']];
const resLetter = r => r === 'D' ? 'G' : r === 'L' ? 'V' : 'W';


const side = (players, k) => players.reduce((a, p) => a + (p[k] || 0), 0);
const sideEv = (players, k) => players.some(p => p.ev) ? players.reduce((a, p) => a + (p.ev?.[k] || 0), 0) : null;

function matchSummary(m) {
  const own = DATA.snapshot?.skillRating, d = m.goals - m.goalsAgainst, parts = [];
  // 1. Uitslag, tegenstander, verwachting
  let base = m.result === 'W' ? (m.winnerByDnf ? 'Een zege doordat de tegenstander opgaf' : d >= 3 ? 'Een ruime zege' : d === 1 ? 'Een nipte zege' : 'Een verdiende zege')
    : m.result === 'D' ? (m.goals === 0 ? 'Een doelpuntloos gelijkspel' : 'Een gelijkspel')
    : d <= -3 ? 'Een zware nederlaag' : d === -1 ? 'Een nipte nederlaag' : 'Een nederlaag';
  const diff = m.opponent.skillRating && own ? m.opponent.skillRating - own : null;
  const kind = diff === null ? '' : diff >= 250 ? ', een duidelijk sterkere club' : diff >= 100 ? ', een sterkere club' : diff <= -100 ? ', een zwakkere club' : ', een gelijkwaardige club';
  let s1 = `${base} tegen ${esc(m.opponent.name)}${kind}`;
  const hOpp = m.opponentPlayers.length, hUs = m.players.length;
  if (hOpp <= 2 || hOpp >= hUs + 2) s1 += ` die met ${numWord(hOpp)} ${hOpp === 1 ? 'mens' : 'mensen'} speelde tegen jullie ${numWord(hUs)}`;
  if (m.winnerByDnf) { /* bij een opgave zegt de verwachting niets */ }
  else if (m.resid >= 1) s1 += m.result === 'W' ? ', en beter dan verwacht' : ', al was het beter dan verwacht';
  else if (m.resid <= -1) s1 += ', terwijl er meer in zat';
  parts.push(s1 + '.');
  // 2. Verloop op basis van kansen
  const sUs = side(m.players, 'shots'), sThem = side(m.opponentPlayers, 'shots');
  if (m.result === 'W' && sUs < sThem) parts.push('Jullie kregen minder kansen, maar maakten ze wel af.');
  else if (m.result === 'L' && sUs > sThem) parts.push(m.goals < sUs / 4 ? 'Jullie kregen meer kansen, maar de afwerking liet het afweten.' : 'Jullie kregen meer kansen, maar de tegenstander was effectiever.');
  else if (m.result === 'W' && sUs >= Math.max(3, sThem * 1.5)) parts.push('Jullie waren de bovenliggende partij.');
  else if (m.result === 'L' && sThem >= Math.max(3, sUs * 1.5)) parts.push('De tegenstander was duidelijk de betere ploeg.');
  else if (m.result === 'W') parts.push('Een wedstrijd die alle kanten op kon, maar jullie trokken aan het langste eind.');
  else if (m.result === 'L') parts.push('Een gelijkopgaande wedstrijd die net de verkeerde kant op viel.');
  else parts.push('Een gelijkopgaande wedstrijd zonder duidelijke winnaar.');
  // 3. Beste speler
  const best = [...m.players].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  if (best) {
    const bits = [best.goals ? `${numWord(best.goals)} ${best.goals === 1 ? 'doelpunt' : 'doelpunten'}` : '', best.assists ? `${numWord(best.assists)} ${best.assists === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean);
    parts.push(`<b>${esc(proName(best.name))}</b> was de beste man${bits.length ? `, met ${joinAnd(bits)}` : ''}${best.mom ? ', en werd man van de wedstrijd' : ''}.`);
  }
  return parts.join(' ');
}

// Opstelling (coach-logica §2, Opstelling): één veld met beide teams. Links (telefoon: boven) wij van keeper naar aanval,
// rechts de tegenstander gespiegeld, zodat de aanvallers elkaar in het midden treffen. Per linie het aantal mensen met
// naam en rating; per team het aantal AI-spelers. Per linie geeft EA geen AI, dus een lege linie heet "AI".
function lineup(m) {
  const side = (players, us) => {
    const by = Object.fromEntries(LINES.map(([k]) => [k, []]));
    for (const p of players) (by[p.pos] || by.midfielder).push(p);
    const chip = p => {
      const inner = `<b>${esc(us ? proName(p.name) : p.name)}</b><span>${p.rating === null ? '–' : f1(p.rating)}${p.mom ? ' ★' : ''}</span>`;
      return us ? `<a class="fchip us" href="spelers.html#${encodeURIComponent(p.name)}" title="${esc(archName(p.archetypeId))}">${inner}</a>` : `<span class="fchip" title="${esc(archName(p.archetypeId))}">${inner}</span>`;
    };
    // Van eigen doel naar het midden: keeper, verdediging, middenveld, aanval.
    return [...LINES].reverse().map(([k, label]) => `<div class="zone ${us ? 'us' : 'them'} z-${k}">
      <span class="zone-head"><span class="zone-label">${label}</span><span class="zone-count" title="${by[k].length} ${by[k].length === 1 ? 'mens' : 'mensen'}">${by[k].length}</span></span>
      <span class="zone-chips">${by[k].length ? by[k].map(chip).join('') : '<span class="fchip ai">AI</span>'}</span></div>`);
  };
  const head = (name, players, ai) => `<span class="fh-team"><b>${esc(name)}</b><small>${numWord(players.length)} ${players.length === 1 ? 'mens' : 'mensen'} · ${numWord(ai)} AI</small></span>`;
  const us = side(m.players, true), them = side(m.opponentPlayers, false).reverse();
  return `<div class="field-head">${head('Frambroos', m.players, m.ai.players)}${head(m.opponent.name, m.opponentPlayers, m.ai.opponentPlayers ?? Math.max(0, 11 - m.opponentPlayers.length))}</div>
    <div class="field">${us.join('')}${them.join('')}</div>`;
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
  const idx = DATA.matches.findIndex(x => x.matchId === id);
  if (idx < 0) { $('#page-title').textContent = 'Wedstrijd niet gevonden'; $('#page-sub').textContent = 'Deze wedstrijd staat niet (meer) in de data.'; $('#m-detail').hidden = true; return; }
  const m = DATA.matches[idx];
  const own = DATA.snapshot?.skillRating, kits = DATA.club.kits;
  document.title = `Frambroos tegen ${m.opponent.name} · Frambroos Coach`;
  $('#page-title').textContent = `Tegen ${m.opponent.name}`;
  $('#page-sub').textContent = `${cap(fmtDayLong(m.ts))}, ${fmtTime(m.ts)} · ${m.matchType === 'playoffMatch' ? 'playoff' : 'league'}`;
  // vorige en volgende wedstrijd, in volgorde van spelen
  const prev = DATA.matches[idx - 1], next = DATA.matches[idx + 1];
  $('#m-nav').innerHTML = `${prev ? `<a class="more-link" href="wedstrijd.html?id=${prev.matchId}">← Vorige: ${esc(prev.opponent.name)}</a>` : '<span></span>'}${next ? `<a class="more-link" href="wedstrijd.html?id=${next.matchId}">Volgende: ${esc(next.opponent.name)} →</a>` : '<span></span>'}`;
  $('#m-score').innerHTML = `<div class="sl-team">${kitShirt(kits?.home, 'Frambroos')}<span>Frambroos</span></div>
    <div class="sl-score"><span>${m.goals}–${m.goalsAgainst}</span><span class="pill ${m.result}">${m.result === 'W' ? 'Gewonnen' : m.result === 'L' ? 'Verloren' : 'Gelijk'}</span></div>
    <div class="sl-team">${kitShirt(m.opponent.kit, m.opponent.name)}<span>${esc(m.opponent.name)}</span></div>`;
  $('#m-meta').textContent = `Tegenstander rating ${m.opponent.skillRating ?? 'onbekend'}${m.opponent.skillRating && own ? ` (jullie ${own})` : ''} · mensen: jullie ${m.players.length}, zij ${m.opponentPlayers.length}${m.winnerByDnf ? ' · tegenstander gaf op' : ''}`;
  $('#m-summary').innerHTML = matchSummary(m) + goalChain(m);
  $('#m-pitches').innerHTML = lineup(m);
  $('#m-h2h').innerHTML = h2h(m);
  $('#m-theirs-title').textContent = m.opponent.name;
  playerTable($('#m-ours'), m.players, true);
  playerTable($('#m-theirs'), m.opponentPlayers, false);
}

// Terug naar de lijst: gebruik de browsergeschiedenis als we daar vandaan kwamen (filters en scrollpositie blijven), anders een gewone link.
$('#back-link').addEventListener('click', e => {
  try { if (document.referrer && new URL(document.referrer).pathname.endsWith('/wedstrijden.html') && history.length > 1) { e.preventDefault(); history.back(); } } catch {}
});
loadData().then(render).catch(showError);
