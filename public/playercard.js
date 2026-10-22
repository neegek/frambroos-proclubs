// Spelerskaart bovenaan de spelerspagina: een kaart in FC27-stijl met foto, overall, positie, build en zes cijfers,
// met ernaast alleen wat niet op de kaart staat. Donker thema: thuistenue; licht thema: uittenue.
// Foto's: data/players/<slug>.<webp|png|jpg> (max 900 px), aangeleverd via de chat; de server toont ze op /media/players/.
(() => {
let PHOTOS = {};
const slugOf = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const isLight = () => document.documentElement.dataset.theme === 'light';

// Silhouet in het tenue van de club, als er nog geen foto is.
function silhouette(kit) {
  const [c1, c2, c3] = kit || ['#2b2b2b', '#ffd200', '#582063'];
  return `<svg class="fut-sil" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="70" r="34" fill="currentColor" opacity=".35"/>
    <path d="M30 200 C34 150 60 124 100 124 C140 124 166 150 170 200 Z" fill="${c1}" stroke="${c2}" stroke-width="3"/>
    <path d="M80 126 Q100 146 120 126" fill="none" stroke="${c2}" stroke-width="6" stroke-linecap="round"/>
    <path d="M40 182 L60 160 M160 182 L140 160" stroke="${c3}" stroke-width="6" stroke-linecap="round"/></svg>`;
}

function lastArch(rows) { const r = [...rows].reverse().find(x => x.p.archetypeId); return r ? r.p.archetypeId : null; }

function render(name) {
  const el = $('#player-hero'); if (!el || !DATA) return;
  const rows = DATA.matches.map(m => ({ m, p: m.players.find(p => p.name === name) })).filter(r => r.p);
  const career = DATA.members.find(x => x.name === name);
  const kits = DATA.club.kits, kit = isLight() ? kits?.away : kits?.home;
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
    : [['WED', rows.length], ['RAT', rating === null ? '–' : rating.toFixed(1)], ['G', g], ['A', a], ['MOTM', mom], ['WIN', `${s.winPct ?? '–'}%`]];

  // Builds die gespeeld zijn, laatst gespeelde voorop.
  const used = {}; for (const r of rows) if (r.p.archetypeId) used[r.p.archetypeId] = (used[r.p.archetypeId] || 0) + 1;
  const builds = Object.entries(used).sort((x, y) => (Number(y[0]) === arch) - (Number(x[0]) === arch) || y[1] - x[1]);
  const last5 = rows.slice(-5).map(r => r.m);

  const detail = (label, value) => value ? `<div class="pc-row"><dt>${label}</dt><dd>${value}</dd></div>` : '';
  el.innerHTML = `<div class="pc-wrap">
    <div class="fut" role="img" aria-label="Spelerskaart van ${esc(name)}: overall ${career?.proOverall ?? 'onbekend'}, ${pos ?? ''}, ${info ? info.name : ''}">
      <div class="fut-inner">
        <div class="fut-top">
          <div class="fut-ovr"><b>${career?.proOverall ?? '–'}</b><span>${pos ?? ''}</span><img src="/crest.png" alt="" width="34" height="34"></div>
          <div class="fut-photo">${photo ? `<img src="${photo}" alt="">` : silhouette(kit)}</div>
        </div>
        <div class="fut-name">${esc(name)}</div>
        <div class="fut-arch">${info ? info.name : ''}</div>
        <div class="fut-stats">${stats.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>
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

window.PlayerCard = { load: () => fetch('/api/photos').then(r => r.json()).then(p => { PHOTOS = p || {}; }), render };
})();
