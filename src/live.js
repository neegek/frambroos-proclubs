// Live ophalen voor de lokale app: bij het openen of verversen van een pagina haalt de server de nieuwste wedstrijden
// bij EA op, in een tijdelijke kopie van de database. De echte database (data/proclubs.sqlite) blijft onaangeroerd;
// opslaan blijft het werk van de verzamelaar in GitHub Actions (docs/trigger.md).
import { readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from './db.js';
import { collectInto } from './collector.js';
import { buildData, realDb } from './data.js';

const CACHE_MS = 60_000;   // snel wisselen tussen pagina's roept EA niet bij elke klik aan
const TIMEOUT_MS = 10_000; // reageert EA niet op tijd, dan de opgeslagen data
let cache = null, inFlight = null;

// Kopieën van een server die halverwege werd gestopt, opruimen bij het starten.
for (const f of readdirSync(tmpdir())) if (f.startsWith('frambroos-live-')) rmSync(join(tmpdir(), f), { force: true });

const removeTmp = tmp => { for (const f of [tmp, `${tmp}-wal`, `${tmp}-shm`]) rmSync(f, { force: true }); };

async function fetchLive() {
  const tmp = join(tmpdir(), `frambroos-live-${process.pid}-${Date.now()}.sqlite`); // eigen kopie per ronde
  realDb.exec(`VACUUM INTO '${tmp.replaceAll("'", "''")}'`); // consistente kopie, leest de echte database alleen
  const db = openDb(tmp);
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('EA reageerde niet op tijd')), TIMEOUT_MS));
    const res = await Promise.race([collectInto(db, { backfill: false, log: () => {} }), timeout]);
    const data = buildData(db);
    const fresh = new Set(res.newIds);
    for (const m of data.matches) if (fresh.has(m.matchId)) m.live = true;
    data.live = { at: Math.floor(Date.now() / 1000), newMatches: res.newMatches, error: res.error };
    return data;
  } finally {
    db.close(); removeTmp(tmp);
  }
}

// Data voor /api/data: live als dat lukt, anders de opgeslagen data met de reden erbij.
export async function liveData() {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.data;
  if (!inFlight) inFlight = fetchLive()
    .catch(e => ({ ...buildData(), live: { at: Math.floor(Date.now() / 1000), newMatches: 0, error: e.message } }))
    .then(data => { cache = { t: Date.now(), data }; inFlight = null; return data; });
  return inFlight;
}
