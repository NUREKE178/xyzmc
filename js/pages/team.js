/**
 * «Команда»: карточки с рендерами скинов по нику.
 * Цепочка загрузки скина: основной сервис → запасной → локальная заглушка.
 */
(function () {
  'use strict';
  const { C, $, $$, esc, section, pageHero, reveal } = window.XYZ;
  const T = C.team;
  const skinUrl = (tpl, nick) => tpl.replace('{nick}', encodeURIComponent(nick));

  const members = T.members.map((m, i) => `
    <li class="card member${m.highlight ? ' member--lead' : ''}" style="--i:${i}">
      <div class="member__skin">
        <img src="${esc(m.nick ? skinUrl(T.skinUrl, m.nick) : T.placeholder)}" alt="Скин игрока ${esc(m.name)}" width="240" height="240" loading="lazy"
             data-nick="${esc(m.nick || '')}" data-step="${m.nick ? 0 : 2}">
      </div>
      <h3 class="member__name">${esc(m.name)}</h3>
      <span class="member__role">${esc(m.role)}</span>
    </li>`).join('');

  $('#main').innerHTML = pageHero(C.pages.team) + section(`<ul class="team">${members}</ul>`);

  // Если сервис скинов недоступен — пробуем запасной, затем заглушку
  $$('.member__skin img').forEach((img) => {
    img.addEventListener('error', () => {
      const step = Number(img.dataset.step) + 1;
      if (step > 2) return;
      img.dataset.step = step;
      img.src = step === 1 ? skinUrl(T.skinFallbackUrl, img.dataset.nick) : T.placeholder;
    });
  });

  reveal();
})();
