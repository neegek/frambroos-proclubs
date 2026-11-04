// Wedstrijdpagina (een laag onder Wedstrijden): verhaal, de opstelling van beide teams op één veld, wij tegen hen en spelers van één wedstrijd.
// Adres: wedstrijd.html?id=<datum>-<tegenstander>. Logica van de samenvatting: docs/coach-logica.md §9.

const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const fmtDayLong = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const LINES = [['forward', 'Aanval'], ['midfielder', 'Middenveld'], ['defender', 'Verdediging'], ['goalkeeper', 'Keeper']];
const resLetter = r => r === 'D' ? 'G' : r === 'L' ? 'V' : 'W';


const side = (players, k) => players.reduce((a, p) => a + (p[k] || 0), 0);
const sideEv = (players, k) => players.some(p => p.ev) ? players.reduce((a, p) => a + (p.ev?.[k] || 0), 0) : null;

// Opstelling (coach-logica §9a, Opstelling): één veld met per linie wij links en de tegenstander rechts.
// Elke speler is een rondje met de rating eronder: bij ons het portret, bij de tegenstander het archetype-icoon.
// AI per linie geeft EA niet, dus een lege linie heet "AI".
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
  // Eén veld (coach-logica §9a, Opstelling): onder ons doel, boven het doel waar we op aanvallen. Per linie één rij:
  // links wij, rechts de tegenstander, in het midden het label; zo vergelijk je per linie van links naar rechts.
  // Het veld is twaalf banen hoog; de lijnen (strafschopgebieden, middenlijn) vallen precies op de baangrenzen.
  const rows = LINES.map(([k, label]) => `<div class="frow l-${LINE_KEY[k]}"><div class="fs us">${toks(us[k], true)}</div><span class="flabel">${label}</span><div class="fs them">${toks(them[k], false)}</div></div>`);
  const marks = ['pm-half', 'pm-circle', 'pm-spot', ...['top', 'bot'].flatMap(e => [`pm-box ${e}`, `pm-six ${e}`, `pm-goal ${e}`, `pm-pen ${e}`, `pm-arc ${e}`])]
    .map(c => `<span class="${c}" aria-hidden="true"></span>`).join('');
  return `<div class="pfield" role="img" aria-label="Opstelling per linie: Frambroos links, ${esc(m.opponent.name)} rechts">${marks}${rows.join('')}</div>`;
}

// Wij tegen hen (coach-logica §9a, Wedstrijdpagina): per cijfer één regel met het totaal van beide kanten en een
// verdeelde balk; een tik klapt de regel open met iedereen van beide kanten als balkjes (wij blauw, zij oranje),
// de beste bovenaan. Zo vergelijk je per cijfer zowel de ploegen als de spelers. Nieuwe cijfers: één regel in VS_STATS.
const VS_STATS = [
  { key: 'rating', label: 'Rating', p: p => p.rating, team: ps => { const r = ps.map(p => p.rating).filter(v => v !== null); return r.length ? avg(r) : null; }, fmt: v => f1(v) },
  { key: 'goals', label: 'Goals', p: p => p.goals, teamUs: m => m.goals, teamThem: m => m.goalsAgainst },
  { key: 'assists', label: 'Assists', p: p => p.assists },
  { key: 'shots', label: 'Schoten', p: p => p.shots },
  { key: 'pass', label: 'Passnauwkeurigheid', p: p => p.passAttempts ? 100 * p.passesMade / p.passAttempts : null, team: ps => { const a = side(ps, 'passAttempts'); return a ? 100 * side(ps, 'passesMade') / a : null; }, fmt: v => `${Math.round(v)}%` },
  { key: 'drib', label: 'Dribbels', ev: 'dribbles_completed' },
  { key: 'won', label: 'Balwinst', ev: 'possession_won' },
  { key: 'tackles', label: 'Tackles gewonnen', p: p => p.tacklesMade },
  { key: 'inter', label: 'Onderscheppingen', ev: 'interceptions' },
  { key: 'lost', label: 'Balverlies', ev: 'possession_lost', lower: true },
  { key: 'fouls', label: 'Overtredingen', ev: 'fouls_conceded_total', lower: true },
];
function h2h(m) {
  const us = m.players, them = m.opponentPlayers;
  const val = (st, p) => st.ev ? (p.ev ? p.ev[st.ev] ?? 0 : null) : st.p(p);
  const team = (st, ps, mine) => mine && st.teamUs ? st.teamUs(m) : !mine && st.teamThem ? st.teamThem(m) : st.team ? st.team(ps) : st.ev ? sideEv(ps, st.ev) : ps.reduce((a, p) => a + (st.p(p) || 0), 0);
  const fmt = (st, v) => v === null || v === undefined ? '–' : st.fmt ? st.fmt(v) : String(Math.round(v * 10) / 10);
  return `<div class="vs-legend"><span class="us">Frambroos</span><span class="them">${esc(m.opponent.name)}</span></div>
    <div class="vs-list">${VS_STATS.map((st, i) => {
      const a = team(st, us, true), b = team(st, them, false); if (a === null && b === null) return '';
      const tot = (a || 0) + (b || 0), wa = tot ? 100 * (a || 0) / tot : 50, better = a === b || a === null || b === null ? 0 : (st.lower ? a < b : a > b) ? 1 : -1;
      const people = [...us.map(p => ({ p, us: true })), ...them.map(p => ({ p, us: false }))].map(x => ({ ...x, v: val(st, x.p) })).filter(x => x.v !== null)
        .sort((x, y) => st.lower ? x.v - y.v : y.v - x.v);
      const max = Math.max(...people.map(x => x.v), 0.0001);
      return `<div class="vs-item${i === 0 ? ' open' : ''}">
        <button type="button" class="vs-row" aria-expanded="${i === 0}"><span class="vs-val ${better > 0 ? 'lead' : ''}">${fmt(st, a)}</span>
          <span class="vs-mid"><span class="vs-label">${st.label}${st.lower ? ' <small>minder is beter</small>' : ''}</span><span class="vs-split"><i style="width:${wa}%"></i><i style="width:${100 - wa}%"></i></span></span>
          <span class="vs-val ${better < 0 ? 'lead' : ''}">${fmt(st, b)}</span></button>
        <div class="vs-detail">${people.map(x => `<div class="vs-p ${x.us ? 'us' : 'them'}"><span class="vs-name">${esc(x.us ? proName(x.p.name) : x.p.name)}</span><span class="vs-track"><i style="width:${Math.max(2, 100 * x.v / max)}%"></i></span><b>${fmt(st, x.v)}</b></div>`).join('') || '<p class="empty">Geen gegevens van EA.</p>'}</div>
      </div>`; }).join('')}</div>`;
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


const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function render() {
  const id = new URLSearchParams(location.search).get('id');
  // Adres: wedstrijd.html?id=2026-11-01-war-team (datum en tegenstander); een oud adres met het EA-nummer werkt ook nog.
  // Vriendschappelijk heeft een eigen lijst (DATA.friendlies); vorige en volgende blijven binnen die lijst.
  const find = list => list.findIndex(x => x.slug === id || x.matchId === id);
  const pool = find(DATA.matches) >= 0 ? DATA.matches : DATA.friendlies, idx = find(pool);
  if (idx < 0) { $('#m-detail').innerHTML = '<header class="page-head"><div><h1>Wedstrijd niet gevonden</h1><p class="sub">Deze wedstrijd staat niet (meer) in de data.</p></div></header>'; return; }
  const m = pool[idx];
  if (id !== m.slug) history.replaceState(null, '', matchHref(m)); // altijd het leesbare adres
  const own = DATA.snapshot?.skillRating, kits = DATA.club.kits;
  document.title = `Frambroos tegen ${m.opponent.name} · Frambroos Coach`;
  // Kop (coach-logica §9a, Wedstrijdpagina): de dag met de ronde pijltjes naar de vorige en volgende wedstrijd, zoals bij een sessie.
  const d0 = new Date(m.ts * 1000), short = `${cap(fmtDayLong(m.ts).slice(0, 3))} ${d0.getDate()} ${d0.toLocaleDateString('nl-NL', { month: 'long' }).slice(0, 3)}`;
  $('#page-title').innerHTML = `<span class="t-long">${cap(fmtDayLong(m.ts))}</span><span class="t-short" aria-hidden="true">${short}</span>`;
  const prev = pool[idx - 1], next = pool[idx + 1];
  $('#m-titlebar').querySelectorAll('.ss-nav').forEach(a => a.remove());
  $('#page-title').insertAdjacentHTML('beforebegin', navArrow('prev', prev && matchHref(prev), prev ? `Vorige wedstrijd: ${prev.opponent.name}` : ''));
  $('#page-title').insertAdjacentHTML('afterend', navArrow('next', next && matchHref(next), next ? `Volgende wedstrijd: ${next.opponent.name}` : ''));
  if (!$('#m-visual .hh-stadium')) $('#m-visual').insertAdjacentHTML('afterbegin', stadiumSvg());
  $('#m-score').innerHTML = `<div class="sl-team"><img class="own-crest" src="crest.png" alt="Frambroos" width="72" height="72"><span>Frambroos</span></div>
    <div class="sl-score"><span>${m.goals}–${m.goalsAgainst}</span><span class="pill ${m.result}">${m.result === 'W' ? 'Gewonnen' : m.result === 'L' ? 'Verloren' : 'Gelijk'}</span></div>
    <div class="sl-team">${oppBadge(m.opponent)}<span>${esc(m.opponent.name)}</span></div>`;
  // De tegenstander in woorden: hoeveel mensen er speelden, staat al in het veld.
  const diff = gapOf(m, own);
  $('#m-meta').textContent = [diff === null ? '' : diff >= 100 ? 'Sterkere tegenstander' : diff <= -100 ? 'Zwakkere tegenstander' : 'Gelijkwaardige tegenstander', m.winnerByDnf ? 'gaf op' : ''].filter(Boolean).join(' · ');
  $('#m-pitches').innerHTML = lineup(m);
  PlayerCard.reveal($('#m-pitches'));
  // In het kort (coach-logica §9): alleen voor league en playoff; vriendschappelijk telt nergens mee.
  $('#m-kort-card').hidden = pool !== DATA.matches;
  if (pool === DATA.matches) $('#m-kort').innerHTML = takeawaysHtml(takeaways([m], DATA.matches.filter(x => x !== m), own));
  $('#m-h2h').innerHTML = h2h(m);
  for (const b of $('#m-h2h').querySelectorAll('.vs-row')) b.addEventListener('click', () => { const it = b.parentElement, open = !it.classList.contains('open'); it.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open)); });
}

Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(render).catch(showError);
