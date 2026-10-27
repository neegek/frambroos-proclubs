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
function futFrame(photo, uid) {
  const id = k => `fut-${k}-${uid}`;
  const inset = (sx, sy) => `transform="translate(150 215) scale(${sx} ${sy}) translate(-150 -215)"`;
  return `<svg class="fut-frame" viewBox="0 0 300 430" aria-hidden="true">
    <defs>
      <linearGradient id="${id('gold')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1bd"/><stop offset=".35" stop-color="#d9b04a"/><stop offset=".7" stop-color="#8d6c15"/><stop offset="1" stop-color="#f1d27a"/></linearGradient>
      <linearGradient id="${id('bg')}" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" style="stop-color:var(--t-bg1)"/><stop offset=".55" style="stop-color:var(--t-bg2)"/><stop offset="1" style="stop-color:var(--t-bg3)"/></linearGradient>
      <linearGradient id="${id('sheen')}" x1="0" y1="0" x2="1" y2="0.9"><stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".45" style="stop-color:var(--t-sheen)"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <pattern id="${id('dots')}" patternUnits="userSpaceOnUse" width="9" height="9"><circle cx="4" cy="4" r="1" style="fill:var(--t-dots)"/></pattern>
      <linearGradient id="${id('fade')}" x1="0" y1="0" x2="0" y2="1"><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
      <mask id="${id('photo-mask')}"><rect x="0" y="0" width="300" height="250" fill="url(#${id('fade')})"/></mask>
      <clipPath id="${id('clip')}"><path d="${FUT_SHAPE}" ${inset(0.952, 0.966)}/></clipPath>
    </defs>
    <path d="${FUT_SHAPE}" fill="url(#${id('gold')})"/>
    <path d="${FUT_SHAPE}" fill="#1a1408" ${inset(0.975, 0.982)}/>
    <path d="${FUT_SHAPE}" fill="url(#${id('bg')})" stroke="url(#${id('gold')})" stroke-width="2.2" ${inset(0.952, 0.966)}/>
    <g clip-path="url(#${id('clip')})">
      <rect width="300" height="430" fill="url(#${id('sheen')})"/><rect width="300" height="430" fill="url(#${id('dots')})"/>
      ${photo ? `<g mask="url(#${id('photo-mask')})"><rect x="0" y="0" width="300" height="250" style="fill:var(--t-photo)"/><image href="${photo}" x="34" y="52" width="240" height="198" preserveAspectRatio="xMaxYMin slice"/></g>` : ''}
    </g>
  </svg>`;
}

// Tier van de kaart (coach-logica §9c): twee wegen naar "in vorm", niveau of groei (rating plus winst).
const PTS = { W: 3, D: 1, L: 0 };
function tierOf(rows) {
  const r = rows.filter(x => x.p.rating !== null), last5 = r.slice(-5), rest = r.slice(0, -5);
  if (last5.length < 5) return { tier: 'goud', why: '', level: avg(last5.map(x => x.p.rating)), growth: null };
  const level = avg(last5.map(x => x.p.rating)), wins = last5.filter(x => x.m.result === 'W').length;
  const growth = rest.length >= 3
    ? (level - avg(rest.map(x => x.p.rating))) + 0.25 * (avg(last5.map(x => PTS[x.m.result])) - avg(rest.map(x => PTS[x.m.result])))
    : null;
  const why = `laatste 5: rating ${level.toFixed(2)}, ${wins}× gewonnen${growth !== null ? `, groei ${growth >= 0 ? '+' : ''}${growth.toFixed(2)}` : ''}`;
  if (level >= 8 && wins >= 3) return { tier: 'top', why, level, growth };
  if (level >= 7.5 || (growth !== null && r.length >= 8 && growth >= 0.3)) return { tier: 'zwart', why, level, growth };
  return { tier: 'goud', why, level, growth };
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

function cardOf(name) {
  const rows = DATA.matches.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
  const career = DATA.members.find(x => x.name === name);
  const arch = lastArch(rows), info = ARCHETYPE_INFO[arch];
  const build = window.BuildTab?.get?.(name);
  const s = summarize(rows.map(r => r.m));
  const rating = avg(rows.map(r => r.p.rating).filter(v => v !== null));
  const g = rows.reduce((a, r) => a + (r.p.goals || 0), 0), a = rows.reduce((x, r) => x + (r.p.assists || 0), 0), mom = rows.reduce((x, r) => x + (r.p.mom || 0), 0);
  const tier = tierOf(rows), photo = photoOf(name, tier.tier);

  // Op de kaart: face stats van de ingevulde build (als die bij het laatste archetype hoort), anders seizoenscijfers.
  const faces = build && (!build.archetype || Number(build.archetype) === arch) && ['pac', 'sho', 'pas', 'dri', 'def', 'phy'].every(k => build[k]);
  const stats = faces ? [['PAC', build.pac], ['SHO', build.sho], ['PAS', build.pas], ['DRI', build.dri], ['DEF', build.def], ['PHY', build.phy]]
    : career ? [['WED', career.gamesPlayed], ['RAT', career.ratingAve === null || career.ratingAve === undefined ? '–' : Number(career.ratingAve).toFixed(1)], ['GLS', career.goals], ['ASS', career.assists], ['MOTM', career.mom], ['WIN', `${career.winRate ?? '–'}%`]] // totalen volgens EA
    : [['WED', rows.length], ['RAT', rating === null ? '–' : rating.toFixed(1)], ['GLS', g], ['ASS', a], ['MOTM', mom], ['WIN', `${s.winPct ?? '–'}%`]];

  const tierNames = { goud: 'goud', zwart: 'zwart-goud, in vorm', top: 'topvorm' };
  const shown = cardName(career, name);
  const col = list => `<div class="fut-col">${list.map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  const html = `<div class="fut${photo ? ' has-photo' : ''}" data-tier="${tier.tier}" role="img" title="Kaart: ${tierNames[tier.tier]}${tier.why ? ` (${tier.why})` : ''}" aria-label="Spelerskaart van ${esc(name)}: overall ${career?.proOverall ?? 'onbekend'}, ${info ? info.name : ''}, ${tierNames[tier.tier]}">
      ${futFrame(photo, slugOf(name))}
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
  const { html, rows, career, arch, rating, g, a } = cardOf(name);
  const info = ARCHETYPE_INFO[arch], prof = ARCHETYPE_PROFILE[arch];

  // Builds die gespeeld zijn, laatst gespeelde voorop.
  const used = {}; for (const r of rows) if (r.p.archetypeId) used[r.p.archetypeId] = (used[r.p.archetypeId] || 0) + 1;
  const builds = Object.entries(used).sort((x, y) => (Number(y[0]) === arch) - (Number(x[0]) === arch) || y[1] - x[1]);
  const last5 = rows.slice(-5).map(r => r.m);

  const detail = (label, value) => value ? `<div class="pc-row"><dt>${label}</dt><dd>${value}</dd></div>` : '';
  el.innerHTML = `<div class="pc-wrap">
    ${html}
    <dl class="pc-details">
      ${detail('Pro', career ? `${esc(career.proName)}${career.proHeight ? ` · ${career.proHeight} cm` : ''}` : '')}
      ${detail('Taak', info ? `${prof.task.charAt(0).toUpperCase() + prof.task.slice(1)}.` : '')}
      ${detail('Builds', builds.map(([id, n]) => `<span class="pc-badge ${Number(id) === arch ? 'on' : ''}">${archName(id)} <small>${Number(id) === arch ? 'laatst · ' : ''}${n}×</small></span>`).join(' '))}
      ${detail('Signature', info ? info.signature : '')}
      ${detail('Vorm', last5.length ? pills(last5) : '')}
      ${detail('Gevolgd', rows.length ? `${rows.length} wedstrijden · ${g} goals · ${a} assists · rating ${rating === null ? '–' : rating.toFixed(2)} <small>in deze app</small>` : '')}
    </dl>
  </div>`;
}

// tier(name): { tier, level, growth } voor sorteren en samenvattingen (coach-logica §9c). TIER_RANK: hoger is beter.
const TIER_RANK = { top: 2, zwart: 1, goud: 0 };
// tierOf(rows): de tier op een eerder moment (rows = [{ m, p }] tot dan, zoals in cardOf). photo(name): de foto die bij de huidige vorm hoort, of null.
window.PlayerCard = { load: () => fetch(API.photos).then(r => r.json()).then(p => { PHOTOS = p || {}; }), render, html: name => cardOf(name).html, tier: name => cardOf(name).tier, tierOf, photo: name => photoOf(name, cardOf(name).tier.tier), TIER_RANK };
})();
