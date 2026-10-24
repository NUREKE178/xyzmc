/**
 * XYZ — отрисовка страницы из js/config.js и интерактив.
 * Без зависимостей. Структура: утилиты → иконки → шаблоны → init-функции.
 */
(function () {
  'use strict';

  const C = window.XYZ_CONFIG;
  const S = C.site;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= Утилиты ================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // «Слово в {скобках}» → акцентный span, \n → перенос строки
  const rich = (s) => esc(s).replace(/\{(.+?)\}/g, '<span class="grad">$1</span>').replace(/\n/g, '<br>');
  const extAttrs = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');
  const pluralize = (n, [one, few, many]) => {
    const m100 = n % 100, m10 = n % 10;
    return m100 > 10 && m100 < 20 ? many : m10 === 1 ? one : m10 >= 2 && m10 <= 4 ? few : many;
  };
  const formatDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const storage = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* хранилище недоступно */ } },
  };

  /* ================= Иконки ================= */
  const PATHS = {
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3.2 3.2 0 010 5.6M18 14.4c2 .7 3.5 2.6 3.5 5.6"/>',
    refresh: '<path d="M20 11a8 8 0 00-14.5-4M4 4v4h4"/><path d="M4 13a8 8 0 0014.5 4M20 20v-4h-4"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5V8m0 8v1.5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/>',
    support: '<path d="M4 13v-1a8 8 0 0116 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2-5 2"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
    sword: '<path d="M14 4h6v6L10 20l-2-2-2 2-2-2 2-2-2-2L14 4z"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    play: '<path d="M7 4l13 8-13 8V4z" fill="currentColor"/>',
    home: '<path d="M4 11l8-7 8 7v9H4v-9z"/><path d="M10 20v-6h4v6"/>',
    // пиксельные стрелки
    pxr: '<path fill="currentColor" stroke="none" d="M6 2h4v4H6zM10 6h4v4h-4zM14 10h4v4h-4zM10 14h4v4h-4zM6 18h4v4H6z"/>',
    pxl: '<path fill="currentColor" stroke="none" d="M14 2h4v4h-4zM10 6h4v4h-4zM6 10h4v4H6zM10 14h4v4h-4zM14 18h4v4h-4z"/>',
    // брендовые знаки
    telegram: '<path fill="currentColor" stroke="none" d="M20.7 4.3L3.4 11c-1.2.5-1.1 1.2-.2 1.4l4.4 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.4-1.7-1.3-1.7zM8.4 13.5l9-5.6c.4-.3.8-.1.5.2l-7.4 6.7-.3 3-1.8-4.3z"/>',
    discord: '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M19.3 5.4A16 16 0 0015.3 4l-.5 1a15 15 0 00-4.5 0l-.5-1a16 16 0 00-4 1.4C3.2 9.2 2.5 12.9 2.8 16.6a16 16 0 004.9 2.5l1-1.7c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.4 11.4 0 009.8 0l.4.3c-.5.3-1 .6-1.6.8l1 1.7a16 16 0 004.9-2.5c.4-4.3-.7-8-2.8-11.2zM9.3 10.9a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8zm5.4 0a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8z"/>',
  };
  const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`;

  /* ================= Шаблоны ================= */
  const label = (text, ic) => `<span>${esc(text)}</span>${ic ? icon(ic) : ''}`;   // подпись кнопки + иконка справа
  const mount = (id, html) => { $('#' + id).innerHTML = `<div class="container">${html}</div>`; };
  const head = (title, sub) => `<header class="head"><h2 class="head__title">${rich(title)}</h2>${sub ? `<p class="head__sub">${esc(sub)}</p>` : ''}</header>`;

  /* ================= Копирование IP ================= */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  async function copyText(text) {
    try {
      if (!(navigator.clipboard && window.isSecureContext)) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Фолбэк для http и старых браузеров
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const ip = btn.dataset.copy || S.ip;
    showToast((await copyText(ip)) ? C.texts.copied : C.texts.copyFailed + ip);
  });

  /* ================= Шапка и hero ================= */
  function renderChrome() {
    $('#brandLogo').src = S.logo;
    $('#hTg').href = S.telegramUrl; $('#hTg').innerHTML = icon('telegram');
    $('#hDs').href = S.discordUrl; $('#hDs').innerHTML = icon('discord');
    $('#hCta').href = S.shopUrl; $('#hCta').innerHTML = label(C.headerCta, 'pxr');

    const links = C.nav.map((n) => `<a href="${esc(n.href)}"${n.external ? extAttrs(n.href) : ''} data-nav="${esc(n.href)}">${esc(n.label)}</a>`).join('');
    $('#nav').innerHTML = links;
    $('#mobileLinks').innerHTML = links + `<a class="btn" href="${esc(S.shopUrl)}" target="_blank" rel="noopener">${label(C.headerCta, 'pxr')}</a>`;

    $('#heroImg').src = C.hero.image;
    $('#heroVer').textContent = C.hero.version || '';
    $('#heroTitle').innerHTML = rich(C.hero.title);
    $('#heroSub').textContent = C.hero.subtitle;
    $('#heroPlay').innerHTML = label(C.hero.playButton, 'play');
    const ip = $('#heroIp');
    ip.dataset.copy = S.ip;
    ip.setAttribute('aria-label', `Скопировать IP ${S.ip}`);
    ip.innerHTML = `<span>${esc(S.ip)}</span>${icon('copy')}`;
  }

  /* ================= Онлайн ================= */
  function initOnline() {
    const text = $('#onlineLabel'), fill = $('#barFill'), dot = $('#onlineDot');
    const line = (n, max, shown = n) =>
      `${esc(C.texts.online)} — <b>${shown} ${pluralize(n, ['игрок', 'игрока', 'игроков'])}</b> / ${max}`;

    function showCount(online, max) {
      dot.dataset.state = 'on';
      fill.style.width = (online ? Math.max(4, Math.min(100, online / max * 100)) : 0) + '%';
      if (reduceMotion || !online) { text.innerHTML = line(online, max); return; }
      const t0 = performance.now(), D = 900;
      (function step(t) {
        const k = Math.min(1, (t - t0) / D);
        text.innerHTML = line(online, max, Math.round(online * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
    function showStatus(msg, state) { text.textContent = msg; fill.style.width = '0%'; dot.dataset.state = state; }

    showStatus(C.texts.loading, 'loading');
    (async function load() {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(S.statusApi, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!res.ok) throw new Error(res.status);
        const d = await res.json();
        if (d.online) showCount((d.players && d.players.online) || 0, (d.players && d.players.max) || S.fallbackMaxPlayers);
        else showStatus(C.texts.offline, 'off');
      } catch (e) {
        showStatus(C.texts.unavailable, 'off');
      }
      setTimeout(load, 60000);   // обновляем раз в минуту
    })();
  }

  /* ================= Секции ================= */
  function renderFeatures() {
    const F = C.features;
    mount('features', head(F.title, F.subtitle) + `<ul class="features">${F.items.map((f, i) =>
      `<li class="card feature" style="--i:${i}"><span class="tile">${icon(f.icon)}</span><h3 class="card__title">${esc(f.title)}</h3><p class="card__text">${esc(f.text)}</p></li>`).join('')}</ul>`);
  }

  function renderModes() {
    const M = C.modes;
    mount('modes', head(M.title, M.subtitle) + `<div class="modes">${M.items.map((m) =>
      `<article class="card mode">
        <div class="mode__media"><img src="${esc(m.image)}" alt="Режим ${esc(m.name)}" loading="lazy" width="640" height="360">${m.tag ? `<span class="badge">${esc(m.tag)}</span>` : ''}</div>
        <div class="mode__body"><h3 class="mode__title">${esc(m.name)}</h3><p class="mode__text">${esc(m.text)}</p>
          <code class="mode__ip">${esc(m.ip || S.ip)}</code>
          <button class="btn" type="button" data-copy="${esc(m.ip || S.ip)}">${label(M.connectLabel, 'copy')}</button></div>
      </article>`).join('')}</div>`);
  }

  function renderNews() {
    const N = C.news;
    mount('news', head(N.title, N.subtitle) +
      `<div class="news" id="newsShow" role="region" aria-roledescription="carousel" aria-label="${esc(N.title.replace(/[{}]/g, ''))}">${N.items.map((n, i) =>
        `<article class="news__slide${i ? '' : ' on'}" aria-hidden="${i ? 'true' : 'false'}">
          <div><h3 class="news__title"><a href="${esc(n.href)}"${extAttrs(n.href)}>${esc(n.title)}</a></h3>
            <p class="news__text">${esc(n.text || '')}</p>
            <div class="news__meta"><time datetime="${esc(n.date)}">${formatDate(n.date)}</time><span class="news__line"></span>
              <a class="news__more" href="${esc(n.href)}"${extAttrs(n.href)}>${esc(N.readMore)} ▸</a></div></div>
          <a class="news__img" href="${esc(n.href)}"${extAttrs(n.href)} tabindex="-1" aria-hidden="true"><img src="${esc(n.image)}" alt="" ${i ? 'loading="lazy"' : ''} width="720" height="405"></a>
        </article>`).join('')}</div>
      <div class="news__ctl"><button class="sq-btn" id="prev" type="button" aria-label="Назад">${icon('pxl')}</button>
        <div class="dots">${N.items.map((n, i) => `<button class="dot${i ? '' : ' on'}" type="button" aria-label="Новость ${i + 1}"></button>`).join('')}</div>
        <button class="sq-btn" id="next" type="button" aria-label="Вперёд">${icon('pxr')}</button></div>
      <div class="center"><a class="btn btn--pink btn--lg" href="${esc(N.moreHref)}"${extAttrs(N.moreHref)}>${label(N.moreLabel, 'pxr')}</a></div>`);

    const root = $('#newsShow'), slides = $$('.news__slide'), dots = $$('.dot');
    let current = 0;
    const go = (i) => {
      current = (i + slides.length) % slides.length;
      slides.forEach((el, k) => { el.classList.toggle('on', k === current); el.setAttribute('aria-hidden', String(k !== current)); });
      dots.forEach((el, k) => el.classList.toggle('on', k === current));
    };
    $('#prev').onclick = () => go(current - 1);
    $('#next').onclick = () => go(current + 1);
    dots.forEach((d, k) => { d.onclick = () => go(k); });
    $('#news').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(current - 1);
      if (e.key === 'ArrowRight') go(current + 1);
    });
    // свайп на сенсорных экранах
    let x0 = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
    });
  }

  function renderStart() {
    const T = C.start;
    mount('start', head(T.title, T.subtitle) + `<ol class="steps">${T.steps.map((s, i) =>
      `<li class="card step" style="--i:${i}"><span class="step__n" aria-hidden="true">${i + 1}</span><h3 class="card__title">${esc(s.title)}</h3><p class="card__text">${esc(s.text)}</p>${s.showIp ? `<code class="ip-code">${esc(S.ip)}</code>` : ''}</li>`).join('')}</ol>
      <div class="center"><button class="btn btn--lg" type="button" data-copy="${esc(S.ip)}">${label(`${T.copyLabel} · ${S.ip}`, 'copy')}</button></div>`);
  }

  function renderShop() {
    const SH = C.shop;
    mount('shop', `<div class="promo"><img class="promo__logo" src="${esc(S.logo)}" alt="" aria-hidden="true">
      <div><h2 class="promo__title">${esc(SH.title)}</h2><p class="promo__text">${esc(SH.text)}</p></div>
      <a class="btn btn--light btn--lg" href="${esc(S.shopUrl)}" target="_blank" rel="noopener">${label(SH.button, 'pxr')}</a></div>`);
  }

  function renderFaq() {
    const Q = C.faq;
    mount('faq', head(Q.title) + `<div class="faq">${Q.items.map((f) =>
      `<details class="faq__item"><summary>${esc(f.q)}<span class="faq__plus" aria-hidden="true"></span></summary><div class="faq__a"><p>${esc(f.a)}</p></div></details>`).join('')}</div>`);
  }

  function renderCommunity() {
    const CM = C.community;
    mount('community', head(CM.title, CM.subtitle) + `<div class="channels">${CM.items.map((c, i) =>
      `<article class="card channel" style="--i:${i}"><span class="tile">${icon(c.icon)}</span><h3 class="channel__title">${esc(c.title)}</h3><p class="card__text">${esc(c.text)}</p>
        <a class="btn" href="${esc(c.href)}" target="_blank" rel="noopener">${label(c.button, 'pxr')}</a></article>`).join('')}</div>`);
  }

  function renderFooter() {
    const FT = C.footer;
    const social = (href, name, ic) => `<a class="icon-btn" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${name}">${icon(ic)}</a>`;
    $('#footer').innerHTML = `<div class="container footer__grid">
        <div><a class="brand" href="#home"><img class="brand__logo" src="${esc(S.logo)}" alt="" width="36" height="36"><span class="brand__name">XYZ</span></a><p class="footer__ip">${esc(S.ip)}</p></div>
        <div><h4>${esc(FT.quickLinksTitle)}</h4><ul>${C.nav.map((n) => `<li><a href="${esc(n.href)}"${extAttrs(n.href)}>${esc(n.label)}</a></li>`).join('')}</ul></div>
        <div><h4>${esc(FT.socialsTitle)}</h4><div class="socials">${social(S.telegramUrl, 'Telegram', 'telegram')}${social(S.discordUrl, 'Discord', 'discord')}${social(S.shopUrl, 'Магазин', 'bag')}</div></div>
      </div>
      <div class="container footer__bottom"><span>${esc(FT.copyright)}</span><span>${esc(FT.disclaimer)}</span></div>`;
  }

  /* ================= Поведение ================= */
  function initChat() {
    const chat = $('#chat');
    $('#chatText').textContent = C.chat.text;
    $('#chatBtn').innerHTML = label(C.chat.button, 'pxr');
    $('#chatBtn').href = C.chat.href;
    if (!storage.get('xyz-chat-closed')) setTimeout(() => { chat.hidden = false; }, 1200);
    $('#chatX').onclick = () => { chat.hidden = true; storage.set('xyz-chat-closed', '1'); };
  }

  function initHeader() {
    const header = $('#header'), burger = $('#burger'), panel = $('#mobileNav');
    const toggle = (open) => { burger.setAttribute('aria-expanded', String(open)); panel.hidden = !open; header.classList.toggle('open', open); };
    burger.onclick = () => toggle(burger.getAttribute('aria-expanded') !== 'true');
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) toggle(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  }

  function initObservers() {
    const reveals = $$('.reveal');
    if (!('IntersectionObserver' in window)) { reveals.forEach((el) => el.classList.add('in')); return; }

    const reveal = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); }
    }), { threshold: 0.08 });
    reveals.forEach((el) => reveal.observe(el));

    // подсветка пункта меню текущей секции
    const links = $$('[data-nav^="#"]');
    const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.nav === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'modes', 'news', 'start'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  function initBlocks() {
    if (reduceMotion) return;
    const box = $('#blocks'), count = innerWidth < 700 ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('i'), size = 14 + Math.random() * 22;
      el.style.cssText = `left:${8 + Math.random() * 84}%;width:${size}px;height:${size}px;animation-duration:${40 + Math.random() * 30}s;animation-delay:-${Math.random() * 60}s`;
      box.appendChild(el);
    }
  }

  /* ================= Запуск ================= */
  renderChrome();
  initOnline();
  renderFeatures(); renderModes(); renderNews(); renderStart(); renderShop(); renderFaq(); renderCommunity(); renderFooter();
  initChat(); initHeader(); initObservers(); initBlocks();
})();
