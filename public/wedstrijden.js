// Wedstrijdenpagina: één lijst van alle wedstrijden, met de beste speler per wedstrijd. Een klik opent /wedstrijd.html?id=… (een laag dieper).

let showAll = false;

function render() {
  const type = $('#type').value, res = $('#result').value;
  try { sessionStorage.setItem('matchFilters', JSON.stringify({ type, res })); } catch {}
  // Vriendschappelijk staat apart (coach-logica §9a): bij Alles erbij (tenzij het menu op league of playoff staat), anders alleen bij dat filter.
  const pool = type === 'friendlyMatch' ? DATA.friendlies : type === 'all' && getMode() === 'all' ? [...DATA.matches, ...DATA.friendlies].sort((a, b) => a.ts - b.ts) : DATA.matches;
  const list = pool.filter(m => (type === 'all' || m.matchType === type) && (res === 'all' || m.result === res));
  const own = DATA.snapshot?.skillRating, total = DATA.matches.length + (getMode() === 'all' ? DATA.friendlies.length : 0);
  $('#page-sub').textContent = list.length === total ? `${list.length} wedstrijden` : `${list.length} van ${total} wedstrijden`;
  if (!list.length && type === 'friendlyMatch') { $('#match-list').innerHTML = '<p class="empty">Nog geen vriendschappelijke wedstrijden. Speel er een, dan staat hij hier na de volgende verzamelrun.</p>'; return; }
  if (!list.length) { $('#match-list').innerHTML = '<p class="empty">Geen wedstrijden met deze filters.</p>'; return; }
  // Eén lijst, nieuwste eerst; eerst de laatste twintig, de rest achter de knop (coach-logica §9a, Wedstrijden).
  const rows = [...list].reverse(), shown = showAll ? rows : rows.slice(0, 20);
  $('#match-list').innerHTML = `<section class="card"><div class="match-rows">${shown.map(m => matchRow(m, own)).join('')}</div>
    ${rows.length > shown.length ? `<button type="button" class="more-btn" id="more-matches">Alle ${rows.length} wedstrijden</button>` : ''}</section>`;
  $('#more-matches')?.addEventListener('click', () => { showAll = true; render(); });
}

// Filters terugzetten als je via "Terug naar wedstrijden" terugkomt.
try { const f = JSON.parse(sessionStorage.getItem('matchFilters') || 'null'); if (f) { $('#type').value = f.type; $('#result').value = f.res; } } catch {}
// Oude adressen (/wedstrijden.html#<id>) doorsturen naar de wedstrijdpagina.
const legacyHash = () => { if (/^#\d+$/.test(location.hash)) location.replace(`wedstrijd.html?id=${location.hash.slice(1)}`); };
legacyHash();
addEventListener('hashchange', legacyHash);
for (const id of ['#type', '#result']) $(id).addEventListener('change', render);
loadData().then(render).catch(showError);
