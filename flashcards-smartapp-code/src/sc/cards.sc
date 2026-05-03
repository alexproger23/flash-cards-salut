theme: /

    state: ОткрытьДобавлениеКарточки
        q!: (новая карточка|добавить карточку|создай карточку)
        script:
            sendFlashcardAction("new_card", {}, $context);
        a: Открываю добавление карточки.

    state: ДобавитьКарточку
        q!: (добавь|создай|запиши) [новую] [карточку] [вопрос] $AnyText::cardText
        script:
            var parsed = parseAddCardText($parseTree._cardText);
            sendFlashcardAction("add_card", {
                front: parsed.front,
                back: parsed.back
            }, $context);
            addSuggestions(["Начни тренировку", "Добавь карточку вопрос run ответ ran run"], $context);
        a: Добавляю карточку.

    state: УдалитьКарточкуПоНомеру
        q!: (удали|удалить) [карточку] [номер] $Number::number
        script:
            sendCardActionByNumber("delete_card", $parseTree._number, $context);
        a: Удаляю карточку.

    state: УдалитьКарточкуПоТексту
        q!: (удали|удалить) [карточку] $AnyText::front
        script:
            sendFlashcardAction("delete_card", {
                front: normalizeText($parseTree._front)
            }, $context);
        a: Удаляю карточку.
