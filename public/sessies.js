// Sessies: een overzicht met een kaart per speelavond; een tik opent die avond op sessie.html?id=<id>.
// Een sessie is een reeks wedstrijden met minder dan 3 uur ertussen (SESSION_GAP in common.js).

const WEEKDAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const longDate = ts => { const d = new Date(ts * 1000); return `${WEEKDAY_LONG[d.getDay()]} ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

let sessions = [];
// Overzicht (coach-logica §9a, Sessies): per avond één kaart met datum, uitslag, twee cijfers (goals, team rating), de tijdlijn en de
// speler van de sessie. Een tik opent de avond. De kleur van het kopvlak volgt de avond.
function renderCards() {
  $('#page-sub').textContent = `${sessions.length} ${sessions.length === 1 ? 'speelavond' : 'speelavonden'}, nieuwste eerst.`;
  $('#session-cards').innerHTML = [...sessions].reverse().map(s => sessionCardHtml(s, sessions)).join('');
}

// Oude adressen (sessies.html#<id>) doorsturen naar de sessiepagina.
const legacyHash = () => { if (/^#\d+$/.test(location.hash)) location.replace(`sessie.html?id=${location.hash.slice(1)}`); };
legacyHash();
addEventListener('hashchange', legacyHash);
window.rerender = () => { renderCards(); PlayerCard.reveal($('#session-cards')); };
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(() => { sessions = sessionsOf(DATA.matches); renderCards(); PlayerCard.reveal($('#session-cards')); packOnLoad(); }).catch(showError);
