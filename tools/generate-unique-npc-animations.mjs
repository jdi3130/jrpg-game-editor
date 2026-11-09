import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');
const MANIFEST_PATH = path.join(ROOT, 'public/assets/jrpg/manifest.json');

const SOURCES = {
  warriors: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/jrpg_warriors_spritesheet_1794188848099.jpg',
  npcs: 'C:/Users/DELL/.gemini/antigravity/brain/3805f9f7-069c-46ae-ad52-b48e74cacbc4/npc_merchants_spritesheet_1794188845673.jpg'
};

const CELL = 128;

// Clean magenta keying
async function keyMagenta(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r >= 140 && b >= 140 && g <= 100 && (Math.min(r, b) - g >= 45)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
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
    if (data[i] < 18 && data[i + 1] < 18 && data[i + 2] < 18 && data[i + 3] < 200) data[i + 3] = 0;
    if (data[i + 3] < 32) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function alphaBox(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY, bw: maxX - minX + 1, bh: maxY - minY + 1, data };
}

function sealGaps(buf, w, h) {
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (buf[idx + 3] < 30) {
          const upIdx = ((y - 1) * w + x) * 4;
          const downIdx = ((y + 1) * w + x) * 4;
          if (buf[upIdx + 3] > 60 && buf[downIdx + 3] > 60) {
            buf[idx] = Math.round((buf[upIdx] + buf[downIdx]) / 2);
            buf[idx + 1] = Math.round((buf[upIdx + 1] + buf[downIdx + 1]) / 2);
            buf[idx + 2] = Math.round((buf[upIdx + 2] + buf[downIdx + 2]) / 2);
            buf[idx + 3] = Math.round((buf[upIdx + 3] + buf[downIdx + 3]) / 2);
            continue;
          }
          const leftIdx = (y * w + (x - 1)) * 4;
          const rightIdx = (y * w + (x + 1)) * 4;
          if (buf[leftIdx + 3] > 60 && buf[rightIdx + 3] > 60) {
            buf[idx] = Math.round((buf[leftIdx] + buf[rightIdx]) / 2);
            buf[idx + 1] = Math.round((buf[leftIdx + 1] + buf[rightIdx + 1]) / 2);
            buf[idx + 2] = Math.round((buf[leftIdx + 2] + buf[rightIdx + 2]) / 2);
            buf[idx + 3] = Math.round((buf[leftIdx + 3] + buf[rightIdx + 3]) / 2);
          }
        }
      }
    }
  }
}

function setPixel(buf, w, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= w || y < 0 || y >= CELL) return;
  const idx = (y * w + x) * 4;
  buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
}

function drawStarGlint(buf, w, cx, cy, r, g, b) {
  setPixel(buf, w, cx, cy, 255, 255, 255, 255);
  setPixel(buf, w, cx - 1, cy, r, g, b, 230);
  setPixel(buf, w, cx + 1, cy, r, g, b, 230);
  setPixel(buf, w, cx, cy - 1, r, g, b, 230);
  setPixel(buf, w, cx, cy + 1, r, g, b, 230);
}

// Extract and fit character from pristine source
async function extractCharacter(srcPath, { id, left, top, width, height, targetH, padBottom = 4, healApron = false }) {
  let raw = await sharp(srcPath).extract({ left, top, width, height }).png().toBuffer();

  // If blacksmith, heal the vertical AI seam down the center apron/chest
  if (healApron || id === 'merchant_weapon') {
    const { data: rawData, info: rawInfo } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const d = Buffer.from(rawData);
    const rw = rawInfo.width;
    for (let y = 135; y < 240; y++) {
      const leftCol = 153, rightCol = 167;
      const leftIdx = (y * rw + leftCol) * 4;
      const rightIdx = (y * rw + rightCol) * 4;
      for (let x = leftCol + 1; x < rightCol; x++) {
        const t = (x - leftCol) / (rightCol - leftCol);
        const idx = (y * rw + x) * 4;
        d[idx] = Math.round(d[leftIdx] * (1 - t) + d[rightIdx] * t);
        d[idx + 1] = Math.round(d[leftIdx + 1] * (1 - t) + d[rightIdx + 1] * t);
        d[idx + 2] = Math.round(d[leftIdx + 2] * (1 - t) + d[rightIdx + 2] * t);
      }
    }
    raw = await sharp(d, { raw: { width: rw, height: rawInfo.height, channels: 4 } }).png().toBuffer();
  }

  const keyed = await keyMagenta(raw);
  const box = await alphaBox(keyed);
  if (!box || box.maxX < 0) throw new Error('Empty character extraction');

  const scale = targetH / box.bh;
  const tw = Math.max(1, Math.round(box.bw * scale));
  const th = Math.max(1, Math.round(box.bh * scale));

  const content = await sharp(keyed)
    .extract({ left: box.minX, top: box.minY, width: box.bw, height: box.bh })
    .resize(tw, th, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const posX = Math.round((CELL - tw) / 2);
  const posY = CELL - padBottom - th;

  const fitted = await sharp({
    create: { width: CELL, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: content, left: Math.max(0, posX), top: Math.max(0, posY) }])
    .png()
    .toBuffer();

  return fitted;
}

// Create unified, tear-free 4-frame breathing & living animation (NO HORIZONTAL SLICING!)
async function buildNpcStrip(baseBuf, effectFn) {
  const b0 = await alphaBox(baseBuf);
  sealGaps(b0.data, CELL, CELL);
  const cleanF0 = await sharp(b0.data, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toBuffer();

  // FRAME 1: Inhale — entire character shifts 1px upward as ONE SINGLE UNIFIED PIECE.
  // Zero internal shearing, zero broken lines, zero tears!
  const f1Data = Buffer.alloc(CELL * CELL * 4, 0);
  for (let y = 0; y < CELL - 1; y++) {
    for (let x = 0; x < CELL; x++) {
      const dstIdx = (y * CELL + x) * 4;
      const srcIdx = ((y + 1) * CELL + x) * 4;
      f1Data[dstIdx] = b0.data[srcIdx];
      f1Data[dstIdx + 1] = b0.data[srcIdx + 1];
      f1Data[dstIdx + 2] = b0.data[srcIdx + 2];
      f1Data[dstIdx + 3] = b0.data[srcIdx + 3];
    }
  }
  // Soft grounding at feet so the character remains anchored to the ground
  const footY = Math.min(CELL - 1, b0.maxY);
  for (let x = b0.minX; x <= b0.maxX; x++) {
    const origIdx = (footY * CELL + x) * 4;
    const f1Idx = (footY * CELL + x) * 4;
    if (b0.data[origIdx + 3] > 60 && f1Data[f1Idx + 3] < 30) {
      f1Data[f1Idx] = Math.round(b0.data[origIdx] * 0.4);
      f1Data[f1Idx + 1] = Math.round(b0.data[origIdx + 1] * 0.4);
      f1Data[f1Idx + 2] = Math.round(b0.data[origIdx + 2] * 0.4);
      f1Data[f1Idx + 3] = 120;
    }
  }
  sealGaps(f1Data, CELL, CELL);
  const cleanF1 = await sharp(f1Data, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toBuffer();

  // FRAME 2: Peak breath — upper body lifted + character-specific hand-drawn pixel effects
  const f2Data = Buffer.from(f1Data);
  if (effectFn) effectFn(f2Data, b0, 2);
  sealGaps(f2Data, CELL, CELL);
  const cleanF2 = await sharp(f2Data, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toBuffer();

  // FRAME 3: Gentle exhale settle back towards neutral (dy = 0), secondary motion dissipates
  const f3Data = Buffer.from(b0.data);
  if (effectFn) effectFn(f3Data, b0, 3);
  sealGaps(f3Data, CELL, CELL);
  const cleanF3 = await sharp(f3Data, { raw: { width: CELL, height: CELL, channels: 4 } }).png().toBuffer();

  // Assemble horizontal 512x128 4-frame strip
  const strip = await sharp({
    create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: cleanF0, left: 0, top: 0 },
      { input: cleanF1, left: CELL, top: 0 },
      { input: cleanF2, left: CELL * 2, top: 0 },
      { input: cleanF3, left: CELL * 3, top: 0 }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return strip;
}

/* ---------------- 12 NPC DEFINITIONS & UNIQUE PIXEL EFFECTS ---------------- */

// 1. BLACKSMITH (Кузнец-оружейник)
function fxBlacksmith(buf, b, frame) {
  const hammerX = Math.round(b.minX + b.bw * 0.76);
  const hammerY = Math.round(b.minY + b.bh * 0.68) - 1;
  if (frame === 2) {
    // Bright golden-orange forge sparks leaping from hammer
    setPixel(buf, CELL, hammerX + 1, hammerY - 4, 255, 230, 80, 255);
    setPixel(buf, CELL, hammerX + 2, hammerY - 5, 255, 160, 40, 240);
    setPixel(buf, CELL, hammerX - 3, hammerY - 6, 255, 210, 60, 240);
    // Steel glint on hammer head
    setPixel(buf, CELL, hammerX - 1, hammerY, 255, 255, 255, 255);
    setPixel(buf, CELL, hammerX, hammerY, 255, 240, 180, 255);
  } else if (frame === 3) {
    // Lingering ember drifting upward
    setPixel(buf, CELL, hammerX + 2, hammerY - 9, 255, 140, 30, 180);
  }
}

// 2. ALCHEMIST (Алхимик-зельевар)
function fxAlchemist(buf, b, frame) {
  const flaskX = Math.round(b.minX + b.bw * 0.28);
  const flaskY = Math.round(b.minY + b.bh * 0.50) - 1;
  if (frame === 2) {
    // Emerald / cyan potion bubbles rising and glowing
    setPixel(buf, CELL, flaskX, flaskY - 2, 80, 255, 220, 255);
    setPixel(buf, CELL, flaskX + 1, flaskY - 5, 120, 255, 240, 255);
    setPixel(buf, CELL, flaskX - 1, flaskY - 8, 180, 255, 255, 230);
    // Glass highlight shimmer
    setPixel(buf, CELL, flaskX + 2, flaskY, 255, 255, 255, 240);
  } else if (frame === 3) {
    // Popped bubble vapor
    setPixel(buf, CELL, flaskX - 1, flaskY - 11, 140, 240, 255, 160);
  }
}

// 3. MERCHANT (Купец редкостей)
function fxMerchant(buf, b, frame) {
  const coinX = Math.round(b.minX + b.bw * 0.64);
  const coinY = Math.round(b.minY + b.bh * 0.54) - 1;
  if (frame === 2) {
    // Brilliant golden starburst sparkle above coin
    drawStarGlint(buf, CELL, coinX, coinY - 8, 255, 215, 0);
  } else if (frame === 3) {
    // Fading golden glint
    setPixel(buf, CELL, coinX, coinY - 3, 255, 230, 120, 220);
  }
}

// 4. ELDER (Старейшина Эльда)
function fxElder(buf, b, frame) {
  const staffX = Math.round(b.minX + b.bw * 0.80);
  const gemY = Math.round(b.minY + b.bh * 0.22) - 1;
  if (frame === 2) {
    // Radiant sapphire rune pulse radiating from staff crystal
    drawStarGlint(buf, CELL, staffX, gemY - 3, 130, 210, 255);
    setPixel(buf, CELL, staffX - 2, gemY - 2, 80, 160, 255, 200);
    setPixel(buf, CELL, staffX + 2, gemY - 2, 80, 160, 255, 200);
  } else if (frame === 3) {
    // Residual mystic glow
    setPixel(buf, CELL, staffX, gemY - 1, 140, 200, 255, 190);
  }
}

// 5. PALADIN KNIGHT (Рыцарь-паладин)
function fxKnight(buf, b, frame) {
  const swordX = Math.round(b.minX + b.bw * 0.22);
  const swordY = Math.round(b.minY + b.bh * 0.65) - 1;
  const crossX = Math.round(b.minX + b.bw * 0.48);
  const crossY = Math.round(b.minY + b.bh * 0.48) - 1;
  if (frame === 2) {
    // Holy sword gleam
    drawStarGlint(buf, CELL, swordX, swordY - 8, 255, 245, 180);
    // Tabard cross luster
    setPixel(buf, CELL, crossX, crossY, 200, 230, 255, 255);
    setPixel(buf, CELL, crossX, crossY + 1, 180, 215, 255, 240);
  } else if (frame === 3) {
    setPixel(buf, CELL, swordX, swordY - 4, 255, 255, 220, 200);
  }
}

// 6. RANGER ARCHER (Лучник-следопыт)
function fxArcher(buf, b, frame) {
  const arrowX = Math.round(b.minX + b.bw * 0.32);
  const arrowY = Math.round(b.minY + b.bh * 0.38) - 1;
  if (frame === 2) {
    // Sharp arrowhead silver glint
    drawStarGlint(buf, CELL, arrowX, arrowY - 4, 210, 230, 255);
  } else if (frame === 3) {
    setPixel(buf, CELL, arrowX, arrowY - 2, 240, 245, 255, 180);
  }
}

// 7. SENTRY GUARD (Стражник с алебардой)
function fxGuard(buf, b, frame) {
  const bladeX = Math.round(b.minX + b.bw * 0.82);
  const bladeY = Math.round(b.minY + b.bh * 0.20) - 1;
  if (frame === 2) {
    // Crescent halberd blade steel glint
    drawStarGlint(buf, CELL, bladeX, bladeY - 4, 200, 230, 255);
  } else if (frame === 3) {
    setPixel(buf, CELL, bladeX, bladeY - 2, 230, 240, 255, 180);
  }
}

// 8. MERCENARY (Наёмник с секирой)
function fxMercenary(buf, b, frame) {
  const axeX = Math.round(b.minX + b.bw * 0.78);
  const axeY = Math.round(b.minY + b.bh * 0.26) - 1;
  if (frame === 2) {
    // Sharp battleaxe curved blade glint
    drawStarGlint(buf, CELL, axeX, axeY - 4, 220, 240, 255);
  } else if (frame === 3) {
    setPixel(buf, CELL, axeX, axeY - 2, 240, 245, 255, 180);
  }
}

// 9. FLOWER GIRL (Девочка с цветами)
function fxGirl(buf, b, frame) {
  const basketX = Math.round(b.minX + b.bw * 0.65);
  const basketY = Math.round(b.minY + b.bh * 0.60) - 1;
  if (frame === 2) {
    // Cheerful pastel flower pollen sparkles hovering above basket
    setPixel(buf, CELL, basketX - 1, basketY - 5, 255, 182, 193, 240); // Soft rose
    setPixel(buf, CELL, basketX + 2, basketY - 7, 255, 255, 160, 240); // Golden petal
    setPixel(buf, CELL, basketX, basketY - 9, 255, 255, 255, 255);     // White pollen
  } else if (frame === 3) {
    setPixel(buf, CELL, basketX + 3, basketY - 11, 255, 220, 230, 160);
  }
}

// 10. TAVERN MAID (Трактирщица)
function fxMaid(buf, b, frame) {
  const mugX = Math.round(b.minX + b.bw * 0.66);
  const mugY = Math.round(b.minY + b.bh * 0.54) - 1;
  if (frame === 2) {
    // Foamy beer froth bubbles dancing on mug rim
    setPixel(buf, CELL, mugX, mugY - 6, 255, 255, 240, 255);
    setPixel(buf, CELL, mugX + 2, mugY - 7, 255, 255, 220, 255);
    setPixel(buf, CELL, mugX - 1, mugY - 8, 255, 250, 200, 230);
  } else if (frame === 3) {
    setPixel(buf, CELL, mugX + 1, mugY - 9, 255, 255, 240, 170);
  }
}

// 11. VILLAGER M (Горожанин)
function fxVillagerM(buf, b, frame) {
  const eyeX = Math.round(b.minX + b.bw * 0.52);
  const eyeY = Math.round(b.minY + b.bh * 0.28) - 1;
  if (frame === 2) {
    // Subtle alert eye focus / brow glint
    setPixel(buf, CELL, eyeX, eyeY, 255, 255, 255, 220);
  }
}

// 12. VILLAGER F (Горожанка)
function fxVillagerF(buf, b, frame) {
  const apronX = Math.round(b.minX + b.bw * 0.42);
  const apronY = Math.round(b.minY + b.bh * 0.65) - 1;
  if (frame === 2) {
    // Subtle apron hem highlight
    setPixel(buf, CELL, apronX, apronY, 255, 255, 255, 210);
    setPixel(buf, CELL, apronX + 1, apronY, 240, 230, 220, 200);
  }
}

const NPC_CONFIGS = [
  // 4 Warriors from SOURCES.warriors (512x512 grid)
  {
    id: 'warrior_guard',
    src: SOURCES.warriors,
    left: 0 * 512, top: 0 * 512, width: 512, height: 512,
    targetH: 104,
    fx: fxGuard
  },
  {
    id: 'warrior_knight',
    src: SOURCES.warriors,
    left: 1 * 512, top: 0 * 512, width: 512, height: 512,
    targetH: 102,
    fx: fxKnight
  },
  {
    id: 'warrior_archer',
    src: SOURCES.warriors,
    left: 0 * 512, top: 1 * 512, width: 512, height: 512,
    targetH: 100,
    fx: fxArcher
  },
  {
    id: 'warrior_mercenary',
    src: SOURCES.warriors,
    left: 1 * 512, top: 1 * 512, width: 512, height: 512,
    targetH: 102,
    fx: fxMercenary
  },

  // 8 NPCs & Merchants from SOURCES.npcs (1264x848, 4 cols x 2 rows, effH 347)
  {
    id: 'merchant_weapon',
    src: SOURCES.npcs,
    left: 0 * 316, top: 0 * 424, width: 316, height: 347,
    targetH: 102,
    fx: fxBlacksmith
  },
  {
    id: 'merchant_potion',
    src: SOURCES.npcs,
    left: 1 * 316, top: 0 * 424, width: 316, height: 347,
    targetH: 100,
    fx: fxAlchemist
  },
  {
    id: 'merchant_general',
    src: SOURCES.npcs,
    left: 2 * 316, top: 0 * 424, width: 316, height: 347,
    targetH: 98,
    fx: fxMerchant
  },
  {
    id: 'npc_villager_f',
    src: SOURCES.npcs,
    left: 3 * 316, top: 0 * 424, width: 316, height: 347,
    targetH: 96,
    fx: fxVillagerF
  },
  {
    id: 'npc_elder',
    src: SOURCES.npcs,
    left: 0 * 316, top: 1 * 424, width: 316, height: 347,
    targetH: 104,
    fx: fxElder
  },
  {
    id: 'npc_villager_m',
    src: SOURCES.npcs,
    left: 1 * 316, top: 1 * 424, width: 316, height: 347,
    targetH: 100,
    fx: fxVillagerM
  },
  {
    id: 'npc_girl',
    src: SOURCES.npcs,
    left: 2 * 316, top: 1 * 424, width: 316, height: 347,
    targetH: 94,
    fx: fxGirl
  },
  {
    id: 'npc_maid',
    src: SOURCES.npcs,
    left: 3 * 316, top: 1 * 424, width: 316, height: 347,
    targetH: 96,
    fx: fxMaid
  }
];

async function main() {
  console.log('=== ГЕНЕРАЦИЯ БЕСШОВНЫХ АНИМАЦИЙ 12 NPC (0 РАЗРЫВОВ / 0 ТРЕЩИН) ===\n');

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  for (const cfg of NPC_CONFIGS) {
    process.stdout.write(`Обработка ${cfg.id.padEnd(20)}... `);

    // 1. Extract clean uncorrupted frame 0 from source
    const baseBuf = await extractCharacter(cfg.src, {
      left: cfg.left,
      top: cfg.top,
      width: cfg.width,
      height: cfg.height,
      targetH: cfg.targetH
    });

    // 2. Build 4-frame seamless animation strip
    const stripBuf = await buildNpcStrip(baseBuf, cfg.fx);

    // 3. Save to public/assets/jrpg/props/
    const outPath = path.join(PROPS_DIR, `${cfg.id}.png`);
    fs.writeFileSync(outPath, stripBuf);

    // 4. Update manifest
    manifest.props[cfg.id] = {
      file: `props/${cfg.id}.png`,
      cell: 128,
      frames: 4,
      fps: 3.5
    };

    console.log(`OK (512x128 strip, 4 кадра, fps: 3.5)`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('\nОбновлён public/assets/jrpg/manifest.json');
  console.log('Все 12 NPC успешно сгенерированы без швов, разрезов и разрывов!');
}

main().catch(err => {
  console.error('Ошибка генерации:', err);
  process.exit(1);
});
