/**
 * Полный текст новости: article.html?id=…
 */
(function () {
  'use strict';
  const { C, $, esc, plain, label, section, pageHero, loadContent, sortNews, newsCard, formatDate, paragraphs, animate } = window.XYZ;
  const N = C.news;
  const id = new URLSearchParams(location.search).get('id');

  $('#main').innerHTML = '<section class="section"><div class="container"><div class="article article--loading" aria-busy="true"><i></i><i></i><i></i></div></div></section>';

  loadContent().then((content) => {
    const list = sortNews(content.news);
    const item = list.find((n) => String(n.id) === id);
    if (!item) {
      document.title = `Новость не найдена — ${C.site.name}`;
      $('#main').innerHTML = pageHero({ crumbs: [{ label: C.pages.news.crumb, href: 'news.html' }], current: 'Не найдено', title: 'Новость не найдена', subtitle: 'Возможно, она была удалена или ссылка неверна.' }) +
        section(`<div class="center"><a class="btn btn--lg" href="news.html">${label(N.allLabel, 'pxr')}</a></div>`);
      return animate();
    }
    document.title = `${item.title} — ${C.site.name}`;
    const canonical = document.querySelector('link[rel=canonical]');
    if (canonical) canonical.href = location.origin + location.pathname + '?id=' + encodeURIComponent(item.id);
    const others = list.filter((n) => n !== item).slice(0, 3);
    const short = item.title.length > 48 ? item.title.slice(0, 48).replace(/\s+\S*$/, '') + '…' : item.title;
    $('#main').innerHTML =
      pageHero({ crumbs: [{ label: C.pages.news.crumb, href: 'news.html' }], current: short, title: item.title }) +
      section(`<article class="article">
          ${item.image ? `<div class="article__cover"><img src="${esc(item.image)}" alt="" width="1200" height="675"></div>` : ''}
          <p class="article__meta"><time datetime="${esc(item.date)}">${formatDate(item.date)}</time></p>
          <div class="article__body">${paragraphs(item.text)}</div>
          <div class="article__back"><a class="btn btn--secondary" href="news.html">${label(N.allLabel, 'pxr')}</a></div>
        </article>`) +
      (others.length ? section(`<header class="head"><h2 class="head__title">Читайте также</h2></header><div class="news-grid">${others.map(newsCard).join('')}</div>`, 'section--alt') : '');
    animate();
  });
})();
