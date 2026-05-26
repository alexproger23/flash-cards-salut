theme: /

    state: НеЗнаю
        q!: (я не знаю|не знаю|не помню|сдаюсь|не могу)
        script:
            sendFlashcardAction("dont_know_card", {}, $context);

    state: ПоказатьОтвет
        q!: (покажи ответ|открой ответ|переверни|переверни карточку|ответ на карточке)
        script:
            sendFlashcardAction("reveal_answer", {}, $context);

    state: Знаю
        q!: (знаю|я знаю|правильно|верно|следующая|следующая карточка|дальше)
        script:
            sendFlashcardAction("mark_known", {}, $context);

    state: НеЗапомнил
        q!: (не запомнил|неверно|неправильно|ошибка|засчитать ошибку|пропустить)
        script:
            sendFlashcardAction("mark_unknown", {}, $context);

    state: ПовторитьВопрос
        q!: (повтори вопрос|прочитай вопрос|что на карточке|повтори карточку)
        script:
            sendFlashcardAction("repeat_card", {}, $context);

    state: ОтветСПрефиксом
        q!: (ответ|мой ответ|думаю|я думаю|думаю что) $AnyText::answer
        script:
            sendFlashcardAction("check_answer", {
                answer: normalizeText($parseTree._answer)
            }, $context);

    state: СвободныйОтвет
        q!: $AnyText::answer
        script:
            var answer = normalizeText($parseTree._answer);
            var screen = get_screen(get_request($context));
            if (screen === "study") {
                sendFlashcardAction("check_answer", {
                    answer: answer
                }, $context);
            } else {
                sendFlashcardAction("browser_text", {
                    text: answer,
                    value: answer
                }, $context);
            }
