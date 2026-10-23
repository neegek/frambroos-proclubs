// Statische export van het dashboard naar dist/: dezelfde pagina's, met een vaste kopie van de data ernaast.
// Bedoeld om te delen (bijvoorbeeld als artifact). Alleen lezen: builds invullen kan alleen in de lokale app.
// Gebruik: npm run export
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './db.js';
import { buildData, listPhotos, readBuilds, PHOTO_DIR } from './data.js';

const OUT = join(ROOT, 'dist'), PUBLIC = join(ROOT, 'public');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Pagina's en scripts; de HTML krijgt de vlag die common.js naar de bestanden laat kijken in plaats van naar /api.
for (const f of await readdir(PUBLIC)) {
  if (f.endsWith('.html')) {
    const html = await readFile(join(PUBLIC, f), 'utf8');
    await writeFile(join(OUT, f), html.replace('</title>', '</title>\n<script>window.FRAMBROOS_STATIC = true;</script>'));
  } else await cp(join(PUBLIC, f), join(OUT, f), { recursive: true });
}

const data = buildData();
await writeFile(join(OUT, 'data.json'), JSON.stringify(data));
await writeFile(join(OUT, 'builds.json'), JSON.stringify(await readBuilds()));

// Foto's: zelfde slugs, maar als bestand naast de pagina.
const photos = await listPhotos(), local = {};
if (Object.keys(photos).length) await mkdir(join(OUT, 'players'), { recursive: true });
for (const [slug, url] of Object.entries(photos)) {
  const file = url.split('/').pop().split('?')[0];
  await cp(join(PHOTO_DIR, file), join(OUT, 'players', file));
  local[slug] = `players/${file}`;
}
await writeFile(join(OUT, 'photos.json'), JSON.stringify(local));

// Voor een artifact: de startpagina zonder eigen documentskelet (dat zet het platform er zelf omheen) en met de
// appnaam als titel. De andere pagina's blijven volledige documenten.
const index = await readFile(join(OUT, 'index.html'), 'utf8');
await writeFile(join(OUT, 'artifact-index.html'), index
  .replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '')
  .replace(/<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/, '')
  .replace('<title>Clubhouse · Frambroos Coach</title>', '<title>Frambroos Coach</title>')
  .replace(/<\/head>\s*<body>\s*/, '')
  .replace(/\s*<\/body>\s*<\/html>\s*$/, '\n'));

console.log(`Export klaar in dist/: ${data.matches.length} wedstrijden, ${Object.keys(local).length} foto's.`);
