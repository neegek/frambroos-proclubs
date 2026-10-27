// Verzamellogica: haalt de laatste wedstrijden bij EA op (maximaal 10 per type) en slaat de nieuwe op.
import { ea } from './ea.js';
import { config } from './db.js';
import { fullEventString } from './events.js';

const now = () => Math.floor(Date.now() / 1000);
const num = v => (v === undefined || v === null || v === '' ? null : Number(v));
const { clubId, platform } = config;

function queries(db) {
  return {
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
  lastClubRaw: db.prepare('SELECT raw FROM club_snapshots WHERE club_id = ? AND taken_at = ?'),
  insClubSnapshot: db.prepare(`INSERT OR REPLACE INTO club_snapshots (taken_at, club_id, skill_rating, games_played, wins, losses, ties, goals, goals_against, best_division, promotions, relegations, raw)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  lastMemberSnapshot: db.prepare('SELECT MAX(taken_at) AS t FROM member_snapshots WHERE club_id = ?'),
  insMemberSnapshot: db.prepare(`INSERT OR REPLACE INTO member_snapshots (taken_at, club_id, player_name, games_played, goals, assists, rating_ave, win_rate, mom,
      pro_overall, pro_name, favorite_position, pass_success_rate, shot_success_rate, tackle_success_rate, raw) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
  fixEvents: db.prepare('UPDATE player_match_stats SET event_aggregate = ? WHERE match_id = ? AND club_id = ? AND player_name = ? AND event_aggregate IS NOT ?'),
  };
}

// EA kapt match_event_aggregate_0 af op ~250 tekens en zet de rest in _1.._3. Oudere rijen
// bevatten alleen _0; vul ze eenmalig aan vanuit de ruwe JSON. Geeft het aantal herstelde rijen.
function backfillEventAggregates(db, q) {
  let fixed = 0;
  for (const { match_id, raw } of db.prepare('SELECT match_id, raw FROM matches').all()) {
    const match = JSON.parse(raw);
    for (const cid of Object.keys(match.players || {}))
      for (const p of Object.values(match.players[cid])) {
        const events = fullEventString(p) || null;
        fixed += q.fixEvents.run(events, match_id, cid, p.playername, events).changes;
      }
  }
  return fixed;
}

function resultOf(entry) {
  if (num(entry.wins) === 1) return 'W';
  if (entry.losses !== undefined && num(entry.losses) === 1) return 'L';
  if (num(entry.ties) === 1) return 'D';
  const g = num(entry.goals), ga = num(entry.goalsAgainst);
  return g > ga ? 'W' : g < ga ? 'L' : 'D';
}

function storeMatch(q, match, matchType) {
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
        fullEventString(p) || null,
      );
    }
  }
  return clubIds.filter(c => c !== clubId);
}

async function snapshotClub(q, cid, maxAgeSeconds) {
  const last = q.lastClubSnapshot.get(cid)?.t ?? 0;
  // Eigen club: ook de velden uit de ranglijst (huidige divisie, clean sheets). Oudere snapshots missen die nog.
  const own = cid === clubId, stale = own && last && !q.lastClubRaw.get(cid, last)?.raw.includes('currentDivision');
  if (now() - last < maxAgeSeconds && !stale) return false;
  const stats = (await ea.overallStats(platform, cid))?.[0];
  if (!stats) return false;
  if (own) {
    const entry = ((await ea.searchClubs(platform, config.clubName)) || []).find(c => String(c.clubId) === String(cid));
    if (entry) for (const k of ['currentDivision', 'cleanSheets', 'points']) if (entry[k] !== undefined) stats[k] = entry[k];
    // Divisieregels (punten voor promotie, handhaving en titel) en de ranglijstpositie: bewaren voor later gebruik.
    if (entry?.rank !== undefined) stats.rank = entry.rank;
    try { const d = await ea.settings(platform); if (d) stats.divisions = d; } catch { /* niet essentieel */ }
  }
  q.insClubSnapshot.run(now(), cid, num(stats.skillRating), num(stats.gamesPlayed), num(stats.wins), num(stats.losses), num(stats.ties),
    num(stats.goals), num(stats.goalsAgainst), num(stats.bestDivision), num(stats.promotions), num(stats.relegations), JSON.stringify(stats));
  return true;
}

async function snapshotMembers(q, force) {
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

// Eén verzamelronde op een geopende database: nieuwe wedstrijden opslaan, snapshots bijwerken.
// Geeft { newMatches, newIds, changed, error }. Gebruikt door src/collect.js (echte database, GitHub Actions)
// en src/live.js (tijdelijke kopie, bij het openen van de lokale app).
export async function collectInto(db, { backfill = true, log = console.log } = {}) {
  const q = queries(db);
  let newMatches = 0, changed = false, error = null;
  const newIds = [];
  try {
    if (backfill) {
      const fixed = backfillEventAggregates(db, q);
      if (fixed) { changed = true; log(`${fixed} eventstrings aangevuld vanuit de ruwe JSON`); }
    }
    const opponents = new Set();
    for (const matchType of ['leagueMatch', 'playoffMatch']) {
      const matches = (await ea.matches(platform, clubId, matchType)) || [];
      // EA geeft maximaal 10 wedstrijden per type. Zijn ze allemaal nieuw terwijl we dit type al kenden,
      // dan kan er tussen deze en de vorige run iets tussenuit gevallen zijn.
      const knownType = db.prepare('SELECT 1 FROM matches WHERE match_type = ? LIMIT 1').get(matchType);
      const unseen = matches.filter(m => !q.hasMatch.get(String(m.matchId))).length;
      if (knownType && matches.length >= 10 && unseen === matches.length) {
        const msg = `Alle ${matches.length} ${matchType}-wedstrijden waren nieuw: mogelijk zijn er oudere gemist sinds de vorige run.`;
        log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `WAARSCHUWING: ${msg}`);
      }
      for (const match of matches) {
        if (q.hasMatch.get(String(match.matchId))) continue;
        db.exec('BEGIN');
        try { storeMatch(q, match, matchType).forEach(o => opponents.add(o)); db.exec('COMMIT'); newMatches++; newIds.push(String(match.matchId)); }
        catch (e) { db.exec('ROLLBACK'); throw e; }
        changed = true;
      }
    }
    // Sterkte van nieuwe tegenstanders vastleggen (hooguit 1x per week per club).
    for (const o of opponents) if (await snapshotClub(q, o, 7 * 24 * 3600)) changed = true;
    // Eigen club: nieuw snapshot bij nieuwe wedstrijden, anders hooguit dagelijks.
    if (await snapshotClub(q, clubId, newMatches > 0 ? 0 : 24 * 3600)) changed = true;
    if (await snapshotMembers(q, newMatches > 0)) changed = true;
  } catch (e) {
    error = e.message;
  }
  return { newMatches, newIds, changed, error };
}
