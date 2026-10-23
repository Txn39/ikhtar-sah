// One theme controller for all pages.
(() => {
  const key = 'siteTheme';
  const stored = localStorage.getItem(key);
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const initial = stored === 'dark' || stored === 'light' ? stored : preferred;
  document.documentElement.dataset.theme = initial;
  const sync = () => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    btn.textContent = dark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي');
    btn.setAttribute('aria-pressed', String(dark));
    btn.title = dark ? 'الوضع النهاري' : 'الوضع الليلي';
  };
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    sync();
    if (btn) btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(key, next);
      sync();
    });
  });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener?.('change', event => {
    if (localStorage.getItem(key) !== 'dark' && localStorage.getItem(key) !== 'light') {
      document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
      sync();
    }
  });
})();
