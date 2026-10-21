// Analyseert de eventcodes in match_event_aggregate_* van alle speler-wedstrijden (beide clubs).
// Leest uit matches.raw, omdat EA het veld _0 afkapt op ~250 tekens en de rest in _1.._3 zet;
// de kolom player_match_stats.event_aggregate bevat (voor oudere rijen) alleen _0.
//
// Gebruik: node src/decode-events.js [--json pad] [--min N] [--code C]
//   --json  schrijft alle statistieken als JSON weg
//   --min   minimum aantal speler-wedstrijden waarin een code voorkomt (standaard 3)
//   --code  toont alleen details voor één code
import { openDb } from './db.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { parseEventString } from './events.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const JSON_OUT = opt('--json', null);
const MIN_N = Number(opt('--min', 3));
const ONLY = opt('--code', null);

const num = v => (v === undefined || v === null || v === '' ? 0 : Number(v));
const db = openDb();

// ---- dataset opbouwen ------------------------------------------------------
const rows = [];
for (const { raw, match_id } of db.prepare('SELECT match_id, raw FROM matches').all()) {
  const m = JSON.parse(raw);
  const clubIds = Object.keys(m.clubs || {});
  for (const cid of clubIds) {
    const club = m.clubs[cid];
    const opp = m.clubs[clubIds.find(c => c !== cid)] || {};
    const players = Object.values(m.players?.[cid] || {});
    const team = {};
    for (const f of ['goals', 'assists', 'shots', 'passattempts', 'passesmade', 'tackleattempts', 'tacklesmade', 'saves', 'redcards'])
      team[f] = players.reduce((s, p) => s + num(p[f]), 0);
    for (const p of players) {
      const events = parseEventString([0, 1, 2, 3].map(i => p[`match_event_aggregate_${i}`] || '').filter(Boolean).join(','));
      const known = {
        goals: num(p.goals), assists: num(p.assists), shots: num(p.shots),
        pass_attempts: num(p.passattempts), passes_made: num(p.passesmade),
        tackle_attempts: num(p.tackleattempts), tackles_made: num(p.tacklesmade),
        saves: num(p.saves), red_cards: num(p.redcards), mom: num(p.mom),
        cleansheet_any: num(p.cleansheetsany), cleansheet_gk: num(p.cleansheetsgk), cleansheet_def: num(p.cleansheetsdef),
        seconds_played: num(p.secondsPlayed), game_time: num(p.gameTime), realtime_game: num(p.realtimegame), realtime_idle: num(p.realtimeidle),
        goals_conceded: num(p.goalsconceded), rating: num(p.rating),
        ball_dive_saves: num(p.ballDiveSaves), cross_saves: num(p.crossSaves), good_direction_saves: num(p.goodDirectionSaves),
        parry_saves: num(p.parrySaves), punch_saves: num(p.punchSaves), reflex_saves: num(p.reflexSaves),
        wins: num(p.wins), losses: num(p.losses),
        // afgeleide velden
        passes_failed: num(p.passattempts) - num(p.passesmade),
        shots_missed: num(p.shots) - num(p.goals),
        tackles_failed: num(p.tackleattempts) - num(p.tacklesmade),
        goal_involvements: num(p.goals) + num(p.assists),
        team_goals: num(club.goals), team_goals_against: num(club.goalsAgainst),
        team_shots: team.shots, team_passes_made: team.passesmade, team_pass_attempts: team.passattempts,
        team_tackles_made: team.tacklesmade, team_tackle_attempts: team.tackleattempts,
        team_goals_by_players: team.goals, team_assists: team.assists,
        teammate_goals: team.goals - num(p.goals),
        opp_goals: num(opp.goals),
        result_w: num(club.wins), result_l: num(club.losses), result_d: num(club.ties),
        team_size: players.length,
      };
      rows.push({ match_id, club_id: cid, player: p.playername, pos: p.pos, archetype: num(p.archetypeid), events, known, overflow: Boolean(p.match_event_aggregate_1) });
    }
  }
}

const codes = [...new Set(rows.flatMap(r => Object.keys(r.events)))].sort((a, b) => Number(a) - Number(b));
const knownFields = Object.keys(rows[0].known);

// ---- statistiek ------------------------------------------------------------
function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}
const mean = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

const stats = {};
for (const code of codes) {
  const xs = rows.map(r => r.events[code] || 0);
  const present = xs.filter(x => x > 0).length;
  const s = {
    code, present, present_pct: present / rows.length, total: xs.reduce((a, b) => a + b, 0),
    mean_per_row: mean(xs), max: Math.max(...xs),
    by_pos: {}, by_result: {}, matches: [], relations: [],
  };
  for (const pos of ['goalkeeper', 'defender', 'midfielder', 'forward']) {
    const sub = rows.filter(r => r.pos === pos);
    if (sub.length) s.by_pos[pos] = { n: sub.length, mean: mean(sub.map(r => r.events[code] || 0)) };
  }
  for (const [label, key] of [['W', 'result_w'], ['L', 'result_l'], ['D', 'result_d']]) {
    const sub = rows.filter(r => r.known[key] === 1);
    if (sub.length) s.by_result[label] = { n: sub.length, mean: mean(sub.map(r => r.events[code] || 0)) };
  }
  for (const f of knownFields) {
    const ys = rows.map(r => r.known[f]);
    const r = pearson(xs, ys);
    const exact = rows.filter((row, i) => xs[i] === ys[i]).length / rows.length;
    const le = rows.filter((row, i) => xs[i] <= ys[i]).length / rows.length;
    const ge = rows.filter((row, i) => xs[i] >= ys[i]).length / rows.length;
    if (Math.abs(r) >= 0.5 || exact >= 0.9) s.matches.push({ field: f, r: +r.toFixed(3), exact: +exact.toFixed(3), le: +le.toFixed(3), ge: +ge.toFixed(3) });
  }
  s.matches.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  stats[code] = s;
}

// Relaties tussen codes onderling: a == b, a <= b altijd, a == b + c.
const freq = codes.filter(c => stats[c].present >= Math.max(MIN_N, 5));
const vec = Object.fromEntries(freq.map(c => [c, rows.map(r => r.events[c] || 0)]));
for (const a of freq) for (const b of freq) {
  if (a === b) continue;
  const eq = rows.filter((_, i) => vec[a][i] === vec[b][i]).length / rows.length;
  const le = rows.filter((_, i) => vec[a][i] <= vec[b][i]).length / rows.length;
  const r = pearson(vec[a], vec[b]);
  if (eq >= 0.95) stats[a].relations.push({ type: '==', other: b, share: +eq.toFixed(3), r: +r.toFixed(3) });
  else if (le === 1 && r > 0.5 && stats[b].present > stats[a].present * 0.9) stats[a].relations.push({ type: '<=', other: b, share: 1, r: +r.toFixed(3) });
  else if (Math.abs(r) >= 0.9) stats[a].relations.push({ type: 'r', other: b, share: null, r: +r.toFixed(3) });
}
for (const a of freq) for (let i = 0; i < freq.length; i++) for (let j = i + 1; j < freq.length; j++) {
  const b = freq[i], c = freq[j];
  if (a === b || a === c) continue;
  const share = rows.filter((_, k) => vec[a][k] === vec[b][k] + vec[c][k]).length / rows.length;
  if (share >= 0.95 && stats[a].total > 0) stats[a].relations.push({ type: '== sum', other: `${b} + ${c}`, share: +share.toFixed(3) });
}

// ---- uitvoer ---------------------------------------------------------------
const fmt = (x, d = 2) => (x === undefined ? '-' : Number(x).toFixed(d));
console.log(`Speler-wedstrijden: ${rows.length} (${rows.filter(r => r.overflow).length} met overflow in _1), wedstrijden: ${new Set(rows.map(r => r.match_id)).size}, codes: ${codes.length}\n`);
const shown = ONLY ? [ONLY] : codes.filter(c => stats[c].present >= MIN_N);
console.log('code | in n rijen | gem/rij | max | GK/DEF/MID/FWD gem | W/L gem | beste matches (veld r exact) | relaties');
for (const c of shown) {
  const s = stats[c];
  const pos = ['goalkeeper', 'defender', 'midfielder', 'forward'].map(p => s.by_pos[p] ? fmt(s.by_pos[p].mean, 1) : '-').join('/');
  const res = ['W', 'L'].map(p => s.by_result[p] ? fmt(s.by_result[p].mean, 1) : '-').join('/');
  const m = s.matches.slice(0, 3).map(x => `${x.field} r${fmt(x.r)} =${fmt(x.exact)}`).join('; ');
  const rel = s.relations.slice(0, 4).map(x => `${x.type} ${x.other}${x.share != null ? ` (${fmt(x.share)})` : ''}${x.r != null ? ` r${fmt(x.r)}` : ''}`).join('; ');
  console.log(`${c.padStart(4)} | ${String(s.present).padStart(3)} | ${fmt(s.mean_per_row).padStart(6)} | ${String(s.max).padStart(3)} | ${pos.padEnd(18)} | ${res.padEnd(9)} | ${m} | ${rel}`);
}
if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify({ rows: rows.length, stats }, null, 1)); console.log(`\nJSON: ${JSON_OUT}`); }

// ---- toets van codeboek-hypothesen -----------------------------------------
// Elke regel: naam, functie(events, known) -> [links, rechts]. Gerapporteerd: % rijen exact gelijk,
// % rijen links <= rechts, gemiddeld verschil en Pearson r.
const E = (ev, ...codes) => codes.reduce((s, c) => s + (ev[c] || 0), 0);
const HYPOTHESES = [
  ['goals = 214', (e, k) => [k.goals, E(e, 214)]],
  ['assists = 11', (e, k) => [k.assists, E(e, 11)]],
  ['shots = 217 + 218', (e, k) => [k.shots, E(e, 217, 218)]],
  ['passes_made = 215', (e, k) => [k.passes_made, E(e, 215)]],
  ['passes_made = 215 + 153 (offside-passes)', (e, k) => [k.passes_made, E(e, 215, 153)]],
  ['passes_failed = 216', (e, k) => [k.passes_failed, E(e, 216)]],
  ['pass_attempts = 215 + 216', (e, k) => [k.pass_attempts, E(e, 215, 216)]],
  ['pass_attempts = 215 + 216 + 153', (e, k) => [k.pass_attempts, E(e, 215, 216, 153)]],
  ['tackles_made = 164', (e, k) => [k.tackles_made, E(e, 164)]],
  ['tackles_made = 0', (e, k) => [k.tackles_made, E(e, 0)]],
  ['tackles_made = 229 + 230', (e, k) => [k.tackles_made, E(e, 229, 230)]],
  ['tackle_attempts = 0 + 1', (e, k) => [k.tackle_attempts, E(e, 0, 1)]],
  ['tackle_attempts = 163 + 164', (e, k) => [k.tackle_attempts, E(e, 163, 164)]],
  ['tackle_attempts = 1 + 164', (e, k) => [k.tackle_attempts, E(e, 1, 164)]],
  ['tackles_failed = 1', (e, k) => [k.tackles_failed, E(e, 1)]],
  ['tackles_failed = 163', (e, k) => [k.tackles_failed, E(e, 163)]],
  ['red_cards = 94', (e, k) => [k.red_cards, E(e, 94)]],
  ['red_cards = 96', (e, k) => [k.red_cards, E(e, 96)]],
  ['red_cards <= 95 + 213 (2e geel?)', (e, k) => [k.red_cards, E(e, 95, 213)]],
  ['cleansheet_any = 113', (e, k) => [k.cleansheet_any, E(e, 113)]],
  ['mom = 113', (e, k) => [k.mom, E(e, 113)]],
  ['result_w = 113', (e, k) => [k.result_w, E(e, 113)]],
  ['217 = 13 + 18', e => [E(e, 217), E(e, 13, 18)]],
  ['218 = 14 + 19', e => [E(e, 218), E(e, 14, 19)]],
  ['217 = 214 + 202 (op doel = goals + gered)', e => [E(e, 217), E(e, 214, 202)]],
  ['217 >= 214 + 202', e => [E(e, 214, 202), E(e, 217)]],
  ['219 = 99+100+101+102+103', e => [E(e, 219), E(e, 99, 100, 101, 102, 103)]],
  ['164 = 229 + 230', e => [E(e, 164), E(e, 229, 230)]],
  ['0 = 164', e => [E(e, 0), E(e, 164)]],
  ['0 = 229 + 230', e => [E(e, 0), E(e, 229, 230)]],
  ['121 = 229', e => [E(e, 121), E(e, 229)]],
  ['120 = 230', e => [E(e, 120), E(e, 230)]],
  ['166 = 120', e => [E(e, 166), E(e, 120)]],
  ['215 = 30 + 32 + 34 (richting)', e => [E(e, 215), E(e, 30, 32, 34)]],
  ['215 = 24 + 26 + 28 + 36 (lengte)', e => [E(e, 215), E(e, 24, 26, 28, 36)]],
  ['216 = 31 + 33 + 35 (richting)', e => [E(e, 216), E(e, 31, 33, 35)]],
  ['216 = 25 + 27 + 29 + 37 (lengte)', e => [E(e, 216), E(e, 25, 27, 29, 37)]],
  ['157 = 36 + 37 (voorzetten totaal)', e => [E(e, 157), E(e, 36, 37)]],
  ['38 <= 119', e => [E(e, 38), E(e, 119)]],
  ['119 <= 112', e => [E(e, 119), E(e, 112)]],
  ['112 <= 174', e => [E(e, 112), E(e, 174)]],
  ['112 <= 97', e => [E(e, 112), E(e, 97)]],
  ['174 <= 97 ?', e => [E(e, 174), E(e, 97)]],
  ['118 <= 11', e => [E(e, 118), E(e, 11)]],
  ['118 <= 152', e => [E(e, 118), E(e, 152)]],
  ['12 <= 214', e => [E(e, 12), E(e, 214)]],
  ['131 <= 214', e => [E(e, 131), E(e, 214)]],
  ['125 <= 214', e => [E(e, 125), E(e, 214)]],
  ['128 <= 214', e => [E(e, 128), E(e, 214)]],
  ['171 = 2 + 3 (fouten totaal)', e => [E(e, 171), E(e, 2, 3)]],
  ['95 <= 2 + 3', e => [E(e, 95), E(e, 2, 3)]],
  ['94 <= 3', e => [E(e, 94), E(e, 3)]],
  ['8 <= 143', e => [E(e, 8), E(e, 143)]],
  ['143 <= 215 + 216', e => [E(e, 143), E(e, 215, 216)]],
  ['153 <= 216 ?', e => [E(e, 153), E(e, 216)]],
  ['204 <= 216 ?', e => [E(e, 204), E(e, 216)]],
  ['16 <= 14', e => [E(e, 16), E(e, 14)]],
  ['21 <= 218', e => [E(e, 21), E(e, 218)]],
  ['114 <= 215 (sleutelpasses?)', e => [E(e, 114), E(e, 215)]],
  ['114 >= 11 ?', e => [E(e, 11), E(e, 114)]],
  ['211 <= 112', e => [E(e, 211), E(e, 112)]],
  ['162 <= 164', e => [E(e, 162), E(e, 164)]],
  ['150 <= 24', e => [E(e, 150), E(e, 24)]],
  ['105+106+107 (balverlies) vs 216 + 1 + 218', e => [E(e, 105, 106, 107), E(e, 216, 1, 218)]],
  ['108+109+110 (balwinst) vs 0 + 6', e => [E(e, 108, 109, 110), E(e, 0, 6)]],
  ['108+109+110 >= 164 + 6', e => [E(e, 164, 6), E(e, 108, 109, 110)]],
  ['158 <= 108+109+110', e => [E(e, 158), E(e, 108, 109, 110)]],
];
console.log('\nToets van codeboek-hypothesen (n = ' + rows.length + ')');
console.log('hypothese | exact % | links<=rechts % | gem. links | gem. rechts | r');
const hyp = {};
for (const [name, fn] of HYPOTHESES) {
  const pairs = rows.map(r => fn(r.events, r.known));
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
  const exact = pairs.filter(([a, b]) => a === b).length / rows.length;
  const le = pairs.filter(([a, b]) => a <= b).length / rows.length;
  const r = pearson(xs, ys);
  hyp[name] = { exact: +exact.toFixed(3), le: +le.toFixed(3), mean_left: +mean(xs).toFixed(2), mean_right: +mean(ys).toFixed(2), r: +r.toFixed(3) };
  console.log(`${name.padEnd(46)} | ${fmt(exact * 100, 1).padStart(6)} | ${fmt(le * 100, 1).padStart(6)} | ${fmt(mean(xs)).padStart(6)} | ${fmt(mean(ys)).padStart(6)} | ${fmt(r)}`);
}
// Rijen waar EA's benoemde velden ver boven de events liggen (bekend verschijnsel).
const odd = rows.filter(r => r.known.pass_attempts > E(r.events, 215, 216, 153) + 5);
console.log(`\nRijen met pass_attempts > events + 5: ${odd.length}` + (odd.length ? '\n' + odd.map(r => `  ${r.player} (${r.pos}) pass_attempts=${r.known.pass_attempts} events=${E(r.events, 215, 216, 153)} seconds=${r.known.seconds_played}`).join('\n') : ''));
if (JSON_OUT) { const j = JSON.parse(readFileSync(JSON_OUT, 'utf8')); j.hypotheses = hyp; writeFileSync(JSON_OUT, JSON.stringify(j, null, 1)); }
