import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');

const NPCS = [
  'merchant_weapon',
  'merchant_potion',
  'merchant_general',
  'npc_elder',
  'npc_villager_m',
  'npc_villager_f',
  'npc_girl',
  'npc_maid',
  'warrior_guard',
  'warrior_knight',
  'warrior_archer',
  'warrior_mercenary'
];

async function alphaBox(buffer, width = 128, height = 128) {
  const { data } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, maxX, minY, maxY, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

// Создание 4-кадрового цикла ходьбы
async function createWalkCycle(frame0Buf, cell = 128) {
  const { data } = await sharp(frame0Buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const box = await alphaBox(frame0Buf, cell, cell);
  if (!box) throw new Error('Empty sprite');

  const centerX = Math.round(box.minX + box.bw * 0.5);
  const headCut = Math.round(box.minY + box.bh * 0.32);
  const waistCut = Math.round(box.minY + box.bh * 0.65);
  const feetCut = Math.round(box.minY + box.bh * 0.82);

  const leftArmBound = Math.round(box.minX + box.bw * 0.28);
  const rightArmBound = Math.round(box.maxX - box.bw * 0.28);

  // Кадр 0: нейтральная стойка (frame0Buf)
  const frame0 = frame0Buf;

  // Функция смещения пикселей для шага
  function buildStepFrame(stepSide, bobY) {
    // stepSide: 'left' or 'right'
    const out = Buffer.alloc(cell * cell * 4, 0);

    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const srcIdx = (y * cell + x) * 4;
        const a = data[srcIdx + 3];
        if (a <= 24) continue;

        let dx = 0;
        let dy = 0;

        // 1. Голова и туловище: покачивание (bob) вверх/вниз
        if (y < waistCut) {
          dy = bobY;
          // Легкое покачивание плеч при шаге
          if (y >= headCut) {
            if (stepSide === 'left') {
              if (x <= leftArmBound) { dx = -1; dy += -1; } // Левая рука назад
              else if (x >= rightArmBound) { dx = 1; dy += 1; } // Правая рука вперед
            } else if (stepSide === 'right') {
              if (x <= leftArmBound) { dx = 1; dy += 1; } // Левая рука вперед
              else if (x >= rightArmBound) { dx = -1; dy += -1; } // Правая рука назад
            }
          }
        }
        // 2. Ноги и стопы
        else {
          const isLeftLeg = x < centerX;
          if (stepSide === 'left') {
            if (isLeftLeg) {
              // Шагающая левая нога: вынос вперед и подъем стопы
              dx = (y >= feetCut) ? -2 : -1;
              dy = (y >= feetCut) ? -2 : -1;
            } else {
              // Опорная правая нога: остается на земле
              dx = 1;
              dy = 0;
            }
          } else if (stepSide === 'right') {
            if (!isLeftLeg) {
              // Шагающая правая нога: вынос вперед и подъем стопы
              dx = (y >= feetCut) ? 2 : 1;
              dy = (y >= feetCut) ? -2 : -1;
            } else {
              // Опорная левая нога: остается на земле
              dx = -1;
              dy = 0;
            }
          }
        }

        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < cell && ny >= 0 && ny < cell) {
          const dstIdx = (ny * cell + nx) * 4;
          out[dstIdx] = data[srcIdx];
          out[dstIdx + 1] = data[srcIdx + 1];
          out[dstIdx + 2] = data[srcIdx + 2];
          out[dstIdx + 3] = data[srcIdx + 3];
        }
      }
    }

    return sharp(out, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();
  }

  // Кадр 1: шаг левой ногой вперед (торс опускается на 1px)
  const frame1 = await buildStepFrame('left', 1);

  // Кадр 2: фаза переноса (нейтральная высокая точка)
  // Верхняя часть тела слегка приподнята (-1px) в высшей точке шага
  const frame2Data = Buffer.alloc(cell * cell * 4, 0);
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      const srcIdx = (y * cell + x) * 4;
      if (data[srcIdx + 3] <= 24) continue;
      const dy = (y < waistCut) ? -1 : 0;
      const ny = y + dy;
      if (ny >= 0 && ny < cell) {
        const dstIdx = (ny * cell + x) * 4;
        frame2Data[dstIdx] = data[srcIdx];
        frame2Data[dstIdx + 1] = data[srcIdx + 1];
        frame2Data[dstIdx + 2] = data[srcIdx + 2];
        frame2Data[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  const frame2 = await sharp(frame2Data, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();

  // Кадр 3: шаг правой ногой вперед (торс опускается на 1px)
  const frame3 = await buildStepFrame('right', 1);

  // Склеиваем 4 кадра горизонтально в лист 512x128
  const sheet = await sharp({
    create: {
      width: cell * 4,
      height: cell,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite([
    { input: frame0, left: 0, top: 0 },
    { input: frame1, left: cell, top: 0 },
    { input: frame2, left: cell * 2, top: 0 },
    { input: frame3, left: cell * 3, top: 0 }
  ]).png().toBuffer();

  return sheet;
}

async function main() {
  console.log('Генерация 4-кадровых анимаций передвижения для 12 NPC...');

  for (const id of NPCS) {
    const file = path.join(PROPS_DIR, `${id}.png`);
    if (!fs.existsSync(file)) {
      console.warn('Файл не найден:', file);
      continue;
    }

    // Извлекаем кадр 0 (128x128)
    const frame0 = await sharp(file).extract({ left: 0, top: 0, width: 128, height: 128 }).png().toBuffer();
    const sheet = await createWalkCycle(frame0, 128);

    fs.writeFileSync(file, sheet);
    console.log(`  + ${id}.png -> 512x128 (4 кадра анимации передвижения)`);
  }

  // Обновляем manifest.json
  const manifestPath = path.join(ROOT, 'public/assets/jrpg/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const id of NPCS) {
    if (manifest.props && manifest.props[id]) {
      manifest.props[id].frames = 4;
      manifest.props[id].fps = 7;
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('manifest.json успешно обновлен (frames: 4, fps: 7 для всех NPC)!');
}

main().catch(console.error);

