// Rivalen (coach-logica §9a, Rivalen): eerst *Waar we verliezen* (winst per kenmerk van de tegenstander), dan elke club
// waar we vaker dan één keer tegen speelden; een tik opent de onderlinge stand in #rival-dialog.

const pctOf = list => list.length ? 100 * list.filter(m => m.result === 'W').length / list.length : null;
const posCount = (m, pos) => m.opponentPlayers.filter(p => p.pos === pos).length;

// Kenmerken: alleen wat EA geeft (mensen en hun ingestelde positie, skill rating). tip = één praktische zin.
const TRAITS = [
  { key: 'more', label: 'Meer mensen dan wij', phrase: 'meer mensen dan wij', test: m => m.opponentPlayers.length > m.players.length, tip: 'Korter en sneller spelen; niet blijven dribbelen in een vol veld.' },
  { key: 'fewer', label: 'Minder mensen dan wij', phrase: 'minder mensen dan wij', test: m => m.opponentPlayers.length < m.players.length, tip: 'Tegen AI de bal laten rondgaan tot er een mens uit positie staat.' },
  { key: 'gk', label: 'Een menselijke keeper', phrase: 'een menselijke keeper', test: m => posCount(m, 'goalkeeper') > 0, tip: 'Laag en in de hoek afronden, niet hard op de keeper.' },
  { key: 'def', label: 'Een menselijke verdediger', phrase: 'een menselijke verdediger', test: m => posCount(m, 'defender') > 0, tip: 'De steekpass wordt gelezen: eerst combineren, de bal ook naar de flank laten lopen.' },
  { key: 'fwd', label: 'Twee of meer menselijke aanvallers', phrase: 'twee of meer menselijke aanvallers', test: m => posCount(m, 'forward') >= 2, tip: 'Eén middenvelder blijft achter de bal; niet met z’n allen mee naar voren.' },
  { key: 'mid', label: 'Drie of meer menselijke middenvelders', phrase: 'drie of meer menselijke middenvelders', test: m => posCount(m, 'midfielder') >= 3, tip: 'Het midden zit dicht: sneller over de flank en in de diepte.' },
  { key: 'strong', label: 'Sterker volgens EA', phrase: 'een skill rating van 100 of meer boven de onze', test: (m, own) => own && m.opponent.skillRating ? m.opponent.skillRating - own >= 100 : null, tip: 'Eerst de nul houden: compacter staan, minder risico op eigen helft.' },
];
const MIN_N = 8, CLEAR = 15;

function loseAdvice() {
  const own = DATA.snapshot?.skillRating;
  const ms = DATA.matches.filter(m => m.opponent.id && m.opponentPlayers.length);
  const rows = TRAITS.map(t => {
    const known = ms.filter(m => t.test(m, own) !== null), w = known.filter(m => t.test(m, own)), wo = known.filter(m => !t.test(m, own));
    const a = pctOf(w), b = pctOf(wo);
    return { ...t, w, wo, a, b, gap: a !== null && b !== null ? a - b : null, ok: w.length >= MIN_N && wo.length >= MIN_N };
  }).filter(r => r.ok).sort((x, y) => x.gap - y.gap);
  const bad = rows.filter(r => r.gap <= -CLEAR), good = rows.filter(r => r.gap >= CLEAR).reverse(), rest = rows.filter(r => Math.abs(r.gap) < CLEAR);
  const pct = v => `${Math.round(v)}%`;
  const row = (r, tone) => `<div class="lose-row ${tone}">
      <div class="lr-head"><b>${r.label}</b><span class="lr-n">in ${r.w.length} van ${r.w.length + r.wo.length}</span></div>
      <div class="lr-bars">
        <span class="lr-bar with"><i style="width:${r.a}%"></i><em>Met</em><b>${pct(r.a)}</b></span>
        <span class="lr-bar without"><i style="width:${r.b}%"></i><em>Zonder</em><b>${pct(r.b)}</b></span>
      </div>${tone === 'bad' ? `<p class="lr-tip">${r.tip}</p>` : ''}</div>`;
  // In het kort: de twee duidelijkste, in woorden. Niets duidelijk: dat zeggen.
  const kort = bad.length
    ? `We winnen het minst tegen teams met ${bad.slice(0, 2).map(r => `${r.phrase} (${pct(r.a)} winst, zonder ${pct(r.b)})`).join(' en ')}.`
    : 'Geen kenmerk van de tegenstander maakt een duidelijk verschil: we verliezen niet van één soort team.';
  $('#lose').innerHTML = rows.length ? `<p class="lose-kort">${kort}</p>
    ${bad.slice(0, 3).map(r => row(r, 'bad')).join('')}
    ${good.length ? `<h3>Hier halen we punten</h3>${good.map(r => row(r, 'good')).join('')}` : ''}
    ${bad.length > 3 || rest.length ? `<div class="lose-rest" hidden>${bad.length > 3 ? `<h3>Ook minder winst</h3>${bad.slice(3).map(r => row(r, 'bad')).join('')}` : ''}
      ${rest.length ? `<h3>Geen duidelijk verschil</h3>${rest.map(r => row(r, '')).join('')}` : ''}</div>
      <button type="button" class="more-btn" id="lose-more" aria-expanded="false">Alle kenmerken</button>` : ''}`
    : '<p class="empty">Nog te weinig wedstrijden met bekende tegenstanders.</p>';
  $('#lose-more')?.addEventListener('click', e => {
    const box = $('.lose-rest'); box.hidden = !box.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!box.hidden)); e.currentTarget.textContent = box.hidden ? 'Alle kenmerken' : 'Minder kenmerken';
  });
}

// Rivalen: per club alle wedstrijden (alle typen), alleen bij twee of meer. Meeste wedstrijden eerst, dan de laatste.
function rivalsOf() {
  const all = [...DATA.matches, ...(getMode() === 'all' ? DATA.friendlies : [])];
  const by = new Map();
  for (const m of all) { const k = m.opponent.id || m.opponent.name; if (!k) continue; (by.get(k) || by.set(k, []).get(k)).push(m); }
  return [...by.values()].filter(l => l.length > 1).map(l => {
    l.sort((a, b) => a.ts - b.ts);
    const c = r => l.filter(m => m.result === r).length;
    return { opp: l.at(-1).opponent, list: l, W: c('W'), D: c('D'), L: c('L'), gf: l.reduce((a, m) => a + m.goals, 0), ga: l.reduce((a, m) => a + m.goalsAgainst, 0), last: l.at(-1).ts };
  }).sort((a, b) => b.list.length - a.list.length || b.last - a.last);
}

const standHtml = (r, big) => `<span class="rv-stand" aria-label="${r.W} gewonnen, ${r.D} gelijk, ${r.L} verloren">${[['W', 'W'], ['D', 'G'], ['L', 'V']].map(([k, l]) => `<b class="${k}">${r[k]}${big ? `<small>${l}</small>` : ''}</b>`).join('')}</span>`;

function renderRivals(rivals) {
  $('#rivals').innerHTML = rivals.length ? rivals.map((r, i) => `<button type="button" class="rival-row" data-i="${i}">
      <span class="rv-badge">${oppBadge(r.opp)}</span>
      <span class="rv-name"><b>${esc(r.opp.name)}</b><small>${r.list.length} wedstrijden · laatst ${esc(dayLabel(r.last))}</small></span>
      ${standHtml(r)}<span class="rv-goals">${r.gf}–${r.ga}</span></button>`).join('')
    : '<p class="empty">Nog geen club die we twee keer tegenkwamen.</p>';
  $('#rivals').onclick = e => { const b = e.target.closest('.rival-row'); if (b) openRival(rivals, +b.dataset.i); };
}

function openRival(rivals, i) {
  const r = rivals[i], d = $('#rival-dialog'), own = DATA.snapshot?.skillRating;
  const n = r.list.length, verdict = r.W > r.L ? 'We staan voor' : r.W < r.L ? 'We staan achter' : 'Gelijk opgaand';
  const by = f => [...r.list].sort((a, b) => f(b) - f(a))[0];
  const bestW = r.W ? by(m => m.result === 'W' ? m.goals - m.goalsAgainst : -99) : null, worstL = r.L ? by(m => m.result === 'L' ? m.goalsAgainst - m.goals : -99) : null;
  const humans = r.list.reduce((a, m) => a + m.opponentPlayers.length, 0) / n;
  const line = (label, m) => m ? `<li><span>${label}</span><a href="${matchHref(m)}">${m.goals}–${m.goalsAgainst} <small>${esc(dayLabel(m.ts))}</small></a></li>` : '';
  d.querySelector('.rd-body').innerHTML = `<div class="rv-top">${oppBadge(r.opp)}<div><h2 id="rv-title">${esc(r.opp.name)}</h2><small>${verdict} · ${n} wedstrijden</small></div></div>
    <div class="rv-big">${standHtml(r, true)}<span class="rv-big-goals"><b>${r.gf}–${r.ga}</b><small>goals</small></span></div>
    <ul class="rv-facts">
      ${line('Grootste winst', bestW)}${line('Zwaarste nederlaag', worstL)}
      ${r.opp.skillRating ? `<li><span>Skill rating</span><b>${r.opp.skillRating}${own ? ` <small>${r.opp.skillRating - own >= 0 ? '+' : ''}${r.opp.skillRating - own} tov ons</small>` : ''}</b></li>` : ''}
      <li><span>Mensen gemiddeld</span><b>${f1(humans)}</b></li>
    </ul>
    <h3>Alle wedstrijden</h3>
    <div class="match-rows">${[...r.list].reverse().map(m => matchRow(m, own)).join('')}</div>`;
  const step = j => rivals[j] ? { label: rivals[j].opp.name, face: oppBadge(rivals[j].opp), go: () => openRival(rivals, j) } : null;
  dialogFoot(d, matchHref(r.list.at(-1)), 'Laatste wedstrijd', { prev: step(i - 1), next: step(i + 1) });
  d.querySelector('.rd-body').scrollTop = 0;
  if (!d.open) d.showModal();
}

$('#rival-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });

function render() {
  loseAdvice();
  renderRivals(rivalsOf());
}
window.rerender = () => render();
loadData().then(render).catch(showError);
