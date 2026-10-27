/**
 * XYZ — единый файл настроек сайта.
 * Здесь ВСЕ ссылки, IP, тексты, команда и списки карточек. Чтобы изменить
 * содержимое, правьте только этот файл. Слово в {фигурных скобках} в заголовке
 * подсвечивается акцентным цветом, \n — перенос строки.
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
    year: 2026,
    logo: "assets/logo.png",
  },

  // Меню. `page` — какая страница подсвечивается как активная.
  nav: [
    { label: "Главная", href: "index.html", page: "home" },
    { label: "Новости", href: "index.html#news" },
    { label: "Играть", href: "play.html", page: "play" },
    { label: "Команда", href: "team.html", page: "team" },
    { label: "FAQ", href: "faq.html", page: "faq" },
    { label: "Магазин", href: "https://shop.xyzmc.su", external: true },
  ],

  // Кнопка в шапке копирует IP
  headerCta: "Скопировать IP",

  // Заголовки внутренних страниц (шапка страницы с хлебными крошками)
  pages: {
    play: { crumb: "Играть", title: "Играть на {XYZ}", subtitle: "Всё, что нужно, чтобы зайти на сервер и начать игру." },
    team: { crumb: "Команда", title: "Команда {XYZ}", subtitle: "Люди, которые поддерживают сервер." },
    faq: { crumb: "FAQ", title: "Вопросы и {ответы}", subtitle: "Коротко о входе, покупках и правилах сервера." },
    homeCrumb: "Главная",
  },

  hero: {
    version: "Java 1.21+ | Bedrock",          // строка над заголовком
    title: "Чувствуй себя\n{как дома}",
    subtitle: "Начните свой путь уже сегодня",
    image: "assets/hero.jpg",
    playButton: "Играть сейчас",
    playHref: "play.html",
  },

  // ---------- Страница «Играть» ----------
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

  start: {
    title: "Как начать {играть}",
    subtitle: "Три простых шага — и вы на сервере.",
    steps: [
      { title: "Открой Minecraft", text: "Запусти игру нужной версии и перейди в «Сетевая игра»." },
      { title: "Добавь сервер", text: "Нажми «Добавить сервер» и вставь адрес:", showIp: true },
      { title: "Заходи и играй", text: "Выбери XYZ в списке, зайди и начни своё приключение." },
    ],
    copyLabel: "Скопировать IP",
  },

  // ---------- Главная: новости ----------
  news: {
    title: "Новости {XYZ}",
    subtitle: "Узнай, что нового!",
    readMore: "Читать далее",
    moreLabel: "Больше новостей",
    moreHref: "https://t.me/xyz_nw",
    // Замените тексты, даты и ссылки на реальные. href может вести в Telegram-пост.
    items: [
      { title: "Открытие сервера XYZ", date: "2026-10-01", text: "Сервер XYZ распахнул двери. Заходи, находи друзей и начинай свой путь уже сегодня.", image: "assets/news-1.jpg", href: "https://t.me/xyz_nw" },
      { title: "Большое обновление: что нового", date: "2026-10-10", text: "Рассказываем, что изменилось на сервере: новые возможности, улучшения и исправления.", image: "assets/news-2.jpg", href: "https://t.me/xyz_nw" },
      { title: "Ивент для всех игроков", date: "2026-10-17", text: "Собираемся вместе на ивент для всех игроков. Следи за анонсами в Telegram и Discord.", image: "assets/news-3.jpg", href: "https://t.me/xyz_nw" },
      { title: "Новинки в магазине", date: "2026-10-22", text: "В магазине появились новые товары и наборы. Загляни и выбери то, что нужно именно тебе.", image: "assets/news-4.jpg", href: "https://shop.xyzmc.su" },
    ],
  },

  // ---------- Баннеры под новостями (и на странице FAQ) ----------
  // image — PNG персонажа с прозрачным фоном (сейчас заглушки). tone: violet | indigo | plum.
  banners: {
    items: [
      { id: "shop", tone: "violet", title: "Магазин", text: "Привилегии, наборы и другие товары для комфортной игры на сервере.", button: "Перейти в магазин", icon: "bag", href: "https://shop.xyzmc.su", image: "assets/banner-shop.png" },
      { id: "discord", tone: "indigo", title: "Discord", text: "Чат игроков, правила, поддержка и анонсы ивентов.", button: "Вступить в Discord", icon: "discord", href: "https://discord.gg/yKkcFfgZ6b", image: "assets/banner-discord.png" },
      { id: "telegram", tone: "plum", title: "Telegram", text: "Свежие новости сервера и быстрая связь с командой.", button: "Открыть Telegram", icon: "telegram", href: "https://t.me/xyz_nw", image: "assets/banner-telegram.png" },
    ],
  },

  // ---------- Страница «Команда» ----------
  // Скин подтягивается по нику (`nick`). Если ника нет — показывается заглушка.
  // Чтобы добавить человека — скопируйте строку. `highlight: true` выделяет роль.
  team: {
    skinUrl: "https://minotar.net/armor/bust/{nick}/240.png",       // основной сервис скинов
    skinFallbackUrl: "https://mc-heads.net/avatar/{nick}/240",      // запасной
    placeholder: "assets/skin-placeholder.png",
    members: [
      { name: "ARDI", nick: "ArdiGOI", role: "Владелец", highlight: true },
      { name: "NClayer", nick: "NClayer", role: "Владелец", highlight: true },
      { name: "KHnurlan", nick: "KHnurlan", role: "Тех. разработчик" },
      { name: "Имя уточняется", nick: "", role: "Куратор" },
    ],
  },

  // ---------- Страница FAQ ----------
  faq: {
    title: "Частые {вопросы}",
    moreTitle: "Остались {вопросы}?",
    moreSubtitle: "Напишите нам — поможем разобраться.",
    items: [
      { q: "На какой версии Minecraft играть?", a: "Укажите актуальную версию сервера здесь. Рекомендуем использовать последнюю стабильную версию Minecraft Java Edition." },
      { q: "Как зайти на сервер?", a: "Откройте Minecraft → «Сетевая игра» → «Добавить сервер» и введите адрес mc.xyzmc.su. Затем выберите сервер в списке и нажмите «Подключиться»." },
      { q: "Как купить привилегию или товар?", a: "Перейдите в магазин shop.xyzmc.su, выберите товар, укажите свой игровой ник и оплатите удобным способом. Товар выдаётся автоматически." },
      { q: "Как связаться с поддержкой?", a: "Напишите нам в Telegram или Discord — ссылки есть на баннерах и в подвале сайта." },
      { q: "Где посмотреть правила?", a: "Правила сервера опубликованы в нашем Discord. Пожалуйста, ознакомьтесь с ними перед началом игры." },
      { q: "Что делать, если сервер не подключается?", a: "Проверьте адрес и версию игры, перезапустите клиент. Если проблема остаётся — напишите в поддержку." },
    ],
  },

  chat: {
    text: "Есть вопросы? Поможем разобраться 💜",
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
  },
};
