/**
 * XYZ — общее ядро всех страниц.
 * Рисует шапку, подвал, окно «Играть сейчас» и чат; копирует IP; загружает контент из API;
 * анимирует появление блоков; даёт шаблоны страницам (js/pages/*.js) через window.XYZ.
 * Порядок: утилиты → иконки → шаблоны → данные → копирование → каркас → анимации → API.
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
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // «Слово в {скобках}» → акцентный span, \n → перенос строки
  const rich = (s) => esc(s).replace(/\{(.+?)\}/g, '<span class="accent">$1</span>').replace(/\n/g, '<br>');
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
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    play: '<path d="M7 4l13 8-13 8V4z" fill="currentColor"/>',
    home: '<path d="M4 11l8-7 8 7v9H4v-9z"/><path d="M10 20v-6h4v6"/>',
    // пиксельные стрелки
    pxr: '<path fill="currentColor" stroke="none" d="M6 2h4v4H6zM10 6h4v4h-4zM14 10h4v4h-4zM10 14h4v4h-4zM6 18h4v4H6z"/>',
    pxl: '<path fill="currentColor" stroke="none" d="M14 2h4v4h-4zM10 6h4v4h-4zM6 10h4v4H6zM10 14h4v4h-4zM14 18h4v4h-4z"/>',
    // брендовые знаки
    telegram: '<path fill="currentColor" stroke="none" d="M20.7 4.3L3.4 11c-1.2.5-1.1 1.2-.2 1.4l4.4 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.4-1.7-1.3-1.7zM8.4 13.5l9-5.6c.4-.3.8-.1.5.2l-7.4 6.7-.3 3-1.8-4.3z"/>',
    discord: '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M19.3 5.4A16 16 0 0015.3 4l-.5 1a15 15 0 00-4.5 0l-.5-1a16 16 0 00-4 1.4C3.2 9.2 2.5 12.9 2.8 16.6a16 16 0 004.9 2.5l1-1.7c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.4 11.4 0 009.8 0l.4.3c-.5.3-1 .6-1.6.8l1 1.7a16 16 0 004.9-2.5c.4-4.3-.7-8-2.8-11.2zM9.3 10.9a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8zm5.4 0a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8z"/>',
  };
  const iconInner = (name) => PATHS[name] || '';
  const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconInner(name)}</svg>`;

  /* ================= Шаблоны блоков ================= */
  const label = (text, ic) => `<span>${esc(text)}</span>${ic ? icon(ic) : ''}`;               // подпись кнопки + иконка справа
  const section = (html, mod = '') => `<section class="section ${mod}"><div class="container">${html}</div></section>`;
  const head = (title, sub) => `<header class="head"><h2 class="head__title">${rich(title)}</h2>${sub ? `<p class="head__sub">${esc(sub)}</p>` : ''}</header>`;

  // Шапка внутренней страницы: хлебные крошки + заголовок (как у страницы правил на Hoplite)
  const pageHero = ({ crumbs = [], current, title, subtitle }) => `
    <section class="page-hero">
      <img class="page-hero__img" src="${esc(C.hero.image)}" alt="" fetchpriority="high">
      <div class="container">
        <nav class="crumbs" aria-label="Хлебные крошки">
          <a href="index.html">${esc(C.pages.homeCrumb)}</a>
          ${crumbs.map((c) => `<span aria-hidden="true">/</span><a href="${esc(c.href)}">${esc(c.label)}</a>`).join('')}
          <span aria-hidden="true">/</span><span aria-current="page">${esc(current)}</span>
        </nav>
        <h1 class="page-hero__title">${rich(title)}</h1>
        ${subtitle ? `<p class="page-hero__sub">${esc(subtitle)}</p>` : ''}
      </div>
    </section>`;

  // Баннер: статичная картинка + текст. Нечётные — зеркально. Никакой анимации картинки.
  const banner = (b, i = 0) => {
    const buttons = b.buttons || [{ label: b.button, icon: b.icon, href: b.href }];
    return `
    <article class="banner banner--${esc(b.tone || 'violet')}${i % 2 ? ' banner--flip' : ''}" data-id="${esc(b.id)}">
      <div class="banner__media"><img src="${esc(b.image)}" alt="" loading="lazy" width="720" height="540"></div>
      <div class="banner__body">
        <h3 class="banner__title">${esc(b.title)}</h3>
        <p class="banner__text">${esc(b.text)}</p>
        <div class="banner__actions">${buttons.map((x, k) => `<a class="btn${buttons.length > 1 && k ? ' btn--secondary' : ''}" href="${esc(x.href)}"${extAttrs(x.href)}>${label(x.label, x.icon)}</a>`).join('')}</div>
      </div>
    </article>`;
  };
  // Чередование (картинка слева/справа) считается по месту баннера в config, а не в выборке
  const banners = (ids) => C.banners.items.map((b, i) => (!ids || ids.includes(b.id) ? banner(b, i) : '')).join('');

  /* ================= Данные: API → запасной вариант из config.js ================= */
  let contentPromise;
  const fallbackContent = () => ({
    source: 'config',
    news: C.news.items.map((n) => ({ ...n })),
    team: C.team.members.map((m) => ({ ...m })),
    hero: { type: 'default' },
    banners: {},
  });
  function loadContent() {
    if (contentPromise) return contentPromise;
    contentPromise = (async () => {
      const fb = fallbackContent();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch('/api/content', { signal: ctrl.signal, headers: { accept: 'application/json' } });
        clearTimeout(timer);
        if (!res.ok || !/json/.test(res.headers.get('content-type') || '')) throw new Error('no api');
        const j = await res.json();
        return {
          source: 'api',
          news: Array.isArray(j.news) ? j.news : fb.news,
          team: Array.isArray(j.team) ? j.team : fb.team,
          hero: j.hero && j.hero.type ? j.hero : fb.hero,
          banners: j.banners && typeof j.banners === 'object' ? j.banners : {},
        };
      } catch (e) { return fb; }                      // статический хостинг / нет сети — работаем на config.js
    })();
    return contentPromise;
  }

  const sortNews = (list) => [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const excerpt = (n, max = 130) => {
    const first = String(n.text || '').split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
    return first.length > max ? first.slice(0, max).replace(/\s+\S*$/, '') + '…' : first;
  };
  const articleUrl = (n) => `article.html?id=${encodeURIComponent(n.id)}`;
  const paragraphs = (text) => String(text || '').split(/\n{2,}/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');

  const newsCard = (n) => `
    <article class="card news-card">
      <a class="news-card__img" href="${esc(articleUrl(n))}" tabindex="-1" aria-hidden="true">${n.image ? `<img src="${esc(n.image)}" alt="" loading="lazy" width="480" height="270">` : '<span class="news-card__ph"></span>'}</a>
      <div class="news-card__body">
        <time class="news-card__date" datetime="${esc(n.date)}">${formatDate(n.date)}</time>
        <h3 class="news-card__title"><a href="${esc(articleUrl(n))}">${esc(n.title)}</a></h3>
        <p class="news-card__text">${esc(excerpt(n))}</p>
        <a class="news-card__more" href="${esc(articleUrl(n))}">${esc(C.news.readMore)} ▸</a>
      </div>
    </article>`;
  const newsSkeleton = (count) => Array.from({ length: count }, () => '<div class="card news-card news-card--skeleton" aria-hidden="true"><div class="news-card__img"></div><div class="news-card__body"><i></i><i></i><i></i></div></div>').join('');

  // Фон главного экрана из админки: картинка или видео (видео не запускается при reduced-motion)
  function applyHero(hero) {
    if (!hero || hero.type === 'default') return;
    const bg = $('.hero__bg');
    if (hero.type === 'image' && hero.src) {
      $$('.hero__img, .page-hero__img').forEach((img) => { img.src = hero.src; });
    } else if (hero.type === 'video' && hero.src) {
      if (bg && !reduceMotion) {
        const video = Object.assign(document.createElement('video'), { className: 'hero__video', muted: true, loop: true, autoplay: true, playsInline: true, preload: 'metadata' });
        video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
        if (hero.poster) video.poster = hero.poster;
        video.src = hero.src;
        video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
        bg.appendChild(video);
        video.play().catch(() => {});
      }
      if (hero.poster) $$('.hero__img, .page-hero__img').forEach((img) => { img.src = hero.poster; });
    }
  }

  // Картинки блоков «Магазин» / «Соцсети» из админки; если своей нет — остаётся стандартная из config.js.
  // Пока контент не загружен, картинка скрыта, чтобы стандартная не мелькала перед заменой.
  function applyBanners(map = {}) {
    $$('.banner').forEach((el) => {
      const img = $('.banner__media img', el);
      const custom = map[el.dataset.id] && map[el.dataset.id].image;
      const show = () => img.classList.add('is-ready');
      if (custom && img.getAttribute('src') !== custom) {
        img.addEventListener('load', show, { once: true });
        img.addEventListener('error', () => { img.src = (C.banners.items.find((b) => b.id === el.dataset.id) || {}).image || ''; show(); }, { once: true });
        img.src = custom;
      } else show();
    });
  }
  setTimeout(() => $$('.banner__media img').forEach((i) => i.classList.add('is-ready')), 2200);   // страховка: не ждём API бесконечно

  // Скин по нику → запасной сервис → заглушка; свой загруженный файл имеет приоритет
  function memberImage(m) {
    const T = C.team;
    if (m.photo) return { src: m.photo, custom: true, step: 2 };
    if (m.nick) return { src: T.skinUrl.replace('{nick}', encodeURIComponent(m.nick)), custom: false, step: 0 };
    return { src: T.placeholder, custom: false, step: 2 };
  }
  function wireSkinFallback(root) {
    $$('.member__skin img', root).forEach((img) => {
      img.addEventListener('error', () => {
        const step = Number(img.dataset.step) + 1;
        if (step > 2) return;
        img.dataset.step = step;
        img.classList.remove('is-photo');
        img.src = step === 1 ? C.team.skinFallbackUrl.replace('{nick}', encodeURIComponent(img.dataset.nick)) : C.team.placeholder;
      });
    });
  }

  /* ================= Копирование IP: подпись кнопки меняется на «СКОПИРОВАНО!» ================= */
  async function copyText(text) {
    try {
      if (!(navigator.clipboard && window.isSecureContext)) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
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
    const ok = await copyText(btn.dataset.copy || S.ip);
    const text = btn.querySelector('span');
    const svg = btn.querySelector('svg');
    if (!text) return;
    if (btn.dataset.label === undefined) { btn.dataset.label = text.textContent; btn.dataset.icon = svg ? svg.innerHTML : ''; }
    text.textContent = ok ? C.texts.copied : S.ip;                   // если копирование недоступно — показываем адрес
    if (svg && ok) svg.innerHTML = iconInner('check');
    btn.classList.toggle('is-done', ok);
    $('#live').textContent = ok ? C.texts.copied : S.ip;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      text.textContent = btn.dataset.label;
      if (svg) svg.innerHTML = btn.dataset.icon;
      btn.classList.remove('is-done');
    }, 2200);
  });

  /* ================= Каркас сайта ================= */
  function renderHeader() {
    const link = (n) => {
      const active = n.page === currentPage || (currentPage === 'article' && n.page === 'news');
      return `<a href="${esc(n.href)}"${n.external ? extAttrs(n.href) : ''}${active ? ' class="active" aria-current="page"' : ''}>${esc(n.label)}</a>`;
    };
    const links = C.nav.map(link).join('');
    // Кнопка с адресом сервера: клик копирует IP, подпись на секунду меняется на «СКОПИРОВАНО!»
    const cta = (cls) => `<button class="btn ${cls}" type="button" data-copy="${esc(S.ip)}" aria-label="Скопировать IP ${esc(S.ip)}">${label(S.ip, 'copy')}</button>`;
    $('#header').innerHTML = `
      <div class="container header__row">
        <a class="brand" href="index.html" aria-label="${esc(S.name)} — на главную"><img class="brand__logo" src="${esc(S.logo)}" alt="" width="44" height="44"><span class="brand__name">${esc(S.name)}</span></a>
        <nav class="nav" aria-label="Основная навигация">${links}</nav>
        <div class="header__actions">
          ${cta('header__cta')}
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
    const links = [...C.nav, ...(C.footerExtra || [])];
    $('#footer').innerHTML = `
      <div class="container footer__grid">
        <div class="footer__col"><a class="brand" href="index.html"><img class="brand__logo" src="${esc(S.logo)}" alt="" width="44" height="44"><span class="brand__name">${esc(S.name)}</span></a><p class="footer__ip">${esc(S.ip)}</p></div>
        <div class="footer__col"><h4>${esc(FT.quickLinksTitle)}</h4><ul>${links.map((n) => `<li><a href="${esc(n.href)}"${extAttrs(n.href)}>${esc(n.label)}</a></li>`).join('')}</ul></div>
        <div class="footer__col"><h4>${esc(FT.socialsTitle)}</h4><div class="socials">${social(S.telegramUrl, 'Telegram', 'telegram')}${social(S.discordUrl, 'Discord', 'discord')}${social(S.shopUrl, 'Магазин', 'bag')}</div></div>
      </div>
      <div class="container footer__bottom"><span>${esc(FT.copyright)}</span><span>${esc(FT.disclaimer)}</span></div>`;
  }

  // Окно «Играть сейчас»: логотип, IP и пошаговая инструкция
  function renderModal() {
    const M = C.modal, steps = C.start.steps;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="modal" id="playModal" aria-labelledby="playTitle">
        <div class="modal__box">
          <button class="modal__close" type="button" data-close aria-label="${esc(M.closeLabel)}">${icon('close')}</button>
          <img class="modal__logo" src="${esc(S.logo)}" alt="" width="72" height="72">
          <h2 class="modal__title" id="playTitle">${esc(M.title)}</h2>
          ${C.hero.version ? `<p class="modal__ver">${esc(C.hero.version)}</p>` : ''}
          <div class="modal__ip">
            <div><span class="modal__ip-label">${esc(M.ipLabel)}</span><code>${esc(S.ip)}</code></div>
            <button class="btn btn--sm" type="button" data-copy="${esc(S.ip)}">${label(M.copyLabel, 'copy')}</button>
          </div>
          <ol class="modal__steps">${steps.map((s, i) => `<li><span class="modal__n">${i + 1}</span><div><b>${esc(s.title)}</b><p>${esc(s.text)}${s.showIp ? ` <code>${esc(S.ip)}</code>` : ''}</p></div></li>`).join('')}</ol>
        </div>
      </dialog>`);
    const dlg = $('#playModal');
    const open = () => { dlg.showModal(); document.documentElement.classList.add('modal-open'); };
    const close = () => dlg.close();
    dlg.addEventListener('close', () => document.documentElement.classList.remove('modal-open'));
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open-play]');
      if (!trigger || typeof dlg.showModal !== 'function') return;     // старый браузер — работает обычная ссылка
      e.preventDefault();
      open();
    });
  }

  function renderOverlays() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="chat" id="chat" hidden role="complementary" aria-label="Помощь">
        <button class="chat__close" id="chatX" type="button" aria-label="Закрыть">×</button>
        <span>${esc(C.chat.text)}</span>
        <a class="btn btn--secondary btn--sm" href="${esc(C.chat.href)}" target="_blank" rel="noopener">${label(C.chat.button, 'pxr')}</a>
      </div>
      <div class="sr-only" id="live" aria-live="polite"></div>`);
    const chat = $('#chat');
    if (!storage.get('xyz-chat-closed')) setTimeout(() => { chat.hidden = false; }, 1500);
    $('#chatX').onclick = () => { chat.hidden = true; storage.set('xyz-chat-closed', '1'); };
  }

  /* ================= Анимация появления: каждый блок — отдельно, когда до него дошли ================= */
  const ANIM = [
    '.crumbs', '.page-hero__title', '.page-hero__sub', '.head__title', '.head__sub', '.card', '.faq__item',
    '.rule-block', '.mods__tools', '.mods__group', '.center', '.article__cover', '.article__meta', '.article__body > *',
    '.footer__col', '.loadmore', '.empty',
  ].join(',');
  const BIG = '.slider';                                  // крупные блоки: ждём, пока они заметно покажутся на экране
  let observer, bigObserver;
  const reveal = (obs) => (entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    obs.unobserve(el);
    el.classList.add('in');
    setTimeout(() => { el.removeAttribute('data-anim'); el.classList.remove('in'); }, 1600);   // дальше — обычное состояние (hover и т. д.)
  });
  /* Баннеры «Магазин» и «Соцсети»: картинка стоит на месте, а заголовок, текст и кнопка выезжают сбоку по очереди.
     Движение привязано к прокрутке: вниз — выезжают, вверх — уезжают обратно. Каждый баннер зависит только от своего положения. */
  let bannersBound = false;
  function initBannerScroll() {
    if (bannersBound || reduceMotion) return;
    const banners = $$('.banner').map((el) => ({
      el, flip: el.classList.contains('banner--flip'),
      parts: [$('.banner__title', el), $('.banner__text', el), $('.banner__actions', el)].filter(Boolean).map((node) => ({ node, need: 0 })),
    }));
    if (!banners.length) return;
    bannersBound = true;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const ease = (t) => t * t * (3 - 2 * t);                       // smoothstep: мягкий старт и финиш
    let queued = false;

    // На сколько нужно сдвинуть каждый элемент, чтобы он целиком скрылся за краем баннера (зависит от вёрстки: десктоп / телефон)
    const measure = () => {
      for (const b of banners) {
        b.parts.forEach((x) => { x.node.style.transform = ''; });
        const box = b.el.getBoundingClientRect();
        b.parts.forEach((x) => {
          const r = x.node.getBoundingClientRect();
          x.need = (b.flip ? r.right - box.left : box.right - r.left) + 8;
        });
      }
    };
    const update = () => {
      queued = false;
      const vh = innerHeight;
      for (const b of banners) {
        const r = b.el.getBoundingClientRect();
        // 0 — верх баннера чуть выше нижнего края экрана; 1 — баннер целиком на экране. Каждый баннер считается отдельно.
        const length = Math.min(r.height, vh) * 0.9 + vh * 0.1;
        const p = clamp((vh * 0.9 - r.top) / length);
        b.parts.forEach((x, i) => {
          const local = clamp((p - i * 0.08) / 0.62);                // заголовок → текст → кнопка
          x.node.style.transform = local >= 1 ? '' : `translate3d(${((b.flip ? -1 : 1) * (1 - ease(local)) * x.need).toFixed(1)}px,0,0)`;
        });
      }
    };
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    const remeasure = () => { measure(); schedule(); };
    banners.forEach((b) => b.parts.forEach((x) => { x.node.style.willChange = 'transform'; }));
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', remeasure);
    addEventListener('load', remeasure);
    measure();
    update();
  }

  function animate(root = document) {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    observer = observer || new IntersectionObserver((e) => reveal(observer)(e), { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    bigObserver = bigObserver || new IntersectionObserver((e) => reveal(bigObserver)(e), { threshold: 0.35, rootMargin: '0px 0px -18% 0px' });
    const tag = (el, obs, delay, dir) => {
      el.style.setProperty('--d', delay + 'ms');
      el.setAttribute('data-anim', dir);
      obs.observe(el);
    };
    $$(BIG, root).filter((el) => !el.hasAttribute('data-anim')).forEach((el) => tag(el, bigObserver, 0, 'up'));
    initBannerScroll();
    $$(ANIM, root).filter((el) => !el.hasAttribute('data-anim') && !el.closest('[data-anim]') && !el.closest('.hero') && !el.closest(BIG)).forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.matches(ANIM));
      tag(el, observer, (siblings.indexOf(el) % 4) * 80, 'up');
    });
  }

  /* ================= Публичный API для страниц ================= */
  window.XYZ = {
    C, S, $, $$, esc, rich, plain, extAttrs, formatDate, icon, iconInner, label, section, head, pageHero, banner, banners,
    loadContent, applyHero, applyBanners, sortNews, excerpt, articleUrl, paragraphs, newsCard, newsSkeleton, memberImage, wireSkinFallback,
    animate, reduceMotion,
  };

  renderHeader();
  renderFooter();
  renderModal();
  renderOverlays();
  // Фон из админки подхватывается после загрузки контента
  loadContent().then((c) => { applyHero(c.hero); $('.hero__bg')?.classList.add('is-ready'); });
  setTimeout(() => $('.hero__bg')?.classList.add('is-ready'), 1600);     // не ждём API дольше 1,6 с
})();
