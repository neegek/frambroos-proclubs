// Frambroos-index: wat een speler zelf bijdraagt, los van de uitslag. 50 = gemiddeld voor de rol.
// Rekenregels in docs/coach-logica.md §9b. Draait na loadData() (common.js) en gebruikt ARCHETYPE_PROFILE (archetypes.js).
// Zet p.fi (0–100) en p.fiParts per speler-wedstrijd, en DATA.fi[naam] = { score, n, parts } per eigen speler.

const FI_PARTS = [
  { key: 'shoot', label: 'Afronden', f: [p => p.goals || 0, p => (p.ev.shots_on_target_inside_box || 0) + (p.ev.shots_on_target_outside_box || 0)] },
  { key: 'pass', label: 'Creëren', f: [p => p.assists || 0, p => p.ev.second_assists || 0, p => p.ev.through_balls || 0] },
  { key: 'ball', label: 'Aan de bal', f: [p => p.ev.players_beaten || 0, p => p.passAttempts ? p.passesMade / p.passAttempts : 0, p => -(p.ev.possession_lost || 0) / Math.max(1, p.ev.ball_actions || 0)] },
  { key: 'defend', label: 'Verdedigen', f: [p => p.ev.interceptions || 0, p => p.ev.possession_won || 0, p => p.tacklesMade || 0] },
];
const FI_MIN_SECONDS = 45 * 60, FI_SHRINK = 5, FI_MIN_GAMES = 3;

// Percentiel met gelijke waarden in het midden.
function fiPct(sorted, v) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
  let eq = lo; while (eq < sorted.length && sorted[eq] === v) eq++;
  return 100 * (lo + (eq - lo) / 2) / sorted.length;
}

function computeFrambroosIndex() {
  const rows = [];
  for (const m of DATA.matches) for (const side of ['players', 'opponentPlayers']) for (const p of m[side]) {
    p.fi = null; p.fiParts = null;
    if (p.ev && (p.secondsPlayed || 0) >= FI_MIN_SECONDS) rows.push({ p, ours: side === 'players' });
  }
  const byPos = {};
  for (const r of rows) (byPos[r.p.pos] ??= []).push(r);
  for (const group of Object.values(byPos)) {
    const dist = FI_PARTS.map(part => part.f.map(f => group.map(r => f(r.p)).sort((a, b) => a - b)));
    for (const r of group) {
      const parts = {};
      FI_PARTS.forEach((part, i) => { parts[part.key] = part.f.reduce((a, f, j) => a + fiPct(dist[i][j], f(r.p)), 0) / part.f.length; });
      const w = (ARCHETYPE_PROFILE[r.p.archetypeId] || ARCHETYPE_PROFILE[r.p.pos === 'forward' ? 12 : 8]).weight;
      const W = FI_PARTS.reduce((a, part) => a + w[part.key], 0);
      r.p.fiParts = parts;
      r.p.fi = FI_PARTS.reduce((a, part) => a + w[part.key] * parts[part.key], 0) / W;
    }
  }
  DATA.fi = {};
  for (const name of DATA.players) DATA.fi[name] = fiForRows(DATA.matches.map(m => m.players.find(p => p.name === name)).filter(p => p && p.fi !== null));
}

// Speler over een reeks wedstrijden: gemiddelde, naar 50 getrokken bij weinig wedstrijden (ook per onderdeel).
function fiForRows(ps) {
  const n = ps.length, shrink = sum => (sum + FI_SHRINK * 50) / (n + FI_SHRINK);
  return { n, score: n >= FI_MIN_GAMES ? shrink(ps.reduce((a, p) => a + p.fi, 0)) : null,
    parts: Object.fromEntries(FI_PARTS.map(part => [part.key, n >= FI_MIN_GAMES ? shrink(ps.reduce((a, p) => a + p.fiParts[part.key], 0)) : null])) };
}

const fiLabel = v => v === null || v === undefined ? '' : v >= 58 ? 'uitblinker' : v >= 53 ? 'boven gemiddeld' : v > 47 ? 'gemiddeld' : v > 42 ? 'onder gemiddeld' : 'ver onder gemiddeld';
const fiMatchLabel = v => v === null || v === undefined ? '' : v >= 70 ? 'topwedstrijd' : v <= 30 ? 'mindere wedstrijd' : '';
const fiFmt = v => v === null || v === undefined ? '–' : Math.round(v);
