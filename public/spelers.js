// Spelerspagina (docs/coach-logica.md §9a): kaart met vorm, de cijfers per groep naast die van de club, en de laatste
// wedstrijden. Altijd over alle gevolgde wedstrijden (DATA in common.js), dus het groeit mee met elke speelavond.
// Het advies (builds.js), Aan de bal in context en de vorm per sessie staan voorlopig niet op de pagina; de code blijft.

const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);

let selected = null;

function rowsFor(ms, name) { return ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p); }

// De cijfers per groep (coach-logica §9a): per regel de plek onder onze spelers, de speler en de club, elk met groot
// het totaal en klein het getal per wedstrijd (bij een percentage de breuk). De definities staan in stats.js (gedeeld
// met de tegel Compleet op de Club). Bij periode Overall de totalen van EA waar EA die heeft (label EA); in een periode
// de gevolgde wedstrijden, met per cijfer het verschil met de vorige even lange periode. De speler kleurt groen als die
// beter zit dan de club, rood als slechter (lower: lager is beter). Een tik op een regel opent de ranglijst (openStat).
let statItems = [];
// Beter of slechter: binnen 5 % van elkaar (percentages: 2 punten) is gelijk.
const statTone = (me, other, it) => { if (!it.cmp || !me || !other) return '';
  const d = me.v - other.v, same = me.pctPts ? Math.abs(d) <= 2 : Math.abs(d) <= 0.05 * Math.max(Math.abs(other.v), 0.01);
  return same ? 'same' : (d > 0) !== it.lower ? 'better' : 'worse'; };
function statGroups(name, ctx, prevCtx) {
  const gk = (ctx.rows.get(name) || []).some(r => r.p.pos === 'goalkeeper');
  const delta = (me, prev, it) => { if (!prev || !me || !prevCtx || !(prevCtx.rows.get(name) || []).length) return '';
    const d = me.v - prev.v, tone = statTone(me, prev, it);
    const r = me.pctPts ? Math.round(d) : Math.round(10 * d) / 10, txt = r === 0 ? '0' : me.pctPts ? `${r > 0 ? '+' : ''}${r} pt` : signed(r, 1);
    return `<em class="sv-delta ${tone === 'better' ? 'up' : tone === 'worse' ? 'down' : ''}" title="Tegenover ${esc(DATA.period.prev.label)}">${txt}</em>`; };
  const cell = (x, cls = '', extra = '') => x ? `<span class="sv ${cls}"><b>${x.main}</b><small>${x.sub}</small>${extra}</span>` : '<span class="sv"><b>–</b></span>';
  statItems = [];
  return statDefs(gk).map(([title, items]) => `<section class="card stat-group"><h2>${title}</h2>
    <div class="stat-head" aria-hidden="true"><span></span><span></span><span>${esc(proName(name))}</span><span>Club</span></div>
    ${items.map(it => { const me = statValue(it, name, ctx), us = statClub(it, ctx);
      const prev = prevCtx ? statValue(it, name, prevCtx) : null;
      const list = it.cmp ? statRanking(it, ctx) : null, mine = list?.find(e => e.name === name);
      const i = statItems.push({ it, list, us }) - 1;
      const dot = mine ? `<span class="rank-dot metal-${RIM(mine.rank)}" title="Plek ${mine.rank} van ${list.length}">${mine.rank}</span>` : '<span></span>';
      const label = `<span>${it.label}${me?.ea ? '<small class="src" title="Carrièretotaal bij de club volgens EA">EA</small>' : ''}</span>`;
      const inner = `${label}${dot}${cell(me, statTone(me, us, it), delta(me, prev, it))}${cell(us)}`;
      return list ? `<button type="button" class="stat-row" data-i="${i}" aria-haspopup="dialog" aria-label="${it.label}: ranglijst">${inner}</button>`
        : `<div class="stat-row">${inner}</div>`; }).join('')}</section>`).join('');
}

// De ranglijst van één maat (coach-logica §9a): plek, speler, groot per wedstrijd of percentage, klein totaal of breuk.
function openStat(i) {
  const { it, list, us } = statItems[i], d = $('#rank-dialog');
  const what = list[0]?.x.pctPts ? 'Het percentage' : 'Het gemiddelde per wedstrijd', ea = list[0]?.x.ea;
  d.querySelector('.rd-body').innerHTML = `<h2 id="rd-title">${it.label}</h2>
    <p>${what}${it.lower ? ', lager is beter' : ''}${ea ? ', over de hele carrière bij de club volgens EA' : DATA.period.type === 'all' ? ', over de gevolgde wedstrijden' : `, ${esc(DATA.period.label.toLowerCase())}`}; bij een gelijk getal beslist het totaal. Mee doet wie minstens ${STAT_MIN_N} wedstrijden heeft${list[0]?.x.pctPts ? ` en ${STAT_MIN_DEN} pogingen` : ''}.</p>
    <ol class="rd-list">${list.map(e => `<li class="${e.name === selected ? 'me' : ''}"><span class="rank-dot metal-${RIM(e.rank)}">${e.rank}</span><span>${esc(proName(e.name))}</span><b>${e.x.big}</b><small>${esc(e.x.small)}</small></li>`).join('') || '<li class="empty">Nog te weinig wedstrijden.</li>'}
    ${us ? `<li class="rd-club"><span></span><span>Club</span><b>${us.big}</b><small>${us.pctPts ? esc(us.small) : 'per speler per wedstrijd'}</small></li>` : ''}</ol>`;
  d.showModal();
}

// Groei (coach-logica §9a, 4): eerder (carrière bij EA min de gevolgde wedstrijden) tegenover nu (de gevolgde). Een
// verschil is beduidend boven twee keer de onzekerheid; bij de rating plus de afronding van EA.
const MIN_EARLIER = 10;
function growthCard(name, rows) {
  const c = DATA.members.find(m => m.name === name), n2 = rows.length, n1 = c ? c.gamesPlayed - n2 : 0;
  const since = new Date(DATA.allMatches[0].ts * 1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '');
  if (!c || n1 < MIN_EARLIER) return `<p class="empty">Te weinig wedstrijden van vóór ${since} om te vergelijken${c ? ` (${n1})` : ''}.</p>`;
  const rated = rows.filter(r => r.p.rating !== null).map(r => r.p.rating), r2 = avg(rated);
  const sd = Math.sqrt(rated.reduce((a, x) => a + (x - r2) ** 2, 0) / Math.max(1, rated.length - 1));
  const r1 = (c.ratingAve * c.gamesPlayed - r2 * n2) / n1;
  const items = [{ label: 'Rating', a: r1, b: r2, lim: 2 * sd * Math.sqrt(1 / n1 + 1 / n2) + 0.05 * c.gamesPlayed / n1 }];
  for (const [label, key, f] of [['Goals', 'goals', p => p.goals], ['Assists', 'assists', p => p.assists], ['Man of the match', 'mom', p => p.mom]]) {
    const now = sum(rows, r => f(r.p)), a = Math.max(0, c[key] - now) / n1, b = now / n2;
    items.push({ label, a, b, lim: 2 * Math.sqrt(a / n1 + b / n2) });
  }
  const tone = it => it.b - it.a > it.lim ? 'better' : it.a - it.b > it.lim ? 'worse' : '';
  const rt = tone(items[0]), d = Math.round(10 * (items[0].b - items[0].a)) / 10 || 0;
  const verdict = rt === 'better' ? `Beduidend beter dan eerder: rating ${signed(d, 1)}.` : rt === 'worse' ? `Beduidend minder dan eerder: rating ${signed(d, 1)}.` : `Geen duidelijk verschil met eerder in rating (${signed(d, 1)}).`;
  return `<p class="growth-verdict ${rt}">${verdict}</p>
    <div class="stat-head growth-head" aria-hidden="true"><span></span><span title="Vóór ${since}">Eerder · ${n1}</span><span title="Sinds ${since}">Nu · ${n2}</span></div>
    ${items.map(it => `<div class="stat-row growth-row"><span>${it.label}</span><span class="sv"><b>${f1(it.a)}</b></span><span class="sv ${tone(it)}"><b>${f1(it.b)}</b></span></div>`).join('')}`;
}

// Biografie (personas.js, coach-logica §9): de titel van de bio is de kop van het kaartje; eerst een paar zinnen die naar de achtergrond vervagen, met *Lees meer*
// eronder; open de feiten en het hele verhaal. Zonder bio de achtergrond; zonder beide "Nog geen biografie".
function renderBio(name) {
  const p = typeof PERSONAS !== 'undefined' ? PERSONAS[name] : null, b = p?.bio, el = $('#p-bio');
  el.hidden = false;
  const paras = b ? b.tekst : p?.achtergrond ? [p.achtergrond] : [];
  const chev = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  el.innerHTML = `<h2>${esc(b?.titel || 'Biografie')}</h2>
    ${paras.length ? `<div class="bio-body" id="bio-body">${b?.feiten ? `<dl class="bio-facts">${b.feiten.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}${paras.map(t => `<p class="bio-text">${esc(t)}</p>`).join('')}</div>
      <button type="button" class="bio-more" aria-expanded="false" aria-controls="bio-body"><span>Lees meer</span>${chev}</button>` : '<p class="bio-text muted">Nog geen biografie.</p>'}`;
  const body = el.querySelector('.bio-body'), btn = el.querySelector('.bio-more');
  if (!body) return;
  // Kort genoeg om in één keer te passen: geen vervaging en geen knop.
  requestAnimationFrame(() => { if (body.scrollHeight <= body.clientHeight + 4) { body.classList.add('all'); btn.hidden = true; } });
  btn.addEventListener('click', () => { const open = body.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open)); btn.querySelector('span').textContent = open ? 'Minder' : 'Lees meer'; });
}

// Selectie (coach-logica §9a, Spelers): de lijst van iedereen in het team, op vorm, met de kaart, de naam, wat
// basiscijfers volgens EA, de vorm van de laatste vijf, en een stukje van de bio. Onderaan de AI, die altijd meedoet.
function renderSquad() {
  $('#squad').hidden = false; $('#player-view').hidden = true;
  document.title = 'Selectie · Frambroos Coach';
  const fav = favorite(), ms = DATA.matches;
  const members = DATA.members.map(m => ({ m, t: PlayerCard.tier(m.name) }))
    .sort((a, b) => (b.m.name === fav) - (a.m.name === fav) || PlayerCard.TIER_RANK[b.t.tier] - PlayerCard.TIER_RANK[a.t.tier] || (b.t.level ?? 0) - (a.t.level ?? 0) || (b.m.gamesPlayed || 0) - (a.m.gamesPlayed || 0));
  // Per speler (coach-logica §9a, Selectie): de spelerskaart groter (daar staan de cijfers al op), rechts ervan de
  // biografie. Geen losse cijfers, geen vorm per wedstrijd: dat staat al op de kaart of zegt weinig (iedereen speelt
  // dezelfde wedstrijden).
  const rowsHtml = members.map(({ m }) => {
    const p = typeof PERSONAS !== 'undefined' ? PERSONAS[m.name] : null, b = p?.bio;
    // De biografie zelf; de lengte regelt de css: afgekapt op een paar regels, op telefoon korter dan op een groot scherm.
    const text = b ? b.tekst.join(' ') : p?.achtergrond || '';
    const on = m.name === fav;
    return `<a class="squad-row card" href="spelers.html#${encodeURIComponent(m.name)}" aria-label="${esc(proName(m.name))}">
      <button type="button" class="sq-fav" data-fav="${esc(m.name)}" aria-pressed="${on}" aria-label="${on ? 'Favoriet, tik om weg te halen' : 'Maak favoriet'}" title="${on ? 'Je favoriet' : 'Maak favoriet'}">${STAR}</button>
      <span class="fut-mini sq-card">${PlayerCard.html(m.name, { key: '-sq' })}</span>
      <span class="sq-side">
        ${b ? `<b class="sq-title">${esc(b.titel)}</b>` : ''}
        ${text ? `<span class="sq-bio">${esc(text)}</span>` : '<span class="sq-bio muted">Nog geen biografie.</span>'}
        <span class="sq-more">Naar het profiel</span>
      </span>
    </a>`;
  });
  // De AI: niets per speler in de data, wel hoeveel plekken en welke goals (clubscore min de goals van de mensen).
  const aiGames = ms.filter(m => (m.ai?.players ?? 0) > 0).length, aiGoals = ms.reduce((a, m) => a + Math.max(0, m.ai?.goals ?? 0), 0);
  const aiSlots = ms.length ? ms.reduce((a, m) => a + (m.ai?.players ?? 0), 0) / ms.length : 0;
  rowsHtml.push(`<div class="squad-row card ai">
      <span class="sq-card sq-ai" aria-hidden="true">AI</span>
      <span class="sq-side"><b class="sq-title">De AI, de onzichtbare twaalfde man</b><span class="sq-bio">Vult elke lege plek (gemiddeld ${f1(aiSlots)} per wedstrijd), klaagt nooit en komt nooit in de ranglijst. In ${aiGames} wedstrijden goed voor ${aiGoals} goals: goals die geen mens van ons maakte, soms ook een eigen doelpunt van de tegenstander.</span></span>
    </div>`);
  $('#squad-list').innerHTML = rowsHtml.join('');
  // Favoriet met het sterretje linksboven in de rij, zonder het profiel te openen.
  for (const btn of $('#squad-list').querySelectorAll('.sq-fav')) btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); setFavorite(btn.getAttribute('aria-pressed') === 'true' ? null : btn.dataset.fav); renderSquad(); });
  PlayerCard.reveal($('#squad-list'));
}

function renderPlayer() {
  $('#squad').hidden = true; $('#player-view').hidden = false;
  // De gekozen periode (menu); speelde niemand in die periode, dan blijft de keuze uit alle spelers.
  const ms = DATA.matches, players = DATA.players.length ? DATA.players : [...new Set(DATA.allMatches.flatMap(m => m.players.map(p => p.name)))];
  // Zonder naam in het adres: de favoriet van wie de app gebruikt, anders Neegek. De favoriet staat vooraan met een ster.
  const fav = players.includes(favorite()) ? favorite() : null;
  if (!selected || !players.includes(selected)) selected = fav || (players.includes('Neegek') ? 'Neegek' : players[0]);
  location.hash = encodeURIComponent(selected);
  const order = fav ? [fav, ...players.filter(p => p !== fav)] : players;
  // Wisselen van speler met een keuzemenu bovenaan (geen pillen meer); de favoriet staat bovenaan met een ster.
  $('#p-pick').innerHTML = order.map(p => `<option value="${esc(p)}"${p === selected ? ' selected' : ''}>${p === fav ? '★ ' : ''}${esc(proName(p))}</option>`).join('');
  $('#p-pick').onchange = e => { location.hash = encodeURIComponent(e.target.value); };

  const rows = rowsFor(ms, selected);
  window.PlayerCard.render(selected);
  renderBio(selected);
  const on = fav === selected;
  $('#player-hero').insertAdjacentHTML('afterbegin', `<button type="button" class="fav-btn" aria-pressed="${on}" aria-label="${on ? 'Favoriet, tik om weg te halen' : 'Maak favoriet'}" title="${on ? 'Favoriet: tik om weg te halen' : 'Maak deze speler je favoriet (er kan er één zijn)'}">${STAR}<span>${on ? 'Favoriet' : 'Favoriet maken'}</span></button>`);
  $('#player-hero .fav-btn').addEventListener('click', () => { setFavorite(on ? null : selected); renderPlayer(); });
  document.title = `${proName(selected)} · Frambroos Coach`;
  // Overall: EA-totalen waar EA ze heeft; een periode: de gevolgde wedstrijden, met de vorige even lange periode erbij.
  const period = DATA.period.type !== 'all', ctx = statContext(ms, { ea: !period }), prevCtx = period ? statContext(DATA.prevMatches) : null;
  $('#p-stats').innerHTML = rows.length || !period ? statGroups(selected, ctx, prevCtx) : '<p class="empty">Geen wedstrijden in deze periode.</p>';
  for (const b of $('#p-stats').querySelectorAll('button.stat-row')) b.addEventListener('click', () => openStat(+b.dataset.i));
  $('#p-growth').innerHTML = growthCard(selected, rowsFor(DATA.allMatches, selected)); // groei: altijd over alles

  table($('#tbl-player-matches'), [
    { label: 'Datum', render: r => fmtDateTime(r.m.ts) }, { label: 'Tegenstander', render: r => `<a href="${matchHref(r.m)}">${esc(r.m.opponent.name)}</a>` },
    { label: 'Score', num: true, render: r => `${r.m.goals}–${r.m.goalsAgainst}` }, { label: 'Uitslag', render: r => `<span class="pill ${r.m.result}">${r.m.result === 'D' ? 'G' : r.m.result === 'L' ? 'V' : 'W'}</span>` },
    { label: 'Rating', num: true, render: r => r.p.rating }, { label: 'Index', num: true, render: r => fiFmt(r.p.fi) }, { label: 'G + A', num: true, render: r => `${r.p.goals} + ${r.p.assists}` },
  ], [...rows].reverse().map((r, i) => ({ ...r, i })), { rowClass: r => r.i >= PM_SHOWN ? 'pm-extra' : '' });
  // Eerst de laatste acht; de rest achter een knop.
  const wrap = $('#tbl-player-matches'), extra = rows.length - PM_SHOWN;
  wrap.classList.remove('show-all');
  if (extra > 0) {
    wrap.insertAdjacentHTML('beforeend', `<button type="button" class="more-btn">Alle ${rows.length} wedstrijden</button>`);
    wrap.querySelector('.more-btn').addEventListener('click', e => { wrap.classList.add('show-all'); e.currentTarget.remove(); });
  }
}
const PM_SHOWN = 8;

const route = () => { if (!DATA) return; if (location.hash.length > 1) renderPlayer(); else renderSquad(); };
onWidthChange(route);
$('#rank-dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('.rd-close')) e.currentTarget.close(); });
// Andere speler in het menu: meteen tekenen als de data er is, anders onthouden voor zodra die geladen is.
// Zonder naam in het adres: de selectie; met naam: die speler. Het keuzemenu en het menu zetten de naam in het adres.
addEventListener('hashchange', () => { const n = decodeURIComponent(location.hash.slice(1)); if (n && n !== selected) selected = n; if (!n) selected = null; route(); scrollTo(0, 0); });
selected = decodeURIComponent(location.hash.slice(1)) || null;
window.rerender = route; // thema wisselen: kaart opnieuw in thuis- of uitkleuren
Promise.all([loadData(), window.BuildTab.load(), window.PlayerCard.load()]).then(route).catch(showError);
