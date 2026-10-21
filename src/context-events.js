// Zet de eventcodes in context: spelersprofielen per 90 minuten, en relaties tussen codes op
// speler-wedstrijdniveau, gecorrigeerd voor hoe vaak iemand aan de bal is (ball_actions).
// Gebruik: node src/context-events.js [--club 837250] [--min 3] [--player Neegek]
import { openDb, config } from './db.js';
import { decodeEvents, fullEventString } from './events.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const CLUB = opt('--club', config.clubId);
const MIN = Number(opt('--min', 3));
const FOCUS = opt('--player', null);
const num = v => (v === undefined || v === null || v === '' ? 0 : Number(v));
const db = openDb();

const rows = [];
for (const { match_id, raw } of db.prepare('SELECT match_id, raw FROM matches').all()) {
  const m = JSON.parse(raw);
  for (const cid of Object.keys(m.clubs || {})) {
    const club = m.clubs[cid];
    for (const p of Object.values(m.players?.[cid] || {})) {
      const ev = fullEventString(p);
      if (!ev || num(p.secondsPlayed) < 60) continue; // niet gespeeld
      const d = decodeEvents(ev);
      rows.push({
        match_id, cid, own: cid === CLUB, name: p.playername, pos: p.pos, minutes: num(p.secondsPlayed) / 60,
        win: num(club.wins), gd: num(club.goals) - num(club.goalsAgainst),
        ea: { goals: num(p.goals), assists: num(p.assists), shots: num(p.shots), pass_attempts: num(p.passattempts), passes_made: num(p.passesmade), tackle_attempts: num(p.tackleattempts), tackles_made: num(p.tacklesmade), rating: num(p.rating) },
        d,
      });
    }
  }
}

// ---- statistiek ----
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
// Partiële correlatie: r tussen x en y nadat beide op z (volume) zijn geregresseerd.
function partial(xs, ys, zs) {
  const resid = (as) => { const r = pearson(as, zs); const sa = Math.sqrt(mean(as.map(a => (a - mean(as)) ** 2))), sz = Math.sqrt(mean(zs.map(z => (z - mean(zs)) ** 2))); const b = sz ? r * sa / sz : 0; const ma = mean(as), mz = mean(zs); return as.map((a, i) => a - ma - b * (zs[i] - mz)); };
  return pearson(resid(xs), resid(ys));
}
const fmt = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? '-' : Number(x).toFixed(d));

// ---- 1. metrics per speler-wedstrijd ----
const M = {
  ball_actions: r => r.d.ball_actions,
  pass_attempts: r => r.d.pass_attempts,
  pass_acc: r => r.d.pass_accuracy,
  forward_share: r => r.d.passes_completed ? r.d.passes_completed_forward / r.d.passes_completed : null,
  long_share: r => r.d.pass_attempts ? (r.d.passes_completed_long + r.d.passes_failed_long) / r.d.pass_attempts : null,
  through_balls: r => r.d.through_balls,
  first_time: r => r.d.first_time_passes,
  crosses: r => r.d.crosses_attempted,
  passes_failed: r => r.d.passes_failed,
  fail_fwd_share: r => r.d.passes_failed ? r.d.passes_failed_forward / r.d.passes_failed : null,
  fb_good_share: r => r.d.feedback_good_share,
  fb_elsewhere: r => r.d.fb_should_have_passed_elsewhere,
  fb_no_option: r => r.d.fb_no_good_option,
  assists: r => r.d.assists,
  goals: r => r.d.goals,
  shots: r => r.d.shots,
  dribbles: r => r.d.dribbles_completed,
  carries: r => r.d.ball_carries,
  beaten: r => r.d.players_beaten,
  lost_total: r => r.d.possession_lost,
  lost_def: r => r.d.possession_lost_def_third,
  lost_mid: r => r.d.possession_lost_mid_third,
  lost_att: r => r.d.possession_lost_att_third,
  won_total: r => r.d.possession_won,
  tackles_won: r => r.d.tackles_won,
  tackles_lost: r => r.d.tackles_lost,
  interceptions: r => r.d.interceptions,
  fouls: r => r.d.fouls_conceded_total,
  fouls_won: r => r.d.fouls_won,
  out_of_pos: r => r.d.out_of_position,
  in_pos: r => r.d.in_position,
  rating: r => r.ea.rating,
};
const COUNTS = new Set(['ball_actions', 'pass_attempts', 'through_balls', 'first_time', 'crosses', 'passes_failed', 'fb_elsewhere', 'fb_no_option', 'assists', 'goals', 'shots', 'dribbles', 'carries', 'beaten', 'lost_total', 'lost_def', 'lost_mid', 'lost_att', 'won_total', 'tackles_won', 'tackles_lost', 'interceptions', 'fouls', 'fouls_won', 'out_of_pos', 'in_pos']);

// ---- 2. profielen per speler (per 90 min, eigen club; tegenstanders als referentie) ----
function profile(group) {
  const out = {}; const mins = group.reduce((s, r) => s + r.minutes, 0);
  for (const [k, f] of Object.entries(M)) {
    if (COUNTS.has(k)) out[k] = group.reduce((s, r) => s + f(r), 0) / mins * 90;
    else { const v = group.map(f).filter(x => x !== null && !Number.isNaN(x)); out[k] = v.length ? mean(v) : null; }
  }
  out.n = group.length; out.minutes = mins;
  // afgeleide verhoudingen
  out.lost_per_100_actions = out.ball_actions ? out.lost_total / out.ball_actions * 100 : null;
  out.lost_att_share = out.lost_total ? out.lost_att / out.lost_total : null;
  out.assists_per_100_pass = out.pass_attempts ? out.assists / out.pass_attempts * 100 : null;
  out.goal_inv_per_100_actions = out.ball_actions ? (out.goals + out.assists) / out.ball_actions * 100 : null;
  return out;
}
const own = rows.filter(r => r.own), opp = rows.filter(r => !r.own);
const byName = {};
for (const r of own) (byName[r.name] ||= []).push(r);
const players = Object.entries(byName).filter(([, g]) => g.length >= MIN).map(([name, g]) => ({ name, pos: g.map(r => r.pos).sort((a, b) => g.filter(r => r.pos === b).length - g.filter(r => r.pos === a).length)[0], ...profile(g) }));
players.push({ name: `(${config.clubName} totaal)`, pos: '', ...profile(own) });
players.push({ name: '(tegenstanders)', pos: '', ...profile(opp) });

const COLS = ['n', 'ball_actions', 'pass_attempts', 'pass_acc', 'forward_share', 'through_balls', 'first_time', 'passes_failed', 'fb_good_share', 'fb_elsewhere', 'assists', 'goals', 'shots', 'dribbles', 'beaten', 'lost_total', 'lost_att_share', 'lost_per_100_actions', 'won_total', 'tackles_won', 'tackles_lost', 'interceptions', 'out_of_pos', 'in_pos', 'rating'];
console.log(`Profielen per 90 minuten (eigen club, min. ${MIN} wedstrijden; aandelen zijn gemiddelden per wedstrijd)\n`);
console.log(['speler', 'pos', ...COLS].join('\t'));
for (const p of players) console.log([p.name, p.pos.slice(0, 3), ...COLS.map(c => fmt(p[c], c === 'n' ? 0 : ['pass_acc', 'forward_share', 'fb_good_share', 'lost_att_share'].includes(c) ? 2 : 1))].join('\t'));

// ---- 3. relaties op speler-wedstrijdniveau, ruw en gecorrigeerd voor volume ----
const vol = rows.map(M.ball_actions);
const PAIRS = [
  ['assists', 'passes_failed'], ['assists', 'through_balls'], ['assists', 'forward_share'], ['assists', 'fail_fwd_share'], ['assists', 'fb_elsewhere'], ['assists', 'lost_att'], ['assists', 'pass_acc'],
  ['lost_total', 'passes_failed'], ['lost_total', 'through_balls'], ['lost_total', 'dribbles'], ['lost_total', 'beaten'], ['lost_total', 'tackles_lost'], ['lost_total', 'fb_elsewhere'], ['lost_total', 'fb_no_option'], ['lost_total', 'first_time'], ['lost_total', 'forward_share'],
  ['lost_att', 'through_balls'], ['lost_att', 'dribbles'], ['lost_att', 'shots'], ['lost_att', 'crosses'], ['lost_def', 'passes_failed'], ['lost_def', 'tackles_lost'],
  ['through_balls', 'passes_failed'], ['through_balls', 'pass_acc'], ['forward_share', 'pass_acc'], ['fb_good_share', 'pass_acc'], ['fb_good_share', 'assists'], ['fb_good_share', 'lost_total'],
  ['goals', 'lost_att'], ['goals', 'dribbles'], ['rating', 'lost_total'], ['rating', 'pass_acc'], ['rating', 'passes_failed'], ['rating', 'through_balls'], ['rating', 'fb_good_share'],
  ['won_total', 'lost_total'], ['out_of_pos', 'lost_total'], ['in_pos', 'ball_actions'],
];
console.log('\nRelaties per speler-wedstrijd (n = ' + rows.length + '): r ruw, r na correctie voor ball_actions (volume)');
console.log('x\ty\tr\tr|volume');
for (const [a, b] of PAIRS) {
  const idx = rows.map((r, i) => [M[a](r), M[b](r), i]).filter(([x, y]) => x !== null && y !== null && !Number.isNaN(x) && !Number.isNaN(y));
  const xs = idx.map(t => t[0]), ys = idx.map(t => t[1]), zs = idx.map(t => vol[t[2]]);
  console.log([a, b, fmt(pearson(xs, ys)), fmt(partial(xs, ys, zs))].join('\t'));
}

// ---- 4. focus-speler: wedstrijd voor wedstrijd ----
if (FOCUS) {
  const g = rows.filter(r => r.name === FOCUS).sort((a, b) => a.match_id.localeCompare(b.match_id));
  console.log(`\n${FOCUS}, per wedstrijd:`);
  const C = ['gd', 'minutes', 'pass_attempts', 'pass_acc', 'forward_share', 'through_balls', 'passes_failed', 'fb_good_share', 'fb_elsewhere', 'assists', 'goals', 'shots', 'dribbles', 'beaten', 'lost_def', 'lost_mid', 'lost_att', 'won_total', 'tackles_lost', 'out_of_pos', 'rating'];
  console.log(C.join('\t'));
  for (const r of g) console.log(C.map(c => fmt(c === 'gd' ? r.gd : c === 'minutes' ? r.minutes : M[c](r), ['pass_acc', 'forward_share', 'fb_good_share'].includes(c) ? 2 : c === 'rating' ? 1 : 0)).join('\t'));
}
