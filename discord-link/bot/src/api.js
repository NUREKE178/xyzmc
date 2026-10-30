'use strict';
const http = require('http');
const crypto = require('crypto');
const { LinkError } = require('./service');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new LinkError(413, 'too_large', 'Слишком большой запрос.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new LinkError(400, 'bad_request', 'Неверный JSON.'));
      }
    });
    req.on('error', reject);
  });
}

/** Внутренний HTTP API для плагина. Все запросы — с заголовком Authorization: Bearer <API_SECRET>. */
function createApi({ service, secret }) {
  return http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      const auth = String(req.headers.authorization || '');
      if (!auth.startsWith('Bearer ') || !safeEqual(auth.slice(7), secret)) {
        throw new LinkError(401, 'unauthorized', 'Неверный секрет.');
      }
      const url = new URL(req.url, 'http://x');
      const route = `${req.method} ${url.pathname}`;
      if (route === 'POST /api/link') {
        const b = await readJson(req);
        const ip = typeof b.ip === 'string' ? b.ip.slice(0, 64) : undefined;
        const r = await service.redeem({ code: b.code, uuid: b.uuid, name: b.name, ip });
        return send(200, { ok: true, ...r });
      }
      if (route === 'POST /api/sync') {
        const b = await readJson(req);
        return send(200, { ok: true, ...(await service.sync(b)) });
      }
      if (route === 'POST /api/unlink') {
        const b = await readJson(req);
        await service.unlinkUuid(b.uuid);
        return send(200, { ok: true });
      }
      if (route === 'GET /api/status') {
        return send(200, { ok: true, ...service.status(url.searchParams.get('uuid')) });
      }
      throw new LinkError(404, 'not_found', 'Нет такого маршрута.');
    } catch (e) {
      if (e instanceof LinkError) return send(e.status, { ok: false, error: e.key, message: e.message });
      console.error('[api]', e);
      send(500, { ok: false, error: 'internal', message: 'Внутренняя ошибка.' });
    }
  });
}

module.exports = { createApi };
