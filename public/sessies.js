// Sessiepagina: per speelavond uitslagen, de top drie als kaarten, een verhaaltje met een Cruijff-quote en de spelers.
// Een sessie is een reeks wedstrijden met minder dan 3 uur ertussen (SESSION_GAP in common.js).
// Samenvatting: docs/coach-logica.md §9 (Sessie).

const WEEKDAY_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const longDate = ts => { const d = new Date(ts * 1000); return `${WEEKDAY_LONG[d.getDay()]} ${d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const typeLabel = list => { const t = new Set(list.map(m => m.matchType)); return t.size > 1 ? 'league en playoff' : t.has('playoffMatch') ? 'playoff' : 'league'; };
const strengthLabel = d => d === null ? '' : d >= 250 ? 'veel sterker' : d >= 100 ? 'sterker' : d <= -100 ? 'zwakker' : 'gelijkwaardig';
const pSum = (rows, f) => rows.reduce((a, r) => a + (f(r.p) || 0), 0);

let sessions = [], selectedId = null;

function renderList() {
  $('#session-list').innerHTML = [...sessions].reverse().map(s => {
    const sm = summarize(s.matches), opp = avg(s.matches.map(m => m.opponent.skillRating).filter(Boolean));
    return `<button type="button" role="option" class="session-item ${s.id === selectedId ? 'active' : ''}" aria-selected="${s.id === selectedId}" data-id="${s.id}">
      <div class="s-date">${cap(longDate(s.matches[0].ts))}</div>
      <div>${pills(s.matches)}</div>
      <div class="s-meta">${sm.n} ${sm.n === 1 ? 'wedstrijd' : 'wedstrijden'} · ${sm.gf}–${sm.ga} · ${typeLabel(s.matches)}${opp ? ` · tegenstanders gem. ${Math.round(opp)}` : ''}</div>
    </button>`;
  }).join('');
  for (const b of $('#session-list').querySelectorAll('.session-item')) b.addEventListener('click', () => { selectedId = Number(b.dataset.id); render(); });
}

// De anekdote van de avond (coach-logica §9): het ene moment of de ene speler die de avond kenmerkte, met de
// Cruijff-quote die erbij hoort. Kandidaten krijgen een kracht; de sterkste wint, bij gelijke kracht de laatste.
const QUOTE = {
  schieten: 'Je moet schieten, anders kun je niet scoren.',
  doorhebben: 'Je gaat het pas zien als je het doorhebt.',
  nadeel: 'Elk nadeel heb z\'n voordeel.',
  nietVerliezen: 'Als je niet kunt winnen, moet je zorgen dat je niet verliest.',
  simpel: 'Voetbal is simpel, maar het moeilijkste wat er is, is simpel voetballen.',
  fout: 'Voordat ik een fout maak, maak ik die fout niet.',
  bal: 'Als wij de bal hebben, kunnen zij niet scoren.',
  italianen: 'Italianen kunnen niet van je winnen, maar je kan wel van ze verliezen.',
  toeval: 'Toeval is logisch.',
};
function anecdote(ms, sm, prow) {
  const c = [], nm = n => `<b>${esc(n)}</b>`, res = ms.map(m => m.result), n = ms.length;
  const pot = i => ['de eerste pot', 'de tweede pot', 'de derde pot', 'de vierde pot', 'de vijfde pot'][i] || `pot ${i + 1}`;
  // Spelersmomenten
  for (const m of ms) for (const p of m.players) if (p.goals >= 3) c.push({ w: 10 + p.goals, text: `${nm(p.name)} schoot er tegen ${esc(m.opponent.name)} in ${numWord(p.goals)} keer in${m.result === 'W' ? '' : ', en toch werd het niets'}.`, q: 'schieten' });
  if (n >= 3) for (const r of prow) {
    const rows = ms.map(m => m.players.find(p => p.name === r.name)).filter(Boolean);
    if (rows.length === n && rows.every(p => p.goals > 0)) c.push({ w: 9, text: `${nm(r.name)} scoorde in elke pot van de avond, ${numWord(pSum(rows.map(p => ({ p })), p => p.goals))} goals in totaal.`, q: 'schieten' });
    if (rows.length === n && rows.every(p => p.mom)) c.push({ w: 9, text: `${nm(r.name)} was elke pot man of the match. De rest mocht meedoen.`, q: 'doorhebben' });
  }
  // Verloop
  if (n >= 4 && res[0] !== 'W' && res[1] !== 'W' && res.slice(2).every(r => r === 'W')) c.push({ w: 8, text: `Na twee potten zonder winst draaide het team de avond om en won het alles wat erna kwam.`, q: 'nadeel' });
  else if (n >= 4 && res[0] !== 'W' && res[1] !== 'W' && res.slice(2).some(r => r === 'W')) c.push({ w: 6, text: `De eerste twee potten leverden niets op; daarna kwam het team op gang.`, q: 'nadeel' });
  if (n >= 4 && res.slice(-2).every(r => r !== 'W') && res.slice(0, -2).every(r => r === 'W')) c.push({ w: 8, text: `Een vliegende start, maar de laatste twee potten gingen verloren. Eerder stoppen was een optie geweest.`, q: 'nietVerliezen' });
  else if (n >= 4 && res.slice(-2).every(r => r !== 'W') && res.slice(0, -2).some(r => r === 'W')) c.push({ w: 6, text: `Na een goed begin zakte het aan het eind in: de laatste twee potten leverden niets op.`, q: 'nietVerliezen' });
  if (n >= 3 && res.every(r => r === 'W')) c.push({ w: 7, text: `Alles gewonnen, ${numWord(n)} uit ${numWord(n)}. Zo'n avond komt niet vaak voorbij.`, q: 'simpel' });
  if (n >= 3 && res.every(r => r !== 'W')) c.push({ w: 7, text: `Geen enkele pot gewonnen. Soms is het gewoon niet de avond.`, q: 'fout' });
  if (n >= 3 && ms.every(m => m.goalsAgainst === 0)) c.push({ w: 7, text: `De hele avond de nul gehouden: ${numWord(n)} potten zonder tegengoal.`, q: 'bal' });
  // Losse momenten
  for (const [i, m] of ms.entries()) {
    if (m.winnerByDnf) c.push({ w: 6, text: `${esc(m.opponent.name)} gaf in ${pot(i)} op bij ${m.goals}–${m.goalsAgainst}. Ook een manier om te winnen.`, q: 'italianen' });
    const sUs = m.players.reduce((a, p) => a + (p.shots || 0), 0), sThem = m.opponentPlayers.reduce((a, p) => a + (p.shots || 0), 0);
    if (m.result === 'L' && sUs >= 8 && sUs >= 2 * sThem) c.push({ w: 5, text: `Tegen ${esc(m.opponent.name)} schoot het team ${numWord(sUs)} keer en zij ${numWord(sThem)} keer, en toch ging die pot verloren.`, q: 'toeval' });
    const d = m.goals - m.goalsAgainst;
    if (d >= 4) c.push({ w: 4 + d / 10, text: `${esc(m.opponent.name)} werd in ${pot(i)} met ${m.goals}–${m.goalsAgainst} van het veld gespeeld.`, q: 'simpel' });
    if (d <= -4) c.push({ w: 4 - d / 10, text: `Tegen ${esc(m.opponent.name)} liep het in ${pot(i)} helemaal uit de hand: ${m.goals}–${m.goalsAgainst}.`, q: 'nadeel' });
  }
  // Ver boven of onder het eigen normaal
  for (const r of prow) if (r.nT >= 3 && r.d !== null) {
    if (r.d >= 1) c.push({ w: 3 + r.d, text: `${nm(r.name)} speelde ver boven het eigen niveau${r.g + r.a ? `, met ${joinAnd([r.g ? `${numWord(r.g)} ${r.g === 1 ? 'goal' : 'goals'}` : '', r.a ? `${numWord(r.a)} ${r.a === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean))}` : ''}.`, q: 'doorhebben' });
    if (r.d <= -1) c.push({ w: 3 - r.d, text: `Voor ${nm(r.name)} was het een avond om snel te vergeten; dat gebeurt de besten.`, q: 'nadeel' });
  }
  // Niets bijzonders: wie het meest bij de goals betrokken was.
  const inv = [...prow].sort((a, b) => (b.g + b.a) - (a.g + a.a))[0];
  if (inv && inv.g + inv.a > 0) c.push({ w: 1, text: `${nm(inv.name)} was bij de meeste goals betrokken: ${joinAnd([inv.g ? `${numWord(inv.g)} ${inv.g === 1 ? 'goal' : 'goals'}` : '', inv.a ? `${numWord(inv.a)} ${inv.a === 1 ? 'assist' : 'assists'}` : ''].filter(Boolean))}.`, q: 'simpel' });
  if (!c.length) return { text: '', q: 'simpel' };
  return c.reduce((best, x) => x.w >= best.w ? x : best);
}

function sessionSummary(ms, sm, opp, own, prow) {
  const parts = [];
  // 1. Karakter van de avond en tegenstand
  const type = typeLabel(ms) === 'playoff' ? 'playoffavond' : typeLabel(ms) === 'league' ? 'competitieavond' : 'avond';
  const lbl = opp && own ? strengthLabel(opp - own) : null;
  const vs = lbl ? ` tegen ${{ gelijkwaardig: 'gelijkwaardige', zwakker: 'zwakkere', sterker: 'sterkere', 'veel sterker': 'veel sterkere' }[lbl]} tegenstanders` : '';
  const char = sm.L === 0 && sm.D === 0 ? 'Een perfecte' : sm.ppg >= 2 ? 'Een sterke' : sm.ppg >= 1.2 ? 'Een wisselende' : 'Een moeizame';
  let lead = sm.W + sm.D === 0 ? `Een ${type} om snel te vergeten${vs}` : `${char} ${type}${vs}`;
  const strongOpp = lbl === 'sterker' || lbl === 'veel sterker';
  if (sm.resid >= 0.75) lead += strongOpp ? ', en jullie deden het beter dan je mocht verwachten' : ', beter dan de tegenstand deed vermoeden';
  else if (sm.resid <= -0.75) lead += strongOpp ? ', en zelfs voor die tegenstand viel het tegen' : ', terwijl er meer in had gezeten';
  parts.push(lead + '.');
  // 2. De anekdote
  const a = anecdote(ms, sm, prow);
  if (a.text) parts.push(a.text);
  return { html: parts.join(' '), quote: QUOTE[a.q] };
}

function render() {
  if (!sessions.length) { $('#s-title').textContent = 'Nog geen sessies'; return; }
  if (!sessions.some(s => s.id === selectedId)) selectedId = sessions[sessions.length - 1].id;
  history.replaceState(null, '', `#${selectedId}`);
  renderList();
  const s = sessions.find(x => x.id === selectedId), ms = s.matches, sm = summarize(ms);
  const others = DATA.matches.filter(m => m.session !== s.id);
  const own = DATA.snapshot?.skillRating;
  const names = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  $('#s-title').textContent = `${cap(longDate(ms[0].ts))} · ${typeLabel(ms)}`;
  $('#s-meta').textContent = `${fmtTime(ms[0].ts)} tot ${fmtTime(ms[ms.length - 1].ts)} · ${names.length} spelers: ${names.join(', ')}`;

  const opp = avg(ms.map(m => m.opponent.skillRating).filter(Boolean));
  // Badges: deze avond tegenover normaal (alle andere wedstrijden).
  const no = summarize(others), TN = 'Deze avond tegenover normaal (alle andere wedstrijden)';
  // Zes vaste cijfers per avond (coach-logica §9a), met "normaal" eronder waar dat iets zegt.
  const ourP = list => list.flatMap(m => m.players);
  const passPct = list => pct(pSum(ourP(list).map(p => ({ p })), p => p.passesMade), pSum(ourP(list).map(p => ({ p })), p => p.passAttempts));
  const convPct = list => pct(pSum(ourP(list).map(p => ({ p })), p => p.goals), pSum(ourP(list).map(p => ({ p })), p => p.shots));
  const cleanSheets = list => list.filter(m => m.goalsAgainst === 0).length;
  const dur = ms[ms.length - 1].ts - ms[0].ts + 15 * 60, durTxt = `${Math.floor(dur / 3600)}u ${String(Math.round(dur % 3600 / 60)).padStart(2, '0')}m`;
  const fig = (label, value, sub, badge) => `<div class="sfig"><span class="sfig-label">${label}</span><span class="sfig-value">${value}${badge ? `<span class="kpi-badge ${badge.good === true ? 'up' : badge.good === false ? 'down' : ''}" title="${esc(badge.title || '')}">${badge.txt}</span>` : ''}</span><span class="sfig-sub">${sub}</span></div>`;
  const cmpOk = others.length >= 3;
  $('#s-figs').innerHTML = [
    fig('Wedstrijden', sm.n, `${sm.W}-${sm.D}-${sm.L}`, cmpOk ? deltaOf(sm.ppg, no.ppg, { digits: 2, title: `${TN}: punten per wedstrijd` }) : null),
    fig('Duur', durTxt, `${fmtTime(ms[0].ts)} tot ${fmtTime(ms[ms.length - 1].ts)}`),
    fig('Doelsaldo', signed(sm.gf - sm.ga, 0), `${sm.gf} voor · ${sm.ga} tegen`, cmpOk ? deltaOf(sm.resid, no.resid, { digits: 2, title: `${TN}: doelsaldo tov verwachting` }) : null),
    fig('Pass', fmtPct(passPct(ms)), cmpOk ? `normaal ${fmtPct(passPct(others))}` : ''),
    fig('Conversie', fmtPct(convPct(ms)), cmpOk ? `normaal ${fmtPct(convPct(others))}` : ''),
    fig('Clean sheets', cleanSheets(ms), cmpOk ? `normaal ${fmtPct(pct(cleanSheets(others), others.length))} van de potten` : `van ${sm.n}`),
  ].join('');
  $('#s-matches').innerHTML = ms.map(m => matchCard(m, { own })).join('');

  // Spelers: rating deze avond tegenover het eigen normaal (alle andere wedstrijden), goals, assists, man of the match.
  const prow = names.map(name => {
    const here = ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const there = others.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
    const rH = avg(here.map(r => r.p.rating).filter(v => v !== null)), rT = avg(there.map(r => r.p.rating).filter(v => v !== null));
    return { name, n: here.length, nT: there.length, rH, rT, d: rT === null || rH === null ? null : rH - rT, g: pSum(here, p => p.goals), a: pSum(here, p => p.assists), mom: pSum(here, p => p.mom) };
  }).sort((x, y) => (y.rH ?? 0) - (x.rH ?? 0));
  const sum = sessionSummary(ms, sm, opp, own, prow);
  $('#s-summary').innerHTML = sum.html;
  $('#s-quote').innerHTML = `„${sum.quote}” <small>— Johan Cruijff</small>`;
  $('#s-share').onclick = () => shareSession(ms, sm, prow, $('#s-summary').innerText);
  // Top drie als kaarten, de beste vooraan.
  const top = prow.filter(r => r.rH !== null).slice(0, 3);
  $('#s-podium').innerHTML = top.map((r, i) => `<a class="podium-card p${i + 1}" href="spelers.html#${encodeURIComponent(r.name)}" title="${esc(r.name)}: rating ${f2(r.rH)} deze avond">
      <span class="podium-rank">${i + 1}</span><span class="fut-mini">${PlayerCard.html(r.name)}</span><span class="podium-rating">${f2(r.rH)}${r.mom ? ' <span class="crown" title="Man of the match">♛</span>' : ''}</span></a>`).join('');
  $('#s-players').innerHTML = `<div class="pcards">${prow.map(r => `<a class="pcard" href="spelers.html#${encodeURIComponent(r.name)}">
    <div class="pcard-head"><span class="pcard-name">${esc(r.name)}${r.mom ? ' <span class="crown" title="Man of the match">♛</span>' : ''}</span><span class="pcard-rating">${f2(r.rH)}</span></div>
    <div class="pcard-sub">${r.n} ${r.n === 1 ? 'wedstrijd' : 'wedstrijden'} · normaal ${f2(r.rT)} ${r.d === null ? '' : residCell(r.d)}</div>
    <div class="pcard-stats"><span><b>${r.g}</b> goals</span><span><b>${r.a}</b> assists</span><span><b>${r.mom}</b> MOTM</span></div></a>`).join('')}</div>`;
}

addEventListener('resize', () => DATA && render());
addEventListener('hashchange', () => { const id = Number(location.hash.slice(1)); if (id && id !== selectedId) { selectedId = id; render(); } });
selectedId = Number(location.hash.slice(1)) || null;
window.rerender = () => render(); // thema wisselen: kaarten opnieuw in thuis- of uitkleuren
Promise.all([loadData(), PlayerCard.load().catch(() => {})]).then(() => { sessions = sessionsOf(DATA.matches); render(); }).catch(showError);

// ---------- deelkaart ----------
// Een avond als afbeelding (1080×1080) voor de groepsapp: uitslag, kerncijfers, uitblinker, de eerste zin van de
// samenvatting. Kleuren van het thuistenue. Deelt via het deelmenu van de telefoon, anders als download.
async function shareSession(ms, sm, prow, summaryText) {
  const k = DATA.club.kits?.home || ['#090b0d', '#ffd200', '#582063', '#ffd200'];
  const [ink, accent, purple] = ['#f2f2f2', k[1], k[2]];
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1080, 1080); grad.addColorStop(0, purple); grad.addColorStop(1, '#17141b');
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1080);
  const font = (size, weight = 500, family = 'system-ui, -apple-system, "Segoe UI", sans-serif') => { g.font = `${weight} ${size}px ${family}`; };
  const mono = (size, weight = 500) => font(size, weight, 'ui-monospace, "SF Mono", Menlo, monospace');
  const wrap = (text, x, y, maxW, lh) => { const words = text.split(' '); let line = '', yy = y; for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = test; } if (line) g.fillText(line, x, yy); return yy + lh; };
  const crest = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'crest.png'; });
  if (crest) g.drawImage(crest, 72, 64, 120, 120);
  g.fillStyle = ink; font(54, 700); g.fillText('Frambroos', 216, 118);
  g.fillStyle = '#cfc3d4'; font(30); g.fillText(cap(longDate(ms[0].ts)), 216, 164);
  // uitslag
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(72, 230, 936, 250, 28); g.fill();
  mono(132, 600); let x = 108; const y = 365;
  for (const [n, col] of [[sm.W, '#5b9cf0'], [sm.D, '#9a9da3'], [sm.L, '#f07c7c']]) { g.fillStyle = col; g.fillText(String(n), x, y); x += g.measureText(String(n)).width; g.fillStyle = '#6f6e68'; if (col !== '#f07c7c') { g.fillText('-', x, y); x += g.measureText('-').width; } }
  g.fillStyle = '#cfc3d4'; font(26); g.fillText('W – G – V', 112, 430);
  let px = 560; for (const txt of [`${sm.ppg} ppw`, `winst ${fmtPct(sm.winPct)}`, `${signed(sm.gf - sm.ga, 0)} doelsaldo`]) { font(26, 600); const wdt = g.measureText(txt).width + 40; g.fillStyle = 'rgba(255,210,0,0.14)'; g.beginPath(); g.roundRect(px, 300, wdt, 52, 26); g.fill(); g.fillStyle = accent; g.fillText(txt, px + 20, 336); px += wdt + 14; }
  mono(64, 500); g.fillStyle = ink; g.textAlign = 'right'; g.fillText(`${sm.gf}–${sm.ga}`, 976, 440); g.textAlign = 'left';
  // uitblinker en betrokken bij goals
  const best = prow[0], inv = [...prow].sort((a, b) => (b.g + b.a) - (a.g + a.a))[0];
  const box = (bx, label, name, val) => { g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.roundRect(bx, 512, 452, 200, 28); g.fill(); g.fillStyle = accent; font(24, 600); g.fillText(label.toUpperCase(), bx + 32, 562); g.fillStyle = ink; font(40, 700); g.fillText(name, bx + 32, 622); mono(56, 500); g.textAlign = 'right'; g.fillText(val, bx + 420, 688); g.textAlign = 'left'; };
  if (best) box(72, 'Uitblinker', best.name, f2(best.rH));
  if (inv) box(556, 'Goals + assists', inv.name, String(inv.g + inv.a));
  // samenvatting (eerste twee zinnen)
  g.fillStyle = ink; font(32, 400);
  const sentences = summaryText.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]/g) || [summaryText];
  wrap(sentences.slice(0, 2).join(' ').trim(), 72, 790, 936, 46);
  g.fillStyle = '#cfc3d4'; font(24); g.fillText('Frambroos Coach · neegek.github.io/frambroos-proclubs', 72, 1016);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], `frambroos-${new Date(ms[0].ts * 1000).toISOString().slice(0, 10)}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Frambroos' }); return; } catch { /* geannuleerd: dan downloaden */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
