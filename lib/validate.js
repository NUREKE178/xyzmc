'use strict';
/**
 * Проверка и очистка данных из админ-панели. Всё, что приходит от клиента, считается недоверенным:
 * строки обрезаются, URL ограничены безопасными схемами, неизвестные поля отбрасываются.
 */
const crypto = require('node:crypto');

class ValidationError extends Error {}

const LIMITS = { news: 300, team: 60, title: 140, text: 20000, name: 60, role: 60, nick: 16 };

const str = (v, max, { min = 0, field = 'поле' } = {}) => {
  const s = typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim() : '';
  if (s.length < min) throw new ValidationError(`Заполните: ${field}`);
  if (s.length > max) throw new ValidationError(`Слишком длинное значение: ${field} (максимум ${max} символов)`);
  return s;
};

// Разрешаем только свои загрузки (/uploads/…) и https-ссылки. Никаких javascript:, data: и т. п.
const url = (v, { allowEmpty = true, field = 'ссылка' } = {}) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) { if (allowEmpty) return ''; throw new ValidationError(`Укажите: ${field}`); }
  if (s.length > 600) throw new ValidationError(`Слишком длинная ссылка: ${field}`);
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(s) || /^\/api\/file\/uploads\/[A-Za-z0-9._-]+$/.test(s)) return s;
  // файлы самого сайта (запасные картинки из config.js)
  if (/^assets\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(s) && !s.includes('..')) return s;
  let u;
  try { u = new URL(s); } catch (e) { throw new ValidationError(`Некорректная ссылка: ${field}`); }
  if (u.protocol !== 'https:') throw new ValidationError(`Ссылка должна начинаться с https://: ${field}`);
  return u.href;
};

const id = (v) => (typeof v === 'string' && /^[a-z0-9-]{3,40}$/i.test(v) ? v : crypto.randomUUID());

const date = (v) => {
  const s = typeof v === 'string' ? v.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new ValidationError('Укажите корректную дату');
  return s;
};

function news(list) {
  if (!Array.isArray(list)) throw new ValidationError('Ожидается список новостей');
  if (list.length > LIMITS.news) throw new ValidationError('Слишком много новостей');
  const seen = new Set();
  return list.map((n) => {
    const out = {
      id: id(n && n.id),
      title: str(n && n.title, LIMITS.title, { min: 1, field: 'заголовок' }),
      text: str(n && n.text, LIMITS.text, { min: 1, field: 'текст новости' }),
      image: url(n && n.image, { field: 'картинка' }),
      date: date(n && n.date),
      createdAt: typeof (n && n.createdAt) === 'string' ? n.createdAt.slice(0, 30) : new Date().toISOString(),
    };
    if (seen.has(out.id)) out.id = crypto.randomUUID();
    seen.add(out.id);
    return out;
  });
}

function team(list) {
  if (!Array.isArray(list)) throw new ValidationError('Ожидается список команды');
  if (list.length > LIMITS.team) throw new ValidationError('Слишком много участников');
  return list.map((m) => {
    const nick = str(m && m.nick, LIMITS.nick, { field: 'ник' });
    if (nick && !/^[A-Za-z0-9_]+$/.test(nick)) throw new ValidationError('Ник: только латиница, цифры и _');
    return {
      id: id(m && m.id),
      name: str(m && m.name, LIMITS.name, { min: 1, field: 'имя' }),
      role: str(m && m.role, LIMITS.role, { field: 'роль' }),
      nick,
      photo: url(m && m.photo, { field: 'фото' }),
      highlight: Boolean(m && m.highlight),
    };
  });
}

function hero(h) {
  const type = h && ['default', 'image', 'video'].includes(h.type) ? h.type : 'default';
  const out = { type, src: '', poster: '' };
  if (type !== 'default') out.src = url(h.src, { allowEmpty: false, field: type === 'video' ? 'видео' : 'картинка' });
  if (type === 'video') out.poster = url(h.poster, { field: 'постер' });
  return out;
}

// Картинки блоков («Магазин», «Соцсети»): { shop: { image }, social: { image } }. Пустое значение = стандартная картинка.
function banners(map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new ValidationError('Ожидается список блоков');
  const out = {};
  for (const [key, value] of Object.entries(map).slice(0, 20)) {
    if (!/^[a-z0-9-]{1,24}$/i.test(key)) throw new ValidationError('Некорректное название блока');
    const image = url(value && value.image, { field: 'картинка' });
    if (image) out[key] = { image };
  }
  return out;
}

module.exports = { ValidationError, news, team, hero, banners, LIMITS };
