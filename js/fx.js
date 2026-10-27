/**
 * XYZ — эффекты главной: парящие блоки, параллакс hero от курсора и скролла,
 * свет за курсором. Только transform/opacity, цикл останавливается, когда hero
 * вне экрана. При prefers-reduced-motion ничего не запускается.
 */
(function () {
  'use strict';
  const { $, reduceMotion } = window.XYZ;

  // Блоки: случайные размеры, скорость и глубина
  function spawnCubes(box) {
    const count = innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('i');
      const size = 14 + Math.random() * 34;
      el.className = 'cube' + (i % 5 === 0 ? ' cube--pink' : '');
      el.style.cssText =
        `left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `animation-duration:${26 + Math.random() * 28}s;animation-delay:-${Math.random() * 50}s;` +
        `--o:${(0.25 + (size / 48) * 0.45).toFixed(2)}`;
      box.appendChild(el);
    }
  }

  // Параллакс: слои смещаются против курсора, контент уходит вверх и тает при скролле
  function parallax(hero) {
    const layers = [
      { el: $('.hero__bg', hero), k: 14 },
      { el: $('.hero__orbs', hero), k: 28 },
      { el: $('.hero__cubes', hero), k: 46 },
    ];
    const inner = $('.hero__inner', hero);
    const hint = $('.hero__scroll', hero);
    let tx = 0, ty = 0, cx = 0, cy = 0, spotX = 0, spotY = 0, visible = true, raf = 0;

    const frame = () => {
      raf = 0;
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      for (const l of layers) l.el.style.transform = `translate3d(${(-cx * l.k).toFixed(2)}px,${(-cy * l.k).toFixed(2)}px,0)`;

      const y = Math.min(scrollY, hero.offsetHeight);
      const fade = Math.max(0, 1 - y / (hero.offsetHeight * 0.75));
      inner.style.transform = `translate3d(0,${(y * 0.18).toFixed(1)}px,0)`;
      inner.style.opacity = fade.toFixed(3);
      if (hint) hint.style.opacity = Math.max(0, 1 - y / 120).toFixed(2);
      hero.style.setProperty('--sx', spotX + 'px');
      hero.style.setProperty('--sy', spotY + 'px');

      if (visible && (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001)) schedule();
    };
    const schedule = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      spotX = e.clientX - r.left; spotY = e.clientY - r.top;
      schedule();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; schedule(); });
    addEventListener('scroll', schedule, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) schedule(); }).observe(hero);
    }
    schedule();
  }

  window.XYZ.fx = {
    hero() {
      if (reduceMotion) return;
      const hero = $('#home');
      spawnCubes($('.hero__cubes', hero));
      parallax(hero);
    },
  };
})();
