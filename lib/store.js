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

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const blob = () => require('@vercel/blob');           // подключаем лениво — локально пакет не нужен

/* ---------- Контент ---------- */
async function readContent() {
  if (useBlob()) {
    const res = await blob().get(BLOB_CONTENT_KEY, { access: BLOB_ACCESS, useCache: false }).catch(() => null);
    if (!res) return {};
    try { return JSON.parse(await new Response(res.stream).text()); } catch (e) { return {}; }
  }
  try { return JSON.parse(await fs.readFile(CONTENT_FILE, 'utf8')); } catch (e) { return {}; }
}

// Записи сериализуем: два одновременных запроса не затрут друг друга (в пределах одного процесса)
let queue = Promise.resolve();
function updateContent(mutator) {
  const run = queue.then(async () => {
    const next = await mutator(await readContent());
    next.updatedAt = new Date().toISOString();
    const json = JSON.stringify(next, null, 2);
    if (useBlob()) {
      await blob().put(BLOB_CONTENT_KEY, json, {
        access: BLOB_ACCESS, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
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
  const name = crypto.randomBytes(12).toString('hex') + ext;
  if (useBlob()) {
    const res = await blob().put('uploads/' + name, buffer, { access: BLOB_ACCESS, contentType, addRandomSuffix: false });
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
      await blob().del(url);
    }
  } catch (e) { /* файл уже удалён */ }
}

const isOwnedUpload = (url) =>
  typeof url === 'string' && (/^\/uploads\/[a-f0-9]{24}\.[a-z0-9]{2,4}$/i.test(url) || /^https:\/\/[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com\/uploads\//i.test(url));

module.exports = { readContent, updateContent, saveFile, deleteFile, isOwnedUpload, UPLOAD_DIR, DATA_DIR, useBlob };
