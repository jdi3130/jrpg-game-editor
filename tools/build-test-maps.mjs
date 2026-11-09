import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'public/assets/jrpg');
const MAPS_DIR = path.join(ROOT, 'game/maps');
const PREVIEWS_DIR = path.join(ROOT, '_previews');
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e';

fs.mkdirSync(MAPS_DIR, { recursive: true });
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const TILE_PX = 96;

// Метаданные размеров пропсов (совпадает с editor.js)
const PROP_SIZES = {
  pine_tree: 128, dead_tree: 104, boulder: 96, chest: 98, signpost: 78, barrel: 76, crate: 80,
  gravestone: 88, ruin_statue: 112, bones: 56, rune_stone: 88, campfire: 96,
  fountain: 120, statue_hero: 116, torch_standing: 104, well: 108, market_stall: 124, notice_board: 104,
  house_wood: 210, house_stone: 220, smithy: 210,
  merchant_weapon: 106, merchant_potion: 106, merchant_general: 106, npc_elder: 106,
  npc_villager_m: 106, npc_villager_f: 106, npc_girl: 98, npc_maid: 106,
  warrior_guard: 106, warrior_knight: 106, warrior_archer: 106, warrior_mercenary: 106,
  animal_horse: 116, animal_cow: 112, animal_sheep: 92, animal_dog: 90, animal_cat: 72, animal_chicken: 68,
  // Новые боевые
  sarcophagus: 110, altar_blood: 114, skull_pile: 80, iron_cage: 116, dungeon_gate: 116, crypt_tomb: 120,
  stalagmite: 100, brazier_fire: 106, dark_crystal: 108, lava_fissure: 96, pentagram: 110, bone_totem: 116,
  corrupt_tree: 128, goblin_tent: 120, broken_wagon: 110, ancient_shrine: 116
};

/* ==================== 1. ТЁМНЫЙ ЛЕС И ЛАГЕРЬ ГОБЛИНОВ ==================== */
function createDarkForestMap() {
  const cols = 32, rows = 22;
  const tiles = Array.from({ length: rows }, () => Array(cols).fill('forest_floor'));

  const fill = (x1, y1, x2, y2, id) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (y >= 0 && y < rows && x >= 0 && x < cols) tiles[y][x] = id;
  };

  // Поляны и трава
  fill(3, 14, 10, 20, 'meadow');
  fill(4, 15, 8, 19, 'grass_flowers');
  fill(14, 6, 26, 16, 'meadow');
  fill(16, 8, 23, 14, 'grass_flowers');

  // Болотная топь на севере
  fill(2, 2, 9, 7, 'swamp_mud');
  fill(10, 3, 12, 6, 'swamp_mud');

  // Извилистая тропа
  const pathCells = [
    [4, 21], [4, 20], [5, 19], [6, 18], [7, 18], [8, 17], [9, 16], [10, 15],
    [11, 14], [12, 13], [13, 12], [14, 11], [15, 11], [16, 10], [17, 10],
    [18, 9], [19, 9], [20, 8], [21, 7], [22, 7], [23, 6], [24, 5], [25, 4], [26, 3], [27, 2], [28, 1], [29, 0]
  ];
  for (const [px, py] of pathCells) {
    tiles[py][px] = 'dirt_trail';
    if (py + 1 < rows) tiles[py + 1][px] = 'dirt_trail';
  }

  // Пропсы
  const props = [
    // Вход со стороны деревни (юг)
    { type: 'signpost', x: 5.5, y: 19.5, solid: false },
    { type: 'broken_wagon', x: 9.5, y: 16.2, solid: true, scale: 1.05 },
    { type: 'crate', x: 8.2, y: 16.8, solid: true },
    { type: 'barrel', x: 10.8, y: 17.0, solid: true },

    // Болото (северо-запад)
    { type: 'dead_tree', x: 3.5, y: 4.5, solid: true },
    { type: 'dead_tree', x: 7.2, y: 6.2, solid: true },
    { type: 'corrupt_tree', x: 5.8, y: 3.5, solid: true, scale: 1.1 },
    { type: 'bones', x: 6.2, y: 5.8, solid: false },
    { type: 'boulder', x: 2.2, y: 6.8, solid: true },

    // Лагерь гоблинов (центр-восток)
    { type: 'goblin_tent', x: 18.5, y: 9.2, solid: true, scale: 1.15 },
    { type: 'goblin_tent', x: 22.8, y: 10.5, solid: true, scale: 1.1 },
    { type: 'campfire', x: 20.5, y: 10.8, solid: false },
    { type: 'bone_totem', x: 16.5, y: 8.5, solid: true },
    { type: 'bone_totem', x: 24.5, y: 9.2, solid: true },
    { type: 'barrel', x: 19.2, y: 12.2, solid: true },
    { type: 'crate', x: 21.8, y: 12.5, solid: true },
    { type: 'crate', x: 22.5, y: 12.0, solid: true },
    { type: 'chest', x: 23.8, y: 8.6, solid: true }, // Лагерный сундук

    // Загадочная священная роща (восток)
    { type: 'ancient_shrine', x: 28.5, y: 15.5, solid: true, scale: 1.15 },
    { type: 'rune_stone', x: 26.5, y: 16.2, solid: true },
    { type: 'rune_stone', x: 30.2, y: 16.5, solid: true },
    { type: 'chest', x: 28.5, y: 17.8, solid: true }, // Тайный сундук святилища
    { type: 'corrupt_tree', x: 27.2, y: 13.5, solid: true },

    // Сосны по периметру
    { type: 'pine_tree', x: 1.5, y: 1.8, solid: true }, { type: 'pine_tree', x: 14.5, y: 2.2, solid: true },
    { type: 'pine_tree', x: 18.5, y: 2.5, solid: true }, { type: 'pine_tree', x: 22.5, y: 2.2, solid: true },
    { type: 'pine_tree', x: 30.5, y: 2.5, solid: true }, { type: 'pine_tree', x: 30.5, y: 7.5, solid: true },
    { type: 'pine_tree', x: 30.5, y: 12.5, solid: true }, { type: 'pine_tree', x: 1.5, y: 11.5, solid: true },
    { type: 'pine_tree', x: 1.5, y: 16.5, solid: true }, { type: 'pine_tree', x: 1.5, y: 20.5, solid: true },
    { type: 'pine_tree', x: 14.5, y: 19.5, solid: true }, { type: 'pine_tree', x: 18.5, y: 20.5, solid: true }
  ];

  const markers = [
    { type: 'spawn', x: 4.5, y: 20.5, label: 'Опушка леса' },
    { type: 'enemy', x: 10.5, y: 15.0, label: 'Гоблин-засада' },
    { type: 'enemy', x: 17.5, y: 11.5, label: 'Страж лагеря' },
    { type: 'enemy', x: 21.5, y: 11.5, label: 'Вожак гоблинов' },
    { type: 'enemy', x: 27.5, y: 14.5, label: 'Хранитель рун' },
    { type: 'chest', x: 23.8, y: 8.6, label: 'Награбленное' },
    { type: 'exit', x: 28.5, y: 1.5, label: 'К склепу →' }
  ];

  return { title: '01_dark_forest', name: 'Тёмный Лес и Застава', cols, rows, tiles, props, markers };
}

/* ==================== 2. ЗАБЫТЫЙ СКЛЕП И КЛАДБИЩЕ ==================== */
function createForgottenCryptMap() {
  const cols = 32, rows = 22;
  const tiles = Array.from({ length: rows }, () => Array(cols).fill('graveyard'));

  const fill = (x1, y1, x2, y2, id) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (y >= 0 && y < rows && x >= 0 && x < cols) tiles[y][x] = id;
  };

  // Каменные залы склепа (внутренние помещения)
  fill(12, 4, 30, 20, 'stone_broken');
  fill(13, 5, 29, 19, 'crypt_tiles');

  // Дорожка от кладбища ко входу
  fill(2, 9, 12, 12, 'cobble_path');

  // Разделительные каменные стены между залами склепа
  for (let y = 5; y <= 19; y++) {
    if (y !== 11 && y !== 12) {
      tiles[y][20] = 'stone_bricks';
    }
  }

  const props = [
    // Внешнее кладбище (запад)
    { type: 'dead_tree', x: 3.5, y: 4.2, solid: true },
    { type: 'dead_tree', x: 8.5, y: 4.8, solid: true },
    { type: 'gravestone', x: 4.2, y: 7.2, solid: false },
    { type: 'gravestone', x: 7.5, y: 7.8, solid: false },
    { type: 'gravestone', x: 3.8, y: 14.5, solid: false },
    { type: 'gravestone', x: 6.8, y: 15.2, solid: false },
    { type: 'bones', x: 5.5, y: 16.5, solid: false },
    { type: 'crypt_tomb', x: 9.5, y: 6.5, solid: true, scale: 1.1 },
    { type: 'crypt_tomb', x: 9.5, y: 16.5, solid: true, scale: 1.1 },

    // Врата склепа
    { type: 'dungeon_gate', x: 12.5, y: 11.2, solid: true, scale: 1.15 },
    { type: 'torch_standing', x: 12.5, y: 8.5, solid: false },
    { type: 'torch_standing', x: 12.5, y: 13.8, solid: false },

    // Галерея саркофагов (центральный зал)
    { type: 'brazier_fire', x: 14.5, y: 6.8, solid: true },
    { type: 'brazier_fire', x: 14.5, y: 17.5, solid: true },
    { type: 'brazier_fire', x: 18.5, y: 6.8, solid: true },
    { type: 'brazier_fire', x: 18.5, y: 17.5, solid: true },

    { type: 'sarcophagus', x: 16.5, y: 8.2, solid: true },
    { type: 'sarcophagus', x: 16.5, y: 11.2, solid: true },
    { type: 'sarcophagus', x: 16.5, y: 14.2, solid: true },
    { type: 'iron_cage', x: 19.2, y: 8.5, solid: true },
    { type: 'iron_cage', x: 19.2, y: 15.5, solid: true },
    { type: 'skull_pile', x: 14.2, y: 12.0, solid: false },

    // Внутренний ритуальный зал (восток)
    { type: 'altar_blood', x: 25.5, y: 11.8, solid: true, scale: 1.2 },
    { type: 'brazier_fire', x: 23.5, y: 9.2, solid: true },
    { type: 'brazier_fire', x: 23.5, y: 14.5, solid: true },
    { type: 'brazier_fire', x: 27.5, y: 9.2, solid: true },
    { type: 'brazier_fire', x: 27.5, y: 14.5, solid: true },
    { type: 'skull_pile', x: 25.5, y: 8.2, solid: false },
    { type: 'skull_pile', x: 25.5, y: 15.2, solid: false },
    { type: 'chest', x: 28.2, y: 11.8, solid: true } // Золотой сундук склепа
  ];

  const markers = [
    { type: 'spawn', x: 3.5, y: 10.5, label: 'Вход на кладбище' },
    { type: 'enemy', x: 7.5, y: 10.5, label: 'Скелеты-стражи' },
    { type: 'enemy', x: 16.5, y: 9.5, label: 'Восставшие рыцари' },
    { type: 'enemy', x: 16.5, y: 13.5, label: 'Скелеты-воины' },
    { type: 'enemy', x: 24.5, y: 11.8, label: 'Некромант склепа' },
    { type: 'chest', x: 28.2, y: 11.8, label: 'Гробница короля' },
    { type: 'exit', x: 28.5, y: 18.5, label: 'В катакомбы ↓' }
  ];

  return { title: '02_forgotten_crypt', name: 'Забытый Склеп и Кладбище', cols, rows, tiles, props, markers };
}

/* ==================== 3. ИНФЕРНАЛЬНЫЙ РАЗЛОМ И АРЕНА ==================== */
function createInfernalChasmMap() {
  const cols = 32, rows = 22;
  const tiles = Array.from({ length: rows }, () => Array(cols).fill('cave_rock'));

  const fill = (x1, y1, x2, y2, id) => {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (y >= 0 && y < rows && x >= 0 && x < cols) tiles[y][x] = id;
  };

  // Расколотая земля проходов
  fill(2, 8, 10, 14, 'stone_broken');

  // Мост и центральная круглая арена босса
  fill(10, 10, 14, 12, 'stone_bricks'); // перешеек-мост
  fill(14, 4, 29, 18, 'stone_broken');
  fill(16, 6, 27, 16, 'blood_stone'); // ритуальный круг босса

  // Лавовые реки и разломы
  fill(1, 1, 30, 3, 'lava_stone');
  fill(1, 19, 30, 21, 'lava_stone');
  fill(11, 4, 13, 9, 'lava_stone');
  fill(11, 13, 13, 18, 'lava_stone');

  const props = [
    // Входной каменный грот
    { type: 'stalagmite', x: 3.2, y: 7.5, solid: true },
    { type: 'stalagmite', x: 3.5, y: 15.2, solid: true },
    { type: 'torch_standing', x: 5.5, y: 9.2, solid: false },
    { type: 'torch_standing', x: 5.5, y: 13.5, solid: false },
    { type: 'lava_fissure', x: 7.5, y: 11.2, solid: false },

    // Мост через кипящую магму
    { type: 'bone_totem', x: 10.5, y: 8.8, solid: true },
    { type: 'bone_totem', x: 10.5, y: 13.8, solid: true },
    { type: 'stalagmite', x: 14.2, y: 8.8, solid: true },
    { type: 'stalagmite', x: 14.2, y: 13.8, solid: true },

    // Центральная арена босса
    { type: 'pentagram', x: 21.5, y: 11.2, solid: false, scale: 1.3 },
    { type: 'brazier_fire', x: 17.5, y: 7.5, solid: true },
    { type: 'brazier_fire', x: 25.5, y: 7.5, solid: true },
    { type: 'brazier_fire', x: 17.5, y: 15.0, solid: true },
    { type: 'brazier_fire', x: 25.5, y: 15.0, solid: true },

    // Парящие кристаллы бездны
    { type: 'dark_crystal', x: 16.5, y: 11.2, solid: true, scale: 1.15 },
    { type: 'dark_crystal', x: 26.5, y: 11.2, solid: true, scale: 1.15 },
    { type: 'lava_fissure', x: 21.5, y: 5.8, solid: false },
    { type: 'lava_fissure', x: 21.5, y: 16.5, solid: false },

    { type: 'skull_pile', x: 19.2, y: 8.2, solid: false },
    { type: 'skull_pile', x: 23.8, y: 8.2, solid: false },
    { type: 'chest', x: 28.5, y: 11.2, solid: true, scale: 1.1 } // Демонический ларец
  ];

  const markers = [
    { type: 'spawn', x: 3.5, y: 11.2, label: 'Вход в жерло' },
    { type: 'enemy', x: 8.5, y: 11.2, label: 'Бесы-стражи' },
    { type: 'enemy', x: 18.5, y: 9.5, label: 'Культисты Бездны' },
    { type: 'enemy', x: 18.5, y: 13.0, label: 'Огненные гончие' },
    { type: 'enemy', x: 21.5, y: 11.2, label: 'БОСС: ДЕМОН РАЗЛОМА' },
    { type: 'chest', x: 28.5, y: 11.2, label: 'Сундук Владыки' },
    { type: 'exit', x: 28.5, y: 15.5, label: 'Портал в город ✦' }
  ];

  return { title: '03_infernal_chasm', name: 'Инфернальный Разлом и Арена', cols, rows, tiles, props, markers };
}

/* ==================== РЕНДЕР КАРТЫ В ВЫСОКОМ КАЧЕСТВЕ (SHARP) ==================== */
async function renderMapToPng(mapData, outPngPath) {
  const { cols, rows, tiles, props, markers } = mapData;
  const W = cols * TILE_PX;
  const H = rows * TILE_PX;

  // Кэш изображений тайлов и пропсов
  const tileImgs = {};
  const propImgs = {};

  const uniqueTiles = [...new Set(tiles.flat())];
  for (const t of uniqueTiles) {
    const f = path.join(ASSETS_DIR, `tiles/${t}.png`);
    if (fs.existsSync(f)) {
      tileImgs[t] = await sharp(f).resize(TILE_PX, TILE_PX, { kernel: 'lanczos3' }).png().toBuffer();
    }
  }

  const uniqueProps = [...new Set(props.map(p => p.type))];
  for (const p of uniqueProps) {
    const f = path.join(ASSETS_DIR, `props/${p}.png`);
    if (fs.existsSync(f)) {
      const meta = await sharp(f).metadata();
      // Если горизонтальный спрайт-шит (анимация), берем 1-й кадр
      if (meta.width > meta.height && meta.width % meta.height === 0) {
        propImgs[p] = await sharp(f).extract({ left: 0, top: 0, width: meta.height, height: meta.height }).png().toBuffer();
      } else {
        propImgs[p] = await sharp(f).png().toBuffer();
      }
    }
  }

  // 1. Слой земли (тайлы)
  const tileComposites = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = tiles[y][x];
      if (tileImgs[t]) {
        tileComposites.push({ input: tileImgs[t], left: x * TILE_PX, top: y * TILE_PX });
      }
    }
  }

  const ground = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 15, g: 15, b: 20, alpha: 1 } }
  }).composite(tileComposites).png().toBuffer();

  // 2. Слой объектов (пропсы с Y-сортировкой)
  const sortedProps = [...props].sort((a, b) => a.y - b.y);
  const propComposites = [];

  for (const p of sortedProps) {
    const buf = propImgs[p.type];
    if (!buf) continue;
    const baseSize = PROP_SIZES[p.type] || 96;
    const size = Math.round(baseSize * (p.scale || 1));

    const resized = await sharp(buf).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const left = Math.round(p.x * TILE_PX - size / 2);
    const top = Math.round(p.y * TILE_PX - size);

    // Проверяем, чтобы объект попадал в границы
    if (left + size > 0 && left < W && top + size > 0 && top < H) {
      propComposites.push({
        input: resized,
        left: Math.max(0, left),
        top: Math.max(0, top)
      });
    }
  }

  // Накладываем пропсы на землю
  let fullMap = await sharp(ground).composite(propComposites).png().toBuffer();

  // Уменьшаем для легкого отображения в превью (до 1536 px по ширине)
  const targetW = 1536;
  const targetH = Math.round(H * (targetW / W));
  await sharp(fullMap)
    .resize(targetW, targetH, { kernel: 'lanczos3' })
    .png()
    .toFile(outPngPath);

  console.log(`  Rendered: ${outPngPath} (${targetW}x${targetH})`);
}

async function main() {
  console.log('--- Generating Test Combat Maps ---');

  const maps = [
    createDarkForestMap(),
    createForgottenCryptMap(),
    createInfernalChasmMap()
  ];

  for (const m of maps) {
    // 1. Сохраняем JSON файл карты
    const mapData = {
      version: 1,
      tileSize: TILE_PX,
      title: m.name,
      cols: m.cols,
      rows: m.rows,
      tiles: m.tiles,
      props: m.props.map(p => ({
        type: p.type,
        x: +p.x.toFixed(3),
        y: +p.y.toFixed(3),
        solid: p.solid !== false,
        scale: +(p.scale || 1).toFixed(2),
        rot: 0,
        flipX: false,
        flipY: false,
        variant: 'normal'
      })),
      markers: m.markers.map(mk => ({
        type: mk.type,
        x: +mk.x.toFixed(3),
        y: +mk.y.toFixed(3),
        label: mk.label || ''
      }))
    };

    const jsonPath = path.join(MAPS_DIR, `${m.title}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(mapData, null, 2), 'utf8');
    console.log(`Saved JSON: ${jsonPath}`);

    // 2. Рендерим превью в _previews
    const previewPng = path.join(PREVIEWS_DIR, `${m.title}.png`);
    await renderMapToPng(m, previewPng);

    // 3. Копируем в brain директорию артефактов для просмотра в чате
    const brainPng = path.join(ARTIFACT_DIR, `${m.title}.png`);
    fs.copyFileSync(previewPng, brainPng);
  }

  console.log('--- All test maps built and rendered successfully! ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

