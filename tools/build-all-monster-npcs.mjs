import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');
const ENEMIES_DIR = path.join(ROOT, 'public/assets/jrpg/enemies');
const MANIFEST_PATH = path.join(ROOT, 'public/assets/jrpg/manifest.json');

const CELL = 128;

function sealGaps(buf, w, h) {
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (buf[idx + 3] < 30) {
          const up = ((y - 1) * w + x) * 4;
          const dn = ((y + 1) * w + x) * 4;
          if (buf[up + 3] > 60 && buf[dn + 3] > 60) {
            buf[idx] = Math.round((buf[up] + buf[dn]) / 2);
            buf[idx + 1] = Math.round((buf[up + 1] + buf[dn + 1]) / 2);
            buf[idx + 2] = Math.round((buf[up + 2] + buf[dn + 2]) / 2);
            buf[idx + 3] = Math.round((buf[up + 3] + buf[dn + 3]) / 2);
            continue;
          }
          const lf = (y * w + (x - 1)) * 4;
          const rt = (y * w + (x + 1)) * 4;
          if (buf[lf + 3] > 60 && buf[rt + 3] > 60) {
            buf[idx] = Math.round((buf[lf] + buf[rt]) / 2);
            buf[idx + 1] = Math.round((buf[lf + 1] + buf[rt + 1]) / 2);
            buf[idx + 2] = Math.round((buf[lf + 2] + buf[rt + 2]) / 2);
            buf[idx + 3] = Math.round((buf[lf + 3] + buf[rt + 3]) / 2);
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

// 1. Process 4 existing walking enemies: Skeleton, Goblin, Cultist, Demon
async function processEnemyWalk(sourceName, destName, effectFn) {
  const p = path.join(ENEMIES_DIR, `${sourceName}.png`);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const frames = [];

  for (let f = 0; f < 4; f++) {
    const fData = Buffer.alloc(CELL * CELL * 4);
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const srcIdx = (y * w + (f * CELL + x)) * 4;
        const dstIdx = (y * CELL + x) * 4;
        fData[dstIdx] = data[srcIdx];
        fData[dstIdx + 1] = data[srcIdx + 1];
        fData[dstIdx + 2] = data[srcIdx + 2];
        fData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    sealGaps(fData, CELL, CELL);
    if (effectFn) effectFn(fData, f);
    frames.push(fData);
  }

  const outBuf = await sharp({
    create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(frames.map((buf, i) => ({
      input: buf,
      raw: { width: CELL, height: CELL, channels: 4 },
      left: i * CELL,
      top: 0
    })))
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PROPS_DIR, `${destName}.png`), outBuf);
  console.log(`+ ${destName}.png (512x128, 4 frames, sealed & enhanced)`);
}

// 2. Living Gargoyle from prop_gargoyle.png
async function buildGargoyle() {
  const p = path.join(PROPS_DIR, 'prop_gargoyle.png');
  const { data } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  sealGaps(data, CELL, CELL);

  // Unified whole-body stone animation (zero shearing, zero tears!)
  const frames = [];

  // Frame 0: Solid resting stone pose
  const f0 = Buffer.from(data);
  frames.push(f0);

  // Frame 1: Inhale / wing & body rise 1px as a unified entity
  const f1 = Buffer.alloc(CELL * CELL * 4, 0);
  for (let y = 0; y < CELL - 1; y++) {
    for (let x = 0; x < CELL; x++) {
      const dstIdx = (y * CELL + x) * 4;
      const srcIdx = ((y + 1) * CELL + x) * 4;
      f1[dstIdx] = data[srcIdx];
      f1[dstIdx + 1] = data[srcIdx + 1];
      f1[dstIdx + 2] = data[srcIdx + 2];
      f1[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  // Soft red eye awakening
  setPixel(f1, CELL, 60, 25, 180, 40, 40, 240);
  setPixel(f1, CELL, 68, 25, 180, 40, 40, 240);
  sealGaps(f1, CELL, CELL);
  frames.push(f1);

  // Frame 2: Peak breath! Demonic ruby glowing eyes
  const f2 = Buffer.from(f1);
  setPixel(f2, CELL, 60, 25, 255, 30, 30, 255);
  setPixel(f2, CELL, 61, 25, 255, 120, 120, 255);
  setPixel(f2, CELL, 68, 25, 255, 30, 30, 255);
  setPixel(f2, CELL, 69, 25, 255, 120, 120, 255);
  setPixel(f2, CELL, 59, 25, 220, 20, 20, 200);
  setPixel(f2, CELL, 70, 25, 220, 20, 20, 200);
  sealGaps(f2, CELL, CELL);
  frames.push(f2);

  // Frame 3: Exhale settle
  const f3 = Buffer.from(data);
  setPixel(f3, CELL, 60, 27, 160, 30, 30, 200);
  setPixel(f3, CELL, 68, 27, 160, 30, 30, 200);
  sealGaps(f3, CELL, CELL);
  frames.push(f3);

  const outBuf = await sharp({
    create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(frames.map((buf, i) => ({
      input: buf,
      raw: { width: CELL, height: CELL, channels: 4 },
      left: i * CELL,
      top: 0
    })))
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PROPS_DIR, 'enemy_gargoyle.png'), outBuf);
  console.log('+ enemy_gargoyle.png (512x128, 4 frames, living stone gargoyle)');
}

// 3. Toxic Slime (Pixel Art)
function buildSlime() {
  function createSlimeFrame(squashX, squashY, bubbleY) {
    const buf = Buffer.alloc(CELL * CELL * 4, 0);
    const cx = 64;
    const cy = 96 + squashY;
    const rx = 27 + squashX;
    const ry = 22 - squashY;

    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const dx = (x - cx) / rx;
        const topTaper = y < cy ? 1 + (cy - y) / ry * 0.42 : 1;
        const dy = (y - cy) / ry;
        const dist = (dx * topTaper) * (dx * topTaper) + dy * dy;

        if (dist <= 1.0) {
          const idx = (y * CELL + x) * 4;
          if (dist > 0.84) {
            buf[idx] = 10; buf[idx + 1] = 48; buf[idx + 2] = 20; buf[idx + 3] = 255;
          } else {
            const relY = (y - (cy - ry)) / (ry * 2);
            buf[idx] = Math.round(30 + relY * 10);
            buf[idx + 1] = Math.round(215 - relY * 95);
            buf[idx + 2] = Math.round(85 - relY * 40);
            buf[idx + 3] = 245;

            // Glossy highlight
            if (x < cx - 4 && y < cy - 6 && dist < 0.62) {
              buf[idx] = 180; buf[idx + 1] = 255; buf[idx + 2] = 200; buf[idx + 3] = 255;
            }
            if (x >= cx - 13 && x <= cx - 7 && y >= cy - 15 && y <= cy - 12) {
              buf[idx] = 255; buf[idx + 1] = 255; buf[idx + 2] = 255; buf[idx + 3] = 255;
            }
          }
        }
      }
    }

    // Two big shiny monster eyes
    const eyeY = cy - 2 - Math.round(squashY * 0.5);
    const drawEye = (ex) => {
      for (let ey = -3; ey <= 3; ey++) {
        for (let exx = -3; exx <= 3; exx++) {
          if (exx * exx + ey * ey <= 8) {
            const idx = ((eyeY + ey) * CELL + (ex + exx)) * 4;
            buf[idx] = 250; buf[idx + 1] = 210; buf[idx + 2] = 40; buf[idx + 3] = 255;
            if (exx === 0 && (ey === 0 || ey === 1)) {
              buf[idx] = 20; buf[idx + 1] = 20; buf[idx + 2] = 20;
            }
            if (exx === -1 && ey === -1) {
              buf[idx] = 255; buf[idx + 1] = 255; buf[idx + 2] = 255;
            }
          }
        }
      }
    };
    drawEye(cx - 9 - Math.round(squashX * 0.3));
    drawEye(cx + 9 + Math.round(squashX * 0.3));

    // Toxic bubble rising
    if (bubbleY) {
      setPixel(buf, CELL, cx + 5, cy - ry - bubbleY, 140, 255, 180, 240);
      setPixel(buf, CELL, cx + 6, cy - ry - bubbleY - 1, 200, 255, 230, 255);
    }

    sealGaps(buf, CELL, CELL);
    return buf;
  }

  const f0 = createSlimeFrame(0, 0, 0);
  const f1 = createSlimeFrame(3, 2, 2);
  const f2 = createSlimeFrame(-2, -3, 6);
  const f3 = createSlimeFrame(1, 1, 3);

  return sharp({
    create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: f0, raw: { width: CELL, height: CELL, channels: 4 }, left: 0, top: 0 },
      { input: f1, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL, top: 0 },
      { input: f2, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL * 2, top: 0 },
      { input: f3, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL * 3, top: 0 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(PROPS_DIR, 'enemy_slime.png'));
}

async function main() {
  console.log('=== ГЕНЕРАЦИЯ 6 МОНСТРОВ-NPC ДЛЯ РЕДАКТОРА КАРТ ===\n');

  // 1. SKELETON WARRIOR
  await processEnemyWalk('skeleton_walk', 'enemy_skeleton', (buf, f) => {
    // Glowing crimson eye sockets
    const eyeY = 46;
    if (f === 1 || f === 2) {
      setPixel(buf, CELL, 59, eyeY, 255, 40, 40, 255);
      setPixel(buf, CELL, 65, eyeY, 255, 40, 40, 255);
    } else {
      setPixel(buf, CELL, 59, eyeY, 180, 20, 20, 230);
      setPixel(buf, CELL, 65, eyeY, 180, 20, 20, 230);
    }
  });

  // 2. GOBLIN RAIDER
  await processEnemyWalk('goblin_walk', 'enemy_goblin', (buf, f) => {
    // Sharp yellow predator eyes & poison dagger glint
    if (f === 1 || f === 2) {
      setPixel(buf, CELL, 61, 74, 255, 230, 40, 255);
      setPixel(buf, CELL, 67, 74, 255, 230, 40, 255);
      // Dagger glint
      setPixel(buf, CELL, 40, 92, 160, 255, 180, 255);
    }
  });

  // 3. DARK CULTIST
  await processEnemyWalk('cultist_walk', 'enemy_cultist', (buf, f) => {
    // Necrotic violet shadow aura
    if (f === 2) {
      setPixel(buf, CELL, 78, 38, 220, 100, 255, 255);
      setPixel(buf, CELL, 79, 37, 255, 180, 255, 255);
      setPixel(buf, CELL, 77, 39, 180, 60, 240, 200);
    }
  });

  // 4. INFERNAL DEMON
  await processEnemyWalk('demon_walk', 'enemy_demon', (buf, f) => {
    // Flaming horns and brimstone chest pulse
    if (f === 1 || f === 2) {
      setPixel(buf, CELL, 54, 20, 255, 140, 20, 255);
      setPixel(buf, CELL, 74, 20, 255, 140, 20, 255);
      setPixel(buf, CELL, 53, 18, 255, 220, 60, 255);
      setPixel(buf, CELL, 75, 18, 255, 220, 60, 255);
    }
  });

  // 5. LIVING GARGOYLE
  await buildGargoyle();

  // 6. TOXIC SLIME
  await buildSlime();
  console.log('+ enemy_slime.png (512x128, 4 frames, classic green toxic slime)');

  // Update manifest.json
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const monsterDefs = [
    { id: 'enemy_skeleton', size: 104 },
    { id: 'enemy_goblin', size: 88 },
    { id: 'enemy_cultist', size: 106 },
    { id: 'enemy_demon', size: 124 },
    { id: 'enemy_gargoyle', size: 116 },
    { id: 'enemy_slime', size: 84 }
  ];

  for (const m of monsterDefs) {
    manifest.props[m.id] = {
      file: `props/${m.id}.png`,
      cell: 128,
      frames: 4,
      fps: 4
    };
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log('\nУспешно созданы 6 монстров-NPC и обновлён manifest.json!');
}

main().catch(console.error);

