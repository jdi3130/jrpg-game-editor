const TILE = 96;
const COLS = 26;
const ROWS = 17;
const VIEW_COLS = 14;
const VIEW_ROWS = 9;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const VIEW_W = VIEW_COLS * TILE;
const VIEW_H = VIEW_ROWS * TILE;
const ASSETS = '../public/assets/jrpg/';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const ui = {
  prompt: document.getElementById('prompt'),
  toast: document.getElementById('toast'),
  panel: document.getElementById('panel'),
  panelTitle: document.getElementById('panel-title'),
  panelBody: document.getElementById('panel-body'),
  gold: document.getElementById('goldValue'),
  inv: document.getElementById('invValue')
};

/* ---------------- DATA ---------------- */

const TILE_FILES = {
  m: 'tiles/meadow.png',
  f: 'tiles/grass_flowers.png',
  d: 'tiles/dirt_trail.png',
  c: 'tiles/cobble_path.png',
  p: 'tiles/stone_bricks.png',
  F: 'tiles/forest_floor.png',
  w: 'tiles/shallow_water.png'
};

function buildGrid() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('m'));
  const rect = (x, y, w, h, ch) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (grid[yy] && grid[yy][xx] !== undefined) grid[yy][xx] = ch;
      }
    }
  };
  const hline = (x, y, w, ch) => rect(x, y, w, 1, ch);
  const vline = (x, y, h, ch) => rect(x, y, 1, h, ch);

  for (let x = 0; x < COLS; x++) { grid[0][x] = 'F'; grid[ROWS - 1][x] = 'F'; }
  for (let y = 0; y < ROWS; y++) { grid[y][0] = 'F'; grid[y][COLS - 1] = 'F'; }

  hline(7, 13, 13, 'd');
  vline(12, 11, 5, 'd');
  vline(13, 11, 5, 'd');
  rect(8, 4, 11, 8, 'c');
  rect(3, 2, 4, 3, 'f');
  rect(19, 2, 4, 3, 'f');
  rect(3, 12, 4, 3, 'f');
  rect(19, 12, 4, 3, 'f');
  rect(10, 3, 7, 1, 'p');
  return grid;
}
const GRID = buildGrid();

const feet = (tx, ty, yOffset = 0.78) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE * yOffset });

const PROP_DEFS = [
  // Здания и постройки
  { type: 'house_wood', x: 5.2, y: 5.8, solid: true },
  { type: 'house_stone', x: 21.5, y: 5.8, solid: true },
  { type: 'smithy', x: 7.2, y: 7.6, solid: true },

  // Центральная площадь и украшения
  { type: 'fountain', x: 13.5, y: 7.8, solid: true },
  { type: 'statue_hero', x: 13.5, y: 3.8, solid: true },
  { type: 'well', x: 17.6, y: 5.2, solid: true },
  { type: 'market_stall', x: 16.2, y: 8.4, solid: true },
  { type: 'notice_board', x: 10.5, y: 11.6, solid: true },

  // Анимированные уличные факелы, костры и жаровни
  { type: 'torch_standing', x: 11.5, y: 6.8, solid: false },
  { type: 'torch_standing', x: 15.5, y: 6.8, solid: false },
  { type: 'torch_standing', x: 11.5, y: 13.2, solid: false },
  { type: 'torch_standing', x: 15.5, y: 13.2, solid: false },
  { type: 'campfire', x: 19.5, y: 9.8, solid: true },
  { type: 'brazier_fire', x: 7.2, y: 8.8, solid: true },

  // Деревенские животные
  { type: 'animal_horse', x: 4.8, y: 9.2, solid: true },
  { type: 'animal_dog', x: 12.2, y: 9.6, solid: false },
  { type: 'animal_cat', x: 14.5, y: 8.4, solid: false },
  { type: 'animal_chicken', x: 18.5, y: 11.2, solid: false },
  { type: 'animal_cow', x: 4.2, y: 12.2, solid: true },
  { type: 'animal_sheep', x: 6.2, y: 12.6, solid: true },

  // Стражники у южного входа
  { type: 'warrior_guard', x: 11.6, y: 14.5, solid: true },
  { type: 'warrior_guard', x: 15.4, y: 14.5, solid: true },

  // Прочая утварь
  { type: 'signpost', x: 12.5, y: 14.1 },
  { type: 'chest', x: 11.0, y: 8.0, solid: true },
  { type: 'barrel', x: 8.0, y: 7.25, solid: true },
  { type: 'crate', x: 9.0, y: 7.35, solid: true },
  { type: 'barrel', x: 18.0, y: 7.3, solid: true },
  { type: 'crate', x: 17.0, y: 7.4, solid: true },
  { type: 'barrel', x: 13.2, y: 4.75, solid: true },
  { type: 'crate', x: 11.8, y: 4.85, solid: true },
  { type: 'crate', x: 15.2, y: 10.2, solid: true },
  { type: 'barrel', x: 13.8, y: 10.35, solid: true },
  { type: 'crate', x: 9.4, y: 12.8, solid: true },
  { type: 'boulder', x: 2.6, y: 2.6, solid: true },
  { type: 'boulder', x: 23.4, y: 2.6, solid: true },
  { type: 'boulder', x: 2.6, y: 14.2, solid: true },
  { type: 'boulder', x: 23.4, y: 14.2, solid: true },
  { type: 'rune_stone', x: 20.5, y: 12.4, solid: true }
];

for (let x = 1; x < COLS - 1; x += 3) {
  PROP_DEFS.push({ type: 'pine_tree', x: x + 0.5, y: 1.45, solid: true });
  if (x < 10 || x > 15) PROP_DEFS.push({ type: 'pine_tree', x: x + 0.5, y: 15.55, solid: true });
}
for (let y = 2; y < ROWS - 2; y += 3) {
  PROP_DEFS.push({ type: 'pine_tree', x: 1.45, y: y + 0.5, solid: true });
  PROP_DEFS.push({ type: 'pine_tree', x: COLS - 1.55, y: y + 0.5, solid: true });
}

const ITEMS = {
  sword: { name: 'Меч', price: 120, icon: 'items/sword.png', desc: 'Оружие ближнего боя' },
  axe: { name: 'Топор', price: 140, icon: 'items/axe.png', desc: 'Тяжёлое оружие' },
  staff: { name: 'Посох', price: 160, icon: 'items/staff.png', desc: 'Магическое оружие' },
  bow: { name: 'Лук', price: 150, icon: 'items/bow.png', desc: 'Дальний бой' },
  shield: { name: 'Щит', price: 110, icon: 'items/shield.png', desc: 'Защита' },
  armor: { name: 'Доспех', price: 180, icon: 'items/armor.png', desc: 'Броня' },
  helmet: { name: 'Шлем', price: 90, icon: 'items/helmet.png', desc: 'Защита головы' },
  boots: { name: 'Сапоги', price: 70, icon: 'items/boots.png', desc: 'Броня ног' },
  potion_hp: { name: 'Зелье жизни', price: 30, icon: 'items/potion_hp.png', desc: 'Восстанавливает HP' },
  potion_mp: { name: 'Зелье маны', price: 35, icon: 'items/potion_mp.png', desc: 'Восстанавливает MP' },
  scroll: { name: 'Свиток', price: 80, icon: 'items/scroll.png', desc: 'Редкий предмет' },
  rune: { name: 'Руна', price: 150, icon: 'items/rune.png', desc: 'Древняя руна' },
  ruby: { name: 'Рубин', price: 200, icon: 'items/ruby.png', desc: 'Драгоценный камень' },
  ring: { name: 'Кольцо', price: 220, icon: 'items/ring.png', desc: 'Реликвия' },
  amulet: { name: 'Амулет', price: 240, icon: 'items/amulet.png', desc: 'Реликвия' }
};

const SHOPS = {
  general: { title: 'Торговец', items: ['scroll', 'rune', 'ruby', 'ring', 'amulet'] },
  weapon: { title: 'Торговец оружия', items: ['sword', 'axe', 'staff', 'bow', 'shield'] },
  armor: { title: 'Торговец брони', items: ['armor', 'helmet', 'boots'] },
  potion: { title: 'Торговец зелий', items: ['potion_hp', 'potion_mp'] }
};

const NPCS = [
  { id: 'weapon', name: 'Торговец оружия', kind: 'shop', shop: 'weapon', tx: 8.4, ty: 6.4, propType: 'merchant_weapon', icon: 'items/sword.png' },
  { id: 'armor', name: 'Торговец брони', kind: 'shop', shop: 'armor', tx: 17.6, ty: 6.4, propType: 'warrior_knight', icon: 'items/armor.png' },
  { id: 'potion', name: 'Торговец зелий', kind: 'shop', shop: 'potion', tx: 12.6, ty: 4.1, propType: 'merchant_potion', icon: 'items/potion_hp.png' },
  { id: 'general', name: 'Торговец', kind: 'shop', shop: 'general', tx: 14.6, ty: 9.6, propType: 'merchant_general', icon: 'items/gold.png' },
  { id: 'quest', name: 'Старейшина Эльда', kind: 'quest', tx: 10.1, ty: 12.1, propType: 'npc_elder', icon: 'items/scroll.png' },
  { id: 'chest', name: 'Сундук хранения', kind: 'chest', tx: 11.0, ty: 8.0, hue: 0, icon: 'props/chest.png', sprite: false },

  // Интерактивные городские объекты и персонажи
  {
    id: 'notice_board', name: 'Доска объявлений', kind: 'dialogue', tx: 10.5, ty: 11.6, icon: 'items/scroll.png', sprite: false,
    title: 'Городские объявления',
    text: `• <b>Опасность в восточном лесу</b>: Замечены сектанты и бродячая нежить. Одиночным путникам не сходить с брусчатки!<br><br>• <b>Заказ от кузнеца</b>: Срочно требуется руда и рубины для ковки доспехов. Высокая оплата.<br><br>• <b>Праздник урожая</b>: В каменной таверне свежий эль, горячий яблочный пирог и песни бардов.`
  },
  {
    id: 'fountain', name: 'Фонтан желаний', kind: 'dialogue', tx: 13.5, ty: 7.8, icon: 'items/ruby.png', sprite: false,
    title: 'Фонтан желаний',
    text: `Прозрачные струи воды звенят о резной камень. На дне чаши поблёскивает несколько золотых монет.<br><br>Говорят, если бросить монетку с чистым сердцем — удача не оставит вас в бою.`,
    action: 'coin'
  },
  {
    id: 'well', name: 'Колодец', kind: 'dialogue', tx: 17.6, ty: 5.2, icon: 'items/potion_hp.png', sprite: false,
    title: 'Деревенский колодец',
    text: `Глубокий каменный колодец с дубовым воротом. Вода из подземных ключей кристально чистая и ледяная.`,
    action: 'drink'
  },
  {
    id: 'dog', name: 'Пёс Барбос', kind: 'dialogue', tx: 12.2, ty: 9.6, icon: 'items/boots.png', sprite: false,
    title: 'Верный пёс Барбос',
    text: `Пёс приветливо виляет хвостом, радостно поскуливает и тычется влажным носом в ваши ладони.`,
    action: 'pet_dog'
  },
  {
    id: 'cat', name: 'Рыжий кот', kind: 'dialogue', tx: 14.5, ty: 8.4, icon: 'items/ring.png', sprite: false,
    title: 'Рыжий кот Мурзик',
    text: `Кот щурит изумрудные глаза на тёплом солнышке и лениво потягивается.`,
    action: 'pet_cat'
  },
  {
    id: 'guard', name: 'Стражник Родерик', kind: 'dialogue', tx: 11.6, ty: 14.5, icon: 'items/shield.png', sprite: false,
    title: 'Городская стража',
    text: `«Стой, путник! Деревня Оквуд мирная, но окрестные земли кишат чудовищами. Если задумал идти в чащу — запасись зельями и доброй бронёй у наших мастеров».`
  }
];

const PROP_SIZE = {
  pine_tree: 128, dead_tree: 104, boulder: 96, chest: 98, signpost: 78,
  barrel: 76, crate: 80, gravestone: 88, ruin_statue: 112, bones: 56, rune_stone: 88, campfire: 96,
  fountain: 120, statue_hero: 116, torch_standing: 104, well: 108, market_stall: 124, notice_board: 104,
  house_wood: 210, house_stone: 220, smithy: 210,
  warrior_guard: 106, warrior_knight: 106, warrior_archer: 106, warrior_mercenary: 106,
  merchant_weapon: 106, merchant_potion: 106, merchant_general: 106, npc_elder: 106,
  npc_villager_m: 106, npc_villager_f: 106, npc_girl: 98, npc_maid: 106,
  animal_horse: 116, animal_cow: 112, animal_sheep: 92, animal_dog: 90, animal_cat: 72, animal_chicken: 68
};
const PROP_HIT = {
  pine_tree: 36, dead_tree: 30, boulder: 30, chest: 28, signpost: 14, barrel: 22, crate: 22, gravestone: 24, ruin_statue: 30, bones: 12, rune_stone: 24, campfire: 20,
  fountain: 38, statue_hero: 32, torch_standing: 14, well: 32, market_stall: 36, notice_board: 28,
  house_wood: 60, house_stone: 64, smithy: 60,
  warrior_guard: 26, warrior_knight: 26, warrior_archer: 24, warrior_mercenary: 26,
  merchant_weapon: 26, merchant_potion: 26, merchant_general: 26, npc_elder: 26,
  npc_villager_m: 24, npc_villager_f: 24, npc_girl: 20, npc_maid: 24,
  animal_horse: 32, animal_cow: 30, animal_sheep: 22, animal_dog: 18, animal_cat: 12, animal_chicken: 10
};

const HERO_SIZE = 112;
const NPC_SIZE = 106;
const ICON_SIZE = 40;

const player = { x: 12.5 * TILE, y: 14.0 * TILE, dir: 'front', moving: false, anim: 0 };
let gold = 250;
let inv = {};
let chestGold = 0;
let questState = 'none';
let uiOpen = false;
let nearest = null;
let camX = 0;
let camY = 0;

const keys = new Set();
const images = {};
let groundCanvas = null;

/* ---------------- HELPERS ---------------- */

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`load failed: ${src}`));
    img.src = `${ASSETS}${src}?v=${Date.now()}`;
  });
}

function tileAt(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 'F';
  return GRID[ty][tx];
}

const props = PROP_DEFS.map(p => {
  const pos = feet(p.x, p.y, 0.8);
  return { ...p, px: pos.x, py: pos.y, radius: PROP_HIT[p.type] || 20, size: PROP_SIZE[p.type] || 80 };
});

const npcs = NPCS.map(n => {
  const pos = feet(n.tx, n.ty, 0.78);
  return { ...n, x: pos.x, y: pos.y, radius: 60 };
});

function circleHitsProp(x, y, prop) {
  const cx = prop.px;
  const cy = prop.py - prop.size * 0.30;
  const dx = x - cx;
  const dy = (y - 30) - cy;
  const r = prop.radius + 16;
  return dx * dx + dy * dy < r * r;
}

function collides(x, y) {
  const minX = TILE + 12, maxX = WORLD_W - TILE - 12;
  const minY = TILE + 14, maxY = WORLD_H - TILE - 10;
  if (x < minX || x > maxX || y < minY || y > maxY) return true;
  const bodyTile = tileAt(x, y - 34);
  if (bodyTile === 'F' || bodyTile === 'w') return true;
  for (const p of props) {
    if (p.solid && circleHitsProp(x, y, p)) return true;
  }
  return false;
}

function movePlayer(dx, dy, dt) {
  const speed = 170;
  const nx = player.x + dx * speed * dt;
  if (!collides(nx, player.y)) player.x = nx;
  const ny = player.y + dy * speed * dt;
  if (!collides(player.x, ny)) player.y = ny;
}

function nearestNpc() {
  let best = null;
  let bestD = 120;
  for (const n of npcs) {
    const dx = n.x - player.x;
    const dy = n.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function updateHud() {
  ui.gold.textContent = gold;
  ui.inv.textContent = `предметов: ${Object.values(inv).reduce((a, b) => a + b, 0)}`;
}

function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => ui.toast.classList.add('hidden'), 1600);
}

function openPanel(title, bodyHtml) {
  ui.panelTitle.textContent = title;
  ui.panelBody.innerHTML = bodyHtml;
  ui.panel.classList.remove('hidden');
  uiOpen = true;
  ui.prompt.classList.add('hidden');
}

function closePanel() {
  ui.panel.classList.add('hidden');
  uiOpen = false;
}

/* ---------------- PANELS ---------------- */

function shopHtml(shopId) {
  const shop = SHOPS[shopId];
  const rows = shop.items.map(id => {
    const item = ITEMS[id];
    const owned = inv[id] || 0;
    const disabled = gold < item.price ? 'disabled' : '';
    return `<div class="shop-item">
      <img src="${ASSETS}${item.icon}" alt="">
      <div><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div></div>
      <div class="shop-price">${item.price} зол.</div>
      <div class="shop-owned">x${owned}</div>
      <button class="px-btn" data-buy="${id}" ${disabled}>КУПИТЬ</button>
    </div>`;
  }).join('');
  return `<div class="shop-list">${rows}</div>`;
}

function renderShop(shopId) {
  openPanel(SHOPS[shopId].title, shopHtml(shopId));
  ui.panelBody.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.buy;
      const item = ITEMS[id];
      if (gold < item.price) return;
      gold -= item.price;
      inv[id] = (inv[id] || 0) + 1;
      updateHud();
      renderShop(shopId);
      toast(`Куплено: ${item.name}`);
    });
  });
}

function renderQuest() {
  let text = '';
  let button = '';
  if (questState === 'none') {
    text = 'Старейшина Эльда: «Деревня в безопасности, но торговые пути требуют внимания. Принеси припасы для каравана — награда будет честной».';
    button = `<button class="px-btn" id="questAccept">ПРИНЯТЬ ЗАДАНИЕ</button>`;
  } else if (questState === 'active') {
    text = 'Старейшина Эльда: «Припасы собраны? Тогда иди к торговцам и проверь, всё ли готово к отправке».';
    button = `<button class="px-btn" id="questComplete">ЗАВЕРШИТЬ · +60 золота</button>`;
  } else {
    text = 'Старейшина Эльда: «Деревня благодарит тебя. Заходи ещё — всегда рады».';
    button = '';
  }
  openPanel('Задание', `<div class="quest-text">${text}</div><div class="quest-reward">Награда: 60 золота</div>${button}`);
  document.getElementById('questAccept')?.addEventListener('click', () => {
    questState = 'active';
    renderQuest();
    toast('Задание принято');
  });
  document.getElementById('questComplete')?.addEventListener('click', () => {
    questState = 'done';
    gold += 60;
    updateHud();
    renderQuest();
    toast('+60 золота');
  });
}

function renderChest() {
  const canDeposit = gold > 0;
  const canWithdraw = chestGold > 0;
  openPanel('Сундук хранения', `
    <div class="chest-row"><span>У вас</span><b>${gold} золота</b></div>
    <div class="chest-row"><span>В сундуке</span><b>${chestGold} золота</b></div>
    <button class="px-btn" id="chestDeposit" ${canDeposit ? '' : 'disabled'}>ПОЛОЖИТЬ ВСЁ</button>
    <button class="px-btn" id="chestWithdraw" ${canWithdraw ? '' : 'disabled'}>ВЗЯТЬ ВСЁ</button>
  `);
  document.getElementById('chestDeposit')?.addEventListener('click', () => {
    chestGold += gold;
    gold = 0;
    updateHud();
    renderChest();
    toast('Золото положено в сундук');
  });
  document.getElementById('chestWithdraw')?.addEventListener('click', () => {
    gold += chestGold;
    chestGold = 0;
    updateHud();
    renderChest();
    toast('Золото взято из сундука');
  });
}

function interact(npc) {
  if (npc.kind === 'shop') renderShop(npc.shop);
  else if (npc.kind === 'quest') renderQuest();
  else if (npc.kind === 'chest') renderChest();
  else if (npc.kind === 'dialogue') renderDialogue(npc);
}

function renderDialogue(npc) {
  let button = '';
  if (npc.action === 'coin') {
    button = `<button class="px-btn" id="dialogueAct" ${gold > 0 ? '' : 'disabled'}>БРОСИТЬ 1 ЗОЛОТОЙ НА УДАЧУ</button>`;
  } else if (npc.action === 'drink') {
    button = `<button class="px-btn" id="dialogueAct">ИСПИТЬ СТУДЁНОЙ ВОДЫ</button>`;
  } else if (npc.action === 'pet_dog') {
    button = `<button class="px-btn" id="dialogueAct">ПОГЛАДИТЬ ПСА</button>`;
  } else if (npc.action === 'pet_cat') {
    button = `<button class="px-btn" id="dialogueAct">ПОЧЕСАТЬ ЗА УШКОМ</button>`;
  }

  openPanel(npc.title || npc.name, `
    <div class="quest-text">${npc.text}</div>
    ${button}
  `);

  if (npc.action) {
    document.getElementById('dialogueAct')?.addEventListener('click', () => {
      if (npc.action === 'coin') {
        if (gold > 0) {
          gold -= 1;
          updateHud();
          closePanel();
          toast('Вода заискрилась! Удача улыбнулась вам (+1 Удача)');
        }
      } else if (npc.action === 'drink') {
        closePanel();
        toast('Студёная вода освежает! Сил прибавилось.');
      } else if (npc.action === 'pet_dog') {
        closePanel();
        toast('Барбос довольно тявкает и виляет хвостом!');
      } else if (npc.action === 'pet_cat') {
        closePanel();
        toast('Мурзик громко мурлычет и трётся о сапог.');
      }
    });
  }
}

/* ---------------- DRAW ---------------- */

function drawGround() {
  groundCanvas = document.createElement('canvas');
  groundCanvas.width = WORLD_W;
  groundCanvas.height = WORLD_H;
  const g = groundCanvas.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const img = images.tiles[TILE_FILES[GRID[y][x]]];
      if (img) g.drawImage(img, x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function tintedSheet(src, hue) {
  const img = images.hero.sheets[src];
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  try { x.filter = `hue-rotate(${hue}deg) saturate(1.15) brightness(1.06)`; } catch {}
  x.drawImage(img, 0, 0);
  return c;
}

function drawSheet(sheet, action, anim, x, y, size) {
  const frames = action === 'walk' ? 4 : 2;
  const fps = action === 'walk' ? 7 : 2.4;
  const cell = 128;
  const frame = Math.floor(anim * fps) % frames;
  const sx = frame * cell;
  ctx.drawImage(sheet, sx, 0, cell, cell, x - size / 2, y - size, size, size);
}

function isFireProp(type) {
  return /campfire|torch|brazier|smithy|candles|lava|crystal|fire/.test(type);
}

function drawFireGlow(c, px, py, size, type) {
  const t = performance.now() / 1000;
  const seed = (px * 3.7 + py * 7.1) % 100;
  const flicker = 0.88 + Math.sin(t * 7.2 + seed) * 0.09 + Math.sin(t * 18.5 + seed * 2.3) * 0.05;

  const isRitual = type === 'campfire_ritual';
  const isLava = type.includes('lava');
  const isCandle = type.includes('candles');
  const isEmbers = type === 'campfire_ashes';

  const flameOffsetY = isCandle ? size * 0.35 : (type.includes('torch') ? size * 0.72 : size * 0.45);
  const fx = px;
  const fy = py - flameOffsetY;

  const glowRadius = Math.max(30, size * (isCandle ? 0.65 : (isLava ? 1.35 : 1.15)) * flicker);

  c.save();
  const grad = c.createRadialGradient(fx, fy, 4, fx, fy, glowRadius);
  if (isRitual) {
    grad.addColorStop(0, `rgba(180, 235, 255, ${0.52 * flicker})`);
    grad.addColorStop(0.35, `rgba(130, 65, 255, ${0.30 * flicker})`);
    grad.addColorStop(0.7, `rgba(50, 10, 160, ${0.12 * flicker})`);
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

function drawFireSparks(c, px, py, size, type) {
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

function drawProp(p) {
  const img = images.props[p.type];
  if (!img) return;

  // Анимация свечения под огнём
  if (isFireProp(p.type)) {
    drawFireGlow(ctx, p.px, p.py, p.size, p.type);
  }

  const dx = Math.round(p.px - p.size / 2);
  const dy = Math.round(p.py - p.size);
  const ds = Math.round(p.size);

  if (img.width > img.height && img.width % img.height === 0) {
    const frames = img.width / img.height;
    const cell = img.height;
    const fps = frames >= 4 ? 6 : 2.5;
    const seed = (Math.round((p.x || p.px || 0) * 3) + Math.round((p.y || p.py || 0) * 7)) % frames;
    const frame = (Math.floor(performance.now() / 1000 * fps) + seed) % frames;
    ctx.drawImage(img, frame * cell, 0, cell, cell, dx, dy, ds, ds);
  } else {
    ctx.drawImage(img, dx, dy, ds, ds);
  }

  // Горящие летающие искры над огнём
  if (isFireProp(p.type)) {
    drawFireSparks(ctx, p.px, p.py, p.size, p.type);
  }
}

function drawShadow(x, y, rx) {
  ctx.beginPath();
  ctx.ellipse(x, y - 2, rx, rx * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  ctx.fill();
}

function drawNpc(n, time) {
  if (n.sprite === false) {
    if (nearest === n) drawLabel(n.name, n.x, n.y - 96);
    return;
  }
  drawShadow(n.x, n.y, 30);

  // Поворот NPC лицом к игроку при приближении
  if (Math.hypot(n.x - player.x, n.y - player.y) < 170) {
    n.flipX = (player.x < n.x);
  }

  ctx.save();
  if (n.flipX) {
    ctx.translate(n.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-n.x, 0);
  }

  const dx = Math.round(n.x - NPC_SIZE / 2);
  const dy = Math.round(n.y - NPC_SIZE);
  const ds = Math.round(NPC_SIZE);

  const img = n.propType ? images.props[n.propType] : null;
  if (img) {
    if (img.width > img.height && img.width % img.height === 0) {
      const frames = img.width / img.height;
      const cell = img.height;
      const fps = n.propType && n.propType.startsWith('animal') ? 7 : (frames >= 4 ? 3.5 : 2.5);
      const frame = Math.floor(time * fps) % frames;
      ctx.drawImage(img, frame * cell, 0, cell, cell, dx, dy, ds, ds);
    } else {
      ctx.drawImage(img, dx, dy, ds, ds);
    }
  } else {
    const sheet = n._sheet || (n._sheet = tintedSheet('idle_front', n.hue));
    drawSheet(sheet, 'idle', time, n.x, n.y, NPC_SIZE);
  }
  ctx.restore();

  const icon = images.items[n.icon];
  if (icon) {
    const bob = Math.sin(time * 2.4 + n.x) * 4;
    ctx.drawImage(icon, n.x - ICON_SIZE / 2, n.y - NPC_SIZE - 34 + bob, ICON_SIZE, ICON_SIZE);
  }
  if (nearest === n || Math.hypot(n.x - player.x, n.y - player.y) < 190) {
    drawLabel(n.name, n.x, n.y - NPC_SIZE - 48);
  }
}

function drawPlayer(time) {
  const action = player.moving ? 'walk' : 'idle';
  const sheet = images.hero[`${action}_${player.dir}`];
  if (!sheet) return;
  drawShadow(player.x, player.y, 34);
  drawSheet(sheet, action, player.anim, player.x, player.y, HERO_SIZE);
}

function drawLabel(text, x, y) {
  ctx.font = '15px Handjet, Pixelify Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,.92)';
  ctx.fillStyle = '#ffd9a8';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

function drawSelection() {
  if (!nearest) return;
  ctx.beginPath();
  ctx.arc(nearest.x, nearest.y - 10, 52, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 190, 90, 0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function updateCamera() {
  camX = Math.max(0, Math.min(WORLD_W - VIEW_W, Math.round(player.x - VIEW_W / 2)));
  camY = Math.max(0, Math.min(WORLD_H - VIEW_H, Math.round(player.y - VIEW_H / 2)));
}

function inView(x, y, margin = 140) {
  return x > camX - margin && x < camX + VIEW_W + margin && y > camY - margin && y < camY + VIEW_H + margin;
}

function render(time) {
  updateCamera();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (groundCanvas) ctx.drawImage(groundCanvas, camX, camY, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

  const drawables = [];
  for (const p of props) if (inView(p.px, p.py)) drawables.push({ y: p.py, kind: 'prop', p });
  for (const n of npcs) if (inView(n.x, n.y)) drawables.push({ y: n.y, kind: 'npc', n });
  if (inView(player.x, player.y)) drawables.push({ y: player.y, kind: 'player' });
  drawables.sort((a, b) => a.y - b.y);

  ctx.save();
  ctx.translate(-camX, -camY);
  for (const d of drawables) {
    if (d.kind === 'prop') drawProp(d.p);
    else if (d.kind === 'npc') drawNpc(d.n, time);
    else drawPlayer(time);
  }
  drawSelection();
  ctx.restore();
}

/* ---------------- LOOP ---------------- */

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  if (!uiOpen) {
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || keys.has('ф') || keys.has('Ф')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D') || keys.has('в') || keys.has('В')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W') || keys.has('ц') || keys.has('Ц')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S') || keys.has('ы') || keys.has('Ы')) dy += 1;

    if (dx || dy) {
      player.moving = true;
      player.anim += dt;
      if (Math.abs(dx) >= Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
      else player.dir = dy > 0 ? 'front' : 'back';
      const len = Math.hypot(dx, dy);
      movePlayer(dx / len, dy / len, dt);
    } else {
      player.moving = false;
      player.anim = 0;
    }

    nearest = nearestNpc();
    if (nearest) {
      const label = nearest.kind === 'chest' ? 'E — открыть сундук' : `E — ${nearest.name}`;
      ui.prompt.textContent = label;
      ui.prompt.classList.remove('hidden');
    } else {
      ui.prompt.classList.add('hidden');
    }
  } else {
    nearest = null;
  }

  render(time);
  requestAnimationFrame(loop);
}

/* ---------------- INPUT ---------------- */

addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.add(key);
  if (uiOpen && (e.key === 'Escape' || key === 'e')) { closePanel(); e.preventDefault(); return; }
  if (!uiOpen && (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У')) {
    if (nearest) interact(nearest);
  }
});
addEventListener('keyup', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.delete(key);
});
addEventListener('blur', () => keys.clear());

ui.panel.querySelector('#panel-close').addEventListener('click', closePanel);
ui.panel.addEventListener('click', (e) => { if (e.target === ui.panel) closePanel(); });

canvas.addEventListener('click', (e) => {
  if (uiOpen) return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const wx = camX + (e.clientX - rect.left) * sx;
  const wy = camY + (e.clientY - rect.top) * sy;
  let best = null;
  let bestD = 70;
  for (const n of npcs) {
    const d = Math.hypot(n.x - wx, n.y - wy);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (best && Math.hypot(best.x - player.x, best.y - player.y) < 150) interact(best);
});

/* ---------------- INIT ---------------- */

async function init() {
  const tileKeys = Object.keys(TILE_FILES);
  await Promise.all(tileKeys.map(k => loadImg(TILE_FILES[k]).then(img => { images.tiles = images.tiles || {}; images.tiles[TILE_FILES[k]] = img; }).catch(() => {})));

  const propTypes = [...new Set([...props.map(p => p.type), ...npcs.map(n => n.propType).filter(Boolean)])];
  images.props = {};
  await Promise.all(propTypes.map(t => loadImg(`props/${t}.png`).then(img => { images.props[t] = img; }).catch(() => {})));

  const itemIcons = new Set();
  Object.values(ITEMS).forEach(i => itemIcons.add(i.icon));
  npcs.forEach(n => itemIcons.add(n.icon));
  images.items = {};
  await Promise.all([...itemIcons].map(src => loadImg(src).then(img => { images.items[src] = img; }).catch(() => {})));

  images.hero = {};
  const heroFiles = {
    idle_front: 'idle_front.png', idle_back: 'idle_back.png', idle_left: 'idle_left.png', idle_right: 'idle_right.png',
    walk_front: 'walk_front.png', walk_back: 'walk_back.png', walk_left: 'walk_left.png', walk_right: 'walk_right.png'
  };
  await Promise.all(Object.entries(heroFiles).map(([key, file]) =>
    loadImg(`hero/${file}`).then(img => { images.hero[key] = img; }).catch(() => {})
  ));
  images.hero.sheets = {
    idle_front: images.hero.idle_front,
    idle_back: images.hero.idle_back,
    idle_left: images.hero.idle_left,
    idle_right: images.hero.idle_right
  };

  drawGround();
  updateHud();
  requestAnimationFrame(loop);
}

init();
