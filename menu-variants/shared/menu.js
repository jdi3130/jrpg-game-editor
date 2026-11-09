export function spawnEmbers(container = document.body, count = 22) {
  for (let i = 0; i < count; i += 1) {
    const ember = document.createElement('span');
    ember.className = 'ember';
    ember.style.left = `${Math.random() * 100}vw`;
    ember.style.setProperty('--dx', `${Math.random() * 90 - 45}px`);
    ember.style.animationDuration = `${7 + Math.random() * 10}s`;
    ember.style.animationDelay = `${-Math.random() * 14}s`;
    const size = 2 + Math.random() * 2.5;
    ember.style.width = `${size}px`;
    ember.style.height = `${size}px`;
    container.append(ember);
  }
}

export function initBoot({ minMs = 1500 } = {}) {
  const boot = document.getElementById('boot');
  if (!boot) return;
  spawnEmbers(boot, 26);

  const bar = boot.querySelector('.boot-bar i');
  const press = boot.querySelector('.boot-press');
  const ready = () => boot.classList.add('ready');
  const enter = () => {
    if (boot.dataset.done) return;
    boot.dataset.done = '1';
    boot.classList.add('gone');
    document.body.classList.add('menu-ready');
    spawnEmbers(document.body, 26);
    setTimeout(() => boot.remove(), 1000);
  };

  requestAnimationFrame(() => requestAnimationFrame(ready));
  setTimeout(ready, minMs);

  const onReady = () => {
    if (!press) return;
    press.textContent = 'НАЖМИТЕ ЛЮБУЮ КЛАВИШУ';
  };
  boot.addEventListener('transitionend', onReady, { once: true });

  addEventListener('keydown', enter, { once: true });
  boot.addEventListener('pointerdown', enter, { once: true });
}

export function initMenuNav({ axis = 'y', selector = '.mbtn' } = {}) {
  const focusable = () => [...document.querySelectorAll(selector)].filter((b) => b.offsetParent !== null);
  const select = (list, index) => list.forEach((b, i) => b.classList.toggle('sel', i === index));

  const list = focusable();
  if (!list.length) return;
  select(list, 0);

  addEventListener('keydown', (e) => {
    const items = focusable();
    if (!items.length) return;
    const back = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
    const fwd = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
    const current = items.findIndex((b) => b.classList.contains('sel'));

    if (e.key === back || e.key === fwd) {
      e.preventDefault();
      const next = (current + (e.key === fwd ? 1 : -1) + items.length) % items.length;
      select(items, next);
    } else if (e.key === 'Enter' || e.key === ' ') {
      const target = items[current >= 0 ? current : 0];
      if (target) {
        e.preventDefault();
        target.classList.add('pressed');
        setTimeout(() => target.classList.remove('pressed'), 180);
        target.click();
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    const btn = e.target.closest?.(selector);
    if (!btn) return;
    const items = focusable();
    select(items, items.indexOf(btn));
  });
}
