'use strict';

// Sons of the Forest item IDs used by the active achievement evaluators.
// Keep these definitions isolated from save parsing so a game-data update can
// be maintained without changing the reader itself.

const PLATABLE_WEAPONS = [
  [340, 'Guitar'],
  [355, 'Pistol'],
  [356, 'Modern Axe'],
  [358, 'Shotgun'],
  [359, 'Machete'],
  [361, 'Rifle'],
  [367, 'Katana'],
  [379, 'Tactical Axe'],
  [386, 'Revolver'],
  [431, 'Firefighter Axe'],
  [468, 'Cross'],
  [477, 'Crafted Club'],
  [525, 'Putter'],
  [663, 'Pickaxe']
].map(([id, name]) => ({ id, name }));

const CRAFTED_WEAPONS = [
  [443, 'Crafted Bow'],
  [474, 'Crafted Spear'],
  [477, 'Crafted Club'],
  [388, 'Molotov'],
  [417, 'Time Bomb'],
  [503, 'Torch']
].map(([id, name]) => ({ id, name }));

const PRINTABLE_ITEMS = [
  [391, 'Printed Mask'],
  [426, 'Printed Flask'],
  [428, 'Printed Sled'],
  [553, 'Tech Mesh'],
  [560, 'Printed Grappling Hook'],
  [618, 'Printed Arrows']
].map(([id, name]) => ({ id, name }));

// Exact FOODIE requirement set: 37 edible types. Progress is calculated only
// from these IDs; unrelated consumed.* entries are deliberately excluded.
const FOODIE_REQUIREMENTS = [
  [397, 'Shiitake'],
  [398, 'King Oyster'],
  [399, 'Hydnum Repandum'],
  [400, 'Fly Amanita'],
  [445, 'Blueberries'],
  [595, 'Blackberries'],
  [447, 'Salmonberries'],
  [594, 'Guarana Berries'],
  [446, 'Twinberries'],
  [448, 'Snowberries'],
  [449, "Devil's Club"],
  [452, 'Yarrow'],
  [465, 'Chicory'],
  [453, 'Fireweed'],
  [454, 'Arrowleaf'],
  [451, 'Aloe Vera'],
  [450, 'Horsetail'],
  [455, 'Health Mix'],
  [456, 'Health Mix+'],
  [461, 'Energy Mix'],
  [462, 'Energy Mix+'],
  [436, 'Raw Fish'],
  [433, 'Raw Meat'],
  [466, 'Oyster'],
  [401, 'Turtle Egg'],
  [481, 'Severed Leg'],
  [480, 'Severed Arm'],
  [439, 'Fi-Z Energy Drink'],
  [437, 'Medicine'],
  [441, 'Energy Bar'],
  [438, 'MRE Pack'],
  [464, 'Canned Food (opened Cat Food)'],
  [425, 'Crunchie Wunchies'],
  [421, 'Ramen Noodles'],
  [571, 'Bacon Bite'],
  [569, 'Brain Bite'],
  [570, 'Steak Bite']
].map(([id, name]) => ({ id, name }));

module.exports = {
  FOODIE_REQUIREMENTS,
  PLATABLE_WEAPONS,
  CRAFTED_WEAPONS,
  PRINTABLE_ITEMS
};
