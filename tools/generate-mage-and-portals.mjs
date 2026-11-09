import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');
const CELL = 128;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function hash(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) ^ (x * 1274126177);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
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

// ---------------- 1. NPC MAGE (Маг-архивариус / Архимаг) ----------------
function createMageFrame(dy, sparkFrame) {
  const buf = Buffer.alloc(CELL * CELL * 4, 0);
  const cx = 64;
  const baseY = 114 + dy;

  // 1. Soft ground shadow
  for (let x = cx - 22; x <= cx + 22; x++) {
    for (let y = 114; y <= 122; y++) {
      const dx = (x - cx) / 22;
      const ddy = (y - 118) / 4;
      if (dx * dx + ddy * ddy <= 1.0) {
        setPixel(buf, CELL, x, y, 10, 8, 18, 90);
      }
    }
  }

  // 2. Flowing Wizard Robe (Deep celestial royal purple & midnight blue)
  for (let y = baseY - 62; y <= baseY; y++) {
    const progress = (y - (baseY - 62)) / 62;
    const halfW = 10 + Math.pow(progress, 1.4) * 20;
    for (let x = Math.round(cx - halfW); x <= Math.round(cx + halfW); x++) {
      const relX = (x - cx) / halfW;
      const isEdge = Math.abs(relX) > 0.88;
      const isGoldTrim = y >= baseY - 4 || Math.abs(x - cx) < 3;

      if (isEdge) {
        setPixel(buf, CELL, x, y, 18, 12, 35, 255); // Outline
      } else if (isGoldTrim) {
        setPixel(buf, CELL, x, y, 220, 180, 50, 255); // Gold embroidery
      } else {
        const shade = Math.sin(relX * Math.PI) * 25;
        setPixel(buf, CELL, x, y, clamp(55 + shade, 35, 95), clamp(30 + shade * 0.8, 15, 65), clamp(110 + shade, 80, 160), 255);
      }
    }
  }

  // 3. Wizard Belt & Arcane Rune Buckle
  const beltY = baseY - 38;
  for (let x = cx - 14; x <= cx + 14; x++) {
    setPixel(buf, CELL, x, beltY, 160, 120, 30, 255);
    setPixel(buf, CELL, x, beltY + 1, 130, 95, 20, 255);
  }
  // Sapphire belt buckle gem
  setPixel(buf, CELL, cx, beltY, 80, 220, 255, 255);
  setPixel(buf, CELL, cx - 1, beltY, 40, 160, 240, 255);
  setPixel(buf, CELL, cx + 1, beltY, 40, 160, 240, 255);

  // 4. Wizard Cape & Shoulders (Velvet indigo cape with gold clasps)
  for (let y = baseY - 66; y <= baseY - 36; y++) {
    const capeW = 16 + (y - (baseY - 66)) * 0.4;
    for (let x = Math.round(cx - capeW); x <= Math.round(cx + capeW); x++) {
      if (Math.abs(x - cx) > capeW - 3) {
        setPixel(buf, CELL, x, y, 35, 18, 75, 255);
      }
    }
  }

  // 5. Head, Long White Sage Beard, & Wizard Hood/Hat
  const headY = baseY - 74;
  // White beard
  for (let y = headY + 8; y <= headY + 28; y++) {
    const bW = Math.max(0, 8 - (y - (headY + 8)) * 0.35);
    for (let x = Math.round(cx - bW); x <= Math.round(cx + bW); x++) {
      const bShade = (y % 2 === 0) ? 230 : 205;
      setPixel(buf, CELL, x, y, bShade, bShade, clamp(bShade + 15, 0, 255), 255);
    }
  }
  // Face / skin
  for (let y = headY + 2; y <= headY + 9; y++) {
    for (let x = cx - 5; x <= cx + 5; x++) {
      setPixel(buf, CELL, x, y, 225, 175, 135, 255);
    }
  }
  // Glowing blue magical eyes
  setPixel(buf, CELL, cx - 3, headY + 5, 80, 230, 255, 255);
  setPixel(buf, CELL, cx + 3, headY + 5, 80, 230, 255, 255);

  // Pointed Wizard Hat
  for (let y = headY - 24; y <= headY + 2; y++) {
    const hatProg = (y - (headY - 24)) / 26;
    const hatW = y > headY ? 16 : (1 + Math.pow(hatProg, 1.8) * 14);
    for (let x = Math.round(cx - hatW); x <= Math.round(cx + hatW); x++) {
      const isEdge = Math.abs(x - cx) >= Math.round(hatW) - 1;
      if (isEdge) {
        setPixel(buf, CELL, x, y, 25, 14, 45, 255);
      } else if (y === headY - 2) {
        setPixel(buf, CELL, x, y, 220, 180, 45, 255); // Gold hat band
      } else {
        setPixel(buf, CELL, x, y, 55, 30, 110, 255);
      }
    }
  }

  // 6. Arcane Staff in Right Hand
  const staffX = cx + 24;
  for (let y = baseY - 82; y <= baseY; y++) {
    setPixel(buf, CELL, staffX, y, 120, 75, 35, 255); // Mahogany wood
    setPixel(buf, CELL, staffX + 1, y, 80, 45, 20, 255);
  }
  // Hand holding staff
  setPixel(buf, CELL, staffX - 1, baseY - 44, 220, 175, 135, 255);
  setPixel(buf, CELL, staffX, baseY - 44, 210, 165, 125, 255);

  // Staff Head (Twisted golden prongs holding hovering sapphire crystal orb)
  const orbY = baseY - 86;
  // Golden prongs
  setPixel(buf, CELL, staffX - 3, orbY + 2, 230, 190, 50, 255);
  setPixel(buf, CELL, staffX + 4, orbY + 2, 230, 190, 50, 255);
  setPixel(buf, CELL, staffX - 2, orbY - 4, 230, 190, 50, 255);
  setPixel(buf, CELL, staffX + 3, orbY - 4, 230, 190, 50, 255);

  // Glowing Crystal Orb
  for (let dyO = -3; dyO <= 3; dyO++) {
    for (let dxO = -3; dxO <= 3; dxO++) {
      if (dxO * dxO + dyO * dyO <= 9) {
        const isCore = dxO * dxO + dyO * dyO <= 2;
        if (isCore) {
          setPixel(buf, CELL, staffX + dxO, orbY + dyO, 240, 255, 255, 255);
        } else {
          setPixel(buf, CELL, staffX + dxO, orbY + dyO, 60, 200, 255, 240);
        }
      }
    }
  }

  // 7. Dynamic Magical Sparkles and Arcane Runes (Frame 1, 2, 3)
  if (sparkFrame === 1 || sparkFrame === 2) {
    drawStarGlint(buf, CELL, staffX, orbY, 120, 230, 255);
    // Orbiting arcane particles
    setPixel(buf, CELL, staffX - 5, orbY - 6, 140, 240, 255, 255);
    setPixel(buf, CELL, staffX + 6, orbY - 5, 200, 160, 255, 240);
    setPixel(buf, CELL, staffX - 7, orbY + 4, 80, 220, 255, 240);
  } else if (sparkFrame === 3) {
    // Lingering mana wisp
    setPixel(buf, CELL, staffX + 2, orbY - 10, 100, 220, 255, 200);
    setPixel(buf, CELL, staffX - 4, orbY - 8, 180, 150, 255, 180);
  }

  return buf;
}

// ---------------- 2. FOUR MAGICAL PORTALS (128x128, 4 frames animated strip 512x128) ----------------

function drawPortalBase(theme, frame) {
  const buf = Buffer.alloc(CELL * CELL * 4, 0);
  const cx = 64, cy = 64;

  // Stone Archway dimensions
  const archRx = 38, archRy = 48;
  const vortexRx = 28, vortexRy = 40;

  // 1. Swirling Vortex Center (Rotates and pulses across 4 frames)
  const angleOffset = (frame * Math.PI) / 2;
  const pulse = 1.0 + Math.sin((frame / 4) * Math.PI * 2) * 0.08;

  for (let y = 14; y <= 118; y++) {
    for (let x = 18; x <= 110; x++) {
      const dx = (x - cx) / (vortexRx * pulse);
      const dy = (y - cy) / (vortexRy * pulse);
      const dist = dx * dx + dy * dy;

      if (dist <= 1.0) {
        // Swirling angle calculation
        const angle = Math.atan2(dy, dx) + dist * 4 - angleOffset;
        const swirlBand = Math.sin(angle * 3) * 0.5 + 0.5;
        const coreDist = Math.sqrt(dist);

        let r = 0, g = 0, b = 0, a = Math.round((1 - coreDist * 0.3) * 255);

        if (theme === 'arcane') {
          // Sapphire Celestial Vortex
          r = Math.round(30 + swirlBand * 80 + (1 - coreDist) * 140);
          g = Math.round(140 + swirlBand * 90 + (1 - coreDist) * 115);
          b = Math.round(230 + swirlBand * 25);
        } else if (theme === 'inferno') {
          // Lava Brimstone Vortex
          r = Math.round(230 + swirlBand * 25);
          g = Math.round(40 + swirlBand * 120 + (1 - coreDist) * 95);
          b = Math.round(10 + swirlBand * 40);
        } else if (theme === 'void') {
          // Deep Nether Violet Vortex
          r = Math.round(150 + swirlBand * 95 + (1 - coreDist) * 105);
          g = Math.round(25 + swirlBand * 40);
          b = Math.round(210 + swirlBand * 45);
        } else if (theme === 'nature') {
          // Verdant Emerald Wisp Vortex
          r = Math.round(40 + swirlBand * 60);
          g = Math.round(210 + swirlBand * 45 + (1 - coreDist) * 45);
          b = Math.round(90 + swirlBand * 110);
        }
        setPixel(buf, CELL, x, y, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), clamp(a, 0, 255));
      }
    }
  }

  // 2. Heavy Carved Stone Arch Pillars and Keystone
  for (let y = 14; y <= 118; y++) {
    for (let x = 14; x <= 114; x++) {
      const dxA = (x - cx) / archRx;
      const dyA = (y - cy) / archRy;
      const distA = dxA * dxA + dyA * dyA;

      const dxV = (x - cx) / vortexRx;
      const dyV = (y - cy) / vortexRy;
      const distV = dxV * dxV + dyV * dyV;

      if (distA <= 1.25 && distV >= 0.88) {
        // Stone material
        const isPillar = (x < cx - 24 || x > cx + 24) && y > cy - 10;
        const isKeystone = y < cy - 36 && Math.abs(x - cx) < 14;
        const noise = hash(x, y, 1201) * 20;

        let sr = 90, sg = 88, sb = 96; // Granite stone
        if (theme === 'inferno') { sr = 50; sg = 40; sb = 44; } // Obsidian
        else if (theme === 'void') { sr = 60; sg = 45; sb = 80; } // Nether slate
        else if (theme === 'nature') { sr = 95; sg = 75; sb = 55; } // Ancient wood / roots

        // Bevel highlight on outer top-left
        const isOuterEdge = distA > 1.15;
        const bevel = (x < cx && y < cy) ? 22 : (isOuterEdge ? -20 : 0);

        setPixel(buf, CELL, x, y,
          clamp(sr + bevel + noise, 20, 220),
          clamp(sg + bevel + noise, 20, 220),
          clamp(sb + bevel + noise, 20, 220),
          255
        );
      }
    }
  }

  // 3. Glowing Inlaid Runes on Archway
  const runePoints = [
    [cx - 32, cy + 20], [cx - 32, cy - 10], [cx - 24, cy - 34],
    [cx, cy - 42],
    [cx + 24, cy - 34], [cx + 32, cy - 10], [cx + 32, cy + 20]
  ];

  for (const [rx, ry] of runePoints) {
    const rGlow = Math.sin(frame * 1.5 + rx * 0.1) * 0.3 + 0.7;
    let rr = 120, rg = 230, rb = 255;
    if (theme === 'inferno') { rr = 255; rg = 120; rb = 30; }
    else if (theme === 'void') { rr = 240; rg = 80; rb = 255; }
    else if (theme === 'nature') { rr = 120; rg = 255; rb = 120; }

    setPixel(buf, CELL, rx, ry, 255, 255, 255, 255);
    setPixel(buf, CELL, rx - 1, ry, rr, rg, rb, Math.round(240 * rGlow));
    setPixel(buf, CELL, rx + 1, ry, rr, rg, rb, Math.round(240 * rGlow));
    setPixel(buf, CELL, rx, ry - 1, rr, rg, rb, Math.round(240 * rGlow));
    setPixel(buf, CELL, rx, ry + 1, rr, rg, rb, Math.round(240 * rGlow));
  }

  // 4. Floating Wisps / Embers rising from portal
  for (let i = 0; i < 4; i++) {
    const fAngle = (frame * 1.6 + i * 1.57);
    const px = Math.round(cx + Math.cos(fAngle) * 20);
    const py = Math.round(cy + Math.sin(fAngle) * 28 - (frame * 3 + i * 4) % 18);
    drawStarGlint(buf, CELL, px, py,
      theme === 'inferno' ? 255 : (theme === 'void' ? 230 : (theme === 'nature' ? 140 : 120)),
      theme === 'inferno' ? 140 : (theme === 'void' ? 80 : (theme === 'nature' ? 255 : 220)),
      theme === 'inferno' ? 30 : (theme === 'void' ? 255 : (theme === 'nature' ? 120 : 255))
    );
  }

  return buf;
}

async function main() {
  console.log('=== ГЕНЕРАЦИЯ NPC МАГА И 4 ВОЛШЕБНЫХ ПОРТАЛОВ ===\n');

  // 1. NPC MAGE (4 frames: 0, 1=inhale 1px, 2=peak+sparks, 3=settle)
  const f0 = createMageFrame(0, 0);
  const f1 = createMageFrame(-1, 1);
  const f2 = createMageFrame(-1, 2);
  const f3 = createMageFrame(0, 3);

  const mageStrip = await sharp({
    create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: f0, raw: { width: CELL, height: CELL, channels: 4 }, left: 0, top: 0 },
      { input: f1, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL, top: 0 },
      { input: f2, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL * 2, top: 0 },
      { input: f3, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL * 3, top: 0 }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PROPS_DIR, 'npc_mage.png'), mageStrip);
  console.log('+ npc_mage.png (Архимаг с посохом и магической аурой) [512x128 strip, 4 кадра]');

  // 2. FOUR PORTALS
  const portalThemes = [
    { id: 'portal_arcane', theme: 'arcane', name: 'Астральный портал (сапфировый вихрь)' },
    { id: 'portal_inferno', theme: 'inferno', name: 'Инфернальный портал (огненный вихрь)' },
    { id: 'portal_void', theme: 'void', name: 'Портал Бездны (тёмная материя)' },
    { id: 'portal_nature', theme: 'nature', name: 'Портал Природы (эфирные духи)' }
  ];

  for (const p of portalThemes) {
    const pf0 = drawPortalBase(p.theme, 0);
    const pf1 = drawPortalBase(p.theme, 1);
    const pf2 = drawPortalBase(p.theme, 2);
    const pf3 = drawPortalBase(p.theme, 3);

    const portalStrip = await sharp({
      create: { width: CELL * 4, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([
        { input: pf0, raw: { width: CELL, height: CELL, channels: 4 }, left: 0, top: 0 },
        { input: pf1, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL, top: 0 },
        { input: pf2, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL * 2, top: 0 },
        { input: pf3, raw: { width: CELL, height: CELL, channels: 4 }, left: CELL * 3, top: 0 }
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(path.join(PROPS_DIR, `${p.id}.png`), portalStrip);
    console.log(`+ ${p.id}.png (${p.name}) [512x128 strip, 4 кадра]`);
  }

  console.log('\nВсе NPC и порталы успешно сгенерированы!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
