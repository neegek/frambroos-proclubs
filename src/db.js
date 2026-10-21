import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export const ROOT = resolve(import.meta.dirname, '..');
export const config = JSON.parse(readFileSync(resolve(ROOT, 'config.json'), 'utf8'));

export function openDb() {
  const path = resolve(ROOT, config.dbPath);
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS clubs (
      club_id TEXT PRIMARY KEY,
      name TEXT,
      platform TEXT,
      region_id INTEGER,
      first_seen INTEGER,
      last_seen INTEGER
    );
    CREATE TABLE IF NOT EXISTS matches (
      match_id TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,               -- unix seconds, einde van de wedstrijd
      match_type TEXT NOT NULL,          -- leagueMatch | playoffMatch
      platform TEXT NOT NULL,
      collected_at INTEGER NOT NULL,
      raw TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_matches_ts ON matches(ts);
    CREATE TABLE IF NOT EXISTS match_clubs (
      match_id TEXT NOT NULL,
      club_id TEXT NOT NULL,
      opponent_id TEXT,
      goals INTEGER, goals_against INTEGER,
      result TEXT,                       -- W | L | D
      winner_by_dnf INTEGER,
      PRIMARY KEY (match_id, club_id)
    );
    CREATE TABLE IF NOT EXISTS player_match_stats (
      match_id TEXT NOT NULL,
      club_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      pos TEXT,
      goals INTEGER, assists INTEGER, shots INTEGER,
      pass_attempts INTEGER, passes_made INTEGER,
      tackle_attempts INTEGER, tackles_made INTEGER,
      rating REAL,
      saves INTEGER,
      goals_conceded INTEGER,
      cleansheet_gk INTEGER, cleansheet_def INTEGER, cleansheet_any INTEGER,
      red_cards INTEGER, mom INTEGER,
      seconds_played INTEGER,
      archetype_id INTEGER,
      vproattr TEXT,
      event_aggregate TEXT,
      PRIMARY KEY (match_id, club_id, player_name)
    );
    CREATE TABLE IF NOT EXISTS member_snapshots (
      taken_at INTEGER NOT NULL,
      club_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      games_played INTEGER, goals INTEGER, assists INTEGER,
      rating_ave REAL, win_rate INTEGER, mom INTEGER,
      pro_overall INTEGER, pro_name TEXT, favorite_position TEXT,
      pass_success_rate INTEGER, shot_success_rate INTEGER, tackle_success_rate INTEGER,
      raw TEXT NOT NULL,
      PRIMARY KEY (taken_at, club_id, player_name)
    );
    CREATE TABLE IF NOT EXISTS club_snapshots (
      taken_at INTEGER NOT NULL,
      club_id TEXT NOT NULL,
      skill_rating INTEGER,
      games_played INTEGER, wins INTEGER, losses INTEGER, ties INTEGER,
      goals INTEGER, goals_against INTEGER,
      best_division INTEGER, promotions INTEGER, relegations INTEGER,
      raw TEXT NOT NULL,
      PRIMARY KEY (taken_at, club_id)
    );
    CREATE TABLE IF NOT EXISTS collect_runs (
      started_at INTEGER PRIMARY KEY,
      finished_at INTEGER,
      new_matches INTEGER,
      error TEXT
    );
  `);
  return db;
}
