import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '_previews');

const escapeXml = value => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const listImages = async (relativeDir, pattern = /\.png$/i) => {
  const dir = path.join(root, relativeDir);
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && pattern.test(entry.name))
    .map(entry => path.join(dir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
};

const listImagesRecursive = async (relativeDir, pattern = /\.png$/i) => {
  const dir = path.join(root, relativeDir);
  const results = [];
  const walk = async current => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && pattern.test(entry.name)) results.push(full);
    }
  };
  await walk(dir);
  return results.sort((a, b) => a.localeCompare(b));
};

const labelSvg = (text, width, height) => {
  const short = text.length > 34 ? `${text.slice(0, 31)}...` : text;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#0b0b0b"/>
    <text x="8" y="22" font-family="Consolas, monospace" font-size="13" fill="#e5e7eb">${escapeXml(short)}</text>
  </svg>`);
};

const makeSheet = async ({ name, files, thumb = 200, cols = 6, labelHeight = 34 }) => {
  if (!files.length) {
    console.log(`skip ${name}: no files`);
    return;
  }

  const cellHeight = thumb + labelHeight;
  const rows = Math.ceil(files.length / cols);
  const width = cols * thumb;
  const height = rows * cellHeight;
  const composites = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const column = index % cols;
    const row = Math.floor(index / cols);
    const left = column * thumb;
    const top = row * cellHeight;

    const thumbBuffer = await sharp(file)
      .resize(thumb, thumb, {
        fit: 'contain',
        background: { r: 18, g: 18, b: 18, alpha: 1 }
      })
      .png()
      .toBuffer();

    composites.push({ input: thumbBuffer, left, top });
    composites.push({
      input: labelSvg(path.basename(file), thumb, labelHeight),
      left,
      top: top + thumb
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#0b0b0b'
    }
  })
    .composite(composites)
    .png()
    .toFile(path.join(outDir, name));

  console.log(`${name}: ${files.length} files -> ${width}x${height}`);
};

const generatedDir = async category => listImages(`public/assets/jrpg/${category}`);

const pxHeroFiles = (await listImages('vibe_images', /^px_.*\.png$/i))
  .filter(file => {
    const base = path.basename(file);
    return !/_(a|k)\.png$/i.test(base)
      && !/^tmp_/i.test(base)
      && !/^px_frames\.png$/i.test(base)
      && !/^px_compare\.png$/i.test(base)
      && !/keyed/i.test(base);
  });

const uiKitNames = new Set([
  'ui_kit.png',
  'ui_kit_zoom.png',
  'map_kit.png',
  'warrior_sheets.png',
  'contact_sheet.png',
  'hero_contact_sheet.png',
  'boss_contact.png',
  'enemy_contact.png'
]);
const uiKitFiles = (await listImages('vibe_images', /^.*\.png$/i))
  .filter(file => uiKitNames.has(path.basename(file)));

await mkdir(outDir, { recursive: true });

await makeSheet({
  name: '01_jrpg_raw_sheets.png',
  files: await listImages('vibe_images/jrpg_raw'),
  thumb: 240,
  cols: 5,
  labelHeight: 38
});

await makeSheet({
  name: '02_generated_hero.png',
  files: await generatedDir('hero'),
  thumb: 190,
  cols: 6
});

await makeSheet({
  name: '03_generated_enemies.png',
  files: await generatedDir('enemies'),
  thumb: 190,
  cols: 6
});

await makeSheet({
  name: '04_generated_tiles.png',
  files: await generatedDir('tiles'),
  thumb: 220,
  cols: 6,
  labelHeight: 40
});

await makeSheet({
  name: '05_generated_props_items_gui_vfx.png',
  files: [
    ...(await generatedDir('props')),
    ...(await generatedDir('items')),
    ...(await generatedDir('gui')),
    ...(await generatedDir('vfx'))
  ],
  thumb: 170,
  cols: 8,
  labelHeight: 36
});

await makeSheet({
  name: '06_menu_preview.png',
  files: (await listImages('vibe_images/menu_preview'))
    .filter(file => !/fonts/i.test(path.dirname(file))),
  thumb: 430,
  cols: 3,
  labelHeight: 42
});

await makeSheet({
  name: '07_px_hero_sheets.png',
  files: pxHeroFiles,
  thumb: 230,
  cols: 6,
  labelHeight: 40
});

await makeSheet({
  name: '08_skill_icons.png',
  files: await listImages('vibe_images', /^ic_.*\.png$/i),
  thumb: 180,
  cols: 7,
  labelHeight: 38
});

await makeSheet({
  name: '09_ui_map_kit.png',
  files: uiKitFiles,
  thumb: 300,
  cols: 4,
  labelHeight: 42
});
