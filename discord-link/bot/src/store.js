'use strict';
const fs = require('fs');
const path = require('path');

/** Привязки Discord <-> Minecraft в одном JSON-файле. Запись атомарная (tmp + rename). */
class Store {
  constructor(file) {
    this.file = file;
    this.byDiscord = new Map(); // discordId -> { uuid, name, groups[], linkedAt }
    this.byUuid = new Map(); // uuid -> discordId
  }

  load() {
    if (!this.file) return this;
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const [discordId, rec] of Object.entries(data.links || {})) this._put(discordId, rec);
    } catch (e) {
      if (e.code !== 'ENOENT') throw new Error(`Не удалось прочитать ${this.file}: ${e.message}`);
    }
    return this;
  }

  _put(discordId, rec) {
    this.byDiscord.set(discordId, rec);
    this.byUuid.set(rec.uuid, discordId);
  }

  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const links = Object.fromEntries(this.byDiscord);
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ links }, null, 2));
    fs.renameSync(tmp, this.file);
  }

  getByDiscord(discordId) {
    return this.byDiscord.get(discordId) || null;
  }

  getByUuid(uuid) {
    const id = this.byUuid.get(uuid);
    return id ? { discordId: id, ...this.byDiscord.get(id) } : null;
  }

  set(discordId, rec) {
    this._put(discordId, rec);
    this.save();
  }

  remove(discordId) {
    const rec = this.byDiscord.get(discordId);
    if (!rec) return null;
    this.byDiscord.delete(discordId);
    this.byUuid.delete(rec.uuid);
    this.save();
    return rec;
  }
}

module.exports = { Store };
