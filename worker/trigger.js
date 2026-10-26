// Cloudflare Worker: laat de site (GitHub Pages) bij openen of verversen de verzamelaar starten.
// Een webpagina kan EA niet zelf aanroepen (EA weigert andere websites) en mag geen token bevatten (de repo en site zijn
// openbaar). Deze worker houdt het token geheim en start collect.yml; die haalt bij EA op, slaat op en publiceert de site.
// Instellen: docs/trigger.md, "Live op de site".
//
// POST  start een verzamelrun, tenzij er al een loopt of de laatste minder dan COOLDOWN_S geleden begon.
// GET   alleen de stand van de laatste run (de site vraagt dit om de 15 seconden zolang een run loopt).
// Antwoord: { at, started, run: { id, status, conclusion, createdAt, updatedAt } }, tijden in unix-seconden.
//
// Geheim GITHUB_TOKEN: fine-grained token van neegek, alleen deze repo, alleen Actions: Read and write.
// Staat alleen in Cloudflare (wrangler secret put GITHUB_TOKEN), nooit in deze repo.
const REPO = 'neegek/frambroos-proclubs', WORKFLOW = 'collect.yml';
const ORIGINS = ['https://neegek.github.io'];
const COOLDOWN_S = 180; // hooguit eens per 3 minuten een nieuwe run, hoeveel bezoekers er ook zijn
const CACHE_MS = 10_000; // stand van de laatste run kort bewaren, zodat veel open tabbladen GitHub niet overspoelen

let cache = null;

const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${REPO}${path}`, {
  ...init,
  headers: {
    Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'frambroos-trigger', ...init.headers,
  },
});

const secs = iso => Math.floor(Date.parse(iso) / 1000);

async function latestRun(env, fresh) {
  if (!fresh && cache && Date.now() - cache.t < CACHE_MS) return cache.run;
  const res = await gh(env, `/actions/workflows/${WORKFLOW}/runs?per_page=1`);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const r = (await res.json()).workflow_runs?.[0];
  const run = r ? { id: r.id, status: r.status, conclusion: r.conclusion, createdAt: secs(r.created_at), updatedAt: secs(r.updated_at) } : null;
  cache = { t: Date.now(), run };
  return run;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const headers = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST', 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Vary: 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'GET' && req.method !== 'POST') return new Response('{}', { status: 405, headers });
    try {
      const at = Math.floor(Date.now() / 1000), post = req.method === 'POST';
      const run = await latestRun(env, post);
      let started = false;
      if (post && (!run || (run.status === 'completed' && at - run.createdAt >= COOLDOWN_S))) {
        const res = await gh(env, `/actions/workflows/${WORKFLOW}/dispatches`, {
          method: 'POST', body: JSON.stringify({ ref: 'main' }), headers: { 'Content-Type': 'application/json' },
        });
        if (res.status !== 204) throw new Error(`GitHub ${res.status}`);
        started = true;
        cache = null;
      }
      return new Response(JSON.stringify({ at, started, run }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 502, headers });
    }
  },
};
