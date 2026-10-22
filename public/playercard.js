// Spelerskaart bovenaan de spelerspagina: een visitekaartje in FC-stijl met foto, rating, positie, build en cijfers.
// Donker thema: thuistenue; licht thema: uittenue. Foto's: data/players/<slug>.<ext>, te uploaden via de kaart.
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

  el.innerHTML = `<div class="pc-wrap">
    <div class="fut" role="img" aria-label="Spelerskaart van ${esc(name)}">
      <div class="fut-inner">
        <div class="fut-top">
          <div class="fut-ovr"><b>${career?.proOverall ?? '–'}</b><span>${pos ?? ''}</span><img src="/crest.png" alt="" width="30" height="30"></div>
          <div class="fut-photo">${photo ? `<img src="${photo}" alt="Foto van ${esc(name)}">` : silhouette(kit)}</div>
        </div>
        <div class="fut-name">${esc(name)}</div>
        <div class="fut-arch">${info ? info.name : ''}</div>
        <div class="fut-stats">${stats.map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
        <div class="fut-foot">FRAMBROOS · FC27</div>
      </div>
    </div>
    <div class="pc-info">
      <div class="pc-eyebrow">Frambroos · speler</div>
      <h1 class="pc-name">${esc(name)}</h1>
      <div class="pc-sub">${career ? `${esc(career.proName)}${career.proHeight ? ` · ${career.proHeight} cm` : ''}${pos ? ` · ingestelde positie ${pos}` : ''} · overall ${career.proOverall}` : ''}</div>
      ${info ? `<p class="pc-task">${info.name}: ${prof.task}.</p>` : ''}
      <div class="pc-badges">${builds.map(([id, n]) => `<span class="pc-badge ${Number(id) === arch ? 'on' : ''}">${archName(id)} <small>${Number(id) === arch ? 'laatst gespeeld · ' : ''}${n}×</small></span>`).join('')}${info ? `<span class="pc-badge sig">Signature: ${info.signature}</span>` : ''}</div>
      <div class="pc-stats">
        <div><span>Wedstrijden</span><b>${rows.length}</b></div>
        <div><span>Rating</span><b>${rating === null ? '–' : rating.toFixed(2)}</b>${career ? `<small>carrière ${career.ratingAve}</small>` : ''}</div>
        <div><span>Goals + assists</span><b>${g} + ${a}</b>${career ? `<small>carrière ${career.goals} + ${career.assists}</small>` : ''}</div>
        <div><span>MOTM</span><b>${mom}</b></div>
        <div><span>Winst</span><b>${s.winPct ?? '–'}%</b></div>
      </div>
      <div class="pc-form"><span>Vorm</span>${last5.length ? pills(last5) : '–'}</div>
      <div class="pc-actions">
        <label class="btn-ghost"><input type="file" id="photo-input" accept="image/png,image/jpeg,image/webp" hidden>${photo ? 'Foto vervangen' : 'Foto toevoegen'}</label>
        ${photo ? '<button type="button" class="btn-ghost" id="photo-remove">Foto verwijderen</button>' : ''}
        <span class="pc-hint" id="photo-status">${photo ? '' : 'Een PNG met transparante achtergrond werkt het mooist.'}</span>
      </div>
    </div>
  </div>`;
  $('#photo-input').addEventListener('change', e => upload(name, e.target.files[0]));
  $('#photo-remove')?.addEventListener('click', () => remove(name));
}

// Verkleinen voor de repo: maximaal 900 px aan de lange kant; WebP houdt transparantie, anders PNG.
async function shrink(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise(res => c.toBlob(res, 'image/webp', 0.9));
  return blob && blob.type === 'image/webp' ? blob : await new Promise(res => c.toBlob(res, 'image/png'));
}

async function upload(name, file) {
  if (!file) return;
  const status = $('#photo-status'); status.textContent = 'Foto verwerken…';
  try {
    const blob = await shrink(file);
    const res = await fetch(`/api/players/${encodeURIComponent(name)}/photo`, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
    if (!res.ok) throw new Error(await res.text());
    PHOTOS[slugOf(name)] = await res.json();
    render(name);
  } catch (err) { status.textContent = `Niet gelukt: ${err.message}`; }
}
async function remove(name) {
  await fetch(`/api/players/${encodeURIComponent(name)}/photo`, { method: 'DELETE' });
  delete PHOTOS[slugOf(name)];
  render(name);
}

window.PlayerCard = { load: () => fetch('/api/photos').then(r => r.json()).then(p => { PHOTOS = p || {}; }), render };
})();
