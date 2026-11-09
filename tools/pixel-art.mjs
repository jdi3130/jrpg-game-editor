// Конвейер пиксель-арта: AI-рендер 1024px -> чистый пиксель-спрайт 128px с прозрачным фоном.
//
//   node tools/pixel-art.mjs key <src> <dst> [--size=128] [--colors=48] [--key=ff00ff]
//   node tools/pixel-art.mjs align <src> <dst> [--cell=128] [--feet=122] [--cx=64]
//   node tools/pixel-art.mjs sheet <out.png> --cell=128 <frame1.png> <frame2.png> ...
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const cmd = args[0];
// Модуль служит и CLI, и библиотекой для сборщиков ассетов (tools/build-hero-sprites.mjs).
const isMain = Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};

// Удаляет хрома-ключевой фон и прилегающие к нему полупрозрачные гало.
export async function chromaKey(buffer, { size, colors, key }) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .resize(size, size, { kernel: 'nearest', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const kr = parseInt(key.slice(0, 2), 16);
  const kg = parseInt(key.slice(2, 4), 16);
  const kb = parseInt(key.slice(4, 6), 16);
  const tolerance = 96;
  const despillLimit = tolerance * 2.6;

  for (let i = 0; i < data.length; i += 4) {
    const drift = Math.abs(data[i] - kr) + Math.abs(data[i + 1] - kg) + Math.abs(data[i + 2] - kb);
    if (drift < tolerance) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      continue;
    }
    // Пиксели края спрайта впитывают цвет фона. Снимаем магентовый присед, иначе по контуру
    // персонажа идёт розовая бахрома, и подмешиваем прозрачность там, где фон ещё заметен.
    if (drift < despillLimit) {
      const spill = Math.max(data[i], data[i + 2]) - data[i + 1];
      if (spill > 12) {
        const neutral = data[i + 1];
        data[i] = Math.round(data[i] - (data[i] - neutral) * 0.85);
        data[i + 2] = Math.round(data[i + 2] - (data[i + 2] - neutral) * 0.85);
      }
      data[i + 3] = Math.round(((drift - tolerance) / (despillLimit - tolerance)) * 255);
      continue;
    }
    // Тёмные пиксели фона, оставшиеся после ключа, тоже убираем: пиксель-арт не должен иметь грязных краёв.
    if (data[i] < 24 && data[i + 1] < 24 && data[i + 2] < 24) {
      data[i + 3] = 0;
    }
  }

  // Модель иногда дорисовывает под ногами розовую полосу «земли»: по цвету она уже
  // не фон, но и висит отдельно от силуэта. Снимаем магенту, у которой нет соседей
  // сверху и снизу, — у настоящего тела такие соседи всегда есть.
  const alphaAt = (x, y) => (x >= 0 && x < info.width && y >= 0 && y < info.height
    ? data[(y * info.width + x) * 4 + 3] > 24
    : false);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] <= 24) continue;
      const leaning = data[i] - data[i + 1] > 18 && data[i + 2] - data[i + 1] > 18 && Math.abs(data[i] - data[i + 2]) < 45;
      if (leaning && !alphaAt(x, y - 1) && !alphaAt(x, y + 1)) data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ palette: true, colors, quality: 100, compressionLevel: 9 })
    .toBuffer();
}

// Ставит кадр на общую линию стоп и ось стойки без масштабирования: сдвиг целыми
// пикселями сохраняет сетку пиксель-арта, а герой не «прыгает» между действиями.
// По горизонтали кадр центрируется по опорной ноге (низ спрайта), иначе оружие или
// плащ сдвигают фигуру в сторону от центра коллайдера.
export async function alignToBaseline(buffer, { cell, feet, cx }) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 24;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('кадр полностью прозрачный');

  let stanceMin = width;
  let stanceMax = -1;
  for (let y = Math.max(minY, maxY - 7); y <= maxY; y++) {
    for (let x = 0; x < width; x++) {
      if (!opaque(x, y)) continue;
      if (x < stanceMin) stanceMin = x;
      if (x > stanceMax) stanceMax = x;
    }
  }
  const stanceCenter = (stanceMin + stanceMax) / 2;

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const content = await sharp(buffer)
    .ensureAlpha()
    .extract({ left: minX, top: minY, width: boxWidth, height: boxHeight })
    .png()
    .toBuffer();

  return sharp({
    create: { width: cell, height: cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: content, left: Math.round(cx - stanceCenter + minX), top: feet - boxHeight + 1 }])
    .png({ palette: true, colors: 48, quality: 100, compressionLevel: 9 })
    .toBuffer();
}

// Растягивает цвет непрозрачных пикселей на прозрачный фон, альфа остаётся нулевой.
// Мипмапы усредняют RGB вместе с прозрачными текселями: без такой подложки силуэт
// при уменьшении на экране темнеет и обрастает чёрным ореолом.
export async function alphaBleed(buffer, passes = 8) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const filled = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) filled[i] = data[i * 4 + 3] > 0 ? 1 : 0;

  for (let pass = 0; pass < passes; pass++) {
    const next = filled.slice();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (filled[index]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighbour = ny * width + nx;
          if (!filled[neighbour]) continue;
          const i = neighbour * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2];
          n++;
        }
        if (!n) continue;
        const i = index * 4;
        data[i] = Math.round(r / n);
        data[i + 1] = Math.round(g / n);
        data[i + 2] = Math.round(b / n);
        next[index] = 1;
      }
    }
    filled.set(next);
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
}

// Собирает кадры в сетку cell x cell, строками по --cols.
export async function buildSheet(frames, cell, cols) {
  const buffers = [];
  for (const [index, file] of frames.entries()) {
    buffers.push({
      input: await sharp(file).resize(cell, cell, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      left: (index % cols) * cell,
      top: Math.floor(index / cols) * cell
    });
  }
  const rows = Math.ceil(frames.length / cols);
  const sheet = await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(buffers)
    .png({ compressionLevel: 9 })
    .toBuffer();
  return alphaBleed(sheet);
}

if (isMain && cmd === 'key') {
  const [src, dst] = args.filter((a) => !a.startsWith('--')).slice(1);
  const out = await chromaKey(fs.readFileSync(src), {
    size: Number(flag('size', 128)),
    colors: Number(flag('colors', 48)),
    key: flag('key', 'ff00ff')
  });
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, out);
  console.log(`${path.basename(dst)} ${(out.length / 1024).toFixed(1)}KB`);
} else if (isMain && cmd === 'align') {
  const [src, dst] = args.filter((a) => !a.startsWith('--')).slice(1);
  const out = await alignToBaseline(fs.readFileSync(src), {
    cell: Number(flag('cell', 128)),
    feet: Number(flag('feet', 122)),
    cx: Number(flag('cx', 64))
  });
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, out);
  console.log(`${path.basename(dst)} aligned ${flag('cell', 128)}px, feet ${flag('feet', 122)}`);
} else if (isMain && cmd === 'sheet') {
  const out = args[1];
  const cell = Number(flag('cell', 128));
  const cols = Number(flag('cols', 4));
  const frames = args.slice(2).filter((a) => !a.startsWith('--'));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const buf = await buildSheet(frames, cell, cols);
  fs.writeFileSync(out, buf);
  console.log(`${out}: ${frames.length} кадров, ${cols * cell}x${Math.ceil(frames.length / cols) * cell}, ${(buf.length / 1024).toFixed(1)}KB`);
} else if (isMain) {
  console.log('usage: pixel-art.mjs key <src> <dst> | align <src> <dst> | sheet <out> <frames...>');
}
