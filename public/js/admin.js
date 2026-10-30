/**
 * Админ-панель XYZ: вход по паролю, новости, команда, фон главного экрана.
 * Все изменения идут через API (/api/…); картинки перед загрузкой уменьшаются в браузере.
 */
(function () {
  'use strict';

  const C = window.XYZ_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');

  const ICON = {
    news: '<path d="M5 5h11v14H7a2 2 0 01-2-2V5zM16 9h3v8a2 2 0 01-2 2M8 9h5M8 12h5M8 15h3"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3.2 3.2 0 010 5.6M18 14.4c2 .7 3.5 2.6 3.5 5.6"/>',
    banners: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M6 8h5M6 17h5"/>',
    hero: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 15l5-4 4 3 3-2 6 4"/><circle cx="16.5" cy="9.5" r="1.3"/>',
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

  const state = {
    tab: 'news', limits: { imageMb: 4, videoMb: 4 }, storage: 'files',
    news: [], newsImported: false,
    team: [], teamImported: false, teamDirty: false,
    hero: { type: 'default', src: '', poster: '' }, heroDirty: false,
    banners: {}, bannersDirty: false,
    editing: null, key: 0,
  };

  /* ================= API ================= */
  async function api(path, { method = 'GET', body, raw, headers = {} } = {}) {
    const res = await fetch('/api/' + path, {
      method, credentials: 'same-origin',
      headers: { 'x-requested-with': 'xyz', ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== 'login') { renderLogin('Сессия истекла — войдите снова.'); throw new Error('Требуется вход'); }
    if (!res.ok) {
      console.error('[API]', method, '/api/' + path, res.status, data);       // подробности — в консоль браузера
      const err = new Error(data.error || `Ошибка ${res.status}`);
      if (res.status >= 500 && path !== 'diagnostics') setTimeout(() => showDiagnostics(`${method} /api/${path} → ${res.status}: ${err.message}`), 0);
      throw err;
    }
    return data;
  }

  let toastTimer;
  function toast(msg, error = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('is-error', error);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), error ? 5000 : 2600);
  }
  const busy = (btn, on, text) => { btn.disabled = on; if (text !== undefined) btn.firstElementChild.textContent = text; };

  /* ================= Картинки: уменьшаем в браузере перед загрузкой ================= */
  async function prepareImage(file, maxSide, keepAlpha) {
    if (!/^image\//.test(file.type)) throw new Error('Выберите изображение (JPG, PNG, WebP или GIF)');
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch (e) { throw new Error('Не удалось прочитать изображение'); }
    const limit = state.limits.imageMb * 1024 * 1024 * 0.95;
    const asPng = keepAlpha && /png|webp|gif/.test(file.type);
    let side = maxSide;
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
      const ctx = canvas.getContext('2d');
      if (!asPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, asPng ? 'image/png' : 'image/jpeg', 0.86 - attempt * 0.05));
      if (blob && blob.size <= limit) return blob;
      side = Math.round(side * 0.8);
    }
    throw new Error('Не удалось уменьшить изображение до допустимого размера');
  }
  const upload = async (blob, kind) => (await api(`upload?kind=${kind}`, { method: 'POST', raw: blob, headers: { 'content-type': blob.type || 'application/octet-stream' } })).url;

  function pickFile(accept, onFile) {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept });
    input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); });
    input.click();
  }

  /* ================= Диалог подтверждения ================= */
  function confirmBox(title, text, okLabel = 'Удалить') {
    return new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'adm-dialog adm-dialog--sm';
      dlg.innerHTML = `<div class="adm-dialog__box"><h2>${esc(title)}</h2><p class="adm-lead" style="margin:0">${esc(text)}</p>
        <div class="adm-dialog__foot"><button class="btn btn--secondary" data-r="0" type="button"><span>Отмена</span></button><button class="btn" data-r="1" type="button"><span>${esc(okLabel)}</span></button></div></div>`;
      document.body.appendChild(dlg);
      dlg.addEventListener('click', (e) => { const r = e.target.closest('[data-r]'); if (r) dlg.close(r.dataset.r); else if (e.target === dlg) dlg.close('0'); });
      dlg.addEventListener('close', () => { resolve(dlg.returnValue === '1'); dlg.remove(); });
      dlg.showModal();
    });
  }

  /* ================= Вход ================= */
  function renderLogin(message = '') {
    app.innerHTML = `
      <main class="adm-login">
        <div class="adm-login__box">
          <img src="${esc(C.site.logo)}" alt="" width="64" height="64">
          <h1>Админ-панель</h1>
          <p>${esc(C.site.name)}</p>
          <form id="loginForm" novalidate>
            <label class="adm-field"><span>Пароль</span><input class="adm-input" id="pw" type="password" autocomplete="current-password" required autofocus></label>
            <div class="adm-error" id="loginError" role="alert">${esc(message)}</div>
            <button class="btn btn--lg" type="submit"><span>Войти</span></button>
          </form>
        </div>
      </main>`;
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button', e.target), err = $('#loginError');
      err.textContent = '';
      busy(btn, true, 'Проверка…');
      try {
        await api('login', { method: 'POST', body: { password: $('#pw').value } });
        await bootstrap();
      } catch (ex) { err.textContent = ex.message; busy(btn, false, 'Войти'); $('#pw').select(); }
    });
  }

  function renderDisabled() {
    app.innerHTML = `<main class="adm-login"><div class="adm-login__box"><img src="${esc(C.site.logo)}" alt="" width="64" height="64"><h1>Админ-панель выключена</h1>
      <p>Чтобы включить её, задайте на сервере переменную окружения <b>ADMIN_PASSWORD</b> (не короче 8 символов) и перезапустите сайт.</p></div></main>`;
  }

  /* ================= Каркас ================= */
  function renderShell() {
    app.innerHTML = `
      <div class="adm-shell">
        <aside class="adm-side">
          <a class="brand" href="index.html"><img class="brand__logo" src="${esc(C.site.logo)}" alt="" width="36" height="36"><span class="brand__name">${esc(C.site.name)}</span></a>
          <nav class="adm-tabs" role="tablist" aria-label="Разделы">
            <button class="adm-tab" role="tab" data-tab="news">${icon('news')}Новости</button>
            <button class="adm-tab" role="tab" data-tab="team">${icon('team')}Команда</button>
            <button class="adm-tab" role="tab" data-tab="hero">${icon('hero')}Главный экран</button>
            <button class="adm-tab" role="tab" data-tab="banners">${icon('banners')}Магазин и соцсети</button>
          </nav>
          <div class="adm-side__foot"><a href="index.html" target="_blank" rel="noopener">Открыть сайт</a><button type="button" id="diag">Проверить хранилище</button><button type="button" id="logout">Выйти</button></div>
        </aside>
        <main class="adm-main" id="view"></main>
      </div>`;
    $$('.adm-tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('#diag').addEventListener('click', showDiagnostics);
    $('#logout').addEventListener('click', async () => {
      if ((state.teamDirty || state.heroDirty || state.bannersDirty) && !(await confirmBox('Выйти?', 'Есть несохранённые изменения — они будут потеряны.', 'Выйти'))) return;
      await api('logout', { method: 'POST' }).catch(() => {});
      state.teamDirty = state.heroDirty = state.bannersDirty = false;
      renderLogin();
    });
    switchTab(state.tab);
  }

  async function switchTab(tab) {
    if (tab !== state.tab && ((state.tab === 'team' && state.teamDirty) || (state.tab === 'hero' && state.heroDirty) || (state.tab === 'banners' && state.bannersDirty))) {
      if (!(await confirmBox('Несохранённые изменения', 'Перейти в другой раздел? Изменения будут потеряны.', 'Перейти'))) return;
      await reloadContent();
    }
    state.tab = tab;
    $$('.adm-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ({ news: renderNews, team: renderTeam, hero: renderHero, banners: renderBanners })[tab]();
  }

  const storageNote = () => state.storage === 'missing'
    ? '<p class="adm-note adm-note--warn">Хранилище не подключено, поэтому сохранить изменения пока нельзя. В Vercel откройте Storage → ваш Blob → Connect Project, затем сделайте Redeploy. Нажмите «Проверить хранилище» слева, чтобы убедиться.</p>' : '';

  let diagOpen = false;
  async function showDiagnostics(failure = '') {
    if (diagOpen) return;
    diagOpen = true;
    const dlg = document.createElement('dialog');
    dlg.className = 'adm-dialog adm-dialog--sm';
    dlg.innerHTML = `<div class="adm-dialog__box"><h2>${failure ? 'Не удалось сохранить' : 'Проверка хранилища'}</h2>
      ${failure ? `<p class="adm-error" style="min-height:0">${esc(failure)}</p>` : ''}
      <p class="adm-lead" style="margin:0" id="diagBody">Проверяем запись и чтение…</p>
      <div class="adm-dialog__foot"><button class="btn btn--secondary" type="button" id="diagCopy" hidden><span>Скопировать отчёт</span></button><button class="btn" type="button" data-close><span>Закрыть</span></button></div></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    dlg.addEventListener('close', () => { diagOpen = false; dlg.remove(); });
    dlg.showModal();
    const body = $('#diagBody', dlg);
    let report = `XYZ admin report\n${new Date().toISOString()}\n${location.origin}\n${failure ? 'Ошибка: ' + failure + '\n' : ''}`;
    try {
      const d = await api('diagnostics');
      const mark = (r) => (r && r.ok ? 'работает' : `ОШИБКА: ${r?.error || 'не проверено'}`);
      body.innerHTML = `<b>Режим:</b> ${d.mode === 'vercel-blob' ? 'Vercel Blob' : 'файлы на сервере'}<br>
        <b>Доступ к Blob:</b> ${d.credentials ? esc(d.credentials) : 'не найден'}${d.access ? ` (${esc(d.access)})` : ''}<br>
        <b>Запись:</b> ${esc(mark(d.write))}<br><b>Чтение:</b> ${esc(mark(d.read))}
        ${d.hint ? `<br><br><span style="color:#ffd3de">${esc(d.hint)}</span>` : (d.write?.ok && d.read?.ok ? '<br><br>Хранилище работает. Если ошибка повторяется — скопируйте отчёт и отправьте разработчику.' : '')}`;
      report += `Режим: ${d.mode}\nДоступ: ${d.credentials || 'нет'} ${d.access || ''}\nЗапись: ${mark(d.write)}\nЧтение: ${mark(d.read)}\n${d.hint ? 'Подсказка: ' + d.hint + '\n' : ''}`;
    } catch (e) { body.textContent = e.message; report += `Диагностика не выполнена: ${e.message}\n`; }
    const copy = $('#diagCopy', dlg);
    copy.hidden = false;
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(report); copy.firstElementChild.textContent = 'Скопировано'; } catch (e) { copy.firstElementChild.textContent = 'Не удалось'; } });
  }

  /* ================= Новости ================= */
  const today = () => new Date().toISOString().slice(0, 10);
  const fmt = (iso) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const sortedNews = () => [...state.news].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

  function renderNews() {
    const items = sortedNews();
    $('#view').innerHTML = `
      <div class="adm-bar"><div><h1 class="adm-title">Новости</h1></div><button class="btn" id="newNews" type="button"><span>Добавить новость</span></button></div>
      <p class="adm-lead">На главной показываются последние ${C.news.homeCount} новостей, остальные — в архиве.</p>
      ${storageNote()}
      ${state.newsImported ? '<p class="adm-note">Сейчас показаны новости-заглушки из config.js. Как только вы опубликуете или удалите любую новость, список станет управляться отсюда.</p>' : ''}
      <div class="adm-list">${items.length ? items.map((n) => `
        <article class="adm-item">
          ${n.image ? `<img class="adm-thumb" src="${esc(n.image)}" alt="">` : '<span class="adm-thumb"></span>'}
          <div><h3 class="adm-item__title">${esc(n.title)}</h3><p class="adm-item__meta">${fmt(n.date)}</p></div>
          <div class="adm-actions">
            <a class="btn btn--secondary btn--sm" href="article.html?id=${encodeURIComponent(n.id)}" target="_blank" rel="noopener"><span>Открыть</span></a>
            <button class="btn btn--secondary btn--sm" data-edit="${esc(n.id)}" type="button"><span>Изменить</span></button>
            <button class="btn btn--secondary btn--sm btn--danger" data-del="${esc(n.id)}" type="button"><span>Удалить</span></button>
          </div>
        </article>`).join('') : '<div class="adm-empty">Новостей пока нет. Нажмите «Добавить новость».</div>'}
      </div>`;
    $('#newNews').addEventListener('click', () => openNewsEditor());
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => openNewsEditor(state.news.find((n) => n.id === b.dataset.edit))));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => deleteNews(b.dataset.del)));
  }

  async function saveNewsList(items, okMessage) {
    const res = await api('content/news', { method: 'PUT', body: { items } });
    state.news = res.news;
    state.newsImported = false;
    renderNews();
    toast(okMessage);
  }

  async function deleteNews(id) {
    const n = state.news.find((x) => x.id === id);
    if (!n || !(await confirmBox('Удалить новость?', `«${n.title}» будет удалена без возможности восстановления.`))) return;
    try { await saveNewsList(state.news.filter((x) => x.id !== id), 'Новость удалена'); } catch (e) { toast(e.message, true); }
  }

  function openNewsEditor(item) {
    state.editing = { id: item?.id, createdAt: item?.createdAt, image: item?.image || '', file: null, preview: item?.image || '', removed: false };
    const dlg = document.createElement('dialog');
    dlg.className = 'adm-dialog';
    dlg.innerHTML = `
      <form class="adm-dialog__box" novalidate>
        <h2>${item ? 'Редактировать новость' : 'Новая новость'}</h2>
        <label class="adm-field"><span>Заголовок</span><input class="adm-input" name="title" maxlength="140" required value="${esc(item?.title || '')}"></label>
        <label class="adm-field"><span>Дата</span><input class="adm-input" name="date" type="date" required value="${esc(item?.date || today())}" style="max-width:220px"></label>
        <div class="adm-field"><span>Картинка <span class="adm-hint">(необязательно, до ${state.limits.imageMb} МБ — будет уменьшена автоматически)</span></span>
          <div class="adm-cover"><img class="adm-thumb" id="coverPreview" alt="" ${state.editing.preview ? `src="${esc(state.editing.preview)}"` : 'hidden'}>
            <div class="adm-filebar"><button class="btn btn--secondary btn--sm" id="pickCover" type="button"><span>Выбрать файл</span></button><button class="btn btn--secondary btn--sm btn--danger" id="dropCover" type="button" ${state.editing.preview ? '' : 'hidden'}><span>Убрать</span></button></div></div></div>
        <label class="adm-field"><span>Текст новости <span class="adm-hint">— пустая строка между абзацами создаёт новый абзац</span></span><textarea class="adm-textarea" name="text" maxlength="20000" required>${esc(item?.text || '')}</textarea></label>
        <div class="adm-error" id="newsError" role="alert"></div>
        <div class="adm-dialog__foot"><button class="btn btn--secondary" type="button" data-cancel><span>Отмена</span></button><button class="btn" type="submit"><span>${item ? 'Сохранить' : 'Опубликовать'}</span></button></div>
      </form>`;
    document.body.appendChild(dlg);
    const form = $('form', dlg), preview = $('#coverPreview', dlg), drop = $('#dropCover', dlg), err = $('#newsError', dlg);
    $('#pickCover', dlg).addEventListener('click', () => pickFile('image/*', async (f) => {
      try {
        state.editing.file = await prepareImage(f, 1600, false);
        if (state.editing.preview.startsWith('blob:')) URL.revokeObjectURL(state.editing.preview);
        state.editing.preview = URL.createObjectURL(state.editing.file);
        state.editing.removed = false;
        preview.src = state.editing.preview; preview.hidden = false; drop.hidden = false; err.textContent = '';
      } catch (ex) { err.textContent = ex.message; }
    }));
    drop.addEventListener('click', () => { Object.assign(state.editing, { file: null, preview: '', removed: true }); preview.hidden = true; drop.hidden = true; });
    $('[data-cancel]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => { if (state.editing?.preview?.startsWith('blob:')) URL.revokeObjectURL(state.editing.preview); dlg.remove(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = form.title.value.trim(), text = form.text.value.trim(), date = form.date.value;
      if (!title) { err.textContent = 'Введите заголовок'; return form.title.focus(); }
      if (!date) { err.textContent = 'Укажите дату'; return form.date.focus(); }
      if (!text) { err.textContent = 'Введите текст новости'; return form.text.focus(); }
      const btn = $('[type=submit]', form);
      busy(btn, true, 'Сохранение…');
      try {
        let image = state.editing.removed ? '' : state.editing.image;
        if (state.editing.file) image = await upload(state.editing.file, 'image');
        const saved = { id: state.editing.id, createdAt: state.editing.createdAt, title, text, date, image };
        const list = state.editing.id ? state.news.map((n) => (n.id === state.editing.id ? { ...n, ...saved } : n)) : [{ ...saved, createdAt: new Date().toISOString() }, ...state.news];
        await saveNewsList(list, state.editing.id ? 'Изменения сохранены' : 'Новость опубликована');
        dlg.close();
      } catch (ex) { err.textContent = ex.message; busy(btn, false, state.editing.id ? 'Сохранить' : 'Опубликовать'); }
    });
    dlg.showModal();
    form.title.focus();
  }

  /* ================= Команда ================= */
  const ROLES = ['Владелец', 'Тех. разработчик', 'Куратор', 'Администратор', 'Модератор', 'Хелпер'];
  const skinSrc = (nick) => C.team.skinUrl.replace('{nick}', encodeURIComponent(nick));

  function memberAvatar(m) {
    if (m._preview || m.photo) return `<img class="is-photo" src="${esc(m._preview || m.photo)}" alt="">`;
    if (m.nick) return `<img src="${esc(skinSrc(m.nick))}" alt="" data-nick="${esc(m.nick)}" data-step="0">`;
    return `<img src="${esc(C.team.placeholder)}" alt="">`;
  }

  function renderTeam() {
    const savebar = `<div class="adm-savebar"><span class="adm-savebar__status ${state.teamDirty ? 'is-dirty' : ''}" id="teamStatus">${state.teamDirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}</span><button class="btn" id="saveTeam" type="button" ${state.teamDirty ? '' : 'disabled'}><span>Сохранить изменения</span></button></div>`;
    $('#view').innerHTML = `
      <div class="adm-bar"><h1 class="adm-title">Команда</h1><button class="btn" id="addMember" type="button"><span>Добавить участника</span></button></div>
      <p class="adm-lead">Загрузите фото участника или укажите ник Minecraft — по нему сайт подтянет скин автоматически.</p>
      ${storageNote()}
      ${state.teamImported ? '<p class="adm-note">Сейчас показан запасной список из config.js. После сохранения команда будет управляться отсюда.</p>' : ''}
      <datalist id="roles">${ROLES.map((r) => `<option value="${esc(r)}">`).join('')}</datalist>
      <div class="adm-team">${state.team.length ? state.team.map((m, i) => `
        <article class="adm-member" data-i="${i}">
          <div class="adm-member__top">
            <div class="adm-avatar">${memberAvatar(m)}</div>
            <div class="adm-member__btns">
              <button class="btn btn--secondary btn--sm" data-act="photo" type="button"><span>Загрузить фото</span></button>
              <button class="btn btn--secondary btn--sm btn--danger" data-act="nophoto" type="button" ${m._preview || m.photo ? '' : 'hidden'}><span>Убрать фото</span></button>
            </div>
          </div>
          <label class="adm-field"><span>Имя</span><input class="adm-input" data-f="name" maxlength="60" value="${esc(m.name)}"></label>
          <label class="adm-field"><span>Роль / должность</span><input class="adm-input" data-f="role" list="roles" maxlength="60" value="${esc(m.role)}"></label>
          <label class="adm-field"><span>Ник Minecraft <span class="adm-hint">(для скина)</span></span><input class="adm-input" data-f="nick" maxlength="16" autocapitalize="off" spellcheck="false" value="${esc(m.nick)}"></label>
          <label class="adm-check"><input type="checkbox" data-f="highlight" ${m.highlight ? 'checked' : ''}>Выделить роль</label>
          <div class="adm-member__foot">
            <div class="adm-order"><button class="btn btn--secondary btn--sm" data-act="up" type="button" aria-label="Выше" ${i === 0 ? 'disabled' : ''}><span>↑</span></button><button class="btn btn--secondary btn--sm" data-act="down" type="button" aria-label="Ниже" ${i === state.team.length - 1 ? 'disabled' : ''}><span>↓</span></button></div>
            <button class="btn btn--secondary btn--sm btn--danger" data-act="remove" type="button"><span>Удалить</span></button>
          </div>
        </article>`).join('') : '<div class="adm-empty" style="grid-column:1/-1">В команде пока никого нет.</div>'}
      </div>${savebar}`;

    const root = $('#view');
    $('#addMember').addEventListener('click', () => { state.team.push({ _key: ++state.key, name: 'Новый участник', role: '', nick: '', photo: '', highlight: false }); markTeamDirty(); renderTeam(); });
    $('#saveTeam').addEventListener('click', saveTeam);
    $$('.adm-avatar img[data-nick]', root).forEach((img) => img.addEventListener('error', () => { const st = Number(img.dataset.step) + 1; if (st > 2) return; img.dataset.step = st; img.src = st === 1 ? C.team.skinFallbackUrl.replace('{nick}', encodeURIComponent(img.dataset.nick)) : C.team.placeholder; }));

    $$('.adm-member', root).forEach((card) => {
      const i = Number(card.dataset.i), m = state.team[i];
      $$('[data-f]', card).forEach((input) => {
        const f = input.dataset.f;
        input.addEventListener('input', () => { m[f] = input.type === 'checkbox' ? input.checked : input.value; markTeamDirty(); });
        if (f === 'nick') input.addEventListener('change', () => { if (!m.photo && !m._preview) renderTeam(); });   // обновляем скин-превью
      });
      card.addEventListener('click', async (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        if (act === 'photo') pickFile('image/*', async (f) => {
          try { m._file = await prepareImage(f, 640, true); m._preview = URL.createObjectURL(m._file); markTeamDirty(); renderTeam(); } catch (ex) { toast(ex.message, true); }
        });
        if (act === 'nophoto') { m.photo = ''; m._file = null; m._preview = ''; markTeamDirty(); renderTeam(); }
        if (act === 'up' || act === 'down') { const j = i + (act === 'up' ? -1 : 1); [state.team[i], state.team[j]] = [state.team[j], state.team[i]]; markTeamDirty(); renderTeam(); }
        if (act === 'remove' && (await confirmBox('Удалить участника?', `«${m.name || 'Без имени'}» будет убран из списка после сохранения.`))) { state.team.splice(i, 1); markTeamDirty(); renderTeam(); }
      });
    });
  }

  function markTeamDirty() {
    state.teamDirty = true;
    const s = $('#teamStatus'), b = $('#saveTeam');
    if (s) { s.textContent = 'Есть несохранённые изменения'; s.classList.add('is-dirty'); }
    if (b) b.disabled = false;
  }

  async function saveTeam() {
    const btn = $('#saveTeam');
    for (const m of state.team) if (!m.name.trim()) return toast('У каждого участника должно быть имя', true);
    busy(btn, true, 'Сохранение…');
    try {
      const items = [];
      for (const m of state.team) {
        let photo = m.photo;
        if (m._file) photo = await upload(m._file, 'image');
        items.push({ id: m.id, name: m.name.trim(), role: m.role.trim(), nick: m.nick.trim(), photo, highlight: m.highlight });
      }
      const res = await api('content/team', { method: 'PUT', body: { items } });
      state.team.forEach((m) => m._preview && URL.revokeObjectURL(m._preview));
      state.team = res.team; state.teamDirty = false; state.teamImported = false;
      renderTeam();
      toast('Команда сохранена');
    } catch (e) { toast(e.message, true); busy(btn, false, 'Сохранить изменения'); }
  }

  /* ================= Главный экран ================= */
  function heroPreview(h) {
    const src = h._preview || h.src;
    if (h.type === 'image' && src) return `<img src="${esc(src)}" alt="">`;
    if (h.type === 'video' && src) return `<video src="${esc(src)}" ${h.poster || h._posterPreview ? `poster="${esc(h._posterPreview || h.poster)}"` : ''} muted loop autoplay playsinline></video>`;
    if (h.type === 'default') return `<img src="${esc(C.hero.image)}" alt="">`;
    return '<div class="adm-preview__empty">Файл не выбран</div>';
  }

  function renderHero() {
    const h = state.hero;
    const fileRow = (kind, accept, label, current) => `
      <div class="adm-field"><span>${label}</span>
        <div class="adm-filebar"><button class="btn btn--secondary btn--sm" data-pick="${kind}" type="button"><span>Выбрать файл</span></button>
          <span class="adm-filename">${current ? esc(current) : 'или вставьте ссылку ниже'}</span></div>
        <input class="adm-input" data-url="${kind}" type="url" placeholder="https://…" value="${esc(kind === 'poster' ? (h.poster.startsWith('blob:') ? '' : h.poster) : h._file ? '' : h.src)}"></div>`;
    $('#view').innerHTML = `
      <div class="adm-bar"><h1 class="adm-title">Главный экран</h1></div>
      <p class="adm-lead">Фон за заголовком на главной странице и в шапках внутренних страниц.</p>
      ${storageNote()}
      <div class="adm-radios" role="radiogroup" aria-label="Тип фона">
        ${[['default', 'Стандартный', 'Картинка из файла assets/hero.jpg'], ['image', 'Картинка', 'Своё изображение, будет размыто'], ['video', 'Видео', 'Зацикленное видео без звука']].map(([v, t, d]) => `
          <label class="adm-radio"><input type="radio" name="heroType" value="${v}" ${h.type === v ? 'checked' : ''}><b>${t}</b><span>${d}</span></label>`).join('')}
      </div>
      <div class="adm-panel">
        ${h.type === 'image' ? fileRow('image', 'image/*', `Картинка <span class="adm-hint">(до ${state.limits.imageMb} МБ, уменьшается автоматически)</span>`, h._file ? 'Выбран новый файл' : h.src) : ''}
        ${h.type === 'video' ? `${fileRow('video', 'video/mp4,video/webm', `Видео MP4 или WebM <span class="adm-hint">(файл до ${state.limits.videoMb} МБ; для больших видео вставьте прямую https-ссылку)</span>`, h._file ? h._file.name : h.src)}
          ${fileRow('poster', 'image/*', 'Постер <span class="adm-hint">(необязательно — показывается, пока видео загружается)</span>', h._posterFile ? 'Выбран новый файл' : h.poster)}` : ''}
        <div class="adm-field"><span>Предпросмотр</span><div class="adm-preview" id="heroPreview">${heroPreview(h)}</div></div>
      </div>
      <div class="adm-savebar"><span class="adm-savebar__status ${state.heroDirty ? 'is-dirty' : ''}" id="heroStatus">${state.heroDirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}</span><button class="btn" id="saveHero" type="button" ${state.heroDirty ? '' : 'disabled'}><span>Сохранить изменения</span></button></div>`;

    const dirty = () => { state.heroDirty = true; $('#heroStatus').textContent = 'Есть несохранённые изменения'; $('#heroStatus').classList.add('is-dirty'); $('#saveHero').disabled = false; };
    $$('input[name=heroType]').forEach((r) => r.addEventListener('change', () => { h.type = r.value; dirty(); renderHero(); }));
    $$('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      const kind = b.dataset.pick;
      pickFile(kind === 'video' ? 'video/mp4,video/webm' : 'image/*', async (f) => {
        try {
          if (kind === 'video') {
            if (f.size > state.limits.videoMb * 1024 * 1024) throw new Error(`Видео больше ${state.limits.videoMb} МБ — вставьте ссылку на файл`);
            if (!/^video\/(mp4|webm)$/.test(f.type)) throw new Error('Допустимы видео MP4 и WebM');
            h._file = f; h._preview = URL.createObjectURL(f);
          } else if (kind === 'image') { h._file = await prepareImage(f, 2200, false); h._preview = URL.createObjectURL(h._file); }
          else { h._posterFile = await prepareImage(f, 1600, false); h._posterPreview = URL.createObjectURL(h._posterFile); }
          dirty(); renderHero();
        } catch (ex) { toast(ex.message, true); }
      });
    }));
    $$('[data-url]').forEach((inp) => inp.addEventListener('input', () => {
      const v = inp.value.trim();
      if (inp.dataset.url === 'poster') { h.poster = v; h._posterFile = null; h._posterPreview = ''; }
      else { h.src = v; h._file = null; h._preview = ''; }
      dirty();
      if (/^https:\/\//.test(v)) $('#heroPreview').innerHTML = heroPreview(h);
    }));
    $('#saveHero').addEventListener('click', saveHero);
  }

  async function saveHero() {
    const h = state.hero, btn = $('#saveHero');
    busy(btn, true, 'Сохранение…');
    try {
      const body = { type: h.type, src: '', poster: '' };
      if (h.type !== 'default') {
        body.src = h._file ? await upload(h._file, h.type === 'video' ? 'video' : 'image') : h.src;
        if (!body.src) throw new Error(h.type === 'video' ? 'Выберите видео или вставьте ссылку' : 'Выберите картинку или вставьте ссылку');
      }
      if (h.type === 'video') body.poster = h._posterFile ? await upload(h._posterFile, 'image') : h.poster;
      const res = await api('content/hero', { method: 'PUT', body });
      [h._preview, h._posterPreview].forEach((u) => u && URL.revokeObjectURL(u));
      state.hero = { ...res.hero }; state.heroDirty = false;
      renderHero();
      toast('Фон главного экрана сохранён');
    } catch (e) { toast(e.message, true); busy(btn, false, 'Сохранить изменения'); }
  }

  /* ================= Магазин и соцсети: картинки больших блоков ================= */
  function renderBanners() {
    const blocks = C.banners.items;
    $('#view').innerHTML = `
      <div class="adm-bar"><h1 class="adm-title">Магазин и соцсети</h1></div>
      <p class="adm-lead">Картинки больших блоков внизу главной страницы. Картинка стоит неподвижно; лучше формат 4:3 (например, 1200×900).</p>
      ${storageNote()}
      <div class="adm-banners">${blocks.map((b) => {
        const cur = state.banners[b.id] || {};
        const custom = Boolean(cur._preview || cur.image);
        return `<article class="adm-banner" data-id="${esc(b.id)}">
          <div class="adm-banner__img"><img src="${esc(cur._preview || cur.image || b.image)}" alt=""></div>
          <div class="adm-banner__body"><h3>${esc(b.title)}</h3>
            <p class="adm-item__meta">${custom ? 'Своя картинка' : 'Стандартная картинка'}</p>
            <div class="adm-filebar">
              <button class="btn btn--secondary btn--sm" data-act="pick" type="button"><span>Загрузить картинку</span></button>
              <button class="btn btn--secondary btn--sm btn--danger" data-act="reset" type="button" ${custom ? '' : 'hidden'}><span>Вернуть стандартную</span></button>
            </div></div></article>`;
      }).join('')}</div>
      <div class="adm-savebar"><span class="adm-savebar__status ${state.bannersDirty ? 'is-dirty' : ''}">${state.bannersDirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}</span><button class="btn" id="saveBanners" type="button" ${state.bannersDirty ? '' : 'disabled'}><span>Сохранить изменения</span></button></div>`;

    $$('.adm-banner').forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'pick') pickFile('image/*', async (f) => {
          try {
            const cur = state.banners[id] || (state.banners[id] = { image: '' });
            if (cur._preview) URL.revokeObjectURL(cur._preview);
            cur._file = await prepareImage(f, 1600, false);
            cur._preview = URL.createObjectURL(cur._file);
            state.bannersDirty = true; renderBanners();
          } catch (ex) { toast(ex.message, true); }
        });
        if (act === 'reset') {
          const cur = state.banners[id];
          if (cur && cur._preview) URL.revokeObjectURL(cur._preview);
          state.banners[id] = { image: '' };
          state.bannersDirty = true; renderBanners();
        }
      });
    });
    $('#saveBanners').addEventListener('click', saveBanners);
  }

  async function saveBanners() {
    const btn = $('#saveBanners');
    busy(btn, true, 'Сохранение…');
    try {
      const items = {};
      for (const b of C.banners.items) {
        const cur = state.banners[b.id] || {};
        items[b.id] = { image: cur._file ? await upload(cur._file, 'image') : cur.image || '' };
      }
      const res = await api('content/banners', { method: 'PUT', body: { items } });
      Object.values(state.banners).forEach((x) => x._preview && URL.revokeObjectURL(x._preview));
      state.banners = Object.fromEntries(Object.entries(res.banners || {}).map(([k, v]) => [k, { image: v.image }]));
      state.bannersDirty = false;
      renderBanners();
      toast('Картинки сохранены');
    } catch (e) { toast(e.message, true); busy(btn, false, 'Сохранить изменения'); }
  }

  /* ================= Загрузка данных и запуск ================= */
  async function reloadContent() {
    const c = await fetch('/api/content', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({}));
    state.newsImported = !Array.isArray(c.news);
    state.news = (Array.isArray(c.news) ? c.news : C.news.items).map((n) => ({ ...n }));
    state.teamImported = !Array.isArray(c.team);
    state.team = (Array.isArray(c.team) ? c.team : C.team.members).map((m) => ({ ...m, _key: ++state.key, nick: m.nick || '', role: m.role || '', photo: m.photo || '' }));
    state.hero = { type: 'default', src: '', poster: '', ...(c.hero || {}) };
    state.banners = Object.fromEntries(Object.entries(c.banners || {}).map(([k, v]) => [k, { image: v.image || '' }]));
    state.teamDirty = state.heroDirty = state.bannersDirty = false;
  }

  async function bootstrap() {
    const s = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    if (!s) { app.innerHTML = '<main class="adm-login"><div class="adm-login__box"><h1>Нет связи с сервером</h1><p>Админ-панель работает только вместе с серверной частью сайта (API).</p></div></main>'; return; }
    if (!s.enabled) return renderDisabled();
    if (!s.admin) return renderLogin();
    state.limits = s.limits || state.limits;
    state.storage = s.storage || 'files';
    await reloadContent();
    renderShell();
  }

  window.addEventListener('beforeunload', (e) => { if (state.teamDirty || state.heroDirty || state.bannersDirty) { e.preventDefault(); e.returnValue = ''; } });
  bootstrap();
})();
