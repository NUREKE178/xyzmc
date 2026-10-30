/**
 * Главная: hero (кнопка открывает окно «Играть сейчас») → последние новости → баннеры «Магазин / Соцсети».
 */
(function () {
  'use strict';
  const { C, $, esc, rich, label, section, head, banners, loadContent, sortNews, newsCard, newsSkeleton, animate } = window.XYZ;
  const N = C.news;

  const hero = `
    <section class="hero" id="home">
      <div class="hero__bg"><img class="hero__img" src="${esc(C.hero.image)}" alt="" fetchpriority="high"></div>
      <div class="container hero__inner">
        ${C.hero.version ? `<p class="hero__ver anim" style="--d:.05s">${esc(C.hero.version)}</p>` : ''}
        <h1 class="hero__title anim" style="--d:.15s">${rich(C.hero.title)}</h1>
        <p class="hero__sub anim" style="--d:.3s">${esc(C.hero.subtitle)}</p>
        <div class="anim" style="--d:.45s"><a class="btn btn--lg" href="play.html" data-open-play>${label(C.hero.playButton, 'play')}</a></div>
      </div>
    </section>`;

  const news = section(`${head(N.title, N.subtitle)}
    <div class="news-grid" id="newsGrid" aria-live="polite">${newsSkeleton(N.homeCount)}</div>
    <div class="center"><a class="btn btn--lg" href="${esc(N.moreHref)}">${label(N.moreLabel, 'pxr')}</a></div>`);

  const promo = section(`<div class="banners">${banners()}</div>`, 'section--alt');

  $('#main').innerHTML = hero + news + promo;
  animate();

  // Новости подгружаются из API (или config.js, если API недоступен)
  loadContent().then((content) => {
    const grid = $('#newsGrid');
    const latest = sortNews(content.news).slice(0, N.homeCount);
    grid.innerHTML = latest.length ? latest.map(newsCard).join('') : `<p class="empty">${esc(N.empty)}</p>`;
    animate(grid);
  });
})();
