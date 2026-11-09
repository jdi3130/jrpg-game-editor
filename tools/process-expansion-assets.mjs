import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PROPS = path.join(ROOT, 'public/assets/jrpg/props');
const OUT_TILES = path.join(ROOT, 'public/assets/jrpg/tiles');

const BRAIN_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e';

const SOURCES = {
  buildings: path.join(BRAIN_DIR, 'dark_fantasy_buildings_spritesheet_clean_1794225795508.jpg'),
  props: path.join(BRAIN_DIR, 'campfires_and_props_spritesheet_1794225758757.jpg'),
  tiles: path.join(BRAIN_DIR, 'floor_tiles_spritesheet_1794225761651.jpg')
};

// Функция кеирования мадженты (#ff00ff) с надежным деспиллом
async function keyMagenta(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Чистая маджента
    if (r >= 140 && b >= 140 && g <= 105 && (Math.min(r, b) - g >= 35)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    // Граница / деспилл
    if (r > 105 && b > 105 && Math.min(r, b) - g > 20) {
      const diff = Math.min(r, b) - g;
      if (diff > 35) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      } else {
        const neutral = data[i + 1];
        data[i] = Math.round(data[i] - (data[i] - neutral) * 0.85);
        data[i + 2] = Math.round(data[i + 2] - (data[i + 2] - neutral) * 0.85);
        data[i + 3] = Math.max(0, Math.round(data[i + 3] * (1 - (diff - 20) / 16)));
      }
    }
    // Темная грязь
    if (data[i] < 15 && data[i + 1] < 15 && data[i + 2] < 15 && data[i + 3] < 180) {
      data[i + 3] = 0;
    }
    if (data[i + 3] < 30) data[i + 3] = 0;
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function alphaBox(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, maxX, minY, maxY, width, height, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

async function extractAndFit(sourceFile, cellRect, { cell = 128, targetW = 110, targetH = 110, padBottom = 6 }) {
  const raw = await sharp(sourceFile).extract(cellRect).png().toBuffer();
  const keyed = await keyMagenta(raw);
  const box = await alphaBox(keyed);
  if (!box) {
    console.warn('Empty bounding box for cell', cellRect);
    return sharp({ create: { width: cell, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  }

  // Обрезаем до реальных непрозрачных пикселей
  const cropped = await sharp(keyed).extract({
    left: box.minX,
    top: box.minY,
    width: box.bw,
    height: box.bh
  }).png().toBuffer();

  const scale = Math.min(targetW / box.bw, targetH / box.bh);
  const nw = Math.max(1, Math.round(box.bw * scale));
  const nh = Math.max(1, Math.round(box.bh * scale));

  const resized = await sharp(cropped).resize(nw, nh, { kernel: 'lanczos3' }).png().toBuffer();

  const canvas = sharp({
    create: {
      width: cell,
      height: cell,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const left = Math.round((cell - nw) / 2);
  const top = cell - nh - padBottom;

  return canvas.composite([{ input: resized, left, top }]).png().toBuffer();
}

async function extractTile(sourceFile, rect, outPath) {
  // Вырезаем тайл из сетки с отступом от краев ячейки, чтобы убрать разделительные рамки
  const padX = Math.round(rect.width * 0.08);
  const padY = Math.round(rect.height * 0.08);
  const subRect = {
    left: rect.left + padX,
    top: rect.top + padY,
    width: rect.width - padX * 2,
    height: rect.height - padY * 2
  };
  const buf = await sharp(sourceFile)
    .extract(subRect)
    .resize(256, 256, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, buf);
}

async function main() {
  fs.mkdirSync(OUT_PROPS, { recursive: true });
  fs.mkdirSync(OUT_TILES, { recursive: true });

  console.log('1. Обработка зданий (12 штук)...');
  const bMeta = await sharp(SOURCES.buildings).metadata();
  const bCols = 4, bRows = 3;
  const bCellW = bMeta.width / bCols;
  const bCellH = bMeta.height / bRows;

  const BUILDINGS = [
    // Ряд 1: руины и тёмные строения
    ['house_ruin_burnt', 'Обгоревший дом (руины)', 0, 0],
    ['house_ruin_stone', 'Разрушенный каменный дом', 0, 1],
    ['house_ruin_tower', 'Разрушенная башня', 0, 2],
    ['house_witch_shack', 'Хижина ведьмы на сваях', 0, 3],
    // Ряд 2: особые строения деревни
    ['house_mausoleum', 'Готический мавзолей/склеп', 1, 0],
    ['house_windmill', 'Ветряная мельница', 1, 1],
    ['house_tavern_inn', 'Большая таверна/трактир', 1, 2],
    ['house_chapel', 'Готическая часовня', 1, 3],
    // Ряд 3: ремесло и походные постройки
    ['house_ruin_smithy', 'Разрушенная кузница', 2, 0],
    ['house_war_tent', 'Военный походный шатёр', 2, 1],
    ['house_watermill', 'Лесопилка с колесом', 2, 2],
    ['house_hermit_cabin', 'Хижина отшельника', 2, 3]
  ];

  for (const [id, label, r, c] of BUILDINGS) {
    const rect = {
      left: Math.round(c * bCellW),
      top: Math.round(r * bCellH),
      width: Math.round(bCellW),
      height: Math.round(bCellH)
    };
    const buf = await extractAndFit(SOURCES.buildings, rect, {
      cell: 256,
      targetW: 230,
      targetH: 230,
      padBottom: 8
    });
    fs.writeFileSync(path.join(OUT_PROPS, `${id}.png`), buf);
    console.log(`  + Здание: ${id} (${label})`);
  }

  console.log('\n2. Обработка костров и объектов (12 штук)...');
  const pMeta = await sharp(SOURCES.props).metadata();
  const pCols = 4, pRows = 3;
  const pCellW = pMeta.width / pCols;
  const pCellH = pMeta.height / pRows;

  const PROPS_LIST = [
    // Ряд 1: Разнообразные костры
    ['campfire_pot', 'Костёр с котелком', 0, 0, 128, 108, 108, 6],
    ['campfire_ashes', 'Пепелище костра', 0, 1, 128, 96, 76, 12],
    ['campfire_ritual', 'Ритуальный костёр (синий)', 0, 2, 128, 108, 112, 6],
    ['campfire_stones', 'Костёр в каменном круге', 0, 3, 128, 104, 100, 8],
    // Ряд 2: Большой костёр и интерактивные мелкие объекты
    ['campfire_beacon', 'Большой сигнальный костёр', 1, 0, 128, 108, 120, 6],
    ['prop_potions', 'Стеллаж с зельями', 1, 1, 128, 92, 100, 8],
    ['prop_gold_pile', 'Россыпь золота и рубинов', 1, 2, 128, 94, 76, 10],
    ['prop_mushrooms', 'Светящиеся грибы пещеры', 1, 3, 128, 90, 84, 10],
    // Ряд 3: Мелкие и крупные объекты
    ['prop_candles', 'Оплавленные свечи на черепе', 2, 0, 128, 88, 92, 8],
    ['prop_urn', 'Античная урна / амфора', 2, 1, 128, 76, 96, 8],
    ['prop_gargoyle', 'Каменная горгулья на постаменте', 2, 2, 128, 104, 120, 6],
    ['prop_dragon_bones', 'Скелет древнего дракона', 2, 3, 256, 230, 150, 12]
  ];

  for (const [id, label, r, c, cell, tw, th, padB] of PROPS_LIST) {
    const rect = {
      left: Math.round(c * pCellW),
      top: Math.round(r * pCellH),
      width: Math.round(pCellW),
      height: Math.round(pCellH)
    };
    const buf = await extractAndFit(SOURCES.props, rect, {
      cell,
      targetW: tw,
      targetH: th,
      padBottom: padB
    });
    fs.writeFileSync(path.join(OUT_PROPS, `${id}.png`), buf);
    console.log(`  + Объект: ${id} (${label}) [cell=${cell}]`);
  }

  console.log('\n3. Обработка новых тайлов (8 штук)...');
  const tMeta = await sharp(SOURCES.tiles).metadata();
  const tCols = 4, tRows = 2;
  const tCellW = tMeta.width / tCols;
  const tCellH = tMeta.height / tRows;

  const TILES_LIST = [
    // Ряд 1
    ['wood_planks', 'Деревянный настил / пол', 0, 0],
    ['marble_sanctuary', 'Мрамор святилища', 0, 1],
    ['desert_sand', 'Пустынный песок', 0, 2],
    ['snow_ice', 'Снег и мерзлота', 0, 3],
    // Ряд 2
    ['toxic_sludge', 'Токсичная трясина', 1, 0],
    ['obsidian_void', 'Обсидиановая бездна', 1, 1],
    ['dungeon_flagstones', 'Каменные плиты темницы', 1, 2],
    ['ruin_cobbles', 'Брусчатка руин с мхом', 1, 3]
  ];

  for (const [id, label, r, c] of TILES_LIST) {
    const rect = {
      left: Math.round(c * tCellW),
      top: Math.round(r * tCellH),
      width: Math.round(tCellW),
      height: Math.round(tCellH)
    };
    const outPath = path.join(OUT_TILES, `${id}.png`);
    await extractTile(SOURCES.tiles, rect, outPath);
    console.log(`  + Тайл: ${id} (${label})`);
  }

  console.log('\nУспешно обработано: 12 домов, 12 пропсов/костров, 8 тайлов!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

