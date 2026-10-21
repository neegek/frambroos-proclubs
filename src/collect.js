// Haalt de laatste wedstrijden op (EA geeft er maximaal 10 per type) en slaat
// nieuwe wedstrijden op. Draai dit elk kwartier om een volledige historie op te bouwen.
import { ea } from './ea.js';
import { openDb, config } from './db.js';

const db = openDb();
const now = () => Math.floor(Date.now() / 1000);
const num = v => (v === undefined || v === null || v === '' ? null : Number(v));
const { clubId, platform } = config;

const q = {
  hasMatch: db.prepare('SELECT 1 FROM matches WHERE match_id = ?'),
  insMatch: db.prepare('INSERT INTO matches (match_id, ts, match_type, platform, collected_at, raw) VALUES (?,?,?,?,?,?)'),
  insMatchClub: db.prepare(`INSERT OR REPLACE INTO match_clubs (match_id, club_id, opponent_id, goals, goals_against, result, winner_by_dnf) VALUES (?,?,?,?,?,?,?)`),
  insPlayer: db.prepare(`INSERT OR REPLACE INTO player_match_stats (
      match_id, club_id, player_name, pos, goals, assists, shots, pass_attempts, passes_made,
      tackle_attempts, tackles_made, rating, saves, goals_conceded, cleansheet_gk, cleansheet_def, cleansheet_any,
      red_cards, mom, seconds_played, archetype_id, vproattr, event_aggregate
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  upsertClub: db.prepare(`INSERT INTO clubs (club_id, name, platform, region_id, first_seen, last_seen) VALUES (?,?,?,?,?,?)
      ON CONFLICT(club_id) DO UPDATE SET name = excluded.name, region_id = excluded.region_id, last_seen = MAX(last_seen, excluded.last_seen)`),
  lastClubSnapshot: db.prepare('SELECT MAX(taken_at) AS t FROM club_snapshots WHERE club_id = ?'),
  insClubSnapshot: db.prepare(`INSERT OR REPLACE INTO club_snapshots (taken_at, club_id, skill_rating, games_played, wins, losses, ties, goals, goals_against, best_division, promotions, relegations, raw)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  lastMemberSnapshot: db.prepare('SELECT MAX(taken_at) AS t FROM member_snapshots WHERE club_id = ?'),
  insMemberSnapshot: db.prepare(`INSERT OR REPLACE INTO member_snapshots (taken_at, club_id, player_name, games_played, goals, assists, rating_ave, win_rate, mom,
      pro_overall, pro_name, favorite_position, pass_success_rate, shot_success_rate, tackle_success_rate, raw) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  insRun: db.prepare('INSERT INTO collect_runs (started_at) VALUES (?)'),
  finishRun: db.prepare('UPDATE collect_runs SET finished_at = ?, new_matches = ?, error = ? WHERE started_at = ?'),
};

function resultOf(entry) {
  if (num(entry.wins) === 1) return 'W';
  if (entry.losses !== undefined && num(entry.losses) === 1) return 'L';
  if (num(entry.ties) === 1) return 'D';
  const g = num(entry.goals), ga = num(entry.goalsAgainst);
  return g > ga ? 'W' : g < ga ? 'L' : 'D';
}

function storeMatch(match, matchType) {
  const ts = num(match.timestamp);
  const clubIds = Object.keys(match.clubs);
  q.insMatch.run(String(match.matchId), ts, matchType, platform, now(), JSON.stringify(match));
  for (const cid of clubIds) {
    const entry = match.clubs[cid];
    const opponent = clubIds.find(o => o !== cid) || null;
    q.insMatchClub.run(String(match.matchId), cid, opponent, num(entry.goals), num(entry.goalsAgainst), resultOf(entry), num(entry.winnerByDnf));
    const details = entry.details || {};
    q.upsertClub.run(cid, details.name || null, platform, details.regionId ?? null, ts, ts);
    const players = match.players?.[cid] || {};
    for (const p of Object.values(players)) {
      q.insPlayer.run(
        String(match.matchId), cid, p.playername, p.pos,
        num(p.goals), num(p.assists), num(p.shots), num(p.passattempts), num(p.passesmade),
        num(p.tackleattempts), num(p.tacklesmade), num(p.rating), num(p.saves), num(p.goalsconceded),
        num(p.cleansheetsgk), num(p.cleansheetsdef), num(p.cleansheetsany),
        num(p.redcards), num(p.mom), num(p.secondsPlayed), num(p.archetypeid), p.vproattr ?? null,
        p.match_event_aggregate_0 ?? null,
      );
    }
  }
  return clubIds.filter(c => c !== clubId);
}

async function snapshotClub(cid, maxAgeSeconds) {
  const last = q.lastClubSnapshot.get(cid)?.t ?? 0;
  if (now() - last < maxAgeSeconds) return false;
  const stats = (await ea.overallStats(platform, cid))?.[0];
  if (!stats) return false;
  q.insClubSnapshot.run(now(), cid, num(stats.skillRating), num(stats.gamesPlayed), num(stats.wins), num(stats.losses), num(stats.ties),
    num(stats.goals), num(stats.goalsAgainst), num(stats.bestDivision), num(stats.promotions), num(stats.relegations), JSON.stringify(stats));
  return true;
}

async function snapshotMembers(force) {
  const last = q.lastMemberSnapshot.get(clubId)?.t ?? 0;
  if (!force && now() - last < 24 * 3600) return false;
  const data = await ea.memberStats(platform, clubId);
  const members = data?.members || [];
  const t = now();
  for (const m of members) {
    q.insMemberSnapshot.run(t, clubId, m.name, num(m.gamesPlayed), num(m.goals), num(m.assists), num(m.ratingAve), num(m.winRate), num(m.manOfTheMatch),
      num(m.proOverall), m.proName ?? null, m.favoritePosition ?? null, num(m.passSuccessRate), num(m.shotSuccessRate), num(m.tackleSuccessRate), JSON.stringify(m));
  }
  return members.length > 0;
}

const startedAt = now();
q.insRun.run(startedAt);
let newMatches = 0;
let error = null;
try {
  const opponents = new Set();
  for (const matchType of ['leagueMatch', 'playoffMatch']) {
    const matches = (await ea.matches(platform, clubId, matchType)) || [];
    for (const match of matches) {
      if (q.hasMatch.get(String(match.matchId))) continue;
      db.exec('BEGIN');
      try { storeMatch(match, matchType).forEach(o => opponents.add(o)); db.exec('COMMIT'); newMatches++; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    }
  }
  // Sterkte van nieuwe tegenstanders vastleggen (hooguit 1x per week per club).
  for (const o of opponents) await snapshotClub(o, 7 * 24 * 3600);
  // Eigen club: nieuw snapshot bij nieuwe wedstrijden, anders hooguit dagelijks.
  await snapshotClub(clubId, newMatches > 0 ? 0 : 24 * 3600);
  await snapshotMembers(newMatches > 0);
} catch (e) {
  error = e.message;
}
q.finishRun.run(now(), newMatches, error, startedAt);
const total = db.prepare('SELECT COUNT(*) AS c FROM matches').get().c;
console.log(`${new Date().toISOString()} ${config.clubName}: ${newMatches} nieuwe wedstrijd(en), ${total} totaal${error ? ` — FOUT: ${error}` : ''}`);
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();
if (error) process.exit(1);
