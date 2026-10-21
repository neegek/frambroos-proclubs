// Dunne client voor de onofficiële EA Pro Clubs API.
// Werkt met Node's ingebouwde fetch; curl en de meeste HTTP-libs krijgen 403.
const BASE = 'https://proclubs.ea.com/api/fc';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
};

async function get(path, params, { retries = 2 } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} voor ${url.pathname}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export const ea = {
  searchClubs: (platform, clubName) => get('/allTimeLeaderboard/search', { platform, clubName }),
  clubInfo: (platform, clubIds) => get('/clubs/info', { platform, clubIds }),
  overallStats: (platform, clubIds) => get('/clubs/overallStats', { platform, clubIds }),
  matches: (platform, clubIds, matchType) => get('/clubs/matches', { platform, clubIds, matchType, maxResultCount: 100 }),
  memberStats: (platform, clubId) => get('/members/stats', { platform, clubId }),
  careerStats: (platform, clubId) => get('/members/career/stats', { platform, clubId }),
};
