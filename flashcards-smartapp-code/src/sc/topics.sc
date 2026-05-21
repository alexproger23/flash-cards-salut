theme: /

    state: НачатьТемуПоНомеру
        q!: (начни|начать|запусти|изучай|изучить|тренируй|тренировать|повторяй|повторять) (тему|колоду|набор) (номер|под номером) $Number::number
        script:
            sendTopicActionByNumber("start_topic", $parseTree._number, $context);

    state: НачатьТемуПоНазванию
        q!: (начни|начать|запусти|изучай|изучить|тренируй|тренировать|повторяй|повторять) (тему|колоду|набор) $AnyText::topic
        script:
            sendFlashcardAction("start_topic", {
                topic_title: normalizeText($parseTree._topic),
                title: normalizeText($parseTree._topic)
            }, $context);

    state: ОткрытьТемуПоНомеру
        q!: (открой|покажи|выбери) (тему|колоду|набор) (номер|под номером) $Number::number
        script:
            sendTopicActionByNumber("open_topic", $parseTree._number, $context);

    state: ОткрытьТемуПоНазванию
        q!: (открой|покажи|выбери) (тему|колоду|набор) $AnyText::topic
        script:
            sendFlashcardAction("open_topic", {
                topic_title: normalizeText($parseTree._topic),
                title: normalizeText($parseTree._topic)
            }, $context);

    state: ТестПоТемеНомер
        q!: (тест|запусти тест|начни тест|пройди тест|проверка) (по теме|тему|колоду|набор) (номер|под номером) $Number::number
        script:
            sendTopicActionByNumber("start_test", $parseTree._number, $context);

    state: ТестПоТемеНазвание
        q!: (тест|запусти тест|начни тест|пройди тест|проверка) (по теме|тему|колоду|набор) $AnyText::topic
        script:
            sendFlashcardAction("start_test", {
                topic_title: normalizeText($parseTree._topic),
                title: normalizeText($parseTree._topic)
            }, $context);

    state: РедактироватьТемуНомер
        q!: (редактируй|редактировать|настрой|настроить|измени|изменить) (тему|колоду|набор) (номер|под номером) $Number::number
        script:
            sendTopicActionByNumber("edit_topic", $parseTree._number, $context);

    state: РедактироватьТемуНазвание
        q!: (редактируй|редактировать|настрой|настроить|измени|изменить) (тему|колоду|набор) $AnyText::topic
        script:
            sendFlashcardAction("edit_topic", {
                topic_title: normalizeText($parseTree._topic),
                title: normalizeText($parseTree._topic)
            }, $context);

    state: УдалитьТемуНомер
        q!: (удали|удалить|скрой|скрыть) (тему|колоду|набор) (номер|под номером) $Number::number
        script:
            sendTopicActionByNumber("delete_topic", $parseTree._number, $context);

    state: УдалитьТемуНазвание
        q!: (удали|удалить|скрой|скрыть) (тему|колоду|набор) $AnyText::topic
        script:
            sendFlashcardAction("delete_topic", {
                topic_title: normalizeText($parseTree._topic),
                title: normalizeText($parseTree._topic)
            }, $context);

    state: Подтвердить
        q!: (да|подтверди|подтвердить|согласен|удалить|точно удалить)
        script:
            sendFlashcardAction("confirm", {}, $context);

    state: Отмена
        q!: (нет|отмена|отмени|отменить|не надо|закрыть)
        script:
            sendFlashcardAction("cancel", {}, $context);
