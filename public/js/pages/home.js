/**
 * Главная: hero → одна актуальная новость в слайдере → блок «Магазин» → блок «Соцсети».
 * Кнопка «Играть сейчас» открывает окно (core.js), «Больше новостей» ведёт в архив.
 */
(function () {
  'use strict';
  const { C, $, $$, esc, rich, plain, extAttrs, formatDate, icon, label, section, head, banners, loadContent, sortNews, excerpt, articleUrl, reduceMotion, animate } = window.XYZ;
  const N = C.news;

  const hero = `
    <section class="hero" id="home">
      <div class="hero__bg"><img class="hero__img" src="${esc(C.hero.image)}" alt="" fetchpriority="high"></div>
      <div class="container hero__inner">
        ${C.hero.version ? `<p class="hero__ver anim" style="--d:.05s">${esc(C.hero.version)}</p>` : ''}
        <h1 class="hero__title anim" style="--d:.15s">${rich(C.hero.title)}</h1>
        <p class="hero__sub anim" style="--d:.3s">${esc(C.hero.subtitle)}</p>
        <div class="anim" style="--d:.45s"><a class="btn btn--xl" href="play.html" data-open-play>${label(C.hero.playButton, 'play')}</a></div>
      </div>
    </section>`;

  const news = section(`<div id="news">${head(N.title, N.subtitle)}
      <div class="slider" id="slider" aria-roledescription="carousel" aria-label="${esc(plain(N.title))}">
        <div class="slider__stage" id="stage" aria-live="polite"><div class="slide on slide--skeleton" aria-hidden="true"><div><i></i><i></i><i></i></div><div class="slide__img"></div></div></div>
        <div class="slider__ctl" id="ctl" hidden></div>
      </div>
      <div class="center"><a class="btn btn--red btn--lg" href="${esc(N.moreHref)}">${label(N.moreLabel, 'pxr')}</a></div>
    </div>`, 'section--news');

  // «Магазин» и «Соцсети» — два отдельных блока: каждый появляется, только когда до него долистали
  const shop = section(`<div class="banners">${banners(['shop'])}</div>`, 'section--banner');
  const social = section(`<div class="banners">${banners(['social'])}</div>`, 'section--banner section--alt');

  $('#main').innerHTML = hero + news + shop + social;
  animate();

  loadContent().then((content) => {
    const items = sortNews(content.news).slice(0, N.sliderCount);
    const stage = $('#stage'), ctl = $('#ctl');
    if (!items.length) { stage.innerHTML = `<p class="empty">${esc(N.empty)}</p>`; return; }

    stage.innerHTML = items.map((n, i) => `
      <article class="slide${i ? '' : ' on'}" aria-hidden="${i ? 'true' : 'false'}">
        <div class="slide__text">
          <h3 class="slide__title"><a href="${esc(articleUrl(n))}">${esc(n.title)}</a></h3>
          <p class="slide__excerpt">${esc(excerpt(n, 190))}</p>
          <div class="slide__meta"><time datetime="${esc(n.date)}">${formatDate(n.date)}</time><span class="slide__line"></span><a class="slide__more" href="${esc(articleUrl(n))}">${esc(N.readMore)} ▸</a></div>
        </div>
        <a class="slide__img" href="${esc(articleUrl(n))}" tabindex="-1" aria-hidden="true">${n.image ? `<img src="${esc(n.image)}" alt="" ${i ? 'loading="lazy"' : ''} width="900" height="506">` : '<span class="slide__ph"></span>'}</a>
      </article>`).join('');

    const slides = $$('.slide', stage);
    if (slides.length < 2) return;
    ctl.hidden = false;
    ctl.innerHTML = `<button class="sq-btn" id="prev" type="button" aria-label="Назад">${icon('pxl')}</button>
      <div class="dots">${slides.map((s, i) => `<button class="dot${i ? '' : ' on'}" type="button" aria-label="Новость ${i + 1}"><span class="dot__bar"></span></button>`).join('')}</div>
      <button class="sq-btn" id="next" type="button" aria-label="Вперёд">${icon('pxr')}</button>`;
    const dots = $$('.dot', ctl), box = $('#slider');
    let current = 0;

    const go = (i, dir) => {
      const next = (i + slides.length) % slides.length;
      if (next === current) return;
      box.dataset.dir = dir || (i > current ? 'next' : 'prev');
      const out = slides[current];
      out.classList.remove('on'); out.classList.add('leaving'); out.setAttribute('aria-hidden', 'true');
      setTimeout(() => out.classList.remove('leaving'), 700);
      current = next;
      slides[current].classList.add('on'); slides[current].setAttribute('aria-hidden', 'false');
      dots.forEach((d, k) => d.classList.toggle('on', k === current));
    };
    $('#prev').onclick = () => go(current - 1, 'prev');
    $('#next').onclick = () => go(current + 1, 'next');
    dots.forEach((d, k) => { d.onclick = () => go(k); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(current - 1, 'prev');
      if (e.key === 'ArrowRight') go(current + 1, 'next');
    });
    let x0 = null;                                                      // свайп
    box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    });

    // Автопрокрутка: точка-индикатор заполняется, затем следующий слайд; пауза при наведении и фокусе
    if (reduceMotion) box.classList.add('no-auto');
    else {
      ctl.addEventListener('animationend', (e) => { if (e.animationName === 'dot-fill') go(current + 1, 'next'); });
      const pause = (on) => box.classList.toggle('is-paused', on);
      box.addEventListener('pointerenter', () => pause(true));
      box.addEventListener('pointerleave', () => pause(false));
      box.addEventListener('focusin', () => pause(true));
      box.addEventListener('focusout', () => pause(false));
    }
  });
})();
