'use strict';

const {
  FOODIE_REQUIREMENTS,
  PLATABLE_WEAPONS,
  CRAFTED_WEAPONS,
  PRINTABLE_ITEMS
} = require('./item-catalog');

const ACHIEVEMENTS = [
  ['SURVIVOR', 'Survive Day 1'],
  ['WHAT COULD GO WRONG', 'Survive Day 10'],
  ['TRADESMAN', 'Place 50 logs'],
  ['CONTRACTOR', 'Place 100 logs'],
  ['PINATA', 'Blow up a Sluggy'],
  ['BLOCKBUSTER', 'Watch all the found footage recordings'],
  ['THIS PLACE ISN’T SO BAD', 'Survive Day 25'],
  ['EVERY MOVE YOU MAKE', 'Give a GPS locator to Virginia'],
  ['ARCHITECT', 'Place 500 logs'],
  ['FIGHT DEMONS', 'Stay on the Island'],
  ['BADGER', 'Dig 100 holes'],
  ['MC CRAFTY', 'Craft all weapons'],
  ['1%', 'Collect $1000'],
  ['NEED A BIGGER BOAT', 'Get killed by a shark'],
  ['THIS CAN’T BE HEALTHY', 'Drink 50 cans of Fi-Z'],
  ['FASHIONISTA', 'Own every piece of clothing'],
  ['TRUSTED', 'Become an admin in a multiplayer game'],
  ['CITY PLANNER', 'Place 1000 logs'],
  ['FOUGHT DEMONS', 'Leave the Island'],
  ['SUCKER FOR PUNISHMENT', 'Get kicked by a heavy cannibal 5 times'],
  ['CHIVALRY IS NOT DEAD', 'Reach max sentiment with Virginia'],
  ['COLLECTOR', 'Pickup 50 Drogue watches'],
  ['DYNAMO', 'Wear a full set of Tech Armor'],
  ['KEEP YOUR FRIENDS CLOSE', 'Complete the story with all friendly NPCs still alive'],
  ['NEVER GOING HOME', 'Survive Day 50'],
  ['MAKER', 'Print one of every item'],
  ['I DREAM OF SUSHI', 'Eat 20 raw fish'],
  ['INTERIOR DESIGNER', 'Find all the discoverable blueprints'],
  ['OOOH SHINY', 'Plate all valid weapons with Solafite'],
  ['FOODIE', 'Eat one of each type of edible in the game'],
  ['I LIKE BLISTERS', 'Dig 1000 holes'],
  ['GUMSHOE', 'Collect all the note pages']
].map(([name, description]) => ({ name, description }));

const NORMALIZED_ALIASES = new Map([
  ["THIS PLACE ISN'T SO BAD", 'THIS PLACE ISN’T SO BAD'],
  ["THIS CAN'T BE HEALTHY", 'THIS CAN’T BE HEALTHY']
]);

function normalizeName(value = '') {
  const normalized = String(value)
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return NORMALIZED_ALIASES.get(normalized) || normalized;
}

const SURVIVAL_DAYS = {
  SURVIVOR: 1,
  'WHAT COULD GO WRONG': 10,
  'THIS PLACE ISN’T SO BAD': 25,
  'NEVER GOING HOME': 50
};

const LOG_TARGETS = {
  TRADESMAN: 50,
  CONTRACTOR: 100,
  ARCHITECT: 500,
  'CITY PLANNER': 1000
};

const DIG_TARGETS = {
  BADGER: 100,
  'I LIKE BLISTERS': 1000
};

const SIMPLE_TARGETS = {
  SURVIVOR: { target: 1, unit: 'day' },
  'WHAT COULD GO WRONG': { target: 10, unit: 'days' },
  TRADESMAN: { target: 50, unit: 'logs' },
  CONTRACTOR: { target: 100, unit: 'logs' },
  'THIS PLACE ISN’T SO BAD': { target: 25, unit: 'days' },
  ARCHITECT: { target: 500, unit: 'logs' },
  BADGER: { target: 100, unit: 'holes' },
  '1%': { target: 1000, unit: 'cash' },
  'THIS CAN’T BE HEALTHY': { target: 50, unit: 'Fi-Z' },
  'CITY PLANNER': { target: 1000, unit: 'logs' },
  'SUCKER FOR PUNISHMENT': { target: 5, unit: 'kicks' },
  COLLECTOR: { target: 50, unit: 'Drogue watches' },
  'NEVER GOING HOME': { target: 50, unit: 'days' },
  'I DREAM OF SUSHI': { target: 20, unit: 'raw fish' },
  'I LIKE BLISTERS': { target: 1000, unit: 'holes' }
};

const SAVE_GUIDE_PROGRESS = new Set([
  'BLOCKBUSTER',
  'EVERY MOVE YOU MAKE',
  'MC CRAFTY',
  'CHIVALRY IS NOT DEAD',
  'DYNAMO',
  'MAKER',
  'INTERIOR DESIGNER',
  'OOOH SHINY',
  'FOODIE'
]);

const CATEGORY_GROUPS = Object.freeze({
  Survival: new Set(['SURVIVOR', 'WHAT COULD GO WRONG', 'THIS PLACE ISN’T SO BAD', 'NEVER GOING HOME']),
  Building: new Set(['TRADESMAN', 'CONTRACTOR', 'ARCHITECT', 'CITY PLANNER', 'INTERIOR DESIGNER']),
  Combat: new Set(['PINATA', 'NEED A BIGGER BOAT', 'SUCKER FOR PUNISHMENT', 'DYNAMO']),
  Story: new Set(['FIGHT DEMONS', 'FOUGHT DEMONS', 'KEEP YOUR FRIENDS CLOSE']),
  Companions: new Set(['EVERY MOVE YOU MAKE', 'CHIVALRY IS NOT DEAD']),
  Collection: new Set(['BLOCKBUSTER', '1%', 'FASHIONISTA', 'COLLECTOR', 'GUMSHOE']),
  Crafting: new Set(['MC CRAFTY', 'MAKER', 'OOOH SHINY']),
  Consumption: new Set(['THIS CAN’T BE HEALTHY', 'I DREAM OF SUSHI', 'FOODIE']),
  Multiplayer: new Set(['TRUSTED'])
});

function categoryFor(name) {
  for (const [category, names] of Object.entries(CATEGORY_GROUPS)) {
    if (names.has(name)) return category;
  }
  if (DIG_TARGETS[name]) return 'Exploration';
  return 'Achievement';
}

function guidanceFor(definition) {
  const targetInfo = SIMPLE_TARGETS[definition.name];
  const numeric = targetInfo
    ? ` Steam defines a target of ${targetInfo.target.toLocaleString('en-GB')} ${targetInfo.unit}.`
    : ' Steam defines no trustworthy intermediate numeric target for this achievement.';
  return `${definition.description}.${numeric} Steam decides the final unlock state; selected-save data is supporting evidence only.`;
}

function makeSubstate(label, state, value = null, source = null, detail = null) {
  return { label, state, value, source, detail };
}

function evidenceBase() {
  return {
    exact: false,
    completeFromSave: false,
    progress: null,
    summary: null,
    source: null,
    substates: []
  };
}

function entryValue(save, name, fallback = null) {
  const byName = save?.playerState?.byName || {};
  return Object.prototype.hasOwnProperty.call(byName, name) ? byName[name] : fallback;
}

function prefixedEntries(save, prefix) {
  const entries = save?.playerState?.entries || [];
  return entries
    .filter((entry) => entry.Name.startsWith(prefix))
    .map((entry) => {
      const rawId = entry.Name.slice(prefix.length);
      const id = Number.parseInt(rawId, 10);
      const value = Object.prototype.hasOwnProperty.call(entry, 'IntValue')
        ? entry.IntValue
        : Object.prototype.hasOwnProperty.call(entry, 'BoolValue')
          ? entry.BoolValue
          : Object.prototype.hasOwnProperty.call(entry, 'FloatValue')
            ? entry.FloatValue
            : true;
      return { rawId, id: Number.isFinite(id) ? id : rawId, value };
    });
}

function inventoryCount(save, id) {
  return Number(save?.inventory?.byId?.[id]?.TotalCount || 0);
}

function craftedCount(save, id) {
  return Number(entryValue(save, `crafted.${String(id).padStart(8, '0')}`, 0) || 0);
}

function consumedCount(save, id) {
  return Number(entryValue(save, `consumed.${String(id).padStart(8, '0')}`, 0) || 0);
}

function plated(save, id) {
  return entryValue(save, `isPlated_${String(id).padStart(8, '0')}`, false) === true;
}

function owned(save, id) {
  return entryValue(save, `hasOwned_${String(id).padStart(8, '0')}`, false) === true;
}

const BLOCKBUSTER_REQUIREMENTS = [
  { name: 'Sahara Confidential', keys: ['Sahara Confidential', 'SaharaConfidential'] },
  { name: 'Cultists Arrival', keys: ['CultistsArrival', 'Cultists Arrival'] },
  { name: 'Cultists 1', keys: ['Cultists1', 'Cultists 1'] },
  { name: 'Estate Agent', keys: ['EstateAgent', 'Estate Agent'] }
];

function recordingViewed(save, requirement) {
  return requirement.keys.some((key) => entryValue(save, `hasViewedFoundRecording_${key}`, false) === true);
}

function actorByType(save, typeId) {
  return (save?.actors || []).find((actor) => actor?.TypeId === typeId) || null;
}

function influenceFor(save, uniqueId) {
  return (save?.influences || []).find((item) => item?.UniqueId === uniqueId) || null;
}

function actorHasItem(save, actor, id) {
  if (!actor) return false;
  if (Array.isArray(actor.EquippedItems) && actor.EquippedItems.includes(id)) return true;
  const actorItems = save?.saveData?.NpcItemInstances?.ActorItems || [];
  const row = actorItems.find((item) => item?.UniqueId === actor.UniqueId);
  return Boolean(row?.Items?.ItemBlocks?.some((block) => block?.ItemId === id && Number(block.TotalCount || 0) > 0));
}

function requirementEvidence(items, checker, source, noun) {
  const states = items.map((item) => {
    const value = checker(item.id);
    return makeSubstate(item.name, value ? 'complete' : 'missing', value, 'save');
  });
  const current = states.filter((item) => item.state === 'complete').length;
  const target = items.length;
  return {
    exact: true,
    completeFromSave: current >= target,
    progress: { current, target, unit: noun },
    summary: `${current} / ${target} ${noun}`,
    source,
    substates: states
  };
}

function evaluateSaveEvidence(name, save, steam = null) {
  let evidence = evidenceBase();
  if (!save) return evidence;

  const requiredDays = SURVIVAL_DAYS[name];
  if (requiredDays) {
    const days = Number(save.gameState?.GameDays || 0);
    return {
      ...evidence,
      summary: `Selected save is currently Day ${days}. This is context only; Steam decides achievement completion.`,
      source: 'GameStateSaveData.json → GameDays (save context)',
      substates: [makeSubstate('Selected save day', 'observed', days, 'save')]
    };
  }

  if (LOG_TARGETS[name]) {
    return {
      ...evidence,
      summary: 'Lifetime log-placement counter is not persisted in the selected save.',
      source: 'Steam unlock state · selected save checked',
      substates: [makeSubstate('Lifetime placement progress', 'steam-only', steam?.unlocked ? 'Achievement unlocked' : 'Counter not exposed', 'steam')]
    };
  }

  if (DIG_TARGETS[name]) {
    return {
      ...evidence,
      summary: 'Lifetime digging counter is not persisted in the selected save.',
      source: 'Steam unlock state · selected save checked',
      substates: [makeSubstate('Lifetime digging progress', 'steam-only', steam?.unlocked ? 'Achievement unlocked' : 'Counter not exposed', 'steam')]
    };
  }

  switch (name) {
    case 'PINATA': {
      // PINATA is a one-off Steam event. The save contains Sluggy world/spawn
      // persistence entries, but those values are not a kill-history counter and
      // cannot tell us which Sluggy triggered the achievement. Do not expose them
      // as if they were progress.
      evidence.summary = steam?.unlocked
        ? 'Steam confirms PINATA is unlocked. This is a one-off event achievement, so there is no useful lower-level counter to display.'
        : 'PINATA is still locked on Steam. The useful requirement is simply to kill a Sluggy with an explosion; Sluggy world-state values in the save are not achievement progress.';
      evidence.source = 'Steam achievement state · Sluggy save world-state intentionally excluded from progress';
      evidence.substates = [
        makeSubstate('Achievement event', 'steam-only', steam?.unlocked ? 'Confirmed by Steam' : 'Not yet unlocked on Steam', 'steam'),
        makeSubstate('Requirement', 'guide', 'Blow up a Sluggy', 'guide')
      ];
      return evidence;
    }

    case 'BLOCKBUSTER': {
      const states = BLOCKBUSTER_REQUIREMENTS.map((requirement) => {
        const viewedInSave = recordingViewed(save, requirement);
        const complete = steam?.unlocked === true || viewedInSave;
        return makeSubstate(
          requirement.name,
          complete ? 'complete' : 'missing',
          complete
            ? (viewedInSave ? 'Viewed' : 'Completed · confirmed by Steam')
            : 'Not yet confirmed in this selected save',
          viewedInSave ? 'save' : (steam?.unlocked === true ? 'steam' : 'save')
        );
      });
      const current = steam?.unlocked === true
        ? BLOCKBUSTER_REQUIREMENTS.length
        : states.filter((item) => item.state === 'complete').length;
      const target = BLOCKBUSTER_REQUIREMENTS.length;
      evidence.exact = true;
      evidence.completeFromSave = current >= target;
      evidence.progress = { current, target, unit: 'recordings' };
      evidence.summary = steam?.unlocked
        ? `${target} / ${target} required Found Footage recordings completed.`
        : `${current} / ${target} required Found Footage recordings are confirmed in this selected save.`;
      evidence.source = 'Steam achievement state + PlayerStateSaveData.json → hasViewedFoundRecording_*';
      evidence.substates = states;
      return evidence;
    }

    case 'EVERY MOVE YOU MAKE': {
      // VAIL TypeId 10 is Virginia. Item 529 is the GPS Locator carried by NPCs.
      const virginia = actorByType(save, 10);
      const hasGps = actorHasItem(save, virginia, 529);
      evidence.exact = Boolean(virginia);
      evidence.completeFromSave = hasGps;
      evidence.progress = { current: hasGps ? 1 : 0, target: 1, unit: 'GPS locator' };
      evidence.summary = virginia
        ? (hasGps ? 'Virginia currently has a GPS Locator.' : 'Virginia is present but no GPS Locator is assigned to her.')
        : 'Virginia actor state is not present in this save.';
      evidence.source = 'SaveData.json → VailWorldSim.Actors + NpcItemInstances';
      evidence.substates = [
        makeSubstate('Virginia present', virginia ? 'complete' : 'missing', Boolean(virginia), 'save'),
        makeSubstate('GPS Locator assigned', hasGps ? 'complete' : 'missing', hasGps, 'save')
      ];
      return evidence;
    }

    case 'FIGHT DEMONS':
    case 'FOUGHT DEMONS': {
      evidence.summary = steam?.unlocked
        ? 'Ending choice is confirmed by Steam.'
        : 'No durable ending-choice flag is mapped in the selected save.';
      evidence.source = steam ? 'Steam achievement state · save checked for durable ending flag' : 'Selected save checked';
      evidence.substates = [makeSubstate('Ending choice', 'steam-only', steam?.unlocked ? 'Confirmed' : 'Not confirmed', steam ? 'steam' : 'save')];
      return evidence;
    }

    case 'MC CRAFTY':
      return requirementEvidence(
        CRAFTED_WEAPONS,
        (id) => craftedCount(save, id) > 0 || owned(save, id) || inventoryCount(save, id) > 0,
        'PlayerStateSaveData.json → crafted.* / hasOwned_*',
        'crafted weapons'
      );

    case '1%': {
      const cash = inventoryCount(save, 496);
      evidence.summary = `Current selected-save cash: $${cash.toLocaleString('en-GB')}. This is not treated as Steam achievement progress.`;
      evidence.source = 'PlayerInventorySaveData.json → item 496 (save context only)';
      evidence.substates = [makeSubstate('Current save cash', 'observed', `$${cash.toLocaleString('en-GB')}`, 'save')];
      return evidence;
    }

    case 'NEED A BIGGER BOAT': {
      evidence.summary = steam?.unlocked
        ? 'Death-by-shark event is confirmed by Steam.'
        : 'The selected save does not retain a durable death-by-shark history flag.';
      evidence.source = 'Steam achievement state · selected save checked';
      evidence.substates = [makeSubstate('Killed by shark', 'steam-only', steam?.unlocked ? 'Confirmed' : 'Not confirmed', 'steam')];
      return evidence;
    }

    case 'THIS CAN’T BE HEALTHY': {
      const current = consumedCount(save, 439);
      evidence.summary = `Selected save records ${current} Fi-Z consumed. Steam remains authoritative for completion.`;
      evidence.source = 'PlayerStateSaveData.json → consumed.00000439 (save context)';
      evidence.substates = [makeSubstate('Fi-Z consumed in selected save', 'observed', current, 'save')];
      return evidence;
    }

    case 'FASHIONISTA': {
      const knownClothing = [
        [487, 'Pajamas'],
        [492, 'Tuxedo'],
        [499, 'Wetsuit'],
        [500, 'Puffy Jacket'],
        [501, 'Winter Jacket'],
        [558, 'Camouflage outfit']
      ];
      const known = knownClothing.map(([id, label]) => ({ id, label, owned: owned(save, id) }));
      const otherOwned = prefixedEntries(save, 'hasOwned_').filter((entry) => entry.value === true).length;
      evidence.summary = `${known.filter((item) => item.owned).length} named clothing pieces confirmed; ${otherOwned} total persistent owned-item flags are present`;
      evidence.source = 'PlayerStateSaveData.json → hasOwned_* + PlayerClothingSystemSaveData.json';
      evidence.substates = known.map((item) => makeSubstate(item.label, item.owned ? 'complete' : 'missing', item.owned, 'save'));
      return evidence;
    }

    case 'TRUSTED': {
      evidence.summary = save.descriptor?.mode === 'SinglePlayer'
        ? 'Selected save is SinglePlayer; Trusted is a multiplayer/admin achievement.'
        : 'Multiplayer save selected; Steam remains authoritative for admin/trusted status.';
      evidence.source = 'Save branch + Steam achievement state';
      evidence.substates = [makeSubstate('Selected save mode', 'observed', save.descriptor?.mode || 'Unknown', 'save')];
      return evidence;
    }

    case 'SUCKER FOR PUNISHMENT': {
      evidence.summary = 'The selected save does not expose a persistent heavy-cannibal kick counter.';
      evidence.source = 'Steam achievement state · selected save checked';
      evidence.substates = [makeSubstate('Heavy-cannibal kick counter', 'steam-only', steam?.unlocked ? 'Achievement unlocked' : 'Counter not exposed', 'steam')];
      return evidence;
    }

    case 'CHIVALRY IS NOT DEAD': {
      const virginia = actorByType(save, 10);
      const influence = virginia ? influenceFor(save, virginia.UniqueId) : null;
      const playerInfluence = influence?.Influences?.find((item) => item?.TypeId === 'Player');
      const affection = Number(virginia?.Stats?.Affection ?? playerInfluence?.Sentiment ?? 0);
      evidence.exact = Boolean(virginia);
      evidence.completeFromSave = affection >= 100;
      evidence.progress = { current: affection, target: 100, unit: 'Virginia sentiment' };
      evidence.summary = virginia ? `Virginia sentiment: ${affection} / 100` : 'Virginia actor state is not present.';
      evidence.source = 'SaveData.json → VailWorldSim.Actors / InfluenceMemory';
      evidence.substates = [
        makeSubstate('Virginia alive/present', virginia && Number(virginia?.Stats?.Health || 0) > 0 ? 'complete' : 'missing', virginia ? `${virginia.Stats?.Health ?? 0} health` : 'No', 'save'),
        makeSubstate('Player sentiment', affection >= 100 ? 'complete' : 'in-progress', affection, 'save')
      ];
      return evidence;
    }

    case 'COLLECTOR': {
      const current = inventoryCount(save, 410);
      evidence.summary = `${current} Drogue / wrist watches currently in inventory; lifetime pickup count is not persisted in this save.`;
      evidence.source = 'PlayerInventorySaveData.json → item 410 + Steam unlock state';
      evidence.substates = [makeSubstate('Currently carried watches', 'observed', current, 'save')];
      return evidence;
    }

    case 'DYNAMO': {
      const TECH_ARMOUR_ID = 554;
      const target = 10;
      const pieces = Array.isArray(save.armour?.ArmourPieces) ? save.armour.ArmourPieces : [];
      const techPieces = pieces.filter((piece) => Number(piece?.ItemId) === TECH_ARMOUR_ID);
      const otherPieces = pieces.filter((piece) => Number(piece?.ItemId) !== TECH_ARMOUR_ID);

      // The headline achievement state is historical Steam state. The armour list
      // below is only the player's CURRENT loadout and can legitimately differ
      // from the ten Tech Armour pieces worn at the moment the achievement fired.
      evidence.progress = { current: Math.min(techPieces.length, target), target, unit: 'Tech Armour pieces worn now' };
      evidence.summary = steam?.unlocked
        ? `Steam confirms DYNAMO is complete (${target} / ${target}). The selected save currently has ${techPieces.length} Tech Armour piece${techPieces.length === 1 ? '' : 's'} equipped and ${otherPieces.length} other armour piece${otherPieces.length === 1 ? '' : 's'}; the current loadout does not need to match the historical unlock loadout.`
        : `${techPieces.length} / ${target} Tech Armour pieces are currently worn in this selected save.`;
      evidence.source = 'Steam achievement state + PlayerArmourSystemSaveData.json → current ArmourPieces';
      evidence.substates = [
        makeSubstate('Steam achievement requirement', 'steam-only', steam?.unlocked ? `${target} / ${target} complete` : 'Not yet unlocked', 'steam'),
        makeSubstate('Current save: Tech Armour equipped', techPieces.length >= target ? 'complete' : 'observed', `${techPieces.length} / ${target}`, 'save'),
        makeSubstate('Current save: other armour equipped', 'observed', otherPieces.length, 'save')
      ];
      return evidence;
    }

    case 'KEEP YOUR FRIENDS CLOSE': {
      const kelvin = actorByType(save, 9);
      const virginia = actorByType(save, 10);
      const kelvinAlive = Boolean(kelvin && Number(kelvin?.Stats?.Health || 0) > 0);
      const virginiaAlive = Boolean(virginia && Number(virginia?.Stats?.Health || 0) > 0);
      evidence.summary = `Kelvin: ${kelvinAlive ? 'alive' : 'not confirmed alive'} · Virginia: ${virginiaAlive ? 'alive' : 'not confirmed alive'}`;
      evidence.source = 'SaveData.json → VailWorldSim.Actors · story completion: Steam';
      evidence.substates = [
        makeSubstate('Kelvin', kelvinAlive ? 'complete' : 'missing', kelvinAlive ? `${kelvin.Stats.Health} health` : 'Not alive/present', 'save'),
        makeSubstate('Virginia', virginiaAlive ? 'complete' : 'missing', virginiaAlive ? `${virginia.Stats.Health} health` : 'Not alive/present', 'save'),
        makeSubstate('Story completion with both alive', 'steam-only', steam?.unlocked ? 'Confirmed' : 'Not confirmed', 'steam')
      ];
      return evidence;
    }

    case 'MAKER':
      return requirementEvidence(
        PRINTABLE_ITEMS,
        (id) => craftedCount(save, id) > 0,
        'PlayerStateSaveData.json → crafted.*',
        'printable item types'
      );

    case 'I DREAM OF SUSHI': {
      const current = consumedCount(save, 436);
      evidence.summary = `Selected save records ${current} raw fish eaten. Steam remains authoritative for completion.`;
      evidence.source = 'PlayerStateSaveData.json → consumed.00000436 (save context)';
      evidence.substates = [makeSubstate('Raw fish eaten in selected save', 'observed', current, 'save')];
      return evidence;
    }

    case 'INTERIOR DESIGNER': {
      const pages = prefixedEntries(save, 'DiscoverablePageUnlocked_').filter((entry) => entry.value !== false);
      const steamTarget = Number(steam?.progress?.target ?? steam?.progressMax);
      if (Number.isFinite(steamTarget) && steamTarget > 0) {
        evidence.progress = { current: Math.min(pages.length, steamTarget), target: steamTarget, unit: 'blueprints' };
      }
      evidence.summary = Number.isFinite(steamTarget) && steamTarget > 0
        ? `${pages.length} discoverable blueprint flags are present in this selected save; Steam target is ${steamTarget}`
        : `${pages.length} discoverable blueprint flags are present in this selected save`;
      evidence.source = 'PlayerStateSaveData.json → DiscoverablePageUnlocked_*';
      evidence.substates = pages.map((entry, index) => makeSubstate(`Discoverable blueprint ${index + 1}`, 'complete', 'Found', 'save', `game id ${entry.id}`));
      return evidence;
    }

    case 'OOOH SHINY':
      return requirementEvidence(
        PLATABLE_WEAPONS,
        (id) => plated(save, id),
        'PlayerStateSaveData.json → isPlated_*',
        'weapons plated'
      );

    case 'FOODIE': {
      const states = FOODIE_REQUIREMENTS.map((item) => {
        const count = consumedCount(save, item.id);
        const complete = steam?.unlocked === true || count > 0;
        return makeSubstate(
          item.name,
          complete ? 'complete' : 'missing',
          count > 0
            ? String(count)
            : (steam?.unlocked === true ? 'Steam complete' : '0'),
          count > 0 ? 'save' : (steam?.unlocked === true ? 'steam' : 'save')
        );
      });
      const target = FOODIE_REQUIREMENTS.length;
      const current = steam?.unlocked === true
        ? target
        : states.filter((item) => item.state === 'complete').length;
      evidence.exact = true;
      evidence.completeFromSave = current >= target;
      evidence.progress = { current, target, unit: 'edible types' };
      evidence.summary = `${current} / ${target} required edible types completed. Individual rows show the quantity consumed where that value is present in the selected save.`;
      evidence.source = 'Steam achievement state + PlayerStateSaveData.json → consumed.* against the 37-item FOODIE requirement set';
      evidence.substates = states;
      return evidence;
    }

    case 'GUMSHOE': {
      const storyPage = Number(entryValue(save, 'StoryPageIndex', 0) || 0);
      evidence.summary = `Story/document interface state is present (page index ${storyPage}); Steam remains the source for the lifetime note-page count.`;
      evidence.source = 'PlayerStateSaveData.json + Steam achievement state';
      evidence.substates = [
        makeSubstate('Story/document UI page index', 'observed', storyPage, 'save'),
        makeSubstate('Steam completion', 'steam-only', steam?.unlocked ? 'All note pages confirmed' : 'Not complete', 'steam')
      ];
      return evidence;
    }

    default:
      return evidence;
  }
}

function formatTargetProgress(targetInfo) {
  const { target, unit } = targetInfo;
  return {
    current: target,
    target,
    unit,
    text: `${target} / ${target} ${unit}`,
    kind: 'steam-complete',
    source: 'Steam achievement unlocked'
  };
}

function mergeAchievementState(save, steamAchievements = []) {
  const steamByName = new Map();
  for (const item of steamAchievements) steamByName.set(normalizeName(item.name), item);

  return ACHIEVEMENTS.map((definition) => {
    const steam = steamByName.get(normalizeName(definition.name)) || null;
    const evidence = evaluateSaveEvidence(definition.name, save, steam);

    // Only Steam is allowed to decide the achievement headline state.
    // Save data is guidance/context and can never promote a locked achievement.
    let state = 'unknown';
    let authority = 'none';
    if (steam && typeof steam.unlocked === 'boolean') {
      state = steam.unlocked ? 'unlocked' : 'locked';
      authority = 'steam';
    }

    const targetInfo = SIMPLE_TARGETS[definition.name] || null;
    let displayProgress = null;

    if (steam?.unlocked === true && steam?.progress && Number.isFinite(Number(steam.progress.target)) && Number(steam.progress.target) > 1) {
      const target = Number(steam.progress.target);
      displayProgress = {
        current: target,
        target,
        unit: targetInfo?.unit || '',
        text: `${target} / ${target}${targetInfo?.unit ? ` ${targetInfo.unit}` : ''}`,
        kind: 'steam-complete',
        source: 'Steam achievement progress limit'
      };
    } else if (steam?.unlocked === true && targetInfo) {
      // Once Steam has awarded a threshold achievement, the achievement-specific
      // count is the completed threshold, not a larger selected-save value.
      displayProgress = formatTargetProgress(targetInfo);
    } else if (steam?.unlocked === true && evidence?.progress && Number.isFinite(Number(evidence.progress.target)) && Number(evidence.progress.target) > 0) {
      // Compound/checklist achievements use the requirement size as the completed
      // display once Steam says unlocked. The currently selected save may have
      // changed since the historical unlock and must not make an unlocked card
      // appear partially complete (for example DYNAMO after changing armour).
      const target = Number(evidence.progress.target);
      displayProgress = {
        current: target,
        target,
        unit: evidence.progress.unit || '',
        text: `${target} / ${target}${evidence.progress.unit ? ` ${evidence.progress.unit.replace(/ now$/i, '')}` : ''}`,
        kind: 'steam-complete',
        source: 'Steam achievement unlocked'
      };
    } else if (steam?.unlocked === false && steam?.progress && Number.isFinite(Number(steam.progress.current))) {
      const current = Number(steam.progress.current);
      const target = Number.isFinite(Number(steam.progress.target)) && Number(steam.progress.target) > 0
        ? Number(steam.progress.target)
        : targetInfo?.target;
      if (Number.isFinite(target) && target > 0) {
        displayProgress = {
          current: Math.min(current, target),
          target,
          unit: targetInfo?.unit || '',
          text: `${Math.min(current, target)} / ${target}${targetInfo?.unit ? ` ${targetInfo.unit}` : ''}`,
          kind: 'steam-progress',
          source: steam.progress.statName ? `Steam local stat: ${steam.progress.statName}` : 'Steam achievement progress'
        };
      }
    } else if (SAVE_GUIDE_PROGRESS.has(definition.name) && evidence?.progress) {
      displayProgress = {
        ...evidence.progress,
        text: evidence.summary,
        kind: 'save-guide',
        source: evidence.source
      };
    }

    return {
      name: definition.name,
      description: steam?.description || definition.description,
      category: categoryFor(definition.name),
      guidance: guidanceFor(definition),
      targetInfo,
      iconUrl: steam?.iconUrl || null,
      state,
      authority,
      unlockedAt: steam?.unlockedAt || null,
      steam,
      evidence,
      displayProgress
    };
  });
}

module.exports = {
  ACHIEVEMENTS,
  normalizeName,
  SIMPLE_TARGETS,
  categoryFor,
  mergeAchievementState,
  evaluateSaveEvidence
};
