// Сборка JRPG-ассетов из AI-листов (vibe_images/jrpg_raw) в public/assets/jrpg.
//
//   node tools/build-jrpg-assets.mjs
//
// Листы — сетки ячеек или горизонтальные ленты кадров на magenta-фоне.
// Каждая ячейка режется с отступами, очищается от фона, выравнивается по линии стоп
// и складывается в ленту кадров (как в public/assets/sprites, но крупнее: 128px ячейка).
// Тайлы не кеируются: лист режется на 9 тайлов и ужимается до 256px.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { alphaBleed } from './pixel-art.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'vibe_images/jrpg_raw');
const OUT = path.join(ROOT, 'public/assets/jrpg');
const PREVIEW = path.join(ROOT, 'vibe_images/jrpg_preview');

const CELL = 128; // кадр персонажей и UI-мелочи
const TILE = 256; // сторона тайла земли

// ---------- поиск исходников ----------
const rawFiles = fs.readdirSync(RAW);
const find = (prefix) => {
  const hit = rawFiles.find((f) => f.startsWith(prefix) && f.endsWith('.png'));
  if (!hit) throw new Error(`нет листа ${prefix} в jrpg_raw`);
  return path.join(RAW, hit);
};

// ---------- кеирование magenta без ресайза ----------
// Модель рисует фон не идеально плоским: на листах бывает «стёганый» узор из тёмных
// ромбов. Поэтому ловим не точный #ff00ff, а весь magenta-диапазон: r и b высокие,
// g заметно ниже. Тёплые акценты (оранжевый шарф, пламя) и синяя сталь сюда не попадают.
async function key(buffer, { darkClean = true } = {}) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const strongKey = (r, g, b) => r >= 70 && b >= 70 && g <= 80 && Math.min(r, b) - g >= 55 && Math.abs(r - b) <= 90;
  const softBand = (r, g, b) => r > 60 && b > 60 && Math.abs(r - b) <= 100 && Math.min(r, b) - g > 28;

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (strongKey(r, g, b)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    if (softBand(r, g, b)) {
      data[i + 3] = Math.min(data[i + 3], Math.max(0, Math.round((Math.min(r, b) - g - 28) * 12)));
      const neutral = Math.min(g + 20, 255);
      data[i] = Math.round(r - (r - neutral) * 0.85);
      data[i + 2] = Math.round(b - (b - neutral) * 0.85);
      continue;
    }
    if (darkClean && r < 24 && g < 24 && b < 24) data[i + 3] = 0;
    // пиксель-арт не нуждается в полупрозрачной бахроме: слабые остатки фона гасим
    if (data[i + 3] < 48) data[i + 3] = 0;
  }

  // розовая «земля» без соседей сверху/снизу — фон, а не часть спрайта
  const alphaAt = (x, y, w, h) => (x >= 0 && x < w && y >= 0 && y < h ? data[(y * w + x) * 4 + 3] > 24 : false);
  const { width: w, height: h } = info;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] <= 24) continue;
      const leaning = data[i] - data[i + 1] > 18 && data[i + 2] - data[i + 1] > 18 && Math.abs(data[i] - data[i + 2]) < 45;
      if (leaning && !alphaAt(x, y - 1, w, h) && !alphaAt(x, y + 1, w, h)) data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

// ---------- утилиты ----------
async function cutCell(file, cols, rows, col, row, insets = {}) {
  const meta = await sharp(file).metadata();
  const cw = Math.floor(meta.width / cols);
  const ch = Math.floor(meta.height / rows);
  const left = col * cw + Math.round(cw * (insets.left ?? 0));
  const top = row * ch + Math.round(ch * (insets.top ?? 0));
  const width = cw - Math.round(cw * ((insets.left ?? 0) + (insets.right ?? 0)));
  const height = ch - Math.round(ch * ((insets.top ?? 0) + (insets.bottom ?? 0)));
  return sharp(file).extract({ left, top, width, height }).png().toBuffer();
}

async function alphaBox(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 24;
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  let stanceMin = width, stanceMax = -1;
  for (let y = Math.max(minY, maxY - 7); y <= maxY; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      if (x < stanceMin) stanceMin = x;
      if (x > stanceMax) stanceMax = x;
    }
  }
  return { minX, maxX, minY, maxY, stanceCenter: (stanceMin + stanceMax) / 2, width, height };
}

// Вписывает кадр в ячейку: снизу — линия стоп, по горизонтали — центр опорной части.
// anchor: 'feet' для стоящих объектов, 'center' для иконок/VFX/панелей.
async function fitCell(buffer, cell = CELL, anchor = 'feet') {
  const box = await alphaBox(buffer);
  if (!box) return null;
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  const scale = Math.min((cell - 8) / bw, (cell - 8) / bh, 1);
  return composeFrame(buffer, box, cell, scale, anchor);
}

// Кадр с фиксированным масштабом: кадры одного действия и разные действия одного
// персонажа не должны «прыгать» по размеру. Масштаб считается один раз от опорного
// кадра всего набора и передаётся во все кадры действия.
async function measure(buffer) {
  return alphaBox(buffer);
}

async function composeFrame(buffer, box, cell, scale, anchor = 'feet') {
  if (!box) return null;
  const bw = box.maxX - box.minX + 1;
  const bh = box.maxY - box.minY + 1;
  const tw = Math.max(1, Math.round(bw * scale));
  const th = Math.max(1, Math.round(bh * scale));
  const content = await sharp(buffer)
    .extract({ left: box.minX, top: box.minY, width: bw, height: bh })
    .resize(tw, th, { kernel: 'nearest', fit: 'fill' })
    .png()
    .toBuffer();
  const left = Math.round(cell / 2 - (box.stanceCenter - box.minX) * scale);
  const top = anchor === 'feet' ? cell - 4 - th : Math.round((cell - th) / 2);
  return sharp({ create: { width: cell, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: content, left: Math.max(0, Math.min(cell - tw, left)), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

// Один масштаб на действие: опора — первый кадр, ограничение — самая крупная поза.
async function actionScale(boxes, target, cell = CELL) {
  const valid = boxes.filter(Boolean);
  if (!valid.length) return 1;
  const refH = valid[0].maxY - valid[0].minY + 1;
  const maxDim = Math.max(...valid.map((b) => Math.max(b.maxX - b.minX + 1, b.maxY - b.minY + 1)));
  return Math.min(target / refH, (cell - 6) / maxDim);
}

async function strip(frames, cell = CELL) {
  const row = await sharp({
    create: { width: cell * frames.length, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(frames.map((input, i) => ({ input, left: i * cell, top: 0 })))
    .png()
    .toBuffer();
  return alphaBleed(row);
}

function save(rel, buffer) {
  const target = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
}

// ---------- описания листов ----------
// insets: отступы внутри ячейки в долях; подписи FRONT/BACK и номера кадров срезаются.

const DIRS = ['front', 'back', 'left', 'right'];

const HERO_H = 100; // эталонный рост героя в пикселях ячейки
const ENEMY_H = { goblin: 66, skeleton: 92, cultist: 100, demon: 118 };

async function buildHero() {
  const manifest = { cell: CELL, actions: {} };
  const keyedFrames = async (src, cols, rows, col, count, insets, axis = 'row') => {
    const keyed = [];
    const boxes = [];
    for (let f = 0; f < count; f++) {
      // axis='row' — сетка направлений (кадры вниз по строкам), 'col' — горизонтальная лента
      const raw = axis === 'row'
        ? await cutCell(src, cols, rows, col, f, insets(f))
        : await cutCell(src, cols, rows, f, 0, insets(f));
      const frame = await key(raw);
      keyed.push(frame);
      boxes.push(await measure(frame));
    }
    return { keyed, boxes };
  };
  const assemble = async (set, dir) => {
    const scale = await actionScale(set.boxes, HERO_H);
    return strip(await Promise.all(set.keyed.map((buf, i) => composeFrame(buf, set.boxes[i], CELL, scale))));
  };

  // idle: 4 направления x 2 кадра
  const idleSrc = find('jrpg_hero_idle');
  manifest.actions.idle = { fps: 2.5, directions: {} };
  for (let d = 0; d < 4; d++) {
    const set = await keyedFrames(idleSrc, 4, 2, d, 2, (f) => ({ top: f === 0 ? 0.2 : 0.04, left: 0.055, right: 0.02 }));
    save(`hero/idle_${DIRS[d]}.png`, await assemble(set, DIRS[d]));
    manifest.actions.idle.directions[DIRS[d]] = { file: `idle_${DIRS[d]}.png`, frames: 2 };
  }

  // walk: 4 направления x 4 кадра
  const walkSrc = find('jrpg_hero_walk');
  manifest.actions.walk = { fps: 7, directions: {} };
  for (let d = 0; d < 4; d++) {
    const set = await keyedFrames(walkSrc, 4, 4, d, 4, (f) => ({ top: f === 0 ? 0.17 : 0.05, left: 0.055, right: 0.02 }));
    save(`hero/walk_${DIRS[d]}.png`, await assemble(set));
    manifest.actions.walk.directions[DIRS[d]] = { file: `walk_${DIRS[d]}.png`, frames: 4 };
  }

  // ленты действий влево (вправо движок отражает зеркально)
  for (const [action, frames, fps] of [
    ['attack', 6, 10],
    ['cast', 6, 8],
    ['hit', 2, 8],
    ['death', 6, 6]
  ]) {
    const src = find(`jrpg_hero_${action}`);
    const set = await keyedFrames(src, frames, 1, 0, frames, () => ({ top: 0.03, bottom: 0.1, left: 0.02, right: 0.02 }), 'col');
    save(`hero/${action}.png`, await assemble(set));
    manifest.actions[action] = { file: `${action}.png`, frames, fps };
  }
  return manifest;
}

const ENEMIES = [
  ['goblin', ['walk', 'attack', 'death'], 4],
  ['skeleton', ['walk', 'attack', 'death'], 4],
  ['cultist', ['walk', 'attack', 'death'], 4],
  ['demon', ['walk', 'attack', 'cast', 'death'], 4]
];

async function buildEnemies() {
  const manifest = {};
  for (const [name, actions, frames] of ENEMIES) {
    manifest[name] = { cell: CELL, actions: {} };
    for (const action of actions) {
      const src = find(`jrpg_${name}_${action}`);
      const keyed = [];
      const boxes = [];
      for (let f = 0; f < frames; f++) {
        const raw = await cutCell(src, frames, 1, f, 0, { top: 0.03, bottom: 0.1, left: 0.01, right: 0.01 });
        const frame = await key(raw, { darkClean: name !== 'demon' });
        keyed.push(frame);
        boxes.push(await measure(frame));
      }
      const scale = await actionScale(boxes, ENEMY_H[name]);
      const out = await Promise.all(keyed.map((buf, i) => composeFrame(buf, boxes[i], CELL, scale)));
      save(`enemies/${name}_${action}.png`, await strip(out));
      manifest[name].actions[action] = { file: `${name}_${action}.png`, frames, fps: action === 'walk' ? 6 : 8 };
    }
  }
  return manifest;
}

const TILE_NAMES = ['meadow', 'forest_floor', 'dirt_trail', 'cobble_path', 'stone_bricks', 'cave_rock', 'deep_water', 'shallow_water', 'graveyard'];
const TRANSITION_NAMES = ['grass_dirt_edge', 'grass_stone_edge', 'grass_water_shore', 'dirt_cobble_edge', 'stone_cave_edge', 'cave_water_edge', 'grass_water_corner', 'grass_flowers', 'stone_broken'];

async function buildTiles() {
  const manifest = { cell: TILE, tiles: {} };
  for (const [prefix, names] of [
    ['jrpg_tiles_ground', TILE_NAMES],
    ['jrpg_tiles_transitions', TRANSITION_NAMES]
  ]) {
    const src = find(prefix);
    for (let i = 0; i < 9; i++) {
      const raw = await cutCell(src, 3, 3, i % 3, Math.floor(i / 3));
      const tile = await sharp(raw).resize(TILE, TILE, { kernel: 'nearest', fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer();
      save(`tiles/${names[i]}.png`, tile);
      manifest.tiles[names[i]] = { file: `tiles/${names[i]}.png`, size: TILE };
    }
  }
  return manifest;
}

const PROP_NAMES = {
  jrpg_props_nature: ['pine_tree', 'dead_tree', 'boulder', 'chest', 'campfire', 'signpost'],
  jrpg_props_dungeon: ['gravestone', 'ruin_statue', 'barrel', 'crate', 'bones', 'rune_stone']
};

async function buildProps() {
  const manifest = { cell: CELL };
  for (const [prefix, names] of Object.entries(PROP_NAMES)) {
    const src = find(prefix);
    for (let i = 0; i < 6; i++) {
      const raw = await cutCell(src, 3, 2, i % 3, Math.floor(i / 3));
      const frame = await fitCell(await key(raw), CELL, 'feet');
      save(`props/${names[i]}.png`, await strip([frame]));
      manifest[names[i]] = { file: `props/${names[i]}.png` };
    }
  }
  return manifest;
}

const GUI_NAMES = {
  jrpg_gui_frames: ['panel', 'button', 'button_pressed', 'orb_hp', 'orb_mp', 'slot'],
  jrpg_gui_hud: ['skillbar', 'minimap', 'gold_plate', 'dialogue', 'cursor', 'tooltip']
};

async function buildGui() {
  const manifest = { cell: 256, elements: {} };
  for (const [prefix, names] of Object.entries(GUI_NAMES)) {
    const src = find(prefix);
    for (let i = 0; i < 6; i++) {
      const raw = await cutCell(src, 3, 2, i % 3, Math.floor(i / 3), { left: 0.02, right: 0.02, top: 0.02, bottom: 0.02 });
      const frame = await fitCell(await key(raw), 256, 'center');
      save(`gui/${names[i]}.png`, await strip([frame], 256));
      manifest.elements[names[i]] = { file: `gui/${names[i]}.png` };
    }
  }
  return manifest;
}

const VFX_NAMES = {
  jrpg_vfx_fireball: ['fireball_shot', 'fireball_explosion'],
  jrpg_vfx_slash_spark: ['slash', 'hit_spark'],
  jrpg_vfx_heal_portal: ['heal', 'portal']
};

async function buildVfx() {
  const manifest = { cell: CELL };
  for (const [prefix, names] of Object.entries(VFX_NAMES)) {
    const src = find(prefix);
    for (let r = 0; r < 2; r++) {
      const frames = [];
      for (let f = 0; f < 4; f++) {
        const raw = await cutCell(src, 4, 2, f, r, { bottom: 0.13, left: 0.01, right: 0.01 });
        frames.push(await fitCell(await key(raw), CELL, 'center'));
      }
      save(`vfx/${names[r]}.png`, await strip(frames));
      manifest[names[r]] = { file: `vfx/${names[r]}.png`, frames: 4, fps: 12 };
    }
  }
  return manifest;
}

const ITEM_NAMES = {
  jrpg_items_weapons_armor: ['sword', 'axe', 'staff', 'bow', 'shield', 'helmet', 'armor', 'boots'],
  jrpg_items_consumables: ['potion_hp', 'potion_mp', 'gold', 'scroll', 'ruby', 'rune', 'ring', 'amulet']
};

async function buildItems() {
  const manifest = { cell: 96, items: {} };
  for (const [prefix, names] of Object.entries(ITEM_NAMES)) {
    const src = find(prefix);
    for (let i = 0; i < 8; i++) {
      const raw = await cutCell(src, 4, 2, i % 4, Math.floor(i / 4), { left: 0.04, right: 0.04, top: 0.04, bottom: 0.04 });
      const frame = await fitCell(await key(raw), 96, 'center');
      save(`items/${names[i]}.png`, await strip([frame], 96));
      manifest.items[names[i]] = { file: `items/${names[i]}.png` };
    }
  }
  return manifest;
}

// ---------- контакт-листы для визуальной проверки ----------
async function tileGrid(files, cell, cols) {
  const rows = Math.ceil(files.length / cols);
  const pad = 8;
  const width = cols * (cell + pad) + pad;
  const height = rows * (cell + pad) + pad;
  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const img = await sharp(files[i]).resize(cell, cell, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
    const meta = await sharp(img).metadata();
    composites.push({
      input: img,
      left: pad + (i % cols) * (cell + pad) + Math.round((cell - meta.width) / 2),
      top: pad + Math.floor(i / cols) * (cell + pad) + Math.round((cell - meta.height) / 2)
    });
  }
  return sharp({ create: { width, height, channels: 4, background: { r: 20, g: 21, b: 26, alpha: 1 } } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildPreviews(hero, enemies) {
  fs.mkdirSync(PREVIEW, { recursive: true });
  const p = (rel) => path.join(OUT, rel);

  const heroFiles = [
    ...DIRS.map((d) => p(`hero/idle_${d}.png`)),
    ...DIRS.map((d) => p(`hero/walk_${d}.png`)),
    p('hero/attack.png'), p('hero/cast.png'), p('hero/hit.png'), p('hero/death.png')
  ];
  fs.writeFileSync(path.join(PREVIEW, 'preview_hero.png'), await tileGrid(heroFiles, 224, 4));

  const enemyFiles = [];
  for (const [name, actions] of ENEMIES.map(([n, a]) => [n, a])) {
    for (const action of actions) enemyFiles.push(p(`enemies/${name}_${action}.png`));
  }
  fs.writeFileSync(path.join(PREVIEW, 'preview_enemies.png'), await tileGrid(enemyFiles, 224, 4));

  const worldFiles = [
    ...Object.values(TILE_NAMES).map((n) => p(`tiles/${n}.png`)),
    ...Object.values(TRANSITION_NAMES).map((n) => p(`tiles/${n}.png`)),
    ...Object.values(PROP_NAMES).flat().map((n) => p(`props/${n}.png`))
  ];
  fs.writeFileSync(path.join(PREVIEW, 'preview_world.png'), await tileGrid(worldFiles, 160, 6));

  const uiFiles = [
    ...Object.values(GUI_NAMES).flat().map((n) => p(`gui/${n}.png`)),
    ...Object.values(VFX_NAMES).flat().map((n) => p(`vfx/${n}.png`)),
    ...Object.values(ITEM_NAMES).flat().map((n) => p(`items/${n}.png`))
  ];
  fs.writeFileSync(path.join(PREVIEW, 'preview_ui.png'), await tileGrid(uiFiles, 160, 6));
}

// ---------- main ----------
const manifest = {
  cell: CELL,
  hero: await buildHero(),
  enemies: await buildEnemies(),
  tiles: await buildTiles(),
  props: await buildProps(),
  gui: await buildGui(),
  vfx: await buildVfx(),
  items: await buildItems()
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
// Копия для превью: страница открывается двойным кликом (file://) без сервера.
fs.mkdirSync(PREVIEW, { recursive: true });
fs.writeFileSync(path.join(PREVIEW, 'manifest.js'), `window.JRPG_MANIFEST = ${JSON.stringify(manifest)};\n`);
await buildPreviews(manifest, manifest.enemies);
console.log('JRPG assets built ->', path.relative(ROOT, OUT));
