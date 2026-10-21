// Gebruik: npm run find-club -- "Clubnaam" [platform]
import { ea } from './ea.js';
import { config } from './db.js';

const name = process.argv[2];
const platform = process.argv[3] || config.platform;
if (!name) { console.error('Gebruik: npm run find-club -- "Clubnaam" [platform]'); process.exit(1); }

const clubs = (await ea.searchClubs(platform, name)) || [];
if (!clubs.length) { console.log(`Geen clubs gevonden voor "${name}" op ${platform}.`); process.exit(0); }
console.table(clubs.map(c => ({
  clubId: c.clubId, naam: c.clubName, divisie: c.currentDivision,
  gespeeld: c.gamesPlayed, W: c.wins, G: c.ties, V: c.losses, stadion: c.clubInfo?.customKit?.stadName,
})));
console.log('Zet het juiste clubId in config.json.');
