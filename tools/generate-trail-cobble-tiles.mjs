import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const TILES_DIR = path.join(ROOT, 'public/assets/jrpg/tiles');

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Deterministic hash noise
function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) ^ (x * 1274126177);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x, y, scale = 16, seed = 0) {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const sCurve = t => t * t * (3 - 2 * t);
  const u = sCurve(tx), v = sCurve(ty);

  const n00 = hash(ix, iy, seed);
  const n10 = hash(ix + 1, iy, seed);
  const n01 = hash(ix, iy + 1, seed);
  const n11 = hash(ix + 1, iy + 1, seed);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

// 1. TRAIL EDGE (Край тропинки: земляная тропинка сверху, плавный край с травой и цветами снизу)
// С возможностью поворота на 90°, 180°, 270° для любых направлений!
function makeTrailEdge() {
  const S = 128;
  const buf = Buffer.alloc(S * S * 4);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (y * S + x) * 4;
      const nEarth = smoothNoise(x, y, 10, 101) * 0.6 + hash(x, y, 102) * 0.4;
      const nGrass = smoothNoise(x, y, 8, 201) * 0.7 + hash(x, y, 202) * 0.3;

      // Transition boundary around y = 64 with organic wavy edge
      const wave = Math.sin((x / S) * Math.PI * 4) * 8 + Math.cos((x / S) * Math.PI * 2) * 6;
      const boundary = 64 + wave + (smoothNoise(x, y, 12, 301) - 0.5) * 14;

      if (y < boundary - 6) {
        // Dirt trail side (warm dry earth, compacted soil, fine pebbles)
        const pebble = hash(x, y, 401) > 0.96 ? 28 : (hash(x, y, 402) > 0.94 ? -20 : 0);
        const r = clamp(Math.round(118 + nEarth * 28 + pebble), 70, 160);
        const g = clamp(Math.round(88 + nEarth * 22 + pebble * 0.8), 50, 130);
        const b = clamp(Math.round(58 + nEarth * 16 + pebble * 0.5), 30, 95);
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      } else if (y > boundary + 6) {
        // Meadow grass side (deep emerald green with clover flowers)
        const isFlower = hash(x, y, 501) > 0.985;
        if (isFlower) {
          buf[idx] = 255; buf[idx + 1] = 240; buf[idx + 2] = 140; buf[idx + 3] = 255;
        } else {
          const r = clamp(Math.round(36 + nGrass * 24), 20, 75);
          const g = clamp(Math.round(92 + nGrass * 45), 55, 145);
          const b = clamp(Math.round(32 + nGrass * 20), 18, 65);
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        }
      } else {
        // Organic transition zone: dirt with grass tufts and boundary pebbles
        const t = (y - (boundary - 6)) / 12;
        const tuft = hash(x, y, 601) > (0.8 - t * 0.5);
        if (tuft) {
          const r = clamp(Math.round(34 + nGrass * 20), 20, 70);
          const g = clamp(Math.round(88 + nGrass * 35), 50, 130);
          const b = clamp(Math.round(30 + nGrass * 16), 18, 55);
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        } else {
          const r = clamp(Math.round(95 + nEarth * 20 - t * 25), 50, 135);
          const g = clamp(Math.round(75 + nEarth * 18 - t * 15), 45, 110);
          const b = clamp(Math.round(50 + nEarth * 12 - t * 15), 25, 75);
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        }
      }
    }
  }
  return buf;
}

// 2. TRAIL TO COBBLESTONE TRANSITION (Переход с тропинки на брусчатку)
// Земляная тропинка переходит в каменную брусчатку с вмурованными в землю булыжниками
function makeTrailToCobble() {
  const S = 128;
  const buf = Buffer.alloc(S * S * 4);
  const stoneW = 20, stoneH = 14;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (y * S + x) * 4;
      const nEarth = smoothNoise(x, y, 10, 701) * 0.7 + hash(x, y, 702) * 0.3;

      // Transition curve around y = 64
      const wave = Math.sin((x / S) * Math.PI * 3) * 6;
      const boundary = 64 + wave;

      // Stone grid logic
      const row = Math.floor(y / stoneH);
      const rowOffset = (row % 2) * (stoneW / 2);
      const col = Math.floor((x + rowOffset) / stoneW);
      const lx = (x + rowOffset) % stoneW;
      const ly = y % stoneH;

      const isMortar = (lx === 0 || ly === 0);
      const stoneSeed = row * 31 + col * 17;
      const sBrightness = hash(col, row, 801);

      if (y < boundary - 12) {
        // Pure dirt trail side
        const r = clamp(Math.round(116 + nEarth * 26), 75, 155);
        const g = clamp(Math.round(86 + nEarth * 20), 55, 125);
        const b = clamp(Math.round(56 + nEarth * 15), 35, 90);
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      } else if (y > boundary + 12) {
        // Pure cobblestone side
        if (isMortar) {
          buf[idx] = 45; buf[idx + 1] = 42; buf[idx + 2] = 38; buf[idx + 3] = 255;
        } else {
          const highlight = (lx === 1 || ly === 1) ? 22 : ((lx === stoneW - 1 || ly === stoneH - 1) ? -22 : 0);
          const r = clamp(Math.round(102 + sBrightness * 35 + highlight), 60, 165);
          const g = clamp(Math.round(98 + sBrightness * 30 + highlight), 55, 155);
          const b = clamp(Math.round(94 + sBrightness * 25 + highlight), 50, 145);
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        }
      } else {
        // Blended transition: scattered stones sinking into packed dirt
        const t = (y - (boundary - 12)) / 24;
        const hasStone = hash(col, row, 901) < (t * 0.95);
        if (hasStone && !isMortar) {
          const highlight = (lx === 1 || ly === 1) ? 18 : ((lx === stoneW - 1 || ly === stoneH - 1) ? -18 : 0);
          const r = clamp(Math.round(100 + sBrightness * 30 + highlight), 60, 155);
          const g = clamp(Math.round(94 + sBrightness * 25 + highlight), 55, 145);
          const b = clamp(Math.round(88 + sBrightness * 20 + highlight), 50, 135);
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        } else {
          const r = clamp(Math.round(112 + nEarth * 24), 70, 150);
          const g = clamp(Math.round(84 + nEarth * 18), 50, 120);
          const b = clamp(Math.round(54 + nEarth * 14), 30, 85);
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
        }
      }
    }
  }
  return buf;
}

// 3. COBBLE PAVEMENT (Отдельно брусчатка — городская мостовая с рельефными булыжниками)
function makeCobblePavement() {
  const S = 128;
  const buf = Buffer.alloc(S * S * 4);
  const stoneW = 16, stoneH = 16;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (y * S + x) * 4;
      const row = Math.floor(y / stoneH);
      const rowOffset = (row % 2) * (stoneW / 2);
      const col = Math.floor((x + rowOffset) / stoneW);
      const lx = (x + rowOffset) % stoneW;
      const ly = y % stoneH;

      const isMortar = (lx === 0 || ly === 0);
      const sBrightness = hash(col, row, 1101);
      const fineNoise = hash(x, y, 1102) * 12;

      if (isMortar) {
        // Deep mortar line with dark earth / sand
        buf[idx] = 42; buf[idx + 1] = 38; buf[idx + 2] = 34; buf[idx + 3] = 255;
      } else {
        // Beveled rounded cobblestone with top-left highlight and bottom-right shadow
        const isHighlight = (lx === 1 || ly === 1);
        const isShadow = (lx === stoneW - 1 || ly === stoneH - 1);
        const bevel = isHighlight ? 26 : (isShadow ? -24 : 0);

        const r = clamp(Math.round(114 + sBrightness * 38 + bevel + fineNoise), 65, 185);
        const g = clamp(Math.round(108 + sBrightness * 32 + bevel + fineNoise), 60, 175);
        const b = clamp(Math.round(102 + sBrightness * 28 + bevel + fineNoise), 55, 165);
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      }
    }
  }
  return buf;
}

async function main() {
  console.log('=== ГЕНЕРАЦИЯ ТАЙЛОВ ТРОПИНОК И БРУСЧАТКИ ===\n');

  const trailEdge = makeTrailEdge();
  await sharp(trailEdge, { raw: { width: 128, height: 128, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(TILES_DIR, 'trail_edge.png'));
  console.log('+ trail_edge.png (Край тропинки: земля/трава) [128x128]');

  const trailToCobble = makeTrailToCobble();
  await sharp(trailToCobble, { raw: { width: 128, height: 128, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(TILES_DIR, 'trail_to_cobble.png'));
  console.log('+ trail_to_cobble.png (Переход с тропинки на брусчатку) [128x128]');

  const cobblePavement = makeCobblePavement();
  await sharp(cobblePavement, { raw: { width: 128, height: 128, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(TILES_DIR, 'cobble_pavement.png'));
  console.log('+ cobble_pavement.png (Отдельная городская брусчатка) [128x128]');

  console.log('\nВсе новые тайлы тропинок и брусчатки успешно сохранены!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
