// Wedstrijdenpagina: één lijst van alle wedstrijden, met de beste speler per wedstrijd. Een klik opent /wedstrijd.html?id=… (een laag dieper).

let showAll = false;

function render() {
  const type = $('#type').value, res = $('#result').value;
  try { sessionStorage.setItem('matchFilters', JSON.stringify({ type, res })); } catch {}
  const list = DATA.matches.filter(m => (type === 'all' || m.matchType === type) && (res === 'all' || m.result === res));
  const own = DATA.snapshot?.skillRating;
  $('#page-sub').textContent = list.length === DATA.matches.length ? `${list.length} wedstrijden` : `${list.length} van ${DATA.matches.length} wedstrijden`;
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
