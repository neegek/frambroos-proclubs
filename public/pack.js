// Het FUT-pack van een sessie (coach-logica §9a), gedeeld door de sessie, de sessielijst en de Club: de rangorde van
// een avond, de quote van de winnaar en de reveal-animatie. Heeft common.js, playercard.js en personas.js nodig.
const packDay = ts => { const d = new Date(ts * 1000); const t = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };

// Rol van een speler op een avond (de positie die het vaakst voorkwam) en de rolmaat die bij precies hetzelfde
// gemiddelde beslist (coach-logica §9a): aanval goals plus assists, middenveld passnauwkeurigheid, verdediging
// gewonnen tackles van de pogingen, keeper reddingen; alles per wedstrijd.
const ROLE_STATS = { forward: ['goals', 'assists'], midfielder: ['assists', 'pass', 'won'], defender: ['won', 'duels', 'pass'], goalkeeper: ['pass'] };
function roleOf(ms, name) {
  const ps = ms.map(m => m.players.find(p => p.name === name)).filter(Boolean), n = ps.length || 1, cnt = {};
  for (const p of ps) cnt[p.pos] = (cnt[p.pos] || 0) + 1;
  const role = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 'midfielder', sum = f => ps.reduce((a, p) => a + (f(p) || 0), 0);
  const ratio = (a, b) => b ? a / b : 0;
  const tb = role === 'forward' ? (sum(p => p.goals) + sum(p => p.assists)) / n : role === 'defender' ? ratio(sum(p => p.tacklesMade), sum(p => p.tackleAttempts))
    : role === 'goalkeeper' ? sum(p => p.saves) / n : ratio(sum(p => p.passesMade), sum(p => p.passAttempts));
  return { role, tb };
}


// De spelers van een avond op volgorde (coach-logica §9a): exact gemiddelde, bij gelijk de rolmaat, dan een gedeelde plek.
function sessionRanking(ms) {
  const names = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  const list = names.map(name => { const rs = ms.map(m => m.players.find(p => p.name === name)).filter(Boolean);
    return { name, n: rs.length, rH: avg(rs.map(p => p.rating).filter(v => v !== null)), ...roleOf(ms, name) }; })
    .sort((x, y) => (y.rH ?? -1) - (x.rH ?? -1) || y.tb - x.tb);
  list.forEach((r, i) => { const p = list[i - 1]; r.place = p && p.rH === r.rH && p.tb === r.tb ? p.place : i + 1; });
  return list;
}

// De quote van een avond (coach-logica §9, Sessie): de beste speler (hoogste gemiddelde rating) over de statistiek die
// die avond het meest uitstak, in de eigen stem (personas.js). Elke sessie een nieuwe: komt dezelfde speler met dezelfde
// maat terug, dan de volgende variant.
const QUOTES = new Map();
function sessionQuote(sess) {
  if (QUOTES.has(sess.id)) return QUOTES.get(sess.id);
  const used = new Map();
  for (const x of sessionsOf(DATA.matches)) {
    const names = [...new Set(x.matches.flatMap(m => m.players.map(p => p.name)))];
    const rowsOf = (list, n) => list.map(m => ({ m, p: m.players.find(p => p.name === n) })).filter(r => r.p);
    const best = names.map(n => ({ n, r: avg(rowsOf(x.matches, n).map(r => r.p.rating).filter(v => v !== null)) }))
      .filter(b => b.r !== null).sort((a, b) => b.r - a.r)[0];
    let q = null;
    if (best) {
      const stat = standoutStat(rowsOf(x.matches, best.n), rowsOf(DATA.matches.filter(m => m.session !== x.id), best.n));
      const k = `${best.n}|${stat.key}`, i = used.get(k) || 0; used.set(k, i + 1);
      q = { text: quoteFor(best.n, stat, i), who: proName(best.n), stat: stat.key };
      // Eén keer per maand een uitspraak uit de maandbank (personas.js), bij de eerste avond van die maand dat die speler wint.
      const month = `${best.n}|${new Date(x.matches[0].ts * 1000).toISOString().slice(0, 7)}`, bank = PERSONAS[best.n]?.maand;
      if (bank?.length && !used.has(month)) { used.set(month, 1); q.text = bank[(used.get(`${best.n}|maand`) || 0) % bank.length]; used.set(`${best.n}|maand`, (used.get(`${best.n}|maand`) || 0) + 1); }
    }
    QUOTES.set(x.id, q);
  }
  return QUOTES.get(sess.id);
}


// ---------- reveal van het pack (coach-logica §9a) ----------
// TIJDELIJK (Jamal, 3 november 2026): deze sessie speelt de reveal bij elke verversing, om de animatie te testen.
// Weghalen (null) zodra het pack goed is.
const REVEAL_TEST = '2026-10-26';
// De nieuwste sessie, als die klaar is en deze kijker hem nog niet zag: een pack in clubkleuren; een tik opent het,
// daarna komen drie, twee en één tevoorschijn, met als laatste de quote van de winnaar. Overslaan kan altijd.
function playReveal(s, top, quote, { peek = false } = {}) {
  if (!top.length || document.querySelector('.pack-reveal')) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card = (r, i) => `<span class="pr-card p${i + 1}" style="--d:${[1.1, 0.55, 0][i]}s">${PlayerCard.tiny(r.name, { session: s.id, rank: r.place, label: proName(r.name), value: f1(r.rH), key: '-r' })}</span>`;
  const el = document.createElement('div');
  el.className = `pack-reveal${still ? ' still' : ''}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Pack van ${packDay(s.matches[0].ts)}`);
  el.innerHTML = `<div class="pr-rays" aria-hidden="true"></div><div class="pr-flash" aria-hidden="true"></div>
    <button type="button" class="pr-skip">Overslaan</button>
    <div class="pr-stage">
      <button type="button" class="pr-pack" aria-label="Open het pack"><span class="pr-foil" aria-hidden="true"></span><img src="crest.png" alt=""><b>Frambroos</b><small>${esc(packDay(s.matches[0].ts))}</small><em>Tik om te openen</em></button>
      <div class="pr-cards">${[1, 0, 2].filter(i => top[i]).map(i => card(top[i], i)).join('')}</div>
      ${quote ? `<blockquote class="pr-quote">„${esc(quote.text)}” <cite>— ${esc(quote.who)}</cite></blockquote>` : ''}
      <button type="button" class="pr-done">Bekijk de avond</button>
    </div>`;
  document.body.append(el);
  document.documentElement.classList.add('pr-open');
  PlayerCard.reveal(el);
  const mark = () => { if (!peek) markRevealed(s); }; // een kijkje tijdens de avond telt niet als geopend
  const close = () => { mark(); el.classList.add('out'); document.documentElement.classList.remove('pr-open'); setTimeout(() => { el.remove(); dispatchEvent(new Event('pack-closed')); }, still ? 0 : 350); };
  const open = () => { if (el.classList.contains('opening') || el.classList.contains('open')) return; mark(); el.classList.add('opening'); setTimeout(() => el.classList.replace('opening', 'open'), still ? 0 : 900); };
  el.querySelector('.pr-pack').addEventListener('click', open);
  el.querySelector('.pr-skip').addEventListener('click', close);
  el.querySelector('.pr-done').addEventListener('click', close);
  addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && el.isConnected) { close(); removeEventListener('keydown', esc); } });
  el.querySelector('.pr-pack').focus();
}


// Het pack met de hand openen (coach-logica §9a): op de sessielijst en de Club staat bij een sessie die nog dicht is
// (of de testsessie) een knop; een tik speelt de reveal op dezelfde pagina, zonder te navigeren.
const packReady = (s, all) => revealPending(s, all) || s.key === REVEAL_TEST;
function openPack(key) {
  const s = sessionsOf(DATA.matches).find(x => x.key === key); if (!s) return;
  playReveal(s, sessionRanking(s.matches).filter(r => r.rH !== null).slice(0, 3), sessionQuote(s));
}
// Vasthoudknop (coach-logica §9a): rechtsboven in de sessiekop, op de plek van "volgende sessie" bij de nieuwste
// sessie. Even ingedrukt houden (0,7 s, een ring loopt vol) opent het pack; ook als de avond nog bezig is, dan als
// kijkje met de stand tot nu, zonder dat de echte reveal na afloop verdwijnt. Een korte tik zegt hoe het werkt.
const HOLD_MS = 700;
const packHoldBtn = s => `<button type="button" class="ss-nav next ss-pack" data-hold="${s.key}" aria-label="Pack openen: houd ingedrukt" title="Houd ingedrukt om het pack te openen">
  <svg class="ss-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5"/></svg>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l1 18H5z"/><path d="M8.5 9.5l3.5 2.5 3.5-2.5"/></svg></button>`;
function holdOpen(btn) {
  const s = sessionsOf(DATA.matches).find(x => x.key === btn.dataset.hold); if (!s) return;
  playReveal(s, sessionRanking(s.matches).filter(r => r.rH !== null).slice(0, 3), sessionQuote(s), { peek: sessionLive(s) });
}
{
  let timer = null, btn = null, done = false;
  const stop = () => { clearTimeout(timer); timer = null; btn?.classList.remove('holding'); };
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-hold]'); if (!b || e.button > 0) return;
    btn = b; done = false; b.classList.add('holding');
    timer = setTimeout(() => { done = true; stop(); navigator.vibrate?.(30); holdOpen(b); }, HOLD_MS);
  });
  for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, stop, true);
  document.addEventListener('pointerleave', e => { if (e.target === btn) stop(); }, true); // van de knop af geschoven
  document.addEventListener('contextmenu', e => { if (e.target.closest('[data-hold]')) e.preventDefault(); }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-hold]'); if (!b) return; e.preventDefault();
    if (e.detail === 0) return holdOpen(b); // toetsenbord (Enter of spatie): meteen open
    if (!done && typeof toast === 'function') toast('Houd ingedrukt om het pack te openen');
  });
}
document.addEventListener('keydown', e => { const t = (e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-pack]'); if (t) { e.preventDefault(); openPack(t.dataset.pack); } }, true);
document.addEventListener('click', e => { const t = e.target.closest('[data-pack]'); if (!t) return; e.preventDefault(); e.stopPropagation(); openPack(t.dataset.pack); }, true);

// Eén sessiekaart (coach-logica §9a, Sessies), gedeeld door de sessielijst en de Club (op telefoon). kicker: een klein
// label bovenaan, zoals "Laatste sessie".
const CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const PERSON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c.6-4.4 3.9-7 8-7s7.4 2.6 8 7z"/></svg>';

const ppgOf = list => list.length ? (3 * list.filter(m => m.result === 'W').length + list.filter(m => m.result === 'D').length) / list.length : null;
function sessionCardHtml(s, sessions, { kicker = '' } = {}) {
    const ms = s.matches, sm = summarize(ms), ppg = ppgOf(ms); // punten per wedstrijd alleen voor de kleur van het kopvlak
    const tone = ppg >= 2 ? 'good' : ppg < 1 ? 'bad' : '';
    const team = avg(ms.flatMap(m => m.players.map(p => p.rating)).filter(v => v !== null));
    const live = sessionLive(s), pending = !live && packReady(s, sessions);
    const mvp = live || pending ? null : bestOfNight(ms), photo = mvp && PlayerCard.portrait(mvp.n); // rondje: altijd het portret; rand en achtergrond volgen de vorm
    const sealed = live ? `<span class="scard-pack live"><span class="pack-mini" aria-hidden="true"></span><span><b>Bezig</b><small>Het pack gaat open als de avond klaar is</small></span></span>`
      : pending ? `<span class="scard-pack ready" role="button" tabindex="0" data-pack="${s.key}"><span class="pack-mini" aria-hidden="true"></span><span><b>Pack staat klaar</b><small>Tik om het te openen</small></span><span class="scard-pack-btn">Openen</span></span>` : '';
    return `<a class="scard ${tone}${live ? ' is-live' : ''}${pending ? ' is-ready' : ''}" href="${sessionHref(s)}">
      <span class="scard-top">
        <span class="scard-head">${kicker ? `<span class="scard-kicker">${kicker}</span>` : ''}<span class="scard-date">${CAL}${packDay(ms[0].ts)}</span></span>
        <span class="scard-main">
          <span class="scard-record"><b>${sm.W}-${sm.D}-${sm.L}</b><small>W-G-V</small></span>
          <span class="scard-figs"><span><b>${sm.gf}</b><small>Goals</small></span><span><b>${team === null ? '–' : f1(team)}</b><small>Team rating</small></span></span>
        </span>
      </span>
      <span class="scard-line" aria-label="Uitslagen op volgorde">${ms.map(m => `<span class="tl-item" title="${esc(m.opponent.name)}"><span class="tl-dot ${m.result}">${letter(m.result)}</span>${oppBadge(m.opponent)}<b>${m.goals}-${m.goalsAgainst}</b></span>`).join('')}</span>
      ${sealed}
      ${mvp ? `<span class="scard-mvp"><span class="mvp-avatar" data-tier="${PlayerCard.sessionTier(mvp.n, s.id).tier}">${photo ? `<img class="fade-img" src="${photo}" alt="">` : PERSON}</span><span class="mvp-who"><small>Speler van de sessie</small><b>${esc(proName(mvp.n))}</b></span><span class="mvp-stats"><b>${f1(mvp.v)}</b><small>${mvp.g} G · ${mvp.a} A${mvp.mom ? ` · ${mvp.mom}× MOTM` : ''}</small></span></span>` : ''}
    </a>`;
}
