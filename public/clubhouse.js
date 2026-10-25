// Clubhouse: de startpagina over de club als geheel (docs/coach-logica.md §9a). Clubcijfers komen van EA,
// alles over spelers en vorm uit de gevolgde wedstrijden in DATA (zie common.js).

const has = (m, n) => m.players.some(p => p.name === n);
const rolling = (xs, k) => xs.map((_, i) => { const w = xs.slice(Math.max(0, i - k + 1), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });

function teamInsights(ms) {
  const out = [];
  const W = ms.filter(m => m.result === 'W'), R = ms.filter(m => m.result !== 'W');
  // 1. Waar wedstrijden beslist worden: grootste verschillen tussen winst en gelijk/verlies
  if (W.length >= 3 && R.length >= 3) {
    const diffs = compareTeam(W, R).filter(d => !['gf', 'ga'].includes(d.key) && Math.abs(d.rel) >= 0.15).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel)).slice(0, 3);
    for (const d of diffs) out.push({ w: Math.abs(d.rel), html: insightLi(`${d.label}: ${d.fmt(d.a)} bij winst, ${d.fmt(d.b)} bij gelijk of verlies`, `Een van de grootste verschillen tussen de ${W.length} gewonnen en ${R.length} niet-gewonnen wedstrijden${d.hib ? '' : '; hier is lager beter'}.`, CONF(W.length, R.length)) });
  }
  // 2. Sterkte van de tegenstander
  const own = DATA.snapshot?.skillRating;
  if (own) {
    const strong = ms.filter(m => m.opponent.skillRating && m.opponent.skillRating >= own + 100), weak = ms.filter(m => m.opponent.skillRating && m.opponent.skillRating < own + 100);
    if (strong.length >= 3 && weak.length >= 3) { const a = summarize(strong), b = summarize(weak); out.push({ w: Math.abs(a.ppg - b.ppg) / 3, html: insightLi(`Tegen clubs met ${own + 100}+ rating: ${a.ppg} punten per wedstrijd, daaronder ${b.ppg}`, `${a.n} wedstrijden tegen duidelijk sterkere clubs (${a.W}W ${a.D}G ${a.L}V) tegenover ${b.n} tegen gelijkwaardige of zwakkere (${b.W}W ${b.D}G ${b.L}V). Jullie eigen rating is ${own}.`, CONF(a.n, b.n)) }); }
  }
  if (DATA.model.fitted) { const c = DATA.model.coef; out.push({ w: 0.2, html: insightLi(`100 ratingpunten sterkere tegenstander kost gemiddeld ${Math.abs(c[1]).toFixed(1)} doelpunt`, `Uit het verwachtingsmodel, geschat op ${DATA.model.n} wedstrijden. Een extra mens bij de tegenstander: ${Math.abs(c[2]).toFixed(1)} doelpunt. Alle "tov verwachting"-cijfers corrigeren hiervoor.`, CONF(DATA.model.n, DATA.model.n)) }); }
  // 3. Aantal mensen bij de tegenstander
  const few = ms.filter(m => m.opponentPlayers.length <= 3), many = ms.filter(m => m.opponentPlayers.length >= 4);
  if (few.length >= 3 && many.length >= 3) { const a = summarize(few), b = summarize(many); const d = a.resid - b.resid; if (Math.abs(d) >= 0.5) out.push({ w: Math.abs(d) / 2, html: insightLi(d < 0 ? 'Tegen teams met weinig mensen presteren jullie onder verwachting' : 'Tegen teams met weinig mensen presteren jullie boven verwachting', `Tegen 3 of minder mensen ${signed(a.resid, 2)} tov verwachting (${a.n} wedstrijden), tegen 4 of meer ${signed(b.resid, 2)} (${b.n}). ${d < 0 ? 'Mogelijk lastiger om een AI-blok open te spelen dan een open wedstrijd te spelen.' : ''}`, CONF(a.n, b.n)) }); }
  // 4. Volgorde binnen de avond
  const early = ms.filter(m => m.posInSession <= 2), late = ms.filter(m => m.posInSession > 2);
  if (early.length >= 3 && late.length >= 3) { const a = summarize(early), b = summarize(late); const d = a.resid - b.resid; if (Math.abs(d) >= 0.5) out.push({ w: Math.abs(d) / 2, html: insightLi(d < 0 ? 'De eerste twee potten van de avond gaan slechter' : 'De eerste twee potten van de avond gaan beter', `Eerste twee: ${a.ppg} punten per wedstrijd, ${signed(a.resid, 2)} tov verwachting (${a.n}). Daarna: ${b.ppg} punten, ${signed(b.resid, 2)} (${b.n}). ${d < 0 ? 'Opwarmen of eerst even in een minder belangrijke pot inspelen kan lonen.' : 'Lange avonden kosten energie.'}`, CONF(a.n, b.n)) }); }
  // 5. League tegenover playoff
  const lg = ms.filter(m => m.matchType === 'leagueMatch'), po = ms.filter(m => m.matchType === 'playoffMatch');
  if (lg.length >= 3 && po.length >= 3) { const a = summarize(lg), b = summarize(po); if (Math.abs(a.ppg - b.ppg) >= 0.5) out.push({ w: Math.abs(a.ppg - b.ppg) / 3, html: insightLi(`League ${a.ppg} punten per wedstrijd, playoff ${b.ppg}`, `${a.n} league- en ${b.n} playoffwedstrijden. Tov verwachting: ${signed(a.resid, 2)} en ${signed(b.resid, 2)}, dus ${Math.abs(a.resid - b.resid) < 0.5 ? 'het verschil komt grotendeels door sterkere tegenstanders' : 'het verschil blijft ook na correctie voor de tegenstander'}.`, CONF(a.n, b.n)) }); }
  // 6. Speler met de grootste impact
  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  const impact = players.map(n => { const a = ms.filter(m => has(m, n)), b = ms.filter(m => !has(m, n)); if (a.length < 3 || b.length < 3) return null; const sa = summarize(a), sb = summarize(b); return { n, d: sa.resid - sb.resid, a: sa, b: sb }; }).filter(Boolean).sort((x, y) => y.d - x.d);
  if (impact.length && impact[0].d >= 0.5) { const i = impact[0]; out.push({ w: i.d / 2, html: insightLi(`Met ${esc(i.n)} erbij presteert het team het meest boven verwachting`, `${signed(i.a.resid, 2)} tov verwachting met (${i.a.n} wedstrijden, ${i.a.ppg} punten), ${signed(i.b.resid, 2)} zonder (${i.b.n}, ${i.b.ppg} punten). Let op: dit kan ook samenvallen met het aantal spelers of de avond.`, CONF(i.a.n, i.b.n)) }); }
  // 7. Vijf of zes man
  const six = ms.filter(m => m.players.length >= 6), five = ms.filter(m => m.players.length <= 5);
  if (six.length >= 3 && five.length >= 3) { const a = summarize(six), b = summarize(five); out.push({ w: Math.abs(a.resid - b.resid) / 2, html: insightLi(`Met zes man ${a.ppg} punten per wedstrijd, met vijf of minder ${b.ppg}`, `Tov verwachting ${signed(a.resid, 2)} (${a.n}) tegenover ${signed(b.resid, 2)} (${b.n}). De AI vult de open plek; hoe groot dat gat is, zie je hier.`, CONF(a.n, b.n)) }); }
  return out.sort((a, b) => b.w - a.w).map(o => o.html);
}

function shirt(c, label) {
  // Kleurindicatie van een tenue: romp in kleur 1, mouwen en kraag in kleur 2, bies in kleur 3.
  const [c1, c2, c3] = c;
  return `<figure class="kit"><svg viewBox="0 0 64 60" role="img" aria-label="${label}: ${c.slice(0, 3).join(', ')}">
    <path d="M22 4 L10 9 L2 22 L11 27 L14 22 L14 56 L50 56 L50 22 L53 27 L62 22 L54 9 L42 4 Q32 12 22 4 Z" fill="${c1}" stroke="var(--border-strong)" stroke-width="1"/>
    <path d="M10 9 L2 22 L11 27 L16 18 Z M54 9 L62 22 L53 27 L48 18 Z" fill="${c2}"/>
    <path d="M22 4 Q32 12 42 4 L39 3 Q32 9 25 3 Z" fill="${c2}"/>
    <rect x="14" y="50" width="36" height="6" fill="${c3}"/>
    <path d="M2 22 L11 27" stroke="${c3}" stroke-width="2.5"/><path d="M62 22 L53 27" stroke="${c3}" stroke-width="2.5"/>
  </svg><figcaption>${label}</figcaption></figure>`;
}

function teamSummary(ms) {
  if (!ms.length) return 'Nog geen wedstrijden in de gekozen periode.';
  const s = summarize(ms), own = DATA.snapshot?.skillRating, parts = [];
  // 1. Karakter en verloop van de periode
  const char = s.ppg >= 2 ? 'sterke' : s.ppg >= 1.5 ? 'goede' : s.ppg >= 1 ? 'wisselende' : 'moeizame';
  let arc = '';
  if (ms.length >= 8) {
    const half = Math.floor(ms.length / 2), a = summarize(ms.slice(0, half)), b = summarize(ms.slice(half)), d = b.ppg - a.ppg;
    arc = d <= -0.5 ? ': een sterke start, daarna werd het moeizamer' : d >= 0.5 ? ': na een stroeve start gaat het steeds beter' : '';
  }
  parts.push(`Een ${char} periode voor Frambroos${arc}.`);
  // 2. Tegen wie het wel en niet lukt
  if (own) {
    const strong = summarize(ms.filter(m => m.opponent.skillRating >= own + 100)), rest = summarize(ms.filter(m => m.opponent.skillRating && m.opponent.skillRating < own + 100));
    if (strong.n >= 3 && rest.n >= 3) {
      if (strong.ppg <= rest.ppg - 0.7) parts.push('Tegen gelijkwaardige teams doen jullie goed mee, maar tegen de sterkere clubs is het nog een stap te ver.');
      else if (strong.ppg >= rest.ppg) parts.push('Ook tegen sterkere clubs houden jullie goed stand.');
    }
  }
  // 3. Waar het om draait
  const W = ms.filter(m => m.result === 'W'), R = ms.filter(m => m.result !== 'W');
  if (W.length >= 3 && R.length >= 3) {
    const d = compareTeam(W, R).filter(x => x.good && TEAM_PHRASE[x.key] && !['gf', 'ga'].includes(x.key)).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel)).slice(0, 2);
    if (d.length) parts.push(`Of jullie winnen, hangt vooral af van ${joinAnd(d.map(x => TEAM_PHRASE[x.key][2]))}.`);
  }
  // 4. Wie het verschil maakt
  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  const imp = players.map(n => { const a = ms.filter(m => has(m, n)), b = ms.filter(m => !has(m, n)); if (a.length < 3 || b.length < 3) return null; return { n, d: summarize(a).resid - summarize(b).resid }; }).filter(Boolean).sort((x, y) => y.d - x.d)[0];
  if (imp && imp.d >= 0.5) parts.push(`Met <b>${esc(imp.n)}</b> erbij gaat het merkbaar beter.`);
  return parts.join(' ');
}

// ---------- per speler: totalen uit de gevolgde wedstrijden ----------
function playerTotals(ms) {
  const out = new Map();
  for (const m of ms) for (const p of m.players) {
    const t = out.get(p.name) || { name: p.name, n: 0, nEv: 0, g: 0, a: 0, sa: 0, mom: 0, ratings: [], pm: 0, pa: 0, tm: 0, ta: 0, through: 0, beaten: 0, inter: 0, won: 0 };
    t.n++; t.g += p.goals || 0; t.a += p.assists || 0; t.mom += p.mom || 0; if (p.rating !== null) t.ratings.push(p.rating);
    t.pm += p.passesMade || 0; t.pa += p.passAttempts || 0; t.tm += p.tacklesMade || 0; t.ta += p.tackleAttempts || 0;
    if (p.ev) { t.nEv++; t.sa += p.ev.second_assists || 0; t.through += p.ev.through_balls || 0; t.beaten += p.ev.players_beaten || 0; t.inter += p.ev.interceptions || 0; t.won += p.ev.possession_won || 0; }
    out.set(p.name, t);
  }
  return [...out.values()].map(t => ({ ...t, involved: t.g + t.a + t.sa, rating: avg(t.ratings) }));
}

// Ranglijst: per stat een waarde om op te sorteren, de hoofdwaarde en een regel eronder. null = niet genoeg data.
const per = (x, n) => n ? (x / n).toFixed(2) : '–';
// Tellende stats: groot het aantal per wedstrijd (daarop wordt gesorteerd), klein het totaal.
const count = (key, label, total, games, extra = () => '') => ({ key, label, v: t => games(t) ? total(t) / games(t) : null, main: t => per(total(t), games(t)), sub: t => `${total(t)} in ${games(t)} wedstrijden${extra(t)}` });
const RANKS = [
  { key: 'index', label: 'Frambroos-index', v: t => DATA.fi[t.name]?.score ?? null, main: t => fiFmt(DATA.fi[t.name].score),
    sub: t => { const f = DATA.fi[t.name]; return `${fiLabel(f.score)} · afronden ${fiFmt(f.parts.shoot)}, creëren ${fiFmt(f.parts.pass)}, aan de bal ${fiFmt(f.parts.ball)}, verdedigen ${fiFmt(f.parts.defend)}`; } },
  count('involved', 'Betrokken bij goals', t => t.involved, t => t.n, t => ` · ${t.g} G, ${t.a} A, ${t.sa} tweede`),
  count('goals', 'Goals', t => t.g, t => t.n),
  count('assists', 'Assists', t => t.a, t => t.n),
  count('second', 'Tweede assists', t => t.sa, t => t.nEv, () => ' · de pass vóór de assist'),
  { key: 'rating', label: 'Rating', v: t => t.rating, main: t => f2(t.rating), sub: t => `gemiddeld over ${t.n} wedstrijden` },
  count('mom', 'Man of the match', t => t.mom, t => t.n),
  { key: 'pass', label: 'Passnauwkeurigheid', v: t => t.pa >= 40 ? t.pm / t.pa : null, main: t => `${Math.round(100 * t.pm / t.pa)}%`, sub: t => `${t.pm} van ${t.pa} passes` },
  count('through', 'Steekpasses', t => t.through, t => t.nEv),
  count('beaten', 'Mensen uitgespeeld', t => t.beaten, t => t.nEv),
  count('inter', 'Onderscheppingen', t => t.inter, t => t.nEv),
  count('won', 'Balwinst', t => t.won, t => t.nEv),
  { key: 'duels', label: 'Duels gewonnen', v: t => t.ta >= 15 ? t.tm / t.ta : null, main: t => `${Math.round(100 * t.tm / t.ta)}%`, sub: t => `${t.tm} van ${t.ta} tackles` },
];
let rankKey = null; try { rankKey = sessionStorage.getItem('rankKey') || null; } catch {}

// Ranglijst als swipebare kaartjes: per stat de top vier; een tik opent de hele lijst eronder.
function renderRanking(totals) {
  const rowsFor = R => totals.filter(t => t.n >= 3).map(t => ({ t, v: R.v(t) })).filter(x => x.v !== null && x.v !== undefined).sort((a, b) => b.v - a.v);
  $('#rank-cards').innerHTML = RANKS.map(R => { const rows = rowsFor(R); return `<button type="button" class="rank-card ${R.key === rankKey ? 'active' : ''}" data-k="${R.key}" aria-expanded="${R.key === rankKey}">
      <span class="rank-card-label">${R.label}${R.key === 'index' ? '<span title="Wat iemand zelf bijdraagt, los van de uitslag">♛</span>' : ''}</span>
      <ol>${rows.slice(0, 4).map((x, i) => `<li><span>${i + 1}</span><span>${esc(x.t.name)}</span><b>${R.main(x.t)}</b></li>`).join('') || '<li class="empty">Nog te weinig wedstrijden.</li>'}</ol>
      ${rows.length > 4 ? `<span class="rank-card-more">nog ${rows.length - 4}</span>` : ''}</button>`; }).join('');
  for (const b of $('#rank-cards').querySelectorAll('.rank-card')) b.addEventListener('click', () => { rankKey = rankKey === b.dataset.k ? null : b.dataset.k; try { rankKey ? sessionStorage.setItem('rankKey', rankKey) : sessionStorage.removeItem('rankKey'); } catch {} renderRanking(totals); });
  const R = RANKS.find(r => r.key === rankKey);
  $('#rank-list').hidden = !R;
  if (!R) return;
  const rows = rowsFor(R), max = Math.max(...rows.map(x => x.v), 0) || 1;
  $('#rank-list').innerHTML = rows.map((x, i) => `<li><span class="rank-pos">${i + 1}</span>
    <span class="rank-name"><a href="spelers.html#${encodeURIComponent(x.t.name)}">${esc(x.t.name)}</a><small>${R.sub(x.t)}</small></span>
    <span class="rank-bar" aria-hidden="true"><span style="width:${Math.max(3, 100 * x.v / max)}%"></span></span>
    <span class="rank-val">${R.main(x.t)}</span></li>`).join('');
}

function clubHero() {
  const c = DATA.club, s = DATA.snapshot, k = c.kits;
  const facts = [
    s?.currentDivision ? `<span class="hero-fact"><b>Divisie ${s.currentDivision}</b>nu</span>` : '',
    s?.bestDivision ? `<span class="hero-fact"><b>Divisie ${s.bestDivision}</b>hoogst bereikt</span>` : '',
    s?.skillRating ? `<span class="hero-fact"><b>${s.skillRating}</b>skill rating</span>` : '',
    s?.gamesPlayed ? `<span class="hero-fact"><b>${s.gamesPlayed}</b>wedstrijden</span>` : '',
  ].join('');
  $('#club-hero').innerHTML = `<div class="hero-id"><img src="crest.png" alt="Clublogo van ${esc(c.name)}" width="96" height="96">
      <div><h2 class="hero-name">${esc(c.name)}</h2><p class="hero-meta">${k?.stadium ? `${esc(k.stadium)} · ` : ''}${c.platform === 'common-gen5' ? 'PS5, Xbox Series, PC' : esc(c.platform)}</p>
      <div class="hero-facts">${facts}</div></div></div>
    ${k ? `<div class="kits" aria-label="Tenues">${shirt(k.home, 'Thuis')}${shirt(k.away, 'Uit')}${shirt(k.third, 'Derde')}</div>` : ''}`;
}

function render() {
  const ms = DATA.matches, s = summarize(ms), snap = DATA.snapshot;
  // Badges: laatste speelavond tegenover de avonden daarvoor (gevolgde wedstrijden).
  const sess = sessionsOf(ms), lastS = sess.length >= 2 ? sess[sess.length - 1].matches : null;
  const sl = lastS ? summarize(lastS) : null, sb = lastS ? summarize(ms.filter(m => !lastS.includes(m))) : null;
  const T = 'Laatste speelavond tegenover de avonden daarvoor (gevolgde wedstrijden)';
  $('#page-sub').textContent = `Clubcijfers van EA over alle wedstrijden; spelers en vorm uit de ${ms.length} gevolgde wedstrijden sinds ${ms.length ? fmtDate(ms[0].ts) : '–'}. ${capFirst(DATA.freshness || '')}.`;
  clubHero();

  const g = snap?.gamesPlayed, win = g ? Math.round(100 * snap.wins / g) : null;
  const streak = snap?.winStreak ? `${snap.winStreak} gewonnen` : snap?.unbeatenStreak ? `${snap.unbeatenStreak} ongeslagen` : (() => { const r = ms.slice().reverse(); let n = 0; while (n < r.length && r[n].result === r[0]?.result) n++; return n ? `${n} ${r[0].result === 'L' ? 'verloren' : r[0].result === 'D' ? 'gelijk' : 'gewonnen'}` : '–'; })();
  $('#tiles').innerHTML = [
    kpiTile('Winstpercentage', win === null ? '–' : `${win}%`, snap ? `${snap.wins}W ${snap.ties}G ${snap.losses}V` : '', sl && deltaOf(sl.winPct, sb.winPct, { digits: 0, unit: ' pt', min: 1, title: T })),
    kpiTile('Reeks', streak, snap?.unbeatenStreak && snap.unbeatenStreak !== snap.winStreak ? `${snap.unbeatenStreak} ongeslagen op rij` : 'op rij, volgens EA', null, { small: true }),
    kpiTile('Doelpunten', snap ? `${snap.goals}–${snap.goalsAgainst}` : '–', snap ? `doelsaldo ${signed(snap.goals - snap.goalsAgainst, 0)}` : '', sl && deltaOf(sl.gfAvg - sl.gaAvg, sb.gfAvg - sb.gaAvg, { digits: 1, title: `${T} (doelsaldo per wedstrijd)` })),
    kpiTile('Clean sheets', snap?.cleanSheets ?? '–', 'wedstrijden zonder tegengoal'),
    kpiTile('Promoties', snap?.promotions ?? '–', snap?.relegations !== null && snap?.relegations !== undefined ? `${numWord(snap.relegations)} ${snap.relegations === 1 ? 'degradatie' : 'degradaties'}` : ''),
    kpiTile('Gevolgd', ms.length, `wedstrijden in deze app${snap?.gamesPlayedPlayoff ? ` · EA telt ${snap.gamesPlayedPlayoff} playoff` : ''}`),
  ].join('');

  // Vorm: laatste tien als pillen, en het voortschrijdende gemiddelde.
  $('#form-pills').innerHTML = ms.length ? pills(ms.slice(-10)) : '';
  const gd = rolling(ms.map(m => m.goalDiff), 5), rs = rolling(ms.map(m => m.resid), 5);
  lineChart($('#chart-form'), [
    { name: 'Doelsaldo', color: 'var(--s1)', area: true, values: gd.map((v, i) => ({ i, v })) },
    { name: 'Tov verwachting', color: 'var(--s2)', values: rs.map((v, i) => ({ i, v })) },
  ], ms.map((m, i) => i === 0 || fmtDate(ms[i - 1].ts) !== fmtDate(m.ts) ? fmtDate(m.ts) : ''), { height: 200, tipAt: i => `<b>Na ${esc(ms[i].opponent.name)} (${fmtDate(ms[i].ts)})</b>Doelsaldo, gemiddeld over 5: ${signed(gd[i])}<br>Tov verwachting, gemiddeld over 5: ${signed(rs[i])}` });
  const li = gd.length - 1, T5 = 'Tegenover het gemiddelde vijf wedstrijden eerder';
  $('#fig-form').innerHTML = ms.length ? figsHtml([
    { label: 'Doelsaldo', color: 'var(--s1)', value: signed(gd[li], 1), delta: li >= 5 ? deltaOf(gd[li], gd[li - 5], { digits: 1, title: T5 }) : null },
    { label: 'Tov verwachting', color: 'var(--s2)', value: signed(rs[li], 1), delta: li >= 5 ? deltaOf(rs[li], rs[li - 5], { digits: 1, title: T5 }) : null },
  ]) : '';
  $('#team-summary').innerHTML = teamSummary(ms);

  // Gevaarlijkst: betrokken bij goals per wedstrijd, top drie.
  const totals = playerTotals(ms);
  const danger = totals.filter(t => t.n >= 3).sort((a, b) => b.involved / b.n - a.involved / a.n).slice(0, 3);
  $('#danger').innerHTML = danger.length ? danger.map((t, i) => `<a class="danger-card" href="spelers.html#${encodeURIComponent(t.name)}">
      <span class="danger-rank">${i + 1}</span><span class="danger-name">${esc(t.name)}</span>
      <span class="danger-value">${per(t.involved, t.n)}<small>per wedstrijd</small></span>
      <span class="danger-split">${t.g} goals · ${t.a} assists · ${t.sa} tweede assists · ${t.n} wedstrijden</span></a>`).join('') : '<p class="empty">Nog te weinig wedstrijden.</p>';
  renderRanking(totals);

  // Leden: carrièrecijfers van EA.
  const members = [...DATA.members].sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0));
  $('#members').innerHTML = members.map(m => `<a class="member" href="spelers.html#${encodeURIComponent(m.name)}">
      <span class="member-head"><span class="member-ovr">${m.proOverall ?? '–'}</span><span><b>${esc(m.name)}</b><small>${esc(m.proName || '')}${m.proPos !== null && POS_CODE[m.proPos] ? ` · ${POS_CODE[m.proPos]}` : ''}</small></span></span>
      <span class="member-stats"><span><b>${m.gamesPlayed}</b>wed.</span><span><b>${m.winRate}%</b>winst</span><span><b>${m.goals}</b>goals</span><span><b>${m.assists}</b>assists</span><span><b>${m.mom}</b>MOTM</span><span><b>${f1(m.ratingAve)}</b>rating</span></span></a>`).join('');

  const ins = teamInsights(ms);
  $('#team-insights').innerHTML = ins.length ? ins.slice(0, 3).join('') : '<li class="empty">Nog te weinig wedstrijden voor patronen.</li>';

  const players = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))], pairs = [];
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
    const A = players[i], B = players[j], both = ms.filter(m => has(m, A) && has(m, B)), one = ms.filter(m => has(m, A) !== has(m, B));
    if (both.length < 3 || one.length < 3) continue;
    const sb2 = summarize(both), so = summarize(one);
    pairs.push({ pair: `${A} + ${B}`, nBoth: sb2.n, rb: sb2.resid, nOne: so.n, ro: so.resid, syn: sb2.resid - so.resid });
  }
  pairs.sort((x, y) => y.syn - x.syn);
  table($('#tbl-pairs'), [{ label: 'Tweetal', key: 'pair' }, { label: 'Samen', num: true, render: r => `${residCell(r.rb)} <small>(${r.nBoth})</small>` }, { label: 'Apart', num: true, render: r => `${residCell(r.ro)} <small>(${r.nOne})</small>` }, { label: 'Verschil', num: true, render: r => residCell(r.syn) }], pairs.slice(0, 5), { empty: 'Nog geen tweetal dat zowel samen als apart minstens drie keer speelde.', rowClass: r => (r.nBoth < 5 || r.nOne < 5) ? 'low' : '' });
}

addEventListener('resize', () => DATA && render());
window.rerender = () => render();
loadData().then(render).catch(showError);
