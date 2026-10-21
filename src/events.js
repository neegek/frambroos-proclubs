// Vertaalt de eventstring uit match_event_aggregate_* naar benoemde velden.
// Codeboek met bewijs en bronnen: docs/event-codes.md. Dit bestand is de machineleesbare versie.
//
// Gebruik:
//   import { decodeEvents, fullEventString, EVENT_CODES } from './events.js';
//   const stats = decodeEvents(row.event_aggregate);   // { passes_completed: 21, ... }
//   const str = fullEventString(eaPlayerObject);        // _0.._3 aan elkaar (EA kapt _0 af op ~250 tekens)

/** Parseert "0:1,1:2,100:3" naar { 0: 1, 1: 2, 100: 3 }. Dubbele codes worden opgeteld. */
export function parseEventString(str) {
  const out = {};
  if (!str) return out;
  for (const part of String(str).split(',')) {
    const [code, count] = part.split(':');
    if (!code || count === undefined) continue;
    const n = Number(count);
    if (!Number.isFinite(n)) continue;
    const k = code.trim();
    out[k] = (out[k] || 0) + n;
  }
  return out;
}

/** Plakt match_event_aggregate_0.._3 van een EA-spelerobject aan elkaar. */
export function fullEventString(player) {
  return [0, 1, 2, 3].map(i => player?.[`match_event_aggregate_${i}`] || '').filter(Boolean).join(',');
}

/**
 * Codeboek. confidence: 'zeker' (exact gelijk aan een EA-veld of een gelabeld scherm, hier én elders),
 * 'waarschijnlijk' (sterk statistisch bewijs of community-bevestiging, hier niet exact toetsbaar),
 * 'mogelijk' (hint, zwak bewijs). Niet-opgenomen codes zijn onbekend; zie docs/event-codes.md.
 * key = veldnaam in de uitvoer van decodeEvents.
 */
export const EVENT_CODES = {
  // --- passen ---
  215: { key: 'passes_completed', label: 'Geslaagde passes', confidence: 'zeker', group: 'passen' },
  216: { key: 'passes_failed', label: 'Mislukte passes', confidence: 'zeker', group: 'passen' },
  153: { key: 'passes_offside', label: 'Passes die buitenspel opleverden', confidence: 'waarschijnlijk', group: 'passen' },
  30: { key: 'passes_completed_forward', label: 'Geslaagde passes vooruit', confidence: 'zeker', group: 'passen' },
  32: { key: 'passes_completed_backward', label: 'Geslaagde passes achteruit', confidence: 'zeker', group: 'passen' },
  34: { key: 'passes_completed_sideways', label: 'Geslaagde passes opzij', confidence: 'zeker', group: 'passen' },
  31: { key: 'passes_failed_forward', label: 'Mislukte passes vooruit', confidence: 'zeker', group: 'passen' },
  33: { key: 'passes_failed_backward', label: 'Mislukte passes achteruit', confidence: 'zeker', group: 'passen' },
  35: { key: 'passes_failed_sideways', label: 'Mislukte passes opzij', confidence: 'zeker', group: 'passen' },
  24: { key: 'passes_completed_short', label: 'Geslaagde korte passes', confidence: 'zeker', group: 'passen' },
  26: { key: 'passes_completed_medium', label: 'Geslaagde middellange passes', confidence: 'zeker', group: 'passen' },
  28: { key: 'passes_completed_long', label: 'Geslaagde lange passes', confidence: 'zeker', group: 'passen' },
  36: { key: 'crosses_completed', label: 'Geslaagde voorzetten', confidence: 'zeker', group: 'passen' },
  25: { key: 'passes_failed_short', label: 'Mislukte korte passes', confidence: 'zeker', group: 'passen' },
  27: { key: 'passes_failed_medium', label: 'Mislukte middellange passes', confidence: 'zeker', group: 'passen' },
  29: { key: 'passes_failed_long', label: 'Mislukte lange passes', confidence: 'zeker', group: 'passen' },
  37: { key: 'crosses_failed', label: 'Mislukte voorzetten', confidence: 'zeker', group: 'passen' },
  157: { key: 'crosses_attempted', label: 'Voorzetten (pogingen)', confidence: 'zeker', group: 'passen' },
  143: { key: 'first_time_passes', label: 'Passes ineens (first-time)', confidence: 'waarschijnlijk', group: 'passen' },
  144: { key: 'switches_of_play', label: 'Spelverleggingen', confidence: 'waarschijnlijk', group: 'passen' },
  147: { key: 'flair_passes', label: 'Fancy/flair passes', confidence: 'waarschijnlijk', group: 'passen' },
  152: { key: 'through_balls', label: 'Geslaagde steekpasses', confidence: 'waarschijnlijk', group: 'passen' },
  151: { key: 'bad_passes', label: 'Slechte passes (hospitaalballen)', confidence: 'mogelijk', group: 'passen' },
  150: { key: 'tiki_taka_passes', label: 'Tiki-taka-passes (playstyle)', confidence: 'mogelijk', group: 'passen' },
  // --- schieten en scoren ---
  214: { key: 'goals', label: 'Doelpunten', confidence: 'zeker', group: 'schieten' },
  11: { key: 'assists', label: 'Assists', confidence: 'zeker', group: 'schieten' },
  115: { key: 'second_assists', label: 'Tweede assists (pre-assists)', confidence: 'waarschijnlijk', group: 'schieten' },
  118: { key: 'assists_through_ball', label: 'Assists uit een steekpass', confidence: 'waarschijnlijk', group: 'schieten' },
  117: { key: 'assists_corner', label: 'Assists uit een corner', confidence: 'mogelijk', group: 'schieten' },
  217: { key: 'shots_on_target', label: 'Schoten op doel (incl. geblokt)', confidence: 'zeker', group: 'schieten' },
  218: { key: 'shots_off_target', label: 'Schoten naast', confidence: 'zeker', group: 'schieten' },
  13: { key: 'shots_on_target_inside_box', label: 'Schoten op doel binnen de zestien', confidence: 'zeker', group: 'schieten' },
  18: { key: 'shots_on_target_outside_box', label: 'Schoten op doel buiten de zestien', confidence: 'zeker', group: 'schieten' },
  14: { key: 'shots_off_target_inside_box', label: 'Schoten naast binnen de zestien', confidence: 'zeker', group: 'schieten' },
  19: { key: 'shots_off_target_outside_box', label: 'Schoten naast buiten de zestien', confidence: 'zeker', group: 'schieten' },
  202: { key: 'shots_saved', label: 'Schoten gered door de keeper', confidence: 'waarschijnlijk', group: 'schieten' },
  203: { key: 'penalties_taken', label: 'Genomen strafschoppen', confidence: 'waarschijnlijk', group: 'schieten' },
  128: { key: 'goals_first_time', label: 'Doelpunten ineens', confidence: 'waarschijnlijk', group: 'schieten' },
  131: { key: 'goals_weak_foot', label: 'Doelpunten met de zwakke voet', confidence: 'waarschijnlijk', group: 'schieten' },
  136: { key: 'goals_off_post', label: 'Doelpunten via de paal', confidence: 'waarschijnlijk', group: 'schieten' },
  123: { key: 'goals_chip', label: 'Doelpunten met een lob', confidence: 'waarschijnlijk', group: 'schieten' },
  125: { key: 'goals_header', label: 'Kopdoelpunten', confidence: 'mogelijk', group: 'schieten' },
  12: { key: 'goals_tag_12', label: 'Doelpunt-techniek (onbekend welke)', confidence: 'mogelijk', group: 'schieten' },
  238: { key: 'goals_outside_box_a', label: 'Doelpunten van buiten de zestien (afstandsband a)', confidence: 'mogelijk', group: 'schieten' },
  239: { key: 'goals_outside_box_b', label: 'Doelpunten van buiten de zestien (afstandsband b)', confidence: 'mogelijk', group: 'schieten' },
  16: { key: 'shots_type_16', label: 'Schottype (finesse of misser in de zestien)', confidence: 'mogelijk', group: 'schieten' },
  21: { key: 'shots_type_21', label: 'Schottype (power shot?)', confidence: 'mogelijk', group: 'schieten' },
  // --- dribbelen ---
  174: { key: 'dribbles_completed', label: 'Geslaagde dribbels', confidence: 'waarschijnlijk', group: 'dribbelen' },
  97: { key: 'ball_carries', label: 'Balcarries (dribbles carried)', confidence: 'waarschijnlijk', group: 'dribbelen' },
  112: { key: 'players_beaten', label: 'Tegenstanders uitgespeeld (incl. skill moves)', confidence: 'waarschijnlijk', group: 'dribbelen' },
  38: { key: 'skill_move_beats', label: 'Uitgespeeld met een skill move', confidence: 'waarschijnlijk', group: 'dribbelen' },
  119: { key: 'beats_type_119', label: 'Uitspeel-type (omvat alle skill-move-beats)', confidence: 'mogelijk', group: 'dribbelen' },
  211: { key: 'beats_type_211', label: 'Uitspeel-type (onbekend)', confidence: 'mogelijk', group: 'dribbelen' },
  // --- verdedigen ---
  164: { key: 'tackles_won', label: 'Gewonnen tackles', confidence: 'zeker', group: 'verdedigen' },
  229: { key: 'standing_tackles_won', label: 'Gewonnen staande tackles', confidence: 'zeker', group: 'verdedigen' },
  230: { key: 'sliding_tackles_won', label: 'Gewonnen slidings', confidence: 'zeker', group: 'verdedigen' },
  0: { key: 'tackles_won_alt', label: 'Gewonnen tackles (variant, ≤ 164)', confidence: 'waarschijnlijk', group: 'verdedigen' },
  1: { key: 'tackles_lost', label: 'Verloren tackles (deel van de mislukte pogingen)', confidence: 'waarschijnlijk', group: 'verdedigen' },
  163: { key: 'tackles_dangerous', label: 'Gevaarlijke/mislukte tackles', confidence: 'waarschijnlijk', group: 'verdedigen' },
  121: { key: 'standing_tackles_won_dup', label: 'Kopie van 229', confidence: 'zeker', group: 'verdedigen' },
  120: { key: 'sliding_tackles_won_dup', label: 'Kopie van 230', confidence: 'zeker', group: 'verdedigen' },
  166: { key: 'sliding_tackles_type_166', label: 'Sliding-subtype (≤ 230)', confidence: 'mogelijk', group: 'verdedigen' },
  162: { key: 'tackles_type_162', label: 'Tackle-subtype (≤ 164)', confidence: 'mogelijk', group: 'verdedigen' },
  6: { key: 'interceptions', label: 'Onderscheppingen', confidence: 'waarschijnlijk', group: 'verdedigen' },
  158: { key: 'dispossessions', label: 'Tegenstander van de bal gezet', confidence: 'waarschijnlijk', group: 'verdedigen' },
  5: { key: 'blocks', label: 'Blocks', confidence: 'waarschijnlijk', group: 'verdedigen' },
  9: { key: 'clearances', label: 'Wegwerkballen', confidence: 'mogelijk', group: 'verdedigen' },
  156: { key: 'crosses_blocked', label: 'Geblokte voorzetten', confidence: 'waarschijnlijk', group: 'verdedigen' },
  265: { key: 'aerial_duels_won_attacking', label: 'Gewonnen luchtduels (aanvallend)', confidence: 'waarschijnlijk', group: 'verdedigen' },
  266: { key: 'aerial_duels_won_defending', label: 'Gewonnen luchtduels (verdedigend)', confidence: 'waarschijnlijk', group: 'verdedigen' },
  // --- balbezit ---
  105: { key: 'possession_lost_def_third', label: 'Balverlies op eigen helft (verdedigend derde)', confidence: 'waarschijnlijk', group: 'balbezit' },
  106: { key: 'possession_lost_mid_third', label: 'Balverlies op het middenveld', confidence: 'waarschijnlijk', group: 'balbezit' },
  107: { key: 'possession_lost_att_third', label: 'Balverlies op de helft van de tegenstander', confidence: 'waarschijnlijk', group: 'balbezit' },
  108: { key: 'possession_won_def_third', label: 'Balwinst op eigen helft (verdedigend derde)', confidence: 'waarschijnlijk', group: 'balbezit' },
  109: { key: 'possession_won_mid_third', label: 'Balwinst op het middenveld', confidence: 'waarschijnlijk', group: 'balbezit' },
  110: { key: 'possession_won_att_third', label: 'Balwinst op de helft van de tegenstander', confidence: 'waarschijnlijk', group: 'balbezit' },
  // --- overtredingen en spelhervattingen ---
  2: { key: 'fouls_conceded', label: 'Overtredingen (buiten eigen verdedigend derde)', confidence: 'waarschijnlijk', group: 'discipline' },
  3: { key: 'fouls_conceded_def_third', label: 'Overtredingen in het eigen verdedigend derde', confidence: 'waarschijnlijk', group: 'discipline' },
  171: { key: 'free_kicks_conceded', label: 'Vrije trappen weggegeven (= 2 + 3)', confidence: 'zeker', group: 'discipline' },
  4: { key: 'fouls_won', label: 'Overtredingen tegen (vrije trappen gewonnen)', confidence: 'waarschijnlijk', group: 'discipline' },
  95: { key: 'yellow_cards', label: 'Gele kaarten (direct)', confidence: 'waarschijnlijk', group: 'discipline' },
  213: { key: 'yellow_cards_delayed', label: 'Gele kaarten na voordeel', confidence: 'waarschijnlijk', group: 'discipline' },
  94: { key: 'penalties_conceded', label: 'Strafschoppen weggegeven', confidence: 'waarschijnlijk', group: 'discipline' },
  96: { key: 'red_card_trigger', label: 'Rode kaart / zware overtreding', confidence: 'mogelijk', group: 'discipline' },
  104: { key: 'offsides', label: 'Buitenspel gestaan', confidence: 'waarschijnlijk', group: 'discipline' },
  145: { key: 'corners_taken', label: 'Genomen corners', confidence: 'waarschijnlijk', group: 'discipline' },
  10: { key: 'corners_conceded', label: 'Corners weggegeven (of: linie gebroken met een hoge bal)', confidence: 'mogelijk', group: 'discipline' },
  8: { key: 'line_breaks_around', label: 'Verdedigingslinie gebroken (omheen) / headed pass', confidence: 'mogelijk', group: 'passen' },
  184: { key: 'line_breaks_through', label: 'Verdedigingslinie gebroken (erdoorheen)', confidence: 'mogelijk', group: 'passen' },
  // --- positiespel en wedstrijdfeedback ---
  111: { key: 'in_position', label: 'Goed gepositioneerd (feedback)', confidence: 'waarschijnlijk', group: 'positie' },
  219: { key: 'out_of_position', label: 'Uit positie (totaal)', confidence: 'zeker', group: 'positie' },
  99: { key: 'out_of_position_1', label: 'Uit positie, ernst 1/5', confidence: 'waarschijnlijk', group: 'positie' },
  100: { key: 'out_of_position_2', label: 'Uit positie, ernst 2/5', confidence: 'waarschijnlijk', group: 'positie' },
  101: { key: 'out_of_position_3', label: 'Uit positie, ernst 3/5', confidence: 'waarschijnlijk', group: 'positie' },
  102: { key: 'out_of_position_4', label: 'Uit positie, ernst 4/5', confidence: 'waarschijnlijk', group: 'positie' },
  103: { key: 'out_of_position_5', label: 'Uit positie, ernst 5/5', confidence: 'waarschijnlijk', group: 'positie' },
  175: { key: 'fb_no_good_option', label: 'Feedback: geen goede optie', confidence: 'waarschijnlijk', group: 'feedback' },
  176: { key: 'fb_good_option', label: 'Feedback: goede optie gekozen', confidence: 'waarschijnlijk', group: 'feedback' },
  177: { key: 'fb_best_option', label: 'Feedback: beste optie gekozen', confidence: 'waarschijnlijk', group: 'feedback' },
  182: { key: 'fb_should_have_passed_elsewhere', label: 'Feedback: had elders moeten passen', confidence: 'waarschijnlijk', group: 'feedback' },
  183: { key: 'fb_chose_to_pass', label: 'Feedback: koos voor de pass', confidence: 'waarschijnlijk', group: 'feedback' },
  212: { key: 'fb_use_the_ball', label: 'Feedback: gebruik de bal', confidence: 'waarschijnlijk', group: 'feedback' },
  207: { key: 'fb_pick_your_pass', label: 'Feedback: kies je pass', confidence: 'waarschijnlijk', group: 'feedback' },
  179: { key: 'fb_should_have_shot', label: 'Feedback: had moeten schieten', confidence: 'mogelijk', group: 'feedback' },
  // --- team/wedstrijd ---
  113: { key: 'clean_sheet', label: 'Clean sheet (team won zonder tegengoal)', confidence: 'zeker', group: 'team' },
  267: { key: 'good_direction_saves', label: 'Reddingen de goede kant op (keeper)', confidence: 'waarschijnlijk', group: 'keeper' },
};

const sum = (ev, ...codes) => codes.reduce((s, c) => s + (ev[c] || 0), 0);

/**
 * Afgeleide velden op basis van het codeboek. Elke functie krijgt de ruwe codes-map.
 * `ball_actions` is een proxy voor "aan de bal komen": passpogingen + schoten + geslaagde dribbels + gewonnen
 * ballen. EA levert geen echte balcontacten; dit telt de acties die aantoonbaar met bal aan de voet gebeuren.
 */
export const DERIVED = {
  pass_attempts: ev => sum(ev, 215, 216, 153),
  pass_accuracy: ev => { const a = sum(ev, 215, 216, 153); return a ? sum(ev, 215) / a : null; },
  shots: ev => sum(ev, 217, 218),
  shots_inside_box: ev => sum(ev, 13, 14),
  shots_outside_box: ev => sum(ev, 18, 19),
  fouls_conceded_total: ev => sum(ev, 2, 3),
  yellow_cards_total: ev => sum(ev, 95, 213),
  possession_lost: ev => sum(ev, 105, 106, 107),
  possession_won: ev => sum(ev, 108, 109, 110),
  players_beaten_no_skill: ev => Math.max(0, sum(ev, 112) - sum(ev, 38)),
  feedback_passes_graded: ev => sum(ev, 175, 176, 177, 182),
  feedback_good_share: ev => { const n = sum(ev, 175, 176, 177, 182); return n ? sum(ev, 176, 177) / n : null; },
  ball_actions: ev => sum(ev, 215, 216, 153, 217, 218, 174, 108, 109, 110),
};

/**
 * Vertaalt een eventstring (of al geparseerde map) naar een object met benoemde velden.
 * Onbekende codes komen terug onder `unknown` als { code: count }.
 */
export function decodeEvents(input) {
  const ev = typeof input === 'string' || input == null ? parseEventString(input) : input;
  const out = { unknown: {} };
  for (const [code, count] of Object.entries(ev)) {
    const def = EVENT_CODES[code];
    if (def) out[def.key] = count; else out.unknown[code] = count;
  }
  for (const def of Object.values(EVENT_CODES)) out[def.key] ??= 0;
  for (const [key, fn] of Object.entries(DERIVED)) out[key] = fn(ev);
  return out;
}

/** Codes waarvoor een betekenis bekend is, gegroepeerd per groep (handig voor het dashboard). */
export function codesByGroup() {
  const groups = {};
  for (const [code, def] of Object.entries(EVENT_CODES)) (groups[def.group] ||= []).push({ code: Number(code), ...def });
  return groups;
}
