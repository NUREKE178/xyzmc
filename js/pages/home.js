/**
 * Главная: hero → новости (слайдер) → баннеры «Магазин / Discord / Telegram».
 */
(function () {
  'use strict';
  const { C, $, $$, esc, rich, plain, extAttrs, formatDate, label, section, head, banners, reveal } = window.XYZ;

  const hero = `
    <section class="hero" id="home">
      <img class="hero__img" src="${esc(C.hero.image)}" alt="" fetchpriority="high">
      <div class="container hero__inner">
        <p class="hero__ver">${esc(C.hero.version || '')}</p>
        <h1 class="hero__title">${rich(C.hero.title)}</h1>
        <p class="hero__sub">${esc(C.hero.subtitle)}</p>
        <a class="btn btn--lg" href="${esc(C.hero.playHref)}">${label(C.hero.playButton, 'play')}</a>
      </div>
    </section>`;

  const N = C.news;
  const news = section(`
    <div id="news">${head(N.title, N.subtitle)}
      <div class="news" id="newsShow" role="region" aria-roledescription="carousel" aria-label="${esc(plain(N.title))}">${N.items.map((n, i) => `
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
      <div class="news__ctl">
        <button class="sq-btn" id="prev" type="button" aria-label="Назад">${window.XYZ.icon('pxl')}</button>
        <div class="dots">${N.items.map((n, i) => `<button class="dot${i ? '' : ' on'}" type="button" aria-label="Новость ${i + 1}"></button>`).join('')}</div>
        <button class="sq-btn" id="next" type="button" aria-label="Вперёд">${window.XYZ.icon('pxr')}</button>
      </div>
      <div class="center"><a class="btn btn--pink btn--lg" href="${esc(N.moreHref)}"${extAttrs(N.moreHref)}>${label(N.moreLabel, 'pxr')}</a></div>
    </div>`);

  const promo = section(`<div class="banners">${banners()}</div>`, 'section--alt');

  $('#main').innerHTML = hero + news + promo;

  /* Слайдер новостей */
  const slides = $$('.news__slide'), dots = $$('.dot'), root = $('#newsShow');
  let current = 0;
  const go = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((el, k) => { el.classList.toggle('on', k === current); el.setAttribute('aria-hidden', String(k !== current)); });
    dots.forEach((el, k) => el.classList.toggle('on', k === current));
  };
  $('#prev').onclick = () => go(current - 1);
  $('#next').onclick = () => go(current + 1);
  dots.forEach((d, k) => { d.onclick = () => go(k); });
  $('#news').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });
  let x0 = null;                                              // свайп на сенсорных экранах
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
  });

  reveal();
})();
