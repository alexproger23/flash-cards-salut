theme: /

    state: Домой
        q!: (домой|на главную|покажи темы|открой темы|все темы|список тем)
        script:
            sendFlashcardAction("go_home", {}, $context);
            addSuggestions(["Начни первую тему", "Создай тему Английские глаголы"], $context);
        a: Показываю темы.

    state: Назад
        q!: (назад|вернись назад)
        script:
            sendFlashcardAction("back", {}, $context);
        a: Назад.

    state: ОткрытьСозданиеТемы
        q!: (новая тема|создать тему|добавить тему|создай новую тему)
        script:
            sendFlashcardAction("new_topic", {}, $context);
        a: Открываю создание темы.
