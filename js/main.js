/**
 * XYZ — отрисовка страницы из js/config.js + интерактив.
 * Без зависимостей. Порядок: утилиты → иконки → рендер секций → поведение.
 */
(function () {
  'use strict';
  const C = window.XYZ_CONFIG;
  const S = C.site;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Утилиты ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // «Слово в {скобках}» → градиентный span
  const hl = (s) => esc(s).replace(/\{(.+?)\}/g, '<span class="grad">$1</span>');
  const ext = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');
  const plural = (n, [a, b, c]) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d >= 2 && d <= 4 ? b : c; };
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const sget = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const sset = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  /* ---------- Иконки (inline SVG, stroke) ---------- */
  const P = {
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
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    // брендовые знаки (заливка)
    telegram: '<path fill="currentColor" stroke="none" d="M20.7 4.3L3.4 11c-1.2.5-1.1 1.2-.2 1.4l4.4 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.4-1.7-1.3-1.7zM8.4 13.5l9-5.6c.4-.3.8-.1.5.2l-7.4 6.7-.3 3-1.8-4.3z"/>',
    discord: '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M19.3 5.4A16 16 0 0015.3 4l-.5 1a15 15 0 00-4.5 0l-.5-1a16 16 0 00-4 1.4C3.2 9.2 2.5 12.9 2.8 16.6a16 16 0 004.9 2.5l1-1.7c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.4 11.4 0 009.8 0l.4.3c-.5.3-1 .6-1.6.8l1 1.7a16 16 0 004.9-2.5c.4-4.3-.7-8-2.8-11.2zM9.3 10.9a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8zm5.4 0a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8z"/>',
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* Заголовок секции */
  const head = (t, sub) => `<div class="sec-head"><h2>${hl(t)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;

  /* ---------- Копирование IP + тост ---------- */
  const toast = $('#toast');
  let toastT;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  async function copyIp(ip = S.ip) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(ip);
      else throw new Error('no clipboard api');
    } catch (e) {
      // Фолбэк для http / старых браузеров
      const ta = document.createElement('textarea');
      ta.value = ip; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove();
      if (!ok) { showToast(C.texts.copyFailed + ip); return; }
    }
    showToast(C.texts.copied);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (b) copyIp(b.dataset.copy || S.ip);
  });

  /* ---------- Шапка, hero ---------- */
  $('#brandLogo').src = S.logo;
  $('#hTg').href = S.telegramUrl; $('#hTg').innerHTML = icon('telegram');
  $('#hDs').href = S.discordUrl; $('#hDs').innerHTML = icon('discord');
  $('#hCta').href = S.shopUrl; $('#hCta').innerHTML = `${icon('bag')}<span>${esc(C.headerCta)}</span>`;
  const navHtml = C.nav.map((n) => `<a href="${esc(n.href)}"${n.external ? ext(n.href) : ''} data-nav="${esc(n.href)}">${esc(n.label)}</a>`).join('');
  $('#nav').innerHTML = navHtml;
  $('#mobileLinks').innerHTML = navHtml + `<a class="btn btn-primary" href="${esc(S.shopUrl)}" target="_blank" rel="noopener">${esc(C.headerCta)}</a>`;

  $('#heroImg').src = C.hero.image;
  $('#heroTitle').innerHTML = hl(C.hero.title);
  $('#heroSub').textContent = C.hero.subtitle;
  $('#heroPlay').innerHTML = `${icon('play')}<span>${esc(C.hero.playButton)}</span>`;
  $('#heroShop').href = S.shopUrl; $('#heroShop').innerHTML = `${icon('bag')}<span>${esc(C.hero.shopButton)}</span>`;
  const heroIp = $('#heroIp');
  heroIp.dataset.copy = S.ip;
  heroIp.setAttribute('aria-label', `Скопировать IP ${S.ip}`);
  heroIp.innerHTML = `<span>${esc(S.ip)}</span>${icon('copy')}`;

  /* ---------- Онлайн-виджет ---------- */
  const label = $('#onlineLabel'), fill = $('#barFill'), dot = $('#onlineDot');
  const players = (n) => plural(n, ['игрок', 'игрока', 'игроков']);
  function setOnline(on, max) {
    const pct = max ? Math.min(100, (on / max) * 100) : 0;
    fill.style.width = Math.max(pct, on > 0 ? 4 : 0) + '%';
    if (reduceMotion || !on) { label.innerHTML = fmtOnline(on, max); return; }
    const t0 = performance.now(), D = 900;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / D), v = Math.round(on * (1 - Math.pow(1 - k, 3)));
      label.innerHTML = fmtOnline(v, max, on);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  const fmtOnline = (v, max, final = v) => `${esc(C.texts.online)} — <b>${v} ${players(final)}</b> / ${max}`;
  function setStatus(text, state) {
    label.textContent = text; fill.style.width = '0%'; dot.dataset.state = state;
  }
  setStatus(C.texts.loading, 'loading');
  (async function loadStatus() {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(S.statusApi, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(to);
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      if (d.online) {
        dot.dataset.state = 'on';
        setOnline((d.players && d.players.online) || 0, (d.players && d.players.max) || S.fallbackMaxPlayers);
      } else setStatus(C.texts.offline, 'off');
    } catch (e) {
      setStatus(C.texts.unavailable, 'off');
    }
    setTimeout(loadStatus, 60000); // обновляем раз в минуту
  })();

  /* ---------- Секции ---------- */
  const F = C.features;
  $('#features').innerHTML = head(F.title, F.subtitle) + `<div class="grid features">${F.items.map((f, i) =>
    `<article class="card feature" style="--d:${i * 60}ms"><span class="f-ico">${icon(f.icon)}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join('')}</div>`;

  const M = C.modes;
  $('#modes').innerHTML = head(M.title, M.subtitle) + `<div class="grid modes">${M.items.map((m) =>
    `<article class="card mode">
      <div class="mode-img"><img src="${esc(m.image)}" alt="Режим ${esc(m.name)}" loading="lazy" width="640" height="360"><span class="tag">${esc(m.tag || '')}</span></div>
      <div class="mode-body"><h3>${esc(m.name)}</h3><p>${esc(m.text)}</p>
      <button class="btn btn-primary" type="button" data-copy="${esc(m.ip || S.ip)}">${icon('copy')}<span>${esc(M.connectLabel)}</span></button></div>
    </article>`).join('')}</div>`;

  const N = C.news;
  $('#news').innerHTML = head(N.title, N.subtitle) +
    `<div class="carousel"><div class="track" id="track" tabindex="0" aria-label="Новости">${N.items.map((n) =>
      `<article class="card news-card"><a class="news-img" href="${esc(n.href)}"${ext(n.href)} tabindex="-1" aria-hidden="true"><img src="${esc(n.image)}" alt="" loading="lazy" width="480" height="270"></a>
      <div class="news-body"><time datetime="${esc(n.date)}">${fmtDate(n.date)}</time><h3>${esc(n.title)}</h3>
      <a class="more" href="${esc(n.href)}"${ext(n.href)}>${esc(N.readMore)}${icon('arrow')}</a></div></article>`).join('')}</div>
    <div class="car-ctl"><button class="icon-btn" id="prev" aria-label="Назад">${icon('left')}</button><button class="icon-btn" id="next" aria-label="Вперёд">${icon('right')}</button></div></div>`;
  const track = $('#track');
  const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 20 : 300);
  $('#prev').onclick = () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' });
  $('#next').onclick = () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' });
  // Перетаскивание мышью
  let drag = null;
  track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, s: track.scrollLeft }; });
  addEventListener('pointermove', (e) => { if (drag) { track.classList.add('dragging'); track.scrollLeft = drag.s - (e.clientX - drag.x); } });
  addEventListener('pointerup', () => { drag = null; track.classList.remove('dragging'); });

  const T = C.start;
  $('#start').innerHTML = head(T.title, T.subtitle) + `<ol class="steps">${T.steps.map((s, i) =>
    `<li class="card step" style="--d:${i * 80}ms"><span class="num">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.showIp ? `<code class="ip-code">${esc(S.ip)}</code>` : ''}</li>`).join('')}</ol>
    <div class="center"><button class="btn btn-primary btn-lg" type="button" data-copy="${esc(S.ip)}">${icon('copy')}<span>${esc(T.copyLabel)} · ${esc(S.ip)}</span></button></div>`;

  const SH = C.shop;
  $('#shop').innerHTML = `<div class="shop-banner"><div><h2>${esc(SH.title)}</h2><p>${esc(SH.text)}</p></div>
    <a class="btn btn-light btn-lg" href="${esc(S.shopUrl)}" target="_blank" rel="noopener">${icon('bag')}<span>${esc(SH.button)}</span></a></div>`;

  const Q = C.faq;
  $('#faq').innerHTML = head(Q.title) + `<div class="faq">${Q.items.map((f) =>
    `<details class="card faq-item"><summary>${esc(f.q)}<span class="plus" aria-hidden="true"></span></summary><div class="faq-a"><p>${esc(f.a)}</p></div></details>`).join('')}</div>`;

  const CM = C.community;
  $('#community').innerHTML = head(CM.title, CM.subtitle) + `<div class="grid community">${CM.items.map((c) =>
    `<article class="card comm ${esc(c.color)}"><span class="c-ico">${icon(c.icon)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
    <a class="btn btn-primary" href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.button)}${icon('arrow')}</a></article>`).join('')}</div>`;

  const FT = C.footer;
  $('#footer').innerHTML = `<div class="container foot-in">
    <div class="foot-brand"><a class="brand" href="#home"><img src="${esc(S.logo)}" alt="" width="36" height="36"><span>XYZ</span></a>
      <p class="muted">${esc(S.ip)}</p></div>
    <div><h4>${esc(FT.quickLinksTitle)}</h4><ul>${C.nav.map((n) => `<li><a href="${esc(n.href)}"${ext(n.href)}>${esc(n.label)}</a></li>`).join('')}</ul></div>
    <div><h4>${esc(FT.socialsTitle)}</h4><div class="socials">
      <a class="icon-btn" href="${esc(S.telegramUrl)}" target="_blank" rel="noopener" aria-label="Telegram">${icon('telegram')}</a>
      <a class="icon-btn" href="${esc(S.discordUrl)}" target="_blank" rel="noopener" aria-label="Discord">${icon('discord')}</a>
      <a class="icon-btn" href="${esc(S.shopUrl)}" target="_blank" rel="noopener" aria-label="Магазин">${icon('bag')}</a></div></div>
    </div>
    <div class="container foot-bot"><span>${esc(FT.copyright)}</span><span>${esc(FT.disclaimer)}</span></div>`;

  /* ---------- Чат-бабл ---------- */
  const chat = $('#chat');
  $('#chatText').textContent = C.chat.text;
  $('#chatBtn').textContent = C.chat.button; $('#chatBtn').href = C.chat.href;
  if (!sget('xyz-chat-closed')) setTimeout(() => { chat.hidden = false; }, 1200);
  $('#chatX').onclick = () => { chat.hidden = true; sset('xyz-chat-closed', '1'); };

  /* ---------- Мобильное меню ---------- */
  const burger = $('#burger'), mnav = $('#mobileNav'), header = $('#header');
  const toggleMenu = (open) => {
    burger.setAttribute('aria-expanded', open); mnav.hidden = !open; header.classList.toggle('open', open);
  };
  burger.onclick = () => toggleMenu(burger.getAttribute('aria-expanded') !== 'true');
  mnav.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

  /* ---------- Шапка при скролле и scroll-spy ---------- */
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in window) {
    const links = $$('[data-nav^="#"]');
    const spy = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.nav === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'modes', 'news', 'start'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

    // Появление секций и карточек при скролле
    const rv = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); }
    }), { threshold: 0.12 });
    $$('.reveal').forEach((el) => rv.observe(el));
  } else $$('.reveal').forEach((el) => el.classList.add('in'));

  /* ---------- Парящие кубики на фоне ---------- */
  if (!reduceMotion) {
    const box = $('#cubes'), n = innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'), s = 10 + Math.random() * 26;
      c.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${18 + Math.random() * 26}s;animation-delay:-${Math.random() * 30}s;opacity:${0.12 + Math.random() * 0.22}`;
      box.appendChild(c);
    }
  }
})();
