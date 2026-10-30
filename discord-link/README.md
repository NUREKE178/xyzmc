# XYZ Discord Link

Папка состоит из двух частей:

| Папка | Что это |
|---|---|
| `bot/` | Discord-бот (Node.js, discord.js) + внутренний HTTP API для плагина |
| `plugin/` | Плагин Paper 1.21+ (Java 21): команда `/discord`, перехват кода в чате, отправка групп LuckPerms |

## Как это работает

1. В Discord игрок пишет `/link` → бот присылает **код, который видит только он** (ephemeral-ответ).
2. В игре игрок пишет `/discord`, затем **отправляет код в чат**. Плагин перехватывает это сообщение,
   отменяет его и убирает у всех получателей — код никто не видит и в общий чат он не попадает.
3. Плагин отправляет код боту, бот привязывает UUID к Discord-аккаунту.
4. Плагин через **LuckPerms API** отправляет боту группы игрока — при входе, при любой выдаче/снятии
   группы (в т.ч. `lp user X parent addtemp vip 30d`) и раз в `resync-minutes` (ловит истёкший донат).
5. Бот выдаёт роли по таблице `groups` в `bot/config.json` и **снимает** роль, когда группа пропала.
   Бот трогает только роли, перечисленные в конфиге; остальные роли участника не затрагиваются.

Команды в Discord: `/link`, `/unlink`, `/profile`. В игре: `/discord`, `/discord unlink`, `/discord cancel`,
для админов `/discord reload` и `/discord resync` (право `xyzdiscord.admin`).

Один Discord ↔ один Minecraft-аккаунт. Код одноразовый, живёт 10 минут; после 5 неверных попыток подряд
с одного ника — блокировка на 10 минут. API бота закрыт общим секретом (`Authorization: Bearer`).

## Установка бота

1. <https://discord.com/developers/applications> → New Application → **Bot** → скопируйте токен.
   Во вкладке Bot включите **Server Members Intent**.
2. Пригласите бота: OAuth2 → URL Generator → scopes `bot` и `applications.commands`, право **Manage Roles**.
3. В настройках сервера **поднимите роль бота выше** всех донат-ролей, которыми он управляет.
4. На сервере/VPS (нужен Node.js 20+):
   ```bash
   cd discord-link/bot
   npm install
   cp .env.example .env               # DISCORD_TOKEN, GUILD_ID, API_SECRET
   cp config.example.json config.json # группа LuckPerms → ID роли
   npm start
   ```
5. `config.json`: ключ — имя группы LuckPerms (в нижнем регистре), значение — ID роли (или список ID).
   `linkedRole` — необязательная роль всем привязанным. После правки перезапустите бота.
6. Порт API (`API_PORT`, по умолчанию 8788) **не открывайте в интернет**: если бот и Minecraft на одной
   машине, поставьте `API_HOST=127.0.0.1`; иначе ограничьте порт файрволом по IP игрового сервера.

Для постоянной работы: `pm2 start src/index.js --name xyz-bot` или systemd.

## Установка плагина

Нужны Paper 1.21+ и LuckPerms. Сборка:

```bash
cd discord-link/plugin
mvn package        # jar: target/XYZDiscordLink-1.0.0.jar
```

Готовый jar также собирает GitHub Actions (workflow `Discord Link build`, артефакт `XYZDiscordLink`).
Положите jar в `plugins/`, запустите сервер один раз, в `plugins/XYZDiscordLink/config.yml` укажите
`api-url` (адрес бота) и `api-secret` (**тот же**, что `API_SECRET`), затем `/discord reload`.

`include-inherited: true` отправляет и унаследованные группы (например, `elite` наследует `vip`);
по умолчанию — только группы, выданные игроку напрямую.

## Проверка

```bash
cd discord-link/bot && npm test   # логика привязки, роли, HTTP API
```

Плагин в среде разработки не компилировался (репозиторий Paper был недоступен) — сборку проверяет workflow.
