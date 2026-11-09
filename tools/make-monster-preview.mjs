import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const monsters = [
  ['enemy_skeleton', 'Скелет-воин', '#ff5a5a'],
  ['enemy_goblin', 'Гоблин-разбойник', '#7cfc9a'],
  ['enemy_cultist', 'Тёмный культист', '#c77dff'],
  ['enemy_demon', 'Инфернальный демон', '#ff4500'],
  ['enemy_gargoyle', 'Ожившая горгулья', '#ffd166'],
  ['enemy_slime', 'Ядовитая слизь', '#2ecc71']
];

async function createShowcase() {
  const cell = 128;
  const cols = 4;
  const rows = monsters.length;
  const labelWidth = 260;
  const width = cols * cell + labelWidth;
  const height = rows * cell;

  const composites = [];

  for (let r = 0; r < rows; r++) {
    const [id, label, color] = monsters[r];
    const p = path.join('public/assets/jrpg/props', `${id}.png`);
    const strip = await sharp(p).toBuffer();

    composites.push({ input: strip, left: labelWidth, top: r * cell });

    const svgText = Buffer.from(`
      <svg width="${labelWidth}" height="${cell}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${labelWidth}" height="${cell}" fill="#0a0d16" stroke="#1c2438" stroke-width="1"/>
        <text x="16" y="44" font-family="monospace" font-size="13" font-weight="bold" fill="${color}">${id}</text>
        <text x="16" y="72" font-family="sans-serif" font-size="14" fill="#f0fff4">${label}</text>
        <text x="16" y="96" font-family="sans-serif" font-size="11" fill="#8f9bb3">&#x2713; 4 кадра &#183; 0 дыр &#183; NPC-поведение</text>
      </svg>
    `);
    composites.push({ input: svgText, left: 0, top: r * cell });
  }

  const bg = await sharp({
    create: { width, height, channels: 4, background: { r: 10, g: 13, b: 22, alpha: 255 } }
  })
    .composite(composites)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const artPath = 'C:/Users/DELL/.gemini/antigravity/brain/03589ba1-0808-4497-855e-db76aaab623e/monster_npcs_showcase.png';
  fs.writeFileSync(artPath, bg);
  console.log('Saved monster showcase artifact:', artPath);
}

createShowcase().catch(console.error);

