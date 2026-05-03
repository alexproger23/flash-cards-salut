theme: /

    state: НачатьТемуПоНомеру
        q!: (начни|запусти|открой) [тему|тренировку|карточки] [номер] $Number::number
        script:
            sendTopicActionByNumber("start_study", $parseTree._number, $context);
            addSuggestions(["Покажи ответ", "Повтори вопрос"], $context);
        a: Начинаю тренировку.

    state: НачатьТемуПоНазванию
        q!: (начни|запусти|открой) [тему|тренировку|карточки] $AnyText::topicTitle
        script:
            sendFlashcardAction("start_study", {
                topic_title: normalizeText($parseTree._topicTitle)
            }, $context);
            addSuggestions(["Покажи ответ", "Повтори вопрос"], $context);
        a: Начинаю тренировку.

    state: ПоказатьОтвет
        q!: (покажи|открой|скажи|прочитай) [мне] ответ
        script:
            sendFlashcardAction("show_answer", {}, $context);
            addSuggestions(["Я знаю", "Я не знаю"], $context);

    state: ПеревернутьКарточку
        q!: (переверни|поверни|открой) [карточку]
        script:
            sendFlashcardAction("flip_card", {}, $context);
            addSuggestions(["Я знаю", "Я не знаю"], $context);

    state: ПовторитьВопрос
        q!: (повтори|прочитай|скажи) [текущий] [вопрос|термин|слово|карточку]
        script:
            sendFlashcardAction("repeat_question", {}, $context);

    state: Знаю
        q!: (знаю|я знаю|знал|помню|правильно|верно|легко)
        script:
            sendFlashcardAction("know_card", {}, $context);
            addSuggestions(["Покажи ответ", "Повтори вопрос"], $context);
        random:
            a: Принято.
            a: Отлично.

    state: НеЗнаю
        q!: (не знаю|я не знаю|не знал|не помню|неправильно|ошибка|сложно)
        script:
            sendFlashcardAction("dont_know_card", {}, $context);
            addSuggestions(["Покажи ответ", "Повтори вопрос"], $context);
        random:
            a: Запомнила.
            a: Продолжаем.

    state: ПовторитьТренировку
        q!: (повторить тренировку|начать заново|пройти еще раз|сначала)
        script:
            sendFlashcardAction("study_again", {}, $context);
            addSuggestions(["Покажи ответ", "Повтори вопрос"], $context);
        a: Начинаем заново.
