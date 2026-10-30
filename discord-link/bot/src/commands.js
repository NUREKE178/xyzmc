'use strict';
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const eph = (content) => ({ content, flags: MessageFlags.Ephemeral });

// Ответы ephemeral — код видит только тот, кто вызвал команду.
const commands = [
  {
    data: new SlashCommandBuilder().setName('link').setDescription('Привязать Minecraft-аккаунт: получить код для игры'),
    async run(i, { service }) {
      const { code, ttlMs } = service.createCode(i.user.id);
      const min = Math.round(ttlMs / 60000);
      await i.reply(
        eph(
          `Ваш код: **${code}**\n` +
            `Зайдите на сервер, введите команду \`/discord\`, затем отправьте этот код в чат — ` +
            `сообщение никто не увидит. Код действует ${min} мин.`
        )
      );
    },
  },
  {
    data: new SlashCommandBuilder().setName('unlink').setDescription('Отвязать Minecraft-аккаунт и снять донат-роли'),
    async run(i, { service }) {
      const rec = await service.unlinkDiscord(i.user.id);
      await i.reply(eph(`Аккаунт **${rec.name}** отвязан, роли сняты.`));
    },
  },
  {
    data: new SlashCommandBuilder().setName('profile').setDescription('Показать привязанный аккаунт и донат-группы'),
    async run(i, { store }) {
      const rec = store.getByDiscord(i.user.id);
      if (!rec) return i.reply(eph('Аккаунт не привязан. Используйте `/link`.'));
      const groups = rec.groups.length ? rec.groups.join(', ') : 'нет';
      await i.reply(eph(`Ник: **${rec.name}**\nГруппы: ${groups}`));
    },
  },
];

module.exports = { commands };
