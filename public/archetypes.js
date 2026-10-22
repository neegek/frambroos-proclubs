// Referentiedata over FC27-archetypes (builds). Bronnen en datums: docs/archetypes.md.
// Sleutels van attributen zijn dezelfde als in builds.js (ATTRS); namen worden in het Engels getoond.
// LET OP: de prijsklassen (tiers) zijn van Pro Clubs HQ, bijgewerkt 15 oktober 2026, dus van vóór EA's AP-update van
// 22 oktober 2026. Die update staat per archetype in `patch` (officieel EA: welke attributen duurder of goedkoper werden).

const AP_COST = {
  // Kosten per +1, afhankelijk van de waarde waar je naartoe gaat. Kolommen: cheapest, cheap, expensive, mostExpensive.
  // Bron: Pro Clubs HQ (pro-clubs-attribute-upgrade-costs), vóór 22-10-2026.
  steps: [[60, [1, 1, 1, 2]], [63, [1, 1, 2, 3]], [66, [1, 2, 3, 4]], [69, [1, 2, 3, 5]], [74, [2, 3, 4, 6]], [79, [3, 4, 6, 8]], [84, [3, 5, 7, 10]],
    [89, [6, 8, 11, 15]], [92, [8, 11, 15, 20]], [94, [10, 15, 20, 25]], [95, [15, 20, 25, 30]], [96, [20, 25, 30, 35]], [97, [25, 30, 35, 40]], [98, [30, 35, 40, 45]], [99, [35, 40, 45, 50]]],
  tierNames: ['goedkoopst', 'goedkoop', 'duur', 'duurst'],
};
const LEVELS = {
  // Bron: Pro Clubs HQ (pro-clubs-level-rewards), bijgewerkt 20 oktober 2026.
  cap: 40, apAt: { 1: 100, 10: 224, 15: 301, 20: 397, 25: 511, 30: 674, 40: 962 },
  playstyleSlots: [5, 15, 40], signatureGoldAt: 20, matchXpToCap: 16000,
  note: 'Masteries: +1 op twee attributen op level 10 en nog +1 op één daarvan op level 30; permanent en voor alle archetypes.',
};

// Per archetype: linie (EA), signature PlayStyle en masteries (Pro Clubs HQ), prijsklassen (Pro Clubs HQ, vóór 22-10),
// patch (EA, 22-10-2026), en het coachprofiel (eigen, zie docs/coach-logica.md §2a).
const ARCHETYPE_INFO = {
  1: { name: 'Shot Stopper', line: 'keeper', signature: 'Far Reach', mastery: [['gkPos', 'gkReflexes'], 'gkReflexes'],
    tiers: [['accel', 'gkPos', 'reactions', 'shortPass'], ['aggression', 'jumping', 'stamina', 'penalties', 'curve', 'fkAcc', 'attPos'], ['gkDiving', 'gkHandling', 'balance', 'longPass', 'strength', 'vision', 'composure', 'slideTackle', 'shotPower', 'defAwareness', 'heading', 'ballControl', 'crossing'], ['gkReflexes', 'gkKicking', 'interceptions', 'agility', 'dribbling', 'finishing', 'standTackle', 'sprint']],
    patch: { up: ['accel', 'shortPass', 'gkPos'], down: ['gkReflexes'] } },
  2: { name: 'Sweeper Keeper', line: 'keeper', signature: 'Footwork', mastery: [['gkHandling', 'gkDiving'], 'gkDiving'],
    tiers: [['gkKicking', 'longPass', 'vision', 'ballControl'], ['aggression', 'jumping', 'reactions', 'stamina', 'curve', 'fkAcc', 'penalties', 'attPos'], ['composure', 'gkDiving', 'gkReflexes', 'balance', 'strength', 'heading', 'slideTackle', 'shotPower', 'defAwareness', 'crossing'], ['accel', 'gkPos', 'interceptions', 'agility', 'gkHandling', 'shortPass', 'finishing', 'dribbling', 'standTackle', 'sprint']],
    patch: { up: ['vision', 'ballControl', 'longPass', 'gkKicking', 'gkReflexes'], down: ['gkPos'] } },
  3: { name: 'Progressor', line: 'verdediging', signature: 'Long Ball Pass', mastery: [['longPass', 'standTackle'], 'standTackle'],
    tiers: [['composure', 'defAwareness', 'longPass', 'standTackle'], ['jumping', 'attPos', 'aggression', 'penalties', 'reactions', 'stamina', 'fkAcc', 'volleys', 'curve'], ['heading', 'slideTackle', 'vision', 'balance', 'ballControl', 'strength', 'shotPower', 'crossing', 'longShots'], ['interceptions', 'shortPass', 'sprint', 'accel', 'agility', 'dribbling', 'finishing']],
    patch: { up: ['composure', 'longPass', 'defAwareness', 'standTackle'], down: ['ballControl'] } },
  4: { name: 'Boss', line: 'verdediging', signature: 'Bruiser', mastery: [['aggression', 'strength'], 'strength'],
    tiers: [['aggression', 'heading', 'jumping', 'strength'], ['attPos', 'slideTackle', 'stamina', 'penalties', 'reactions', 'fkAcc', 'curve', 'volleys'], ['balance', 'defAwareness', 'shotPower', 'ballControl', 'composure', 'longPass', 'vision', 'crossing', 'longShots'], ['interceptions', 'standTackle', 'accel', 'sprint', 'agility', 'shortPass', 'finishing', 'dribbling']],
    patch: { up: ['strength', 'heading', 'slideTackle'], down: [] } },
  5: { name: 'Disruptor', line: 'middenveld', signature: 'Jockey', mastery: [['stamina', 'interceptions'], 'interceptions'],
    tiers: [['slideTackle', 'stamina', 'sprint', 'crossing'], ['attPos', 'reactions', 'curve', 'jumping', 'penalties', 'volleys', 'fkAcc'], ['accel', 'balance', 'strength', 'aggression', 'composure', 'defAwareness', 'longPass', 'shotPower', 'ballControl', 'heading', 'vision', 'longShots'], ['interceptions', 'shortPass', 'standTackle', 'agility', 'dribbling', 'finishing']],
    patch: { up: ['sprint', 'crossing', 'slideTackle'], down: ['aggression', 'standTackle'] } },
  6: { name: 'Marauder', line: 'verdediging (back)', signature: 'Quick Step', mastery: [['slideTackle', 'sprint'], 'sprint'],
    tiers: [['accel', 'dribbling', 'interceptions', 'balance'], ['curve', 'slideTackle', 'stamina', 'aggression', 'reactions', 'attPos', 'penalties', 'volleys', 'fkAcc', 'jumping'], ['crossing', 'sprint', 'ballControl', 'defAwareness', 'composure', 'heading', 'longPass', 'shotPower', 'longShots', 'strength', 'vision'], ['agility', 'standTackle', 'shortPass', 'finishing']],
    patch: { up: ['accel', 'balance', 'interceptions', 'dribbling'], down: ['stamina', 'crossing'] } },
  7: { name: 'Recycler', line: 'middenveld', signature: 'Intercept', mastery: [['defAwareness', 'shortPass'], 'shortPass'],
    tiers: [['aggression', 'standTackle', 'stamina', 'accel'], ['attPos', 'shotPower', 'curve', 'jumping', 'penalties', 'reactions', 'volleys', 'fkAcc'], ['balance', 'defAwareness', 'longPass', 'slideTackle', 'vision', 'composure', 'strength', 'shortPass', 'ballControl', 'crossing', 'longShots', 'heading'], ['interceptions', 'sprint', 'agility', 'dribbling', 'finishing']],
    patch: { up: ['accel', 'stamina', 'aggression', 'shotPower', 'standTackle'], down: ['strength', 'interceptions', 'defAwareness'] } },
  8: { name: 'Maestro', line: 'middenveld', signature: 'Pinged Pass', mastery: [['reactions', 'ballControl'], 'ballControl'],
    tiers: [['interceptions', 'shortPass', 'defAwareness', 'strength'], ['attPos', 'fkAcc', 'curve', 'longShots', 'penalties', 'aggression', 'reactions', 'stamina', 'volleys', 'jumping'], ['ballControl', 'composure', 'crossing', 'longPass', 'vision', 'balance', 'shotPower', 'slideTackle', 'heading'], ['agility', 'standTackle', 'accel', 'dribbling', 'finishing', 'sprint']],
    patch: { up: ['strength', 'interceptions', 'shortPass', 'defAwareness', 'longShots'], down: ['agility', 'reactions', 'ballControl', 'longPass'] } },
  9: { name: 'Creator', line: 'middenveld', signature: 'Incisive Pass', mastery: [['fkAcc', 'vision'], 'vision'],
    tiers: [['ballControl', 'longPass', 'reactions', 'agility'], ['attPos', 'curve', 'fkAcc', 'penalties', 'vision', 'composure', 'volleys', 'stamina', 'jumping', 'aggression'], ['crossing', 'longShots', 'shotPower', 'balance', 'strength', 'slideTackle', 'defAwareness', 'heading'], ['dribbling', 'shortPass', 'accel', 'finishing', 'sprint', 'standTackle', 'interceptions']],
    patch: { up: ['agility', 'reactions', 'composure', 'ballControl', 'longPass'], down: ['dribbling', 'longShots', 'curve'] } },
  10: { name: 'Spark', line: 'aanval (vleugel)', signature: 'Trickster', mastery: [['crossing', 'dribbling'], 'dribbling'],
    tiers: [['curve', 'dribbling', 'vision', 'longShots'], ['attPos', 'penalties', 'reactions', 'volleys', 'fkAcc', 'stamina', 'aggression', 'jumping'], ['balance', 'ballControl', 'crossing', 'shortPass', 'composure', 'longPass', 'shotPower', 'strength', 'slideTackle', 'defAwareness', 'heading'], ['accel', 'agility', 'sprint', 'finishing', 'standTackle', 'interceptions']],
    patch: { up: ['vision', 'dribbling', 'shortPass', 'longShots', 'curve'], down: ['sprint', 'agility'] } },
  11: { name: 'Magician', line: 'aanval', signature: 'Technical', mastery: [['curve', 'accel'], 'accel'],
    tiers: [['balance', 'composure', 'volleys', 'shotPower'], ['attPos', 'ballControl', 'curve', 'penalties', 'reactions', 'vision', 'fkAcc', 'stamina', 'aggression', 'jumping'], ['crossing', 'longShots', 'strength', 'longPass', 'slideTackle', 'heading', 'defAwareness'], ['accel', 'dribbling', 'finishing', 'shortPass', 'agility', 'sprint', 'standTackle', 'interceptions']],
    patch: { up: ['balance', 'composure', 'vision', 'shotPower', 'volleys'], down: ['accel', 'shortPass', 'curve'] } },
  12: { name: 'Finisher', line: 'aanval (spits)', signature: 'Low Driven Shot', mastery: [['composure', 'finishing'], 'finishing'],
    tiers: [['agility', 'dribbling', 'sprint', 'vision'], ['attPos', 'ballControl', 'penalties', 'reactions', 'volleys', 'curve', 'aggression', 'fkAcc', 'jumping', 'stamina'], ['accel', 'balance', 'composure', 'heading', 'shotPower', 'strength', 'longShots', 'crossing', 'longPass', 'slideTackle', 'defAwareness'], ['finishing', 'shortPass', 'standTackle', 'interceptions']],
    patch: { up: ['accel', 'sprint', 'agility', 'vision', 'ballControl', 'dribbling'], down: ['reactions', 'composure', 'finishing', 'volleys'] } },
  13: { name: 'Target', line: 'aanval (spits)', signature: 'Precision Header', mastery: [['balance', 'jumping'], 'jumping'],
    tiers: [['shortPass', 'accel', 'ballControl', 'curve'], ['attPos', 'balance', 'jumping', 'penalties', 'reactions', 'volleys', 'aggression', 'fkAcc', 'stamina'], ['heading', 'shotPower', 'strength', 'composure', 'finishing', 'longShots', 'vision', 'crossing', 'longPass', 'slideTackle', 'defAwareness'], ['agility', 'dribbling', 'sprint', 'standTackle', 'interceptions']],
    patch: { up: ['accel', 'ballControl', 'finishing', 'shortPass', 'curve'], down: ['jumping', 'strength', 'heading'] } },
};

// Coachprofiel per archetype (eigen, zie docs/coach-logica.md §2a):
// weight = hoe zwaar elk adviesthema telt; safeFits = veilig spelen past bij de taak; attacker = aanvallende maten tellen;
// core = kernattributen voor deze rol; task = de taak in één zin.
const ARCHETYPE_PROFILE = {
  1: { task: 'reddingen maken en rust brengen in de zestien', weight: { ball: 0.5, shoot: 0, pass: 0.8, defend: 0.5 }, safeFits: true, attacker: false, core: ['reactions', 'composure', 'shortPass'] },
  2: { task: 'meevoetballen achter een hoge lijn', weight: { ball: 0.8, shoot: 0, pass: 1.2, defend: 0.5 }, safeFits: true, attacker: false, core: ['longPass', 'vision', 'ballControl'] },
  3: { task: 'opbouwen vanuit de verdediging met progressieve passes', weight: { ball: 1.1, shoot: 0.3, pass: 1.3, defend: 1.1 }, safeFits: true, attacker: false, core: ['longPass', 'composure', 'defAwareness', 'standTackle'] },
  4: { task: 'duels en luchtduels winnen met fysieke dominantie', weight: { ball: 0.9, shoot: 0.2, pass: 0.7, defend: 1.4 }, safeFits: true, attacker: false, core: ['strength', 'standTackle', 'defAwareness', 'heading'] },
  5: { task: 'pressen, onderscheppen en tegenaanvallen neutraliseren', weight: { ball: 0.9, shoot: 0.3, pass: 0.8, defend: 1.4 }, safeFits: true, attacker: false, core: ['interceptions', 'defAwareness', 'standTackle', 'stamina'] },
  6: { task: 'met snelheid verdedigen en mee naar voren gaan', weight: { ball: 1.0, shoot: 0.5, pass: 1.0, defend: 1.1 }, safeFits: false, attacker: false, core: ['sprint', 'accel', 'stamina', 'crossing', 'interceptions'] },
  7: { task: 'de bal winnen en veilig doorspelen naar voren', weight: { ball: 1.3, shoot: 0.3, pass: 1.1, defend: 1.2 }, safeFits: true, attacker: false, core: ['shortPass', 'interceptions', 'stamina', 'standTackle'] },
  8: { task: 'het spel regisseren vanaf diep', weight: { ball: 1.2, shoot: 0.4, pass: 1.4, defend: 0.9 }, safeFits: true, attacker: false, core: ['shortPass', 'longPass', 'vision', 'composure'] },
  9: { task: 'met scherpe passes verdedigingen openbreken', weight: { ball: 1.1, shoot: 0.6, pass: 1.4, defend: 0.6 }, safeFits: false, attacker: true, core: ['vision', 'shortPass', 'ballControl', 'reactions'] },
  10: { task: 'de vleugel openbreken met explosieve acties en voorzetten', weight: { ball: 1.2, shoot: 0.8, pass: 0.9, defend: 0.4 }, safeFits: false, attacker: true, core: ['accel', 'sprint', 'dribbling', 'agility', 'crossing'] },
  11: { task: 'met techniek en dribbels kansen maken voor jezelf en anderen', weight: { ball: 1.2, shoot: 1.0, pass: 1.1, defend: 0.4 }, safeFits: false, attacker: true, core: ['ballControl', 'dribbling', 'agility', 'vision', 'composure'] },
  12: { task: 'kansen afmaken, vooral een-op-een', weight: { ball: 0.8, shoot: 1.5, pass: 0.6, defend: 0.3 }, safeFits: false, attacker: true, core: ['finishing', 'composure', 'accel', 'shotPower'] },
  13: { task: 'de bal vasthouden, inkoppen en de aanval laten aansluiten', weight: { ball: 1.3, shoot: 1.3, pass: 0.9, defend: 0.3 }, safeFits: false, attacker: true, core: ['strength', 'balance', 'finishing', 'heading', 'shortPass'] },
};

// Prijsklasse van een attribuut voor een archetype, met de patch van 22-10-2026 erbij.
function costInfo(archetypeId, attrKey) {
  const a = ARCHETYPE_INFO[archetypeId]; if (!a) return null;
  const tier = a.tiers.findIndex(t => t.includes(attrKey));
  const patch = a.patch.up.includes(attrKey) ? 'up' : a.patch.down.includes(attrKey) ? 'down' : null;
  return tier < 0 && !patch ? null : { tier, tierName: tier >= 0 ? AP_COST.tierNames[tier] : null, patch };
}
