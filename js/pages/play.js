/**
 * «Играть»: Почему XYZ → Режимы сервера → Как начать играть.
 */
(function () {
  'use strict';
  const { C, S, $, esc, label, section, head, icon, pageHero, reveal } = window.XYZ;

  const F = C.features;
  const features = section(`${head(F.title, F.subtitle)}
    <ul class="features">${F.items.map((f, i) => `
      <li class="card feature" style="--i:${i}"><span class="tile">${icon(f.icon)}</span><h3 class="card__title">${esc(f.title)}</h3><p class="card__text">${esc(f.text)}</p></li>`).join('')}
    </ul>`);

  const M = C.modes;
  const modes = section(`<div id="modes">${head(M.title, M.subtitle)}
    <div class="modes">${M.items.map((m) => `
      <article class="card mode">
        <div class="mode__media"><img src="${esc(m.image)}" alt="Режим ${esc(m.name)}" loading="lazy" width="640" height="360">${m.tag ? `<span class="badge">${esc(m.tag)}</span>` : ''}</div>
        <div class="mode__body">
          <h3 class="mode__title">${esc(m.name)}</h3><p class="mode__text">${esc(m.text)}</p>
          <code class="mode__ip">${esc(m.ip || S.ip)}</code>
          <button class="btn" type="button" data-copy="${esc(m.ip || S.ip)}">${label(M.connectLabel, 'copy')}</button>
        </div>
      </article>`).join('')}
    </div></div>`, 'section--alt');

  const T = C.start;
  const start = section(`<div id="start">${head(T.title, T.subtitle)}
    <ol class="steps">${T.steps.map((s, i) => `
      <li class="card step" style="--i:${i}"><span class="step__n" aria-hidden="true">${i + 1}</span><h3 class="card__title">${esc(s.title)}</h3><p class="card__text">${esc(s.text)}</p>${s.showIp ? `<code class="ip-code">${esc(S.ip)}</code>` : ''}</li>`).join('')}
    </ol>
    <div class="center"><button class="btn btn--lg" type="button" data-copy="${esc(S.ip)}">${label(`${T.copyLabel} · ${S.ip}`, 'copy')}</button></div></div>`);

  $('#main').innerHTML = pageHero(C.pages.play) + features + modes + start;
  reveal();
})();
