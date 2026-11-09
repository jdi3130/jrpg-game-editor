import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Печатает content-box каждого кадра: во сколько пикселей реально стоит фигура
// и где её линия стоп — нужно, чтобы все герои были одного роста в бою.
async function box(pixels, width, height) {
  let minX = width, maxX = -1, minY = height, maxY = -1, opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 24) {
        opaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1, fill: opaque / (width * height) };
}

async function report(label, buffer, cell) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await box(data, info.width, info.height);
  console.log(
    `${label.padEnd(28)} ${info.width}x${info.height}  box ${b.w}x${b.h}  top ${b.minY}  feet ${b.maxY}  cx ${Math.round((b.minX + b.maxX) / 2)}  fill ${(b.fill * 100).toFixed(1)}%`
  );
  if (cell) {
    // кадры шита лежат в одну строку квадратными ячейками
    const cols = Math.round(info.width / info.height);
    for (let c = 0; c < cols; c++) {
      const cellBuf = await sharp(buffer).extract({ left: c * info.height, top: 0, width: info.height, height: info.height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const cb = await box(cellBuf.data, info.height, info.height);
      console.log(`   frame ${c}: box ${cb.w}x${cb.h}  top ${cb.minY}  feet ${cb.maxY}  cx ${Math.round((cb.minX + cb.maxX) / 2)}`);
    }
  }
}

const args = process.argv.slice(2);
for (const hero of ['warrior', 'mage', 'ranger', 'universal']) {
  if (hero === 'warrior') {
    for (const act of ['idle', 'walk', 'attack']) {
      await report(`warrior/${act}`, fs.readFileSync(`public/assets/sprites/warrior/${act}.png`), true);
    }
    continue;
  }
  for (const act of ['idle', 'walk', 'attack']) {
    for (const f of [1, 2]) {
      const file = path.join('vibe_images', `px_${hero}_${act}${f}_k.png`);
      if (fs.existsSync(file)) await report(`${hero}/${act}${f}`, fs.readFileSync(file));
    }
  }
}
