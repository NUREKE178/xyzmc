/**
 * Плавная прокрутка колесом мыши (инерция), без библиотек.
 *
 * Принципы, чтобы сайт никогда не «залипал»:
 *  - включается только на устройствах с мышью/трекпадом; на телефонах, при prefers-reduced-motion — родная прокрутка;
 *  - цикл анимации работает, только пока страница догоняет цель, и сам останавливается;
 *  - клавиатура, перетаскивание полосы прокрутки и переходы по якорям остаются родными — мы лишь подстраиваемся под них;
 *  - не вмешиваемся в поля ввода, открытые окна и вложенные прокручиваемые блоки;
 *  - если кадры стабильно «тяжёлые» (медленный компьютер), плавность сама отключается до конца сессии.
 */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  try { if (sessionStorage.getItem('xyz-smooth-off')) return; } catch (e) { /* ignore */ }

  const html = document.documentElement;
  const TAU = 110;                       // постоянная времени сглаживания, мс (меньше — резче, больше — плавнее)
  let target = scrollY, current = scrollY, raf = 0, last = 0, slow = 0, active = true;

  const maxScroll = () => Math.max(0, html.scrollHeight - innerHeight);
  const clampY = (v) => Math.min(maxScroll(), Math.max(0, v));
  const ignore = (el) => el && el.closest && el.closest('textarea, select, input, [data-no-smooth], .mobile-nav, dialog[open]');
  // есть ли внутри блока своя вертикальная прокрутка, которая ещё может двигаться в нужную сторону
  const innerScroller = (el, dy) => {
    for (let n = el; n && n !== document.body && n !== html; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
        if (dy < 0 ? n.scrollTop > 0 : n.scrollTop + n.clientHeight < n.scrollHeight - 1) return true;
      }
    }
    return false;
  };

  function disable() {
    active = false;
    cancelAnimationFrame(raf); raf = 0;
    removeEventListener('wheel', onWheel);
    try { sessionStorage.setItem('xyz-smooth-off', '1'); } catch (e) { /* ignore */ }
  }

  function tick(now) {
    const raw = now - last; last = now;
    // защита от «тяжёлых» кадров: несколько подряд — отключаем плавность, остаётся родная прокрутка
    slow = raw > 55 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 10) { window.scrollTo({ top: target, behavior: 'instant' }); disable(); return; }
    const dt = Math.min(raw, 50);
    current += (target - current) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - current) < 0.5) current = target;
    window.scrollTo({ top: current, behavior: 'instant' });       // instant — иначе CSS scroll-behavior: smooth запустит свою анимацию
    raf = current === target ? 0 : requestAnimationFrame(tick);
  }

  function onWheel(e) {
    if (!active || e.defaultPrevented || e.ctrlKey || e.metaKey) return;       // ctrl+колесо — масштаб
    if (html.classList.contains('modal-open') || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (ignore(e.target)) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 34 : e.deltaMode === 2 ? innerHeight : 1);
    if (innerScroller(e.target, dy)) return;
    e.preventDefault();
    if (!raf) { current = scrollY; target = scrollY; }
    target = clampY(target + dy);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  // Прокрутка не от нас (клавиатура, полоса прокрутки, якорь): забываем цель и подстраиваемся
  addEventListener('scroll', () => {
    if (raf && Math.abs(scrollY - current) < 3) return;          // это наш собственный шаг
    cancelAnimationFrame(raf); raf = 0;
    current = target = scrollY;
  }, { passive: true });
  addEventListener('resize', () => { target = clampY(target); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; current = target = scrollY; } });
  addEventListener('wheel', onWheel, { passive: false });
})();
