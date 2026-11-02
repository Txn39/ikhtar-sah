// متحكم الثيم الموحّد لكل الصفحات + إيقاف حركة الخلفية عند إخفاء التبويب.
(() => {
  const key = 'siteTheme';
  const paletteKey = 'sitePalette';
  document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('paletteSelect');
  if (!select) return;

  select.value = document.documentElement.dataset.palette || 'violet';

  select.addEventListener('change', () => {
    const selected = select.value;

    document.documentElement.dataset.palette = selected;

    try {
      localStorage.setItem('sitePalette', selected);
    } catch (e) {}
  });
});
const palettes = ['violet', 'pine', 'burgundy', 'copper'];

let savedPalette = null;

try {
  savedPalette = localStorage.getItem(paletteKey);
} catch (e) {}

document.documentElement.dataset.palette =
  palettes.includes(savedPalette) ? savedPalette : 'violet';
  const read = () => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  const write = v => { try { localStorage.setItem(key, v); } catch (e) { /* التخزين غير متاح */ } };
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;

  const stored = read();
  root.dataset.theme = stored === 'dark' || stored === 'light' ? stored : (media.matches ? 'dark' : 'light');

  const sync = () => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const dark = root.dataset.theme === 'dark';
    btn.textContent = dark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي');
    btn.setAttribute('aria-pressed', String(dark));
    btn.title = dark ? 'الوضع النهاري' : 'الوضع الليلي';
  };

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    sync();
    if (btn) btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      write(next);
      sync();
    });
  });

  if (media.addEventListener) media.addEventListener('change', e => {
    const v = read();
    if (v !== 'dark' && v !== 'light') { root.dataset.theme = e.matches ? 'dark' : 'light'; sync(); }
  });

  // لا تحرّك الخلفية والتبويب مخفي (توفير بطارية)
  const pause = () => root.classList.toggle('ik-paused', document.hidden);
  document.addEventListener('visibilitychange', pause);
  pause();
})();

// Premium micro-interactions: lightweight, accessible, and non-invasive.
(() => {
  document.addEventListener('click', event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.target.closest('button, .compare-button, a.compare-card');
    if (!target || target.disabled) return;
    target.classList.remove('ik-pressed');
    void target.offsetWidth;
    target.classList.add('ik-pressed');
    target.addEventListener('animationend', () => target.classList.remove('ik-pressed'), { once:true });
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const results = document.querySelector('#finderResults');
    if (!results || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(() => {
      for (const item of results.children) {
        if (item.dataset.ikAnimated) continue;
        item.dataset.ikAnimated = '1';
        item.classList.add('ik-enter');
      }
    });
    observer.observe(results, {childList:true});
  });
})();
