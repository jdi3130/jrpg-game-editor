let TILE = 48;
const ASSETS = '../public/assets/jrpg/';
const $ = id => document.getElementById(id);

const TILES = [
  ['meadow', 'Луг'], ['grass_flowers', 'Цветы'], ['dirt_trail', 'Тропа'], ['cobble_path', 'Брусчатка'],
  ['stone_bricks', 'Камень'], ['forest_floor', 'Лес'], ['graveyard', 'Кладбище'], ['shallow_water', 'Мелководье'],
  ['deep_water', 'Глубокая вода'], ['grass_dirt_edge', 'Край трава/земля'], ['grass_stone_edge', 'Край трава/камень'],
  ['grass_water_shore', 'Берег'], ['grass_water_corner', 'Угол воды'], ['dirt_cobble_edge', 'Край земля/брусчатка'],
  ['cave_rock', 'Скала'], ['stone_broken', 'Разрушенный камень'], ['stone_cave_edge', 'Край пещеры'], ['cave_water_edge', 'Край пещеры/вода'],
  // Боевые и мрачные тайлы
  ['crypt_tiles', 'Плиты склепа'], ['lava_stone', 'Лавовый камень'], ['swamp_mud', 'Болотная топь'], ['blood_stone', 'Кровавый алтарь'],
  // Новые разнообразные тайлы (интерьеры, руины, биомы)
  ['wood_planks', 'Деревянный пол'], ['marble_sanctuary', 'Мрамор святилища'], ['desert_sand', 'Пустынный песок'],
  ['snow_ice', 'Снег и мерзлота'], ['toxic_sludge', 'Токсичная трясина'], ['obsidian_void', 'Обсидиановая бездна'],
  ['dungeon_flagstones', 'Плиты темницы'], ['ruin_cobbles', 'Замшелые руины'],
  // 10 Новых городских тайлов (мостовые, площади, набережные)
  ['city_cobblestone_square', 'Городская брусчатка'],
  ['city_stone_pavement', 'Каменный тротуар'],
  ['city_brick_road', 'Клинкерный кирпич'],
  ['city_curb_stone', 'Городской бордюр'],
  ['city_plaza_mosaic', 'Мозаичная площадь'],
  ['city_canal_quay', 'Каменная набережная'],
  ['city_wood_dock', 'Деревянный причал'],
  ['city_castle_marble', 'Имперский мрамор'],
  ['city_roof_tiles', 'Черепица крыш'],
  ['city_garden_path', 'Парковая дорожка'],
  // Тропинки, края и переходы на брусчатку
  ['trail_edge', 'Край тропинки (земля/трава)'],
  ['trail_to_cobble', 'Переход тропинка/брусчатка'],
  ['cobble_pavement', 'Отдельная брусчатка']
];
const TILE_ID = new Set(TILES.map(t => t[0]));
const BLOCK_TILES = new Set(['deep_water', 'shallow_water', 'cave_water_edge', 'cave_rock', 'stone_cave_edge', 'stone_broken', 'lava_stone', 'toxic_sludge', 'obsidian_void']);
const PATH_TILES = new Set([
  'dirt_trail', 'cobble_path', 'stone_bricks', 'crypt_tiles', 'wood_planks', 'marble_sanctuary', 'dungeon_flagstones', 'ruin_cobbles',
  'city_cobblestone_square', 'city_stone_pavement', 'city_brick_road', 'city_curb_stone', 'city_plaza_mosaic', 'city_canal_quay', 'city_wood_dock', 'city_castle_marble', 'city_garden_path',
  'trail_edge', 'trail_to_cobble', 'cobble_pavement'
]);

const TILE_CATS = {
  all: 'Все (43)',
  city: 'Город (17)',
  nature: 'Природа (9)',
  dungeon: 'Подземелье (8)',
  water: 'Вода (5)',
  hazard: 'Опасности (5)'
};

const TILE_CAT_MAP = {
  city_cobblestone_square: 'city',
  city_stone_pavement: 'city',
  city_brick_road: 'city',
  city_curb_stone: 'city',
  city_plaza_mosaic: 'city',
  city_canal_quay: 'city',
  city_wood_dock: 'city',
  city_castle_marble: 'city',
  city_roof_tiles: 'city',
  city_garden_path: 'city',
  cobble_path: 'city',
  stone_bricks: 'city',
  dirt_cobble_edge: 'city',
  wood_planks: 'city',
  trail_to_cobble: 'city',
  cobble_pavement: 'city',

  meadow: 'nature',
  grass_flowers: 'nature',
  dirt_trail: 'nature',
  trail_edge: 'nature',
  forest_floor: 'nature',
  grass_dirt_edge: 'nature',
  grass_stone_edge: 'nature',
  desert_sand: 'nature',
  snow_ice: 'nature',

  cave_rock: 'dungeon',
  stone_broken: 'dungeon',
  stone_cave_edge: 'dungeon',
  crypt_tiles: 'dungeon',
  dungeon_flagstones: 'dungeon',
  ruin_cobbles: 'dungeon',
  graveyard: 'dungeon',
  marble_sanctuary: 'dungeon',

  shallow_water: 'water',
  deep_water: 'water',
  grass_water_shore: 'water',
  grass_water_corner: 'water',
  cave_water_edge: 'water',

  lava_stone: 'hazard',
  swamp_mud: 'hazard',
  blood_stone: 'hazard',
  toxic_sludge: 'hazard',
  obsidian_void: 'hazard'
};

let selectedTileCat = 'all';

// Состояние трансформации тайлов кисти
let tileRot = 0; // 0..3 (x 90°)
let tileFlipX = false;
let tileFlipY = false;
let tileVariant = 'normal';

function getTileCellData(cell) {
  if (!cell) return { id: 'meadow', rot: 0, flipX: false, flipY: false, variant: 'normal' };
  if (typeof cell === 'string') return { id: cell, rot: 0, flipX: false, flipY: false, variant: 'normal' };
  return {
    id: cell.id || 'meadow',
    rot: ((cell.rot || 0) % 4 + 4) % 4,
    flipX: !!cell.flipX,
    flipY: !!cell.flipY,
    variant: cell.variant || 'normal'
  };
}

function makeTileCell(id) {
  if (tileRot === 0 && !tileFlipX && !tileFlipY && (!tileVariant || tileVariant === 'normal')) {
    return id;
  }
  return {
    id,
    rot: tileRot,
    flipX: tileFlipX,
    flipY: tileFlipY,
    variant: tileVariant
  };
}

const tileCanvasCache = new Map();

function getTileCanvas(tid, rot = 0, flipX = false, flipY = false, variant = 'normal') {
  rot = ((rot || 0) % 4 + 4) % 4;
  variant = variant || 'normal';
  const key = `${tid}|${rot}|${flipX ? 1 : 0}|${flipY ? 1 : 0}|${variant}`;
  if (tileCanvasCache.has(key)) return tileCanvasCache.get(key);

  const img = images.tiles[tid];
  if (!img) return null;

  const w = img.naturalWidth || img.width || 128;
  const h = img.naturalHeight || img.height || 128;

  if (rot === 0 && !flipX && !flipY && variant === 'normal') {
    tileCanvasCache.set(key, img);
    return img;
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  g.translate(w / 2, h / 2);
  if (rot !== 0) g.rotate(rot * Math.PI / 2);
  g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  const filter = variantFilter(variant);
  if (filter) { try { g.filter = filter; } catch {} }

  g.drawImage(img, -w / 2, -h / 2, w, h);
  tileCanvasCache.set(key, c);
  return c;
}

const PROPS = [
  // Базовая природа и утварь
  ['pine_tree', 'Сосна', true, 128], ['dead_tree', 'Сухое дерево', true, 104], ['boulder', 'Валун', true, 96],
  ['chest', 'Сундук', true, 98], ['signpost', 'Указатель', false, 78], ['barrel', 'Бочка', true, 76],
  ['crate', 'Ящик', true, 80], ['gravestone', 'Надгробие', false, 88], ['ruin_statue', 'Древняя статуя', true, 112],
  ['bones', 'Кости', false, 56], ['rune_stone', 'Рунный камень', true, 88],

  // Разнообразные костры и очаги
  ['campfire', 'Костёр (классик)', false, 96],
  ['campfire_pot', 'Костёр с котелком', true, 96],
  ['campfire_ashes', 'Пепелище костра', false, 84],
  ['campfire_ritual', 'Ритуальный синий костёр', false, 98],
  ['campfire_stones', 'Костёр в каменном круге', true, 96],
  ['campfire_beacon', 'Большой сигнальный костёр', true, 116],

  // Мелкие детали, сокровища и алхимия
  ['prop_potions', 'Стеллаж с зельями', true, 88],
  ['prop_gold_pile', 'Россыпь золота и рубинов', false, 76],
  ['prop_mushrooms', 'Светящиеся грибы пещеры', false, 78],
  ['prop_candles', 'Оплавленные свечи на черепе', false, 78],
  ['prop_urn', 'Античная урна / амфора', true, 80],
  ['prop_gargoyle', 'Каменная горгулья на постаменте', true, 116],
  ['prop_dragon_bones', 'Скелет древнего дракона', true, 220],

  // Боевые локации, подземелья и инферно (Diablo-стиль)
  ['sarcophagus', 'Саркофаг', true, 110], ['altar_blood', 'Алтарь крови', true, 114], ['skull_pile', 'Куча черепов', false, 80],
  ['iron_cage', 'Железная клетка', true, 116], ['dungeon_gate', 'Решётка темницы', true, 116], ['crypt_tomb', 'Склеп/Гробница', true, 120],
  ['stalagmite', 'Сталагмиты', true, 100], ['brazier_fire', 'Огненная чаша (аним)', true, 106],
  ['dark_crystal', 'Тёмный кристалл (аним)', true, 108], ['lava_fissure', 'Лавовая трещина (аним)', false, 96],
  ['pentagram', 'Пентаграмма', false, 110], ['bone_totem', 'Шаманский тотем', true, 116],
  ['corrupt_tree', 'Осквернённое дерево (аним)', true, 128], ['goblin_tent', 'Палатка гоблинов', true, 120],
  ['broken_wagon', 'Разбитая повозка', true, 110], ['ancient_shrine', 'Святилище рун (аним)', true, 116],

  // Городские объекты (высококачественные JRPG ассеты)
  ['fountain', 'Фонтан (аним)', true, 120], ['statue_hero', 'Статуя героя', true, 116],
  ['torch_standing', 'Уличный факел (аним)', false, 104], ['well', 'Колодец', true, 108],
  ['market_stall', 'Торговая лавка', true, 124], ['notice_board', 'Доска объявлений', true, 104],

  // Здания, таверны и разрушенные дома (256x256)
  ['house_wood', 'Деревянный дом', true, 210], ['house_stone', 'Таверна', true, 220],
  ['smithy', 'Кузница (аним)', true, 210],
  ['house_ruin_burnt', 'Обгоревший дом (руины)', true, 210],
  ['house_ruin_stone', 'Разрушенный каменный дом', true, 210],
  ['house_ruin_tower', 'Разрушенная башня', true, 220],
  ['house_witch_shack', 'Хижина ведьмы на сваях', true, 210],
  ['house_mausoleum', 'Готический мавзолей/склеп', true, 220],
  ['house_windmill', 'Ветряная мельница', true, 230],
  ['house_tavern_inn', 'Большая таверна/трактир', true, 230],
  ['house_chapel', 'Готическая часовня', true, 230],
  ['house_ruin_smithy', 'Разрушенная кузница', true, 210],
  ['house_war_tent', 'Военный походный шатёр', true, 210],
  ['house_watermill', 'Лесопилка с колесом', true, 220],
  ['house_hermit_cabin', 'Хижина отшельника', true, 200],

  // Торговцы и NPC (анимированное дыхание)
  ['merchant_weapon', 'Кузнец-оружейник (аним)', true, 106], ['merchant_potion', 'Алхимик (аним)', true, 106],
  ['merchant_general', 'Купец (аним)', true, 106], ['npc_elder', 'Старейшина Эльда (аним)', true, 106],
  ['npc_villager_m', 'Горожанин (аним)', true, 106], ['npc_villager_f', 'Горожанка (аним)', true, 106],
  ['npc_girl', 'Девочка с цветами (аним)', true, 98], ['npc_maid', 'Трактирщица (аним)', true, 106],

  // Воины и стража
  ['warrior_guard', 'Стражник с алебардой (аним)', true, 106], ['warrior_knight', 'Рыцарь-паладин (аним)', true, 106],
  ['warrior_archer', 'Лучник-следопыт (аним)', true, 106], ['warrior_mercenary', 'Наёмник с топором (аним)', true, 106],

  // Деревенские животные
  ['animal_horse', 'Лошадь (аним)', true, 116], ['animal_cow', 'Корова (аним)', true, 112],
  ['animal_sheep', 'Овца (аним)', true, 92], ['animal_dog', 'Пёс (аним)', true, 90],
  ['animal_cat', 'Кот (аним)', false, 72], ['animal_chicken', 'Петух (аним)', false, 68],

  // Монстры и существа (NPC)
  ['enemy_skeleton', 'Скелет-воин (аним)', true, 104],
  ['enemy_goblin', 'Гоблин-разбойник (аним)', true, 88],
  ['enemy_cultist', 'Тёмный культист (аним)', true, 106],
  ['enemy_demon', 'Инфернальный демон (аним)', true, 124],
  ['enemy_gargoyle', 'Ожившая горгулья (аним)', true, 116],
  ['enemy_slime', 'Ядовитая слизь (аним)', true, 84],

  // Стартовый персонаж (Герой)
  ['hero_player', 'Стартовый герой (аним/4 напр)', true, 106],

  // Маги и волшебники
  ['npc_mage', 'Архимаг с посохом (аним)', true, 108],

  // Магические порталы
  ['portal_arcane', 'Астральный портал (аним)', true, 128],
  ['portal_inferno', 'Инфернальный портал (аним)', true, 128],
  ['portal_void', 'Портал Бездны (аним)', true, 128],
  ['portal_nature', 'Портал Природы (аним)', true, 128]
];
const PROP_ID = new Set(PROPS.map(p => p[0]));
const PROP_DEF = Object.fromEntries(PROPS.map(p => [p[0], { name: p[1], solid: p[2], size: p[3] }]));

const MARKERS = [
  ['spawn', 'Спавн', '#7cfc9a', 'S'], ['npc', 'NPC', '#6db7ff', 'N'], ['shop', 'Лавка', '#ffd166', '$'],
  ['chest', 'Сундук', '#d8a24a', 'C'], ['enemy', 'Враг', '#ff5a5a', '!'], ['exit', 'Выход', '#c77dff', 'X']
];
const MARKER_ID = new Set(MARKERS.map(m => m[0]));
const MARKER_DEF = Object.fromEntries(MARKERS.map(m => [m[0], { name: m[1], color: m[2], symbol: m[3] }]));
const VARIANTS = [['normal', 'Оригинал'], ['warm', 'Тёплый'], ['cold', 'Холодный'], ['sepia', 'Сепия'], ['night', 'Ночной']];
const VARIANT_ID = new Set(VARIANTS.map(v => v[0]));

const canvas = $('editor');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const hoverTip = $('hoverTip');
const statusEl = $('status');
const infoBody = $('infoBody');
const paletteBody = $('paletteBody');
const zoomVal = $('zoomVal');

let cols = 26, rows = 17;
let tiles = [];
let props = [];
let markers = [];
let tool = 'tile';
let selectedTile = 'meadow';
let selectedProp = 'pine_tree';
let selectedMarker = 'npc';
let brush = 3;
let symmetry = 'off';
let selected = null;
let undoStack = [];
let pathStart = null;
let panning = false;
let panLast = null;
let spaceDown = false;
let hoverTile = null;
let images = { tiles: {}, props: {} };
const propCanvasCache = new Map();
let groundCanvas = null;
const view = { zoom: 1, cx: 0, cy: 0 };
let frame = 0;

/* ---------------- STATE ---------------- */

function blankTiles(w = cols, h = rows, fill = 'meadow') {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function resetMap(w = cols, h = rows) {
  cols = w; rows = h;
  tiles = blankTiles();
  props = []; markers = []; selected = null; pathStart = null;
  for (let x = 0; x < cols; x++) { tiles[0][x] = 'forest_floor'; tiles[rows - 1][x] = 'forest_floor'; }
  for (let y = 0; y < rows; y++) { tiles[y][0] = 'forest_floor'; tiles[y][cols - 1] = 'forest_floor'; }
  rebuildGround();
  centerView();
  renderInfo();
  updateStatus(true);
}

function snapshot() {
  undoStack.push(JSON.stringify({ cols, rows, tiles, props, markers }));
  if (undoStack.length > 80) undoStack.shift();
}

function restore(json) {
  const data = JSON.parse(json);
  cols = data.cols; rows = data.rows;
  tiles = data.tiles.map(r => r.slice());
  props = data.props || [];
  markers = data.markers || [];
  selected = null; pathStart = null;
  $('sizeW').value = cols; $('sizeH').value = rows;
  rebuildGround(); centerView(); renderInfo(); updateStatus(true);
}

function undo() {
  if (!undoStack.length) { setStatus('Нечего отменять'); return; }
  restore(undoStack.pop());
  setStatus('Отмена выполнена');
}

/* ---------------- COORDS ---------------- */

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function worldW() { return cols * TILE; }
function worldH() { return rows * TILE; }

function resizeCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(r.width));
  canvas.height = Math.max(240, Math.floor(r.height));
}

function centerView() {
  view.cx = worldW() / 2;
  view.cy = worldH() / 2;
}

function fitView() {
  resizeCanvas();
  const zx = canvas.width / worldW();
  const zy = canvas.height / worldH();
  view.zoom = clamp(Math.min(zx, zy) * 0.96, 0.04, 4);
  view.cx = worldW() / 2; view.cy = worldH() / 2;
  updateZoomLabel();
  initHeartbeat();
}

function initHeartbeat() {
  const ping = () => fetch('/heartbeat').catch(() => {});
  ping();
  setInterval(ping, 2000);
}

function screenToWorld(sx, sy) {
  return {
    x: view.cx + (sx - canvas.width / 2) / view.zoom,
    y: view.cy + (sy - canvas.height / 2) / view.zoom
  };
}

function worldToScreen(wx, wy) {
  return {
    x: (wx - view.cx) * view.zoom + canvas.width / 2,
    y: (wy - view.cy) * view.zoom + canvas.height / 2
  };
}

function tileFromWorld(wx, wy) {
  return { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
}

function inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < cols && ty < rows; }
function tileAt(tx, ty) { return inBounds(tx, ty) ? tiles[ty][tx] : null; }
function setTile(tx, ty, id) { if (inBounds(tx, ty) && TILE_ID.has(id)) tiles[ty][tx] = makeTileCell(id); }

/* ---------------- SYMMETRY ---------------- */

function symCells(tx, ty) {
  const out = new Set([tx + ',' + ty]);
  const add = (x, y) => { if (inBounds(x, y)) out.add(x + ',' + y); };
  if (symmetry === 'h' || symmetry === 'hv') add(cols - 1 - tx, ty);
  if (symmetry === 'v' || symmetry === 'hv') add(tx, rows - 1 - ty);
  if (symmetry === 'hv') add(cols - 1 - tx, rows - 1 - ty);
  return [...out].map(s => s.split(',').map(Number));
}

/* ---------------- PAINT ---------------- */

function brushCells(tx, ty) {
  const r = Math.floor((brush - 1) / 2);
  const cells = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) cells.push([tx + dx, ty + dy]);
  return cells;
}

function paintTiles(tx, ty) {
  const painted = new Set();
  for (const [cx, cy] of brushCells(tx, ty)) {
    for (const [sx, sy] of symCells(cx, cy)) {
      const key = sx + ',' + sy;
      if (!painted.has(key) && inBounds(sx, sy)) { painted.add(key); setTile(sx, sy, selectedTile); }
    }
  }
  if (painted.size) { rebuildGround(); updateStatus(true); }
}

function propAnchor(tx, ty) { return { x: tx + 0.5, y: ty + 0.8 }; }
function markerAnchor(tx, ty) { return { x: tx + 0.5, y: ty + 0.55 }; }

function placeProp(tx, ty) {
  for (const [cx, cy] of symCells(tx, ty)) {
    if (!inBounds(cx, cy)) continue;
    const a = propAnchor(cx, cy);
    const def = PROP_DEF[selectedProp];
    props.push({ type: selectedProp, x: a.x, y: a.y, solid: def.solid, scale: 1, rot: 0, flipX: false, flipY: false, variant: 'normal' });
  }
  updateStatus(true); renderInfo();
}

function placeMarker(tx, ty) {
  for (const [cx, cy] of symCells(tx, ty)) {
    if (!inBounds(cx, cy)) continue;
    const a = markerAnchor(cx, cy);
    markers.push({ type: selectedMarker, x: a.x, y: a.y, label: '' });
  }
  updateStatus(true); renderInfo();
}

function pickObject(wx, wy) {
  let best = null, bestD = Infinity;
  const consider = (kind, index, x, y, radius) => {
    const d = Math.hypot(wx - x, wy - y);
    if (d < radius && d < bestD) { bestD = d; best = { kind, index }; }
  };
  markers.forEach((m, i) => consider('marker', i, m.x * TILE, m.y * TILE, TILE * 0.55));
  props.forEach((p, i) => {
    const size = (PROP_DEF[p.type]?.size || 80) * (p.scale || 1);
    consider('prop', i, p.x * TILE, p.y * TILE - size * 0.45, Math.max(size * 0.5, TILE * 0.5));
  });
  return best;
}

function eraseAt(wx, wy) {
  const hit = pickObject(wx, wy);
  if (!hit) return false;
  if (hit.kind === 'prop') props.splice(hit.index, 1);
  else markers.splice(hit.index, 1);
  if (selected && selected.kind === hit.kind && selected.index === hit.index) selected = null;
  else if (selected && selected.index > hit.index) selected.index--;
  updateStatus(true); renderInfo();
  return true;
}

function floodFill(tx, ty) {
  const target = tileAt(tx, ty);
  const targetId = getTileCellData(target).id;
  if (!target || (targetId === selectedTile && !tileRot && !tileFlipX && !tileFlipY && tileVariant === 'normal')) return;
  const stack = [[tx, ty]];
  const seen = new Set([tx + ',' + ty]);
  let changed = 0;
  const newCell = makeTileCell(selectedTile);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (!inBounds(x, y)) continue;
    const cur = tileAt(x, y);
    if (getTileCellData(cur).id !== targetId) continue;
    tiles[y][x] = newCell;
    changed++;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = nx + ',' + ny;
      if (inBounds(nx, ny) && !seen.has(k) && getTileCellData(tileAt(nx, ny)).id === targetId) {
        seen.add(k);
        stack.push([nx, ny]);
      }
    }
  }
  if (changed) { rebuildGround(); updateStatus(true); }
}

function lineCells(x0, y0, x1, y1) {
  const cells = [];
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    cells.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return cells;
}

function paintPath(tx, ty) {
  if (!pathStart) { pathStart = { tx, ty }; setStatus(`Дорога: начало в (${tx}, ${ty}). Кликните конец.`); return; }
  const cells = lineCells(pathStart.tx, pathStart.ty, tx, ty);
  const painted = new Set();
  for (const [cx, cy] of cells) {
    for (const [sx, sy] of symCells(cx, cy)) {
      const key = sx + ',' + sy;
      if (!painted.has(key) && inBounds(sx, sy)) { painted.add(key); setTile(sx, sy, selectedTile); }
    }
  }
  pathStart = null;
  if (painted.size) rebuildGround();
  updateStatus(true);
}

/* ---------------- GROUND ---------------- */

function rebuildGround() {
  // Видимые тайлы рендерятся динамически на лету без расхода памяти на гигантский canvas
}

/* ---------------- DRAW ---------------- */

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function variantFilter(v) {
  return {
    normal: '', warm: 'sepia(.28) saturate(1.28) brightness(1.06)', cold: 'hue-rotate(-18deg) saturate(.92) brightness(.96)',
    sepia: 'sepia(.85) saturate(1.15) brightness(.92)', night: 'brightness(.72) saturate(.72) hue-rotate(185deg)'
  }[v] || '';
}

function propAnimInfo(img) {
  if (!img || !img.height) return null;
  if (img.width > img.height && img.width % img.height === 0) {
    const frames = img.width / img.height;
    if (frames > 1) return { frames, cell: img.height };
  }
  return null;
}

function getPropCanvas(p, frame = 0) {
  const anim = propAnimInfo(images.props[p.type]);
  const f = anim ? frame % anim.frames : 0;
  const key = `${p.type}|${p.rot || 0}|${p.flipX ? 1 : 0}|${p.flipY ? 1 : 0}|${p.variant || 'normal'}|${f}`;
  if (propCanvasCache.has(key)) return propCanvasCache.get(key);
  const img = images.props[p.type];
  if (!img) return null;
  const cell = anim ? anim.cell : img.height;
  const c = document.createElement('canvas');
  c.width = cell; c.height = cell;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const half = cell / 2;
  g.translate(half, half);
  g.rotate((p.rot || 0) * Math.PI / 2);
  g.scale(p.flipX ? -1 : 1, p.flipY ? -1 : 1);
  const filter = variantFilter(p.variant);
  if (filter) { try { g.filter = filter; } catch {} }
  g.drawImage(img, f * cell, 0, cell, cell, -half, -half, cell, cell);
  propCanvasCache.set(key, c);
  return c;
}

function isFireSource(type) {
  return /campfire|torch|brazier|smithy|candles|lava|crystal|fire|portal|mage/.test(type);
}

function drawFireGlowTo(c, px, py, size, type) {
  const t = performance.now() / 1000;
  const seed = (px * 3.7 + py * 7.1) % 100;
  const flicker = 0.88 + Math.sin(t * 7.2 + seed) * 0.09 + Math.sin(t * 18.5 + seed * 2.3) * 0.05;

  const isRitual = type === 'campfire_ritual';
  const isCrystal = type.includes('crystal');
  const isLava = type.includes('lava');
  const isCandle = type.includes('candles');
  const isEmbers = type === 'campfire_ashes';
  const isPortalArcane = type === 'portal_arcane';
  const isPortalInferno = type === 'portal_inferno';
  const isPortalVoid = type === 'portal_void';
  const isPortalNature = type === 'portal_nature';
  const isMage = type === 'npc_mage';

  const isPortal = isPortalArcane || isPortalInferno || isPortalVoid || isPortalNature;
  const flameOffsetY = isCandle ? size * 0.35 : (type.includes('torch') ? size * 0.72 : (isPortal ? size * 0.5 : size * 0.45));
  const fx = px;
  const fy = py - flameOffsetY;

  const glowRadius = Math.max(30, size * (isCandle ? 0.65 : (isLava || isPortal ? 1.4 : (isCrystal ? 1.2 : 1.15))) * flicker);

  c.save();
  const grad = c.createRadialGradient(fx, fy, 4, fx, fy, glowRadius);
  if (isPortalArcane) {
    grad.addColorStop(0, `rgba(120, 240, 255, ${0.65 * flicker})`);
    grad.addColorStop(0.35, `rgba(40, 140, 255, ${0.35 * flicker})`);
    grad.addColorStop(0.75, `rgba(10, 40, 180, ${0.12 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isPortalInferno) {
    grad.addColorStop(0, `rgba(255, 200, 50, ${0.68 * flicker})`);
    grad.addColorStop(0.35, `rgba(255, 60, 10, ${0.38 * flicker})`);
    grad.addColorStop(0.75, `rgba(140, 10, 0, ${0.15 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isPortalVoid) {
    grad.addColorStop(0, `rgba(240, 140, 255, ${0.62 * flicker})`);
    grad.addColorStop(0.35, `rgba(160, 40, 240, ${0.35 * flicker})`);
    grad.addColorStop(0.75, `rgba(60, 10, 120, ${0.12 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isPortalNature) {
    grad.addColorStop(0, `rgba(160, 255, 140, ${0.60 * flicker})`);
    grad.addColorStop(0.35, `rgba(40, 200, 80, ${0.32 * flicker})`);
    grad.addColorStop(0.75, `rgba(10, 100, 40, ${0.10 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isMage) {
    grad.addColorStop(0, `rgba(140, 220, 255, ${0.48 * flicker})`);
    grad.addColorStop(0.5, `rgba(80, 120, 240, ${0.20 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isRitual) {
    grad.addColorStop(0, `rgba(180, 235, 255, ${0.52 * flicker})`);
    grad.addColorStop(0.35, `rgba(130, 65, 255, ${0.30 * flicker})`);
    grad.addColorStop(0.7, `rgba(50, 10, 160, ${0.12 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isCrystal) {
    grad.addColorStop(0, `rgba(230, 170, 255, ${0.55 * flicker})`);
    grad.addColorStop(0.4, `rgba(160, 50, 240, ${0.32 * flicker})`);
    grad.addColorStop(0.8, `rgba(70, 10, 120, ${0.12 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isLava) {
    grad.addColorStop(0, `rgba(255, 220, 80, ${0.58 * flicker})`);
    grad.addColorStop(0.4, `rgba(240, 60, 15, ${0.34 * flicker})`);
    grad.addColorStop(0.8, `rgba(140, 10, 0, ${0.14 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (isEmbers) {
    grad.addColorStop(0, `rgba(255, 120, 30, ${0.38 * flicker})`);
    grad.addColorStop(0.5, `rgba(190, 40, 10, ${0.20 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    grad.addColorStop(0, `rgba(255, 235, 140, ${0.55 * flicker})`);
    grad.addColorStop(0.35, `rgba(255, 135, 25, ${0.32 * flicker})`);
    grad.addColorStop(0.7, `rgba(190, 45, 0, ${0.12 * flicker})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  }
  c.fillStyle = grad;
  c.beginPath();
  c.arc(fx, fy, glowRadius, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawFireSparksTo(c, px, py, size, type) {
  if (type.includes('candles')) return;
  const t = performance.now() / 1000;
  const seed = (px * 3.7 + py * 7.1) % 100;
  const isRitual = type === 'campfire_ritual';
  const flameOffsetY = type.includes('torch') ? size * 0.72 : size * 0.45;
  const fx = px;
  const fy = py - flameOffsetY;

  c.save();
  const count = type.includes('beacon') || type.includes('smithy') ? 5 : 3;
  for (let i = 0; i < count; i++) {
    const pSeed = seed + i * 19.3;
    const cycle = (t * 1.6 + i * 0.38 + pSeed * 0.1) % 1.0;
    const sparkX = fx + Math.sin(cycle * 6.28 + pSeed) * (size * 0.18);
    const sparkY = fy - cycle * (size * 0.65);
    const alpha = Math.sin(cycle * Math.PI) * 0.92;
    const sparkSize = Math.max(1, (1.8 - cycle * 0.8));

    c.fillStyle = isRitual
      ? `rgba(190, 240, 255, ${alpha})`
      : `rgba(255, ${Math.floor(180 + (1 - cycle) * 75)}, 50, ${alpha})`;
    c.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize / 2, sparkSize, sparkSize);
  }
  c.restore();
}

function drawPropTo(c, p, still = false) {
  // Специальный рендеринг стартового героя с 4 направлениями и атакой/действием
  if (p.type === 'hero_player' && images.hero) {
    const facing = p.heroFacing || 'front'; // 'front' | 'back' | 'left' | 'right'
    const animState = p.heroAnim || 'walk'; // 'idle' | 'walk' | 'attack' | 'cast'
    let sheetName = `${animState}_${facing}`;
    if (animState === 'attack' || animState === 'cast') {
      sheetName = animState;
    }
    const heroImg = images.hero[sheetName] || images.props['hero_player'];
    if (heroImg) {
      const anim = propAnimInfo(heroImg);
      let frame = 0;
      if (anim && !still) {
        const fps = (animState === 'attack' || animState === 'cast') ? 6 : (animState === 'walk' ? 4 : 2);
        const seed = (Math.round((p.x || 0) * 3) + Math.round((p.y || 0) * 7)) % anim.frames;
        frame = (Math.floor(performance.now() / 1000 * fps) + seed) % anim.frames;
      }
      const cell = anim ? anim.cell : heroImg.height;
      const size = (PROP_DEF[p.type]?.size || 106) * (p.scale || 1);
      const px = p.x * TILE, py = p.y * TILE;
      const drawX = Math.round(px - size / 2);
      const drawY = Math.round(py - size);
      const drawS = Math.round(size);

      c.save();
      c.imageSmoothingEnabled = false;
      const flipX = (animState === 'attack' || animState === 'cast') && facing === 'left';
      if (flipX) {
        c.translate(px, py - size / 2);
        c.scale(-1, 1);
        c.drawImage(heroImg, frame * cell, 0, cell, cell, -size / 2, -size / 2, size, size);
      } else {
        c.drawImage(heroImg, frame * cell, 0, cell, cell, drawX, drawY, drawS, drawS);
      }
      c.restore();

      if (!still && view.zoom > 0.35) {
        c.save();
        c.font = '14px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'bottom';
        c.fillText('👑', px, py - size - 2);
        c.font = '12px Handjet, sans-serif';
        c.fillStyle = '#7cfc9a';
        c.strokeStyle = 'rgba(0,0,0,.85)';
        c.lineWidth = 3;
        c.strokeText(p.name || 'Игрок (Спавн)', px, py - size - 18);
        c.fillText(p.name || 'Игрок (Спавн)', px, py - size - 18);
        c.restore();
      }
      return;
    }
  }

  const img = images.props[p.type];
  const anim = propAnimInfo(img);
  let frame = 0;
  if (anim && !still) {
    const isNpc = isNpcType(p.type);
    const fps = isNpc ? 3.5 : (anim.frames >= 4 ? 6 : 2.5);
    const seed = (Math.round((p.x || 0) * 3) + Math.round((p.y || 0) * 7)) % anim.frames;
    frame = (Math.floor(performance.now() / 1000 * fps) + seed) % anim.frames;
  }
  const spr = getPropCanvas(p, frame);
  if (!spr) return;
  const size = (PROP_DEF[p.type]?.size || 80) * (p.scale || 1);
  const px = p.x * TILE, py = p.y * TILE;
  const drawX = Math.round(px - size / 2);
  const drawY = Math.round(py - size);
  const drawS = Math.round(size);

  // Анимация свечения огня под объектом
  if (isFireSource(p.type) && !still) {
    drawFireGlowTo(c, px, py, size, p.type);
  }

  c.drawImage(spr, drawX, drawY, drawS, drawS);

  // Поднимающиеся горящие искры над пламенем
  if (isFireSource(p.type) && !still) {
    drawFireSparksTo(c, px, py, size, p.type);
  }

  // Отрисовка бейджей интерактива и имён
  if (!still && view.zoom > 0.35) {
    const isNpc = isNpcType(p.type);
    let badge = null;
    if (isNpc && p.canTalk !== false) badge = (p.dialogRole === 'enemy' ? '⚔' : '💬');
    else if (p.clickable) {
      const itype = p.interactType || (p.type.includes('chest') ? 'chest' : p.type.includes('campfire') ? 'fire' : 'examine');
      if (itype === 'chest') badge = '📦';
      else if (itype === 'fire') badge = '🔥';
      else if (itype === 'door') badge = '🚪';
      else if (itype === 'shrine') badge = '✨';
      else if (itype === 'break') badge = '💥';
      else badge = '✋';
    }
    if (badge) {
      c.save();
      c.font = '14px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(badge, px, py - size - 2);
      c.restore();
    }
    if (p.name && (tool === 'select' || view.zoom > 0.8)) {
      c.save();
      c.font = '11px Handjet, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#ffe6b0';
      c.strokeStyle = 'rgba(0,0,0,.85)';
      c.lineWidth = 3;
      const ny = py - size - (badge ? 18 : 2);
      c.strokeText(p.name, px, ny);
      c.fillText(p.name, px, ny);
      c.restore();
    }
  }
}

function drawMarkerTo(c, m, showLabel = true) {
  const def = MARKER_DEF[m.type] || MARKER_DEF.npc;
  const mx = m.x * TILE, my = m.y * TILE;
  const s = 34;
  c.save();
  rr(c, mx - s / 2, my - s / 2, s, s, 8);
  c.fillStyle = 'rgba(5,7,13,.88)';
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = def.color;
  c.stroke();
  c.fillStyle = def.color;
  c.font = '700 18px Handjet, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(def.symbol, mx, my + 1);
  if (showLabel && m.label) {
    c.font = '12px Handjet, sans-serif';
    c.fillStyle = '#ffe6b0';
    c.strokeStyle = 'rgba(0,0,0,.9)';
    c.lineWidth = 3;
    const ly = my - s / 2 - 8;
    c.strokeText(m.label, mx, ly);
    c.fillText(m.label, mx, ly);
  }
  c.restore();
}

function drawables() {
  const list = [];
  for (const p of props) list.push({ y: p.y * TILE, order: 0, kind: 'prop', obj: p });
  for (const m of markers) list.push({ y: m.y * TILE, order: 1, kind: 'marker', obj: m });
  list.sort((a, b) => a.y - b.y || a.order - b.order);
  return list;
}

function visibleWorldRect() {
  const w = canvas.width / view.zoom;
  const h = canvas.height / view.zoom;
  return { x: view.cx - w / 2, y: view.cy - h / 2, w, h };
}

function inVisible(x, y, pad = TILE * 2) {
  const v = visibleWorldRect();
  return x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
}

function drawPathPreview() {
  if (!pathStart || !hoverTile) return;
  const a = { x: (pathStart.tx + 0.5) * TILE, y: (pathStart.ty + 0.8) * TILE };
  const b = { x: (hoverTile.tx + 0.5) * TILE, y: (hoverTile.ty + 0.8) * TILE };
  ctx.save();
  ctx.strokeStyle = 'rgba(255,190,90,.8)';
  ctx.lineWidth = 4 / view.zoom;
  ctx.setLineDash([10 / view.zoom, 8 / view.zoom]);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.restore();
}

function drawHover() {
  if (!hoverTile || !inBounds(hoverTile.tx, hoverTile.ty)) return;
  const x = hoverTile.tx * TILE, y = hoverTile.ty * TILE;
  ctx.save();
  ctx.strokeStyle = tool === 'erase' ? 'rgba(255,90,90,.9)' : 'rgba(255,220,140,.9)';
  ctx.lineWidth = 3 / view.zoom;
  ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
  if (tool === 'tile' || tool === 'fill' || tool === 'path') {
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x, y, TILE, TILE);
  }
  ctx.restore();
}

function drawGroundVisible(v) {
  const minTx = Math.max(0, Math.floor(v.x / TILE));
  const maxTx = Math.min(cols - 1, Math.floor((v.x + v.w) / TILE));
  const minTy = Math.max(0, Math.floor(v.y / TILE));
  const maxTy = Math.min(rows - 1, Math.floor((v.y + v.h) / TILE));

  for (let y = minTy; y <= maxTy; y++) {
    for (let x = minTx; x <= maxTx; x++) {
      const cell = tiles[y]?.[x];
      const d = getTileCellData(cell);
      const spr = getTileCanvas(d.id, d.rot, d.flipX, d.flipY, d.variant);
      const px = x * TILE, py = y * TILE;
      if (spr) ctx.drawImage(spr, px, py, TILE, TILE);
      else { ctx.fillStyle = '#1c2a1c'; ctx.fillRect(px, py, TILE, TILE); }
    }
  }

  // Рамка границ карты
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = Math.max(1, 2 / view.zoom);
  ctx.strokeRect(0, 0, worldW(), worldH());
}

function updateNpcSimulation() {
  const t = performance.now() / 1000;
  for (const p of props) {
    if (!p._simulating || !isNpcType(p.type)) continue;
    if (p.originX === undefined) { p.originX = p.x; p.originY = p.y; }
    const spd = (p.moveSpeed || 1.0) * 1.2;

    if (p.npcBehavior === 'patrol') {
      const span = 2.5;
      if (p.patrolDir === 'vertical') {
        const offset = Math.sin(t * spd) * span;
        p.y = p.originY + offset;
      } else if (p.patrolDir === 'square') {
        const seg = (t * spd * 0.35) % 4;
        let nx = p.originX, ny = p.originY;
        if (seg < 1) { nx = p.originX + seg * span; p.flipX = false; }
        else if (seg < 2) { nx = p.originX + span; ny = p.originY + (seg - 1) * span; }
        else if (seg < 3) { nx = p.originX + (3 - seg) * span; p.flipX = true; }
        else { ny = p.originY + (4 - seg) * span; }
        p.x = nx; p.y = ny;
      } else {
        // Горизонтальный патруль с автоматическим поворотом лица
        const prevX = p.x;
        p.x = p.originX + Math.sin(t * spd) * span;
        const dx = p.x - prevX;
        if (dx < -0.004) p.flipX = true;
        else if (dx > 0.004) p.flipX = false;
      }
    } else if (p.npcBehavior === 'wander') {
      const rad = (p.wanderRadius || 3) * 0.7;
      const prevX = p.x;
      p.x = p.originX + Math.sin(t * spd * 0.7) * rad;
      p.y = p.originY + Math.cos(t * spd * 0.5) * (rad * 0.6);
      const dx = p.x - prevX;
      if (dx < -0.004) p.flipX = true;
      else if (dx > 0.004) p.flipX = false;
    }
  }
}

function render() {
  updateNpcSimulation();
  frame++;
  const v = visibleWorldRect();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-view.cx, -view.cy);

  ctx.imageSmoothingEnabled = view.zoom < 0.95;
  ctx.imageSmoothingQuality = 'high';
  drawGroundVisible(v);

  ctx.imageSmoothingEnabled = false;

  for (const d of drawables()) {
    const wx = d.obj.x * TILE;
    const wy = d.y;
    if (!inVisible(wx, wy)) continue;
    if (d.kind === 'prop') drawPropTo(ctx, d.obj);
    else drawMarkerTo(ctx, d.obj, view.zoom > 0.35);
  }

  if (selected) {
    if (selected.kind === 'tile' && inBounds(selected.tx, selected.ty)) {
      const px = selected.tx * TILE, py = selected.ty * TILE;
      ctx.save();
      const t = performance.now() / 1000;
      const pulse = 0.5 + Math.sin(t * 6) * 0.4;
      ctx.strokeStyle = `rgba(255, 210, 80, ${0.75 + pulse * 0.25})`;
      ctx.lineWidth = 3 / view.zoom;
      ctx.setLineDash([6 / view.zoom, 4 / view.zoom]);
      ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255, 190, 50, ${0.12 + pulse * 0.08})`;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.restore();
    } else {
      const obj = selected.kind === 'prop' ? props[selected.index] : markers[selected.index];
      if (obj) {
        const px = obj.x * TILE, py = obj.y * TILE;
        ctx.save();
        if (selected.kind === 'prop') {
        const size = (PROP_DEF[obj.type]?.size || 80) * (obj.scale || 1);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5 / view.zoom;
        ctx.setLineDash([6 / view.zoom, 4 / view.zoom]);
        ctx.strokeRect(px - size / 2 - 4, py - size - 4, size + 8, size + 8);
        ctx.setLineDash([]);

        // Визуализация радиуса брожения NPC (wander)
        if (obj.npcBehavior === 'wander') {
          const wr = (obj.wanderRadius || 3) * TILE;
          ctx.beginPath();
          ctx.arc(px, py, wr, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(109, 183, 255, 0.75)';
          ctx.fillStyle = 'rgba(109, 183, 255, 0.08)';
          ctx.lineWidth = 2 / view.zoom;
          ctx.setLineDash([6 / view.zoom, 4 / view.zoom]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Визуализация маршрута патрулирования (patrol)
        if (obj.npcBehavior === 'patrol') {
          const span = 3 * TILE;
          ctx.beginPath();
          if (obj.patrolDir === 'vertical') {
            ctx.moveTo(px, py - span); ctx.lineTo(px, py + span);
          } else if (obj.patrolDir === 'square') {
            ctx.rect(px - span, py - span, span * 2, span * 2);
          } else {
            ctx.moveTo(px - span, py); ctx.lineTo(px + span, py);
          }
          ctx.strokeStyle = 'rgba(255, 209, 102, 0.85)';
          ctx.lineWidth = 2.5 / view.zoom;
          ctx.setLineDash([6 / view.zoom, 4 / view.zoom]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.strokeStyle = '#7cfc9a';
        ctx.lineWidth = 3 / view.zoom;
        ctx.setLineDash([8 / view.zoom, 6 / view.zoom]);
        ctx.strokeRect(px - TILE * 0.55, py - TILE * 1.15, TILE * 1.1, TILE * 1.25);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }
}
  drawPathPreview();
  drawHover();
  ctx.restore();

  if (frame % 12 === 0) updateStatus(false);
  requestAnimationFrame(render);
}

/* ---------------- STATUS / INFO ---------------- */

function setStatus(html) { statusEl.innerHTML = html; }

function counts() {
  const used = new Set(tiles.flat());
  return `карта <b>${cols}×${rows}</b> · тайлов использовано <b>${used.size}/${TILES.length}</b> · объектов <b>${props.length}</b> · меток <b>${markers.length}</b>`;
}

function updateStatus(force = false) {
  const parts = [counts()];
  if (hoverTile && inBounds(hoverTile.tx, hoverTile.ty)) {
    parts.push(`курсор <b>(${hoverTile.tx}, ${hoverTile.ty})</b> · ${tiles[hoverTile.ty][hoverTile.tx]}`);
  }
  if (tool === 'path' && pathStart) parts.push('дорога: кликните конец линии');
  if (selected) parts.push(`выбрано: <b>${selected.kind === 'prop' ? PROP_DEF[props[selected.index]?.type]?.name : MARKER_DEF[markers[selected.index]?.type]?.name}</b>`);
  parts.push(`масштаб <b>${Math.round(view.zoom * 100)}%</b>`);
  setStatus(parts.join(' · '));
  zoomVal.textContent = Math.round(view.zoom * 100) + '%';
}

function renderInfo() {
  let html = `<div class="info-row"><span>Инструмент</span><b>${toolName()}</b></div>`;
  html += `<div class="info-row"><span>Сетка</span><b>${TILE}px</b></div>`;
  html += `<div class="info-row"><span>Тайл кисти</span><b>${selectedTile}</b></div>`;
  html += `<div class="info-row"><span>Объект</span><b>${PROP_DEF[selectedProp]?.name || selectedProp}</b></div>`;
  html += `<div class="info-row"><span>Симметрия</span><b>${symmetry}</b></div>`;

  const p = selected?.kind === 'prop' ? props[selected.index] : null;
  const m = selected?.kind === 'marker' ? markers[selected.index] : null;
  const t = selected?.kind === 'tile' && inBounds(selected.tx, selected.ty) ? selected : null;

  if (t) {
    const curCell = tiles[t.ty][t.tx];
    const d = getTileCellData(curCell);
    const tileDefName = TILES.find(item => item[0] === d.id)?.[1] || d.id;

    html += `<div class="info-section" style="margin-top:6px">
      <div class="info-section-title"><span>🧱 ТАЙЛ ЗЕМЛИ (${t.tx}, ${t.ty})</span><span class="info-badge">${d.rot * 90}°</span></div>
      <div class="info-row"><span>Тип тайла</span><b>${escapeHtml(tileDefName)}</b></div>
      <div class="info-row"><span>Поворот</span><b>${d.rot * 90}°</b></div>
      <div class="info-row"><span>Отражение</span><b>X: ${d.flipX ? 'Да' : 'Нет'} · Y: ${d.flipY ? 'Да' : 'Нет'}</b></div>
      <div class="info-row"><span>Оттенок</span><b>${VARIANTS.find(v => v[0] === d.variant)?.[1] || d.variant}</b></div>

      <label style="margin-top:8px">Трансформация тайла</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
        <button id="tileInspectorRot" class="px-btn mini-btn">⟳ Повернуть 90° (R)</button>
        <button id="tileInspectorFlipX" class="px-btn mini-btn ${d.flipX ? 'active' : ''}">⇄ Отразить H (H)</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
        <button id="tileInspectorFlipY" class="px-btn mini-btn ${d.flipY ? 'active' : ''}">⇅ Отразить V (V)</button>
        <button id="tileInspectorReset" class="px-btn mini-btn">↺ Сброс</button>
      </div>

      <label>Оттенок / фильтр</label>
      <select id="tileInspectorVariant">
        ${VARIANTS.map(([vid, vname]) => `<option value="${vid}" ${d.variant === vid ? 'selected' : ''}>${vname}</option>`).join('')}
      </select>

      <button id="tileInspectorReplace" class="px-btn mini-btn highlight" style="margin-top:8px;width:100%">
        Заменить на кисть (${selectedTile})
      </button>
    </div>`;
  }

  if (p) {
    const isNpc = isNpcType(p.type);
    const isHero = p.type === 'hero_player';

    html += `<div class="field" style="margin-top:4px">
      <div class="info-row"><span>Тип</span><b>${escapeHtml(PROP_DEF[p.type]?.name || p.type)}</b></div>
      <label>Имя / Подпись на карте</label>
      <input id="propCustomName" type="text" placeholder="${escapeHtml(PROP_DEF[p.type]?.name || '')}" value="${escapeHtml(p.name || '')}">
    </div>`;

    if (isHero) {
      const facing = p.heroFacing || 'front';
      const anim = p.heroAnim || 'walk';

      html += `<div class="info-section">
        <div class="info-section-title"><span>👑 СТАРТОВЫЙ ГЕРОЙ</span><span class="info-badge">${facing}</span></div>
        <label>Направление взгляда (поворот)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px">
          <button id="heroFaceDown" class="px-btn mini-btn ${facing === 'front' ? 'active' : ''}">🠇 Вниз (Лицо)</button>
          <button id="heroFaceUp" class="px-btn mini-btn ${facing === 'back' ? 'active' : ''}">🠅 Вверх (Спина)</button>
          <button id="heroFaceLeft" class="px-btn mini-btn ${facing === 'left' ? 'active' : ''}">🠄 Влево</button>
          <button id="heroFaceRight" class="px-btn mini-btn ${facing === 'right' ? 'active' : ''}">🠆 Вправо</button>
        </div>

        <label>Режим анимации героя</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px">
          <button id="heroAnimIdle" class="px-btn mini-btn ${anim === 'idle' ? 'active' : ''}">🧍 Покой (Idle)</button>
          <button id="heroAnimWalk" class="px-btn mini-btn ${anim === 'walk' ? 'active' : ''}">🚶 Шаг (Walk)</button>
          <button id="heroAnimAttack" class="px-btn mini-btn ${anim === 'attack' ? 'active' : ''}">⚔ Атака (Attack)</button>
          <button id="heroAnimCast" class="px-btn mini-btn ${anim === 'cast' ? 'active' : ''}">✨ Действие (Cast)</button>
        </div>

        <button id="heroSetSpawn" class="px-btn mini-btn highlight" style="margin-top:6px;width:100%">
          🚩 УСТАНОВИТЬ СПАВН СЮДА
        </button>
      </div>`;
    }

    if (isNpc && !isHero) {
      const bh = p.npcBehavior || 'idle';
      const rad = p.wanderRadius || 3;
      const spd = p.moveSpeed !== undefined ? p.moveSpeed : 1.0;
      const pdir = p.patrolDir || 'horizontal';
      const role = p.dialogRole || (p.type.startsWith('enemy_') ? 'enemy' : p.type.startsWith('merchant') ? 'shop' : p.type === 'npc_elder' ? 'quest' : 'talk');
      const canTalk = p.canTalk !== false;

      html += `<div class="info-section">
        <div class="info-section-title"><span>🤖 ЗАДАЧИ И ПОВЕДЕНИЕ NPC</span><span class="info-badge">${bh}</span></div>
        <label>Режим поведения</label>
        <select id="npcBehavior">
          <option value="idle" ${bh === 'idle' ? 'selected' : ''}>Стоять на месте (Idle)</option>
          <option value="wander" ${bh === 'wander' ? 'selected' : ''}>Бродить рядом (Wander)</option>
          <option value="patrol" ${bh === 'patrol' ? 'selected' : ''}>Патрулировать маршрут (Patrol)</option>
          <option value="guard" ${bh === 'guard' ? 'selected' : ''}>Охранять пост / смотреть на героя</option>
          <option value="follow" ${bh === 'follow' ? 'selected' : ''}>Следовать за героем (спутник)</option>
        </select>`;

      if (bh === 'wander') {
        html += `<label>Радиус брожения: <b id="radVal">${rad}</b> тайлов</label>
        <input id="npcWanderRad" type="range" min="1" max="8" value="${rad}">`;
      } else if (bh === 'patrol') {
        html += `<label>Направление патруля</label>
        <select id="npcPatrolDir">
          <option value="horizontal" ${pdir === 'horizontal' ? 'selected' : ''}>Влево ↔ Вправо (±3 тайла)</option>
          <option value="vertical" ${pdir === 'vertical' ? 'selected' : ''}>Вверх ↕ Вниз (±3 тайла)</option>
          <option value="square" ${pdir === 'square' ? 'selected' : ''}>По квадрату (3×3)</option>
        </select>`;
      }

      html += `<label>Скорость передвижения</label>
        <select id="npcSpeed">
          <option value="0.5" ${spd === 0.5 ? 'selected' : ''}>Медленная (0.5x)</option>
          <option value="1.0" ${spd === 1.0 ? 'selected' : ''}>Обычная (1.0x)</option>
          <option value="1.5" ${spd === 1.5 ? 'selected' : ''}>Быстрая (1.5x)</option>
        </select>
        <label>Направление взгляда (поворот)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:2px 0 4px">
          <button id="npcFacingLeft" class="px-btn mini-btn ${p.flipX ? 'active' : ''}">◀ ВЛЕВО</button>
          <button id="npcFacingRight" class="px-btn mini-btn ${!p.flipX ? 'active' : ''}">ВПРАВО ▶</button>
        </div>
        <button id="toggleNpcSim" class="px-btn mini-btn" style="margin-top:4px;background:${p._simulating ? '#2d4d22' : '#3a2812'}">
          ${p._simulating ? '⏹ ОСТАНОВИТЬ ТЕСТ' : '▶ ТЕСТ ДВИЖЕНИЯ И ПОВОРОТА'}
        </button>
      </div>`;

      html += `<div class="info-section">
        <div class="info-section-title"><span>💬 ДИАЛОГ И РЕЧЬ</span><span class="info-badge">${role}</span></div>
        <label class="check"><input id="npcCanTalk" type="checkbox" ${canTalk ? 'checked' : ''}> Может говорить (клик / E)</label>
        <label>Роль персонажа</label>
        <select id="npcDialogRole">
          <option value="talk" ${role === 'talk' ? 'selected' : ''}>Обычный разговор</option>
          <option value="enemy" ${role === 'enemy' ? 'selected' : ''}>Враг / Монстр (битва/урон)</option>
          <option value="shop" ${role === 'shop' ? 'selected' : ''}>Торговец (открывает магазин)</option>
          <option value="quest" ${role === 'quest' ? 'selected' : ''}>Квестодатель (выдаёт задание)</option>
          <option value="heal" ${role === 'heal' ? 'selected' : ''}>Целитель (лечит раны)</option>
          <option value="inn" ${role === 'inn' ? 'selected' : ''}>Хозяин таверны (отдых)</option>
        </select>
        <label>Реплика NPC при диалоге</label>
        <textarea id="npcDialogText" rows="2" placeholder="Что говорит персонаж...">${escapeHtml(p.dialogText || '')}</textarea>
      </div>`;
    } else {
      const isChest = p.type.includes('chest') || p.type === 'crate' || p.type === 'barrel';
      const isFire = p.type.includes('campfire') || p.type.includes('brazier') || p.type.includes('torch');
      const isDoor = p.type.includes('gate') || p.type.includes('house') || p.type.includes('tomb') || p.type.includes('shack');
      const isShrine = p.type.includes('altar') || p.type.includes('shrine') || p.type.includes('crystal') || p.type.includes('rune');
      const defaultType = isChest ? 'chest' : isFire ? 'fire' : isDoor ? 'door' : isShrine ? 'shrine' : 'examine';
      const itype = p.interactType || defaultType;
      const clickable = p.clickable || false;

      html += `<div class="info-section">
        <div class="info-section-title"><span>✨ ИНТЕРАКТИВНОСТЬ</span><span class="info-badge">${clickable ? itype : 'выкл'}</span></div>
        <label class="check"><input id="propClickable" type="checkbox" ${clickable ? 'checked' : ''}> Кликабельный объект</label>`;

      if (clickable) {
        html += `<label>Тип взаимодействия</label>
        <select id="propInteractType">
          <option value="examine" ${itype === 'examine' ? 'selected' : ''}>Осмотреть (текст описания)</option>
          <option value="chest" ${itype === 'chest' ? 'selected' : ''}>Сундук / лут (выдаёт сокровища)</option>
          <option value="fire" ${itype === 'fire' ? 'selected' : ''}>Костёр / очаг (отдых / сохранение)</option>
          <option value="door" ${itype === 'door' ? 'selected' : ''}>Дверь / переход (телепорт)</option>
          <option value="shrine" ${itype === 'shrine' ? 'selected' : ''}>Алтарь / святилище (бафф)</option>
          <option value="break" ${itype === 'break' ? 'selected' : ''}>Разрушаемый (разбивается при клике)</option>
        </select>
        <label>Текст при клике/осмотре</label>
        <textarea id="propInteractText" rows="2" placeholder="Текст сообщения при осмотре...">${escapeHtml(p.interactText || '')}</textarea>`;

        if (itype === 'chest' || itype === 'break') {
          html += `<label>Награда / лут</label>
          <input id="propLoot" type="text" placeholder="например: 50 gold, potion_hp" value="${escapeHtml(p.loot || '')}">`;
        } else if (itype === 'door') {
          html += `<label>Целевая карта (телепорт)</label>
          <input id="propTargetMap" type="text" placeholder="например: 02_forgotten_crypt" value="${escapeHtml(p.targetMap || '')}">`;
        }
      }
      html += `</div>`;
    }

    html += `<div class="info-section">
      <div class="info-section-title"><span>📐 ТРАНСФОРМАЦИЯ</span></div>
      <label class="check"><input id="propSolid" type="checkbox" ${p.solid ? 'checked' : ''}> твёрдый (коллизия)</label>
      <label>Масштаб <b id="scaleVal">${Math.round((p.scale || 1) * 100)}%</b></label>
      <input id="propScale" type="range" min="50" max="180" value="${Math.round((p.scale || 1) * 100)}">
      <label>Поворот</label><select id="propRot">${[0, 1, 2, 3].map(r => `<option value="${r}" ${((p.rot || 0) % 4) === r ? 'selected' : ''}>${r * 90}°</option>`).join('')}</select>
      <label class="check"><input id="propFlipX" type="checkbox" ${p.flipX ? 'checked' : ''}> отразить X</label>
      <label class="check"><input id="propFlipY" type="checkbox" ${p.flipY ? 'checked' : ''}> отразить Y</label>
      <label>Вариант текстуры</label><select id="propVariant">${VARIANTS.map(([id, name]) => `<option value="${id}" ${(p.variant || 'normal') === id ? 'selected' : ''}>${name}</option>`).join('')}</select>
      <button id="delSel" class="px-btn mini-btn" style="margin-top:4px">УДАЛИТЬ ОБЪЕКТ</button>
    </div>`;
  } else if (m) {
    html += `<div class="field"><span>Метка: ${MARKER_DEF[m.type]?.name || m.type}</span>
      <label>Тип</label><select id="markType">${MARKERS.map(([id, name]) => `<option value="${id}" ${id === m.type ? 'selected' : ''}>${name}</option>`).join('')}</select>
      <label>Подпись</label><input id="markLabel" type="text" value="${escapeHtml(m.label || '')}" maxlength="24" placeholder="необязательно">
      <button id="delSel" class="px-btn mini-btn" style="margin-top:4px">УДАЛИТЬ МЕТКУ</button></div>`;
  } else {
    html += `<div class="info-row"><span>Выделение</span><b>инструмент «Выбор» → клик по объекту</b></div>`;
  }
  infoBody.innerHTML = html;
  bindInfo();
}

function toolName() {
  return { tile: 'Тайл', prop: 'Объект', marker: 'Метка', select: 'Выбор', erase: 'Ластик', fill: 'Заливка', path: 'Дорога' }[tool] || tool;
}
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function bindInfo() {
  if (!selected) return;
  const p = selected.kind === 'prop' ? props[selected.index] : null;
  const m = selected.kind === 'marker' ? markers[selected.index] : null;
  const t = selected.kind === 'tile' && inBounds(selected.tx, selected.ty) ? selected : null;

  if (t) {
    const cur = getTileCellData(tiles[t.ty][t.tx]);

    const btnRot = $('tileInspectorRot');
    if (btnRot) btnRot.addEventListener('click', () => {
      snapshot();
      cur.rot = (cur.rot + 1) % 4;
      tiles[t.ty][t.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Тайл (${t.tx}, ${t.ty}) повёрнут на <b>${cur.rot * 90}°</b>`);
    });

    const btnFlipX = $('tileInspectorFlipX');
    if (btnFlipX) btnFlipX.addEventListener('click', () => {
      snapshot();
      cur.flipX = !cur.flipX;
      tiles[t.ty][t.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Отражение по горизонтали: <b>${cur.flipX ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
    });

    const btnFlipY = $('tileInspectorFlipY');
    if (btnFlipY) btnFlipY.addEventListener('click', () => {
      snapshot();
      cur.flipY = !cur.flipY;
      tiles[t.ty][t.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Отражение по вертикали: <b>${cur.flipY ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
    });

    const btnReset = $('tileInspectorReset');
    if (btnReset) btnReset.addEventListener('click', () => {
      snapshot();
      tiles[t.ty][t.tx] = cur.id;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus('Трансформация тайла сброшена');
    });

    const selVar = $('tileInspectorVariant');
    if (selVar) selVar.addEventListener('change', () => {
      snapshot();
      cur.variant = selVar.value;
      tiles[t.ty][t.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Оттенок тайла изменён: <b>${selVar.value}</b>`);
    });

    const btnReplace = $('tileInspectorReplace');
    if (btnReplace) btnReplace.addEventListener('click', () => {
      snapshot();
      tiles[t.ty][t.tx] = makeTileCell(selectedTile);
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Тайл (${t.tx}, ${t.ty}) заменён на <b>${selectedTile}</b>`);
    });
  }

  if (p) {
    if (p.type === 'hero_player') {
      const setFacing = dir => { snapshot(); p.heroFacing = dir; renderInfo(); updateStatus(true); };
      const setAnim = anim => { snapshot(); p.heroAnim = anim; renderInfo(); updateStatus(true); };

      const fDown = $('heroFaceDown'); if (fDown) fDown.addEventListener('click', () => setFacing('front'));
      const fUp = $('heroFaceUp'); if (fUp) fUp.addEventListener('click', () => setFacing('back'));
      const fLeft = $('heroFaceLeft'); if (fLeft) fLeft.addEventListener('click', () => setFacing('left'));
      const fRight = $('heroFaceRight'); if (fRight) fRight.addEventListener('click', () => setFacing('right'));

      const aIdle = $('heroAnimIdle'); if (aIdle) aIdle.addEventListener('click', () => setAnim('idle'));
      const aWalk = $('heroAnimWalk'); if (aWalk) aWalk.addEventListener('click', () => setAnim('walk'));
      const aAttack = $('heroAnimAttack'); if (aAttack) aAttack.addEventListener('click', () => setAnim('attack'));
      const aCast = $('heroAnimCast'); if (aCast) aCast.addEventListener('click', () => setAnim('cast'));

      const btnSpawn = $('heroSetSpawn');
      if (btnSpawn) btnSpawn.addEventListener('click', () => {
        snapshot();
        // Remove existing spawn markers
        markers = markers.filter(m => m.type !== 'spawn');
        markers.push({ type: 'spawn', x: p.x, y: p.y, label: 'Старт' });
        renderInfo(); updateStatus(true);
        setStatus(`Точка спавна установлена на позицию героя: <b>(${p.x.toFixed(1)}, ${p.y.toFixed(1)})</b>`);
      });
    }

    const customName = $('propCustomName');
    if (customName) customName.addEventListener('input', () => { p.name = customName.value.trim(); updateStatus(false); });

    const beh = $('npcBehavior');
    if (beh) beh.addEventListener('change', () => { p.npcBehavior = beh.value; renderInfo(); updateStatus(true); });

    const rad = $('npcWanderRad');
    if (rad) rad.addEventListener('input', () => { p.wanderRadius = Number(rad.value); const v = $('radVal'); if (v) v.textContent = rad.value; updateStatus(false); });

    const pdir = $('npcPatrolDir');
    if (pdir) pdir.addEventListener('change', () => { p.patrolDir = pdir.value; updateStatus(true); });

    const spd = $('npcSpeed');
    if (spd) spd.addEventListener('change', () => { p.moveSpeed = Number(spd.value); updateStatus(true); });

    const fLeft = $('npcFacingLeft');
    if (fLeft) fLeft.addEventListener('click', () => { p.flipX = true; renderInfo(); updateStatus(true); });

    const fRight = $('npcFacingRight');
    if (fRight) fRight.addEventListener('click', () => { p.flipX = false; renderInfo(); updateStatus(true); });

    const toggleSim = $('toggleNpcSim');
    if (toggleSim) toggleSim.addEventListener('click', () => {
      p._simulating = !p._simulating;
      if (!p._simulating && p.originX !== undefined) {
        p.x = p.originX; p.y = p.originY;
      }
      renderInfo();
      updateStatus(true);
    });

    const canTalk = $('npcCanTalk');
    if (canTalk) canTalk.addEventListener('change', () => { p.canTalk = canTalk.checked; updateStatus(true); });

    const role = $('npcDialogRole');
    if (role) role.addEventListener('change', () => { p.dialogRole = role.value; renderInfo(); updateStatus(true); });

    const dtext = $('npcDialogText');
    if (dtext) dtext.addEventListener('input', () => { p.dialogText = dtext.value; });

    const clk = $('propClickable');
    if (clk) clk.addEventListener('change', () => { p.clickable = clk.checked; renderInfo(); updateStatus(true); });

    const itype = $('propInteractType');
    if (itype) itype.addEventListener('change', () => { p.interactType = itype.value; renderInfo(); updateStatus(true); });

    const itext = $('propInteractText');
    if (itext) itext.addEventListener('input', () => { p.interactText = itext.value; });

    const loot = $('propLoot');
    if (loot) loot.addEventListener('input', () => { p.loot = loot.value; });

    const targetMap = $('propTargetMap');
    if (targetMap) targetMap.addEventListener('input', () => { p.targetMap = targetMap.value; });

    const solid = $('propSolid');
    if (solid) solid.addEventListener('change', () => { p.solid = solid.checked; updateStatus(true); });

    const scale = $('propScale');
    if (scale) scale.addEventListener('input', () => {
      p.scale = Number(scale.value) / 100;
      const val = $('scaleVal'); if (val) val.textContent = scale.value + '%';
      updateStatus(false);
    });

    const propRot = $('propRot');
    if (propRot) propRot.addEventListener('change', () => { p.rot = Number(propRot.value) % 4; updateStatus(true); });

    const flipX = $('propFlipX');
    if (flipX) flipX.addEventListener('change', () => { p.flipX = flipX.checked; updateStatus(true); });

    const flipY = $('propFlipY');
    if (flipY) flipY.addEventListener('change', () => { p.flipY = flipY.checked; updateStatus(true); });

    const variant = $('propVariant');
    if (variant) variant.addEventListener('change', () => { p.variant = variant.value; updateStatus(true); });
  }

  if (m) {
    const type = $('markType');
    if (type) type.addEventListener('change', () => { m.type = type.value; renderInfo(); updateStatus(true); });
    const label = $('markLabel');
    if (label) label.addEventListener('input', () => { m.label = label.value.slice(0, 24); });
  }

  const del = $('delSel');
  if (del) del.addEventListener('click', () => {
    snapshot();
    if (selected.kind === 'prop') props.splice(selected.index, 1); else markers.splice(selected.index, 1);
    selected = null; renderInfo(); updateStatus(true);
  });
}

function isNpcType(type) {
  if (!type) return false;
  return NPCS.some(n => n[0] === type) || type.startsWith('npc_') || type.startsWith('merchant_') || type.startsWith('warrior_') || type.startsWith('enemy_');
}

const PROP_CATS = {
  all: 'Все (91)',
  monsters: 'Монстры (6)',
  portals: 'Порталы (4)',
  buildings: 'Дома и руины (15)',
  campfires: 'Костры (6)',
  clutter: 'Мелочи/Лут (7)',
  combat: '⚔ Данж/Бой (16)',
  city: 'Город (6)',
  npcs: 'NPC и Маги (9)',
  warriors: 'Герои и Воины (5)',
  animals: 'Звери (6)',
  nature: 'Природа (11)'
};

const PROP_CAT_MAP = {
  // Монстры
  enemy_skeleton: 'monsters', enemy_goblin: 'monsters', enemy_cultist: 'monsters',
  enemy_demon: 'monsters', enemy_gargoyle: 'monsters', enemy_slime: 'monsters',

  // Порталы
  portal_arcane: 'portals', portal_inferno: 'portals', portal_void: 'portals', portal_nature: 'portals',

  // Здания и руины
  house_wood: 'buildings', house_stone: 'buildings', smithy: 'buildings',
  house_ruin_burnt: 'buildings', house_ruin_stone: 'buildings', house_ruin_tower: 'buildings',
  house_witch_shack: 'buildings', house_mausoleum: 'buildings', house_windmill: 'buildings',
  house_tavern_inn: 'buildings', house_chapel: 'buildings', house_ruin_smithy: 'buildings',
  house_war_tent: 'buildings', house_watermill: 'buildings', house_hermit_cabin: 'buildings',

  // Костры
  campfire: 'campfires', campfire_pot: 'campfires', campfire_ashes: 'campfires',
  campfire_ritual: 'campfires', campfire_stones: 'campfires', campfire_beacon: 'campfires',

  // Мелочи, сокровища и алхимия
  prop_potions: 'clutter', prop_gold_pile: 'clutter', prop_mushrooms: 'clutter',
  prop_candles: 'clutter', prop_urn: 'clutter', prop_gargoyle: 'clutter', prop_dragon_bones: 'clutter',

  // Боевые и мрачные объекты
  sarcophagus: 'combat', altar_blood: 'combat', skull_pile: 'combat', iron_cage: 'combat', dungeon_gate: 'combat', crypt_tomb: 'combat',
  stalagmite: 'combat', brazier_fire: 'combat', dark_crystal: 'combat', lava_fissure: 'combat', pentagram: 'combat', bone_totem: 'combat',
  corrupt_tree: 'combat', goblin_tent: 'combat', broken_wagon: 'combat', ancient_shrine: 'combat',

  // Город и окружение
  fountain: 'city', statue_hero: 'city', torch_standing: 'city', well: 'city', market_stall: 'city', notice_board: 'city',

  // NPC и Маги
  merchant_weapon: 'npcs', merchant_potion: 'npcs', merchant_general: 'npcs', npc_elder: 'npcs',
  npc_villager_m: 'npcs', npc_villager_f: 'npcs', npc_girl: 'npcs', npc_maid: 'npcs',
  npc_mage: 'npcs',

  // Герои и Воины
  hero_player: 'warriors',
  warrior_guard: 'warriors', warrior_knight: 'warriors', warrior_archer: 'warriors', warrior_mercenary: 'warriors',

  // Животные
  animal_horse: 'animals', animal_cow: 'animals', animal_sheep: 'animals', animal_dog: 'animals', animal_cat: 'animals', animal_chicken: 'animals',

  // Природа
  pine_tree: 'nature', dead_tree: 'nature', boulder: 'nature', chest: 'nature', signpost: 'nature', barrel: 'nature', crate: 'nature', gravestone: 'nature', ruin_statue: 'nature', bones: 'nature', rune_stone: 'nature'
};

let selectedPropCat = 'all';

const NPCS = [
  // Монстры и существа (NPC)
  ['enemy_skeleton', 'Скелет-воин', 'monsters'],
  ['enemy_goblin', 'Гоблин-разбойник', 'monsters'],
  ['enemy_cultist', 'Тёмный культист', 'monsters'],
  ['enemy_demon', 'Инфернальный демон', 'monsters'],
  ['enemy_gargoyle', 'Ожившая горгулья', 'monsters'],
  ['enemy_slime', 'Ядовитая слизь', 'monsters'],

  // Маги и торговцы
  ['hero_player', 'Стартовый герой', 'warriors'],
  ['npc_mage', 'Архимаг с посохом', 'merchants'],
  ['merchant_weapon', 'Кузнец-оружейник', 'merchants'],
  ['merchant_potion', 'Алхимик (зелья)', 'merchants'],
  ['merchant_general', 'Купец (товары)', 'merchants'],

  // Жители деревни и квестовые
  ['npc_elder', 'Старейшина Эльда', 'villagers'],
  ['npc_villager_m', 'Горожанин', 'villagers'],
  ['npc_villager_f', 'Горожанка', 'villagers'],
  ['npc_girl', 'Девочка с цветами', 'villagers'],
  ['npc_maid', 'Трактирщица', 'villagers'],

  // Воины и стража
  ['warrior_guard', 'Стражник с алебардой', 'warriors'],
  ['warrior_knight', 'Рыцарь-паладин', 'warriors'],
  ['warrior_archer', 'Лучник-следопыт', 'warriors'],
  ['warrior_mercenary', 'Наёмник с топором', 'warriors']
];

const NPC_CATS = {
  all: 'Все (20)',
  monsters: 'Монстры (6)',
  merchants: 'Маги и торговцы (4)',
  villagers: 'Жители (5)',
  warriors: 'Герои и воины (5)'
};
let selectedNpcCat = 'all';

/* ---------------- PALETTE ---------------- */

function updateTileTransformBar() {
  const bar = $('tileTransformBar');
  if (!bar) return;
  if (activeTab !== 'tiles') {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  bar.innerHTML = '';

  // Mini-preview
  const prevChip = document.createElement('div');
  prevChip.className = 'tile-tf-preview';
  prevChip.title = `Предпросмотр кисти: ${tileRot * 90}°`;
  const prevCanv = document.createElement('canvas');
  prevCanv.width = 28; prevCanv.height = 28;
  const pctx = prevCanv.getContext('2d');
  pctx.imageSmoothingEnabled = false;
  const spr = getTileCanvas(selectedTile, tileRot, tileFlipX, tileFlipY, tileVariant);
  if (spr) pctx.drawImage(spr, 0, 0, 28, 28);
  prevChip.appendChild(prevCanv);
  bar.appendChild(prevChip);

  // Rotate button
  const rotBtn = document.createElement('button');
  rotBtn.className = 'tile-tf-btn' + (tileRot > 0 ? ' active' : '');
  rotBtn.innerHTML = `⟳ ${tileRot * 90}° <small style="opacity:.6">(R)</small>`;
  rotBtn.title = 'Повернуть тайл на 90 градусов (Горячая клавиша: R / К)';
  rotBtn.addEventListener('click', () => {
    tileRot = (tileRot + 1) % 4;
    updateTileTransformBar();
    setStatus(`Поворот тайла кисти: <b>${tileRot * 90}°</b>`);
  });
  bar.appendChild(rotBtn);

  // Flip X button
  const flipHBtn = document.createElement('button');
  flipHBtn.className = 'tile-tf-btn' + (tileFlipX ? ' active' : '');
  flipHBtn.innerHTML = `⇄ H <small style="opacity:.6">(H)</small>`;
  flipHBtn.title = 'Отразить по горизонтали (Горячая клавиша: H / Р)';
  flipHBtn.addEventListener('click', () => {
    tileFlipX = !tileFlipX;
    updateTileTransformBar();
    setStatus(`Отражение по горизонтали: <b>${tileFlipX ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
  });
  bar.appendChild(flipHBtn);

  // Flip Y button
  const flipVBtn = document.createElement('button');
  flipVBtn.className = 'tile-tf-btn' + (tileFlipY ? ' active' : '');
  flipVBtn.innerHTML = `⇅ V <small style="opacity:.6">(V)</small>`;
  flipVBtn.title = 'Отразить по вертикали (Горячая клавиша: V / М)';
  flipVBtn.addEventListener('click', () => {
    tileFlipY = !tileFlipY;
    updateTileTransformBar();
    setStatus(`Отражение по вертикали: <b>${tileFlipY ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
  });
  bar.appendChild(flipVBtn);

  // Variant Tint
  const varSel = document.createElement('select');
  varSel.className = 'tile-variant-sel';
  varSel.title = 'Цветовой оттенок / фильтр тайла';
  for (const [id, label] of VARIANTS) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = label;
    if (tileVariant === id) opt.selected = true;
    varSel.appendChild(opt);
  }
  varSel.addEventListener('change', () => {
    tileVariant = varSel.value;
    updateTileTransformBar();
    setStatus(`Оттенок тайла кисти: <b>${VARIANTS.find(v => v[0] === tileVariant)?.[1] || tileVariant}</b>`);
  });
  bar.appendChild(varSel);

  // Reset transforms button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'tile-tf-btn';
  resetBtn.innerHTML = `↺`;
  resetBtn.title = 'Сбросить все трансформации тайла';
  resetBtn.addEventListener('click', () => {
    tileRot = 0; tileFlipX = false; tileFlipY = false; tileVariant = 'normal';
    updateTileTransformBar();
    setStatus('Трансформации тайла сброшены');
  });
  bar.appendChild(resetBtn);
}

function buildPalette() {
  paletteBody.innerHTML = '';
  paletteBody.className = 'palette-body' + (activeTab === 'markers' ? ' markers-grid' : '');

  const catEl = $('propCats');
  if (catEl) {
    if (activeTab === 'tiles') {
      catEl.classList.remove('hidden');
      catEl.innerHTML = '';
      for (const [key, label] of Object.entries(TILE_CATS)) {
        const btn = document.createElement('button');
        btn.className = 'cat-pill' + (selectedTileCat === key ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => { selectedTileCat = key; refreshPalette(); });
        catEl.appendChild(btn);
      }
    } else if (activeTab === 'props') {
      catEl.classList.remove('hidden');
      catEl.innerHTML = '';
      for (const [key, label] of Object.entries(PROP_CATS)) {
        const btn = document.createElement('button');
        btn.className = 'cat-pill' + (selectedPropCat === key ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => { selectedPropCat = key; refreshPalette(); });
        catEl.appendChild(btn);
      }
    } else if (activeTab === 'npcs') {
      catEl.classList.remove('hidden');
      catEl.innerHTML = '';
      for (const [key, label] of Object.entries(NPC_CATS)) {
        const btn = document.createElement('button');
        btn.className = 'cat-pill' + (selectedNpcCat === key ? ' active' : '');
        btn.textContent = label;
        btn.addEventListener('click', () => { selectedNpcCat = key; refreshPalette(); });
        catEl.appendChild(btn);
      }
    } else {
      catEl.classList.add('hidden');
    }
  }

  updateTileTransformBar();

  if (activeTab === 'tiles') {
    const list = selectedTileCat === 'all' ? TILES : TILES.filter(([id]) => TILE_CAT_MAP[id] === selectedTileCat);
    for (const [id, name] of list) {
      const b = document.createElement('button');
      b.className = 'swatch' + (selectedTile === id ? ' active' : '');
      b.title = name;
      b.innerHTML = `<img src="${ASSETS}tiles/${id}.png?v=7" alt=""><span class="tag">${name}</span>`;
      b.addEventListener('click', () => {
        selectedTile = id;
        refreshPalette();
        updateStatus(true);
      });
      paletteBody.appendChild(b);
    }
  } else if (activeTab === 'props') {
    const list = selectedPropCat === 'all' ? PROPS : PROPS.filter(([id]) => PROP_CAT_MAP[id] === selectedPropCat);
    for (const [id, name] of list) {
      const b = document.createElement('button');
      b.className = 'swatch' + (selectedProp === id ? ' active' : '');
      b.title = name;
      b.innerHTML = `<img src="${ASSETS}props/${id}.png?v=7" alt="" style="object-position:left center"><span class="tag">${name}</span>`;
      b.addEventListener('click', () => { selectedProp = id; refreshPalette(); updateStatus(true); });
      paletteBody.appendChild(b);
    }
  } else if (activeTab === 'npcs') {
    const list = selectedNpcCat === 'all' ? NPCS : NPCS.filter(item => item[2] === selectedNpcCat);
    for (const [id, name] of list) {
      const b = document.createElement('button');
      b.className = 'swatch' + (selectedProp === id ? ' active' : '');
      b.title = name;
      b.innerHTML = `<img src="${ASSETS}props/${id}.png?v=7" alt="" style="object-position:left center"><span class="tag">${name}</span>`;
      b.addEventListener('click', () => {
        selectedProp = id;
        setTool('prop');
        refreshPalette();
        updateStatus(true);
      });
      paletteBody.appendChild(b);
    }
  } else {
    for (const [id, name, color, symbol] of MARKERS) {
      const b = document.createElement('button');
      b.className = 'marker-chip' + (selectedMarker === id ? ' active' : '');
      b.style.background = `linear-gradient(135deg, ${color}28, #0e111a)`;
      b.style.borderColor = color;
      b.style.color = color;
      b.title = `${name} [${symbol}]`;
      b.innerHTML = `<span class="marker-sym">${symbol}</span><span class="marker-lbl">${name}</span>`;
      b.addEventListener('click', () => { selectedMarker = id; refreshPalette(); updateStatus(true); });
      paletteBody.appendChild(b);
    }
  }
}

let activeTab = 'tiles';
function refreshPalette() { buildPalette(); }

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  activeTab = name;
  buildPalette();
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  switchTab(tab.dataset.tab);
  if (activeTab === 'npcs') {
    setTool('prop');
    if (!NPCS.some(n => n[0] === selectedProp)) {
      selectedProp = 'merchant_weapon';
    }
  } else if (activeTab === 'props') {
    setTool('prop');
  } else if (activeTab === 'tiles') {
    setTool('tile');
  } else if (activeTab === 'markers') {
    setTool('marker');
  }
  updateStatus(true);
}));
document.querySelectorAll('#tools .tool').forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

function setTool(t) {
  tool = t;
  pathStart = null;
  document.querySelectorAll('#tools .tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  canvas.style.cursor = t === 'select' ? 'pointer' : t === 'erase' ? 'not-allowed' : 'crosshair';

  if (t === 'tile' && activeTab !== 'tiles') {
    switchTab('tiles');
  } else if (t === 'marker' && activeTab !== 'markers') {
    switchTab('markers');
  } else if (t === 'prop' && activeTab !== 'props' && activeTab !== 'npcs') {
    switchTab('props');
  }

  updateStatus(true);
}

/* ---------------- ACTIONS ---------------- */

function autoDecorate() {
  snapshot();
  const decor = ['pine_tree', 'dead_tree', 'boulder', 'bones', 'gravestone', 'rune_stone'];
  const blocked = new Set([...BLOCK_TILES, 'dirt_trail', 'cobble_path', 'stone_bricks', 'grass_dirt_edge', 'grass_stone_edge', 'grass_water_shore', 'grass_water_corner', 'dirt_cobble_edge']);
  const nearMarker = (x, y) => markers.some(m => Math.abs(m.x - (x + 0.5)) < 2 && Math.abs(m.y - (y + 0.55)) < 2);
  let added = 0;
  const target = Math.floor(cols * rows * 0.10);
  for (let y = 1; y < rows - 1 && added < target; y++) {
    for (let x = 1; x < cols - 1 && added < target; x++) {
      const id = tiles[y][x];
      if (blocked.has(id) || !['meadow', 'grass_flowers', 'forest_floor', 'graveyard'].includes(id)) continue;
      if (Math.random() > 0.16 || nearMarker(x, y)) continue;
      if (props.some(p => Math.abs(p.x - (x + 0.5)) < 0.9 && Math.abs(p.y - (y + 0.8)) < 0.9)) continue;
      const type = decor[Math.floor(Math.random() * decor.length)];
      const a = propAnchor(x, y);
      props.push({ type, x: a.x, y: a.y, solid: PROP_DEF[type].solid, scale: 0.9 + Math.random() * 0.35, rot: 0, flipX: false, flipY: false, variant: 'normal' });
      added++;
    }
  }
  updateStatus(true); renderInfo();
  setStatus(`Авто-декор: добавлено объектов <b>${added}</b>`);
}

function validateMap() {
  const msgs = [];
  const spawns = markers.filter(m => m.type === 'spawn');
  if (!spawns.length) msgs.push({ cls: 'warn', text: 'Нет метки спавна (spawn).' });
  spawns.forEach(s => {
    const tx = Math.floor(s.x), ty = Math.floor(s.y);
    if (!inBounds(tx, ty)) msgs.push({ cls: 'err', text: 'Спавн вне карты.' });
    else if (BLOCK_TILES.has(tiles[ty][tx])) msgs.push({ cls: 'err', text: `Спавн на непроходимом тайле ${tiles[ty][tx]}.` });
    const blockedByProp = props.some(p => {
      const size = (PROP_DEF[p.type]?.size || 80) * (p.scale || 1);
      return Math.hypot(s.x * TILE - p.x * TILE, s.y * TILE - (p.y * TILE - size * 0.45)) < Math.max(size * 0.5, TILE * 0.5);
    });
    if (blockedByProp) msgs.push({ cls: 'warn', text: 'Спавн перекрыт объектом.' });
  });
  const walkable = tiles.flat().filter(id => !BLOCK_TILES.has(id)).length;
  if (walkable < cols * rows * 0.25) msgs.push({ cls: 'warn', text: 'Мало проходимой площади.' });
  const onBlocked = props.filter(p => BLOCK_TILES.has(tiles[Math.floor(p.y)][Math.floor(p.x)] || '')).length;
  if (onBlocked) msgs.push({ cls: 'warn', text: `Объектов на непроходимых тайлах: ${onBlocked}.` });
  if (!props.length && !markers.length) msgs.push({ cls: 'warn', text: 'Карта пустая: нет объектов и меток.' });
  if (!msgs.length) msgs.push({ cls: 'ok', text: 'Карта выглядит валидной.' });
  setStatus(msgs.map(m => `<span class="${m.cls}">• ${m.text}</span>`).join('<br>'));
}

let currentMapName = 'Деревня';

function openSaveModal() {
  const modal = $('saveModal');
  if (!modal) return;
  const input = $('modalMapName');
  if (input) {
    input.value = currentMapName || `Карта_${cols}x${rows}`;
    modal.classList.remove('hidden');
    setTimeout(() => { input.focus(); input.select(); }, 60);
  } else {
    modal.classList.remove('hidden');
  }
}

function closeSaveModal() {
  const modal = $('saveModal');
  if (modal) modal.classList.add('hidden');
}

function getCustomMaps() {
  try {
    return JSON.parse(localStorage.getItem('jrpg_custom_maps') || '{}');
  } catch {
    return {};
  }
}

function saveCustomMapToStorage(name, data) {
  try {
    const maps = getCustomMaps();
    maps[name] = data;
    localStorage.setItem('jrpg_custom_maps', JSON.stringify(maps));
    updateCustomMapsDropdown();
  } catch (e) {
    console.error('Ошибка сохранения в localStorage:', e);
  }
}

function updateCustomMapsDropdown() {
  const sel = $('mapPreset');
  if (!sel) return;
  let optgroup = $('customMapsGroup');
  if (!optgroup) {
    optgroup = document.createElement('optgroup');
    optgroup.id = 'customMapsGroup';
    optgroup.label = '⭐ Мои сохранённые карты';
    sel.appendChild(optgroup);
  }
  optgroup.innerHTML = '';
  const maps = getCustomMaps();
  const keys = Object.keys(maps);
  if (keys.length === 0) {
    optgroup.style.display = 'none';
  } else {
    optgroup.style.display = '';
    for (const name of keys) {
      const opt = document.createElement('option');
      opt.value = `custom:${name}`;
      const m = maps[name];
      opt.textContent = `${name} (${m.cols}×${m.rows})`;
      optgroup.appendChild(opt);
    }
  }
}

function confirmSaveMap() {
  const input = $('modalMapName');
  const rawName = (input?.value || '').trim();
  const mapName = rawName || `Карта_${cols}x${rows}`;
  currentMapName = mapName;

  const data = {
    name: mapName,
    version: 2,
    savedAt: new Date().toISOString(),
    tileSize: TILE,
    cols, rows,
    tiles,
    props: props.map(p => {
      const o = {
        type: p.type,
        x: +p.x.toFixed(3),
        y: +p.y.toFixed(3),
        solid: !!p.solid,
        scale: +(p.scale || 1).toFixed(3),
        rot: p.rot || 0,
        flipX: !!p.flipX,
        flipY: !!p.flipY,
        variant: p.variant || 'normal'
      };
      if (p.name) o.name = p.name;
      if (p.clickable) o.clickable = true;
      if (p.interactType) o.interactType = p.interactType;
      if (p.interactText) o.interactText = p.interactText;
      if (p.loot) o.loot = p.loot;
      if (p.targetMap) o.targetMap = p.targetMap;
      if (p.npcBehavior) o.npcBehavior = p.npcBehavior;
      if (p.wanderRadius) o.wanderRadius = p.wanderRadius;
      if (p.patrolDir) o.patrolDir = p.patrolDir;
      if (p.moveSpeed !== undefined) o.moveSpeed = p.moveSpeed;
      if (p.canTalk !== undefined) o.canTalk = p.canTalk;
      if (p.dialogRole) o.dialogRole = p.dialogRole;
      if (p.dialogText) o.dialogText = p.dialogText;
      return o;
    }),
    markers: markers.map(m => ({ type: m.type, x: +m.x.toFixed(3), y: +m.y.toFixed(3), label: m.label || '' }))
  };

  const jsonStr = JSON.stringify(data, null, 2);

  // 1. Скачивание файла JSON на компьютер
  if ($('modalDownloadJson')?.checked !== false) {
    const filename = (mapName.replace(/[\\/:*?"<>|]/g, '_') || 'map') + '.json';
    download(filename, jsonStr, 'application/json');
  }

  // 2. Сохранение в список готовых карт в памяти браузера
  if ($('modalSavePreset')?.checked !== false) {
    saveCustomMapToStorage(mapName, data);
  }

  closeSaveModal();
  setStatus(`Карта <b>«${escapeHtml(mapName)}»</b> (${cols}×${rows}) успешно сохранена!`);
}

function exportJson() {
  openSaveModal();
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      snapshot();
      const data = JSON.parse(reader.result);
      if (data.tileSize) {
        TILE = data.tileSize;
        const gsel = $('gridSize');
        if (gsel) gsel.value = String(TILE);
      }
      const w = clamp(Math.round(data.cols || 26), 8, 256);
      const h = clamp(Math.round(data.rows || 17), 8, 256);
      tiles = blankTiles(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const id = data.tiles?.[y]?.[x];
        tiles[y][x] = TILE_ID.has(id) ? id : 'meadow';
      }
      cols = w; rows = h;
      props = (data.props || []).filter(p => PROP_ID.has(p.type)).map(p => ({
        type: p.type,
        x: +p.x || 0.5,
        y: +p.y || 0.8,
        solid: !!p.solid,
        scale: clamp(+p.scale || 1, 0.5, 1.8),
        rot: clamp(Math.round(+p.rot || 0), 0, 3),
        flipX: !!p.flipX,
        flipY: !!p.flipY,
        variant: VARIANT_ID.has(p.variant) ? p.variant : 'normal',
        name: p.name || '',
        clickable: !!p.clickable,
        interactType: p.interactType || '',
        interactText: p.interactText || '',
        loot: p.loot || '',
        targetMap: p.targetMap || '',
        npcBehavior: p.npcBehavior || 'idle',
        wanderRadius: p.wanderRadius || 3,
        patrolDir: p.patrolDir || 'horizontal',
        moveSpeed: p.moveSpeed !== undefined ? p.moveSpeed : 1.0,
        canTalk: p.canTalk !== undefined ? p.canTalk : true,
        dialogRole: p.dialogRole || 'talk',
        dialogText: p.dialogText || ''
      }));
      markers = (data.markers || []).filter(m => MARKER_ID.has(m.type)).map(m => ({ type: m.type, x: +m.x || 0.5, y: +m.y || 0.55, label: String(m.label || '').slice(0, 24) }));
      selected = null; pathStart = null;
      $('sizeW').value = cols; $('sizeH').value = rows;
      rebuildGround(); centerView(); renderInfo(); updateStatus(true);
      setStatus('Карта импортирована');
    } catch (e) {
      setStatus('Ошибка импорта: ' + escapeHtml(e.message));
    }
  };
  reader.readAsText(file);
}

function exportPng() {
  const c = document.createElement('canvas');
  c.width = worldW(); c.height = worldH();
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const img = images.tiles[tiles[y][x]];
      if (img) g.drawImage(img, x * TILE, y * TILE, TILE, TILE);
      else { g.fillStyle = '#1c2a1c'; g.fillRect(x * TILE, y * TILE, TILE, TILE); }
    }
  }
  const includeMarkers = $('pngMarkers').checked;
  const list = drawables().filter(d => includeMarkers || d.kind === 'prop');
  for (const d of list) {
    if (d.kind === 'prop') drawPropTo(g, d.obj, true);
    else drawMarkerTo(g, d.obj, true);
  }
  c.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'map.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
  setStatus('Экспортировано <b>map.png</b>');
}

function loadExample() {
  snapshot();
  cols = 26; rows = 17;
  $('sizeW').value = cols; $('sizeH').value = rows;
  tiles = blankTiles(cols, rows, 'meadow');
  const rect = (x, y, w, h, id) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (inBounds(xx, yy)) tiles[yy][xx] = id; };
  const hline = (x, y, w, id) => rect(x, y, w, 1, id);
  const vline = (x, y, h, id) => rect(x, y, 1, h, id);
  for (let x = 0; x < cols; x++) { tiles[0][x] = 'forest_floor'; tiles[rows - 1][x] = 'forest_floor'; }
  for (let y = 0; y < rows; y++) { tiles[y][0] = 'forest_floor'; tiles[y][cols - 1] = 'forest_floor'; }
  hline(7, 13, 13, 'dirt_trail'); vline(12, 11, 5, 'dirt_trail'); vline(13, 11, 5, 'dirt_trail');
  rect(8, 4, 11, 8, 'cobble_path'); rect(3, 2, 4, 3, 'grass_flowers'); rect(19, 2, 4, 3, 'grass_flowers');
  rect(3, 12, 4, 3, 'grass_flowers'); rect(19, 12, 4, 3, 'grass_flowers'); rect(10, 3, 7, 1, 'stone_bricks');

  props = [
    // Городские сооружения и постройки
    { type: 'house_wood', x: 5.2, y: 5.8, solid: true, scale: 1 },
    { type: 'house_stone', x: 21.5, y: 5.8, solid: true, scale: 1 },
    { type: 'smithy', x: 7.2, y: 7.6, solid: true, scale: 1 },
    { type: 'fountain', x: 13.5, y: 7.8, solid: true, scale: 1 },
    { type: 'statue_hero', x: 13.5, y: 4.2, solid: true, scale: 1 },
    { type: 'well', x: 17.6, y: 5.2, solid: true, scale: 1 },
    { type: 'market_stall', x: 16.2, y: 8.4, solid: true, scale: 1 },
    { type: 'notice_board', x: 10.5, y: 11.8, solid: true, scale: 1 },

    // Уличное освещение (анимированные факелы)
    { type: 'torch_standing', x: 11.5, y: 6.8, solid: false, scale: 1 },
    { type: 'torch_standing', x: 15.5, y: 6.8, solid: false, scale: 1 },
    { type: 'torch_standing', x: 11.5, y: 13.2, solid: false, scale: 1 },
    { type: 'torch_standing', x: 15.5, y: 13.2, solid: false, scale: 1 },

    // Персонажи и торговцы
    { type: 'warrior_guard', x: 11.8, y: 14.5, solid: true, scale: 1 },
    { type: 'warrior_guard', x: 15.2, y: 14.5, solid: true, scale: 1 },
    { type: 'merchant_weapon', x: 8.8, y: 7.6, solid: true, scale: 1 },
    { type: 'merchant_potion', x: 12.6, y: 4.6, solid: true, scale: 1 },
    { type: 'merchant_general', x: 15.2, y: 9.8, solid: true, scale: 1 },
    { type: 'npc_elder', x: 10.2, y: 12.4, solid: true, scale: 1 },
    { type: 'npc_girl', x: 18.2, y: 9.2, solid: true, scale: 1 },

    // Животные
    { type: 'animal_horse', x: 5.2, y: 9.2, solid: true, scale: 1 },
    { type: 'animal_dog', x: 12.2, y: 9.5, solid: true, scale: 1 },
    { type: 'animal_cat', x: 14.5, y: 8.5, solid: false, scale: 1 },
    { type: 'animal_chicken', x: 18.5, y: 11.2, solid: false, scale: 1 },
    { type: 'animal_cow', x: 4.2, y: 12.2, solid: true, scale: 1 },
    { type: 'animal_sheep', x: 6.2, y: 12.6, solid: true, scale: 1 },

    // Утварь и окружение
    { type: 'signpost', x: 13.5, y: 15.2, solid: false, scale: 1 },
    { type: 'chest', x: 11.0, y: 8.5, solid: true, scale: 1 },
    { type: 'barrel', x: 9.8, y: 7.8, solid: true, scale: 1 },
    { type: 'crate', x: 6.0, y: 7.8, solid: true, scale: 1 },
    { type: 'barrel', x: 17.5, y: 8.6, solid: true, scale: 1 },
    { type: 'boulder', x: 2.5, y: 2.5, solid: true, scale: 1 },
    { type: 'rune_stone', x: 20.5, y: 12.4, solid: true, scale: 1 }
  ];
  markers = [
    { type: 'spawn', x: 12.5, y: 14.55, label: 'Старт' },
    { type: 'shop', x: 8.9, y: 7.2, label: 'Оружие' }, { type: 'shop', x: 18.1, y: 7.2, label: 'Броня' },
    { type: 'shop', x: 13.1, y: 4.9, label: 'Зелья' }, { type: 'shop', x: 15.1, y: 10.4, label: 'Торговец' },
    { type: 'npc', x: 10.6, y: 12.9, label: 'Эльда' }, { type: 'chest', x: 11.5, y: 8.8, label: 'Хранилище' }
  ];
  selected = null; pathStart = null;
  rebuildGround(); centerView(); renderInfo(); updateStatus(true);
  setStatus('Загружен пример «Деревня» — можно править и экспортировать.');
}

/* ---------------- INPUT ---------------- */

function eventTile(e) {
  const r = canvas.getBoundingClientRect();
  const w = screenToWorld(e.clientX - r.left, e.clientY - r.top);
  return { ...tileFromWorld(w.x, w.y), wx: w.x, wy: w.y };
}

let stroke = false;
let isDraggingObj = false;

canvas.addEventListener('pointerdown', e => {
  const t = eventTile(e);
  hoverTile = t;
  // ПКМ (кнопка 2), СКМ (кнопка 1) или зажатый Пробел - плавное перемещение карты
  if (e.button === 1 || e.button === 2 || spaceDown) {
    panning = true;
    panLast = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (e.button !== 0) return;
  if (tool === 'select') {
    const hit = pickObject(t.wx, t.wy);
    if (hit) {
      selected = hit;
      isDraggingObj = true;
      canvas.setPointerCapture(e.pointerId);
    } else if (inBounds(t.tx, t.ty)) {
      selected = { kind: 'tile', tx: t.tx, ty: t.ty };
    } else {
      selected = null;
    }
    renderInfo();
    updateStatus(true);
    return;
  }
  snapshot();
  stroke = true;
  applyTool(t);
});

canvas.addEventListener('pointermove', e => {
  const t = eventTile(e);
  hoverTile = t;
  if (panning && panLast) {
    const dx = (e.clientX - panLast.x) / view.zoom;
    const dy = (e.clientY - panLast.y) / view.zoom;
    view.cx -= dx; view.cy -= dy;
    panLast = { x: e.clientX, y: e.clientY };
    updateStatus(false);
    return;
  }
  if (isDraggingObj && selected) {
    if (selected.kind === 'prop' && props[selected.index]) {
      const p = props[selected.index];
      const prevX = p.x;
      const newX = Math.max(0.5, Math.min(cols - 0.5, t.tx + 0.5));
      const dx = newX - prevX;
      if (dx < -0.04) p.flipX = true; // поворот влево при движении влево
      else if (dx > 0.04) p.flipX = false; // поворот вправо при движении вправо
      p.x = newX;
      p.y = Math.max(0.8, Math.min(rows - 0.2, t.ty + 0.8));
      if (p.originX !== undefined) { p.originX = p.x; p.originY = p.y; }
      updateStatus(false);
    } else if (selected.kind === 'marker' && markers[selected.index]) {
      markers[selected.index].x = Math.max(0.5, Math.min(cols - 0.5, t.tx + 0.5));
      markers[selected.index].y = Math.max(0.5, Math.min(rows - 0.5, t.ty + 0.55));
      updateStatus(false);
    }
    return;
  }
  updateHoverTip(e, t);
  if (stroke && (tool === 'tile' || tool === 'prop' || tool === 'marker' || tool === 'erase')) {
    if (tool === 'tile') paintTiles(t.tx, t.ty);
    else if (tool === 'erase') eraseAt(t.wx, t.wy);
    else if (tool === 'prop' && !props.some(p => Math.abs(p.x - (t.tx + 0.5)) < 0.2 && Math.abs(p.y - (t.ty + 0.8)) < 0.2)) placeProp(t.tx, t.ty);
    else if (tool === 'marker' && !markers.some(m => Math.abs(m.x - (t.tx + 0.5)) < 0.2 && Math.abs(m.y - (t.ty + 0.55)) < 0.2)) placeMarker(t.tx, t.ty);
  }
});

canvas.addEventListener('pointerup', () => {
  stroke = false;
  panning = false;
  panLast = null;
  if (isDraggingObj) {
    isDraggingObj = false;
    snapshot();
  }
  canvas.style.cursor = '';
});

canvas.addEventListener('pointerleave', () => {
  hoverTile = null;
  isDraggingObj = false;
  hoverTip.classList.add('hidden');
  canvas.style.cursor = '';
});

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const before = screenToWorld(e.clientX - r.left, e.clientY - r.top);
  view.zoom = clamp(view.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.04, 5);
  const after = screenToWorld(e.clientX - r.left, e.clientY - r.top);
  view.cx += before.x - after.x;
  view.cy += before.y - after.y;
  updateZoomLabel(); updateStatus(false);
}, { passive: false });

function applyTool(t) {
  if (!inBounds(t.tx, t.ty)) return;
  if (tool === 'tile') paintTiles(t.tx, t.ty);
  else if (tool === 'prop') placeProp(t.tx, t.ty);
  else if (markerOrSelect()) placeMarker(t.tx, t.ty);
  else if (tool === 'erase') eraseAt(t.wx, t.wy);
  else if (tool === 'fill') floodFill(t.tx, t.ty);
  else if (tool === 'path') paintPath(t.tx, t.ty);
  else if (tool === 'select') {
    const hit = pickObject(t.wx, t.wy);
    if (hit) selected = hit;
    else if (inBounds(t.tx, t.ty)) selected = { kind: 'tile', tx: t.tx, ty: t.ty };
    else selected = null;
    renderInfo(); updateStatus(true);
  }
}
function markerOrSelect() { return tool === 'marker'; }

function updateHoverTip(e, t) {
  if (tool === 'select') {
    const hit = pickObject(t.wx, t.wy);
    if (hit) {
      if (hit.kind === 'prop') {
        const p = props[hit.index];
        const isNpc = isNpcType(p.type);
        const name = p.name || PROP_DEF[p.type]?.name || p.type;
        const sub = isNpc ? `[NPC: ${p.npcBehavior || 'idle'}]` : (p.clickable ? `[Интерактив: ${p.interactType || 'клик'}]` : '');
        hoverTip.innerHTML = `<b>${escapeHtml(name)}</b> ${escapeHtml(sub)}<br><small style="color:#f3d9a4">Клик для свойств · Зажмите для перемещения</small>`;
      } else {
        const m = markers[hit.index];
        hoverTip.innerHTML = `<b>Метка: ${escapeHtml(MARKER_DEF[m.type]?.name || m.type)}</b><br><small style="color:#f3d9a4">Клик для свойств · Зажмите для перемещения</small>`;
      }
      hoverTip.style.left = (e.clientX + 14) + 'px';
      hoverTip.style.top = (e.clientY + 14) + 'px';
      hoverTip.classList.remove('hidden');
      canvas.style.cursor = 'grab';
      return;
    } else {
      canvas.style.cursor = 'default';
    }
  }
  if (!inBounds(t.tx, t.ty)) { hoverTip.classList.add('hidden'); return; }
  const id = tiles[t.ty][t.tx];
  const name = TILES.find(x => x[0] === id)?.[1] || id;
  hoverTip.textContent = `${t.tx},${t.ty} · ${name}`;
  hoverTip.style.left = (e.clientX + 12) + 'px';
  hoverTip.style.top = (e.clientY + 12) + 'px';
  hoverTip.classList.remove('hidden');
}

addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === ' ') { spaceDown = true; e.preventDefault(); }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { undo(); e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'ы')) { openSaveModal(); e.preventDefault(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const map = { '1': 'tile', '2': 'prop', '3': 'marker', '4': 'select', '5': 'erase', '6': 'fill', '7': 'path' };
  if (map[k]) setTool(map[k]);
  if (k === '[') { brush = Math.max(1, brush - 2); $('brush').value = brush; updateStatus(true); }
  if (k === ']') { brush = Math.min(7, brush + 2); $('brush').value = brush; updateStatus(true); }

  // Поворот на 90° (R / К)
  if (k === 'r' || k === 'к') {
    if (selected?.kind === 'tile' && inBounds(selected.tx, selected.ty)) {
      snapshot();
      const cur = getTileCellData(tiles[selected.ty][selected.tx]);
      cur.rot = (cur.rot + 1) % 4;
      tiles[selected.ty][selected.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Тайл (${selected.tx}, ${selected.ty}) повёрнут на <b>${cur.rot * 90}°</b>`);
    } else if (selected?.kind === 'prop') {
      const p = props[selected.index];
      if (p) {
        snapshot();
        p.rot = ((p.rot || 0) + 1) % 4;
        renderInfo(); updateStatus(true);
        setStatus(`Объект повёрнут на <b>${(p.rot || 0) * 90}°</b>`);
      }
    } else {
      tileRot = (tileRot + 1) % 4;
      updateTileTransformBar();
      setStatus(`Поворот тайла кисти: <b>${tileRot * 90}°</b>`);
    }
  }

  // Отражение по горизонтали (H / Р)
  if (k === 'h' || k === 'р') {
    if (selected?.kind === 'tile' && inBounds(selected.tx, selected.ty)) {
      snapshot();
      const cur = getTileCellData(tiles[selected.ty][selected.tx]);
      cur.flipX = !cur.flipX;
      tiles[selected.ty][selected.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Отражение тайла по горизонтали: <b>${cur.flipX ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
    } else if (selected?.kind === 'prop') {
      const p = props[selected.index];
      if (p) {
        snapshot();
        p.flipX = !p.flipX;
        renderInfo(); updateStatus(true);
        setStatus(`Отражение объекта по горизонтали: <b>${p.flipX ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
      }
    } else {
      tileFlipX = !tileFlipX;
      updateTileTransformBar();
      setStatus(`Отражение кисти по горизонтали: <b>${tileFlipX ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
    }
  }

  // Отражение по вертикали (V / М)
  if (k === 'v' || k === 'м') {
    if (selected?.kind === 'tile' && inBounds(selected.tx, selected.ty)) {
      snapshot();
      const cur = getTileCellData(tiles[selected.ty][selected.tx]);
      cur.flipY = !cur.flipY;
      tiles[selected.ty][selected.tx] = (cur.rot === 0 && !cur.flipX && !cur.flipY && cur.variant === 'normal') ? cur.id : cur;
      rebuildGround(); renderInfo(); updateStatus(true);
      setStatus(`Отражение тайла по вертикали: <b>${cur.flipY ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
    } else if (selected?.kind === 'prop') {
      const p = props[selected.index];
      if (p) {
        snapshot();
        p.flipY = !p.flipY;
        renderInfo(); updateStatus(true);
        setStatus(`Отражение объекта по вертикали: <b>${p.flipY ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
      }
    } else {
      tileFlipY = !tileFlipY;
      updateTileTransformBar();
      setStatus(`Отражение кисти по вертикали: <b>${tileFlipY ? 'ВКЛ' : 'ВЫКЛ'}</b>`);
    }
  }

  if ((k === 'f' || k === 'а') && selected && selected.kind === 'prop') {
    const p = props[selected.index];
    if (p) {
      snapshot();
      p.flipX = !p.flipX;
      renderInfo();
      updateStatus(true);
      setStatus(`Поворот NPC/объекта: <b>${p.flipX ? 'ВЛЕВО ◀' : 'ВПРАВО ▶'}</b>`);
    }
  }
  if ((k === 'delete' || k === 'backspace') && selected) {
    snapshot();
    if (selected.kind === 'prop') props.splice(selected.index, 1); else markers.splice(selected.index, 1);
    selected = null; renderInfo(); updateStatus(true);
  }
});
addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });
addEventListener('blur', () => { spaceDown = false; panning = false; stroke = false; });

$('brush').addEventListener('change', e => { brush = Number(e.target.value); updateStatus(true); });
$('symmetry').addEventListener('change', e => { symmetry = e.target.value; updateStatus(true); });

const presetEl = $('sizePreset');
if (presetEl) {
  presetEl.addEventListener('change', () => {
    if (!presetEl.value) return;
    const parts = presetEl.value.split('x').map(Number);
    if (parts[0] && parts[1]) {
      const [w, h] = parts;
      $('sizeW').value = w;
      $('sizeH').value = h;
      snapshot();
      resetMap(w, h);
      fitView();
      setStatus(`Создана большая карта <b>${w}×${h}</b>`);
    }
    presetEl.value = '';
  });
}

$('applySize').addEventListener('click', () => {
  const w = clamp(Math.round(+$('sizeW').value || cols), 8, 256);
  const h = clamp(Math.round(+$('sizeH').value || rows), 8, 256);
  if (w === cols && h === rows) return;
  snapshot();
  const old = tiles;
  tiles = blankTiles(w, h);
  for (let y = 0; y < Math.min(h, rows); y++) for (let x = 0; x < Math.min(w, cols); x++) tiles[y][x] = old[y][x];
  cols = w; rows = h;
  props = props.filter(p => p.x < cols && p.y < rows);
  markers = markers.filter(m => m.x < cols && m.y < rows);
  rebuildGround(); centerView(); renderInfo(); updateStatus(true);
});
$('newMap').addEventListener('click', () => { snapshot(); resetMap(clamp(Math.round(+$('sizeW').value || cols), 8, 256), clamp(Math.round(+$('sizeH').value || rows), 8, 256)); fitView(); });

const gridSel = $('gridSize');
if (gridSel) {
  gridSel.addEventListener('change', () => {
    TILE = parseInt(gridSel.value, 10) || 48;
    rebuildGround();
    fitView();
    renderInfo();
    updateStatus(true);
    setStatus(`Сетка установлена: <b>${TILE}px</b>`);
  });
}

const mapPresetEl = $('mapPreset');
if (mapPresetEl) {
  mapPresetEl.addEventListener('change', () => {
    loadMapPreset(mapPresetEl.value);
    mapPresetEl.value = '';
  });
}

async function loadMapPreset(id) {
  if (!id) return;
  if (id === 'village') { loadExample(); return; }
  if (id.startsWith('custom:')) {
    const name = id.slice(7);
    const customMaps = getCustomMaps();
    const data = customMaps[name];
    if (data) {
      snapshot();
      currentMapName = name;
      if (data.tileSize) {
        TILE = data.tileSize;
        if ($('gridSize')) $('gridSize').value = String(TILE);
      }
      cols = data.cols;
      rows = data.rows;
      $('sizeW').value = cols;
      $('sizeH').value = rows;
      tiles = data.tiles;
      props = data.props || [];
      markers = data.markers || [];
      selected = null;
      pathStart = null;
      rebuildGround();
      fitView();
      renderInfo();
      updateStatus(true);
      setStatus(`Загружена карта <b>«${escapeHtml(name)}»</b> (${cols}×${rows})`);
      return;
    }
  }
  try {
    const res = await fetch(`../game/maps/${id}.json`);
    if (!res.ok) throw new Error('Файл карты не найден');
    const data = await res.json();
    snapshot();
    currentMapName = data.name || data.title || id;
    if (data.tileSize) {
      TILE = data.tileSize;
      if ($('gridSize')) $('gridSize').value = String(TILE);
    }
    cols = data.cols;
    rows = data.rows;
    $('sizeW').value = cols;
    $('sizeH').value = rows;
    tiles = data.tiles;
    props = data.props;
    markers = data.markers;
    selected = null;
    pathStart = null;
    fitView();
    renderInfo();
    updateStatus(true);
    setStatus(`Загружена карта <b>${data.name || data.title || id}</b> (${cols}×${rows})`);
  } catch (e) {
    setStatus('Ошибка загрузки карты: ' + e.message);
  }
}

const exBtn = $('example');
if (exBtn) exBtn.addEventListener('click', loadExample);
$('undo').addEventListener('click', undo);
$('zoomIn').addEventListener('click', () => { view.zoom = clamp(view.zoom * 1.2, 0.04, 5); updateZoomLabel(); updateStatus(false); });
$('zoomOut').addEventListener('click', () => { view.zoom = clamp(view.zoom / 1.2, 0.04, 5); updateZoomLabel(); updateStatus(false); });
$('zoomFit').addEventListener('click', fitView);
$('autoDecor').addEventListener('click', autoDecorate);
$('clearProps').addEventListener('click', () => { snapshot(); props = []; selected = null; renderInfo(); updateStatus(true); setStatus('Объекты очищены'); });
$('clearMarkers').addEventListener('click', () => { snapshot(); markers = []; selected = null; renderInfo(); updateStatus(true); setStatus('Метки очищены'); });
$('validate').addEventListener('click', validateMap);
$('exportJson').addEventListener('click', exportJson);
$('exportPng').addEventListener('click', exportPng);
$('loadJson').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });

// Модальное окно сохранения карты
const saveBtn = $('saveMapBtn');
if (saveBtn) saveBtn.addEventListener('click', openSaveModal);
const mClose = $('modalCloseBtn');
if (mClose) mClose.addEventListener('click', closeSaveModal);
const mCancel = $('modalCancelBtn');
if (mCancel) mCancel.addEventListener('click', closeSaveModal);
const mConfirm = $('modalConfirmBtn');
if (mConfirm) mConfirm.addEventListener('click', confirmSaveMap);
const mInput = $('modalMapName');
if (mInput) {
  mInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSaveMap();
    if (e.key === 'Escape') closeSaveModal();
  });
}
const sModal = $('saveModal');
if (sModal) {
  sModal.addEventListener('click', e => {
    if (e.target === sModal) closeSaveModal();
  });
}

function updateZoomLabel() { zoomVal.textContent = Math.round(view.zoom * 100) + '%'; }
addEventListener('resize', resizeCanvas);

/* ---------------- GITHUB AUTO-UPDATE SYSTEM ---------------- */

const GH_DEFAULTS = {
  repo: localStorage.getItem('gh_repo') || '',
  branch: localStorage.getItem('gh_branch') || 'main',
  token: localStorage.getItem('gh_token') || '',
  lastCommit: localStorage.getItem('gh_last_commit') || '',
  currentVersion: 'v1.3.0'
};

async function checkGitHubUpdates(manual = false) {
  const repo = $('ghRepoInput')?.value.trim() || GH_DEFAULTS.repo;
  const branch = $('ghBranchInput')?.value.trim() || GH_DEFAULTS.branch;
  const token = $('ghTokenInput')?.value.trim() || GH_DEFAULTS.token;

  if (repo) {
    localStorage.setItem('gh_repo', repo);
    GH_DEFAULTS.repo = repo;
  }
  if (branch) {
    localStorage.setItem('gh_branch', branch);
    GH_DEFAULTS.branch = branch;
  }
  if (token) {
    localStorage.setItem('gh_token', token);
    GH_DEFAULTS.token = token;
  }

  const statusTitle = $('updateStatusText');
  const detailsEl = $('updateDetails');
  const applyBtn = $('btnApplyUpdate');
  const updateBtn = $('btnCheckUpdates');
  const updateBadge = $('updateBadge');

  if (!repo) {
    if (manual) {
      if (statusTitle) statusTitle.textContent = 'Укажите репозиторий GitHub';
      if (detailsEl) detailsEl.textContent = 'Введите имя репозитория в формате "пользователь/репозиторий" (например: yourname/jrpg-map-editor) и нажмите «Проверить сейчас».';
    }
    return;
  }

  if (statusTitle) statusTitle.textContent = 'Связь с GitHub...';
  if (detailsEl) detailsEl.textContent = `Запрос ветки "${branch}" из репозитория ${repo}...`;

  try {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=1`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`GitHub HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      throw new Error('Коммиты не найдены в указанной ветке.');
    }

    const latest = data[0];
    const sha = latest.sha;
    const shortSha = sha.slice(0, 7);
    const author = latest.commit.author?.name || 'GitHub';
    const dateStr = new Date(latest.commit.author?.date).toLocaleString('ru-RU');
    const commitMsg = latest.commit.message;

    const savedLast = localStorage.getItem('gh_last_commit');

    if (savedLast && savedLast !== sha) {
      // Найдено новое обновление!
      if (statusTitle) statusTitle.innerHTML = `<span style="color:#7cfc9a">★ НАЙДЕНО ОБНОВЛЕНИЕ РЕДАКТОРА!</span>`;
      if (detailsEl) detailsEl.innerHTML = `<b>Новый коммит:</b> <code>${shortSha}</code> (${dateStr})<br><b>Автор:</b> ${author}<br><b>Описание:</b>\n${escapeHtml(commitMsg)}`;
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = `⬇ СКАЧАТЬ И ОБНОВИТЬ (${shortSha})`;
      }
      if (updateBtn) updateBtn.classList.add('has-update');
      if (updateBadge) {
        updateBadge.classList.remove('hidden');
        updateBadge.textContent = 'NEW';
      }
      setStatus(`🔔 Доступно обновление редактора на GitHub: <b>${shortSha}</b>`);
    } else {
      localStorage.setItem('gh_last_commit', sha);
      if (statusTitle) statusTitle.innerHTML = `<span style="color:#7cfc9a">✓ У вас актуальная версия</span>`;
      if (detailsEl) detailsEl.innerHTML = `<b>Текущий коммит:</b> <code>${shortSha}</code> (${dateStr})<br><b>Автор:</b> ${author}<br><b>Сообщение:</b>\n${escapeHtml(commitMsg)}`;
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.textContent = '🔄 СКАЧАТЬ АРХИВ ОБНОВЛЕНИЯ';
      }
      if (updateBtn) updateBtn.classList.remove('has-update');
      if (updateBadge) updateBadge.classList.add('hidden');
      if (manual) setStatus(`Редактор актуален (коммит <b>${shortSha}</b>)`);
    }
  } catch (err) {
    console.error('Update check error:', err);
    if (statusTitle) statusTitle.innerHTML = `<span style="color:#ff5a5a">Ошибка проверки</span>`;
    if (detailsEl) detailsEl.textContent = `Не удалось связаться с GitHub:\n${err.message}\n\nПроверьте подключение к интернету или токен доступа.`;
    if (applyBtn) applyBtn.disabled = true;
  }
}

function openUpdateModal() {
  const m = $('updateModal');
  if (!m) return;
  m.classList.remove('hidden');

  if ($('ghRepoInput')) $('ghRepoInput').value = GH_DEFAULTS.repo;
  if ($('ghBranchInput')) $('ghBranchInput').value = GH_DEFAULTS.branch;
  if ($('ghTokenInput')) $('ghTokenInput').value = GH_DEFAULTS.token;

  checkGitHubUpdates(true);
}

function closeUpdateModal() {
  const m = $('updateModal');
  if (m) m.classList.add('hidden');
}

function applyGitHubUpdate() {
  const repo = $('ghRepoInput')?.value.trim() || GH_DEFAULTS.repo;
  const branch = $('ghBranchInput')?.value.trim() || GH_DEFAULTS.branch;
  if (!repo) return;

  const zipUrl = `https://github.com/${repo}/archive/refs/heads/${branch}.zip`;
  window.open(zipUrl, '_blank');
  setStatus('Загрузка обновления начата в браузере. Вы также можете запустить <b>Обновить_Редактор.bat</b>!');
}

const uBtn = $('btnCheckUpdates');
if (uBtn) uBtn.addEventListener('click', openUpdateModal);
const uClose = $('closeUpdateModal');
if (uClose) uClose.addEventListener('click', closeUpdateModal);
const uCancel = $('btnCancelUpdate');
if (uCancel) uCancel.addEventListener('click', closeUpdateModal);
const uCheck = $('btnCheckNow');
if (uCheck) uCheck.addEventListener('click', () => checkGitHubUpdates(true));
const uApply = $('btnApplyUpdate');
if (uApply) uApply.addEventListener('click', applyGitHubUpdate);

const upModal = $('updateModal');
if (upModal) {
  upModal.addEventListener('click', e => {
    if (e.target === upModal) closeUpdateModal();
  });
}

/* ---------------- INIT ---------------- */

async function init() {
  updateCustomMapsDropdown();
  try {
    const cfgRes = await fetch('../editor_config.json');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg.repo && !GH_DEFAULTS.repo) GH_DEFAULTS.repo = cfg.repo;
      if (cfg.branch && !localStorage.getItem('gh_branch')) GH_DEFAULTS.branch = cfg.branch;
      if (cfg.token && !GH_DEFAULTS.token) GH_DEFAULTS.token = cfg.token;
    }
  } catch {}

  const jobs = [];
  for (const [id] of TILES) jobs.push(loadImg(`tiles/${id}.png`).then(img => { images.tiles[id] = img; }).catch(() => {}));
  for (const [id] of PROPS) jobs.push(loadImg(`props/${id}.png`).then(img => { images.props[id] = img; }).catch(() => {}));

  // Загрузка спрайтов стартового героя
  images.hero = {};
  const heroSheets = [
    'idle_front', 'idle_back', 'idle_left', 'idle_right',
    'walk_front', 'walk_back', 'walk_left', 'walk_right',
    'attack', 'cast', 'hit', 'death'
  ];
  for (const name of heroSheets) {
    jobs.push(loadImg(`hero/${name}.png`).then(img => { images.hero[name] = img; }).catch(() => {}));
  }

  await Promise.all(jobs);
  resizeCanvas();
  resetMap(cols, rows);
  fitView();
  buildPalette();
  renderInfo();
  requestAnimationFrame(render);

  // Фоновая проверка обновлений GitHub при старте
  if (GH_DEFAULTS.repo) {
    setTimeout(() => checkGitHubUpdates(false), 2000);
  }
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = `${ASSETS}${src}?v=${Date.now()}`;
  });
}

init();
