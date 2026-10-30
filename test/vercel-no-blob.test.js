'use strict';
// На Vercel без подключённого Blob запись невозможна — админка должна сказать об этом понятно, а не падать с 500
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.VERCEL = '1';
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
delete process.env.BLOB_READ_WRITE_TOKEN; delete process.env.BLOB_STORE_ID;
const { handle } = require('../lib/app');

test('без Blob: понятная ошибка 503 и подсказка в диагностике', async () => {
  const server = http.createServer(handle);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = { 'x-requested-with': 'xyz', 'content-type': 'application/json' };
  const login = await fetch(base + '/api/login', { method: 'POST', headers: h, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const session = await (await fetch(base + '/api/session', { headers: { cookie } })).json();
  assert.equal(session.storage, 'missing');

  const put = await fetch(base + '/api/content/news', { method: 'PUT', headers: { ...h, cookie }, body: JSON.stringify({ items: [] }) });
  assert.equal(put.status, 503);
  assert.match((await put.json()).error, /Blob/);

  const diag = await (await fetch(base + '/api/diagnostics', { headers: { cookie } })).json();
  assert.equal(diag.write.ok, false);
  assert.match(diag.hint, /Connect Project/);
  server.close();
});
