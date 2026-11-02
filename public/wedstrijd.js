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
const LINE_KEY = { forward: 'a', midfielder: 'm', defender: 'd', goalkeeper: 'g' };
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
  // Geen teamnamen of aantallen in het veld: die staan in de kop en zie je aan de rondjes. Lijnen van een echt veld:
  // de middencirkel in het middenveld, het strafschopgebied en het doel bij de keeper (css).
  return `<div class="pitch">
    ${LINES.map(([k, label]) => `<div class="prow l-${LINE_KEY[k]}"><div class="pside us">${toks(us[k], true)}</div><span class="prow-label">${label}</span><div class="pside them">${toks(them[k], false)}</div></div>`).join('')}
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

// Spelers van beide kanten (coach-logica §9a, Wedstrijdpagina): per cijfer één lijst met iedereen, wij blauw en zij
// oranje, en onderaan beide ploegen. Zelfde kaartjes als op het Clubhouse en bij een sessie (rankCards).
function playerCards(m) {
  const all = [...m.players.map(p => ({ p, us: true })), ...m.opponentPlayers.map(p => ({ p, us: false }))];
  const ev = (p, k) => p.ev?.[k] ?? 0, pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : '–';
  const side = us => all.filter(x => x.us === us).map(x => x.p);
  const teams = (main, small) => [[true, 'Frambroos'], [false, m.opponent.name]].map(([us, label]) => ({ label, cls: us ? 'us' : 'them', main: main(side(us)), small: small ? small(side(us)) : '' }));
  const sum = (ps, f) => ps.reduce((a, p) => a + (f(p) || 0), 0);
  const who = 'Alle menselijke spelers van beide kanten; AI-spelers staan niet in de data.';
  const card = (key, label, about, v, main, small, team, lower = false) => ({ key, label, about, who,
    rows: all.map(x => ({ x, v: v(x.p) })).filter(r => r.v !== null).sort((a, b) => lower ? a.v - b.v : b.v - a.v)
      .map(({ x }) => ({ name: x.us ? x.p.name : x.p.name, cls: x.us ? 'us' : 'them', main: main(x.p), small: small ? small(x.p) : '' })),
    teams: team });
  return [
    card('m-rating', 'Rating', 'De matchrating die EA na de wedstrijd gaf.', p => p.rating, p => f1(p.rating), null,
      teams(ps => { const r = ps.map(p => p.rating).filter(v => v !== null); return r.length ? f1(avg(r)) : '–'; })),
    card('m-goals', 'Goals', 'Doelpunten. Bij de ploegen de stand: ook goals van AI tellen mee.', p => p.goals, p => String(p.goals), null,
      [{ label: 'Frambroos', cls: 'us', main: String(m.goals) }, { label: m.opponent.name, cls: 'them', main: String(m.goalsAgainst) }]),
    card('m-assists', 'Assists', 'De laatste pass voor een doelpunt.', p => p.assists, p => String(p.assists), null, teams(ps => String(sum(ps, p => p.assists)))),
    card('m-conv', 'Conversie', 'Goals per schot, met klein het aantal schoten.', p => p.shots ? p.goals / p.shots : null, p => pct(p.goals, p.shots), p => `${p.shots} schoten`,
      teams(ps => pct(sum(ps, p => p.goals), sum(ps, p => p.shots)), ps => `${sum(ps, p => p.shots)} schoten`)),
    card('m-pass', 'Passes', 'Geslaagde passes van alle passes, met klein het aantal gelukte passes.', p => p.passAttempts ? p.passesMade / p.passAttempts : null, p => pct(p.passesMade, p.passAttempts), p => `${p.passesMade} passes`,
      teams(ps => pct(sum(ps, p => p.passesMade), sum(ps, p => p.passAttempts)), ps => `${sum(ps, p => p.passesMade)} passes`)),
    card('m-drib', 'Dribbels', 'Geslaagde dribbels, met klein hoeveel tegenstanders voorbij werden gespeeld.', p => p.ev ? ev(p, 'dribbles_completed') : null, p => String(ev(p, 'dribbles_completed')), p => `${ev(p, 'players_beaten')} uitgespeeld`,
      teams(ps => String(sum(ps, p => ev(p, 'dribbles_completed'))), ps => `${sum(ps, p => ev(p, 'players_beaten'))} uitgespeeld`)),
    card('m-won', 'Balwinst', 'Hoe vaak iemand de bal veroverde.', p => p.ev ? ev(p, 'possession_won') : null, p => String(ev(p, 'possession_won')), null, teams(ps => String(sum(ps, p => ev(p, 'possession_won'))))),
    card('m-tackles', 'Tackles gewonnen', 'Gewonnen tackles, met klein het aantal pogingen.', p => p.tacklesMade, p => String(p.tacklesMade), p => `van ${p.tackleAttempts}`,
      teams(ps => String(sum(ps, p => p.tacklesMade)), ps => `van ${sum(ps, p => p.tackleAttempts)}`)),
    card('m-lost', 'Balverlies', 'Hoe vaak iemand de bal kwijtraakte; hier staat wie het minst verloor bovenaan.', p => p.ev ? ev(p, 'possession_lost') : null, p => String(ev(p, 'possession_lost')), null,
      teams(ps => String(sum(ps, p => ev(p, 'possession_lost')))), true),
  ];
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
  $('#m-pitches').innerHTML = lineup(m);
  PlayerCard.reveal($('#m-pitches'));
  $('#m-h2h').innerHTML = h2h(m);
  rankCards($('#m-players'), playerCards(m));
}

Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
