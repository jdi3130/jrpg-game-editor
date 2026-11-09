import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PROPS = path.join(ROOT, 'public/assets/jrpg/props');
const OUT_TILES = path.join(ROOT, 'public/assets/jrpg/tiles');

const BRAIN_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e';

const SOURCES = {
  dungeon: path.join(BRAIN_DIR, 'dungeon_crypt_props_sheet_1794191480499.jpg'),
  infernal: path.join(BRAIN_DIR, 'infernal_cavern_props_spritesheet_1794191524416.jpg'),
  forest: path.join(BRAIN_DIR, 'dark_forest_camp_props_sheet_1794191485236.jpg'),
  tiles: path.join(BRAIN_DIR, 'dark_fantasy_floor_tiles_1794191542145.jpg')
};

// Функция кеирования мадженты (#ff00ff) с деспиллом
async function keyMagenta(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Чистая маджента
    if (r >= 140 && b >= 140 && g <= 105 && (Math.min(r, b) - g >= 40)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    // Граница / деспилл
    if (r > 110 && b > 110 && Math.min(r, b) - g > 22) {
      const diff = Math.min(r, b) - g;
      if (diff > 38) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      } else {
        const neutral = data[i + 1];
        data[i] = Math.round(data[i] - (data[i] - neutral) * 0.85);
        data[i + 2] = Math.round(data[i + 2] - (data[i + 2] - neutral) * 0.85);
        data[i + 3] = Math.max(0, Math.round(data[i + 3] * (1 - (diff - 22) / 16)));
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

async function extractRegion(filePath, { left, top, width, height }) {
  const raw = await sharp(filePath).extract({ left, top, width, height }).png().toBuffer();
  return keyMagenta(raw);
}

async function fitToCell(buffer, { cell = 128, targetH, targetW, anchor = 'feet', padBottom = 4 }) {
  const box = await alphaBox(buffer);
  if (!box) throw new Error('Empty alpha box');

  let scale = 1;
  if (targetH && targetW) scale = Math.min(targetW / box.bw, targetH / box.bh);
  else if (targetH) scale = targetH / box.bh;
  else if (targetW) scale = targetW / box.bw;
  else scale = Math.min((cell - 10) / box.bw, (cell - 10) / box.bh);

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
  let top;
  if (anchor === 'feet') top = Math.max(2, cell - th - padBottom);
  else if (anchor === 'center') top = Math.round((cell - th) / 2);
  else top = 4;

  const bg = await sharp({
    create: { width: cell, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).png().toBuffer();

  return sharp(bg).composite([{ input: content, left, top }]).png().toBuffer();
}

// Создание 4-кадровой анимации огня для чаши
async function makeBrazierAnim(baseCell, cell = 128) {
  const { data, info } = await sharp(baseCell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frames = [];

  for (let f = 0; f < 4; f++) {
    const fd = Buffer.from(data);
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        if (fd[idx + 3] === 0) continue;
        // Верхняя часть - огонь (y < 65)
        if (y < 65) {
          const shift = Math.sin((y * 0.25) + f * 1.5) * 1.5;
          const bright = 1 + Math.sin(f * 1.57 + x * 0.1) * 0.22;
          fd[idx] = Math.min(255, Math.round(fd[idx] * bright));
          fd[idx + 1] = Math.min(255, Math.round(fd[idx + 1] * (bright * 1.05)));
        }
      }
    }
    const frameBuf = await sharp(fd, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();
    frames.push(frameBuf);
  }

  // Горизонтальный стрип 4 * cell x cell
  const strip = await sharp({
    create: { width: cell * 4, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((buf, i) => ({ input: buf, left: i * cell, top: 0 }))).png().toBuffer();

  return strip;
}

// Создание 4-кадровой анимации парящего фиолетового кристалла
async function makeVoidCrystalAnim(baseCell, cell = 128) {
  const frames = [];
  const yOffsets = [0, -2, -3, -1];
  for (let f = 0; f < 4; f++) {
    const dy = yOffsets[f];
    const { data, info } = await sharp(baseCell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const pulse = 1 + Math.sin(f * 1.57) * 0.2;
        data[i] = Math.min(255, Math.round(data[i] * pulse)); // R
        data[i + 2] = Math.min(255, Math.round(data[i + 2] * (pulse * 1.15))); // B
      }
    }
    const colored = await sharp(data, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();
    const frameBg = await sharp({
      create: { width: cell, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).composite([{ input: colored, left: 0, top: dy }]).png().toBuffer();
    frames.push(frameBg);
  }

  return sharp({
    create: { width: cell * 4, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((buf, i) => ({ input: buf, left: i * cell, top: 0 }))).png().toBuffer();
}

// Создание 4-кадровой анимации пульсации лавовой расщелины
async function makeLavaFissureAnim(baseCell, cell = 128) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { data, info } = await sharp(baseCell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && data[i] > 140 && data[i + 1] < 120) {
        const pulse = 1 + Math.sin(f * 1.57 + i * 0.005) * 0.25;
        data[i] = Math.min(255, Math.round(data[i] * pulse));
        data[i + 1] = Math.min(255, Math.round(data[i + 1] * pulse));
      }
    }
    const frameBuf = await sharp(data, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();
    frames.push(frameBuf);
  }

  return sharp({
    create: { width: cell * 4, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((buf, i) => ({ input: buf, left: i * cell, top: 0 }))).png().toBuffer();
}

// Создание 4-кадровой анимации рунного святилища (Shrine)
async function makeShrineAnim(baseCell, cell = 128) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const { data, info } = await sharp(baseCell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && (data[i + 2] > 140 || data[i + 1] > 140)) {
        const pulse = 1 + Math.sin(f * 1.57) * 0.28;
        data[i + 1] = Math.min(255, Math.round(data[i + 1] * pulse));
        data[i + 2] = Math.min(255, Math.round(data[i + 2] * (pulse * 1.1)));
      }
    }
    const frameBuf = await sharp(data, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();
    frames.push(frameBuf);
  }

  return sharp({
    create: { width: cell * 4, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((buf, i) => ({ input: buf, left: i * cell, top: 0 }))).png().toBuffer();
}

// 2 кадра для мерцающих глаз оскверненного дерева
async function makeCorruptTreeAnim(baseCell, cell = 128) {
  const frames = [baseCell];
  const { data, info } = await sharp(baseCell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0 && data[i] > 160 && data[i + 1] < 60) {
      data[i] = Math.min(255, Math.round(data[i] * 1.35)); // яркие злые глаза
    }
  }
  const f2 = await sharp(data, { raw: { width: cell, height: cell, channels: 4 } }).png().toBuffer();
  frames.push(f2);

  return sharp({
    create: { width: cell * 2, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames.map((buf, i) => ({ input: buf, left: i * cell, top: 0 }))).png().toBuffer();
}

async function run() {
  console.log('--- Processing Combat Assets ---');
  fs.mkdirSync(OUT_PROPS, { recursive: true });
  fs.mkdirSync(OUT_TILES, { recursive: true });

  // 1. Dungeon / Crypt props (1264x848, 3x2)
  console.log('1. Dungeon / Crypt Props...');
  const dw = Math.floor(1264 / 3);
  const dh = Math.floor(848 / 2);

  const dungeonDefs = [
    { name: 'sarcophagus', col: 0, row: 0, targetH: 92, solid: true },
    { name: 'altar_blood', col: 1, row: 0, targetH: 100, solid: true },
    { name: 'skull_pile', col: 2, row: 0, targetH: 72, solid: false },
    { name: 'iron_cage', col: 0, row: 1, targetH: 116, solid: true },
    { name: 'dungeon_gate', col: 1, row: 1, targetH: 116, solid: true },
    { name: 'crypt_tomb', col: 2, row: 1, targetH: 118, solid: true }
  ];

  for (const def of dungeonDefs) {
    const raw = await extractRegion(SOURCES.dungeon, {
      left: def.col * dw,
      top: def.row * dh,
      width: dw,
      height: dh
    });
    const fitted = await fitToCell(raw, { cell: 128, targetH: def.targetH });
    await sharp(fitted).toFile(path.join(OUT_PROPS, `${def.name}.png`));
    console.log(`  + props/${def.name}.png`);
  }

  // 2. Infernal Cavern props (1264x848, 3x2)
  console.log('2. Infernal Cavern Props...');
  const iw = Math.floor(1264 / 3);
  const ih = Math.floor(848 / 2);

  // stalagmites (static)
  const stalagRaw = await extractRegion(SOURCES.infernal, { left: 0, top: 0, width: iw, height: ih });
  const stalagFit = await fitToCell(stalagRaw, { cell: 128, targetH: 98 });
  await sharp(stalagFit).toFile(path.join(OUT_PROPS, 'stalagmite.png'));
  console.log('  + props/stalagmite.png');

  // brazier_fire (4 frames animated!)
  const brazRaw = await extractRegion(SOURCES.infernal, { left: iw, top: 0, width: iw, height: ih });
  const brazFit = await fitToCell(brazRaw, { cell: 128, targetH: 104 });
  const brazAnim = await makeBrazierAnim(brazFit, 128);
  await sharp(brazAnim).toFile(path.join(OUT_PROPS, 'brazier_fire.png'));
  console.log('  + props/brazier_fire.png (animated, 4 frames)');

  // dark_crystal (4 frames animated!)
  const crysRaw = await extractRegion(SOURCES.infernal, { left: iw * 2, top: 0, width: iw, height: ih });
  const crysFit = await fitToCell(crysRaw, { cell: 128, targetH: 108 });
  const crysAnim = await makeVoidCrystalAnim(crysFit, 128);
  await sharp(crysAnim).toFile(path.join(OUT_PROPS, 'dark_crystal.png'));
  console.log('  + props/dark_crystal.png (animated, 4 frames)');

  // lava_fissure (4 frames animated!)
  const lavaRaw = await extractRegion(SOURCES.infernal, { left: 0, top: ih, width: iw, height: ih });
  const lavaFit = await fitToCell(lavaRaw, { cell: 128, targetH: 84 });
  const lavaAnim = await makeLavaFissureAnim(lavaFit, 128);
  await sharp(lavaAnim).toFile(path.join(OUT_PROPS, 'lava_fissure.png'));
  console.log('  + props/lava_fissure.png (animated, 4 frames)');

  // pentagram (static floor overlay)
  const pentRaw = await extractRegion(SOURCES.infernal, { left: iw, top: ih, width: iw, height: ih });
  const pentFit = await fitToCell(pentRaw, { cell: 128, targetH: 104, anchor: 'center' });
  await sharp(pentFit).toFile(path.join(OUT_PROPS, 'pentagram.png'));
  console.log('  + props/pentagram.png');

  // bone_totem (static)
  const totemRaw = await extractRegion(SOURCES.infernal, { left: iw * 2, top: ih, width: iw, height: ih });
  const totemFit = await fitToCell(totemRaw, { cell: 128, targetH: 116 });
  await sharp(totemFit).toFile(path.join(OUT_PROPS, 'bone_totem.png'));
  console.log('  + props/bone_totem.png');

  // 3. Dark Forest props (1024x1024, 2x2)
  console.log('3. Dark Forest & Camp Props...');
  const fw = 512, fh = 512;

  // corrupt_tree (2 frames animated!)
  const treeRaw = await extractRegion(SOURCES.forest, { left: 0, top: 0, width: fw, height: fh });
  const treeFit = await fitToCell(treeRaw, { cell: 128, targetH: 122 });
  const treeAnim = await makeCorruptTreeAnim(treeFit, 128);
  await sharp(treeAnim).toFile(path.join(OUT_PROPS, 'corrupt_tree.png'));
  console.log('  + props/corrupt_tree.png (animated, 2 frames)');

  // goblin_tent (static)
  const tentRaw = await extractRegion(SOURCES.forest, { left: fw, top: 0, width: fw, height: fh });
  const tentFit = await fitToCell(tentRaw, { cell: 128, targetH: 112 });
  await sharp(tentFit).toFile(path.join(OUT_PROPS, 'goblin_tent.png'));
  console.log('  + props/goblin_tent.png');

  // broken_wagon (static)
  const wagonRaw = await extractRegion(SOURCES.forest, { left: 0, top: fh, width: fw, height: fh });
  const wagonFit = await fitToCell(wagonRaw, { cell: 128, targetH: 98 });
  await sharp(wagonFit).toFile(path.join(OUT_PROPS, 'broken_wagon.png'));
  console.log('  + props/broken_wagon.png');

  // ancient_shrine (4 frames animated!)
  const shrineRaw = await extractRegion(SOURCES.forest, { left: fw, top: fh, width: fw, height: fh });
  const shrineFit = await fitToCell(shrineRaw, { cell: 128, targetH: 114 });
  const shrineAnim = await makeShrineAnim(shrineFit, 128);
  await sharp(shrineAnim).toFile(path.join(OUT_PROPS, 'ancient_shrine.png'));
  console.log('  + props/ancient_shrine.png (animated, 4 frames)');

  // 4. Floor Tiles (1024x1024, 2x2 -> 4 tiles 256x256)
  console.log('4. Combat Floor Tiles (256x256)...');
  const tw = 512, th = 512;
  const tileDefs = [
    { name: 'crypt_tiles', left: 0, top: 0 },
    { name: 'lava_stone', left: tw, top: 0 },
    { name: 'swamp_mud', left: 0, top: th },
    { name: 'blood_stone', left: tw, top: th }
  ];

  for (const t of tileDefs) {
    const raw = await sharp(SOURCES.tiles).extract({ left: t.left, top: t.top, width: tw, height: th }).png().toBuffer();
    const keyed = await keyMagenta(raw);
    const box = await alphaBox(keyed);
    // Извлекаем квадратную область внутри тайла и масштабируем до 256x256
    let patch;
    if (box && box.bw > 100 && box.bh > 100) {
      const pad = 12;
      const cropW = Math.max(50, box.bw - pad * 2);
      const cropH = Math.max(50, box.bh - pad * 2);
      patch = await sharp(keyed)
        .extract({ left: box.minX + pad, top: box.minY + pad, width: cropW, height: cropH })
        .resize(256, 256, { kernel: 'lanczos3' })
        .png()
        .toBuffer();
    } else {
      patch = await sharp(raw).resize(256, 256).png().toBuffer();
    }
    await sharp(patch).toFile(path.join(OUT_TILES, `${t.name}.png`));
    console.log(`  + tiles/${t.name}.png (256x256)`);
  }

  console.log('--- All combat assets processed successfully! ---');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

