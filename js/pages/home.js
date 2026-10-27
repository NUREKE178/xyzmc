/**
 * Главная: hero → новости (слайдер с автопрокруткой) → баннеры «Магазин / Discord / Telegram».
 */
(function () {
  'use strict';
  const { C, $, $$, esc, rich, plain, extAttrs, formatDate, icon, label, section, head, banners, reveal, reduceMotion, fx } = window.XYZ;

  /* ---------- Hero ---------- */
  // Заголовок режется на строки; каждая выезжает из-под маски
  const title = C.hero.title.split('\n').map((line, i) =>
    `<span class="line"><span class="line__in" style="--d:${(0.25 + i * 0.14).toFixed(2)}s">${rich(line)}</span></span>`).join('');

  const hero = `
    <section class="hero" id="home">
      <div class="hero__bg" aria-hidden="true"><img class="hero__img" src="${esc(C.hero.image)}" alt="" fetchpriority="high"></div>
      <div class="hero__orbs" aria-hidden="true"><i class="orb orb--1"></i><i class="orb orb--2"></i><i class="orb orb--3"></i></div>
      <div class="hero__cubes" aria-hidden="true"></div>
      <div class="hero__spot" aria-hidden="true"></div>
      <div class="container hero__inner">
        <p class="hero__ver anim" style="--d:.05s">${esc(C.hero.version || '')}</p>
        <h1 class="hero__title">${title}</h1>
        <p class="hero__sub anim" style="--d:.65s">${esc(C.hero.subtitle)}</p>
        <div class="hero__cta anim" style="--d:.85s"><a class="btn btn--lg" href="${esc(C.hero.playHref)}">${label(C.hero.playButton, 'play')}</a></div>
      </div>
      <a class="hero__scroll anim" style="--d:1.6s" href="#news" aria-label="Листать вниз"></a>
    </section>`;

  /* ---------- Новости ---------- */
  const N = C.news;
  const news = section(`
    <div id="news">${head(N.title, N.subtitle)}
      <div class="news" id="newsShow" data-anim style="--d:.2s" role="region" aria-roledescription="carousel" aria-label="${esc(plain(N.title))}">${N.items.map((n, i) => `
        <article class="news__slide${i ? '' : ' on'}" aria-hidden="${i ? 'true' : 'false'}">
          <div>
            <h3 class="news__title"><a href="${esc(n.href)}"${extAttrs(n.href)}>${esc(n.title)}</a></h3>
            <p class="news__text">${esc(n.text || '')}</p>
            <div class="news__meta"><time datetime="${esc(n.date)}">${formatDate(n.date)}</time><span class="news__line"></span>
              <a class="news__more" href="${esc(n.href)}"${extAttrs(n.href)}>${esc(N.readMore)} ▸</a></div>
          </div>
          <a class="news__img" href="${esc(n.href)}"${extAttrs(n.href)} tabindex="-1" aria-hidden="true"><img src="${esc(n.image)}" alt="" ${i ? 'loading="lazy"' : ''} width="720" height="405"></a>
        </article>`).join('')}
      </div>
      <div class="news__ctl" data-anim style="--d:.3s">
        <button class="sq-btn" id="prev" type="button" aria-label="Назад">${icon('pxl')}</button>
        <div class="dots">${N.items.map((n, i) => `<button class="dot${i ? '' : ' on'}" type="button" aria-label="Новость ${i + 1}"><span class="dot__bar"></span></button>`).join('')}</div>
        <button class="sq-btn" id="next" type="button" aria-label="Вперёд">${icon('pxr')}</button>
      </div>
      <div class="center" data-anim style="--d:.4s"><a class="btn btn--pink btn--lg" href="${esc(N.moreHref)}"${extAttrs(N.moreHref)}>${label(N.moreLabel, 'pxr')}</a></div>
    </div>`, 'reveal--stage');

  const promo = section(`<div class="banners">${banners()}</div>`, 'section--alt reveal--stage');

  $('#main').innerHTML = hero + news + promo;

  /* ---------- Слайдер: направление, автопрокрутка с индикатором, пауза по наведению ---------- */
  const root = $('#newsShow'), box = $('#news');
  const slides = $$('.news__slide'), dots = $$('.dot');
  let current = 0;

  const go = (i, dir) => {
    const next = (i + slides.length) % slides.length;
    if (next === current) return;
    const way = dir || (i > current ? 'next' : 'prev');
    root.dataset.dir = way;
    const out = slides[current];
    out.classList.remove('on'); out.classList.add('leaving'); out.setAttribute('aria-hidden', 'true');
    setTimeout(() => out.classList.remove('leaving'), 650);
    current = next;
    slides[current].classList.add('on'); slides[current].setAttribute('aria-hidden', 'false');
    dots.forEach((el, k) => el.classList.toggle('on', k === current));
  };
  $('#prev').onclick = () => go(current - 1, 'prev');
  $('#next').onclick = () => go(current + 1, 'next');
  dots.forEach((d, k) => { d.onclick = () => go(k); });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1, 'prev');
    if (e.key === 'ArrowRight') go(current + 1, 'next');
  });

  if (reduceMotion || slides.length < 2) {
    box.classList.add('no-auto');
  } else {
    // следующий слайд включается, когда индикатор активной точки дозаполнился
    $('.dots').addEventListener('animationend', (e) => { if (e.animationName === 'dot-fill') go(current + 1, 'next'); });
    const pause = (on) => box.classList.toggle('is-paused', on);
    box.addEventListener('pointerenter', () => pause(true));
    box.addEventListener('pointerleave', () => pause(false));
    box.addEventListener('focusin', () => pause(true));
    box.addEventListener('focusout', () => pause(false));
  }

  let x0 = null;                                              // свайп на сенсорных экранах
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
  });

  reveal();
  fx.hero();
})();
