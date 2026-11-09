import fs from 'node:fs';
import sharp from 'sharp';

// Проверяет собранные шиты: все герои должны стоять на одной линии стоп
// и иметь сопоставимый рост в ячейке, иначе в бою они «плавают».
async function frameBox(buffer, left, size) {
  const { data, info } = await sharp(buffer)
    .extract({ left, top: 0, width: size, height: size })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { w: maxX - minX + 1, h: maxY - minY + 1, top: minY, feet: maxY, cx: Math.round((minX + maxX) / 2) };
}

for (const hero of ['warrior', 'mage', 'ranger', 'universal']) {
  for (const act of ['idle', 'walk', 'attack']) {
    const buffer = fs.readFileSync(`public/assets/sprites/${hero}/${act}.png`);
    const { width, height } = await sharp(buffer).metadata();
    const cols = Math.round(width / height);
    const parts = [];
    for (let c = 0; c < cols; c++) {
      const b = await frameBox(buffer, c * height, height);
      parts.push(`f${c}: h${b.h} feet${b.feet} cx${b.cx}`);
    }
    console.log(`${hero}/${act}`.padEnd(20) + parts.join('   '));
  }
}
