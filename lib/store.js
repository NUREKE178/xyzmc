'use strict';
/**
 * Хранилище контента и загруженных файлов.
 *
 * Два режима (выбираются автоматически):
 *  - Vercel Blob — если есть доступ к Blob (продакшен на Vercel);
 *  - файловая система (папка data/) — локально и на обычном VPS.
 *
 * Blob-хранилище в Vercel бывает Public и Private. Тип определяется сам: если сервер получает
 * ошибку «не тот тип», он переключается на другой и запоминает. В Private-режиме картинки отдаются
 * через /api/file/…, в Public — напрямую по ссылке Blob.
 *
 * Контент — один JSON-документ: { news, team, hero, updatedAt }.
 * Отсутствие ключа означает «раздел ещё не редактировали» — сайт использует значения из config.js.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const BLOB_CONTENT_KEY = 'content/site.json';
let ACCESS = process.env.BLOB_ACCESS === 'private' ? 'private' : 'public';

/**
 * Откуда берём доступ к Vercel Blob:
 *  - BLOB_READ_WRITE_TOKEN (стандартное имя);
 *  - <ПРЕФИКС>_READ_WRITE_TOKEN — если при подключении хранилища задали свой префикс;
 *  - BLOB_STORE_ID — вход через OIDC (SDK возьмёт токен Vercel сам).
 */
function blobAuth() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return { source: 'BLOB_READ_WRITE_TOKEN' };
  const custom = Object.keys(process.env).find((k) => /_READ_WRITE_TOKEN$/.test(k) && process.env[k]);
  if (custom) return { source: custom, token: process.env[custom] };
  if (process.env.BLOB_STORE_ID) return { source: 'BLOB_STORE_ID (OIDC)' };
  return null;
}
const useBlob = () => Boolean(blobAuth());
const onVercel = () => Boolean(process.env.VERCEL);
const blob = () => require('@vercel/blob');           // подключаем лениво — локально пакет не нужен
const blobOpts = () => ({ ...(blobAuth()?.token ? { token: blobAuth().token } : {}) });

// На Vercel файловая система только для чтения: без подключённого Blob сохранять некуда
class StorageError extends Error {}
function assertWritable() {
  if (onVercel() && !useBlob()) {
    throw new StorageError('Хранилище не подключено. В Vercel откройте Storage → Blob → Connect Project, затем сделайте Redeploy.');
  }
}

// «Файла нет» — не ошибка: SDK возвращает null или бросает BlobNotFoundError (зависит от версии)
const missing = (e) => Promise.resolve(e && (e.name === 'BlobNotFoundError' || /not.?found|404|does not exist/i.test(String(e.message || ''))) ? null : Promise.reject(e));

// Выполняет операцию с текущим типом доступа (public/private). Если она падает, один раз пробует другой тип:
// так сервер работает с любым Blob-хранилищем и не зависит от текста ошибки SDK. Если BLOB_ACCESS задан явно — не переключаемся.
async function withAccess(fn) {
  try { return await fn(ACCESS); } catch (e) {
    if (process.env.BLOB_ACCESS) throw e;
    const other = ACCESS === 'public' ? 'private' : 'public';
    try { const result = await fn(other); ACCESS = other; return result; } catch (e2) { throw e; }
  }
}

/* ---------- Контент ---------- */
async function readContent() {
  if (useBlob()) {
    // get() возвращает null, если файла ещё нет; любая другая ошибка — наружу (иначе можно затереть данные)
    const res = await withAccess((access) => blob().get(BLOB_CONTENT_KEY, { access, useCache: false, ...blobOpts() }).catch(missing));
    if (!res || !res.stream) return {};
    try { return JSON.parse(await new Response(res.stream).text()); } catch (e) { return {}; }
  }
  try { return JSON.parse(await fs.readFile(CONTENT_FILE, 'utf8')); } catch (e) { return {}; }
}

// Записи сериализуем: два одновременных запроса не затрут друг друга (в пределах одного процесса)
let queue = Promise.resolve();
function updateContent(mutator) {
  const run = queue.then(async () => {
    assertWritable();
    const next = await mutator(await readContent());
    next.updatedAt = new Date().toISOString();
    const json = JSON.stringify(next, null, 2);
    if (useBlob()) {
      await withAccess((access) => blob().put(BLOB_CONTENT_KEY, json, {
        access, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60, ...blobOpts(),
      }));
    } else {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = CONTENT_FILE + '.' + process.pid + '.tmp';
      await fs.writeFile(tmp, json);
      await fs.rename(tmp, CONTENT_FILE);
    }
    return next;
  });
  queue = run.catch(() => {});
  return run;
}

/* ---------- Файлы ---------- */
async function saveFile(buffer, ext, contentType) {
  assertWritable();
  const name = crypto.randomBytes(12).toString('hex') + ext;
  if (useBlob()) {
    const res = await withAccess((access) => blob().put('uploads/' + name, buffer, { access, contentType, addRandomSuffix: false, ...blobOpts() }));
    return ACCESS === 'private' ? '/api/file/uploads/' + name : res.url;     // приватные файлы отдаём через наш маршрут
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return '/uploads/' + name;
}

// Отдача приватного файла: { stream, contentType } или null
async function readFile(name) {
  if (!/^[a-f0-9]{24}\.[a-z0-9]{2,4}$/i.test(name) || !useBlob()) return null;
  const res = await withAccess((access) => blob().get('uploads/' + name, { access, ...blobOpts() }).catch(missing));
  return res && res.stream ? { stream: res.stream, contentType: res.blob.contentType, size: res.blob.size } : null;
}

// Удаляем только то, что загрузили сами; ошибки не критичны
async function deleteFile(url) {
  if (!url || typeof url !== 'string') return;
  try {
    if (url.startsWith('/uploads/') && !useBlob()) {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(url)));
    } else if (url.startsWith('/api/file/uploads/') && useBlob()) {
      await blob().del('uploads/' + path.basename(url), blobOpts());
    } else if (/^https:\/\/[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com\//i.test(url) && useBlob()) {
      await blob().del(url, blobOpts());
    }
  } catch (e) { /* файл уже удалён */ }
}

/* Проверка хранилища для админки: пишем, читаем и удаляем тестовый файл */
async function diagnose() {
  const auth = blobAuth();
  const out = { mode: useBlob() ? 'vercel-blob' : 'filesystem', vercel: onVercel(), credentials: auth ? auth.source : null, access: null, write: null, read: null, hint: '' };
  const fail = (e) => ({ ok: false, error: String((e && e.message) || e).slice(0, 300) });
  try {
    assertWritable();
    if (useBlob()) {
      await withAccess((access) => blob().put('diagnostics/ping.txt', 'ok', { access, contentType: 'text/plain', addRandomSuffix: false, allowOverwrite: true, ...blobOpts() }));
      out.access = ACCESS;
      out.write = { ok: true };
      const got = await withAccess((access) => blob().get('diagnostics/ping.txt', { access, useCache: false, ...blobOpts() }));
      out.read = got ? { ok: true } : { ok: false, error: 'Файл записан, но не читается' };
      await blob().del('diagnostics/ping.txt', blobOpts()).catch(() => {});
    } else {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const f = path.join(DATA_DIR, 'ping.tmp');
      await fs.writeFile(f, 'ok'); out.write = { ok: true };
      out.read = { ok: (await fs.readFile(f, 'utf8')) === 'ok' }; await fs.unlink(f);
    }
  } catch (e) {
    if (!out.write) out.write = fail(e); else out.read = fail(e);
  }
  const err = `${out.write?.error || ''} ${out.read?.error || ''}`.toLowerCase();
  if (out.vercel && !out.credentials) out.hint = 'Blob не подключён к этому деплою: в Vercel откройте Storage → ваш Blob → Connect Project (отметьте Production и Preview), затем Redeploy.';
  else if (/token|credential|unauthor|forbidden|no blob/.test(err)) out.hint = 'Доступ к Blob не принят. Отключите хранилище от проекта, подключите заново и сделайте Redeploy.';
  return out;
}

const isOwnedUpload = (url) =>
  typeof url === 'string' && (/^\/uploads\/[a-f0-9]{24}\.[a-z0-9]{2,4}$/i.test(url) || /^\/api\/file\/uploads\/[a-f0-9]{24}\.[a-z0-9]{2,4}$/i.test(url)
    || /^https:\/\/[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com\/uploads\//i.test(url));

module.exports = { readContent, updateContent, saveFile, readFile, deleteFile, isOwnedUpload, diagnose, StorageError, UPLOAD_DIR, DATA_DIR, useBlob };
