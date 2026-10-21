// Samenvatting per speelsessie: wedstrijden die kort na elkaar zijn gespeeld (standaard: minder dan 3 uur ertussen).
// Per sessie: uitslagen, sterkte van de tegenstanders, beste spelers, aandachtspunten voor het team en per speler.
// De aandachtspunten vergelijken de sessie met het "normaal" van team en speler (alle andere wedstrijden in de database).
//
// Gebruik: node src/sessions.js [--write] [--gap 180]
//   --write  schrijft docs/sessies.md; zonder --write naar stdout
//   --gap    maximaal aantal minuten tussen twee wedstrijden in dezelfde sessie
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDb, config, ROOT } from './db.js';
import { decodeEvents, fullEventString } from './events.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const GAP = Number(opt('--gap', 180)) * 60;
const WRITE = args.includes('--write');
const num = v => (v == null || v === '' ? 0 : Number(v));
const db = openDb();
const CLUB = config.clubId;

// ---- data ------------------------------------------------------------------
const clubName = Object.fromEntries(db.prepare('SELECT club_id, name FROM clubs').all().map(c => [c.club_id, c.name]));
const snap = {};
for (const s of db.prepare('SELECT * FROM club_snapshots ORDER BY taken_at').all()) snap[s.club_id] = s; // laatste wint
const ours = snap[CLUB];

const matches = db.prepare(`SELECT m.match_id, m.ts, m.match_type, m.raw, mc.opponent_id, mc.goals, mc.goals_against, mc.result, mc.winner_by_dnf
  FROM matches m JOIN match_clubs mc ON mc.match_id = m.match_id AND mc.club_id = ? ORDER BY m.ts`).all(CLUB).map(m => {
  const raw = JSON.parse(m.raw);
  const players = Object.values(raw.players?.[CLUB] || {}).map(p => ({ name: p.playername, pos: p.pos, min: num(p.secondsPlayed) / 60, rating: num(p.rating), mom: num(p.mom), goals: num(p.goals), assists: num(p.assists), d: decodeEvents(fullEventString(p)) })).filter(p => p.min >= 1); // 0 minuten = niet gespeeld
  const oppPlayers = Object.values(raw.players?.[m.opponent_id] || {});
  return { ...m, raw: undefined, players, oppHumans: oppPlayers.length, oppShots: oppPlayers.reduce((s, p) => s + num(p.shots), 0), oppRating: oppPlayers.length ? oppPlayers.reduce((s, p) => s + num(p.rating), 0) / oppPlayers.length : null };
});

// ---- sessies ---------------------------------------------------------------
const sessions = [];
for (const m of matches) {
  const last = sessions.at(-1);
  if (last && m.ts - last.matches.at(-1).ts <= GAP) last.matches.push(m); else sessions.push({ matches: [m] });
}

// ---- metrics ---------------------------------------------------------------
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const ratio = (a, b) => (b ? a / b : null);
// Per groep speler-wedstrijden: tellingen en verhoudingen.
function metrics(rows) {
  const mins = sum(rows, r => r.min) || 1;
  const E = k => sum(rows, r => r.d[k] || 0);
  const per90 = k => E(k) / mins * 90;
  const fb = E('fb_no_good_option') + E('fb_good_option') + E('fb_best_option') + E('fb_should_have_passed_elsewhere');
  // Verhoudingen alleen bij genoeg volume, anders null (één schot erin is geen "100% afgewerkt").
  const ratioMin = (a, b, min) => (b >= min ? a / b : null);
  const shots = E('shots'), tackles = E('tackles_won') + E('tackles_lost');
  return {
    minutes: mins,
    pass_acc: ratioMin(E('passes_completed'), E('pass_attempts'), 10),
    lost_per_100: ratioMin(E('possession_lost') * 100, E('ball_actions'), 20),
    lost_mid_share: ratioMin(E('possession_lost_mid_third') + E('possession_lost_def_third'), E('possession_lost'), 4),
    through_balls: per90('through_balls'),
    shots: per90('shots'),
    shots_inside_share: ratioMin(E('shots_inside_box'), shots, 4),
    conversion: ratioMin(E('goals'), shots, 4),
    on_target_share: ratioMin(E('shots_on_target'), shots, 4),
    dribbles: per90('dribbles_completed'),
    beaten: per90('players_beaten'),
    tackles_lost: per90('tackles_lost'),
    tackle_share: ratioMin(E('tackles_won'), tackles, 4),
    interceptions: per90('interceptions'),
    won_total: per90('possession_won'),
    fouls: per90('fouls_conceded_total'),
    yellows: per90('yellow_cards_total'),
    out_pos_share: ratioMin(E('out_of_position'), E('out_of_position') + E('in_position'), 8),
    fb_no_option_share: ratioMin(E('fb_no_good_option'), fb, 10),
    fb_elsewhere_share: ratioMin(E('fb_should_have_passed_elsewhere'), fb, 10),
    fb_good_share: ratioMin(E('fb_good_option') + E('fb_best_option'), fb, 10),
    ball_actions: per90('ball_actions'),
    assists: per90('assists'),
    goals: per90('goals'),
  };
}
// Hoe lees je een afwijking: [label, type, zin als hoger, zin als lager, drempel]
// type 'pct' = percentage (absoluut verschil in procentpunten), 'rate' = per 90 (relatief verschil)
const RULES = {
  pass_acc: ['passnauwkeurigheid', 'pct', 'passes kwamen beter aan dan normaal', 'meer passes kwamen niet aan dan normaal', 5],
  lost_per_100: ['balverlies per 100 balacties', 'rate', 'vaker balverlies dan normaal', 'minder balverlies dan normaal', 0.3],
  lost_mid_share: ['aandeel balverlies op eigen helft en middenveld', 'pct', 'balverlies lag dichter bij ons eigen doel dan normaal', 'balverlies lag verder van ons doel dan normaal', 15],
  through_balls: ['geslaagde steekpasses per 90', 'rate', 'meer steekpasses kwamen aan dan normaal', 'minder steekpasses kwamen aan dan normaal', 0.35],
  shots: ['schoten per 90', 'rate', 'meer schoten dan normaal', 'minder schoten dan normaal', 0.3],
  shots_inside_share: ['aandeel schoten uit de zestien', 'pct', 'meer schoten van dichtbij dan normaal', 'meer afstandsschoten dan normaal', 15],
  conversion: ['doelpunten per schot', 'pct', 'scherper afgewerkt dan normaal', 'slechter afgewerkt dan normaal', 12],
  tackles_lost: ['verloren tackles per 90', 'rate', 'meer verloren tackles dan normaal', 'minder verloren tackles dan normaal', 0.35],
  tackle_share: ['aandeel gewonnen tackles', 'pct', 'tackles slaagden vaker dan normaal', 'tackles slaagden minder vaak dan normaal', 15],
  interceptions: ['onderscheppingen per 90', 'rate', 'meer onderscheppingen dan normaal', 'minder onderscheppingen dan normaal', 0.35],
  out_pos_share: ['aandeel "uit positie"', 'pct', 'vaker uit positie dan normaal', 'beter in positie dan normaal', 10],
  fb_no_option_share: ['aandeel "geen goede optie"', 'pct', 'vaker zonder aanspeelpunt dan normaal (te weinig aanbieden of te veel druk)', 'vaker een aanspeelpunt dan normaal', 8],
  fb_elsewhere_share: ['aandeel "had elders moeten passen"', 'pct', 'vaker de verkeerde pass gekozen dan normaal', 'betere passkeuzes dan normaal', 8],
  fouls: ['overtredingen per 90', 'rate', 'meer overtredingen dan normaal', 'minder overtredingen dan normaal', 0.5],
  dribbles: ['geslaagde dribbels per 90', 'rate', 'meer gedribbeld dan normaal', 'minder gedribbeld dan normaal', 0.3],
  ball_actions: ['balacties per 90', 'rate', 'vaker aan de bal dan normaal', 'minder aan de bal dan normaal', 0.2],
};
const pct = x => (x == null ? '–' : Math.round(x * 100) + '%');
const f1 = x => (x == null ? '–' : x.toFixed(1));
function deviations(cur, base, keys = Object.keys(RULES)) {
  const out = [];
  for (const k of keys) {
    const [label, type, up, down, thr] = RULES[k];
    const a = cur[k], b = base[k];
    if (a == null || b == null) continue;
    let score;
    if (type === 'pct') score = (a - b) * 100 / thr;
    else { if (Math.abs(a - b) < 0.5) continue; score = (a - b) / Math.max(b, 0.5) / thr; }
    if (Math.abs(score) < 1) continue;
    const shown = type === 'pct' ? `${pct(a)} tegen normaal ${pct(b)}` : `${f1(a)} tegen normaal ${f1(b)}`;
    out.push({ k, score: Math.abs(score), text: `${score > 0 ? up : down} (${label}: ${shown})` });
  }
  return out.sort((x, y) => y.score - x.score);
}

// ---- tegenstanders ---------------------------------------------------------
function oppDesc(m) {
  const s = snap[m.opponent_id]; const name = clubName[m.opponent_id] || m.opponent_id;
  if (!s) return { name, rating: null, text: name };
  const wr = s.games_played ? Math.round(s.wins / s.games_played * 100) : null;
  return { name, rating: s.skill_rating, winrate: wr, div: s.best_division, games: s.games_played };
}
function strengthWord(diff) {
  if (diff == null) return 'onbekende sterkte';
  if (diff > 250) return 'veel sterker';
  if (diff > 100) return 'sterker';
  if (diff > -100) return 'gelijkwaardig';
  if (diff > -250) return 'zwakker';
  return 'veel zwakker';
}

// ---- tekst -----------------------------------------------------------------
const dateNL = ts => new Date(ts * 1000).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' });
const timeNL = ts => new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
const allRows = matches.flatMap(m => m.players);
const lines = [];
const out = s => lines.push(s);

out(`# Speelsessies van ${config.clubName}`);
out('');
out(`Gegenereerd door \`node src/sessions.js --write\` op ${new Date().toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' })}. Een sessie is een reeks wedstrijden met minder dan ${GAP / 60} minuten ertussen.`);
out('"Normaal" is het gemiddelde van team of speler over alle *andere* wedstrijden in de database; afwijkingen worden alleen genoemd als ze');
out('duidelijk zijn. Sterkte van tegenstanders is EA\'s skill rating op het moment van verzamelen, afgezet tegen de onze');
out(`(${ours?.skill_rating ?? '?'}). Met ${matches.length} wedstrijden zijn dit indrukken; de tekst wordt betrouwbaarder naarmate er meer sessies zijn.`);
out('');
out('## Overzicht');
out('');
out('| Sessie | Wedstrijden | Uitslag | Doelsaldo | Tegenstanders (gem. rating) | Beste speler |');
out('|---|---|---|---|---|---|');
const sessionTexts = [];
sessions.forEach((S, i) => {
  const ms = S.matches; const n = ms.length;
  const W = ms.filter(m => m.result === 'W').length, D = ms.filter(m => m.result === 'D').length, L = ms.filter(m => m.result === 'L').length;
  const gf = sum(ms, m => m.goals), ga = sum(ms, m => m.goals_against);
  const type = [...new Set(ms.map(m => m.match_type))].map(t => t === 'playoffMatch' ? 'play-offs' : 'competitie').join(' en ');
  const opps = ms.map(oppDesc);
  const rated = opps.filter(o => o.rating != null);
  const avgRating = rated.length ? Math.round(sum(rated, o => o.rating) / rated.length) : null;
  const diff = avgRating != null && ours ? avgRating - ours.skill_rating : null;
  const rows = ms.flatMap(m => m.players);
  const otherRows = matches.filter(m => !ms.includes(m)).flatMap(m => m.players);
  const teamCur = metrics(rows), teamBase = metrics(otherRows.length ? otherRows : rows);

  // spelers in de sessie
  const byName = {};
  for (const m of ms) for (const p of m.players) (byName[p.name] ||= []).push(p);
  const players = Object.entries(byName).map(([name, ps]) => {
    const mins = sum(ps, p => p.min);
    const rating = sum(ps, p => p.rating * p.min) / (mins || 1);
    const seasonRows = allRows.filter(r => r.name === name);
    const otherP = otherRows.filter(r => r.name === name);
    return { name, n: ps.length, mins, rating, goals: sum(ps, p => p.goals), assists: sum(ps, p => p.assists), mom: sum(ps, p => p.mom), cur: metrics(ps), base: metrics(otherP.length >= 3 ? otherP : seasonRows), hasBase: otherP.length >= 3, seasonRating: sum(seasonRows, p => p.rating * p.min) / (sum(seasonRows, p => p.min) || 1) };
  }).sort((a, b) => b.rating - a.rating);
  const regulars = players.filter(p => p.n >= Math.max(2, Math.ceil(n / 2)));
  const best = (regulars.length ? regulars : players).slice(0, 3);

  const title = `Sessie ${i + 1} · ${dateNL(ms[0].ts)} · ${type}`;
  const resultText = `${n} wedstrijd${n === 1 ? '' : 'en'}: ${W} gewonnen, ${D} gelijk, ${L} verloren`;
  out(`| [${i + 1}](#sessie-${i + 1}) ${dateNL(ms[0].ts).replace(/^\w+ /, '')} | ${n} (${type}) | ${W}-${D}-${L} | ${gf}-${ga} | ${avgRating ?? '?'} (${strengthWord(diff)}) | ${best[0]?.name ?? '–'} |`);

  const t = [];
  t.push(`<a id="sessie-${i + 1}"></a>`);
  t.push(`## ${title}`);
  t.push('');
  t.push(`**${resultText}, doelsaldo ${gf}-${ga}.** ${timeNL(ms[0].ts)} tot ${timeNL(ms.at(-1).ts)}, ${[...new Set(rows.map(r => r.name))].length} spelers.`);
  t.push('');
  // Tegenstanders
  const strong = ms.filter((m, j) => opps[j].rating != null && opps[j].rating - ours.skill_rating > 100);
  const weak = ms.filter((m, j) => opps[j].rating != null && opps[j].rating - ours.skill_rating < -100);
  const rec = arr => `${arr.filter(m => m.result === 'W').length} gewonnen van ${arr.length}`;
  const sw = strengthWord(diff);
  let oppText = `**Tegenstanders.** Gemiddeld ${sw === 'gelijkwaardig' ? 'gelijkwaardig aan ons' : sw + ' dan wij'} (rating ${avgRating ?? '?'} tegen ${ours?.skill_rating}).`;
  if (rated.length) {
    const top = [...rated].sort((a, b) => b.rating - a.rating)[0], low = [...rated].sort((a, b) => a.rating - b.rating)[0];
    oppText += ` Sterkste: ${top.name} (${top.rating}, ${top.winrate}% winst${top.div ? `, ooit divisie ${top.div}` : ''}); zwakste: ${low.name} (${low.rating}).`;
  }
  if (strong.length) oppText += ` Tegen duidelijk sterkere teams: ${rec(strong)}.`;
  if (weak.length) oppText += ` Tegen duidelijk zwakkere teams: ${rec(weak)}.`;
  const dnf = ms.filter(m => m.winner_by_dnf);
  if (dnf.length) oppText += ` ${dnf.length === 1 ? 'Eén tegenstander gaf op' : dnf.length + ' tegenstanders gaven op'} (telt als winst).`;
  t.push(oppText);
  t.push('');
  t.push('| Tijd | Tegenstander | Rating | Uitslag |');
  t.push('|---|---|---|---|');
  ms.forEach((m, j) => { const o = opps[j]; t.push(`| ${timeNL(m.ts)} | ${o.name} | ${o.rating ?? '?'}${o.rating != null ? ` (${strengthWord(o.rating - ours.skill_rating)})` : ''} | ${m.result === 'W' ? 'W' : m.result === 'L' ? 'V' : 'G'} ${m.goals}-${m.goals_against}${m.winner_by_dnf ? ' (opgave)' : ''} |`); });
  t.push('');
  // Beste spelers
  const pl = p => `**${p.name}** (rating ${p.rating.toFixed(1)}${p.rating - p.seasonRating > 0.3 ? ', boven zijn gemiddelde' : p.rating - p.seasonRating < -0.3 ? ', onder zijn gemiddelde' : ''}${p.goals + p.assists ? `, ${p.goals} goal${p.goals === 1 ? '' : 's'} en ${p.assists} assist${p.assists === 1 ? '' : 's'}` : ''}${p.mom ? `, ${p.mom}× man van de wedstrijd` : ''})`;
  t.push(`**Beste spelers.** ${best.map((p, j) => (j === 0 ? '' : j === best.length - 1 ? ' en ' : ', ') + pl(p)).join('')}.` + (players.length > best.length ? ` Rest op rating: ${players.filter(p => !best.includes(p)).map(p => `${p.name} ${p.rating.toFixed(1)}${p.n < n ? ` (${p.n} van ${n})` : ''}`).join(', ')}.` : ''));
  t.push('');
  // Team-aandachtspunten
  const teamDev = otherRows.length ? deviations(teamCur, teamBase) : [];
  const gaPer = ga / n, gaBase = otherRows.length ? sum(matches.filter(m => !ms.includes(m)), m => m.goals_against) / (matches.length - n) : null;
  const gfPer = gf / n, gfBase = otherRows.length ? sum(matches.filter(m => !ms.includes(m)), m => m.goals) / (matches.length - n) : null;
  const notes = [];
  if (gaBase != null && gaPer - gaBase > 0.7) notes.push(`Verdedigend lek: ${gaPer.toFixed(1)} tegengoals per wedstrijd tegen normaal ${gaBase.toFixed(1)}.`);
  if (gaBase != null && gaBase - gaPer > 0.7) notes.push(`Verdedigend solide: ${gaPer.toFixed(1)} tegengoals per wedstrijd tegen normaal ${gaBase.toFixed(1)}.`);
  if (gfBase != null && gfBase - gfPer > 0.7) notes.push(`Weinig gescoord: ${gfPer.toFixed(1)} per wedstrijd tegen normaal ${gfBase.toFixed(1)}.`);
  for (const d of teamDev.slice(0, 4)) notes.push(d.text.charAt(0).toUpperCase() + d.text.slice(1) + '.');
  if (strong.length && weak.length) {
    const ws = strong.filter(m => m.result === 'W').length / strong.length, ww = weak.filter(m => m.result === 'W').length / weak.length;
    if (ww - ws > 0.5) notes.push('Het verschil zat in de tegenstander: tegen sterkere teams werd verloren, tegen zwakkere gewonnen. Dat is normaal, maar zegt dat het niveau van de avond vooral door de loting werd bepaald.');
    if (ws >= ww && strong.some(m => m.result === 'W')) notes.push('Opvallend: tegen sterkere tegenstanders ging het minstens zo goed als tegen zwakkere.');
  }
  t.push(`**Waar het team op moet letten.**${notes.length ? '' : ' Geen duidelijke afwijkingen van het normale beeld.'}`);
  for (const nt of notes) t.push(`- ${nt}`);
  t.push('');
  // Per speler
  t.push('**Per speler.**');
  for (const p of players) {
    const dev = p.hasBase ? deviations(p.cur, p.base, ['pass_acc', 'lost_per_100', 'through_balls', 'shots', 'conversion', 'tackles_lost', 'tackle_share', 'interceptions', 'out_pos_share', 'fb_no_option_share', 'fb_elsewhere_share', 'dribbles', 'ball_actions', 'fouls']).slice(0, 2) : [];
    const rd = p.rating - p.seasonRating;
    const ratingText = Math.abs(rd) < 0.3 ? 'op zijn normale niveau' : rd > 0 ? `${rd.toFixed(1)} boven zijn gemiddelde` : `${(-rd).toFixed(1)} onder zijn gemiddelde`;
    const ga_ = p.goals + p.assists ? `${p.goals} goal${p.goals === 1 ? '' : 's'}, ${p.assists} assist${p.assists === 1 ? '' : 's'}` : 'geen goal of assist';
    t.push(`- **${p.name}** (${p.n} van ${n}): rating ${p.rating.toFixed(1)}, ${ratingText}; ${ga_}.${dev.length ? ' ' + dev.map(d => d.text.charAt(0).toUpperCase() + d.text.slice(1)).join('. ') + '.' : p.hasBase ? ' Geen opvallende afwijkingen.' : ' Te weinig andere wedstrijden om mee te vergelijken.'}`);
  }
  t.push('');
  sessionTexts.push(t.join('\n'));
});
out('');
out(sessionTexts.join('\n'));
const text = lines.join('\n');
if (WRITE) { const p = resolve(ROOT, 'docs/sessies.md'); writeFileSync(p, text); console.log(`geschreven: ${p} (${sessions.length} sessies)`); } else console.log(text);
