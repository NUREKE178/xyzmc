'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { Store } = require('../src/store');
const { LinkService, LinkError } = require('../src/service');
const { normalizeConfig } = require('../src/config');
const { createApi } = require('../src/api');
const { RoleManager } = require('../src/roles');

const UUID = '069a79f4-44e9-4726-a5be-fca90e38aaf5';
const UUID2 = '853c80ef-3c37-49fd-aa49-938b674adae6';
const ROLE_VIP = '111111111111111111';
const ROLE_LINKED = '222222222222222222';

function setup(extra = {}) {
  const calls = [];
  const roles = {
    apply: async (id, groups, name) => calls.push(['apply', id, groups, name]),
    clear: async (id) => calls.push(['clear', id]),
  };
  const config = normalizeConfig({ groups: { VIP: ROLE_VIP }, linkedRole: ROLE_LINKED });
  let t = 1_000_000;
  const clock = { now: () => t, advance: (ms) => (t += ms) };
  const service = new LinkService({ store: new Store(null), roles, config, now: clock.now, ...extra });
  return { service, calls, clock };
}

test('полный цикл: /link -> код в игре -> sync -> unlink', async () => {
  const { service, calls } = setup();
  const { code } = service.createCode('D1');
  assert.match(code, /^[A-Z2-9]{6}$/);
  const r = await service.redeem({ code: code.toLowerCase(), uuid: UUID, name: 'Steve' });
  assert.strictEqual(r.discordId, 'D1');
  await service.sync({ uuid: UUID, name: 'Steve', groups: ['VIP', 'vip', 'bad group!'] });
  assert.deepStrictEqual(calls.at(-1), ['apply', 'D1', ['vip'], 'Steve']);
  await service.unlinkUuid(UUID);
  assert.deepStrictEqual(calls.at(-1), ['clear', 'D1']);
  assert.deepStrictEqual(service.status(UUID), { linked: false });
});

test('код одноразовый, неверный — 404, просроченный — 404', async () => {
  const { service, clock } = setup();
  const { code } = service.createCode('D1');
  await service.redeem({ code, uuid: UUID, name: 'Steve' });
  await assert.rejects(service.redeem({ code, uuid: UUID2, name: 'Alex' }), { key: 'invalid_code' });
  await service.unlinkDiscord('D1');
  const { code: c2, ttlMs } = service.createCode('D1');
  clock.advance(ttlMs + 1);
  await assert.rejects(service.redeem({ code: c2, uuid: UUID, name: 'Steve' }), { key: 'invalid_code' });
});

test('подбор кода блокируется после 5 неудач', async () => {
  const { service } = setup();
  for (let i = 0; i < 5; i++) await assert.rejects(service.redeem({ code: 'AAAAAA', uuid: UUID, name: 'Steve' }), { key: 'invalid_code' });
  await assert.rejects(service.redeem({ code: 'AAAAAA', uuid: UUID, name: 'Steve' }), { key: 'too_many_attempts' });
});

test('один Discord и один ник не привязываются дважды', async () => {
  const { service } = setup();
  const { code } = service.createCode('D1');
  await service.redeem({ code, uuid: UUID, name: 'Steve' });
  assert.throws(() => service.createCode('D1'), { key: 'already_linked' });
  const { code: c2 } = service.createCode('D2');
  await assert.rejects(service.redeem({ code: c2, uuid: UUID, name: 'Steve' }), { key: 'already_linked' });
});

test('sync для непривязанного — 404', async () => {
  const { service } = setup();
  await assert.rejects(service.sync({ uuid: UUID, groups: [] }), { key: 'not_linked' });
  await assert.rejects(service.sync({ uuid: 'x', groups: [] }), (e) => e instanceof LinkError && e.status === 400);
});

test('RoleManager выдаёт и снимает только управляемые роли', async () => {
  const config = normalizeConfig({ groups: { vip: ROLE_VIP }, linkedRole: ROLE_LINKED });
  const OTHER = '999999999999999999';
  const log = [];
  const have = new Map([[ROLE_VIP, {}], [OTHER, {}]]);
  const member = {
    roles: { cache: have, add: async (r) => log.push(['add', r]), remove: async (r) => log.push(['remove', r]) },
    nickname: null,
  };
  const client = { guilds: { fetch: async () => ({ members: { fetch: async () => member } }) } };
  const rm = new RoleManager({ client, guildId: 'G', config });
  await rm.apply('D1', []); // донат закончился
  assert.deepStrictEqual(log, [['add', [ROLE_LINKED]], ['remove', [ROLE_VIP]]]); // OTHER не тронут
});

test('HTTP API: авторизация и маршруты', async () => {
  const { service } = setup();
  const server = createApi({ service, secret: 'super-secret-value-123' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const call = (method, path, body, token = 'super-secret-value-123') =>
    new Promise((resolve, reject) => {
      const req = http.request(
        { port, method, path, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
        }
      );
      req.on('error', reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  try {
    assert.strictEqual((await call('GET', `/api/status?uuid=${UUID}`, null, 'wrong')).status, 401);
    const { code } = service.createCode('D1');
    const ok = await call('POST', '/api/link', { code, uuid: UUID, name: 'Steve' });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual((await call('GET', `/api/status?uuid=${UUID}`)).body.linked, true);
    assert.strictEqual((await call('POST', '/api/sync', { uuid: UUID, name: 'Steve', groups: ['vip'] })).status, 200);
    assert.strictEqual((await call('POST', '/api/link', { code: 'ZZZZZZ', uuid: UUID2, name: 'Alex' })).status, 404);
    assert.strictEqual((await call('POST', '/api/unlink', { uuid: UUID })).status, 200);
    assert.strictEqual((await call('GET', '/api/nope')).status, 404);
  } finally {
    server.close();
  }
});
