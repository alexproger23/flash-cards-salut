theme: /

    state: ОткрытьТемуПоНомеру
        q!: (открой|покажи|выбери) [тему] [номер] $Number::number
        script:
            sendTopicActionByNumber("open_topic", $parseTree._number, $context);
        a: Открываю тему.

    state: ОткрытьТемуПоНазванию
        q!: (открой|покажи|выбери) [тему] $AnyText::topicTitle
        script:
            sendFlashcardAction("open_topic", {
                topic_title: normalizeText($parseTree._topicTitle)
            }, $context);
        a: Открываю тему.

    state: СоздатьТему
        q!: (создай|добавь|сделай) [новую] тему $AnyText::title
        script:
            sendFlashcardAction("create_topic", {
                title: normalizeText($parseTree._title)
            }, $context);
            addSuggestions(["Добавь карточку вопрос go ответ went gone"], $context);
        a: Создаю тему.

    state: НазваниеТемы
        q!: (название|назови тему|установи название) $AnyText::title
        script:
            sendFlashcardAction("set_topic_title", {
                title: normalizeText($parseTree._title)
            }, $context);
        a: Записала название.

    state: ОписаниеТемы
        q!: (описание|установи описание|добавь описание) $AnyText::description
        script:
            sendFlashcardAction("set_topic_description", {
                description: normalizeText($parseTree._description)
            }, $context);
        a: Записала описание.

    state: СохранитьТему
        q!: (сохрани тему|создай тему|готово)
        script:
            sendFlashcardAction("save_topic", {}, $context);
        a: Сохраняю.
