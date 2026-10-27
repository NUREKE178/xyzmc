/**
 * XYZ — общее ядро для всех страниц.
 * Рисует шапку, подвал и чат-бабл, копирует IP, даёт шаблоны блоков
 * страничным скриптам (js/pages/*.js) через window.XYZ.
 * Порядок: утилиты → иконки → шаблоны → каркас сайта → публичный API.
 */
(function () {
  'use strict';

  const C = window.XYZ_CONFIG;
  const S = C.site;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentPage = document.body.dataset.page || 'home';

  /* ================= Утилиты ================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // «Слово в {скобках}» → акцентный span, \n → перенос строки
  const rich = (s) => esc(s).replace(/\{(.+?)\}/g, '<span class="grad">$1</span>').replace(/\n/g, '<br>');
  const plain = (s) => String(s).replace(/[{}]/g, '').replace(/\n/g, ' ');
  const extAttrs = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');
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

  /* ================= Шаблоны блоков ================= */
  const label = (text, ic) => `<span>${esc(text)}</span>${ic ? icon(ic) : ''}`;            // подпись кнопки + иконка справа
  const section = (html, mod = '') => `<section class="section ${mod} reveal"><div class="container">${html}</div></section>`;
  const head = (title, sub) => `<header class="head"><h2 class="head__title">${rich(title)}</h2>${sub ? `<p class="head__sub">${esc(sub)}</p>` : ''}</header>`;

  // Шапка внутренней страницы: хлебные крошки + заголовок (как у страницы правил)
  const pageHero = ({ crumb, title, subtitle }) => `
    <section class="page-hero">
      <img class="page-hero__img" src="${esc(C.hero.image)}" alt="" fetchpriority="high">
      <div class="container">
        <nav class="crumbs" aria-label="Хлебные крошки"><a href="index.html">${esc(C.pages.homeCrumb)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(crumb)}</span></nav>
        <h1 class="page-hero__title">${rich(title)}</h1>
        <p class="page-hero__sub">${esc(subtitle)}</p>
      </div>
    </section>`;

  // Баннер: панель с персонажем и текстом. Чётные — арт слева, нечётные — справа.
  const banner = (b, i = 0) => `
    <article class="banner banner--${esc(b.tone || 'violet')}${i % 2 ? ' banner--flip' : ''}">
      <div class="banner__panel">
        <img class="banner__art" src="${esc(b.image)}" alt="" aria-hidden="true" loading="lazy" width="392" height="490">
        <div class="banner__body">
          <h3 class="banner__title">${esc(b.title)}</h3>
          <p class="banner__text">${esc(b.text)}</p>
          <a class="btn" href="${esc(b.href)}"${extAttrs(b.href)}>${label(b.button, b.icon)}</a>
        </div>
      </div>
    </article>`;
  const banners = (ids) => C.banners.items.filter((b) => !ids || ids.includes(b.id)).map(banner).join('');

  /* ================= Копирование IP ================= */
  let toastTimer;
  function showToast(msg) {
    const toast = $('#toast');
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

  /* ================= Каркас сайта ================= */
  function renderHeader() {
    const link = (n) => {
      const active = n.page === currentPage;
      return `<a href="${esc(n.href)}"${n.external ? extAttrs(n.href) : ''}${active ? ' class="active" aria-current="page"' : ''}>${esc(n.label)}</a>`;
    };
    const links = C.nav.map(link).join('');
    const cta = (cls) => `<button class="btn ${cls}" type="button" data-copy="${esc(S.ip)}">${label(C.headerCta, 'copy')}</button>`;
    $('#header').innerHTML = `
      <div class="container header__row">
        <a class="brand" href="index.html" aria-label="XYZ — на главную"><img class="brand__logo" src="${esc(S.logo)}" alt="" width="36" height="36"><span class="brand__name">XYZ</span></a>
        <nav class="nav" aria-label="Основная навигация">${links}</nav>
        <div class="header__actions">
          ${cta('header__cta')}
          <a class="icon-btn" href="${esc(S.telegramUrl)}" target="_blank" rel="noopener" aria-label="Telegram">${icon('telegram')}</a>
          <a class="icon-btn" href="${esc(S.discordUrl)}" target="_blank" rel="noopener" aria-label="Discord">${icon('discord')}</a>
          <button class="burger" id="burger" type="button" aria-label="Меню" aria-expanded="false" aria-controls="mobileNav"><span></span><span></span><span></span></button>
        </div>
      </div>
      <div class="mobile-nav" id="mobileNav" hidden><nav class="container" aria-label="Мобильная навигация">${links}${cta('')}</nav></div>`;

    const header = $('#header'), burger = $('#burger'), panel = $('#mobileNav');
    const toggle = (open) => { burger.setAttribute('aria-expanded', String(open)); panel.hidden = !open; header.classList.toggle('open', open); };
    burger.onclick = () => toggle(burger.getAttribute('aria-expanded') !== 'true');
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) toggle(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  }

  function renderFooter() {
    const FT = C.footer;
    const social = (href, name, ic) => `<a class="icon-btn" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${name}">${icon(ic)}</a>`;
    $('#footer').innerHTML = `
      <div class="container footer__grid">
        <div><a class="brand" href="index.html"><img class="brand__logo" src="${esc(S.logo)}" alt="" width="36" height="36"><span class="brand__name">XYZ</span></a><p class="footer__ip">${esc(S.ip)}</p></div>
        <div><h4>${esc(FT.quickLinksTitle)}</h4><ul>${C.nav.map((n) => `<li><a href="${esc(n.href)}"${extAttrs(n.href)}>${esc(n.label)}</a></li>`).join('')}</ul></div>
        <div><h4>${esc(FT.socialsTitle)}</h4><div class="socials">${social(S.telegramUrl, 'Telegram', 'telegram')}${social(S.discordUrl, 'Discord', 'discord')}${social(S.shopUrl, 'Магазин', 'bag')}</div></div>
      </div>
      <div class="container footer__bottom"><span>${esc(FT.copyright)}</span><span>${esc(FT.disclaimer)}</span></div>`;
  }

  function renderOverlays() {
    // тост и чат-бабл добавляются на каждой странице
    document.body.insertAdjacentHTML('beforeend', `
      <div class="chat" id="chat" hidden role="complementary" aria-label="Помощь">
        <button class="chat__close" id="chatX" type="button" aria-label="Закрыть">×</button>
        <span>${esc(C.chat.text)}</span>
        <a class="btn btn--secondary btn--sm" href="${esc(C.chat.href)}" target="_blank" rel="noopener">${label(C.chat.button, 'pxr')}</a>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
    const chat = $('#chat');
    if (!storage.get('xyz-chat-closed')) setTimeout(() => { chat.hidden = false; }, 1200);
    $('#chatX').onclick = () => { chat.hidden = true; storage.set('xyz-chat-closed', '1'); };
  }

  // Плавное появление секций; вызывается страницей после отрисовки
  function reveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  }

  /* ================= Публичный API для страниц ================= */
  window.XYZ = { C, S, $, $$, esc, rich, plain, extAttrs, formatDate, icon, label, section, head, pageHero, banner, banners, reveal, reduceMotion };

  renderHeader();
  renderFooter();
  renderOverlays();
})();
