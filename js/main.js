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
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ---------- Утилиты ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // «Слово в {скобках}» → градиентный span, \n → перенос строки
  const hl = (s) => esc(s).replace(/\{(.+?)\}/g, '<span class="grad">$1</span>').replace(/\n/g, '<br>');
  const ext = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');
  const plural = (n, [a, b, c]) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d >= 2 && d <= 4 ? b : c; };
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const pad2 = (n) => String(n).padStart(2, '0');
  const sget = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const sset = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  /* ---------- Иконки (inline SVG) ---------- */
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
    // пиксельные стрелки
    pxr: '<path fill="currentColor" stroke="none" d="M6 2h4v4H6zM10 6h4v4h-4zM14 10h4v4h-4zM10 14h4v4h-4zM6 18h4v4H6z"/>',
    pxl: '<path fill="currentColor" stroke="none" d="M14 2h4v4h-4zM10 6h4v4h-4zM6 10h4v4H6zM10 14h4v4h-4zM14 18h4v4h-4z"/>',
    // брендовые знаки
    telegram: '<path fill="currentColor" stroke="none" d="M20.7 4.3L3.4 11c-1.2.5-1.1 1.2-.2 1.4l4.4 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.4-1.7-1.3-1.7zM8.4 13.5l9-5.6c.4-.3.8-.1.5.2l-7.4 6.7-.3 3-1.8-4.3z"/>',
    discord: '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M19.3 5.4A16 16 0 0015.3 4l-.5 1a15 15 0 00-4.5 0l-.5-1a16 16 0 00-4 1.4C3.2 9.2 2.5 12.9 2.8 16.6a16 16 0 004.9 2.5l1-1.7c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.4 11.4 0 009.8 0l.4.3c-.5.3-1 .6-1.6.8l1 1.7a16 16 0 004.9-2.5c.4-4.3-.7-8-2.8-11.2zM9.3 10.9a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8zm5.4 0a1.7 1.9 0 100 3.8 1.7 1.9 0 000-3.8z"/>',
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* ---------- Шаблонные помощники ---------- */
  const lbl = (t, ic) => `<span>${esc(t)}</span>${ic ? icon(ic) : ''}`;                       // подпись кнопки + иконка справа
  const fill = (id, html) => { $('#' + id).innerHTML = `<div class="container">${html}</div>`; };
  const head = (t, sub) => `<div class="sec-head"><div class="orn" aria-hidden="true"><i></i><b></b><i></i></div><h2>${hl(t)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  // Угловая карточка: обёртка .cw даёт подъём и свечение, .card — форму со срезанными углами
  const card = (cls, inner, delay = 0, tag = 'article') =>
    `<div class="cw" style="--d:${delay}ms"><${tag} class="card ${cls}">${inner}</${tag}></div>`;

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

  /* ---------- Шапка и hero ---------- */
  $('#brandLogo').src = S.logo; $('#emblem').src = S.logo;
  $('#hTg').href = S.telegramUrl; $('#hTg').innerHTML = icon('telegram');
  $('#hDs').href = S.discordUrl; $('#hDs').innerHTML = icon('discord');
  $('#hCta').href = S.shopUrl; $('#hCta').innerHTML = lbl(C.headerCta, 'pxr');
  const navHtml = C.nav.map((n) => `<a href="${esc(n.href)}"${n.external ? ext(n.href) : ''} data-nav="${esc(n.href)}">${esc(n.label)}</a>`).join('');
  $('#nav').innerHTML = navHtml;
  $('#mobileLinks').innerHTML = navHtml + `<a class="btn" href="${esc(S.shopUrl)}" target="_blank" rel="noopener">${lbl(C.headerCta, 'pxr')}</a>`;

  $('#heroImg').src = C.hero.image;
  $('#heroVer').textContent = C.hero.version || '';
  $('#heroTitle').innerHTML = hl(C.hero.title);
  $('#heroSub').textContent = C.hero.subtitle;
  $('#heroPlay').innerHTML = lbl(C.hero.playButton, 'play');
  const heroIp = $('#heroIp');
  heroIp.dataset.copy = S.ip;
  heroIp.setAttribute('aria-label', `Скопировать IP ${S.ip}`);
  heroIp.innerHTML = `<span>${esc(S.ip)}</span>${icon('copy')}`;

  // Бегущая лента: две полосы, контент дублируется для бесшовной прокрутки
  const tick = (cls) => { const row = C.ticker.map((t) => `<span>${esc(t)}</span><i></i>`).join(''); return `<div class="tape ${cls}"><div class="tape-in">${row}${row}${row}${row}</div></div>`; };
  $('#ticker').innerHTML = tick('back') + tick('front');

  /* ---------- Онлайн-виджет ---------- */
  const label = $('#onlineLabel'), barEl = $('#barFill'), dot = $('#onlineDot');
  const players = (n) => plural(n, ['игрок', 'игрока', 'игроков']);
  const fmtOnline = (v, max, final = v) => `${esc(C.texts.online)} — <b>${v} ${players(final)}</b> / ${max}`;
  function setOnline(on, max) {
    const pct = max ? Math.min(100, (on / max) * 100) : 0;
    barEl.style.width = Math.max(pct, on > 0 ? 4 : 0) + '%';
    if (reduceMotion || !on) { label.innerHTML = fmtOnline(on, max); return; }
    const t0 = performance.now(), D = 900;
    (function tickFn(t) {
      const k = Math.min(1, (t - t0) / D), v = Math.round(on * (1 - Math.pow(1 - k, 3)));
      label.innerHTML = fmtOnline(v, max, on);
      if (k < 1) requestAnimationFrame(tickFn);
    })(t0);
  }
  function setStatus(text, state) { label.textContent = text; barEl.style.width = '0%'; dot.dataset.state = state; }
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
  fill('features', head(F.title, F.subtitle) + `<div class="grid features">${F.items.map((f, i) =>
    card('feature', `<span class="ghost-n" aria-hidden="true">${pad2(i + 1)}</span><span class="f-ico">${icon(f.icon)}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p>`, i * 70)).join('')}</div>`);

  const M = C.modes;
  fill('modes', head(M.title, M.subtitle) + `<div class="modes">${M.items.map((m) =>
    card('mode', `<div class="mode-img"><img src="${esc(m.image)}" alt="Режим ${esc(m.name)}" loading="lazy" width="640" height="360"><span class="tag">${esc(m.tag || '')}</span></div>
      <div class="mode-body"><h3>${esc(m.name)}</h3><p>${esc(m.text)}</p>
      <div class="mode-ip"><code>${esc(m.ip || S.ip)}</code></div>
      <button class="btn" type="button" data-copy="${esc(m.ip || S.ip)}">${lbl(M.connectLabel, 'copy')}</button></div>`)).join('')}</div>`);

  /* Новости: слайдер «текст + большая картинка» */
  const N = C.news;
  fill('news', head(N.title, N.subtitle) + `<div class="news-show" id="newsShow" aria-live="polite">${N.items.map((n, i) =>
    `<article class="news-slide${i ? '' : ' on'}" aria-hidden="${i ? 'true' : 'false'}">
      <div class="news-text"><span class="news-n" aria-hidden="true">${pad2(i + 1)}</span><h3><a href="${esc(n.href)}"${ext(n.href)}>${esc(n.title)}</a></h3><p>${esc(n.text || '')}</p>
        <div class="news-meta"><time datetime="${esc(n.date)}">${fmtDate(n.date)}</time><span class="line"></span><a class="more" href="${esc(n.href)}"${ext(n.href)}>${esc(N.readMore)} ▸</a></div></div>
      <a class="news-img" href="${esc(n.href)}"${ext(n.href)} tabindex="-1" aria-hidden="true"><img src="${esc(n.image)}" alt="" ${i ? 'loading="lazy"' : ''} width="720" height="405"></a>
    </article>`).join('')}</div>
    <div class="news-ctl"><button class="sq-btn" id="prev" aria-label="Назад">${icon('pxl')}</button>
      <div class="dots" id="dots">${N.items.map((n, i) => `<button class="dot${i ? '' : ' on'}" aria-label="Новость ${i + 1}"></button>`).join('')}</div>
      <button class="sq-btn" id="next" aria-label="Вперёд">${icon('pxr')}</button></div>
    <div class="center"><a class="btn btn-pink btn-lg" href="${esc(N.moreHref)}"${ext(N.moreHref)}>${lbl(N.moreLabel, 'pxr')}</a></div>`);
  (function () {
    const slides = $$('.news-slide'), dots = $$('.dot'), show = $('#newsShow');
    let cur = 0;
    const go = (i) => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((el, k) => { el.classList.toggle('on', k === cur); el.setAttribute('aria-hidden', k !== cur); });
      dots.forEach((el, k) => el.classList.toggle('on', k === cur));
    };
    $('#prev').onclick = () => go(cur - 1);
    $('#next').onclick = () => go(cur + 1);
    dots.forEach((d, k) => { d.onclick = () => go(k); });
    let x0 = null; // свайп на телефонах
    show.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    show.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
    });
  })();

  const T = C.start;
  fill('start', head(T.title, T.subtitle) + `<ol class="steps">${T.steps.map((s, i) =>
    `<li>${card('step', `<span class="num" aria-hidden="true">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.showIp ? `<code class="ip-code">${esc(S.ip)}</code>` : ''}`, i * 90, 'div')}</li>`).join('')}</ol>
    <div class="center"><button class="btn btn-lg" type="button" data-copy="${esc(S.ip)}">${lbl(T.copyLabel + ' · ' + S.ip, 'copy')}</button></div>`);

  // Магазин — косая полоса на всю ширину
  const SH = C.shop;
  $('#shop').innerHTML = `<div class="shop-banner"><span class="shop-ghost" aria-hidden="true">XYZ</span><div class="container shop-in"><div><h2>${esc(SH.title)}</h2><p>${esc(SH.text)}</p></div>
    <a class="btn btn-secondary btn-lg" href="${esc(S.shopUrl)}" target="_blank" rel="noopener">${lbl(SH.button, 'pxr')}</a></div></div>`;

  const Q = C.faq;
  fill('faq', head(Q.title) + `<div class="faq">${Q.items.map((f) =>
    card('faq-item', `<summary>${esc(f.q)}<span class="plus" aria-hidden="true"></span></summary><div class="faq-a"><p>${esc(f.a)}</p></div>`, 0, 'details')).join('')}</div>`);

  const CM = C.community;
  fill('community', head(CM.title, CM.subtitle) + `<div class="grid community">${CM.items.map((c, i) =>
    card('comm ' + esc(c.color), `<span class="comm-bg" aria-hidden="true">${icon(c.icon)}</span><span class="c-ico">${icon(c.icon)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
    <a class="btn" href="${esc(c.href)}" target="_blank" rel="noopener">${lbl(c.button, 'pxr')}</a>`, i * 100)).join('')}</div>`);

  const FT = C.footer;
  $('#footer').innerHTML = `<span class="foot-ghost" aria-hidden="true">XYZ</span><div class="container foot-in">
    <div class="foot-brand"><a class="brand" href="#home"><img src="${esc(S.logo)}" alt="" width="46" height="46"><span>XYZ</span></a>
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
  $('#chatBtn').innerHTML = lbl(C.chat.button, 'pxr'); $('#chatBtn').href = C.chat.href;
  if (!sget('xyz-chat-closed')) setTimeout(() => { chat.hidden = false; }, 1200);
  $('#chatX').onclick = () => { chat.hidden = true; sset('xyz-chat-closed', '1'); };

  /* ---------- Мобильное меню ---------- */
  const burger = $('#burger'), mnav = $('#mobileNav'), header = $('#header');
  const toggleMenu = (open) => { burger.setAttribute('aria-expanded', open); mnav.hidden = !open; header.classList.toggle('open', open); };
  burger.onclick = () => toggleMenu(burger.getAttribute('aria-expanded') !== 'true');
  mnav.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

  /* ---------- Шапка при скролле, прогресс, scroll-spy ---------- */
  const progress = $('#progress');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 10);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in window) {
    const links = $$('[data-nav^="#"]');
    const spy = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.nav === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'modes', 'news', 'start'].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
    // Появление секций и карточек
    const rv = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); }
    }), { threshold: 0.1 });
    $$('.reveal').forEach((el) => rv.observe(el));
  } else $$('.reveal').forEach((el) => el.classList.add('in'));

  /* ---------- Свет за курсором: hero и карточки ---------- */
  if (finePointer && !reduceMotion) {
    const hero = $('#home');
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--hy', (e.clientY - r.top) + 'px');
    });
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* ---------- Искры на фоне (их немного) ---------- */
  if (!reduceMotion) {
    const box = $('#sparks'), n = innerWidth < 700 ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i'), s = 5 + Math.random() * 9;
      c.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${14 + Math.random() * 20}s;animation-delay:-${Math.random() * 30}s;${i % 4 === 0 ? 'background:#ff3d71;box-shadow:0 0 14px #ff3d71' : ''}`;
      box.appendChild(c);
    }
  }
})();
