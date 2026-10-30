'use strict';
const fs = require('fs');
const path = require('path');

const ID = /^\d{15,25}$/;

/** Приводит config.json к виду { groups: Map<группа, [roleId]>, linkedRole, ... } и проверяет его. */
function normalizeConfig(raw) {
  const cfg = raw || {};
  const groups = new Map();
  for (const [group, value] of Object.entries(cfg.groups || {})) {
    const ids = (Array.isArray(value) ? value : [value]).map(String).filter((id) => ID.test(id));
    if (ids.length) groups.set(group.toLowerCase(), ids);
  }
  const linkedRole = ID.test(String(cfg.linkedRole || '')) ? String(cfg.linkedRole) : null;
  const ttl = Number(cfg.codeTtlMinutes);
  return {
    groups,
    linkedRole,
    syncNickname: cfg.syncNickname === true,
    codeTtlMs: (Number.isFinite(ttl) && ttl >= 1 && ttl <= 60 ? ttl : 10) * 60 * 1000,
  };
}

function loadConfig(file) {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error(`Не удалось прочитать ${file}: ${e.message}`);
    console.warn(`[config] ${file} не найден — роли выдаваться не будут (скопируйте config.example.json)`);
  }
  return normalizeConfig(raw);
}

function loadEnv() {
  const env = process.env;
  const need = (k) => {
    if (!env[k]) throw new Error(`Не задана переменная окружения ${k} (см. .env.example)`);
    return env[k];
  };
  const secret = need('API_SECRET');
  if (secret.length < 16) throw new Error('API_SECRET должен быть не короче 16 символов');
  return {
    token: need('DISCORD_TOKEN'),
    guildId: need('GUILD_ID'),
    secret,
    port: Number(env.API_PORT) || 8788,
    host: env.API_HOST || '0.0.0.0',
    dataFile: path.resolve(env.DATA_FILE || './data/links.json'),
    configFile: path.resolve(env.CONFIG_FILE || './config.json'),
  };
}

module.exports = { normalizeConfig, loadConfig, loadEnv };
