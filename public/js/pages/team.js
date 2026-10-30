/**
 * «Команда»: карточки из админки (или config.js). Фото — загруженное в админке, иначе скин по нику.
 */
(function () {
  'use strict';
  const { C, $, esc, section, pageHero, loadContent, memberImage, wireSkinFallback, animate } = window.XYZ;
  const P = C.pages.team;

  $('#main').innerHTML = pageHero({ current: P.crumb, title: P.title, subtitle: P.subtitle }) +
    section('<ul class="team" id="team"></ul>');
  animate();

  loadContent().then((content) => {
    const box = $('#team');
    if (!content.team.length) { box.outerHTML = `<p class="empty">${esc(C.team.emptyText)}</p>`; animate(); return; }
    box.innerHTML = content.team.map((m) => {
      const img = memberImage(m);
      return `
        <li class="card member${m.highlight ? ' member--lead' : ''}">
          <div class="member__skin">
            <img src="${esc(img.src)}" alt="${esc(m.name)}" width="240" height="240" loading="lazy" class="${img.custom ? 'is-photo' : ''}" data-nick="${esc(m.nick || '')}" data-step="${img.step}">
          </div>
          <h3 class="member__name">${esc(m.name)}</h3>
          ${m.role ? `<span class="member__role">${esc(m.role)}</span>` : ''}
        </li>`;
    }).join('');
    wireSkinFallback(box);
    animate(box);
  });
})();
