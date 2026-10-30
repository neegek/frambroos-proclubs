// Sessies: een overzicht met een kaart per speelavond; een tik opent die avond op sessie.html?id=<id>.
// Een sessie is een reeks wedstrijden met minder dan 3 uur ertussen (SESSION_GAP in common.js).

const WEEKDAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const longDate = ts => { const d = new Date(ts * 1000); return `${WEEKDAY_LONG[d.getDay()]} ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

let sessions = [];
const CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const PERSON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c.6-4.4 3.9-7 8-7s7.4 2.6 8 7z"/></svg>';

// Overzicht (coach-logica §9a, Sessies): per avond één kaart met datum, uitslag, twee cijfers (goals, team rating), de tijdlijn en de
// speler van de sessie. Een tik opent de avond. De kleur van het kopvlak volgt de avond.
function renderCards() {
  const ppgOf = list => list.length ? (3 * list.filter(m => m.result === 'W').length + list.filter(m => m.result === 'D').length) / list.length : null;
  $('#page-sub').textContent = `${sessions.length} ${sessions.length === 1 ? 'speelavond' : 'speelavonden'}, nieuwste eerst.`;
  $('#session-cards').innerHTML = [...sessions].reverse().map(s => {
    const ms = s.matches, sm = summarize(ms), ppg = ppgOf(ms); // punten per wedstrijd alleen voor de kleur van het kopvlak
    const tone = ppg >= 2 ? 'good' : ppg < 1 ? 'bad' : '';
    const team = avg(ms.flatMap(m => m.players.map(p => p.rating)).filter(v => v !== null));
    const mvp = bestOfNight(ms), photo = mvp && PlayerCard.portrait(mvp.n); // rondje: altijd het portret; rand en achtergrond volgen de vorm
    return `<a class="scard ${tone}" href="sessie.html?id=${s.id}">
      <span class="scard-top">
        <span class="scard-head"><span class="scard-date">${CAL}${cap(longDate(ms[0].ts))}</span></span>
        <span class="scard-main">
          <span class="scard-record"><b>${sm.W}-${sm.D}-${sm.L}</b><small>W-G-V</small></span>
          <span class="scard-figs"><span><b>${sm.gf}</b><small>Goals</small></span><span><b>${team === null ? '–' : f1(team)}</b><small>Team rating</small></span></span>
        </span>
      </span>
      <span class="scard-line" aria-label="Uitslagen op volgorde">${ms.map(m => `<span class="tl-item" title="${esc(m.opponent.name)}"><span class="tl-dot ${m.result}">${letter(m.result)}</span>${kitShirt(m.opponent.kit, m.opponent.name)}<b>${m.goals}-${m.goalsAgainst}</b></span>`).join('')}</span>
      ${mvp ? `<span class="scard-mvp"><span class="mvp-avatar" data-tier="${PlayerCard.sessionTier(mvp.n, s.id).tier}">${photo ? `<img class="fade-img" src="${photo}" alt="">` : PERSON}</span><span class="mvp-who"><small>Speler van de sessie</small><b>${esc(proName(mvp.n))}</b></span><span class="mvp-stats"><b>${f1(mvp.v)}</b><small>${mvp.g} G · ${mvp.a} A${mvp.mom ? ` · ${mvp.mom}× MOTM` : ''}</small></span></span>` : ''}
    </a>`;
  }).join('');
}

// Oude adressen (sessies.html#<id>) doorsturen naar de sessiepagina.
const legacyHash = () => { if (/^#\d+$/.test(location.hash)) location.replace(`sessie.html?id=${location.hash.slice(1)}`); };
legacyHash();
addEventListener('hashchange', legacyHash);
window.rerender = () => { renderCards(); PlayerCard.reveal($('#session-cards')); };
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(() => { sessions = sessionsOf(DATA.matches); renderCards(); PlayerCard.reveal($('#session-cards')); }).catch(showError);
