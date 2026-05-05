theme: /

    state: НеЗнаю
        q!: (я не знаю|не знаю|не помню|сдаюсь|не могу)
        script:
            sendFlashcardAction("dont_know_card", {}, $context);

    state: ОтветСПрефиксом
        q!: (ответ|мой ответ|думаю|я думаю|думаю что) $AnyText::answer
        script:
            sendFlashcardAction("check_answer", {
                answer: normalizeText($parseTree._answer)
            }, $context);

    state: СвободныйОтвет
        q!: $AnyText::answer
        script:
            sendFlashcardAction("check_answer", {
                answer: normalizeText($parseTree._answer)
            }, $context);
