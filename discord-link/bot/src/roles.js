'use strict';

/**
 * Выдаёт и снимает роли на Discord-сервере по группам LuckPerms.
 * Управляемые роли — только те, что перечислены в config.groups (и linkedRole); остальные роли
 * участника бот не трогает.
 */
class RoleManager {
  constructor({ client, guildId, config }) {
    this.client = client;
    this.guildId = guildId;
    this.config = config;
  }

  desired(groups) {
    const ids = new Set();
    for (const g of groups) for (const id of this.config.groups.get(g) || []) ids.add(id);
    if (this.config.linkedRole) ids.add(this.config.linkedRole);
    return ids;
  }

  managed() {
    const ids = new Set();
    for (const list of this.config.groups.values()) list.forEach((id) => ids.add(id));
    if (this.config.linkedRole) ids.add(this.config.linkedRole);
    return ids;
  }

  async _member(discordId) {
    const guild = await this.client.guilds.fetch(this.guildId);
    return guild.members.fetch(discordId).catch((e) => {
      if (e.code === 10007 || e.code === 10013) return null; // нет на сервере
      throw e;
    });
  }

  async _set(discordId, want, name) {
    const member = await this._member(discordId);
    if (!member) return;
    const have = member.roles.cache;
    const add = [...want].filter((id) => !have.has(id));
    const remove = [...this.managed()].filter((id) => !want.has(id) && have.has(id));
    try {
      if (add.length) await member.roles.add(add, 'XYZ: синхронизация с LuckPerms');
      if (remove.length) await member.roles.remove(remove, 'XYZ: синхронизация с LuckPerms');
      if (name && this.config.syncNickname && member.nickname !== name) await member.setNickname(name, 'XYZ: ник в игре');
    } catch (e) {
      console.error(`[roles] ${discordId}: ${e.message} (роль бота должна быть выше выдаваемых ролей, нужно право Manage Roles)`);
    }
  }

  apply(discordId, groups, name) {
    return this._set(discordId, this.desired(groups), name);
  }

  clear(discordId) {
    return this._set(discordId, new Set());
  }
}

module.exports = { RoleManager };
