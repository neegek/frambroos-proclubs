// Haalt de laatste wedstrijden op (EA geeft er maximaal 10 per type) en slaat nieuwe wedstrijden op in de echte
// database. Draait in GitHub Actions (zie docs/trigger.md); de logica zelf staat in src/collector.js.
import { openDb, config } from './db.js';
import { collectInto } from './collector.js';
import { appendFileSync } from 'node:fs';

const db = openDb();
const now = () => Math.floor(Date.now() / 1000);
const startedAt = now();
db.prepare('INSERT INTO collect_runs (started_at) VALUES (?)').run(startedAt);
const { newMatches, changed, error, missed } = await collectInto(db);
db.prepare('UPDATE collect_runs SET finished_at = ?, new_matches = ?, error = ? WHERE started_at = ?').run(now(), newMatches, error, startedAt);
const total = db.prepare('SELECT COUNT(*) AS c FROM matches').get().c;
console.log(`${new Date().toISOString()} ${config.clubName}: ${newMatches} nieuwe wedstrijd(en), ${total} totaal${error ? ` — FOUT: ${error}` : ''}`);
// Loopt de site achter op de database? Dat gebeurt als het publiceren een keer mislukt (5 november 2026: GitHub Pages
// bleef hangen en de deploy werd na 5 minuten afgebroken). Dan bouwt deze run de site opnieuw, ook zonder nieuwe data,
// tot het lukt (docs/trigger.md, Site loopt achter).
const newest = db.prepare('SELECT MAX(ts) AS t FROM matches').get().t || 0;
let stale = false;
if (!changed && config.siteUrl) {
  try {
    const res = await fetch(new URL('data.json', config.siteUrl), { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    const site = res.ok ? await res.json() : null;
    const siteNewest = Math.max(0, ...[...(site?.matches || []), ...(site?.friendlies || [])].map(m => m.ts || 0));
    stale = !!site && siteNewest < newest;
    if (stale) console.log(`Site loopt achter: nieuwste wedstrijd op de site ${new Date(siteNewest * 1000).toISOString()}, in de database ${new Date(newest * 1000).toISOString()}. Site wordt opnieuw gebouwd.`);
  } catch (e) { console.log(`Site niet te controleren: ${e.message}`); }
}
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();
// In GitHub Actions: alleen committen als er echt iets nieuws is; de site bouwen ook als hij achterloopt. missed gaat
// naar de meldstap in collect.yml (docs/trigger.md, Melding bij problemen).
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nstale=${stale}\nmissed=${missed.join(',')}\n`);
if (error) process.exit(1);
