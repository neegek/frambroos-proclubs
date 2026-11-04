// Frambroos-index: wat een speler zelf bijdraagt, los van de uitslag, voor de rol van die wedstrijd. 50 = gemiddeld
// voor die rol. Rekenregels in docs/coach-logica.md §9b. Draait na loadData() (common.js); rollen uit PERSONAS (personas.js).
// Zet p.fi (0–100), p.fiParts en p.role per speler-wedstrijd, en DATA.fi[naam] = { score, n, parts, role } per eigen speler.

const fiEv = (p, k) => p.ev?.[k] || 0;
const fiShare = (a, b) => b >= 5 ? a / b : null; // een deel telt pas bij minstens vijf pogingen
const FI_PARTS = [
  { key: 'shoot', label: 'Afronden', f: [p => p.goals || 0, p => fiEv(p, 'shots_on_target')] },
  { key: 'create', label: 'Creëren', f: [p => p.assists || 0, p => fiEv(p, 'second_assists'), p => fiEv(p, 'through_balls')] },
  { key: 'pass', label: 'Passen', f: [p => fiEv(p, 'passes_completed'),
    p => fiShare(fiEv(p, 'passes_completed'), fiEv(p, 'passes_completed') + fiEv(p, 'passes_failed')),
    p => fiShare(fiEv(p, 'fb_good_option') + fiEv(p, 'fb_best_option'), fiEv(p, 'fb_no_good_option') + fiEv(p, 'fb_good_option') + fiEv(p, 'fb_best_option') + fiEv(p, 'fb_should_have_passed_elsewhere')),
    p => { const t = fiEv(p, 'fb_no_good_option') + fiEv(p, 'fb_good_option') + fiEv(p, 'fb_best_option') + fiEv(p, 'fb_should_have_passed_elsewhere'); const v = fiShare(fiEv(p, 'fb_should_have_passed_elsewhere'), t); return v === null ? null : -v; }] },
  { key: 'ball', label: 'Aan de bal', f: [p => fiEv(p, 'players_beaten'), p => fiEv(p, 'ball_actions') >= 5 ? -fiEv(p, 'possession_lost') / fiEv(p, 'ball_actions') : null] },
  { key: 'defend', label: 'Verdedigen', f: [p => p.tacklesMade || 0, p => fiEv(p, 'interceptions'), p => fiEv(p, 'aerial_duels_won_defending'),
    p => fiEv(p, 'blocks') + fiEv(p, 'clearances'), p => fiEv(p, 'possession_won')] },
];
// Gewichten per rol (coach-logica §9b): wat die rol moet doen telt zwaar, wat de rol niet vraagt licht.
const FI_ROLES = {
  spits: { label: 'spits', ref: 'forward', w: { shoot: 1.5, create: 1.0, pass: 0.6, ball: 1.0, defend: 0.3 } },
  aanvallend: { label: 'aanvallend middenveld', ref: 'midfielder', w: { shoot: 1.0, create: 1.4, pass: 1.0, ball: 1.2, defend: 0.5 } },
  verdedigend: { label: 'verdedigend middenveld', ref: 'midfielder', w: { shoot: 0.3, create: 0.7, pass: 1.4, ball: 1.0, defend: 1.5 } },
  middenveld: { label: 'middenveld', ref: 'midfielder', w: { shoot: 0.7, create: 1.1, pass: 1.2, ball: 1.1, defend: 0.9 } },
  verdediger: { label: 'verdediger', ref: 'defender', w: { shoot: 0.2, create: 0.4, pass: 1.0, ball: 0.8, defend: 1.6 } },
  keeper: { label: 'keeper', ref: 'goalkeeper', w: { shoot: 0, create: 0.3, pass: 1.0, ball: 0.5, defend: 1.2 } },
};
const FI_MIN_SECONDS = 45 * 60, FI_SHRINK = 5, FI_MIN_GAMES = 3;

// De rol van een speler in een wedstrijd: EA-positie, en bij middenvelders de vaste rol uit personas.js.
function rolOf(p, m, ours) {
  if (p.pos === 'goalkeeper') return 'keeper';
  if (p.pos === 'defender') return 'verdediger';
  if (p.pos === 'forward') return 'spits';
  const r = ours && typeof PERSONAS !== 'undefined' ? PERSONAS[p.name]?.rol : null;
  if (!r) return 'middenveld';
  const names = m.players.map(q => q.name);
  const hit = (r.regels || []).find(x => (!x.zonder || !names.includes(x.zonder)) && (!x.maxMensen || names.length <= x.maxMensen));
  return hit ? hit.rol : r.standaard;
}

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
    p.fi = null; p.fiParts = null; p.role = rolOf(p, m, side === 'players');
    if (p.ev && (p.secondsPlayed || 0) >= FI_MIN_SECONDS) rows.push(p);
  }
  // Verdeling per EA-positie, per cijfer (lege delen tellen niet mee in de verdeling).
  const dist = {};
  for (const p of rows) {
    const d = (dist[FI_ROLES[p.role].ref] ??= FI_PARTS.map(part => part.f.map(() => [])));
    FI_PARTS.forEach((part, i) => part.f.forEach((f, j) => { const v = f(p); if (v !== null) d[i][j].push(v); }));
  }
  for (const d of Object.values(dist)) for (const part of d) for (const list of part) list.sort((a, b) => a - b);
  for (const p of rows) {
    const role = FI_ROLES[p.role], d = dist[role.ref], parts = {};
    FI_PARTS.forEach((part, i) => {
      const pcts = part.f.map((f, j) => { const v = f(p); return v === null || !d[i][j].length ? 50 : fiPct(d[i][j], v); });
      parts[part.key] = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    });
    const W = FI_PARTS.reduce((a, part) => a + role.w[part.key], 0);
    p.fiParts = parts;
    p.fi = FI_PARTS.reduce((a, part) => a + role.w[part.key] * parts[part.key], 0) / W;
  }
  DATA.fi = {};
  for (const name of DATA.players) DATA.fi[name] = fiForRows(DATA.matches.map(m => m.players.find(p => p.name === name)).filter(p => p && p.fi !== null));
}

// Speler over een reeks wedstrijden: gemiddelde, naar 50 getrokken bij weinig wedstrijden (ook per onderdeel), en de
// rol die het vaakst voorkwam.
function fiForRows(ps) {
  const n = ps.length, shrink = sum => (sum + FI_SHRINK * 50) / (n + FI_SHRINK);
  const count = {}; for (const p of ps) count[p.role] = (count[p.role] || 0) + 1;
  const role = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { n, role, roles: count, score: n >= FI_MIN_GAMES ? shrink(ps.reduce((a, p) => a + p.fi, 0)) : null,
    parts: Object.fromEntries(FI_PARTS.map(part => [part.key, n >= FI_MIN_GAMES ? shrink(ps.reduce((a, p) => a + p.fiParts[part.key], 0)) : null])) };
}

const fiLabel = v => v === null || v === undefined ? '' : v >= 58 ? 'uitblinker' : v >= 53 ? 'boven gemiddeld' : v > 47 ? 'gemiddeld' : v > 42 ? 'onder gemiddeld' : 'ver onder gemiddeld';
const fiMatchLabel = v => v === null || v === undefined ? '' : v >= 70 ? 'topwedstrijd' : v <= 30 ? 'mindere wedstrijd' : '';
const fiFmt = v => v === null || v === undefined ? '–' : Math.round(v);
