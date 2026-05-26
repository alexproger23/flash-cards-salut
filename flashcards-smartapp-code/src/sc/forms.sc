theme: /

    state: НазваниеТемы
        q!: (название темы|назови тему|заголовок темы|название) $AnyText::title
        script:
            sendFlashcardAction("set_topic_title", {
                title: normalizeText($parseTree._title),
                value: normalizeText($parseTree._title)
            }, $context);

    state: ОписаниеТемы
        q!: (описание темы|описание|опиши тему|о теме) $AnyText::description
        script:
            sendFlashcardAction("set_topic_description", {
                description: normalizeText($parseTree._description),
                value: normalizeText($parseTree._description)
            }, $context);

    state: ИконкаТемы
        q!: (иконка|выбери иконку|значок|выбери значок) $AnyText::icon
        script:
            sendFlashcardAction("set_topic_icon", {
                icon: normalizeText($parseTree._icon),
                value: normalizeText($parseTree._icon)
            }, $context);

    state: СохранитьТему
        q!: (сохрани|сохранить|создай колоду|создать колоду|сохрани тему|сохранить тему|готово)
        script:
            sendFlashcardAction("save_topic", {}, $context);

    state: ОтменитьФормуТемы
        q!: (отмени создание|отменить создание|закрыть форму|не создавать тему)
        script:
            sendFlashcardAction("cancel_topic_form", {}, $context);

    state: АвтогенерацияВключить
        q!: (включи автогенерацию|автогенерация|генерируй карточки|сгенерируй карточки)
        script:
            sendFlashcardAction("enable_auto_generate", {}, $context);

    state: АвтогенерацияВыключить
        q!: (выключи автогенерацию|без автогенерации|не генерируй карточки)
        script:
            sendFlashcardAction("disable_auto_generate", {}, $context);

    state: КоличествоКарточек
        q!: (количество карточек|карточек|сгенерируй) $Number::number
        script:
            sendFlashcardAction("set_cards_count", {
                count: Number($parseTree._number),
                value: Number($parseTree._number)
            }, $context);

    state: ДобавитьКарточку
        q!: (добавь|добавить|создай|создать|новая) карточку $AnyText::card
        script:
            var card = parseAddCardText($parseTree._card);
            sendFlashcardAction("add_card", {
                front: card.front,
                back: card.back,
                text: normalizeText($parseTree._card)
            }, $context);

    state: УдалитьКарточкуНомер
        q!: (удали|удалить) карточку (номер|под номером) $Number::number
        script:
            sendCardActionByNumber("delete_card", $parseTree._number, $context);

    state: РедактироватьНастройкиТемы
        q!: (настройки темы|редактировать тему|изменить тему|настроить тему)
        script:
            sendFlashcardAction("edit_topic", {}, $context);
