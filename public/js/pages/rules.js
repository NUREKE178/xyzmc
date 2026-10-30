/**
 * Правила сервера + отдельный блок запрещённых модов с поиском.
 */
(function () {
  'use strict';
  const { C, $, $$, esc, icon, head, section, pageHero, animate } = window.XYZ;
  const R = C.rules, M = R.mods;

  const rules = R.sections.map((s, i) => `
    <article class="rule-block">
      <h2 class="rule-block__title"><span class="rule-block__n">${i + 1}</span>${esc(s.title)}</h2>
      <ol class="rule-list">${s.items.map((t, k) => `<li><span class="rule-list__n">${i + 1}.${k + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>
    </article>`).join('');

  const total = M.groups.reduce((n, g) => n + g.items.length, 0);
  const mods = `
    <div id="mods">${head(M.title, M.subtitle)}
      <div class="mods__tools">
        <label class="search"><span class="sr-only">${esc(M.searchPlaceholder)}</span>${icon('search')}<input id="modSearch" type="search" placeholder="${esc(M.searchPlaceholder)}" autocomplete="off"></label>
        <p class="mods__count" id="modCount" aria-live="polite">${total}</p>
      </div>
      ${M.groups.map((g, gi) => `
        <section class="mods__group" data-group="${gi}">
          <h3 class="mods__title">${esc(g.title)} <span>${g.items.length}</span></h3>
          <ul class="chips">${g.items.map((m) => `<li class="chip" data-name="${esc(m.toLowerCase())}">${esc(m)}</li>`).join('')}</ul>
        </section>`).join('')}
      <p class="empty" id="modEmpty" hidden>${esc(M.nothing)}</p>
    </div>`;

  $('#main').innerHTML =
    pageHero({ current: C.pages.rules.crumb, title: C.pages.rules.title, subtitle: C.pages.rules.subtitle }) +
    section(`<div class="rules">${rules}</div>`) +
    section(mods, 'section--alt');
  animate();

  // Поиск по списку модов
  const input = $('#modSearch'), count = $('#modCount'), empty = $('#modEmpty');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    $$('.mods__group').forEach((g) => {
      let any = 0;
      $$('.chip', g).forEach((c) => { const show = !q || c.dataset.name.includes(q); c.hidden = !show; if (show) any++; });
      g.hidden = !any;
      visible += any;
    });
    count.textContent = q ? `${M.found}: ${visible}` : String(total);
    empty.hidden = visible > 0;
  });
})();
