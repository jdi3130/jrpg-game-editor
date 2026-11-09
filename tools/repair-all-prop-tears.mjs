import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROPS_DIR = path.join(ROOT, 'public/assets/jrpg/props');

async function repairFile(filePath) {
  const meta = await sharp(filePath).metadata();
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const d = Buffer.from(data);
  let repairedCount = 0;

  for (let pass = 0; pass < 3; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (d[idx + 3] < 30) {
          const up = ((y - 1) * w + x) * 4;
          const down = ((y + 1) * w + x) * 4;
          const left = (y * w + (x - 1)) * 4;
          const right = (y * w + (x + 1)) * 4;

          const upSolid = d[up + 3] > 60;
          const downSolid = d[down + 3] > 60;
          const leftSolid = d[left + 3] > 60;
          const rightSolid = d[right + 3] > 60;

          if ((upSolid && downSolid) || (leftSolid && rightSolid)) {
            let r = 0, g = 0, b = 0, count = 0;
            if (upSolid) { r += d[up]; g += d[up + 1]; b += d[up + 2]; count++; }
            if (downSolid) { r += d[down]; g += d[down + 1]; b += d[down + 2]; count++; }
            if (leftSolid) { r += d[left]; g += d[left + 1]; b += d[left + 2]; count++; }
            if (rightSolid) { r += d[right]; g += d[right + 1]; b += d[right + 2]; count++; }

            if (count > 0) {
              d[idx] = Math.round(r / count);
              d[idx + 1] = Math.round(g / count);
              d[idx + 2] = Math.round(b / count);
              d[idx + 3] = 255;
              repairedCount++;
            }
          }
        }
      }
    }
  }

  if (repairedCount > 0) {
    const out = await sharp(d, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(filePath, out);
    console.log(`  + Repaired ${repairedCount} internal tears in ${path.basename(filePath)}`);
  }
}

async function main() {
  console.log('Scanning and repairing all prop textures...');
  const files = fs.readdirSync(PROPS_DIR).filter(f => f.endsWith('.png'));
  for (const f of files) {
    await repairFile(path.join(PROPS_DIR, f));
  }
  console.log('All prop textures checked and repaired.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

