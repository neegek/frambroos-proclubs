// Lokaal dashboard: serveert public/ en levert de data uit SQLite op /api/data.
import http from 'node:http';
import { readFile, writeFile, rename, readdir, unlink, mkdir, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { openDb, config, ROOT } from './db.js';
import { decodeEvents } from './events.js';

const db = openDb();
const PUBLIC = join(ROOT, 'public');
// Eigen builds van de spelers, handmatig ingevuld op de Buildspagina. Staat in git, zodat het bewaard blijft.
const BUILDS_PATH = join(ROOT, 'data', 'builds.json');
async function readBuilds() { try { return JSON.parse(await readFile(BUILDS_PATH, 'utf8')); } catch { return {}; } }
const NUM_FIELDS = new Set(['height', 'weakFoot', 'skillMoves', 'pac', 'sho', 'pas', 'dri', 'def', 'phy',
  'shortPass', 'longPass', 'vision', 'crossing', 'curve', 'ballControl', 'dribbling', 'agility', 'balance', 'reactions', 'composure',
  'strength', 'stamina', 'finishing', 'shotPower', 'longShots', 'defAwareness', 'standTackle', 'slideTackle', 'interceptions', 'sprint', 'accel', 'heading', 'jumping']);
// Alleen bekende velden met geldige waarden bewaren.
function cleanBuild(b) {
  const out = {};
  if (b.archetype !== undefined && b.archetype !== '') { const a = Number(b.archetype); if (Number.isInteger(a) && a >= 1 && a <= 13) out.archetype = a; }
  if (['links', 'rechts'].includes(b.foot)) out.foot = b.foot;
  for (const k of NUM_FIELDS) if (b[k] !== undefined && b[k] !== '' && b[k] !== null) { const v = Number(b[k]); if (Number.isFinite(v) && v >= 1 && v <= 250) out[k] = Math.round(v); }
  if (b.playstyles && typeof b.playstyles === 'object') {
    out.playstyles = {};
    for (const [k, v] of Object.entries(b.playstyles)) if (typeof k === 'string' && k.length <= 40 && ['aan', 'plus'].includes(v)) out.playstyles[k] = v;
  }
  if (typeof b.note === 'string') out.note = b.note.slice(0, 1000);
  out.updatedAt = Math.floor(Date.now() / 1000);
  return out;
}

// Foto's per speler voor de spelerskaart. Staan in data/players/<slug>.<ext> en gaan mee in git.
const PHOTO_DIR = join(ROOT, 'data', 'players');
const PHOTO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const slugOf = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
async function listPhotos() {
  const out = {};
  try {
    for (const f of await readdir(PHOTO_DIR)) {
      const m = f.match(/^(.+)\.(png|jpg|webp)$/); if (!m) continue;
      const st = await stat(join(PHOTO_DIR, f));
      out[m[1]] = `/media/players/${f}?v=${Math.floor(st.mtimeMs)}`;
    }
  } catch {}
  return out;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function buildData() {
  const { clubId } = config;
  const latestSnapshot = db.prepare(`SELECT * FROM club_snapshots WHERE club_id = ? ORDER BY taken_at DESC LIMIT 1`);
  const own = latestSnapshot.get(clubId);
  const memberTs = db.prepare('SELECT MAX(taken_at) AS t FROM member_snapshots WHERE club_id = ?').get(clubId)?.t;
  const members = memberTs ? db.prepare('SELECT * FROM member_snapshots WHERE club_id = ? AND taken_at = ?').all(clubId, memberTs) : [];
  const lastRun = db.prepare('SELECT * FROM collect_runs ORDER BY started_at DESC LIMIT 1').get();
  const matchRows = db.prepare(`
    SELECT m.match_id, m.ts, m.match_type, m.raw, mc.goals, mc.goals_against, mc.result, mc.winner_by_dnf, mc.opponent_id, c.name AS opponent_name
    FROM matches m
    JOIN match_clubs mc ON mc.match_id = m.match_id AND mc.club_id = ?
    LEFT JOIN clubs c ON c.club_id = mc.opponent_id
    ORDER BY m.ts ASC`).all(clubId);
  const playersFor = db.prepare('SELECT * FROM player_match_stats WHERE match_id = ? AND club_id = ? ORDER BY player_name');
  const oppCount = db.prepare('SELECT COUNT(*) AS c FROM player_match_stats WHERE match_id = ? AND club_id = ?');
  const mapPlayer = p => ({
    name: p.player_name, pos: p.pos, goals: p.goals, assists: p.assists, shots: p.shots,
    passAttempts: p.pass_attempts, passesMade: p.passes_made, tackleAttempts: p.tackle_attempts, tacklesMade: p.tackles_made,
    rating: p.rating, mom: p.mom, redCards: p.red_cards, secondsPlayed: p.seconds_played, archetypeId: p.archetype_id, saves: p.saves,
    ev: p.event_aggregate ? (({ unknown, ...rest }) => rest)(decodeEvents(p.event_aggregate)) : null,
  });
  const hexOf = n => '#' + Number(n || 0).toString(16).padStart(6, '0');
  const kitOf = details => { const k = details?.customKit; return k ? [1, 2, 3].map(i => hexOf(k[`kitColor${i}`])) : null; };
  const matches = matchRows.map(r => {
    const raw = JSON.parse(r.raw);
    const opp = r.opponent_id ? latestSnapshot.get(r.opponent_id) : null;
    return {
      matchId: r.match_id, ts: r.ts, matchType: r.match_type,
      goals: r.goals, goalsAgainst: r.goals_against, result: r.result, winnerByDnf: r.winner_by_dnf,
      opponent: {
        id: r.opponent_id, name: r.opponent_name,
        skillRating: opp?.skill_rating ?? null, gamesPlayed: opp?.games_played ?? null,
        winRate: opp && opp.games_played ? Math.round(100 * opp.wins / opp.games_played) : null,
        bestDivision: opp?.best_division ?? null,
        humanPlayers: r.opponent_id ? oppCount.get(r.match_id, r.opponent_id).c : null,
        kit: kitOf(raw.clubs?.[r.opponent_id]?.details),
      },
      players: playersFor.all(r.match_id, clubId).map(mapPlayer),
      opponentPlayers: r.opponent_id ? playersFor.all(r.match_id, r.opponent_id).map(mapPlayer) : [],
    };
  });
  // Tenues en clubkleur uit de meest recente wedstrijd (EA geeft kleuren als decimale RGB).
  const lastRaw = db.prepare('SELECT m.raw FROM matches m JOIN match_clubs mc ON mc.match_id = m.match_id AND mc.club_id = ? ORDER BY m.ts DESC LIMIT 1').get(clubId);
  let kits = null;
  if (lastRaw) {
    const k = JSON.parse(lastRaw.raw).clubs?.[clubId]?.details?.customKit;
    const hex = n => '#' + Number(n || 0).toString(16).padStart(6, '0');
    if (k) kits = {
      stadium: k.stadName, crestColor: hex(k.crestColor),
      home: [1, 2, 3, 4].map(i => hex(k[`kitColor${i}`])), away: [1, 2, 3, 4].map(i => hex(k[`kitAColor${i}`])), third: [1, 2, 3, 4].map(i => hex(k[`kitThrdColor${i}`])),
    };
  }
  return {
    club: { id: clubId, name: config.clubName, platform: config.platform, kits },
    snapshot: own ? { skillRating: own.skill_rating, gamesPlayed: own.games_played, wins: own.wins, losses: own.losses, ties: own.ties, goals: own.goals, goalsAgainst: own.goals_against, bestDivision: own.best_division, takenAt: own.taken_at } : null,
    members: members.map(m => ({ name: m.player_name, gamesPlayed: m.games_played, goals: m.goals, assists: m.assists, ratingAve: m.rating_ave, winRate: m.win_rate, mom: m.mom, proOverall: m.pro_overall, proName: m.pro_name, proHeight: Number(JSON.parse(m.raw).proHeight) || null, proPos: JSON.parse(m.raw).proPos ?? null, favoritePosition: m.favorite_position, passSuccessRate: m.pass_success_rate, shotSuccessRate: m.shot_success_rate, tackleSuccessRate: m.tackle_success_rate })),
    lastRun,
    matches,
    generatedAt: Math.floor(Date.now() / 1000),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/builds' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(await readBuilds()));
  }
  const bm = url.pathname.match(/^\/api\/builds\/(.+)$/);
  if (bm && req.method === 'PUT') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 20000) { res.writeHead(413); return res.end('Te groot'); } }
    try {
      const name = decodeURIComponent(bm[1]).slice(0, 60);
      const builds = await readBuilds();
      builds[name] = cleanBuild(JSON.parse(body));
      await writeFile(BUILDS_PATH + '.tmp', JSON.stringify(builds, null, 2) + '\n');
      await rename(BUILDS_PATH + '.tmp', BUILDS_PATH);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(builds[name]));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end(`Ongeldige build: ${e.message}`);
    }
  }
  if (url.pathname === '/api/photos' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(await listPhotos()));
  }
  const media = url.pathname.match(/^\/media\/players\/([a-z0-9-]+\.(png|jpg|webp))$/);
  if (media) {
    try {
      const body = await readFile(join(PHOTO_DIR, media[1]));
      res.writeHead(200, { 'Content-Type': MIME['.' + media[2]], 'Cache-Control': 'no-cache' });
      return res.end(body);
    } catch { res.writeHead(404); return res.end('Niet gevonden'); }
  }
  const pm = url.pathname.match(/^\/api\/players\/(.+)\/photo$/);
  if (pm && (req.method === 'PUT' || req.method === 'DELETE')) {
    const slug = slugOf(decodeURIComponent(pm[1]).slice(0, 60));
    if (!slug) { res.writeHead(400); return res.end('Ongeldige naam'); }
    await mkdir(PHOTO_DIR, { recursive: true });
    for (const ext of Object.values(PHOTO_TYPES)) { try { await unlink(join(PHOTO_DIR, `${slug}.${ext}`)); } catch {} }
    if (req.method === 'DELETE') { res.writeHead(204); return res.end(); }
    const ext = PHOTO_TYPES[(req.headers['content-type'] || '').split(';')[0]];
    if (!ext) { res.writeHead(415, { 'Content-Type': 'text/plain' }); return res.end('Alleen PNG, JPEG of WebP'); }
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 5 * 1024 * 1024) { res.writeHead(413, { 'Content-Type': 'text/plain' }); return res.end('Maximaal 5 MB'); } chunks.push(c); }
    await writeFile(join(PHOTO_DIR, `${slug}.${ext}`), Buffer.concat(chunks));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify((await listPhotos())[slug] || null));
  }
  if (url.pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(buildData()));
  }
  const file = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(PUBLIC, file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Niet gevonden');
  }
});

const port = config.dashboardPort || 3737;
server.listen(port, '127.0.0.1', () => console.log(`Dashboard: http://localhost:${port}`));
