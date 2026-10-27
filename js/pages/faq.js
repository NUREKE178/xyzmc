/**
 * FAQ: аккордеон + баннеры Discord / Telegram для связи.
 */
(function () {
  'use strict';
  const { C, $, esc, section, head, pageHero, banners, reveal } = window.XYZ;

  const Q = C.faq;
  const list = section(`<div class="faq">${Q.items.map((f) => `
    <details class="faq__item"><summary>${esc(f.q)}<span class="faq__plus" aria-hidden="true"></span></summary><div class="faq__a"><p>${esc(f.a)}</p></div></details>`).join('')}
  </div>`);

  const contact = section(`${head(Q.moreTitle, Q.moreSubtitle)}<div class="banners">${banners(['discord', 'telegram'])}</div>`, 'section--alt');

  $('#main').innerHTML = pageHero(C.pages.faq) + list + contact;
  reveal();
})();
