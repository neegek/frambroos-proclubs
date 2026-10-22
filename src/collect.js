// Haalt de laatste wedstrijden op (EA geeft er maximaal 10 per type) en slaat nieuwe wedstrijden op in de echte
// database. Draait in GitHub Actions (zie docs/trigger.md); de logica zelf staat in src/collector.js.
import { openDb, config } from './db.js';
import { collectInto } from './collector.js';
import { appendFileSync } from 'node:fs';

const db = openDb();
const now = () => Math.floor(Date.now() / 1000);
const startedAt = now();
db.prepare('INSERT INTO collect_runs (started_at) VALUES (?)').run(startedAt);
const { newMatches, changed, error } = await collectInto(db);
db.prepare('UPDATE collect_runs SET finished_at = ?, new_matches = ?, error = ? WHERE started_at = ?').run(now(), newMatches, error, startedAt);
const total = db.prepare('SELECT COUNT(*) AS c FROM matches').get().c;
console.log(`${new Date().toISOString()} ${config.clubName}: ${newMatches} nieuwe wedstrijd(en), ${total} totaal${error ? ` — FOUT: ${error}` : ''}`);
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();
// In GitHub Actions: alleen committen als er echt iets nieuws is.
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
if (error) process.exit(1);
