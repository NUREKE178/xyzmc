'use strict';
/**
 * API сайта. Один обработчик используется и на Vercel (api/index.js), и в локальном server.js.
 *
 *   GET  /api/content          — публичный контент (новости, команда, фон главной)
 *   GET  /api/session          — состояние входа администратора
 *   POST /api/login            — вход по паролю
 *   POST /api/logout           — выход
 *   PUT  /api/content/news     — сохранить список новостей      (админ)
 *   PUT  /api/content/team     — сохранить команду             (админ)
 *   PUT  /api/content/hero     — сохранить фон главного экрана (админ)
 *   POST /api/upload?kind=…    — загрузить картинку/видео      (админ)
 */
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const auth = require('./auth');
const store = require('./store');
const validate = require('./validate');

const JSON_LIMIT = 512 * 1024;
const IMAGE_LIMIT = 4 * 1024 * 1024;                                   // у функций Vercel лимит тела ≈ 4,5 МБ
const VIDEO_LIMIT = (Number(process.env.MAX_VIDEO_MB) || (store.useBlob() ? 4 : 40)) * 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------- Вспомогательное ---------- */
function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(payload);
}

async function readBody(req, limit) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > limit) throw new HttpError(413, 'Файл слишком большой');
  // Сначала читаем сам поток. К req.body на Vercel лучше не обращаться: он читает тело сам и с лимитом 1 МБ.
  if (!req.readableEnded) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw new HttpError(413, 'Файл слишком большой');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  const pre = req.body;                                                  // поток уже прочитан окружением
  if (Buffer.isBuffer(pre)) return pre;
  if (typeof pre === 'string') return Buffer.from(pre);
  if (pre && typeof pre === 'object') return Buffer.from(JSON.stringify(pre));
  return Buffer.alloc(0);
}

async function readJson(req) {
  const raw = await readBody(req, JSON_LIMIT);
  try { return JSON.parse(raw.toString('utf8') || '{}'); } catch (e) { throw new HttpError(400, 'Некорректный JSON'); }
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

// Защита от CSRF: запросы-изменения только со своего origin и с нашим заголовком
function assertSameOrigin(req) {
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch (e) { throw new HttpError(403, 'Запрещено'); }
    if (host !== req.headers.host) throw new HttpError(403, 'Запрещено');
  }
  if (req.headers['x-requested-with'] !== 'xyz') throw new HttpError(403, 'Запрещено');
}

function requireAdmin(req) {
  if (!auth.enabled()) throw new HttpError(503, 'Админ-панель выключена: не задан ADMIN_PASSWORD (минимум 8 символов)');
  if (!auth.isAdmin(req)) throw new HttpError(401, 'Требуется вход');
}

/* ---------- Загрузки ---------- */
const MAGIC = [
  { kind: 'image', ext: '.jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: 'image', ext: '.png', type: 'image/png', test: (b) => b.length > 8 && b.readUInt32BE(0) === 0x89504e47 },
  { kind: 'image', ext: '.gif', type: 'image/gif', test: (b) => b.slice(0, 4).toString() === 'GIF8' },
  { kind: 'image', ext: '.webp', type: 'image/webp', test: (b) => b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  { kind: 'video', ext: '.mp4', type: 'video/mp4', test: (b) => b.length > 12 && b.slice(4, 8).toString() === 'ftyp' },
  { kind: 'video', ext: '.webm', type: 'video/webm', test: (b) => b.length > 4 && b.readUInt32BE(0) === 0x1a45dfa3 },
];

async function handleUpload(req, res, query) {
  const kind = query.get('kind') === 'video' ? 'video' : 'image';
  const limit = kind === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT;
  const buf = await readBody(req, limit);
  if (!buf.length) throw new HttpError(400, 'Пустой файл');
  const type = MAGIC.find((m) => m.kind === kind && m.test(buf));
  if (!type) throw new HttpError(415, kind === 'video' ? 'Допустимы видео MP4 и WebM' : 'Допустимы изображения JPG, PNG, WebP и GIF');
  const url = await store.saveFile(buf, type.ext, type.type);
  send(res, 201, { url, size: buf.length, type: type.type });
}

/* ---------- Роутинг ---------- */
// Файлы, на которые больше нет ссылок после сохранения, удаляем из хранилища
const filesOf = (items, keys) => new Set(items.flatMap((i) => keys.map((k) => i[k])).filter(Boolean));
async function cleanup(before, after) {
  for (const f of before) if (!after.has(f) && store.isOwnedUpload(f)) await store.deleteFile(f);
}

async function route(req, res, path, query) {
  const method = req.method;

  // Файлы из приватного Blob (если хранилище создано как Private)
  if (path.startsWith('file/uploads/') && method === 'GET') {
    const file = await store.readFile(path.slice('file/uploads/'.length));
    if (!file) throw new HttpError(404, 'Не найдено');
    res.writeHead(200, { 'Content-Type': file.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    return Readable.fromWeb(file.stream).pipe(res);
  }

  if (path === 'content' && method === 'GET') {
    // Если хранилище временно недоступно, сайт всё равно открывается (на запасных данных из config.js)
    const c = await store.readContent().catch((e) => { console.error('[api] read', e); return {}; });
    return send(res, 200, { news: c.news, team: c.team, hero: c.hero, updatedAt: c.updatedAt }, {
      // браузер всегда перепроверяет, а CDN Vercel держит ответ 15 секунд
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vercel-CDN-Cache-Control': 'max-age=15, stale-while-revalidate=60',
    });
  }

  if (path === 'session' && method === 'GET') {
    return send(res, 200, {
      enabled: auth.enabled(), admin: auth.enabled() && auth.isAdmin(req), storage: store.useBlob() ? 'blob' : (process.env.VERCEL ? 'missing' : 'files'),
      limits: { imageMb: IMAGE_LIMIT / 1048576, videoMb: VIDEO_LIMIT / 1048576 },
    });
  }

  if (path === 'login' && method === 'POST') {
    assertSameOrigin(req);
    if (!auth.enabled()) throw new HttpError(503, 'Админ-панель выключена: не задан ADMIN_PASSWORD (минимум 8 символов)');
    const ip = clientIp(req);
    if (auth.tooManyAttempts(ip)) throw new HttpError(429, 'Слишком много попыток. Подождите 10 минут.');
    const body = await readJson(req);
    if (!auth.checkPassword(body.password)) {
      auth.registerFailure(ip);
      await new Promise((r) => setTimeout(r, 500));                    // замедляем перебор
      throw new HttpError(401, 'Неверный пароль');
    }
    auth.clearFailures(ip);
    return send(res, 200, { ok: true }, { 'Set-Cookie': auth.sessionCookie(req) });
  }

  if (path === 'logout' && method === 'POST') {
    assertSameOrigin(req);
    return send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
  }

  if (path.startsWith('content/') && method === 'PUT') {
    assertSameOrigin(req);
    requireAdmin(req);
    const section = path.slice('content/'.length);
    const body = await readJson(req);
    let before = new Set(), after = new Set();
    const saved = await store.updateContent((c) => {
      if (section === 'news') { before = filesOf(c.news || [], ['image']); c.news = validate.news(body.items); after = filesOf(c.news, ['image']); }
      else if (section === 'team') { before = filesOf(c.team || [], ['photo']); c.team = validate.team(body.items); after = filesOf(c.team, ['photo']); }
      else if (section === 'hero') { before = filesOf(c.hero ? [c.hero] : [], ['src', 'poster']); c.hero = validate.hero(body); after = filesOf([c.hero], ['src', 'poster']); }
      else throw new HttpError(404, 'Раздел не найден');
      return c;
    });
    cleanup(before, after).catch(() => {});
    return send(res, 200, { ok: true, [section]: saved[section], updatedAt: saved.updatedAt });
  }

  if (path === 'diagnostics' && method === 'GET') {
    requireAdmin(req);
    return send(res, 200, await store.diagnose());
  }

  if (path === 'upload' && method === 'POST') {
    assertSameOrigin(req);
    requireAdmin(req);
    return handleUpload(req, res, query);
  }

  throw new HttpError(404, 'Не найдено');
}

async function handle(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    // На Vercel путь приходит и через rewrite (?path=…), и в самом URL
    const path = (url.searchParams.get('path') || url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '');
    const query = new URLSearchParams(url.search);
    query.delete('path');
    await route(req, res, path, query);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    if (err instanceof validate.ValidationError) return send(res, 400, { error: err.message });
    if (err instanceof store.StorageError) return send(res, 503, { error: err.message });
    console.error('[api]', err);
    // Администратору показываем причину (пароль уже проверен), посетителям — нет
    const detail = auth.isAdmin(req) ? ` — ${String(err && err.message || err).slice(0, 200)}` : '';
    send(res, 500, { error: 'Внутренняя ошибка сервера' + detail });
  }
}

module.exports = { handle };
