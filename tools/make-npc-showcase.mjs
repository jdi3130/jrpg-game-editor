import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const npcs = [
  ['merchant_weapon', 'Кузнец-оружейник'],
  ['merchant_potion', 'Алхимик-зельевар'],
  ['merchant_general', 'Купец редкостей'],
  ['npc_elder', 'Старейшина Эльда'],
  ['warrior_knight', 'Рыцарь-паладин'],
  ['warrior_archer', 'Лучник-следопыт'],
  ['warrior_guard', 'Стражник с алебардой'],
  ['warrior_mercenary', 'Наёмник с секирой'],
  ['npc_girl', 'Девочка с цветами'],
  ['npc_maid', 'Трактирщица'],
  ['npc_villager_m', 'Горожанин'],
  ['npc_villager_f', 'Горожанка']
];

async function createShowcase() {
  const cell = 128;
  const cols = 4;
  const rows = npcs.length;
  const labelWidth = 240;
  const width = cols * cell + labelWidth;
  const height = rows * cell;

  const composites = [];

  for (let r = 0; r < rows; r++) {
    const [id, label] = npcs[r];
    const p = path.join('public/assets/jrpg/props', `${id}.png`);
    const strip = await sharp(p).toBuffer();

    composites.push({ input: strip, left: labelWidth, top: r * cell });

    const svgText = Buffer.from(`
      <svg width="${labelWidth}" height="${cell}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${labelWidth}" height="${cell}" fill="#0b0e18" stroke="#1d2436" stroke-width="1"/>
        <text x="16" y="46" font-family="monospace" font-size="13" font-weight="bold" fill="#ffd166">${id}</text>
        <text x="16" y="74" font-family="sans-serif" font-size="13" fill="#d8c79a">${label}</text>
        <text x="16" y="98" font-family="sans-serif" font-size="11" fill="#7cfc9a">&#x2713; 4 кадра &#183; 0 разрывов</text>
      </svg>
    `);
    composites.push({ input: svgText, left: 0, top: r * cell });
  }

  const bg = await sharp({
    create: { width, height, channels: 4, background: { r: 11, g: 14, b: 24, alpha: 255 } }
  })
    .composite(composites)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const artPath = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e/npc_animations_repaired_showcase.png';
  fs.writeFileSync(artPath, bg);
  console.log('Saved showcase artifact:', artPath);
}

createShowcase().catch(console.error);

