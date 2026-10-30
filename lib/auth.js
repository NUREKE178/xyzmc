'use strict';
/**
 * Авторизация администратора.
 * Пароль задаётся переменной окружения ADMIN_PASSWORD (по умолчанию пароля нет — админка выключена).
 * Сессия — подписанный HMAC-токен в HttpOnly-cookie; хранить ничего на сервере не нужно.
 */
const crypto = require('node:crypto');

const COOKIE = 'xyz_admin';
const SESSION_MS = 12 * 60 * 60 * 1000;

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest();
const b64 = (buf) => Buffer.from(buf).toString('base64url');

const enabled = () => Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
const secret = () => process.env.SESSION_SECRET || sha256('xyz-session:' + process.env.ADMIN_PASSWORD);

function checkPassword(candidate) {
  if (!enabled() || typeof candidate !== 'string') return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(process.env.ADMIN_PASSWORD));
}

function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = b64(crypto.createHmac('sha256', secret()).update(body).digest());
  return `${body}.${mac}`;
}

function verify(token) {
  if (!enabled() || typeof token !== 'string') return false;
  const [body, mac] = token.split('.');
  if (!body || !mac) return false;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest();
  let given;
  try { given = Buffer.from(mac, 'base64url'); } catch (e) { return false; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
}

const parseCookies = (header = '') =>
  Object.fromEntries(header.split(';').map((p) => p.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]));

const isAdmin = (req) => verify(parseCookies(req.headers.cookie)[COOKIE]);

function sessionCookie(req) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') || req.socket?.encrypted ? '; Secure' : '';
  const token = sign({ exp: Date.now() + SESSION_MS });
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`;
}
const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

/* Ограничение попыток входа (в пределах одного экземпляра) */
const attempts = new Map();
const MAX_ATTEMPTS = 8, WINDOW_MS = 10 * 60 * 1000;
function tooManyAttempts(ip) {
  const now = Date.now(), rec = attempts.get(ip);
  if (!rec || rec.reset < now) return false;
  return rec.count >= MAX_ATTEMPTS;
}
function registerFailure(ip) {
  const now = Date.now(), rec = attempts.get(ip);
  if (!rec || rec.reset < now) attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
  else rec.count += 1;
  if (attempts.size > 5000) attempts.clear();
}
const clearFailures = (ip) => attempts.delete(ip);

module.exports = { enabled, checkPassword, isAdmin, sessionCookie, clearCookie, tooManyAttempts, registerFailure, clearFailures };
