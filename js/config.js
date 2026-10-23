/**
 * XYZ — единый файл настроек сайта.
 * Здесь ВСЕ ссылки, IP, тексты и списки карточек. Правьте только этот файл,
 * чтобы поменять содержимое. Выделение цветом: слово в {фигурных скобках}
 * в заголовках станет фиолетовым градиентом.
 *
 * Иконки (поле `icon`): shield, users, refresh, coin, lock, support,
 * server, sword, telegram, discord, bag, copy, play, home.
 */
window.XYZ_CONFIG = {
  site: {
    name: "XYZ",
    ip: "mc.xyzmc.su",
    shopUrl: "https://shop.xyzmc.su",
    discordUrl: "https://discord.gg/yKkcFfgZ6b",
    telegramUrl: "https://t.me/xyz_nw",
    // API для онлайна. Если не ответит — виджет покажет «Статус недоступен».
    statusApi: "https://api.mcsrvstat.us/3/mc.xyzmc.su",
    fallbackMaxPlayers: 100,
    year: 2026,
    logo: "assets/logo.png",
  },

  nav: [
    { label: "Главная", href: "#home" },
    { label: "Режимы", href: "#modes" },
    { label: "Новости", href: "#news" },
    { label: "Магазин", href: "https://shop.xyzmc.su", external: true },
    { label: "Как играть", href: "#start" },
  ],

  headerCta: "Перейти к товарам",

  hero: {
    title: "Чувствуй себя как {дома}",
    subtitle: "Начните свой путь уже сегодня",
    image: "assets/hero.jpg",
    playButton: "Играть сейчас",
    shopButton: "Магазин",
  },

  features: {
    title: "Почему {XYZ}",
    subtitle: "Всё, что нужно для комфортной игры — без лишнего.",
    items: [
      { icon: "server", title: "Стабильный сервер", text: "Мощное железо и аккуратная настройка — минимум лагов и вылетов." },
      { icon: "users", title: "Дружное комьюнити", text: "Живой чат, совместные ивенты и игроки, с которыми приятно играть." },
      { icon: "refresh", title: "Регулярные обновления", text: "Следим за новыми версиями и постоянно развиваем сервер." },
      { icon: "coin", title: "Честный донат", text: "Прозрачные условия: покупки не ломают баланс и не обманывают ожиданий." },
      { icon: "shield", title: "Защита от читеров", text: "Антиочит и активная модерация — игра остаётся честной для всех." },
      { icon: "support", title: "Быстрая поддержка", text: "Поможем с входом, покупками и любыми вопросами в Telegram и Discord." },
    ],
  },

  modes: {
    title: "Режимы {сервера}",
    subtitle: "Выбирайте режим и подключайтесь одним кликом.",
    connectLabel: "Подключиться",
    // Чтобы добавить режим — скопируйте объект и положите картинку в assets/.
    items: [
      {
        name: "XYZ",
        tag: "Основной режим",
        text: "Главный режим сервера: исследуйте мир, развивайтесь и находите друзей.",
        image: "assets/mode-xyz.jpg",
        ip: "mc.xyzmc.su",
      },
    ],
  },

  news: {
    title: "{Новости}",
    subtitle: "Последние события и обновления сервера.",
    readMore: "Читать далее",
    // Замените тексты, даты и ссылки на реальные. href может вести в Telegram-пост.
    items: [
      { title: "Открытие сервера XYZ", date: "2026-10-01", image: "assets/news-1.jpg", href: "https://t.me/xyz_nw" },
      { title: "Большое обновление: что нового", date: "2026-10-10", image: "assets/news-2.jpg", href: "https://t.me/xyz_nw" },
      { title: "Ивент для всех игроков", date: "2026-10-17", image: "assets/news-3.jpg", href: "https://t.me/xyz_nw" },
      { title: "Новинки в магазине", date: "2026-10-22", image: "assets/news-4.jpg", href: "https://shop.xyzmc.su" },
    ],
  },

  start: {
    id: "start",
    title: "Как начать {играть}",
    subtitle: "Три простых шага — и вы на сервере.",
    steps: [
      { title: "Открой Minecraft", text: "Запусти игру нужной версии и перейди в «Сетевая игра»." },
      { title: "Добавь сервер", text: "Нажми «Добавить сервер» и вставь адрес:" , showIp: true },
      { title: "Заходи и играй", text: "Выбери XYZ в списке, зайди и начни своё приключение." },
    ],
    copyLabel: "Скопировать IP",
  },

  shop: {
    title: "Магазин XYZ",
    text: "Привилегии, наборы и другие товары для комфортной игры на сервере.",
    button: "Перейти в магазин",
  },

  faq: {
    title: "Частые {вопросы}",
    items: [
      { q: "На какой версии Minecraft играть?", a: "Укажите актуальную версию сервера здесь. Рекомендуем использовать последнюю стабильную версию Minecraft Java Edition." },
      { q: "Как зайти на сервер?", a: "Откройте Minecraft → «Сетевая игра» → «Добавить сервер» и введите адрес mc.xyzmc.su. Затем выберите сервер в списке и нажмите «Подключиться»." },
      { q: "Как купить привилегию или товар?", a: "Перейдите в магазин shop.xyzmc.su, выберите товар, укажите свой игровой ник и оплатите удобным способом. Товар выдаётся автоматически." },
      { q: "Как связаться с поддержкой?", a: "Напишите нам в Telegram или Discord — ссылки есть в разделе «Сообщество» и в подвале сайта." },
      { q: "Где посмотреть правила?", a: "Правила сервера опубликованы в нашем Discord. Пожалуйста, ознакомьтесь с ними перед началом игры." },
      { q: "Что делать, если сервер не подключается?", a: "Проверьте адрес и версию игры, перезапустите клиент. Если проблема остаётся — напишите в поддержку." },
    ],
  },

  community: {
    title: "Присоединяйся к {сообществу}",
    subtitle: "Новости, ивенты, помощь и общение — в наших каналах.",
    items: [
      { icon: "discord", title: "Discord", text: "Чат игроков, правила, поддержка и анонсы ивентов.", button: "Вступить в Discord", href: "https://discord.gg/yKkcFfgZ6b", color: "discord" },
      { icon: "telegram", title: "Telegram", text: "Свежие новости сервера и быстрая связь с командой.", button: "Открыть Telegram", href: "https://t.me/xyz_nw", color: "telegram" },
    ],
  },

  chat: {
    text: "Есть вопросы? Поможем разобраться 🧡",
    button: "Написать",
    href: "https://t.me/xyz_nw",
  },

  footer: {
    quickLinksTitle: "Навигация",
    socialsTitle: "Соцсети",
    copyright: "© XYZ 2026",
    disclaimer: "Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.",
  },

  texts: {
    copied: "Скопировано!",
    copyFailed: "Не удалось скопировать — IP: ",
    online: "Онлайн",
    offline: "Сервер офлайн",
    unavailable: "Статус недоступен",
    loading: "Загрузка…",
  },
};
