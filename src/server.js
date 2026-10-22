// Lokaal dashboard: serveert public/ en levert de data uit SQLite op /api/data.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { openDb, config, ROOT } from './db.js';
import { decodeEvents } from './events.js';

const db = openDb();
const PUBLIC = join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

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
    members: members.map(m => ({ name: m.player_name, gamesPlayed: m.games_played, goals: m.goals, assists: m.assists, ratingAve: m.rating_ave, winRate: m.win_rate, mom: m.mom, proOverall: m.pro_overall, proName: m.pro_name, proHeight: Number(JSON.parse(m.raw).proHeight) || null, favoritePosition: m.favorite_position, passSuccessRate: m.pass_success_rate, shotSuccessRate: m.shot_success_rate, tackleSuccessRate: m.tackle_success_rate })),
    lastRun,
    matches,
    generatedAt: Math.floor(Date.now() / 1000),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
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
