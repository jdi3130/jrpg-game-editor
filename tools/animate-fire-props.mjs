import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');

const FIRE_PROPS = [
  { id: 'campfire', type: 'fire', cell: 128 },
  { id: 'campfire_pot', type: 'fire_pot', cell: 128 },
  { id: 'campfire_ashes', type: 'embers', cell: 128 },
  { id: 'campfire_beacon', type: 'big_fire', cell: 128 },
  { id: 'campfire_ritual', type: 'ritual', cell: 128 },
  { id: 'campfire_stones', type: 'fire', cell: 128 },
  { id: 'prop_candles', type: 'candles', cell: 128 }
];

function isFlamePixel(r, g, b, a, type) {
  if (a < 20) return false;
  if (type === 'ritual') {
    return (b > 110 && g > 80 && b >= r * 0.9) || (b > 170 && g > 140);
  }
  if (type === 'embers') {
    return (r > 130 && r > b * 1.4 && (g > 30 || r > 180));
  }
  return (r > 140 && g > 50 && r > b * 1.25) || (r > 210 && g > 160 && b < 180);
}

// Seal any interior transparent cracks or holes
function sealInteriorGaps(buf, w, h) {
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (buf[idx + 3] < 30) {
          // Check vertical neighbors
          const upIdx = ((y - 1) * w + x) * 4;
          const downIdx = ((y + 1) * w + x) * 4;
          if (buf[upIdx + 3] > 60 && buf[downIdx + 3] > 60) {
            buf[idx] = Math.round((buf[upIdx] + buf[downIdx]) / 2);
            buf[idx + 1] = Math.round((buf[upIdx + 1] + buf[downIdx + 1]) / 2);
            buf[idx + 2] = Math.round((buf[upIdx + 2] + buf[downIdx + 2]) / 2);
            buf[idx + 3] = Math.round((buf[upIdx + 3] + buf[downIdx + 3]) / 2);
            continue;
          }
          // Check horizontal neighbors
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

async function animateFireProp(def) {
  const file = path.join(PROPS_DIR, `${def.id}.png`);
  if (!fs.existsSync(file)) return;

  // Extract base frame 0 (128x128)
  const baseBuf = await sharp(file).extract({ left: 0, top: 0, width: def.cell, height: def.cell }).png().toBuffer();
  const { data, info } = await sharp(baseBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // Find bounding box of flame
  let minFx = w, maxFx = -1, minFy = h, maxFy = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (isFlamePixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3], def.type)) {
        if (x < minFx) minFx = x;
        if (x > maxFx) maxFx = x;
        if (y < minFy) minFy = y;
        if (y > maxFy) maxFy = y;
      }
    }
  }

  if (maxFx < 0 && def.type === 'embers') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 20) {
          if (x < minFx) minFx = x;
          if (x > maxFx) maxFx = x;
          if (y < minFy) minFy = y;
          if (y > maxFy) maxFy = y;
        }
      }
    }
  }

  const flameHeight = Math.max(1, maxFy - minFy + 1);
  const flameCenter = (minFx + maxFx) / 2;

  const frames = [];

  for (let f = 0; f < 4; f++) {
    if (f === 0) {
      frames.push(baseBuf);
      continue;
    }

    // ALWAYS start with a full copy of base data -> ZERO GAPS / HOLES!
    const frameData = Buffer.from(data);

    // Apply backward sampling for flame deformation to guarantee 100% solid pixels
    for (let y = Math.max(0, minFy - 4); y <= maxFy; y++) {
      for (let x = Math.max(0, minFx - 4); x <= Math.min(w - 1, maxFx + 4); x++) {
        const destIdx = (y * w + x) * 4;
        const normY = Math.max(0, Math.min(1, (maxFy - y) / flameHeight));

        let srcDx = 0;
        let srcDy = 0;

        if (f === 1) {
          // Frame 1: tongues sway left
          srcDx = Math.round(Math.sin(normY * Math.PI) * 1.5);
          srcDy = Math.round(normY * 1.8);
        } else if (f === 2) {
          // Frame 2: tongues sway right
          srcDx = -Math.round(Math.sin(normY * Math.PI * 1.2) * 1.5);
          srcDy = Math.round(normY * 2.2);
        } else if (f === 3) {
          // Frame 3: settle toward center
          srcDx = -Math.round(Math.sin(normY * Math.PI * 0.8) * 0.8);
          srcDy = Math.round(normY * 1.0);
        }

        const sx = Math.max(0, Math.min(w - 1, x + srcDx));
        const sy = Math.max(0, Math.min(h - 1, y + srcDy));
        const sIdx = (sy * w + sx) * 4;

        if (data[sIdx + 3] > 20 && isFlamePixel(data[sIdx], data[sIdx + 1], data[sIdx + 2], data[sIdx + 3], def.type)) {
          const pulse = 1.0 + Math.sin(f * 1.57 + x * 0.2) * 0.12;
          let r = data[sIdx], g = data[sIdx + 1], b = data[sIdx + 2];
          if (def.type === 'ritual') {
            b = Math.min(255, Math.round(b * pulse));
            g = Math.min(255, Math.round(g * pulse));
          } else {
            r = Math.min(255, Math.round(r * pulse));
            g = Math.min(255, Math.round(g * pulse));
          }
          frameData[destIdx] = r;
          frameData[destIdx + 1] = g;
          frameData[destIdx + 2] = b;
          frameData[destIdx + 3] = data[sIdx + 3];
        }
      }
    }

    // Campfire ashes smoldering veins
    if (def.type === 'embers') {
      const emberPulse = 0.75 + Math.sin(f * Math.PI / 2) * 0.25;
      for (let ey = minFy + 4; ey <= maxFy - 4; ey += 2) {
        for (let ex = minFx + 8; ex <= maxFx - 8; ex += 2) {
          const eidx = (ey * w + ex) * 4;
          if (data[eidx + 3] > 20 && ((ex * 3 + ey * 7) % 5 === 0)) {
            frameData[eidx] = Math.min(255, Math.round(230 * emberPulse));
            frameData[eidx + 1] = Math.min(255, Math.round(90 * emberPulse));
            frameData[eidx + 2] = 20;
            frameData[eidx + 3] = 240;
          }
        }
      }
    }

    // Seal any possible interior gaps
    sealInteriorGaps(frameData, w, h);

    // Add clean single-pixel sparks at top
    if (def.type !== 'candles' && def.type !== 'embers') {
      const count = def.type === 'big_fire' ? 4 : 2;
      for (let s = 0; s < count; s++) {
        const seed = s * 7.13 + f * 3.7;
        const sparkX = Math.round(flameCenter + Math.sin(seed) * (flameHeight * 0.3));
        const sparkY = Math.round(minFy - ((f + s) % 3) * 3 - 2);
        if (sparkX >= 0 && sparkX < w && sparkY >= 0 && sparkY < h) {
          const spIdx = (sparkY * w + sparkX) * 4;
          if (def.type === 'ritual') {
            frameData[spIdx] = 180; frameData[spIdx + 1] = 240; frameData[spIdx + 2] = 255; frameData[spIdx + 3] = 230;
          } else {
            frameData[spIdx] = 255; frameData[spIdx + 1] = 220; frameData[spIdx + 2] = 80; frameData[spIdx + 3] = 240;
          }
        }
      }
    }

    const framePng = await sharp(frameData, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    frames.push(framePng);
  }

  // Composite 4 frames horizontally
  const sheet = await sharp({
    create: {
      width: w * 4,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite([
    { input: frames[0], left: 0, top: 0 },
    { input: frames[1], left: w, top: 0 },
    { input: frames[2], left: w * 2, top: 0 },
    { input: frames[3], left: w * 3, top: 0 }
  ]).png().toBuffer();

  fs.writeFileSync(file, sheet);
  console.log(`  + [FIRE 100% SOLID] ${def.id}.png -> ${w * 4}x${h}`);
}

async function run() {
  console.log('Generating tear-free, 100% solid fire animations...');
  for (const p of FIRE_PROPS) {
    await animateFireProp(p);
  }
  console.log('Fire animations done.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
