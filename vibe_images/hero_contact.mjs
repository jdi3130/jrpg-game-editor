import fs from 'node:fs';
import sharp from 'sharp';

// Контактный лист всех героев: строки — действия, колонки — кадры, чтобы
// одним взглядом проверить консистентность стойки, масштаба и линии стоп.
const heroes = ['warrior', 'mage', 'ranger', 'universal'];
const actions = ['idle', 'walk', 'attack'];
const scale = 2;
const cell = 128 * scale;

const composites = [];
for (const [row, act] of actions.entries()) {
  for (const [col, hero] of heroes.entries()) {
    const sheet = fs.readFileSync(`public/assets/sprites/${hero}/${act}.png`);
    for (const frame of [0, 1]) {
      const crop = await sharp(sheet)
        .extract({ left: frame * 128, top: 0, width: 128, height: 128 })
        .resize(cell, cell, { kernel: 'nearest' })
        .toBuffer();
      composites.push({ input: crop, left: (col * 2 + frame) * cell, top: row * cell });
    }
  }
}

const out = await sharp({
  create: { width: heroes.length * 2 * cell, height: actions.length * cell, channels: 4, background: { r: 26, g: 24, b: 22, alpha: 1 } }
})
  .composite(composites)
  .png()
  .toBuffer();

fs.writeFileSync('vibe_images/hero_contact_sheet.png', out);
console.log(`vibe_images/hero_contact_sheet.png ${out.length / 1024}KB, строки: ${actions.join(' / ')}, пары колонок: ${heroes.join(' / ')}`);
