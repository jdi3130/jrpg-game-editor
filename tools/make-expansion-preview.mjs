import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');
const TILES_DIR = path.join(ROOT, 'public/assets/jrpg/tiles');
const OUT_PREVIEW = path.join(ROOT, '_previews/10_expansion_houses_campfires_props_tiles.png');
const BRAIN_ARTIFACT = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e/10_expansion_houses_campfires_props_tiles.png';

const NEW_HOUSES = [
  'house_ruin_burnt', 'house_ruin_stone', 'house_ruin_tower', 'house_witch_shack',
  'house_mausoleum', 'house_windmill', 'house_tavern_inn', 'house_chapel',
  'house_ruin_smithy', 'house_war_tent', 'house_watermill', 'house_hermit_cabin'
];

const NEW_CAMPFIRES = [
  'campfire_pot', 'campfire_ashes', 'campfire_ritual', 'campfire_stones', 'campfire_beacon'
];

const NEW_PROPS = [
  'prop_potions', 'prop_gold_pile', 'prop_mushrooms', 'prop_candles', 'prop_urn',
  'prop_gargoyle', 'prop_dragon_bones'
];

const NEW_TILES = [
  'wood_planks', 'marble_sanctuary', 'desert_sand', 'snow_ice',
  'toxic_sludge', 'obsidian_void', 'dungeon_flagstones', 'ruin_cobbles'
];

async function main() {
  const canvasW = 1600;
  const canvasH = 1400;

  const composites = [];

  // 1. Ряд тайлов (8 тайлов по 160x160)
  for (let i = 0; i < NEW_TILES.length; i++) {
    const id = NEW_TILES[i];
    const file = path.join(TILES_DIR, `${id}.png`);
    if (fs.existsSync(file)) {
      const resized = await sharp(file).resize(160, 160, { kernel: 'nearest' }).png().toBuffer();
      composites.push({
        input: resized,
        left: 40 + i * 190,
        top: 60
      });
    }
  }

  // 2. Дома (12 домов в 2 ряда по 6, размер 220x220)
  for (let i = 0; i < NEW_HOUSES.length; i++) {
    const id = NEW_HOUSES[i];
    const file = path.join(PROPS_DIR, `${id}.png`);
    if (fs.existsSync(file)) {
      const resized = await sharp(file).resize(220, 220, { kernel: 'lanczos3' }).png().toBuffer();
      const col = i % 6;
      const row = Math.floor(i / 6);
      composites.push({
        input: resized,
        left: 40 + col * 255,
        top: 280 + row * 260
      });
    }
  }

  // 3. Костры (5 штук по 150x150)
  for (let i = 0; i < NEW_CAMPFIRES.length; i++) {
    const id = NEW_CAMPFIRES[i];
    const file = path.join(PROPS_DIR, `${id}.png`);
    if (fs.existsSync(file)) {
      const resized = await sharp(file).resize(150, 150, { kernel: 'lanczos3' }).png().toBuffer();
      composites.push({
        input: resized,
        left: 40 + i * 200,
        top: 860
      });
    }
  }

  // 4. Мелкие и крупные объекты (7 штук)
  for (let i = 0; i < NEW_PROPS.length; i++) {
    const id = NEW_PROPS[i];
    const file = path.join(PROPS_DIR, `${id}.png`);
    if (fs.existsSync(file)) {
      const targetSize = id === 'prop_dragon_bones' ? 260 : 140;
      const resized = await sharp(file).resize(targetSize, targetSize, { kernel: 'lanczos3' }).png().toBuffer();
      composites.push({
        input: resized,
        left: 40 + i * 210,
        top: 1080 + (id === 'prop_dragon_bones' ? -60 : 0)
      });
    }
  }

  // Создаем фоновый лист
  const bg = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 10, g: 13, b: 22, alpha: 1 }
    }
  }).composite(composites).png().toBuffer();

  fs.writeFileSync(OUT_PREVIEW, bg);
  fs.writeFileSync(BRAIN_ARTIFACT, bg);
  console.log('Preview contact sheet saved successfully to:', OUT_PREVIEW);
}

main().catch(console.error);

