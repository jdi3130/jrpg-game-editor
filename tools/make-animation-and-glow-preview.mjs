import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');
const PREVIEWS_DIR = path.join(ROOT, '_previews');
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e';

const NPCS = [
  { id: 'merchant_weapon', name: 'Кузнец (удар молота, искры, дыхание)' },
  { id: 'merchant_potion', name: 'Алхимик (покачивание колбы, пузыри, дым)' },
  { id: 'merchant_general', name: 'Купец (подбрасывание монеты, блеск)' },
  { id: 'npc_elder', name: 'Старейшина (подъем посоха, свечение рун)' },
  { id: 'npc_villager_m', name: 'Горожанин (шаг, перенос веса, поворот)' },
  { id: 'npc_villager_f', name: 'Горожанка (покачивание платья, приветствие)' },
  { id: 'npc_girl', name: 'Девочка с цветами (веселый подскок, корзинка)' },
  { id: 'npc_maid', name: 'Трактирщица (полировка кружки, пена эля)' },
  { id: 'warrior_guard', name: 'Стражник (хват алебарды, поворот шлема)' },
  { id: 'warrior_knight', name: 'Паладин (подъем щита, сияние меча)' },
  { id: 'warrior_archer', name: 'Следопыт (натяжение тетивы, оперение стрелы)' },
  { id: 'warrior_mercenary', name: 'Наемник (секира на плече, разминка шеи)' }
];

const FIRES = [
  { id: 'campfire', name: 'Базовый костёр' },
  { id: 'campfire_pot', name: 'Костёр с котелком' },
  { id: 'campfire_ashes', name: 'Тлеющие угли' },
  { id: 'campfire_beacon', name: 'Сторожевой огонь' },
  { id: 'campfire_ritual', name: 'Ритуальный огонь' },
  { id: 'campfire_stones', name: 'Костёр в камнях' },
  { id: 'brazier_fire', name: 'Огненная чаша' },
  { id: 'torch_standing', name: 'Уличный факел' }
];

async function createShowcase() {
  const width = 1200;
  // Layout: Header + 12 NPC rows (each 512x128 scaled down to 400x100) + 8 Fire rows (each 400x100)
  // Let's arrange in 2 columns:
  // Left column (width 580): 6 NPCs + 6 NPCs
  // Total height: 1600px
  const height = 1850;

  // Background
  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 8, g: 10, b: 16, alpha: 1 }
    }
  });

  const composites = [];

  // Title SVG banner
  const titleSvg = `
  <svg width="${width}" height="100">
    <rect width="${width}" height="100" fill="#05070d"/>
    <text x="30" y="42" font-family="'Press Start 2P', monospace" font-size="18" fill="#ffb45e" font-weight="bold">УНИКАЛЬНЫЕ АНИМАЦИИ NPC И СИСТЕМА СВЕЧЕНИЯ ОГНЯ</text>
    <text x="30" y="74" font-family="sans-serif" font-size="14" fill="#a09480">Полнотелые индивидуальные циклы движений всех 12 персонажей + 4-кадровые анимированные костры с сиянием</text>
    <line x1="0" y1="99" x2="${width}" y2="99" stroke="rgba(255,180,94,0.3)" stroke-width="2"/>
  </svg>`;
  composites.push({ input: Buffer.from(titleSvg), left: 0, top: 0 });

  // 1. SECTION: ALL 12 UNIQUE NPC ANIMATION SPRITESHEETS
  const npcSectionSvg = `
  <svg width="${width}" height="40">
    <text x="30" y="26" font-family="'Press Start 2P', monospace" font-size="13" fill="#7cfc9a">1. УНИКАЛЬНЫЕ ЦИКЛЫ ВСЕХ 12 NPC (4 КАДРА ПОЛНОТЕЛОЙ АНИМАЦИИ):</text>
  </svg>`;
  composites.push({ input: Buffer.from(npcSectionSvg), left: 0, top: 105 });

  let curY = 145;
  for (let i = 0; i < NPCS.length; i++) {
    const npc = NPCS[i];
    const col = i % 2; // 0 or 1
    const row = Math.floor(i / 2);
    const x = col === 0 ? 30 : 610;
    const y = curY + row * 105;

    const file = path.join(PROPS_DIR, `${npc.id}.png`);
    if (fs.existsSync(file)) {
      // 512x128 resized to 384x96
      const npcBuf = await sharp(file).resize(384, 96, { kernel: 'nearest' }).png().toBuffer();
      composites.push({ input: npcBuf, left: x, top: y + 20 });
    }

    const labelSvg = `
    <svg width="560" height="20">
      <text x="0" y="14" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffe6b0">${npc.name}</text>
    </svg>`;
    composites.push({ input: Buffer.from(labelSvg), left: x, top: y });
  }

  // 2. SECTION: ANIMATED FIRE PROPS WITH GLOW
  const fireStartY = 810;
  const fireSectionSvg = `
  <svg width="${width}" height="40">
    <line x1="30" y1="0" x2="${width - 30}" y2="0" stroke="rgba(255,180,94,0.2)" stroke-width="1"/>
    <text x="30" y="26" font-family="'Press Start 2P', monospace" font-size="13" fill="#ffd166">2. АНИМИРОВАННЫЙ ОГОНЬ И СВЕЧЕНИЕ (4 КАДРА ПЛАМЕНИ + ТЕПЛОВАЯ ПУЛЬСАЦИЯ):</text>
  </svg>`;
  composites.push({ input: Buffer.from(fireSectionSvg), left: 0, top: fireStartY });

  let fireCurY = fireStartY + 45;
  for (let i = 0; i < FIRES.length; i++) {
    const fire = FIRES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 30 : 610;
    const y = fireCurY + row * 115;

    const file = path.join(PROPS_DIR, `${fire.id}.png`);
    if (fs.existsSync(file)) {
      const fireBuf = await sharp(file).resize(384, 96, { kernel: 'nearest' }).png().toBuffer();
      // Draw background glow rectangle
      const glowSvg = `
      <svg width="390" height="102">
        <defs>
          <radialGradient id="fglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${fire.id === 'campfire_ritual' ? '#5ab4ff' : '#ff9922'}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="390" height="102" fill="url(#fglow)" rx="6"/>
        <rect width="390" height="102" fill="none" stroke="rgba(255,255,255,0.08)" rx="6"/>
      </svg>`;
      composites.push({ input: Buffer.from(glowSvg), left: x - 3, top: y + 17 });
      composites.push({ input: fireBuf, left: x, top: y + 20 });
    }

    const labelSvg = `
    <svg width="560" height="20">
      <text x="0" y="14" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffb45e">${fire.name}</text>
    </svg>`;
    composites.push({ input: Buffer.from(labelSvg), left: x, top: y });
  }

  // 3. SECTION: EDITOR UI MARKERS 2-COLUMN FIX
  const markersStartY = 1340;
  const markersSectionSvg = `
  <svg width="${width}" height="40">
    <line x1="30" y1="0" x2="${width - 30}" y2="0" stroke="rgba(255,180,94,0.2)" stroke-width="1"/>
    <text x="30" y="26" font-family="'Press Start 2P', monospace" font-size="13" fill="#6db7ff">3. ИСПРАВЛЕНИЕ ВКЛАДКИ «МЕТКИ» В РЕДАКТОРЕ (СЕТКА 2 КОЛОНКИ БЕЗ ОБРЕЗАНИЙ):</text>
  </svg>`;
  composites.push({ input: Buffer.from(markersSectionSvg), left: 0, top: markersStartY });

  const markersDemoSvg = `
  <svg width="540" height="380">
    <rect width="540" height="380" fill="#0c0e16" rx="8" stroke="rgba(255,190,90,0.3)"/>
    <text x="20" y="32" font-family="'Press Start 2P', monospace" font-size="11" fill="#ffb45e">ВКЛАДКА [МЕТКИ] (260px ПАНЕЛЬ)</text>
    <rect x="20" y="48" width="500" height="1" fill="rgba(255,255,255,0.1)"/>
    
    <!-- Marker 1: Spawn -->
    <g transform="translate(20, 60)">
      <rect width="242" height="46" rx="6" fill="#14281c" stroke="#7cfc9a" stroke-width="1.5"/>
      <rect x="8" y="9" width="28" height="28" rx="4" fill="rgba(0,0,0,0.45)" stroke="#7cfc9a"/>
      <text x="22" y="28" font-family="'Press Start 2P', monospace" font-size="11" font-weight="bold" fill="#7cfc9a" text-anchor="middle">S</text>
      <text x="46" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffe6b0">Спавн</text>
    </g>
    <!-- Marker 2: NPC -->
    <g transform="translate(278, 60)">
      <rect width="242" height="46" rx="6" fill="#142032" stroke="#6db7ff" stroke-width="1.5"/>
      <rect x="8" y="9" width="28" height="28" rx="4" fill="rgba(0,0,0,0.45)" stroke="#6db7ff"/>
      <text x="22" y="28" font-family="'Press Start 2P', monospace" font-size="11" font-weight="bold" fill="#6db7ff" text-anchor="middle">N</text>
      <text x="46" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffe6b0">NPC</text>
    </g>
    <!-- Marker 3: Shop -->
    <g transform="translate(20, 116)">
      <rect width="242" height="46" rx="6" fill="#2c2814" stroke="#ffd166" stroke-width="1.5"/>
      <rect x="8" y="9" width="28" height="28" rx="4" fill="rgba(0,0,0,0.45)" stroke="#ffd166"/>
      <text x="22" y="28" font-family="'Press Start 2P', monospace" font-size="11" font-weight="bold" fill="#ffd166" text-anchor="middle">$</text>
      <text x="46" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffe6b0">Лавка</text>
    </g>
    <!-- Marker 4: Chest -->
    <g transform="translate(278, 116)">
      <rect width="242" height="46" rx="6" fill="#2c2214" stroke="#d8a24a" stroke-width="1.5"/>
      <rect x="8" y="9" width="28" height="28" rx="4" fill="rgba(0,0,0,0.45)" stroke="#d8a24a"/>
      <text x="22" y="28" font-family="'Press Start 2P', monospace" font-size="11" font-weight="bold" fill="#d8a24a" text-anchor="middle">C</text>
      <text x="46" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffe6b0">Хранилище</text>
    </g>
    <!-- Marker 5: Enemy -->
    <g transform="translate(20, 172)">
      <rect width="242" height="46" rx="6" fill="#2c1414" stroke="#ff5a5a" stroke-width="1.5"/>
      <rect x="8" y="9" width="28" height="28" rx="4" fill="rgba(0,0,0,0.45)" stroke="#ff5a5a"/>
      <text x="22" y="28" font-family="'Press Start 2P', monospace" font-size="11" font-weight="bold" fill="#ff5a5a" text-anchor="middle">!</text>
      <text x="46" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffe6b0">Враг</text>
    </g>
    <!-- Marker 6: Exit -->
    <g transform="translate(278, 172)">
      <rect width="242" height="46" rx="6" fill="#25142c" stroke="#c77dff" stroke-width="1.5"/>
      <rect x="8" y="9" width="28" height="28" rx="4" fill="rgba(0,0,0,0.45)" stroke="#c77dff"/>
      <text x="22" y="28" font-family="'Press Start 2P', monospace" font-size="11" font-weight="bold" fill="#c77dff" text-anchor="middle">X</text>
      <text x="46" y="29" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffe6b0">Выход</text>
    </g>

    <text x="20" y="250" font-family="'Press Start 2P', monospace" font-size="9" fill="#7cfc9a">✓ РЕЗУЛЬТАТ:</text>
    <text x="20" y="275" font-family="sans-serif" font-size="13" fill="#b9ad93">• Все 6 карточек полностью помещаются в ширину 260px без горизонтальной обрезки.</text>
    <text x="20" y="298" font-family="sans-serif" font-size="13" fill="#b9ad93">• Чёткая иконка-буква в цветном контрастном квадрате + читаемый текст.</text>
    <text x="20" y="321" font-family="sans-serif" font-size="13" fill="#b9ad93">• Интерактивное выделение золотой рамкой при клике.</text>
  </svg>`;
  composites.push({ input: Buffer.from(markersDemoSvg), left: 30, top: markersStartY + 45 });

  // Add turning controls demo
  const turningDemoSvg = `
  <svg width="550" height="380">
    <rect width="550" height="380" fill="#0c0e16" rx="8" stroke="rgba(109,183,255,0.3)"/>
    <text x="20" y="32" font-family="'Press Start 2P', monospace" font-size="11" fill="#6db7ff">ПОВОРОТ NPC ПРИ ДВИЖЕНИИ И ИНСПЕКТОР</text>
    <rect x="20" y="48" width="510" height="1" fill="rgba(255,255,255,0.1)"/>

    <text x="20" y="80" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffe6b0">1. Автоматический поворот (Auto-Facing):</text>
    <text x="20" y="105" font-family="sans-serif" font-size="13" fill="#b9ad93">• При патрулировании (Patrol) влево ↔ вправо NPC разворачивается лицом по ходу.</text>
    <text x="20" y="128" font-family="sans-serif" font-size="13" fill="#b9ad93">• При брожении (Wander) автоматически поворачивается по вектору движения dx.</text>
    <text x="20" y="151" font-family="sans-serif" font-size="13" fill="#b9ad93">• В деревне (village.js) NPC смотрит прямо на игрока при приближении.</text>

    <text x="20" y="195" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffe6b0">2. Ручное управление направлением в редакторе:</text>
    <g transform="translate(20, 210)">
      <rect width="120" height="34" rx="4" fill="#2b1e13" stroke="rgba(255,190,90,0.5)"/>
      <text x="60" y="22" font-family="'Press Start 2P', monospace" font-size="9" fill="#f3d9a4" text-anchor="middle">◀ ВЛЕВО</text>
    </g>
    <g transform="translate(150, 210)">
      <rect width="120" height="34" rx="4" fill="#4a3520" stroke="#ffb45e"/>
      <text x="60" y="22" font-family="'Press Start 2P', monospace" font-size="9" fill="#ffe6b0" text-anchor="middle">ВПРАВО ▶</text>
    </g>
    <g transform="translate(280, 210)">
      <rect width="230" height="34" rx="4" fill="#1b301c" stroke="#7cfc9a"/>
      <text x="115" y="22" font-family="'Press Start 2P', monospace" font-size="8" fill="#7cfc9a" text-anchor="middle">▶ ТЕСТ ДВИЖЕНИЯ NPC</text>
    </g>

    <text x="20" y="280" font-family="sans-serif" font-size="13" fill="#b9ad93">• Кнопки «Влево/Вправо» зеркально разворачивают модельку NPC и сохраняются в JSON.</text>
    <text x="20" y="303" font-family="sans-serif" font-size="13" fill="#b9ad93">• Кнопка «ТЕСТ ДВИЖЕНИЯ» прямо на холсте редактора запускает живой патруль,</text>
    <text x="20" y="326" font-family="sans-serif" font-size="13" fill="#b9ad93">  демонстрируя развороты и полнотелую анимацию в реальном времени!</text>
  </svg>`;
  composites.push({ input: Buffer.from(turningDemoSvg), left: 610, top: markersStartY + 45 });

  const finalBuf = await canvas.composite(composites).png().toBuffer();

  const previewOut = path.join(PREVIEWS_DIR, '11_npc_animations_and_fire_glow.png');
  fs.writeFileSync(previewOut, finalBuf);
  console.log(`Saved preview to ${previewOut}`);

  const artifactOut = path.join(ARTIFACT_DIR, '11_npc_animations_and_fire_glow.png');
  fs.writeFileSync(artifactOut, finalBuf);
  console.log(`Saved preview to ${artifactOut}`);
}

createShowcase().catch(err => {
  console.error(err);
  process.exit(1);
});

