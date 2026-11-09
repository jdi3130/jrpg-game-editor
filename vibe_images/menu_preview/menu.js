// Общая логика меню: клавиатурная навигация, угольки, лёгкий звук клика-заглушка.
export function initMenu({ axis = 'y' } = {}) {
  const focusable = () =>
    [...document.querySelectorAll('.mbtn')].filter((b) => b.offsetParent !== null);

  const select = (list, index) => {
    list.forEach((b, i) => b.classList.toggle('sel', i === index));
  };

  let index = 0;
  const list = focusable();
  if (list.length) select(list, 0);

  addEventListener('keydown', (e) => {
    const items = focusable();
    if (!items.length) return;
    const back = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
    const fwd = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
    const current = items.findIndex((b) => b.classList.contains('sel'));
    if (e.key === back || e.key === fwd) {
      e.preventDefault();
      index = current;
      index = (index + (e.key === fwd ? 1 : -1) + items.length) % items.length;
      select(items, index);
    } else if (e.key === 'Enter' || e.key === ' ') {
      const target = items[current >= 0 ? current : 0];
      if (target) { e.preventDefault(); target.click(); }
    }
  });

  document.addEventListener('mousemove', (e) => {
    const btn = e.target.closest?.('.mbtn');
    if (!btn) return;
    const items = focusable();
    select(items, items.indexOf(btn));
  });

  // угольки
  for (let i = 0; i < 16; i++) {
    const ember = document.createElement('span');
    ember.className = 'ember';
    ember.style.left = Math.random() * 100 + 'vw';
    ember.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    ember.style.animationDuration = (7 + Math.random() * 9) + 's';
    ember.style.animationDelay = -Math.random() * 12 + 's';
    ember.style.width = ember.style.height = (2 + Math.random() * 2) + 'px';
    document.body.append(ember);
  }
}
