// Lokaal dashboard: serveert public/ en levert de data uit SQLite op /api/data.
import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { ROOT, config } from './db.js';
import { buildData, listPhotos, readBuilds, BUILDS_PATH, PHOTO_DIR } from './data.js';
import { liveData } from './live.js';

const PUBLIC = join(ROOT, 'public');
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

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

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
  if (url.pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    // Standaard live: nieuwste wedstrijden bij EA erbij (src/live.js). ?live=0 geeft alleen de opgeslagen data.
    return res.end(JSON.stringify(url.searchParams.get('live') === '0' ? buildData() : await liveData()));
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
