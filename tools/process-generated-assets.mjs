// Сборка и анимация новых ассетов JRPG из сгенерированных листов
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PROPS = path.join(ROOT, 'public/assets/jrpg/props');

// Исходные файлы из brain
const SOURCES = {
  props: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/jrpg_city_props_spritesheet_1794188831842.jpg',
  buildings: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/town_buildings_sheet_1794188840154.jpg',
  warriors: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/jrpg_warriors_spritesheet_1794188848099.jpg',
  npcs: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/npc_merchants_spritesheet_1794188845673.jpg',
  animals: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/jrpg_village_animals_spritesheet_1794188858456.jpg'
};

// Функция аккуратного кеирования мадженты
async function keyMagenta(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Сильный ключ мадженты
    if (r >= 140 && b >= 140 && g <= 100 && (Math.min(r, b) - g >= 45)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    // Мягкий диапазон / снятие деспилла
    if (r > 110 && b > 110 && Math.min(r, b) - g > 25) {
      const diff = Math.min(r, b) - g;
      if (diff > 40) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      } else {
        const neutral = data[i + 1];
        data[i] = Math.round(data[i] - (data[i] - neutral) * 0.85);
        data[i + 2] = Math.round(data[i + 2] - (data[i + 2] - neutral) * 0.85);
        data[i + 3] = Math.max(0, Math.round(data[i + 3] * (1 - (diff - 25) / 15)));
      }
    }
    // Гасим темные артефакты
    if (data[i] < 18 && data[i + 1] < 18 && data[i + 2] < 18 && data[i + 3] < 200) {
      data[i + 3] = 0;
    }
    if (data[i + 3] < 32) data[i + 3] = 0;
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

// Поиск непрозрачного bounding box
async function alphaBox(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
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
  return { minX, maxX, minY, maxY, width, height, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

// Вырезка ячейки из исходного листа
async function extractRegion(filePath, { left, top, width, height }) {
  const raw = await sharp(filePath).extract({ left, top, width, height }).png().toBuffer();
  return keyMagenta(raw);
}

// Вписывание в ячейку заданного размера (CELL) с масштабированием и привязкой
async function fitToCell(buffer, { cell = 128, targetH, targetW, anchor = 'feet', padBottom = 4 }) {
  const box = await alphaBox(buffer);
  if (!box) throw new Error('Empty alpha box');

  let scale = 1;
  if (targetH && targetW) {
    scale = Math.min(targetW / box.bw, targetH / box.bh);
  } else if (targetH) {
    scale = targetH / box.bh;
  } else if (targetW) {
    scale = targetW / box.bw;
  } else {
    scale = Math.min((cell - 10) / box.bw, (cell - 10) / box.bh);
  }
  // Не увеличиваем слишком сильно если уже крупно
  if (box.bh * scale > cell - 6) scale = (cell - 6) / box.bh;
  if (box.bw * scale > cell - 6) scale = (cell - 6) / box.bw;

  const tw = Math.max(1, Math.round(box.bw * scale));
  const th = Math.max(1, Math.round(box.bh * scale));

  const content = await sharp(buffer)
    .extract({ left: box.minX, top: box.minY, width: box.bw, height: box.bh })
    .resize(tw, th, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const left = Math.round((cell - tw) / 2);
  const top = anchor === 'feet' ? cell - padBottom - th : Math.round((cell - th) / 2);

  return sharp({
    create: { width: cell, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: content, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

// Сборка горизонтальной ленты кадров
async function makeStrip(frames, cell) {
  return sharp({
    create: { width: cell * frames.length, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(frames.map((input, i) => ({ input, left: i * cell, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ------------------- АНИМАЦИИ -------------------

// 1. Анимация дыхания для гуманоидов (2 кадра, 2.5 FPS — как у героя)
async function animateBreathing(frame0Buf, cell = 128) {
  const { data, info } = await sharp(frame0Buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const box = await alphaBox(frame0Buf);

  // Кадр 1: тело выше талии (верхние 60% роста) сдвигается на 1px вниз (вдох/выдох), стопы остаются на месте
  const splitY = Math.round(box.minY + box.bh * 0.62);

  const f1Data = Buffer.from(data);
  // Очищаем верхнюю зону в f1Data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (y <= splitY + 1) {
        f1Data[idx] = f1Data[idx + 1] = f1Data[idx + 2] = f1Data[idx + 3] = 0;
      }
    }
  }

  // Копируем верхнюю зону со смещением +1px вниз
  for (let y = box.minY; y <= splitY; y++) {
    const ny = y + 1;
    if (ny >= h) continue;
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * w + x) * 4;
      if (data[srcIdx + 3] <= 24) continue;
      const dstIdx = (ny * w + x) * 4;
      f1Data[dstIdx] = data[srcIdx];
      f1Data[dstIdx + 1] = data[srcIdx + 1];
      f1Data[dstIdx + 2] = data[srcIdx + 2];
      f1Data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  // Блик в глазах / на металле во 2-м кадре
  const eyeY = Math.round(box.minY + box.bh * 0.22);
  const eyeX = Math.round(box.minX + box.bw * 0.5);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const idx = ((eyeY + dy) * w + (eyeX + dx)) * 4;
      if (f1Data[idx + 3] > 100) {
        f1Data[idx] = Math.min(255, f1Data[idx] + 25);
        f1Data[idx + 1] = Math.min(255, f1Data[idx + 1] + 25);
        f1Data[idx + 2] = Math.min(255, f1Data[idx + 2] + 35);
      }
    }
  }

  const frame1Buf = await sharp(f1Data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return makeStrip([frame0Buf, frame1Buf], cell);
}

// 2. Анимация факела/жаровни (4 кадра, 7 FPS — живой танцующий огонь без артефактов)
async function animateTorch(frame0Buf, cell = 128) {
  const { data, info } = await sharp(frame0Buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const box = await alphaBox(frame0Buf);

  // Пламя занимает верхнюю часть
  const flameH = Math.round(box.bh * 0.44);
  const flameCutoff = box.minY + flameH;
  const centerX = Math.round(box.minX + box.bw * 0.5);

  const frames = [frame0Buf];

  const shifts = [
    { dx: -1, glow: 1.12, sparkY: -4, sparkX: -2 },
    { dx: 1, glow: 1.25, sparkY: -6, sparkX: 2 },
    { dx: 0, glow: 0.96, sparkY: -3, sparkX: 1 }
  ];

  for (const s of shifts) {
    const fData = Buffer.from(data);

    // Модифицируем ТОЛЬКО пиксели огня, не трогая металлическую чашу
    for (let y = box.minY; y <= flameCutoff; y++) {
      for (let x = box.minX; x <= box.maxX; x++) {
        const srcIdx = (y * w + x) * 4;
        if (data[srcIdx + 3] <= 24) continue;
        const [r, g, b] = [data[srcIdx], data[srcIdx + 1], data[srcIdx + 2]];
        const isFire = (r > 130 && g > 50 && (r - b > 40));
        if (!isFire) continue;

        // Пульсация пламени и микро-сдвиг кончика огня
        const relY = (flameCutoff - y) / flameH; // 1 у верхушки, 0 у низа
        const curDx = Math.round(s.dx * relY);

        const nx = x + curDx;
        if (nx >= 0 && nx < w) {
          const dstIdx = (y * w + nx) * 4;
          // Если целевой пиксел пустой или огонь — мягко красим
          if (fData[dstIdx + 3] === 0 || (fData[dstIdx] > 100 && fData[dstIdx] > fData[dstIdx + 2])) {
            fData[dstIdx] = Math.min(255, Math.round(r * s.glow));
            fData[dstIdx + 1] = Math.min(255, Math.round(g * Math.min(1.2, s.glow)));
            fData[dstIdx + 2] = b;
            fData[dstIdx + 3] = data[srcIdx + 3];
          }
        }
      }
    }

    // Легкие летящие искры над факелом
    const sparkX = Math.round(centerX + s.sparkX * 2);
    const sparkY = Math.max(2, Math.round(box.minY + s.sparkY));
    for (let oy = 0; oy < 2; oy++) {
      for (let ox = 0; ox < 2; ox++) {
        const sidx = ((sparkY + oy) * w + (sparkX + ox)) * 4;
        fData[sidx] = 255; fData[sidx + 1] = 220; fData[sidx + 2] = 80; fData[sidx + 3] = 240;
      }
    }

    frames.push(await sharp(fData, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer());
  }

  return makeStrip(frames, cell);
}

// 3. Анимация фонтана (4 кадра, 7 FPS — чистая рябь и брызги без задевания камня)
async function animateFountain(frame0Buf, cell = 128) {
  const { data, info } = await sharp(frame0Buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const box = await alphaBox(frame0Buf);

  const spoutCutoff = Math.round(box.minY + box.bh * 0.32);
  const poolCenterY = Math.round(box.minY + box.bh * 0.54);
  const poolCenterX = Math.round(box.minX + box.bw * 0.5);

  const frames = [frame0Buf];

  const phases = [
    { spoutDy: -1, rippleR: 12, rippleAlpha: 0.7 },
    { spoutDy: -2, rippleR: 20, rippleAlpha: 0.85 },
    { spoutDy: -1, rippleR: 28, rippleAlpha: 0.6 }
  ];

  for (const p of phases) {
    const fData = Buffer.from(data);

    // Пульсация только центральной струи (x близко к центру)
    for (let y = box.minY; y <= spoutCutoff; y++) {
      for (let x = poolCenterX - 14; x <= poolCenterX + 14; x++) {
        if (x < 0 || x >= w) continue;
        const srcIdx = (y * w + x) * 4;
        if (data[srcIdx + 3] <= 24) continue;
        const [r, g, b] = [data[srcIdx], data[srcIdx + 1], data[srcIdx + 2]];
        // Чистая голубая вода
        if (b > 140 && b > r + 30 && b > g) {
          const ny = y + p.spoutDy;
          if (ny >= 0 && ny < h) {
            const dstIdx = (ny * w + x) * 4;
            fData[dstIdx] = Math.min(255, r + 20);
            fData[dstIdx + 1] = Math.min(255, g + 25);
            fData[dstIdx + 2] = 255;
            fData[dstIdx + 3] = data[srcIdx + 3];
          }
        }
      }
    }

    // Круги ряби на воде (только если пиксель уже синяя вода)
    const rx = p.rippleR;
    const ry = Math.round(rx * 0.44);
    for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
      const qx = Math.round(poolCenterX + Math.cos(angle) * rx);
      const qy = Math.round(poolCenterY + Math.sin(angle) * ry);
      if (qx >= 0 && qx < w && qy >= 0 && qy < h) {
        const qidx = (qy * w + qx) * 4;
        const [r, g, b] = [data[qidx], data[qidx + 1], data[qidx + 2]];
        // Только чистая вода бассейна
        if (data[qidx + 3] > 100 && b > 140 && b > r + 30) {
          fData[qidx] = Math.min(255, Math.round(r + 50 * p.rippleAlpha));
          fData[qidx + 1] = Math.min(255, Math.round(g + 60 * p.rippleAlpha));
          fData[qidx + 2] = 255;
        }
      }
    }

    frames.push(await sharp(fData, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer());
  }

  return makeStrip(frames, cell);
}

// 4. Анимация животных (4 кадра, 7 FPS — бесшовная и плавная)
async function animateAnimal(frame0Buf, cell = 128, type = 'dog') {
  const { data, info } = await sharp(frame0Buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const box = await alphaBox(frame0Buf);

  const frames = [frame0Buf];

  for (let step = 1; step <= 3; step++) {
    // В каждом кадре всё цельное тело дышит монолитно (без швов внутри силуэта)
    const breatheY = (step === 1 || step === 3) ? 1 : 0;
    const fData = Buffer.alloc(w * h * 4, 0);

    // Сдвигаем всё тело монолитно выше копыт/лап
    const legCutoff = Math.round(box.maxY - box.bh * 0.15);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y * w + x) * 4;
        if (data[srcIdx + 3] <= 24) continue;

        // Если это стопы/копыта — на месте. Если тело — сдвиг breatheY
        const dy = (y < legCutoff) ? breatheY : 0;
        const ny = y + dy;
        if (ny >= 0 && ny < h) {
          const dstIdx = (ny * w + x) * 4;
          fData[dstIdx] = data[srcIdx];
          fData[dstIdx + 1] = data[srcIdx + 1];
          fData[dstIdx + 2] = data[srcIdx + 2];
          fData[dstIdx + 3] = data[srcIdx + 3];
        }
      }
    }

    // Дополнительные характерные движения для разных животных:
    if (type === 'dog') {
      // Виляние хвостом (крайний левый выступ)
      const tailMaxX = Math.round(box.minX + box.bw * 0.22);
      const wagY = step === 1 ? -1 : (step === 2 ? 1 : 0);
      for (let y = box.minY; y <= box.maxY; y++) {
        for (let x = box.minX; x <= tailMaxX; x++) {
          const sidx = (y * w + x) * 4;
          if (data[sidx + 3] <= 24) continue;
          const ny = y + wagY + breatheY;
          if (ny >= 0 && ny < h) {
            const didx = (ny * w + x) * 4;
            fData[didx] = data[sidx];
            fData[didx + 1] = data[sidx + 1];
            fData[didx + 2] = data[sidx + 2];
            fData[didx + 3] = data[sidx + 3];
          }
        }
      }
    } else if (type === 'cat') {
      // Хвост кошки (внизу слева): кончик хвоста слегка изгибается
      const tailX = Math.round(box.minX + box.bw * 0.28);
      const tailY = Math.round(box.maxY - box.bh * 0.25);
      const curl = step === 1 ? -1 : (step === 2 ? 1 : 0);
      for (let y = tailY; y <= box.maxY; y++) {
        for (let x = box.minX; x <= tailX; x++) {
          const sidx = (y * w + x) * 4;
          if (data[sidx + 3] <= 24) continue;
          const ny = y + curl + breatheY;
          if (ny >= 0 && ny < h) {
            const didx = (ny * w + x) * 4;
            fData[didx] = data[sidx];
            fData[didx + 1] = data[sidx + 1];
            fData[didx + 2] = data[sidx + 2];
            fData[didx + 3] = data[sidx + 3];
          }
        }
      }
    } else if (type === 'chicken') {
      // Клевание петуха: голова (правая верхняя часть) наклоняется ниже
      const headX = Math.round(box.minX + box.bw * 0.62);
      const headY = Math.round(box.minY + box.bh * 0.48);
      const peck = step === 1 ? 2 : (step === 2 ? 3 : 1);
      for (let y = box.minY; y <= headY; y++) {
        for (let x = headX; x <= box.maxX; x++) {
          const sidx = (y * w + x) * 4;
          if (data[sidx + 3] <= 24) continue;
          const ny = y + peck;
          if (ny < h) {
            const didx = (ny * w + x) * 4;
            fData[didx] = data[sidx];
            fData[didx + 1] = data[sidx + 1];
            fData[didx + 2] = data[sidx + 2];
            fData[didx + 3] = data[sidx + 3];
          }
        }
      }
    }

    frames.push(await sharp(fData, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer());
  }

  return makeStrip(frames, cell);
}

// 5. Анимация кузницы: мерцание горна (4 кадра, 256x256, 7 FPS)
async function animateSmithy(frame0Buf, cell = 256) {
  const { data, info } = await sharp(frame0Buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const box = await alphaBox(frame0Buf);

  const frames = [frame0Buf];
  // Горн находится в правой части кузницы (примерно 60-80% ширины, 50-75% высоты)
  const forgeMinX = Math.round(box.minX + box.bw * 0.62);
  const forgeMaxX = Math.round(box.minX + box.bw * 0.85);
  const forgeMinY = Math.round(box.minY + box.bh * 0.52);
  const forgeMaxY = Math.round(box.minY + box.bh * 0.78);

  const flickers = [1.25, 0.9, 1.35];

  for (const factor of flickers) {
    const fData = Buffer.from(data);
    for (let y = forgeMinY; y <= forgeMaxY; y++) {
      for (let x = forgeMinX; x <= forgeMaxX; x++) {
        const idx = (y * w + x) * 4;
        if (data[idx + 3] <= 24) continue;
        const [r, g, b] = [data[idx], data[idx + 1], data[idx + 2]];
        // Если это пиксели огня/углей (красно-оранжево-желтые)
        if (r > 130 && r > b + 30) {
          fData[idx] = Math.min(255, Math.round(r * factor));
          fData[idx + 1] = Math.min(255, Math.round(g * (factor * 0.95)));
          fData[idx + 2] = Math.min(255, Math.round(b * (factor * 0.8)));
        }
      }
    }
    frames.push(await sharp(fData, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer());
  }

  return makeStrip(frames, cell);
}

// ------------------- ГЛАВНЫЙ ПРОЦЕССОР -------------------

async function run() {
  console.log('=== Начинаем нарезку и анимацию новых JRPG текстур ===');
  fs.mkdirSync(OUT_PROPS, { recursive: true });

  const manifestUpdates = {};

  // 1. Предметы города из jrpg_city_props_spritesheet
  console.log('\n[1/5] Обработка городских объектов...');
  const propsSrc = SOURCES.props;
  const pCols = 3, pRows = 2;
  const pcw = Math.floor(1264 / pCols), pch = Math.floor(848 / pRows);

  const cityPropsDefs = [
    { id: 'fountain', col: 0, row: 0, name: 'Фонтан', targetH: 108, targetW: 120, anim: 'fountain', solid: true, size: 120 },
    { id: 'statue_hero', col: 1, row: 0, name: 'Статуя героя', targetH: 116, anim: null, solid: true, size: 116 },
    { id: 'torch_standing', col: 2, row: 0, name: 'Уличный факел', targetH: 114, anim: 'torch', solid: false, size: 104 },
    { id: 'well', col: 0, row: 1, name: 'Колодец', targetH: 112, anim: null, solid: true, size: 108 },
    { id: 'market_stall', col: 1, row: 1, name: 'Торговая лавка', targetH: 116, anim: null, solid: true, size: 124 },
    { id: 'notice_board', col: 2, row: 1, name: 'Доска объявлений', targetH: 100, anim: null, solid: true, size: 104 }
  ];

  for (const def of cityPropsDefs) {
    const raw = await extractRegion(propsSrc, { left: def.col * pcw, top: def.row * pch, width: pcw, height: pch });
    const cellBuf = await fitToCell(raw, { cell: 128, targetH: def.targetH, targetW: def.targetW, anchor: 'feet' });

    let finalBuf;
    if (def.anim === 'fountain') {
      finalBuf = await animateFountain(cellBuf, 128);
      manifestUpdates[def.id] = { file: `props/${def.id}.png`, frames: 4, fps: 7 };
    } else if (def.anim === 'torch') {
      finalBuf = await animateTorch(cellBuf, 128);
      manifestUpdates[def.id] = { file: `props/${def.id}.png`, frames: 4, fps: 7 };
    } else {
      finalBuf = cellBuf;
      manifestUpdates[def.id] = { file: `props/${def.id}.png` };
    }

    fs.writeFileSync(path.join(OUT_PROPS, `${def.id}.png`), finalBuf);
    console.log(`  + ${def.id}.png ${def.anim ? '(Анимирован 4 кадра)' : '(Статика)'}`);
  }

  // 2. Дома и постройки из town_buildings_sheet
  console.log('\n[2/5] Обработка зданий...');
  const bldSrc = SOURCES.buildings;
  const bcw = Math.floor(1376 / 3), bch = 768;

  const bldDefs = [
    { id: 'house_wood', col: 0, name: 'Деревянный дом', targetH: 220, targetW: 240, anim: null, solid: true, size: 210 },
    { id: 'house_stone', col: 1, name: 'Каменная таверна', targetH: 235, targetW: 240, anim: null, solid: true, size: 220 },
    { id: 'smithy', col: 2, name: 'Кузница', targetH: 220, targetW: 240, anim: 'smithy', solid: true, size: 210 }
  ];

  for (const def of bldDefs) {
    const raw = await extractRegion(bldSrc, { left: def.col * bcw, top: 0, width: bcw, height: bch });
    const cellBuf = await fitToCell(raw, { cell: 256, targetH: def.targetH, targetW: def.targetW, anchor: 'feet', padBottom: 8 });

    let finalBuf;
    if (def.anim === 'smithy') {
      finalBuf = await animateSmithy(cellBuf, 256);
      manifestUpdates[def.id] = { file: `props/${def.id}.png`, frames: 4, fps: 7, cell: 256 };
    } else {
      finalBuf = cellBuf;
      manifestUpdates[def.id] = { file: `props/${def.id}.png`, cell: 256 };
    }

    fs.writeFileSync(path.join(OUT_PROPS, `${def.id}.png`), finalBuf);
    console.log(`  + ${def.id}.png 256x256 ${def.anim ? '(Анимирован 4 кадра)' : '(Статика)'}`);
  }

  // 3. Воины из jrpg_warriors_spritesheet
  console.log('\n[3/5] Обработка воинов...');
  const warSrc = SOURCES.warriors;
  const wcw = 512, wch = 512;

  const warDefs = [
    { id: 'warrior_guard', col: 0, row: 0, name: 'Стражник с алебардой', targetH: 104, solid: true, size: 106 },
    { id: 'warrior_knight', col: 1, row: 0, name: 'Рыцарь-паладин', targetH: 102, solid: true, size: 106 },
    { id: 'warrior_archer', col: 0, row: 1, name: 'Лучник-следопыт', targetH: 100, solid: true, size: 106 },
    { id: 'warrior_mercenary', col: 1, row: 1, name: 'Наёмник с секирой', targetH: 102, solid: true, size: 106 }
  ];

  for (const def of warDefs) {
    const raw = await extractRegion(warSrc, { left: def.col * wcw, top: def.row * wch, width: wcw, height: wch });
    const cellBuf = await fitToCell(raw, { cell: 128, targetH: def.targetH, anchor: 'feet' });
    const finalBuf = await animateBreathing(cellBuf, 128);
    fs.writeFileSync(path.join(OUT_PROPS, `${def.id}.png`), finalBuf);
    manifestUpdates[def.id] = { file: `props/${def.id}.png`, frames: 2, fps: 2.5 };
    console.log(`  + ${def.id}.png (Анимирован 2 кадра дыхания)`);
  }

  // 4. NPC и торговцы из npc_merchants_spritesheet
  console.log('\n[4/5] Обработка NPC и торговцев...');
  const npcSrc = SOURCES.npcs;
  const nCols = 4, nRows = 2;
  const ncw = Math.floor(1264 / nCols), nch = Math.floor(848 / nRows);
  const effNpcH = Math.floor(nch * 0.82); // Исключаем текстовые подписи

  const npcDefs = [
    { id: 'merchant_weapon', col: 0, row: 0, name: 'Кузнец-оружейник', targetH: 102, solid: true, size: 106 },
    { id: 'merchant_potion', col: 1, row: 0, name: 'Алхимик-зельевар', targetH: 100, solid: true, size: 106 },
    { id: 'merchant_general', col: 2, row: 0, name: 'Купец редкостей', targetH: 98, solid: true, size: 106 },
    { id: 'npc_villager_f', col: 3, row: 0, name: 'Горожанка', targetH: 96, solid: true, size: 106 },
    { id: 'npc_elder', col: 0, row: 1, name: 'Старейшина Эльда', targetH: 104, solid: true, size: 106 },
    { id: 'npc_villager_m', col: 1, row: 1, name: 'Горожанин', targetH: 100, solid: true, size: 106 },
    { id: 'npc_girl', col: 2, row: 1, name: 'Девочка с цветами', targetH: 94, solid: true, size: 98 },
    { id: 'npc_maid', col: 3, row: 1, name: 'Трактирщица с хлебом', targetH: 96, solid: true, size: 106 }
  ];

  for (const def of npcDefs) {
    const raw = await extractRegion(npcSrc, { left: def.col * ncw, top: def.row * nch, width: ncw, height: effNpcH });
    const cellBuf = await fitToCell(raw, { cell: 128, targetH: def.targetH, anchor: 'feet' });
    const finalBuf = await animateBreathing(cellBuf, 128);
    fs.writeFileSync(path.join(OUT_PROPS, `${def.id}.png`), finalBuf);
    manifestUpdates[def.id] = { file: `props/${def.id}.png`, frames: 2, fps: 2.5 };
    console.log(`  + ${def.id}.png (Анимирован 2 кадра дыхания)`);
  }

  // 5. Животные из jrpg_village_animals_spritesheet
  console.log('\n[5/5] Обработка животных...');
  const animSrc = SOURCES.animals;
  const aCols = 3, aRows = 2;
  const acw = Math.floor(1264 / aCols), ach = Math.floor(848 / aRows);

  const animalDefs = [
    { id: 'animal_horse', col: 0, row: 0, name: 'Лошадь', targetH: 106, type: 'horse', solid: true, size: 116 },
    { id: 'animal_cow', col: 1, row: 0, name: 'Корова', targetH: 96, type: 'cow', solid: true, size: 112 },
    { id: 'animal_sheep', col: 2, row: 0, name: 'Овца', targetH: 82, type: 'sheep', solid: true, size: 92 },
    { id: 'animal_dog', col: 0, row: 1, name: 'Деревенский пёс', targetH: 80, type: 'dog', solid: true, size: 90 },
    { id: 'animal_cat', col: 1, row: 1, name: 'Рыжий кот', targetH: 64, type: 'cat', solid: false, size: 72 },
    { id: 'animal_chicken', col: 2, row: 1, name: 'Петух', targetH: 60, type: 'chicken', solid: false, size: 68 }
  ];

  for (const def of animalDefs) {
    const raw = await extractRegion(animSrc, { left: def.col * acw, top: def.row * ach, width: acw, height: ach });
    const cellBuf = await fitToCell(raw, { cell: 128, targetH: def.targetH, anchor: 'feet' });
    const finalBuf = await animateAnimal(cellBuf, 128, def.type);
    fs.writeFileSync(path.join(OUT_PROPS, `${def.id}.png`), finalBuf);
    manifestUpdates[def.id] = { file: `props/${def.id}.png`, frames: 4, fps: 7 };
    console.log(`  + ${def.id}.png (Анимирован 4 кадра движения)`);
  }

  console.log('\n=== Сохранение манифеста public/assets/jrpg/manifest.json ===');
  const manifestPath = path.join(ROOT, 'public/assets/jrpg/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const [id, meta] of Object.entries(manifestUpdates)) {
    manifest.props[id] = meta;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Обновлено ${Object.keys(manifestUpdates).length} записей в manifest.json`);

  return { cityPropsDefs, bldDefs, warDefs, npcDefs, animalDefs };
}

run().catch(err => {
  console.error('Ошибка обработки:', err);
  process.exit(1);
});
