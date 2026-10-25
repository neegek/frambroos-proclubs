// Spelerskaart bovenaan de spelerspagina: een kaart in FC27-stijl met foto, overall, positie, build en zes cijfers,
// met ernaast alleen wat niet op de kaart staat. Donker thema: thuistenue; licht thema: uittenue.
// Foto's: data/players/<slug>.<webp|png|jpg> (max 900 px), aangeleverd via de chat; de server toont ze op /media/players/.
(() => {
let PHOTOS = {};
const slugOf = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Zonder foto: een rustig icoon in de kleur van de kaart.
function personIcon() {
  return `<svg class="fut-icon" viewBox="0 0 120 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
    <circle cx="60" cy="42" r="22"/><path d="M18 108c4-24 20-36 42-36s38 12 42 36"/></svg>`;
}

// De kaartvorm (300×430): gebogen schouders naar een vlakke bovenkant, punt met inkeping onderaan. Eén pad voor de rand,
// de donkere lijn, de binnenrand en de achtergrond; kleuren komen uit de tier-tokens in style.css.
const FUT_SHAPE = 'M18 74C18 46 52 30 102 28L198 28C248 30 282 46 282 74L282 352C282 380 262 400 230 408C200 414 172 424 160 428L150 423L140 428C128 424 100 414 70 408C38 400 18 380 18 352Z';
function futFrame(photo) {
  const inset = (sx, sy) => `transform="translate(150 215) scale(${sx} ${sy}) translate(-150 -215)"`;
  return `<svg class="fut-frame" viewBox="0 0 300 430" aria-hidden="true">
    <defs>
      <linearGradient id="fut-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1bd"/><stop offset=".35" stop-color="#d9b04a"/><stop offset=".7" stop-color="#8d6c15"/><stop offset="1" stop-color="#f1d27a"/></linearGradient>
      <linearGradient id="fut-bg" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" style="stop-color:var(--t-bg1)"/><stop offset=".55" style="stop-color:var(--t-bg2)"/><stop offset="1" style="stop-color:var(--t-bg3)"/></linearGradient>
      <radialGradient id="fut-glow" cx=".72" cy=".2" r=".6"><stop offset="0" style="stop-color:var(--t-glow)"/><stop offset="1" stop-color="transparent"/></radialGradient>
      <pattern id="fut-lines" patternUnits="userSpaceOnUse" width="34" height="34" patternTransform="rotate(28)"><rect width="3" height="34" style="fill:var(--t-lines)"/></pattern>
      <pattern id="fut-dots" patternUnits="userSpaceOnUse" width="9" height="9"><circle cx="4" cy="4" r="1" style="fill:var(--t-dots)"/></pattern>
      <linearGradient id="fut-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--t-panel)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--t-panel)"/></linearGradient>
      <clipPath id="fut-clip"><path d="${FUT_SHAPE}" ${inset(0.952, 0.966)}/></clipPath>
    </defs>
    <path d="${FUT_SHAPE}" fill="url(#fut-gold)"/>
    <path d="${FUT_SHAPE}" fill="#1a1408" ${inset(0.975, 0.982)}/>
    <path d="${FUT_SHAPE}" fill="url(#fut-bg)" stroke="url(#fut-gold)" stroke-width="2.2" ${inset(0.952, 0.966)}/>
    <g clip-path="url(#fut-clip)">
      <rect width="300" height="430" fill="url(#fut-lines)"/><rect width="300" height="430" fill="url(#fut-dots)"/><rect width="300" height="430" fill="url(#fut-glow)"/>
      ${photo ? `<image href="${photo}" x="0" y="28" width="300" height="212" preserveAspectRatio="xMidYMid slice"/><rect x="0" y="190" width="300" height="50" fill="url(#fut-fade)"/>` : ''}
      <rect x="0" y="240" width="300" height="190" style="fill:var(--t-panel)"/>
    </g>
  </svg>`;
}

// Tier van de kaart (coach-logica §9c): vorm over de laatste 5 wedstrijden tegenover eigen normaal.
function tierOf(ratings) {
  const last5 = ratings.slice(-5), rest = ratings.slice(0, -5);
  if (last5.length < 5) return { tier: 'goud', label: '' };
  const l5 = avg(last5), base = rest.length >= 3 ? avg(rest) : null;
  if (l5 >= 8) return { tier: 'top', label: 'Topvorm', why: `laatste 5: ${l5.toFixed(2)}` };
  if (base !== null && l5 >= base + 0.3) return { tier: 'zwart', label: 'In vorm', why: `laatste 5: ${l5.toFixed(2)}, normaal ${base.toFixed(2)}` };
  return { tier: 'goud', label: '', why: base !== null ? `laatste 5: ${l5.toFixed(2)}, normaal ${base.toFixed(2)}` : '' };
}

// Naam op de kaart: de achternaam van de pro (zoals in het spel), anders de accountnaam.
function cardName(career, name) {
  const pro = (career?.proName || '').trim();
  if (!pro) return name;
  const parts = pro.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : pro;
}

function lastArch(rows) { const r = [...rows].reverse().find(x => x.p.archetypeId); return r ? r.p.archetypeId : null; }

function render(name) {
  const el = $('#player-hero'); if (!el || !DATA) return;
  const rows = DATA.matches.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
  const career = DATA.members.find(x => x.name === name);
  const arch = lastArch(rows), info = ARCHETYPE_INFO[arch], prof = ARCHETYPE_PROFILE[arch];
  const build = window.BuildTab?.get?.(name);
  const s = summarize(rows.map(r => r.m));
  const ratings = rows.map(r => r.p.rating).filter(v => v !== null);
  const rating = avg(ratings);
  const g = rows.reduce((a, r) => a + (r.p.goals || 0), 0), a = rows.reduce((x, r) => x + (r.p.assists || 0), 0), mom = rows.reduce((x, r) => x + (r.p.mom || 0), 0);
  const pos = career ? POS_CODE[career.proPos] : null;
  const photo = PHOTOS[slugOf(name)];

  // Op de kaart: face stats van de ingevulde build (als die bij het laatste archetype hoort), anders seizoenscijfers.
  const faces = build && (!build.archetype || Number(build.archetype) === arch) && ['pac', 'sho', 'pas', 'dri', 'def', 'phy'].every(k => build[k]);
  const stats = faces ? [['PAC', build.pac], ['SHO', build.sho], ['PAS', build.pas], ['DRI', build.dri], ['DEF', build.def], ['PHY', build.phy]]
    : [['WED', rows.length], ['RAT', rating === null ? '–' : rating.toFixed(1)], ['GLS', g], ['ASS', a], ['MOTM', mom], ['WIN', `${s.winPct ?? '–'}%`]];

  // Builds die gespeeld zijn, laatst gespeelde voorop.
  const used = {}; for (const r of rows) if (r.p.archetypeId) used[r.p.archetypeId] = (used[r.p.archetypeId] || 0) + 1;
  const builds = Object.entries(used).sort((x, y) => (Number(y[0]) === arch) - (Number(x[0]) === arch) || y[1] - x[1]);
  const last5 = rows.slice(-5).map(r => r.m);

  const detail = (label, value) => value ? `<div class="pc-row"><dt>${label}</dt><dd>${value}</dd></div>` : '';
  const tier = tierOf(ratings);
  const tierNames = { goud: 'goud', zwart: 'zwart-goud, in vorm', top: 'topvorm' };
  el.innerHTML = `<div class="pc-wrap">
    <div class="fut" data-tier="${tier.tier}" role="img" title="Kaart: ${tierNames[tier.tier]}${tier.why ? ` (${tier.why})` : ''}" aria-label="Spelerskaart van ${esc(name)}: overall ${career?.proOverall ?? 'onbekend'}, ${info ? info.name : ''}, ${tierNames[tier.tier]}">
      ${futFrame(photo)}
      <div class="fut-inner">
        <div class="fut-top">
          <div class="fut-ovr"><b>${career?.proOverall ?? '–'}</b>${arch ? `<span class="fut-archicon" title="${esc(archName(arch))}">${archIcon(arch)}</span>` : ''}<img src="crest.png" alt="" width="34" height="34"></div>
          <div class="fut-photo">${photo ? '' : personIcon()}</div>
        </div>
        <div class="fut-bottom">
        <div class="fut-name" title="${esc(name)}">${esc(cardName(career, name))}</div>
        <div class="fut-arch">${info ? info.name : ''}</div>
        <div class="fut-stats"><div class="fut-col">${stats.slice(0, 3).map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div><div class="fut-col">${stats.slice(3).map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>
        </div>
      </div>
    </div>
    <dl class="pc-details">
      ${detail('Pro', career ? `${esc(career.proName)}${career.proHeight ? ` · ${career.proHeight} cm` : ''}` : '')}
      ${detail('Taak', info ? `${prof.task.charAt(0).toUpperCase() + prof.task.slice(1)}.` : '')}
      ${detail('Builds', builds.map(([id, n]) => `<span class="pc-badge ${Number(id) === arch ? 'on' : ''}">${archName(id)} <small>${Number(id) === arch ? 'laatst · ' : ''}${n}×</small></span>`).join(' '))}
      ${detail('Signature', info ? info.signature : '')}
      ${detail('Vorm', last5.length ? pills(last5) : '')}
      ${detail('Carrière', career ? `${career.gamesPlayed} wedstrijden · ${career.goals} goals · ${career.assists} assists · rating ${career.ratingAve} <small>volgens EA</small>` : '')}
    </dl>
  </div>`;
}

window.PlayerCard = { load: () => fetch(API.photos).then(r => r.json()).then(p => { PHOTOS = p || {}; }), render };
})();
