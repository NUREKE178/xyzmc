/**
 * Архив новостей: все публикации, по умолчанию — порциями «Показать ещё».
 */
(function () {
  'use strict';
  const { C, $, esc, label, section, pageHero, loadContent, sortNews, newsCard, newsSkeleton, animate } = window.XYZ;
  const N = C.news, P = C.pages.news;

  $('#main').innerHTML = pageHero({ current: P.crumb, title: P.title, subtitle: P.subtitle }) +
    section(`<div class="news-grid" id="newsGrid" aria-live="polite">${newsSkeleton(N.pageSize)}</div><div class="center" id="moreWrap" hidden><button class="btn btn--secondary btn--lg loadmore" id="moreBtn" type="button">${label(N.showMore, 'pxr')}</button></div>`);
  animate();

  loadContent().then((content) => {
    const list = sortNews(content.news);
    const grid = $('#newsGrid'), wrap = $('#moreWrap');
    if (!list.length) { grid.innerHTML = `<p class="empty">${esc(N.empty)}</p>`; return; }
    let shown = 0;
    const render = (first) => {
      const next = list.slice(shown, shown + N.pageSize);
      if (first) grid.innerHTML = '';
      grid.insertAdjacentHTML('beforeend', next.map(newsCard).join(''));
      shown += next.length;
      wrap.hidden = shown >= list.length;
      animate(grid);
    };
    render(true);
    $('#moreBtn').onclick = () => render(false);
  });
})();
