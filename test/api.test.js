'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

// Окружение задаём до загрузки модулей
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'xyz-test-'));
process.env.ADMIN_PASSWORD = 'correct-horse-battery';
delete process.env.BLOB_READ_WRITE_TOKEN;
const { handle } = require('../lib/app');

let server, base, cookie = '';
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

test.before(async () => {
  server = http.createServer(handle);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = (p, { method = 'GET', body, headers = {}, raw } = {}) =>
  fetch(base + p, {
    method,
    headers: { 'x-requested-with': 'xyz', ...(cookie ? { cookie } : {}), ...(body && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
    body: raw || (body ? JSON.stringify(body) : undefined),
  });

test('публичный контент доступен без входа', async () => {
  const r = await call('/api/content');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(await r.json()).sort(), []);               // пока ничего не сохраняли
});

test('изменения без входа запрещены', async () => {
  for (const [m, p] of [['PUT', '/api/content/news'], ['PUT', '/api/content/team'], ['PUT', '/api/content/hero'], ['POST', '/api/upload']]) {
    const r = await call(p, { method: m, body: { items: [] } });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});

test('неверный пароль отклоняется, верный выдаёт HttpOnly-cookie', async () => {
  const bad = await call('/api/login', { method: 'POST', body: { password: 'nope-nope-nope' } });
  assert.equal(bad.status, 401);
  const ok = await call('/api/login', { method: 'POST', body: { password: process.env.ADMIN_PASSWORD } });
  assert.equal(ok.status, 200);
  const set = ok.headers.get('set-cookie');
  assert.match(set, /HttpOnly/);
  assert.match(set, /SameSite=Strict/);
  cookie = set.split(';')[0];
  const s = await (await call('/api/session')).json();
  assert.equal(s.admin, true);
});

test('подделанная cookie не проходит', async () => {
  const r = await fetch(base + '/api/content/news', {
    method: 'PUT', headers: { 'x-requested-with': 'xyz', 'content-type': 'application/json', cookie: 'xyz_admin=eyJleHAiOjk5OTk5OTk5OTk5OTl9.AAAA' }, body: '{"items":[]}',
  });
  assert.equal(r.status, 401);
});

test('CSRF: чужой Origin и отсутствие заголовка блокируются', async () => {
  const foreign = await call('/api/content/news', { method: 'PUT', body: { items: [] }, headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.status, 403);
  const noHeader = await fetch(base + '/api/content/news', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: '{"items":[]}' });
  assert.equal(noHeader.status, 403);
});

test('новости: сохранение, очистка и валидация', async () => {
  const items = [
    { title: '  Первая новость ', text: 'Абзац 1\n\nАбзац 2', date: '2026-10-01', image: '' },
    { title: 'Вторая', text: 'Текст', date: '2026-10-05', image: '/uploads/aaaaaaaaaaaaaaaaaaaaaaaa.png' },
    { title: 'Из config.js', text: 'Текст', date: '2026-10-06', image: 'assets/news-1.jpg' },
  ];
  const r = await call('/api/content/news', { method: 'PUT', body: { items } });
  assert.equal(r.status, 200);
  const saved = (await r.json()).news;
  assert.equal(saved[0].title, 'Первая новость');
  assert.ok(saved[0].id && saved[1].id);
  const pub = await (await call('/api/content')).json();
  assert.equal(pub.news.length, 3);

  for (const bad of [
    [{ title: '', text: 'x', date: '2026-10-01' }],
    [{ title: 'x', text: 'x', date: 'вчера' }],
    [{ title: 'x', text: 'x', date: '2026-10-01', image: 'javascript:alert(1)' }],
    [{ title: 'x', text: 'x', date: '2026-10-01', image: 'http://insecure.example/a.png' }],
    [{ title: 'x', text: 'x', date: '2026-10-01', image: 'assets/../../etc/passwd' }],
    [{ title: 'x', text: 'y'.repeat(20001), date: '2026-10-01' }],
  ]) {
    const e = await call('/api/content/news', { method: 'PUT', body: { items: bad } });
    assert.equal(e.status, 400, JSON.stringify(bad).slice(0, 60));
  }
});

test('команда и фон: сохранение и валидация', async () => {
  const t = await call('/api/content/team', { method: 'PUT', body: { items: [{ name: 'ARDI', role: 'Владелец', nick: 'ArdiGOI', highlight: true }] } });
  assert.equal(t.status, 200);
  const badNick = await call('/api/content/team', { method: 'PUT', body: { items: [{ name: 'X', nick: 'не<латиница>' }] } });
  assert.equal(badNick.status, 400);
  const h = await call('/api/content/hero', { method: 'PUT', body: { type: 'video', src: 'https://cdn.example.com/bg.mp4' } });
  assert.equal(h.status, 200);
  const hBad = await call('/api/content/hero', { method: 'PUT', body: { type: 'image', src: '' } });
  assert.equal(hBad.status, 400);
});

test('загрузка: принимает PNG, отклоняет чужие типы и подмену расширения', async () => {
  const ok = await call('/api/upload?kind=image', { method: 'POST', raw: PNG, headers: { 'content-type': 'application/octet-stream' } });
  assert.equal(ok.status, 201);
  const { url } = await ok.json();
  assert.match(url, /^\/uploads\/[a-f0-9]{24}\.png$/);
  assert.ok(fs.existsSync(path.join(process.env.DATA_DIR, 'uploads', path.basename(url))));

  const html = await call('/api/upload?kind=image', { method: 'POST', raw: Buffer.from('<script>alert(1)</script>'), headers: { 'content-type': 'image/png' } });
  assert.equal(html.status, 415);
  const asVideo = await call('/api/upload?kind=video', { method: 'POST', raw: PNG, headers: { 'content-type': 'video/mp4' } });
  assert.equal(asVideo.status, 415);
  const huge = await call('/api/upload?kind=image', { method: 'POST', raw: Buffer.alloc(5 * 1024 * 1024, 1) });
  assert.equal(huge.status, 413);
});

test('удалённые из новостей картинки удаляются из хранилища', async () => {
  const up = await (await call('/api/upload?kind=image', { method: 'POST', raw: PNG })).json();
  const file = path.join(process.env.DATA_DIR, 'uploads', path.basename(up.url));
  await call('/api/content/news', { method: 'PUT', body: { items: [{ title: 'С картинкой', text: 'x', date: '2026-10-01', image: up.url }] } });
  assert.ok(fs.existsSync(file));
  await call('/api/content/news', { method: 'PUT', body: { items: [] } });
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(!fs.existsSync(file));
});

test('выход сбрасывает сессию; блокировка после серии неверных паролей', async () => {
  const out = await call('/api/logout', { method: 'POST' });
  assert.match(out.headers.get('set-cookie'), /Max-Age=0/);
  cookie = '';
  let last;
  for (let i = 0; i < 9; i++) last = await call('/api/login', { method: 'POST', body: { password: 'wrong-wrong-' + i }, headers: { 'x-forwarded-for': '203.0.113.9' } });
  assert.equal(last.status, 429);
});

test('сервер не трогает req.body (на Vercel он читает тело с лимитом 1 МБ)', async () => {
  const guarded = http.createServer((req, res) => {
    Object.defineProperty(req, 'body', { get() { throw new Error('req.body must not be accessed'); } });
    handle(req, res);
  });
  await new Promise((r) => guarded.listen(0, r));
  const b = `http://127.0.0.1:${guarded.address().port}`;
  const login = await fetch(b + '/api/login', { method: 'POST', headers: { 'x-requested-with': 'xyz', 'content-type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
  assert.equal(login.status, 200);
  const ck = login.headers.get('set-cookie').split(';')[0];
  const big = Buffer.concat([PNG, Buffer.alloc(1.5 * 1024 * 1024)]);                      // больше 1 МБ
  const up = await fetch(b + '/api/upload?kind=image', { method: 'POST', headers: { 'x-requested-with': 'xyz', cookie: ck, 'content-type': 'image/png' }, body: big });
  assert.equal(up.status, 201);
  const put = await fetch(b + '/api/content/team', { method: 'PUT', headers: { 'x-requested-with': 'xyz', cookie: ck, 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ name: 'A', role: 'B' }] }) });
  assert.equal(put.status, 200);
  const diag = await fetch(b + '/api/diagnostics', { headers: { cookie: ck } });
  const d = await diag.json();
  assert.equal(d.mode, 'filesystem');
  assert.equal(d.write.ok, true);
  assert.equal(d.read.ok, true);
  guarded.close();
});

test('картинки блоков «Магазин»/«Соцсети»: сохранение, валидация, очистка файлов', async () => {
  // логин после предыдущего теста «выход» (cookie сброшена)
  const login = await call('/api/login', { method: 'POST', body: { password: process.env.ADMIN_PASSWORD }, headers: { 'x-forwarded-for': '198.51.100.7' } });
  cookie = login.headers.get('set-cookie').split(';')[0];
  const up = await (await call('/api/upload?kind=image', { method: 'POST', raw: PNG })).json();
  const file = path.join(process.env.DATA_DIR, 'uploads', path.basename(up.url));

  const ok = await call('/api/content/banners', { method: 'PUT', body: { items: { shop: { image: up.url }, social: { image: '' } } } });
  assert.equal(ok.status, 200);
  const pub = await (await call('/api/content')).json();
  assert.deepEqual(pub.banners, { shop: { image: up.url } });                     // пустое значение = стандартная картинка
  assert.ok(fs.existsSync(file));

  for (const bad of [{ shop: { image: 'javascript:alert(1)' } }, { 'не латиница': { image: '' } }, [], null]) {
    const e = await call('/api/content/banners', { method: 'PUT', body: { items: bad } });
    assert.equal(e.status, 400, JSON.stringify(bad));
  }
  const anon = await fetch(base + '/api/content/banners', { method: 'PUT', headers: { 'x-requested-with': 'xyz', 'content-type': 'application/json' }, body: '{"items":{}}' });
  assert.equal(anon.status, 401);

  await call('/api/content/banners', { method: 'PUT', body: { items: {} } });      // вернули стандартные — загруженный файл удаляется
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(!fs.existsSync(file));
});
