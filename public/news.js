// Nieuws (docs/coach-logica.md §9a): één artikel per sessie, geschreven uit wat er tot en met die avond bekend was.
// Gedeeld door het Clubhouse (het nieuwste artikel) en de nieuwspagina (alle artikelen). Heeft playercard.js nodig.

const bigNum = (v, small = '') => `<span class="news-big">${v}${small ? `<small>${small}</small>` : ''}</span>`;

// Het artikel van één sessie: de kop van het sterkste bericht (volgorde van de tabel in §9a), anders de speelavond.
function articleFor(sess, latest) {
  const night = sess.matches, end = night.at(-1).ts, start = night[0].ts;
  const upTo = DATA.matches.filter(m => m.ts <= end), before = DATA.matches.filter(m => m.ts < start);
  const s = summarize(night), gd = night.reduce((a, m) => a + m.goalDiff, 0), best = bestOfNight(night);
  const weekday = new Date(end * 1000).toLocaleDateString('nl-NL', { weekday: 'long' });
  const parts = [s.W ? `${numWord(s.W)} ${s.W === 1 ? 'zege' : 'zeges'}` : '', s.D ? `${numWord(s.D)} ${s.D === 1 ? 'gelijkspel' : 'gelijke spelen'}` : '', s.L ? `${numWord(s.L)} ${s.L === 1 ? 'nederlaag' : 'nederlagen'}` : ''].filter(Boolean);
  const nightLine = `${capFirst(joinAnd(parts))} op ${weekday}, doelsaldo ${signed(gd, 0)}.`;
  const base = { ts: end, href: `sessies.html#${sess.id}` };
  const rowsOf = (list, n) => list.map(m => ({ m, p: m.players.find(p => p.name === n) })).filter(r => r.p);
  const names = [...new Set(night.flatMap(m => m.players.map(p => p.name)))];
  const perfs = night.flatMap(m => m.players.map(p => ({ m, p })));
  const c = [];

  // Topvorm: wie die avond de blauwe kaart kreeg (vorm per sessie, §9c) en hem daarvoor niet had; met de sessiekaart.
  const top = names.map(n => ({ n, now: PlayerCard.tierOf(rowsOf(upTo, n)), was: PlayerCard.tierOf(rowsOf(before, n)) }))
    .filter(x => x.now.tier === 'top' && x.was.tier !== 'top').sort((a, b) => b.now.level - a.now.level);
  if (top.length) c.push({ tag: 'Topvorm', title: `${joinAnd(top.map(x => esc(proName(x.n))))} in topvorm`,
    body: `${joinAnd(top.map(x => `${esc(proName(x.n))} ${f2(x.now.level)}`))} gemiddeld deze avond, en het team won er het grootste deel van.`,
    visual: `<div class="news-cards">${top.slice(0, 3).map(x => `<span class="fut-mini">${PlayerCard.html(x.n, { session: sess.id })}</span>`).join('')}</div>` });

  // Uitschieter: de hoogste rating van de avond, vanaf 9,0.
  const peak = perfs.filter(x => x.p.rating !== null).sort((a, b) => b.p.rating - a.p.rating)[0];
  if (peak && peak.p.rating >= 9) {
    const { m, p } = peak;
    c.push({ tag: 'Uitschieter', title: `${f1(p.rating)} voor ${esc(proName(p.name))} tegen ${esc(m.opponent.name)}`,
      body: `${capFirst(joinAnd([p.goals ? plural(p.goals, 'goal', 'goals') : '', p.assists ? plural(p.assists, 'assist', 'assists') : ''].filter(Boolean))) || 'Zonder goal of assist'}${p.mom ? ', man of the match' : ''}: de hoogste rating van de avond.`,
      visual: bigNum(f1(p.rating)) });
  }

  // Hattrick: drie of meer goals van één speler in één wedstrijd.
  const hat = perfs.filter(x => (x.p.goals || 0) >= 3).sort((a, b) => b.p.goals - a.p.goals)[0];
  if (hat) c.push({ tag: 'Hattrick', title: hat.p.goals === 3 ? `Hattrick voor ${esc(proName(hat.p.name))}` : `${capFirst(numWord(hat.p.goals))} goals voor ${esc(proName(hat.p.name))}`,
    body: `${hat.p.goals} keer raak tegen ${esc(hat.m.opponent.name)}, eindstand ${hat.m.goals}–${hat.m.goalsAgainst}.`, visual: bigNum(hat.p.goals, 'goals') });

  // Grote zege: winst met vier of meer verschil.
  const big = night.filter(m => m.goalDiff >= 4).sort((a, b) => b.goalDiff - a.goalDiff || b.goals - a.goals)[0];
  if (big) {
    const scorers = big.players.filter(p => p.goals).sort((a, b) => b.goals - a.goals).map(p => `${esc(proName(p.name))}${p.goals > 1 ? ` (${p.goals})` : ''}`);
    c.push({ tag: 'Grote zege', title: `${big.goals}–${big.goalsAgainst} tegen ${esc(big.opponent.name)}`,
      body: scorers.length ? `Doelpunten: ${joinAnd(scorers)}.` : 'De grootste zege van de avond.', visual: bigNum(`${big.goals}–${big.goalsAgainst}`) });
  }

  // Scoort op rij: in elk van de laatste drie of meer eigen wedstrijden, tot en met deze avond.
  for (const n of names) {
    const own = rowsOf(upTo, n);
    let k = 0; while (k < own.length && (own[own.length - 1 - k].p.goals || 0) > 0) k++;
    if (k >= 3 && night.includes(own.at(-1).m)) {
      c.push({ tag: 'Scoort op rij', title: `${esc(proName(n))} scoort ${numWord(k)} keer op rij`,
        body: `In elk van de laatste ${k} eigen wedstrijden minstens één goal, samen ${own.slice(-k).reduce((a, x) => a + x.p.goals, 0)}.`, visual: bigNum(`${k}×`) });
      break;
    }
  }

  // De nul: twee of meer clean sheets.
  const cs = night.filter(m => m.goalsAgainst === 0).length;
  if (cs >= 2) c.push({ tag: 'De nul', title: `${capFirst(numWord(cs))} keer de nul gehouden`, body: `${cs} van de ${night.length} wedstrijden zonder tegengoal.`, visual: bigNum(0, 'tegen') });

  // Een avond met minder dan één punt per wedstrijd is zelf het nieuws; een uitblinker verandert dat niet.
  if (c.length && s.ppg >= 1) return { ...base, ...c[0], body: `${c[0].body} ${nightLine}` };
  return { ...base, tag: 'Speelavond', title: capFirst(joinAnd(parts)), visual: formDots(night, { links: false }),
    body: `${plural(night.length, 'wedstrijd', 'wedstrijden')} op ${weekday}, doelsaldo ${signed(gd, 0)}.${best ? ` Beste speler: ${esc(proName(best.n))} met gemiddeld ${f2(best.v)}.` : ''}` };
}

// Alle artikelen, nieuwste eerst: één per sessie van minstens twee wedstrijden.
function newsArticles() {
  const sess = sessionsOf(DATA.matches).filter(s => s.matches.length >= 2);
  return sess.map((s, i) => articleFor(s, i === sess.length - 1)).reverse();
}

const newsCard = (a, { lead = false } = {}) => `<a class="news-item${lead ? ' lead' : ''}" href="${a.href}">
    <span class="news-visual">${a.visual}</span>
    <span class="news-text"><span class="news-tag">${a.tag}</span><span class="news-title">${a.title}</span><span class="news-body">${a.body}</span><time datetime="${new Date(a.ts * 1000).toISOString()}">${dayLabel(a.ts)}</time></span>
  </a>`;
