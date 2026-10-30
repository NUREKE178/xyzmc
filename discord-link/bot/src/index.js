'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const { loadEnv, loadConfig } = require('./config');
const { Store } = require('./store');
const { RoleManager } = require('./roles');
const { LinkService, LinkError } = require('./service');
const { createApi } = require('./api');
const { commands } = require('./commands');

async function main() {
  const env = loadEnv();
  const config = loadConfig(env.configFile);
  const store = new Store(env.dataFile).load();

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  const roles = new RoleManager({ client, guildId: env.guildId, config });
  const service = new LinkService({ store, roles, config });

  client.once('clientReady', async () => {
    console.log(`[bot] вошёл как ${client.user.tag}`);
    const guild = await client.guilds.fetch(env.guildId);
    await guild.commands.set(commands.map((c) => c.data.toJSON()));
    // Применяем сохранённые группы заново (мог измениться config.json или роли вручную)
    for (const [discordId, rec] of store.byDiscord) {
      await roles.apply(discordId, rec.groups, rec.name).catch((e) => console.error('[resync]', e.message));
    }
    console.log(`[bot] привязок: ${store.byDiscord.size}`);
  });

  // Зашёл на сервер позже привязки — вернуть роли
  client.on('guildMemberAdd', (member) => {
    const rec = store.getByDiscord(member.id);
    if (rec) roles.apply(member.id, rec.groups, rec.name).catch(() => {});
  });

  client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    const cmd = commands.find((c) => c.data.name === i.commandName);
    if (!cmd) return;
    try {
      await cmd.run(i, { service, store, config });
    } catch (e) {
      const text = e instanceof LinkError ? e.message : 'Что-то пошло не так, попробуйте позже.';
      if (!(e instanceof LinkError)) console.error('[cmd]', e);
      const payload = { content: text, flags: MessageFlags.Ephemeral };
      if (i.replied || i.deferred) await i.followUp(payload).catch(() => {});
      else await i.reply(payload).catch(() => {});
    }
  });

  createApi({ service, secret: env.secret }).listen(env.port, env.host, () =>
    console.log(`[api] слушаю ${env.host}:${env.port}`)
  );
  await client.login(env.token);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
