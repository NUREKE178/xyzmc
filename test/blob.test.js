'use strict';
// Логика адаптера Vercel Blob проверяется на имитации SDK (настоящий токен в тестах не нужен)
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
const calls = { put: [], del: [] };
const files = new Map();
const fake = {
  put: async (key, body, opts) => { calls.put.push({ key, opts }); files.set(key, Buffer.from(body)); return { url: `https://abc.public.blob.vercel-storage.com/${key}` }; },
  get: async (key) => (files.has(key) ? { stream: new Blob([files.get(key)]).stream() } : null),
  del: async (url) => { calls.del.push(url); },
};
require.cache[require.resolve('@vercel/blob')] = { id: 'x', filename: 'x', loaded: true, exports: fake };
const store = require('../lib/store');

test('контент пишется в Blob с перезаписью и читается без кэша', async () => {
  assert.deepEqual(await store.readContent(), {});
  await store.updateContent((c) => ({ ...c, news: [{ id: 'n1' }] }));
  const put = calls.put[0];
  assert.equal(put.key, 'content/site.json');
  assert.equal(put.opts.allowOverwrite, true);
  assert.equal(put.opts.addRandomSuffix, false);
  assert.equal(put.opts.access, 'public');
  assert.deepEqual((await store.readContent()).news, [{ id: 'n1' }]);
});

test('файлы загружаются в uploads/ и удаляются только свои', async () => {
  const url = await store.saveFile(Buffer.from('x'), '.png', 'image/png');
  assert.match(url, /^https:\/\/abc\.public\.blob\.vercel-storage\.com\/uploads\/[a-f0-9]{24}\.png$/);
  assert.ok(store.isOwnedUpload(url));
  assert.ok(!store.isOwnedUpload('https://evil.example/uploads/a.png'));
  await store.deleteFile(url);
  await store.deleteFile('https://evil.example/a.png');
  assert.deepEqual(calls.del, [url]);
});
