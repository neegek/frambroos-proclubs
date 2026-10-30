// Spelerskaart bovenaan de spelerspagina (en klein in de ledenrij op het Clubhouse): een kaart in FC-stijl met foto, overall, archetype-icoon en zes carrièrecijfers
// volgens EA, met ernaast alleen wat niet op de kaart staat. Donker thema: thuistenue; licht thema: uittenue.
// Foto's: data/players/<slug>.<webp|png|jpg> (max 900 px), aangeleverd via de chat; de server toont ze op /media/players/.
(() => {
let PHOTOS = {};
const slugOf = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Zonder foto: een gevuld silhouet in de tekstkleur van de kaart, licht transparant, zodat het op elk verloop werkt.
function personIcon() {
  return `<svg class="fut-icon" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="38" r="22" fill="currentColor"/>
    <path d="M24 116V98a32 32 0 0 1 32-32h8a32 32 0 0 1 32 32v18z" fill="currentColor"/></svg>`;
}

// Vlag onder het clublogo, uit proNationality van EA. EA geeft alleen een nummer; de koppeling volgt de FC-landennummers
// (Europa alfabetisch 1–51, Azië vanaf 149), gecontroleerd aan de eigen leden. Onbekend nummer: geen vlag, niet gokken.
const NATIONS = {
  7: ['België', { v: ['#2d2926', '#fdda24', '#ef3340'] }], 13: ['Denemarken', { cross: ['#c8102e', '#fff'] }],
  14: ['Engeland', { st: ['#fff', '#ce1124'] }], 17: ['Finland', { cross: ['#fff', '#002f6c'] }],
  18: ['Frankrijk', { v: ['#002395', '#fff', '#ed2939'] }], 21: ['Duitsland', { h: ['#000', '#dd0000', '#ffce00'] }],
  27: ['Italië', { v: ['#009246', '#fff', '#ce2b37'] }], 34: ['Nederland', { h: ['#ae1c28', '#fff', '#21468b'] }],
  45: ['Spanje', { h: ['#aa151b', '#f1bf00', '#f1bf00', '#aa151b'] }], 46: ['Zweden', { cross: ['#006aa7', '#fecc02'] }],
  160: ['Indonesië', { h: ['#ce1126', '#fff'] }], 163: ['Japan', { sun: ['#fff', '#bc002d'] }],
};
function flag(id) {
  const n = NATIONS[id]; if (!n) return '';
  const [name, f] = n, W = 30, H = 20;
  let body = '';
  if (f.h) body = f.h.map((c, i) => `<rect y="${i * H / f.h.length}" width="${W}" height="${H / f.h.length + 0.1}" fill="${c}"/>`).join('');
  if (f.v) body = f.v.map((c, i) => `<rect x="${i * W / f.v.length}" width="${W / f.v.length + 0.1}" height="${H}" fill="${c}"/>`).join('');
  if (f.cross) body = `<rect width="${W}" height="${H}" fill="${f.cross[0]}"/><rect x="9" width="4" height="${H}" fill="${f.cross[1]}"/><rect y="8" width="${W}" height="4" fill="${f.cross[1]}"/>`;
  if (f.st) body = `<rect width="${W}" height="${H}" fill="${f.st[0]}"/><rect x="13" width="4" height="${H}" fill="${f.st[1]}"/><rect y="8" width="${W}" height="4" fill="${f.st[1]}"/>`;
  if (f.sun) body = `<rect width="${W}" height="${H}" fill="${f.sun[0]}"/><circle cx="15" cy="10" r="6" fill="${f.sun[1]}"/>`;
  return `<svg class="fut-flag" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name}"><title>${name}</title>${body}</svg>`;
}

// De kaartvorm (300×430): scherpe hoeken bovenaan met één boog ertussen, punt met inkeping onderaan. Eén pad voor de rand,
// de donkere lijn, de binnenrand en één verloop over de hele kaart; alleen een foto krijgt een eigen vlak, dat zacht
// overloopt in het verloop. De foto staat rechts van rating en iconen en is aan de bovenkant uitgelijnd met wat lucht boven het
// hoofd (zoals op een FC-kaart); onderaan loopt hij zacht weg. Geen glans of strepen: alleen een zachte, schuine lichtere baan in het verloop zelf (--t-sheen). Kleuren komen uit de tier-tokens in style.css.
const FUT_SHAPE = 'M18 62Q150 -8 282 62L282 352C282 380 262 400 230 408C200 414 172 424 160 428L150 423L140 428C128 424 100 414 70 408C38 400 18 380 18 352Z';
// uid maakt de SVG-ids per kaart uniek, zodat meerdere kaarten op één pagina elkaars verloop niet overnemen.
// Buitenste rand: goud, of bij een sessie de kleur van de plek op rating (coach-logica §9c). De binnenrand blijft goud.
const RIMS = {
  gold: ['#fff1bd', '#d9b04a', '#8d6c15', '#f1d27a'], silver: ['#ffffff', '#c3c9d0', '#737b85', '#e4e8ec'],
  bronze: ['#f6d2ae', '#c27f45', '#74431c', '#e3a674'], iron: ['#a3a9b0', '#5f656d', '#2f3338', '#7d838b'],
};
const rimOf = rank => !rank ? 'gold' : rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'iron';
function futFrame(photo, uid, rim = 'gold') {
  const id = k => `fut-${k}-${uid}`;
  const inset = (sx, sy) => `transform="translate(150 215) scale(${sx} ${sy}) translate(-150 -215)"`;
  return `<svg class="fut-frame" viewBox="0 0 300 430" aria-hidden="true">
    <defs>
      <linearGradient id="${id('gold')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1bd"/><stop offset=".35" stop-color="#d9b04a"/><stop offset=".7" stop-color="#8d6c15"/><stop offset="1" stop-color="#f1d27a"/></linearGradient>
      <linearGradient id="${id('rim')}" x1="0" y1="0" x2="1" y2="1">${RIMS[rim].map((c, i) => `<stop offset="${[0, 0.35, 0.7, 1][i]}" stop-color="${c}"/>`).join('')}</linearGradient>
      <linearGradient id="${id('bg')}" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" style="stop-color:var(--t-bg1)"/><stop offset=".55" style="stop-color:var(--t-bg2)"/><stop offset="1" style="stop-color:var(--t-bg3)"/></linearGradient>
      <linearGradient id="${id('sheen')}" x1="0" y1="0" x2="1" y2="0.9"><stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".45" style="stop-color:var(--t-sheen)"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <pattern id="${id('dots')}" patternUnits="userSpaceOnUse" width="9" height="9"><circle cx="4" cy="4" r="1" style="fill:var(--t-dots)"/></pattern>
      <linearGradient id="${id('fade')}" x1="0" y1="0" x2="0" y2="1"><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
      <mask id="${id('photo-mask')}"><rect x="0" y="0" width="300" height="250" fill="url(#${id('fade')})"/></mask>
      <clipPath id="${id('clip')}"><path d="${FUT_SHAPE}" ${inset(0.952, 0.966)}/></clipPath>
    </defs>
    <path d="${FUT_SHAPE}" fill="url(#${id('rim')})"/>
    <path d="${FUT_SHAPE}" fill="#1a1408" ${inset(0.975, 0.982)}/>
    <path d="${FUT_SHAPE}" fill="url(#${id('bg')})" stroke="url(#${id('gold')})" stroke-width="2.2" ${inset(0.952, 0.966)}/>
    <g clip-path="url(#${id('clip')})">
      <rect width="300" height="430" fill="url(#${id('sheen')})"/><rect width="300" height="430" fill="url(#${id('dots')})"/>
      ${photo ? `<g mask="url(#${id('photo-mask')})"><rect x="0" y="0" width="300" height="250" style="fill:var(--t-photo)"/><image class="fut-img" href="${photo}" x="34" y="52" width="240" height="198" preserveAspectRatio="xMaxYMin slice"/></g>` : ''}
    </g>
  </svg>`;
}

// Tier van de kaart (coach-logica §9c), per sessie: twee wegen naar "in vorm", niveau of groei (rating plus winst).
// tierAt: de tier over één sessie (r = de rijen met rating van de speler, normaal = alle andere wedstrijden).
const PTS = { W: 3, D: 1, L: 0 };
function tierAt(r, sid) {
  const here = r.filter(x => x.m.session === sid), rest = r.filter(x => x.m.session !== sid);
  const level = here.length ? avg(here.map(x => x.p.rating)) : null;
  if (here.length < 3) return { tier: 'goud', why: '', level, growth: null, session: sid, rows: here };
  const wins = here.filter(x => x.m.result === 'W').length;
  const growth = rest.length >= 3
    ? (level - avg(rest.map(x => x.p.rating))) + 0.25 * (avg(here.map(x => PTS[x.m.result])) - avg(rest.map(x => PTS[x.m.result])))
    : null;
  const why = `sessie van ${dayLabel(here[0].m.ts)}: rating ${level.toFixed(2)}, ${wins} van ${here.length} gewonnen${growth !== null ? `, groei ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}` : ''}`;
  const out = { why, level, growth, session: sid, rows: here };
  if (level >= 8 && wins / here.length >= 0.6) return { tier: 'top', ...out };
  if (level >= 7 || (growth !== null && r.length >= 8 && growth >= 0.3)) return { tier: 'zwart', ...out };
  return { tier: 'goud', ...out };
}
// De vorm van nu (of op een eerder moment, met rows tot dan): de laatste sessie met minstens 3 eigen wedstrijden.
function tierOf(rows) {
  const r = rows.filter(x => x.p.rating !== null), count = new Map();
  for (const x of r) count.set(x.m.session, (count.get(x.m.session) || 0) + 1);
  const sid = [...count].filter(([, n]) => n >= 3).map(([id]) => id).pop();
  return sid === undefined ? { tier: 'goud', why: '', level: null, growth: null, session: null, rows: [] } : tierAt(r, sid);
}

// Naam op de kaart: voorletter en achternaam van de pro (P. Selie), anders de accountnaam. Eén woord blijft heel.
function cardName(career, name) {
  const pro = (career?.proName || '').trim();
  if (!pro) return name;
  const parts = pro.split(/\s+/);
  return parts.length > 1 ? `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(' ')}` : pro;
}

function lastArch(rows) { const r = [...rows].reverse().find(x => x.p.archetypeId); return r ? r.p.archetypeId : null; }

// Alles wat de kaart nodig heeft, plus de kaart zelf (html). Gedeeld door de spelerspagina en de ledenrij op het Clubhouse.
// Foto: bij in vorm of topvorm de vormfoto (<slug>-vorm), anders de gewone; ontbreekt de vormfoto, dan de gewone.
// Dezelfde regel voor de kaart en voor de rondjes elders (speler van de sessie).
const photoOf = (name, tier) => (tier !== 'goud' && PHOTOS[`${slugOf(name)}-vorm`]) || PHOTOS[slugOf(name)] || null;

// Zonder session de kaart van nu (carrièrecijfers van EA, tier van de laatste sessie); met session de sessiekaart:
// tier, foto en zes cijfers van die avond (coach-logica §9c). key maakt de SVG-ids uniek als een kaart vaker op een pagina staat.
function cardOf(name, { session = null, key = '', rank = null } = {}) {
  const all = DATA.matches.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
  const rows = session === null ? all : all.filter(r => r.m.session === session);
  const career = DATA.members.find(x => x.name === name);
  const arch = lastArch(rows), info = ARCHETYPE_INFO[arch];
  const build = window.BuildTab?.get?.(name);
  const s = summarize(rows.map(r => r.m));
  const rating = avg(rows.map(r => r.p.rating).filter(v => v !== null));
  const g = rows.reduce((a, r) => a + (r.p.goals || 0), 0), a = rows.reduce((x, r) => x + (r.p.assists || 0), 0), mom = rows.reduce((x, r) => x + (r.p.mom || 0), 0);
  const tier = session === null ? tierOf(all) : tierAt(all.filter(x => x.p.rating !== null), session), photo = photoOf(name, tier.tier);

  // Op de kaart: face stats van de ingevulde build (als die bij het laatste archetype hoort), anders seizoenscijfers.
  const faces = session === null && build && (!build.archetype || Number(build.archetype) === arch) && ['pac', 'sho', 'pas', 'dri', 'def', 'phy'].every(k => build[k]);
  const stats = faces ? [['PAC', build.pac], ['SHO', build.sho], ['PAS', build.pas], ['DRI', build.dri], ['DEF', build.def], ['PHY', build.phy]]
    : session === null && career ? [['WED', career.gamesPlayed], ['RAT', career.ratingAve === null || career.ratingAve === undefined ? '–' : Number(career.ratingAve).toFixed(1)], ['GLS', career.goals], ['ASS', career.assists], ['MOTM', career.mom], ['WIN', `${career.winRate ?? '–'}%`]] // totalen volgens EA
    : [['WED', rows.length], ['RAT', rating === null ? '–' : rating.toFixed(1)], ['GLS', g], ['ASS', a], ['MOTM', mom], ['WIN', `${s.winPct ?? '–'}%`]];

  const tierNames = { goud: 'goud', zwart: 'zwart-goud, in vorm', top: 'topvorm' };
  const shown = cardName(career, name);
  const col = list => `<div class="fut-col">${list.map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  const html = `<div class="fut${photo ? ' has-photo' : ''}" data-tier="${tier.tier}" role="img" title="Kaart: ${tierNames[tier.tier]}${tier.why ? ` (${tier.why})` : ''}" aria-label="Spelerskaart van ${esc(name)}: overall ${career?.proOverall ?? 'onbekend'}, ${info ? info.name : ''}, ${tierNames[tier.tier]}">
      ${futFrame(photo, `${slugOf(name)}${session === null ? '' : `-s${session}`}${key}`, rimOf(rank))}
      <div class="fut-inner">
        <div class="fut-top">
          <div class="fut-ovr"><b>${career?.proOverall ?? '–'}</b>${arch ? `<span class="fut-archicon" title="${esc(archName(arch))}">${archIcon(arch)}</span>` : ''}<img src="crest.png" alt="" width="34" height="34">${flag(career?.proNationality)}</div>
          <div class="fut-photo">${photo ? '' : personIcon()}</div>
        </div>
        <div class="fut-bottom">
        <div class="fut-name${shown.length > 12 ? ' long' : ''}" title="${esc(name)}">${esc(shown)}</div>
        <div class="fut-stats">${col(stats.slice(0, 3))}${col(stats.slice(3))}</div>
        ${tier.tier === 'top' ? '<div class="fut-tier">Topvorm</div>' : tier.tier === 'zwart' ? '<div class="fut-tier">In vorm</div>' : ''}
        </div>
      </div>
    </div>`;
  return { html, rows, career, arch, rating, g, a, tier };
}

function render(name) {
  const el = $('#player-hero'); if (!el || !DATA) return;
  const { html, tier } = cardOf(name);

  // Onder de kaart alleen de vorm: de reeks van de sessie die de vorm bepaalt, per wedstrijd de rating (§9c).
  el.innerHTML = `<div class="pc-wrap">
    ${html}
    ${tier.rows.length ? `<div class="pc-form"><span class="pc-form-date">${dayLabel(tier.rows[0].m.ts)}</span>${ratingDots(tier.rows)}</div>` : ''}
  </div>`;
  reveal(el);
}

// Foto's verschijnen pas als ze geladen zijn, met een zachte fade van 0,3 s; geen laadanimatie ervoor. Ook voor de
// portretten in rondjes (img.fade-img). Een foto die niet laadt, blijft weg.
function reveal(root) {
  for (const img of root.querySelectorAll('image.fut-img:not(.on), img.fade-img:not(.on)')) {
    const src = img.getAttribute('href') || img.getAttribute('src'), i = new Image();
    i.onload = () => img.classList.add('on'); i.src = src;
  }
}

// tier(name): { tier, level, growth, session, rows } voor sorteren en samenvattingen (coach-logica §9c). TIER_RANK: hoger is beter.
// html(name, { session }): de kaart van nu, of met session de sessiekaart. sessionTier(name, id): de tier over die sessie.
const TIER_RANK = { top: 2, zwart: 1, goud: 0 };
// tierOf(rows): de tier op een eerder moment (rows = [{ m, p }] tot dan, zoals in cardOf). photo(name): de foto die bij de huidige vorm hoort, of null.
// portrait(name): altijd de gewone portretfoto, voor rondjes (een gezicht is daar herkenbaarder dan een actiefoto).
window.PlayerCard = { load: () => fetch(API.photos).then(r => r.json()).then(p => { PHOTOS = p || {}; }), render, reveal, html: (name, opts) => cardOf(name, opts).html, tier: name => cardOf(name).tier, sessionTier: (name, id) => cardOf(name, { session: id }).tier, tierOf, photo: name => photoOf(name, cardOf(name).tier.tier), portrait: name => PHOTOS[slugOf(name)] || null, TIER_RANK };
})();
