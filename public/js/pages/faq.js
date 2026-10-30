/**
 * FAQ: аккордеон + баннер «Соцсети» для связи.
 */
(function () {
  'use strict';
  const { C, $, esc, section, head, pageHero, banners, animate } = window.XYZ;
  const Q = C.faq;

  const list = section(`<div class="faq">${Q.items.map((f) => `
    <details class="faq__item"><summary>${esc(f.q)}<span class="faq__plus" aria-hidden="true"></span></summary><div class="faq__a"><p>${esc(f.a)}</p></div></details>`).join('')}
  </div>`);
  const contact = section(`${head(Q.moreTitle, Q.moreSubtitle)}<div class="banners">${banners(['social'])}</div>`, 'section--alt');

  $('#main').innerHTML = pageHero({ current: C.pages.faq.crumb, title: C.pages.faq.title, subtitle: C.pages.faq.subtitle }) + list + contact;
  animate();
})();
