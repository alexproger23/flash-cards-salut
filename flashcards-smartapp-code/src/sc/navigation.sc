theme: /

    state: Главная
        q!: (главная|домой|на главную|в библиотеку|библиотека|все темы|покажи темы|открой темы|покажи библиотеку)
        script:
            sendFlashcardAction("go_home", {}, $context);

    state: Назад
        q!: (назад|вернись|обратно|предыдущий экран|к предыдущему экрану)
        script:
            sendFlashcardAction("go_back", {}, $context);

    state: ОткрытьТесты
        q!: (тесты|режим теста|открой тесты|покажи тесты|к тестам)
        script:
            sendFlashcardAction("open_tests", {}, $context);

    state: СоздатьТему
        q!: (создай|создать|новая|новую|добавь|добавить) (тему|колоду|набор)
        q!: (новая тема|добавь тему|создай тему|создать тему)
        q!: (открой|покажи) (форму создания темы|создание темы)
        script:
            sendFlashcardAction("new_topic", {}, $context);

    state: ОткрытьВход
        q!: (войти|вход|авторизация|открой вход|покажи вход|войти в аккаунт)
        script:
            sendFlashcardAction("open_auth", {}, $context);

    state: Регистрация
        q!: (регистрация|зарегистрироваться|создать аккаунт|новый аккаунт)
        script:
            sendFlashcardAction("show_register", {}, $context);

    state: СветлаяТема
        q!: (светлая тема|включи светлую тему|светлое оформление)
        script:
            sendFlashcardAction("set_theme", { theme: "light" }, $context);

    state: ТемнаяТема
        q!: (темная тема|включи темную тему|темное оформление)
        script:
            sendFlashcardAction("set_theme", { theme: "dark" }, $context);

    state: ПереключитьТему
        q!: (переключи тему|смени тему|переключи оформление|смени оформление)
        script:
            sendFlashcardAction("toggle_theme", {}, $context);
