import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_PATH = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e/city_tiles_portals_hero_showcase.png';

async function buildShowcase() {
  const W = 1120, H = 640;
  const svgBg = Buffer.from(`
    <svg width="${W}" height="${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0e1320"/>
          <stop offset="100%" stop-color="#06090e"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="#253147" stroke-width="2" rx="8"/>
      <text x="28" y="44" fill="#ffd166" font-family="Segoe UI, sans-serif" font-weight="bold" font-size="20">JRPG MAP EDITOR - ОБНОВЛЕНИЕ v1.3.0</text>
      <text x="28" y="68" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="12">ГОРОДСКИЕ ТАЙЛЫ, ТРАНСФОРМАЦИИ, АРХИМАГ, МАГИЧЕСКИЕ ПОРТАЛЫ, СТАРТОВЫЙ ГЕРОЙ И GITHUB СИНХРОНИЗАЦИЯ</text>
      
      <!-- Section 1: City & Trail Tiles -->
      <text x="28" y="106" fill="#7cfc9a" font-family="Segoe UI, sans-serif" font-weight="bold" font-size="14">1. ГОРОДСКИЕ ТАЙЛЫ, ТРОПИНКИ И БРУСЧАТКА (43 ТАЙЛА В ПАЛИТРЕ):</text>
      
      <!-- Section 2: Portals -->
      <text x="28" y="278" fill="#6db7ff" font-family="Segoe UI, sans-serif" font-weight="bold" font-size="14">2. МАГИЧЕСКИЕ ПОРТАЛЫ В ОБЪЕКТАХ (4 ВИДА С ЦВЕТНЫМ СИЯНИЕМ В ТЕМНОТЕ):</text>
      
      <!-- Section 3: Mage & Hero -->
      <text x="28" y="450" fill="#c77dff" font-family="Segoe UI, sans-serif" font-weight="bold" font-size="14">3. АРХИМАГ И СТАРТОВЫЙ ГЕРОЙ (ПОВОРОТЫ НА 4 СТОРОНЫ, АТАКА МЕЧОМ, КАСТ):</text>
    </svg>
  `);

  const composites = [{ input: svgBg, left: 0, top: 0 }];

  // 1. Tiles row
  const tiles = [
    ['city_cobblestone_square', 'Площадь'],
    ['city_stone_pavement', 'Мостовая'],
    ['city_brick_road', 'Кирпич'],
    ['city_curb_stone', 'Бордюр'],
    ['city_plaza_mosaic', 'Мозаика'],
    ['city_canal_quay', 'Набережная'],
    ['city_wood_dock', 'Причал'],
    ['city_castle_marble', 'Мрамор'],
    ['trail_edge', 'Край тропы'],
    ['trail_to_cobble', 'Переход'],
    ['cobble_pavement', 'Брусчатка']
  ];

  for (let i = 0; i < tiles.length; i++) {
    const [tid, label] = tiles[i];
    const tPath = path.join(ROOT, 'public/assets/jrpg/tiles', tid + '.png');
    if (fs.existsSync(tPath)) {
      const tImg = await sharp(tPath).resize(80, 80, { kernel: 'lanczos3' }).png().toBuffer();
      const x = 28 + i * 98;
      const y = 120;
      composites.push({ input: tImg, left: x, top: y });

      const labelSvg = Buffer.from(`
        <svg width="90" height="30">
          <text x="40" y="18" fill="#cbd5e1" font-family="Segoe UI, sans-serif" font-size="11" text-anchor="middle">${label}</text>
        </svg>
      `);
      composites.push({ input: labelSvg, left: x - 5, top: y + 84 });
    }
  }

  // 2. Portals row
  const portals = [
    ['portal_arcane', 'Астральный портал', '#38bdf8'],
    ['portal_inferno', 'Инфернальный портал', '#f97316'],
    ['portal_void', 'Портал Бездны', '#c084fc'],
    ['portal_nature', 'Портал Природы', '#4ade80']
  ];

  for (let i = 0; i < portals.length; i++) {
    const [pid, plabel, color] = portals[i];
    const pPath = path.join(ROOT, 'public/assets/jrpg/props', pid + '.png');
    if (fs.existsSync(pPath)) {
      const pFrame = await sharp(pPath).extract({ left: 0, top: 0, width: 128, height: 128 }).resize(110, 110).png().toBuffer();
      const x = 28 + i * 270;
      const y = 295;
      composites.push({ input: pFrame, left: x, top: y });

      const labelSvg = Buffer.from(`
        <svg width="180" height="40">
          <text x="5" y="20" fill="${color}" font-family="Segoe UI, sans-serif" font-weight="bold" font-size="13">${plabel}</text>
          <text x="5" y="36" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="11">4 кадра + аура света</text>
        </svg>
      `);
      composites.push({ input: labelSvg, left: x + 115, top: y + 35 });
    }
  }

  // 3. Mage and Hero row
  // Mage
  const magePath = path.join(ROOT, 'public/assets/jrpg/props/npc_mage.png');
  if (fs.existsSync(magePath)) {
    const mageFrame = await sharp(magePath).extract({ left: 0, top: 0, width: 128, height: 128 }).resize(110, 110).png().toBuffer();
    composites.push({ input: mageFrame, left: 28, top: 468 });
    const mageSvg = Buffer.from(`
      <svg width="180" height="50">
        <text x="5" y="20" fill="#c084fc" font-family="Segoe UI, sans-serif" font-weight="bold" font-size="14">NPC Архимаг</text>
        <text x="5" y="38" fill="#94a3b8" font-family="Segoe UI, sans-serif" font-size="11">Посох, мантия, руны</text>
      </svg>
    `);
    composites.push({ input: mageSvg, left: 145, top: 495 });
  }

  // Hero player frames
  const heroItems = [
    ['hero/walk_front.png', 'Лицом (вниз)', 0],
    ['hero/walk_back.png', 'Спиной (вверх)', 0],
    ['hero/walk_left.png', 'Влево', 0],
    ['hero/walk_right.png', 'Вправо', 0],
    ['hero/attack.png', 'Атака (слэш)', 3],
    ['hero/cast.png', 'Каст (магия)', 2]
  ];

  for (let i = 0; i < heroItems.length; i++) {
    const [relPath, hlabel, fIdx] = heroItems[i];
    const fullPath = path.join(ROOT, 'public/assets/jrpg', relPath);
    if (fs.existsSync(fullPath)) {
      const hFrame = await sharp(fullPath).extract({ left: fIdx * 128, top: 0, width: 128, height: 128 }).resize(100, 100).png().toBuffer();
      const x = 320 + i * 130;
      const y = 472;
      composites.push({ input: hFrame, left: x, top: y });

      const labelSvg = Buffer.from(`
        <svg width="120" height="30">
          <text x="50" y="18" fill="#f1f5f9" font-family="Segoe UI, sans-serif" font-size="11" text-anchor="middle">${hlabel}</text>
        </svg>
      `);
      composites.push({ input: labelSvg, left: x - 10, top: y + 104 });
    }
  }

  const out = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 14, g: 19, b: 32, alpha: 1 } }
  }).composite(composites).png().toBuffer();

  fs.writeFileSync(OUT_PATH, out);
  console.log('Saved showcase to', OUT_PATH);
}

buildShowcase().catch(console.error);

