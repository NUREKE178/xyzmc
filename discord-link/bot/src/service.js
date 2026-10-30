'use strict';
const crypto = require('crypto');

// Без похожих символов (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NAME_RE = /^[A-Za-z0-9_.*]{1,32}$/;
const GROUP_RE = /^[a-z0-9_.\-:]{1,64}$/;

class LinkError extends Error {
  constructor(status, key, message) {
    super(message);
    this.status = status;
    this.key = key;
  }
}

function makeCode() {
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

function normCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Вся логика привязки. Роли выдаёт roles.apply(discordId, groups, name) / roles.clear(discordId) — их
 * подставляет index.js (в тестах — заглушка).
 */
class LinkService {
  constructor({ store, roles, config, now = Date.now }) {
    this.store = store;
    this.roles = roles;
    this.config = config;
    this.now = now;
    this.pending = new Map(); // code -> { discordId, expires }
    this.fails = new Map(); // ключ (uuid / ip) -> { count, resetAt }
  }

  /** Discord -> /link: выдаёт одноразовый код. */
  createCode(discordId) {
    const linked = this.store.getByDiscord(discordId);
    if (linked) throw new LinkError(409, 'already_linked', `Уже привязан аккаунт **${linked.name}**. Сначала /unlink.`);
    for (const [c, p] of this.pending) if (p.discordId === discordId || p.expires <= this.now()) this.pending.delete(c);
    let code;
    do code = makeCode();
    while (this.pending.has(code));
    this.pending.set(code, { discordId, expires: this.now() + this.config.codeTtlMs });
    return { code, ttlMs: this.config.codeTtlMs };
  }

  _checkFails(key) {
    const f = this.fails.get(key);
    if (f && f.resetAt > this.now() && f.count >= MAX_FAILS) {
      throw new LinkError(429, 'too_many_attempts', 'Слишком много неверных попыток, подождите 10 минут.');
    }
  }

  _fail(key) {
    const f = this.fails.get(key);
    if (f && f.resetAt > this.now()) f.count++;
    else this.fails.set(key, { count: 1, resetAt: this.now() + FAIL_WINDOW_MS });
  }

  /** Игра -> код из чата. */
  async redeem({ code, uuid, name, ip }) {
    uuid = checkUuid(uuid);
    name = checkName(name);
    const keys = [`u:${uuid}`, ip ? `ip:${ip}` : null].filter(Boolean);
    keys.forEach((k) => this._checkFails(k));

    if (this.store.getByUuid(uuid)) throw new LinkError(409, 'already_linked', 'Этот аккаунт уже привязан.');

    const norm = normCode(code);
    const p = this.pending.get(norm);
    if (!p || p.expires <= this.now()) {
      if (p) this.pending.delete(norm);
      keys.forEach((k) => this._fail(k));
      throw new LinkError(404, 'invalid_code', 'Неверный или просроченный код.');
    }
    this.pending.delete(norm);
    if (this.store.getByDiscord(p.discordId)) throw new LinkError(409, 'already_linked', 'Этот Discord уже привязан.');

    this.store.set(p.discordId, { uuid, name, groups: [], linkedAt: new Date(this.now()).toISOString() });
    await this.roles.apply(p.discordId, [], name);
    return { discordId: p.discordId };
  }

  /** Игра -> актуальные группы LuckPerms игрока. Для непривязанных — 404. */
  async sync({ uuid, name, groups }) {
    uuid = checkUuid(uuid);
    const link = this.store.getByUuid(uuid);
    if (!link) throw new LinkError(404, 'not_linked', 'Аккаунт не привязан.');
    if (!Array.isArray(groups)) throw new LinkError(400, 'bad_request', 'groups должен быть массивом.');
    const clean = [...new Set(groups.map((g) => String(g).toLowerCase()).filter((g) => GROUP_RE.test(g)))];
    const rec = this.store.getByDiscord(link.discordId);
    rec.groups = clean;
    if (name && NAME_RE.test(String(name))) rec.name = String(name);
    this.store.set(link.discordId, rec);
    await this.roles.apply(link.discordId, clean, rec.name);
    return { discordId: link.discordId };
  }

  async unlinkDiscord(discordId) {
    const rec = this.store.remove(discordId);
    if (!rec) throw new LinkError(404, 'not_linked', 'Аккаунт не привязан.');
    await this.roles.clear(discordId);
    return rec;
  }

  async unlinkUuid(uuid) {
    const link = this.store.getByUuid(checkUuid(uuid));
    if (!link) throw new LinkError(404, 'not_linked', 'Аккаунт не привязан.');
    return this.unlinkDiscord(link.discordId);
  }

  status(uuid) {
    const link = this.store.getByUuid(checkUuid(uuid));
    return link ? { linked: true, discordId: link.discordId } : { linked: false };
  }
}

function checkUuid(uuid) {
  const u = String(uuid || '').toLowerCase();
  if (!UUID_RE.test(u)) throw new LinkError(400, 'bad_request', 'Неверный uuid.');
  return u;
}

function checkName(name) {
  const n = String(name || '');
  if (!NAME_RE.test(n)) throw new LinkError(400, 'bad_request', 'Неверный ник.');
  return n;
}

module.exports = { LinkService, LinkError, normCode };
