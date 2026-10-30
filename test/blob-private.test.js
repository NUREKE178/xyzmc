'use strict';
// Blob-хранилище, созданное как Private: сервер сам переключается и отдаёт файлы через /api/file/…
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
const files = new Map(); const seen = [];
const PRIVATE_ERR = () => new Error('Vercel Blob: Cannot use public access on a private store');
const fake = {
  put: async (key, body, o) => { seen.push(['put', o.access]); if (o.access === 'public') throw PRIVATE_ERR(); files.set(key, { body: Buffer.from(body), type: o.contentType }); return { url: `https://x.private.blob.vercel-storage.com/${key}` }; },
  get: async (key, o) => { seen.push(['get', o.access]); if (o.access === 'public') throw PRIVATE_ERR(); const f = files.get(key); return f ? { stream: new Blob([f.body]).stream(), blob: { contentType: f.type, size: f.body.length } } : null; },
  del: async (k) => { files.delete(k); },
};
require.cache[require.resolve('@vercel/blob')] = { id: 'x', filename: 'x', loaded: true, exports: fake };
const { handle } = require('../lib/app');

test('Private-хранилище: автопереключение, загрузка и отдача файла через API', async () => {
  const server = http.createServer(handle);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = { 'x-requested-with': 'xyz' };
  const login = await fetch(base + '/api/login', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 7)]);
  const up = await fetch(base + '/api/upload?kind=image', { method: 'POST', headers: { ...h, cookie }, body: png });
  assert.equal(up.status, 201);
  const { url } = await up.json();
  assert.match(url, /^\/api\/file\/uploads\/[a-f0-9]{24}\.png$/);

  const put = await fetch(base + '/api/content/news', { method: 'PUT', headers: { ...h, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ title: 'Т', text: 'x', date: '2026-10-01', image: url }] }) });
  assert.equal(put.status, 200);
  assert.ok(seen.some(([, a]) => a === 'private'), 'после ошибки используется private');

  const pub = await (await fetch(base + '/api/content')).json();
  assert.equal(pub.news[0].image, url);

  const file = await fetch(base + url);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.equal((await file.arrayBuffer()).byteLength, png.length);
  assert.equal((await fetch(base + '/api/file/uploads/../../etc/passwd')).status, 404);
  assert.equal((await fetch(base + '/api/file/uploads/ffffffffffffffffffffffff.png')).status, 404);
  server.close();
});
