// Data voor het dashboard: wat /api/data, /api/builds en /api/photos leveren. Gedeeld door de server (src/server.js)
// en de statische export (src/export.js).
export { realDb };
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { openDb, config, ROOT } from './db.js';
import { decodeEvents } from './events.js';

const realDb = openDb();
// Eigen builds van de spelers, handmatig ingevuld op de Buildspagina. Staat in git, zodat het bewaard blijft.
export const BUILDS_PATH = join(ROOT, 'data', 'builds.json');
export async function readBuilds() { try { return JSON.parse(await readFile(BUILDS_PATH, 'utf8')); } catch { return {}; } }
// Foto's per speler voor de spelerskaart. Staan in data/players/<slug>.<ext> en gaan mee in git (alleen lezen).
export const PHOTO_DIR = join(ROOT, 'data', 'players');
export async function listPhotos() {
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

// Zonder argument uit de echte database; src/live.js geeft de tijdelijke kopie met live opgehaalde wedstrijden mee.
export function buildData(db = realDb) {
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
        id: r.opponent_id, name: r.opponent_name || 'Onbekende club', // EA geeft soms geen clubnaam mee
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
