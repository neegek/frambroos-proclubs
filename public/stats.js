// De cijfers van de spelerspagina (docs/coach-logica.md §9a, Spelerspagina), gedeeld met de Club (tegel Compleet).
// Per cijfer een maat over een set wedstrijdrijen ({ m, p }), de plek onder onze spelers, en bij periode *Overall* het
// carrièretotaal van EA waar EA dat heeft (goals, assists, schoten, conversie, passes, passes gelukt, tackles).

const STAT_MIN_N = 3, STAT_MIN_DEN = 10; // meedoen in een ranglijst: minstens 3 wedstrijden, bij een percentage 10 pogingen
const RIM = rank => rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'iron';
const statSum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const statRowsFor = (ms, name) => ms.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
const wedstrijden = n => `${n} ${n === 1 ? 'wedstrijd' : 'wedstrijden'}`;

// Een uitkomst: groot (main/big) en klein (sub/small), v = het exacte getal, key = zoals het er staat (één decimaal,
// percentage afgerond; daarop delen spelers een plek), total = het totaal (beslist bij een gelijk getal).
const countX = (total, n, ea = false) => n ? { main: String(total), sub: f1(total / n), v: total / n, key: Math.round(10 * total / n), n, ok: n >= STAT_MIN_N, total,
  big: f1(total / n), small: `${total} in ${wedstrijden(n)}`, ea } : null;
const ratioX = (a, b, n, ea = false, rate = null) => { if (!b) return null; const p = rate ?? pct(a, b);
  return { main: fmtPct(p), sub: `${a} van ${b}`, v: rate ?? 100 * a / b, key: Math.round(p), n, ok: n >= STAT_MIN_N && b >= STAT_MIN_DEN, total: a,
    big: fmtPct(p), small: `${a} van ${b}`, pctPts: true, ea }; };

// EA geeft geen pogingen, wel percentages: pogingen = gelukt / percentage (afgerond).
const eaAttempts = (made, rate) => rate > 0 ? Math.round(made / (rate / 100)) : null;
const EA = {
  count: field => ({ of: m => countX(m[field] || 0, m.gamesPlayed || 0, true),
    club: ms => countX(ms.reduce((a, m) => a + (m[field] || 0), 0), ms.reduce((a, m) => a + (m.gamesPlayed || 0), 0), true), total: m => m[field] || 0 }),
  shots: { of: m => { const s = eaAttempts(m.goals || 0, m.shotSuccessRate); return s === null ? null : countX(s, m.gamesPlayed || 0, true); },
    club: ms => countX(ms.reduce((a, m) => a + (eaAttempts(m.goals || 0, m.shotSuccessRate) || 0), 0), ms.reduce((a, m) => a + (m.gamesPlayed || 0), 0), true),
    total: m => eaAttempts(m.goals || 0, m.shotSuccessRate) || 0 },
  ratio: (made, rate) => ({ of: m => ratioX(m[made] || 0, eaAttempts(m[made] || 0, m[rate]), m.gamesPlayed || 0, true, m[rate] ?? null),
    club: ms => ratioX(ms.reduce((a, m) => a + (m[made] || 0), 0), ms.reduce((a, m) => a + (eaAttempts(m[made] || 0, m[rate]) || 0), 0), ms.reduce((a, m) => a + (m.gamesPlayed || 0), 0), true),
    total: m => m[made] || 0 }),
  conversion: { of: m => ratioX(m.goals || 0, eaAttempts(m.goals || 0, m.shotSuccessRate), m.gamesPlayed || 0, true, m.shotSuccessRate ?? null),
    club: ms => ratioX(ms.reduce((a, m) => a + (m.goals || 0), 0), ms.reduce((a, m) => a + (eaAttempts(m.goals || 0, m.shotSuccessRate) || 0), 0), ms.reduce((a, m) => a + (m.gamesPlayed || 0), 0), true),
    total: m => m.goals || 0 },
};

// De cijfers per groep. count/ratio rekenen over wedstrijdrijen; ev: alleen rijen met gebeurtenissen van EA.
// lower: lager is beter. cmp: false = geen plek en geen kleur (reddingen, alleen keepers). ea: het totaal bij EA.
function statDefs(gk = false) {
  const evRows = rows => rows.filter(r => r.p.ev);
  const count = (label, f, { ev = false, lower = false, cmp = true, ea = null } = {}) => ({ label, lower, cmp, ea, of: list => {
    const src = ev ? evRows(list) : list; return countX(statSum(src, r => f(ev ? r.p.ev : r.p, r)), src.length); } });
  const ratio = (label, num, den, { ev = false, lower = false, ea = null } = {}) => ({ label, lower, cmp: true, ea, of: list => {
    const src = ev ? evRows(list) : list; return ratioX(statSum(src, r => num(ev ? r.p.ev : r.p)), statSum(src, r => den(ev ? r.p.ev : r.p)), src.length); } });
  return [
    ['Aanvallen', [
      count('Goals', p => p.goals, { ea: EA.count('goals') }), count('Assists', p => p.assists, { ea: EA.count('assists') }),
      count('Tweede assists', v => v.second_assists, { ev: true }),
      count('Schoten', p => p.shots, { ea: EA.shots }), ratio('Conversie', p => p.goals, p => p.shots, { ea: EA.conversion }),
      count('Dribbels', v => v.dribbles_completed, { ev: true }), count('Tegenstanders uitgespeeld', v => v.players_beaten, { ev: true }),
    ]],
    ['Passen', [
      ratio('Passes gelukt', p => p.passesMade, p => p.passAttempts, { ea: EA.ratio('passesMade', 'passSuccessRate') }),
      count('Passes', p => p.passesMade, { ea: EA.count('passesMade') }),
      count('Steekpasses', v => v.through_balls, { ev: true }), ratio('Vooruit gespeeld', v => v.passes_completed_forward, v => v.passes_completed, { ev: true }),
    ]],
    ['Verdedigen', [
      count('Balwinst', v => v.possession_won, { ev: true }), count('Onderscheppingen', v => v.interceptions, { ev: true }),
      ratio('Tackles gewonnen', p => p.tacklesMade, p => p.tackleAttempts, { ea: EA.ratio('tacklesMade', 'tackleSuccessRate') }),
      count('De nul gehouden', (p, r) => r.m.goalsAgainst === 0 ? 1 : 0),
      gk ? count('Reddingen', p => p.saves, { cmp: false }) : null,
    ]],
    ['Discipline', [
      count('Balverlies', v => v.possession_lost, { ev: true, lower: true }),
      ratio('Uit positie', v => v.out_of_position, v => v.out_of_position + v.in_position, { ev: true, lower: true }),
      count('Overtredingen', v => v.fouls_conceded_total, { ev: true, lower: true }),
      count('Kaarten', (p, r) => (r.p.ev?.yellow_cards_total || 0) + (p.redCards || 0), { lower: true }),
    ]],
  ].map(([t, items]) => [t, items.filter(Boolean)]);
}

// De context van een berekening: de wedstrijden, per speler de rijen, de club, en of EA-totalen meedoen (alleen bij
// periode Overall: EA bewaart geen totalen per periode).
function statContext(ms, { ea = false } = {}) {
  const names = [...new Set(ms.flatMap(m => m.players.map(p => p.name)))];
  const rows = new Map(names.map(n => [n, statRowsFor(ms, n)]));
  const members = ea ? (DATA.members || []).filter(m => m.gamesPlayed > 0) : [];
  for (const m of members) if (!rows.has(m.name)) { rows.set(m.name, []); names.push(m.name); }
  return { ms, names, rows, club: [...rows.values()].flat(), ea, members };
}
const statValue = (it, name, ctx) => {
  const mem = ctx.ea && it.ea ? ctx.members.find(m => m.name === name) : null;
  return mem ? it.ea.of(mem) : it.of(ctx.rows.get(name) || []);
};
const statClub = (it, ctx) => ctx.ea && it.ea && ctx.members.length ? it.ea.club(ctx.members) : it.of(ctx.club);
// De ranglijst van een cijfer: op het getal zoals het er staat; bij gelijk beslist het totaal, dan het exacte getal.
// Alleen bij precies hetzelfde getal en totaal een gedeelde plek (1, 1, 3).
function statRanking(it, ctx) {
  const sign = it.lower ? -1 : 1;
  const list = ctx.names.map(name => ({ name, x: statValue(it, name, ctx) })).filter(e => e.x && e.x.ok)
    .sort((a, b) => sign * (b.x.key - a.x.key) || sign * (b.x.total - a.x.total) || sign * (b.x.v - a.x.v));
  let rank = 0, prev = null;
  return list.map((e, i) => { if (!prev || e.x.key !== prev.x.key || e.x.total !== prev.x.total) rank = i + 1; prev = e; return { ...e, rank }; });
}
// Compleet (coach-logica §9a, Gevaarlijkste spelers): de gemiddelde plek over alle cijfers met een plek. Mee doet wie
// bij minstens de helft van die cijfers een plek heeft. Lager is beter; bij gelijk wint wie vaker eerste is.
function completeRanking(ctx) {
  const items = statDefs(false).flatMap(([, list]) => list).filter(it => it.cmp);
  const by = new Map();
  for (const it of items) for (const e of statRanking(it, ctx)) {
    const b = by.get(e.name) || { name: e.name, ranks: [], firsts: 0 }; b.ranks.push(e.rank); if (e.rank === 1) b.firsts++; by.set(e.name, b);
  }
  return [...by.values()].filter(b => b.ranks.length >= items.length / 2)
    .map(b => ({ ...b, avg: b.ranks.reduce((a, r) => a + r, 0) / b.ranks.length, of: items.length }))
    .sort((a, b) => a.avg - b.avg || b.firsts - a.firsts);
}
