import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const TILES_DIR = path.join(ROOT, 'public/assets/jrpg/tiles');

const W = 128;
const H = 128;

// Deterministic hash / noise generator
function hash2d(x, y, seed = 1) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453123;
  return n - Math.floor(n);
}

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function setPixel(buf, x, y, r, g, b, a = 255) {
  const wx = ((x % W) + W) % W;
  const wy = ((y % H) + H) % H;
  const idx = (wy * W + wx) * 4;
  buf[idx] = clamp(r);
  buf[idx + 1] = clamp(g);
  buf[idx + 2] = clamp(b);
  buf[idx + 3] = clamp(a);
}

// 1. CITY COBBLESTONE SQUARE (Городская брусчатка площади)
function makeCobblestoneSquare() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const stoneSize = 16;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const row = Math.floor(y / stoneSize);
      const rowOffset = (row % 2) * (stoneSize / 2);
      const col = Math.floor((x + rowOffset) / stoneSize);

      const localX = (x + rowOffset) % stoneSize;
      const localY = y % stoneSize;

      // Distance from center of stone
      const cx = stoneSize / 2;
      const cy = stoneSize / 2;
      const dist = Math.hypot((localX - cx) / (cx - 1), (localY - cy) / (cy - 1));

      // Stone seed for unique shade
      const seed = hash2d(col, row, 17);
      const baseTone = 75 + Math.round(seed * 40); // 75..115
      const noise = (hash2d(x, y, 99) - 0.5) * 16;

      if (dist >= 0.95 || localX === 0 || localY === 0) {
        // Deep mortar grout between cobblestones
        setPixel(buf, x, y, 24, 26, 32);
      } else {
        // Top-left highlight, bottom-right shadow bevel
        const bevel = (localX < cx && localY < cy ? 18 : (localX > cx && localY > cy ? -18 : 0));
        const r = baseTone + bevel + noise;
        const g = baseTone + bevel + noise + 2;
        const b = baseTone + bevel + noise + 8; // slight cool slate tone
        setPixel(buf, x, y, r, g, b);
      }
    }
  }
  return buf;
}

// 2. CITY STONE PAVEMENT (Каменный тротуар / широкие городские плиты)
function makeStonePavement() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const blockW = 32;
  const blockH = 16;

  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / blockH);
    const rowShift = (row % 2) * 16;
    for (let x = 0; x < W; x++) {
      const col = Math.floor((x + rowShift) / blockW);
      const lx = (x + rowShift) % blockW;
      const ly = y % blockH;

      const seed = hash2d(col, row, 41);
      const baseGray = 110 + Math.round(seed * 35);
      const noise = (hash2d(x, y, 12) - 0.5) * 14;

      if (lx === 0 || ly === 0) {
        // Mortar groove
        setPixel(buf, x, y, 32, 34, 40);
      } else if (lx === 1 || ly === 1) {
        // Chiseled top-left stone highlight
        setPixel(buf, x, y, baseGray + 28, baseGray + 28, baseGray + 32);
      } else if (lx === blockW - 1 || ly === blockH - 1) {
        // Bottom-right shadow
        setPixel(buf, x, y, baseGray - 22, baseGray - 22, baseGray - 18);
      } else {
        // Surface stone grain
        setPixel(buf, x, y, baseGray + noise, baseGray + noise, baseGray + noise + 4);
      }
    }
  }
  return buf;
}

// 3. CITY BRICK ROAD (Красный клинкерный кирпич)
function makeBrickRoad() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const bw = 16;
  const bh = 8;

  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / bh);
    const shift = (row % 2) * (bw / 2);
    for (let x = 0; x < W; x++) {
      const col = Math.floor((x + shift) / bw);
      const lx = (x + shift) % bw;
      const ly = y % bh;

      const seed = hash2d(col, row, 73);
      const redBase = 135 + Math.round(seed * 40); // rich brick red
      const noise = (hash2d(x, y, 55) - 0.5) * 14;

      if (lx === 0 || ly === 0) {
        setPixel(buf, x, y, 40, 24, 20); // dark clay mortar
      } else if (lx === 1 || ly === 1) {
        setPixel(buf, x, y, redBase + 24, Math.round(redBase * 0.45), Math.round(redBase * 0.35));
      } else {
        const r = redBase + noise;
        const g = Math.round(redBase * 0.38) + noise;
        const b = Math.round(redBase * 0.28) + noise;
        setPixel(buf, x, y, r, g, b);
      }
    }
  }
  return buf;
}

// 4. CITY CURB STONE (Городской бордюр и водосток)
function makeCurbStone() {
  const buf = Buffer.alloc(W * H * 4, 255);
  // Upper half: sidewalk pavement (y < 56)
  // Middle: raised chiseled curb (y = 56..72)
  // Gutter trough: (y = 73..80)
  // Lower portion: street cobblestone (y >= 81)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = (hash2d(x, y, 88) - 0.5) * 12;
      if (y < 56) {
        // Sidewalk pavement
        const col = Math.floor(x / 32);
        const lx = x % 32;
        const ly = y % 28;
        if (lx === 0 || ly === 0) {
          setPixel(buf, x, y, 36, 38, 44);
        } else {
          setPixel(buf, x, y, 115 + n, 118 + n, 125 + n);
        }
      } else if (y >= 56 && y <= 72) {
        // Raised granite curbstone block
        const cbx = x % 32;
        if (cbx === 0) {
          setPixel(buf, x, y, 30, 30, 36);
        } else if (y === 56 || cbx === 1) {
          // Sharp chiseled sunlit bevel
          setPixel(buf, x, y, 175, 180, 195);
        } else if (y === 72) {
          // Dark shadow edge into gutter
          setPixel(buf, x, y, 40, 42, 48);
        } else {
          setPixel(buf, x, y, 140 + n, 145 + n, 155 + n);
        }
      } else if (y >= 73 && y <= 80) {
        // Dark drainage gutter trough with damp sheen
        setPixel(buf, x, y, 30 + n * 0.5, 34 + n * 0.5, 42 + n * 0.5);
      } else {
        // Street cobblestone paving
        const csRow = Math.floor((y - 81) / 12);
        const csCol = Math.floor((x + (csRow % 2) * 6) / 12);
        const clx = (x + (csRow % 2) * 6) % 12;
        const cly = (y - 81) % 12;
        if (clx === 0 || cly === 0) {
          setPixel(buf, x, y, 22, 24, 28);
        } else {
          setPixel(buf, x, y, 78 + n, 82 + n, 90 + n);
        }
      }
    }
  }
  return buf;
}

// 5. CITY PLAZA MOSAIC (Мозаичный орнамент центральной площади)
function makePlazaMosaic() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const cx = 64;
  const cy = 64;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const n = (hash2d(x, y, 33) - 0.5) * 10;

      // 8-fold star symmetry
      const a8 = Math.abs(Math.sin(angle * 4));

      if (r < 8) {
        // Central golden boss
        setPixel(buf, x, y, 230 + n, 190 + n, 60 + n);
      } else if (r < 22) {
        // Inner lapis-lazuli ring
        const isSpoke = a8 > 0.85;
        if (isSpoke) {
          setPixel(buf, x, y, 220 + n, 180 + n, 50); // Gold rays
        } else {
          setPixel(buf, x, y, 40 + n, 70 + n, 130 + n); // Deep sapphire blue
        }
      } else if (r >= 22 && r <= 26) {
        // Golden brass circular inlay border
        setPixel(buf, x, y, 215 + n, 175 + n, 45);
      } else if (r < 48) {
        // Tessellated marble diamond mosaic
        const isStarRay = a8 > 0.7 && r < 44;
        if (isStarRay) {
          setPixel(buf, x, y, 235 + n, 225 + n, 190 + n); // Ivory ray
        } else {
          const check = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
          if (check) setPixel(buf, x, y, 160 + n, 155 + n, 150 + n);
          else setPixel(buf, x, y, 70 + n, 75 + n, 90 + n);
        }
      } else if (r >= 48 && r <= 52) {
        // Outer brass ring
        setPixel(buf, x, y, 200 + n, 160 + n, 40);
      } else {
        // Outer plaza gray flagstones
        const fx = Math.floor(x / 16);
        const fy = Math.floor(y / 16);
        if (x % 16 === 0 || y % 16 === 0) {
          setPixel(buf, x, y, 28, 30, 36);
        } else {
          setPixel(buf, x, y, 95 + n, 98 + n, 108 + n);
        }
      }
    }
  }
  return buf;
}

// 6. CITY CANAL QUAY (Каменная набережная)
function makeCanalQuay() {
  const buf = Buffer.alloc(W * H * 4, 255);
  // Upper portion (y < 68): Granite quay stone paving
  // Quay edge wall (y = 68..80): chiseled granite rim
  // Lower portion (y > 80): dark deep canal water with gentle ripples
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = (hash2d(x, y, 64) - 0.5) * 12;
      if (y < 68) {
        // Granite quay pavement
        const gx = x % 32;
        const gy = y % 22;
        if (gx === 0 || gy === 0) {
          setPixel(buf, x, y, 32, 35, 42);
        } else {
          setPixel(buf, x, y, 110 + n, 115 + n, 126 + n);
        }
      } else if (y >= 68 && y <= 80) {
        // Thick protective granite harbor coping stone
        const hx = x % 32;
        if (hx === 0) {
          setPixel(buf, x, y, 25, 28, 35);
        } else if (y === 68) {
          setPixel(buf, x, y, 175, 180, 195); // Bright edge highlight
        } else if (y === 80) {
          setPixel(buf, x, y, 20, 24, 30); // Dark drop-off shadow into water
        } else {
          setPixel(buf, x, y, 130 + n, 135 + n, 146 + n);
        }
      } else {
        // Deep canal water with soft ripple reflections
        const ripple = Math.sin((x + y * 0.5) * 0.3) * 14;
        const r = clamp(18 + ripple * 0.4);
        const g = clamp(55 + ripple * 0.7);
        const b = clamp(95 + ripple);
        setPixel(buf, x, y, r, g, b);
      }
    }
  }

  // Draw two cast iron mooring rings on the edge (at x=32 and x=96, y=74)
  const drawRing = (rx, ry) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy);
        if (d >= 2 && d <= 4) {
          setPixel(buf, rx + dx, ry + dy, 30, 32, 38);
          if (dy < 0) setPixel(buf, rx + dx, ry + dy, 180, 185, 195);
        }
      }
    }
  };
  drawRing(32, 74);
  drawRing(96, 74);

  return buf;
}

// 7. CITY WOOD DOCK (Деревянный причал / настил)
function makeWoodDock() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const plankH = 16;

  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / plankH);
    const ly = y % plankH;
    for (let x = 0; x < W; x++) {
      const seed = hash2d(row, Math.floor(x / 64), 19);
      const woodBase = 115 + Math.round(seed * 35);
      const grain = Math.sin(x * 0.6 + hash2d(x, row) * 3) * 12;
      const n = (hash2d(x, y, 77) - 0.5) * 10;

      if (ly === 0) {
        // Deep gap between planks
        setPixel(buf, x, y, 25, 16, 10);
      } else if (ly === 1) {
        // Top edge bevel
        setPixel(buf, x, y, woodBase + 28, Math.round((woodBase + 28) * 0.72), Math.round((woodBase + 28) * 0.45));
      } else if (ly === plankH - 1) {
        // Bottom edge shadow
        setPixel(buf, x, y, woodBase - 28, Math.round((woodBase - 28) * 0.65), Math.round((woodBase - 28) * 0.40));
      } else {
        const r = clamp(woodBase + grain + n);
        const g = clamp(Math.round(woodBase * 0.70) + grain * 0.7 + n);
        const b = clamp(Math.round(woodBase * 0.42) + grain * 0.4 + n);
        setPixel(buf, x, y, r, g, b);
      }
    }
  }

  // Iron fasteners / nails
  for (let row = 0; row < H / plankH; row++) {
    const py = row * plankH + plankH / 2;
    for (const px of [12, 52, 76, 116]) {
      setPixel(buf, px, py, 20, 20, 20);
      setPixel(buf, px - 1, py - 1, 190, 190, 190);
    }
  }
  return buf;
}

// 8. CITY CASTLE MARBLE (Имперский мрамор)
function makeCastleMarble() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const tileSize = 32;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // 45 degree diamond grid
      const u = Math.floor((x + y) / tileSize);
      const v = Math.floor((x - y + 1000 * tileSize) / tileSize);
      const isDark = (u + v) % 2 === 0;

      const lu = (x + y) % tileSize;
      const lv = (x - y + 1000 * tileSize) % tileSize;
      const edge = (lu === 0 || lv === 0);

      const n = (hash2d(x, y, 47) - 0.5) * 8;
      // Marble vein
      const vein = Math.sin((x * 1.5 + y) * 0.15 + hash2d(x, y) * 4);

      if (edge) {
        // Brass / grout inlay divider
        setPixel(buf, x, y, 40, 42, 48);
      } else if (isDark) {
        // Obsidian polished marble
        const tone = 34 + n + (vein > 0.85 ? 40 : 0);
        setPixel(buf, x, y, tone, tone + 2, tone + 8);
      } else {
        // Ivory cream marble with subtle gold veins
        const tone = 205 + n;
        const goldVein = vein > 0.82 ? 30 : 0;
        setPixel(buf, x, y, tone, tone - 6 + goldVein, tone - 24);
      }
    }
  }
  return buf;
}

// 9. CITY ROOF TILES (Черепица крыш / навесов)
function makeRoofTiles() {
  const buf = Buffer.alloc(W * H * 4, 255);
  const rowH = 16;
  const tileW = 16;

  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / rowH);
    const ly = y % rowH;
    const shift = (row % 2) * (tileW / 2);
    for (let x = 0; x < W; x++) {
      const col = Math.floor((x + shift) / tileW);
      const lx = (x + shift) % tileW;

      // Semicircular shingle contour
      const dx = (lx - tileW / 2) / (tileW / 2);
      const shingleArc = Math.sqrt(Math.max(0, 1 - dx * dx));
      const n = (hash2d(x, y, 82) - 0.5) * 10;

      const seed = hash2d(col, row, 91);
      const terracotta = 145 + Math.round(seed * 35);

      if (ly === 0) {
        // Cast shadow of upper overlapping shingle
        setPixel(buf, x, y, 45, 18, 12);
      } else if (ly === 1) {
        // Sunlit rim highlight
        setPixel(buf, x, y, terracotta + 35, Math.round(terracotta * 0.5), Math.round(terracotta * 0.3));
      } else {
        const shade = terracotta * (0.75 + shingleArc * 0.35) + n;
        const r = clamp(shade);
        const g = clamp(shade * 0.38);
        const b = clamp(shade * 0.22);
        setPixel(buf, x, y, r, g, b);
      }
    }
  }
  return buf;
}

// 10. CITY GARDEN PATH (Парковая дорожка с бордюром)
function makeGardenPath() {
  const buf = Buffer.alloc(W * H * 4, 255);
  // Center (y = 28..100): crushed golden gravel path
  // Borders (y < 28 and y > 100): manicured grass with vibrant flowers
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = (hash2d(x, y, 101) - 0.5) * 18;
      const isPath = (y >= 26 && y <= 101);

      if (isPath) {
        if (y === 26 || y === 101) {
          // Cobblestone border edge
          const bx = x % 16;
          if (bx === 0) setPixel(buf, x, y, 35, 35, 40);
          else setPixel(buf, x, y, 135 + n * 0.5, 130 + n * 0.5, 120 + n * 0.5);
        } else {
          // Golden river gravel pebbles
          setPixel(buf, x, y, 180 + n, 160 + n, 130 + n);
        }
      } else {
        // Manicured emerald lawn grass
        const gR = clamp(45 + n * 0.5);
        const gG = clamp(135 + n);
        const gB = clamp(50 + n * 0.5);
        setPixel(buf, x, y, gR, gG, gB);

        // Scattered colorful blossom dots
        const flSeed = hash2d(x, y, 505);
        if (flSeed > 0.96) {
          // Rose red or daisy white blossom
          if (flSeed > 0.98) setPixel(buf, x, y, 255, 255, 230); // White
          else setPixel(buf, x, y, 255, 90, 140); // Rose pink
        }
      }
    }
  }
  return buf;
}

const GENERATORS = [
  ['city_cobblestone_square', 'Городская брусчатка', makeCobblestoneSquare],
  ['city_stone_pavement', 'Каменный тротуар', makeStonePavement],
  ['city_brick_road', 'Клинкерный кирпич', makeBrickRoad],
  ['city_curb_stone', 'Городской бордюр', makeCurbStone],
  ['city_plaza_mosaic', 'Мозаичная площадь', makePlazaMosaic],
  ['city_canal_quay', 'Каменная набережная', makeCanalQuay],
  ['city_wood_dock', 'Деревянный причал', makeWoodDock],
  ['city_castle_marble', 'Имперский мрамор', makeCastleMarble],
  ['city_roof_tiles', 'Черепица крыш', makeRoofTiles],
  ['city_garden_path', 'Парковая дорожка', makeGardenPath]
];

async function main() {
  console.log('=== ГЕНЕРАЦИЯ 10 НОВЫХ ГОРОДСКИХ ТАЙЛОВ ДЛЯ JRPG ===\n');

  for (const [id, label, genFn] of GENERATORS) {
    const rawBuf = genFn();
    const outPath = path.join(TILES_DIR, `${id}.png`);
    await sharp(rawBuf, { raw: { width: W, height: H, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`+ ${id}.png (${label}) [128x128 бесшовный]`);
  }

  console.log('\nВсе 10 городских тайлов успешно созданы в public/assets/jrpg/tiles/!');
}

main().catch(console.error);

