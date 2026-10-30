'use strict';
/**
 * Хранилище контента и загруженных файлов.
 *
 * Два режима (выбираются автоматически):
 *  - Vercel Blob — если задан BLOB_READ_WRITE_TOKEN (продакшен на Vercel);
 *  - файловая система (папка data/) — локально и на обычном VPS.
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
const BLOB_ACCESS = process.env.BLOB_ACCESS || 'public';

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

/* ---------- Контент ---------- */
async function readContent() {
  if (useBlob()) {
    const res = await blob().get(BLOB_CONTENT_KEY, { access: BLOB_ACCESS, useCache: false, ...blobOpts() }).catch(() => null);
    if (!res) return {};
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
      await blob().put(BLOB_CONTENT_KEY, json, {
        access: BLOB_ACCESS, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60, ...blobOpts(),
      });
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
    const res = await blob().put('uploads/' + name, buffer, { access: BLOB_ACCESS, contentType, addRandomSuffix: false, ...blobOpts() });
    return res.url;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return '/uploads/' + name;
}

// Удаляем только то, что загрузили сами; ошибки не критичны
async function deleteFile(url) {
  if (!url || typeof url !== 'string') return;
  try {
    if (url.startsWith('/uploads/') && !useBlob()) {
      const file = path.join(UPLOAD_DIR, path.basename(url));
      await fs.unlink(file);
    } else if (/^https:\/\/[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com\//i.test(url) && useBlob()) {
      await blob().del(url, blobOpts());
    }
  } catch (e) { /* файл уже удалён */ }
}

/* Проверка хранилища для админки: пишем, читаем и удаляем тестовый файл */
async function diagnose() {
  const auth = blobAuth();
  const out = { mode: useBlob() ? 'vercel-blob' : 'filesystem', vercel: onVercel(), credentials: auth ? auth.source : null, access: BLOB_ACCESS, write: null, read: null, hint: '' };
  const fail = (e) => ({ ok: false, error: String(e && e.message || e).slice(0, 300) });
  try {
    assertWritable();
    if (useBlob()) {
      const put = await blob().put('diagnostics/ping.txt', 'ok', { access: BLOB_ACCESS, contentType: 'text/plain', addRandomSuffix: false, allowOverwrite: true, ...blobOpts() });
      out.write = { ok: true };
      const got = await blob().get('diagnostics/ping.txt', { access: BLOB_ACCESS, useCache: false, ...blobOpts() });
      out.read = got ? { ok: true } : { ok: false, error: 'Файл записан, но не читается' };
      await blob().del(put.url, blobOpts()).catch(() => {});
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
  if (out.vercel && !out.credentials) out.hint = 'Вариант Blob не подключён к этому деплою: в Vercel откройте Storage → ваш Blob → Connect Project (отметьте Production и Preview), затем Redeploy.';
  else if (/private|public/.test(err) && /access|store/.test(err)) out.hint = 'Тип доступа хранилища не совпадает. Нужен Blob со значением Public. Либо создайте новое хранилище Public, либо задайте переменную BLOB_ACCESS=private.';
  else if (/token|credential|unauthor|forbidden/.test(err)) out.hint = 'Токен недействителен. Отключите и снова подключите Blob к проекту, затем Redeploy.';
  return out;
}

const isOwnedUpload = (url) =>
  typeof url === 'string' && (/^\/uploads\/[a-f0-9]{24}\.[a-z0-9]{2,4}$/i.test(url) || /^https:\/\/[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com\/uploads\//i.test(url));

module.exports = { readContent, updateContent, saveFile, deleteFile, isOwnedUpload, diagnose, StorageError, UPLOAD_DIR, DATA_DIR, useBlob };
