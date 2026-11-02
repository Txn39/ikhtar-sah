/* اختَر صح — السكربت المشترك
   مصدر البيانات الوحيد: phones.json
   لإضافة هاتف جديد: أضف سجلاً هناك، وصفحته تكون phone.html?id=<id> */
(() => {
  'use strict';
  const IK = (window.IK = {});

  /* ---------- تطبيع النصوص (عربي/إنجليزي) ---------- */
  IK.normalize = s => String(s || '').toLowerCase()
    .replace(/[\s\-_]+/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

  /* ---------- تحميل البيانات ---------- */
  let cache = null;
  IK.load = () => {
    if (!cache) {
      cache = fetch('phones.json', { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
          data.phones.forEach(p => {
            p.search = [p.name, p.model, (p.brand || '') + ' ' + p.model, ...(p.aliases || [])]
              .map(IK.normalize);
            p.scores = IK.rate(p);
          });
          return data;
        });
    }
    return cache;
  };

  IK.find = (phones, query) => {
    const q = IK.normalize(query);
    if (!q) return [];
    return phones.filter(p => p.search.some(s => s.includes(q)));
  };

  IK.price = p => {
    if (!p.price_usd) return 'السعر غير متوفر';
    let t = '$' + p.price_usd.toLocaleString('en-US');
    if (p.price_iqd) t += ' — ' + p.price_iqd.toLocaleString('en-US') + ' د.ع';
    return t;
  };

  IK.go = p => { location.href = p.page; };

  /* ---------- درجات تقديرية (قواعد معلنة، ليست اختبارات) ---------- */
  IK.METRICS = ['الأداء', 'الشاشة', 'الكاميرات', 'البطارية', 'الشحن'];
  const clamp = n => Math.max(0, Math.min(10, n));
  const num = (s, re) => { const m = String(s || '').replace(/,/g, '').match(re); return m ? Number(m[1]) : null; };
  const field = (p, k) => String((p.specs && p.specs[k]) || '');

  // فئة المعالج (تقدير حسب الفئة وليس اختبار أداء). يُرجع null إذا المعالج غير مصنّف.
  const CPU_TIERS = [
    [/8 elite gen ?5/, 9.5], [/dimensity 9500/, 9.4], [/a19 ?pro/, 9.3],
    [/8 elite/, 9.0], [/dimensity 9400/, 9.0], [/a18 ?pro/, 8.9],
    [/dimensity 9300/, 8.6], [/8 gen ?3/, 8.5], [/8 gen ?2/, 8.0],
    [/dimensity 8[45]00/, 7.6], [/8300/, 7.3]
  ];

  IK.rate = p => {
    const cpu = field(p, 'المعالج').toLowerCase().replace(/\s+/g, ' ');
    const tier = CPU_TIERS.find(([re]) => re.test(cpu));
    const performance = tier ? tier[1] : null;

    const display = field(p, 'الشاشة');
    const hz = num(display, /(\d{2,3})\s*hz/i);
    const dims = field(p, 'الدقة').match(/(\d{3,4})\s*[×xX]\s*(\d{3,4})/);
    const pixels = dims ? Number(dims[1]) * Number(dims[2]) : null;
    const screen = hz != null
      ? clamp(5.5 + Math.min(hz, 144) / 144 * 2.5 + (pixels != null ? (pixels >= 4000000 ? 2 : pixels >= 3000000 ? 1.5 : 1) : 0))
      : null;

    // تقييم تجهيزات التصوير فقط، لا جودة الصور.
    const main = field(p, 'الكاميرا الرئيسية'), tele = field(p, 'التقريب'), wide = field(p, 'الواسعة جداً');
    const camera = main
      ? clamp(5.5 + (tele ? 1.5 : 0) + (wide ? 1 : 0) + (/ois/i.test(main) ? 1 : 0) + (/ois/i.test(tele) ? 0.5 : 0) + (/1 بوصة|1\/1\.3/i.test(main) ? 0.5 : 0))
      : null;

    const batt = field(p, 'البطارية');
    const mah = num(batt, /(\d{4,5})\s*mah/i);
    const watts = num(batt, /(\d{2,3})\s*w\b/i);
    return {
      'الأداء': performance,
      'الشاشة': screen,
      'الكاميرات': camera,
      'البطارية': mah != null ? clamp(2 + Math.min(mah, 8500) / 8500 * 8) : null,
      'الشحن': watts != null ? clamp(2 + Math.min(watts, 150) / 150 * 8) : null
    };
  };

  /* ---------- اقتراحات أثناء الكتابة ---------- */
  const style = document.createElement('style');
  style.textContent = `
.ik-suggest{position:fixed;z-index:60;background:#fff;color:#21152f;border:1px solid rgba(117,69,206,.3);border-radius:14px;box-shadow:0 12px 30px rgba(41,25,78,.18);padding:6px;max-height:300px;overflow:auto}
html[data-theme="dark"] .ik-suggest{background:#202538;color:#f1edfa;border-color:#50416f}
.ik-suggest[hidden]{display:none}
.ik-suggest__item{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;gap:12px;width:100%;padding:10px 12px;border-radius:10px;cursor:pointer;font:600 13px Cairo,Tahoma,sans-serif}
.ik-suggest__item:hover,.ik-suggest__item.is-active{background:rgba(117,69,206,.14)}
.ik-suggest__item span{opacity:.7;font-weight:500}
.ik-suggest__empty{padding:10px 12px;font-size:13px;opacity:.75}
.ik-toast{position:fixed;inset-inline:16px;bottom:18px;z-index:70;max-width:420px;margin-inline:auto;padding:12px 16px;border-radius:14px;background:#21152f;color:#fff;font:600 13px/1.8 Cairo,Tahoma,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3)}`;
  document.head.appendChild(style);

  IK.toast = text => {
    const el = document.createElement('div');
    el.className = 'ik-toast'; el.setAttribute('role', 'status'); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  };

  IK.suggest = (input, getPhones, onPick) => {
    const box = document.createElement('div');
    box.className = 'ik-suggest'; box.setAttribute('role', 'listbox'); box.hidden = true;
    document.body.appendChild(box);
    let items = [], idx = -1;

    const place = () => {
      const r = input.getBoundingClientRect();
      const margin = 10;
      const width = Math.min(r.width, window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(r.left, window.innerWidth - width - margin));
      const viewHeight = window.visualViewport ? window.visualViewport.height + window.visualViewport.offsetTop : window.innerHeight;
      const below = viewHeight - r.bottom - 8;
      const above = r.top - 8;
      const useAbove = below < 155 && above > below && above > 120;
      box.style.width = width + 'px';
      box.style.left = left + 'px';
      box.style.maxHeight = Math.max(60, Math.min(250, useAbove ? above - 8 : below - 8)) + 'px';
      box.style.top = useAbove ? 'auto' : (r.bottom + 4) + 'px';
      box.style.bottom = useAbove ? (viewHeight - r.top + 4) + 'px' : 'auto';
    };
    const close = () => { box.hidden = true; idx = -1; };
    const render = () => {
      const q = input.value.trim();
      box.replaceChildren();
      if (!q) { close(); return; }
      items = IK.find(getPhones(), q).slice(0, 6);
      idx = -1;
      if (!items.length) {
        const d = document.createElement('div');
        d.className = 'ik-suggest__empty';
        d.textContent = 'ما لقينا هالهاتف حالياً، راح نضيفه قريباً.';
        box.appendChild(d);
      } else {
        items.forEach(p => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'ik-suggest__item'; b.setAttribute('role', 'option');
          const n = document.createElement('strong'); n.textContent = p.name;
          const pr = document.createElement('span'); pr.textContent = IK.price(p);
          b.append(n, pr);
          b.addEventListener('mousedown', e => e.preventDefault());
          b.addEventListener('click', () => { close(); onPick(p); });
          box.appendChild(b);
        });
      }
      place(); box.hidden = false;
    };

    input.addEventListener('input', render);
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('keydown', e => {
      const btns = [...box.querySelectorAll('.ik-suggest__item')];
      if (e.key === 'Escape') { close(); return; }
      if (!btns.length || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      idx = e.key === 'ArrowDown' ? (idx + 1) % btns.length : (idx - 1 + btns.length) % btns.length;
      btns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
    });
    window.addEventListener('scroll', () => { if (!box.hidden) place(); }, { passive: true });
    window.addEventListener('resize', () => { if (!box.hidden) place(); });
    return { close, refresh: render, active: () => (idx >= 0 ? items[idx] : null) };
  };

  /* ---------- نص خطأ عند فتح الملفات بدون خادم ---------- */
  IK.loadError = () => 'تعذّر تحميل بيانات الهواتف (phones.json). شغّل الموقع عبر Live Server بدل فتح الملف مباشرة.';

  /* ---------- بحث سريع لصفحات الهواتف ---------- */
  window.quickSearchPhone = async () => {
    const input = document.getElementById('quickPhoneSearch');
    if (!input) return;
    if (!input.value.trim()) { input.focus(); return; }
    try {
      const { phones } = await IK.load();
      const m = IK.find(phones, input.value);
      if (m.length === 1) IK.go(m[0]);
      else input.dispatchEvent(new Event('input'));
    } catch (e) { IK.toast(IK.loadError()); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    /* صورة بديلة إذا الصورة ما تحمّلت (روابط خارجية قد تتعطل) */
    document.querySelectorAll('.hero img, main img').forEach(img => {
      const fallback = () => {
        if (/phone-placeholder\.svg$/.test(img.getAttribute('src') || '')) return;
        img.src = 'phone-placeholder.svg';
        img.alt = 'رسم توضيحي للهاتف، الصورة الفعلية غير متوفرة';
      };
      img.addEventListener('error', fallback, { once: true });
      if (img.complete && img.naturalWidth === 0) fallback();
    });

    const input = document.getElementById('quickPhoneSearch');
    const priceBox = document.querySelector('.ik-phone-price strong');
    if (!input && !priceBox) return;

    IK.load().then(({ phones }) => {
      if (input) {
        const s = IK.suggest(input, () => phones, IK.go);
        input.addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const a = s.active();
          if (a) IK.go(a); else window.quickSearchPhone();
        });
      }
      const here = location.pathname.split('/').pop();
      const cur = phones.find(p => p.page === here);
      if (priceBox && cur) priceBox.textContent = 'السعر التجريبي: ' + IK.price(cur);
    }).catch(() => {
      if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); IK.toast(IK.loadError()); } });
    });
  });
})();
