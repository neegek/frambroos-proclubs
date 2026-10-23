// Wedstrijdenpagina: de lijst van alle wedstrijden. Een klik opent /wedstrijd.html?id=… (een laag dieper).

const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const fmtDayLong = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function render() {
  const type = $('#type').value, res = $('#result').value;
  try { sessionStorage.setItem('matchFilters', JSON.stringify({ type, res })); } catch {}
  const list = DATA.matches.filter(m => (type === 'all' || m.matchType === type) && (res === 'all' || m.result === res));
  const own = DATA.snapshot?.skillRating;
  $('#page-sub').textContent = `${list.length} van ${DATA.matches.length} wedstrijden. Klik op een wedstrijd voor het verhaal, de opstellingen en de spelers.`;
  if (!list.length) { $('#match-list').innerHTML = '<p class="empty">Geen wedstrijden met deze filters.</p>'; return; }
  const byDay = new Map();
  for (const m of [...list].reverse()) { const d = fmtDayLong(m.ts); if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(m); }
  $('#match-list').innerHTML = [...byDay].map(([day, ms]) => {
    const s = summarize(ms);
    return `<section class="card match-day"><div class="match-day-head"><h2>${cap(day)}</h2><span class="s-meta">${s.W}W ${s.D}G ${s.L}V · ${s.gf}–${s.ga}</span></div>
      <div class="match-rows">${ms.map(m => matchRow(m, own)).join('')}</div></section>`;
  }).join('');
}

// Filters terugzetten als je via "Terug naar wedstrijden" terugkomt.
try { const f = JSON.parse(sessionStorage.getItem('matchFilters') || 'null'); if (f) { $('#type').value = f.type; $('#result').value = f.res; } } catch {}
// Oude adressen (/wedstrijden.html#<id>) doorsturen naar de wedstrijdpagina.
const legacyHash = () => { if (/^#\d+$/.test(location.hash)) location.replace(`wedstrijd.html?id=${location.hash.slice(1)}`); };
legacyHash();
addEventListener('hashchange', legacyHash);
for (const id of ['#type', '#result']) $(id).addEventListener('change', render);
loadData().then(render).catch(showError);
