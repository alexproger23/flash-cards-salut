theme: /

    state: ОтветВариантНомер
        q!: (вариант|выбери|номер) $Number::number
        script:
            sendContextualTestOptionAction($parseTree._number, $parseTree._number, $context);

    state: ПервыйВариант
        q!: (первый|первый вариант|вариант первый)
        script:
            sendContextualTestOptionAction(1, "первый", $context);

    state: ВторойВариант
        q!: (второй|второй вариант|вариант второй)
        script:
            sendContextualTestOptionAction(2, "второй", $context);

    state: ТретийВариант
        q!: (третий|третий вариант|вариант третий)
        script:
            sendContextualTestOptionAction(3, "третий", $context);

    state: ПовторитьТест
        q!: (повторить тест|повтори тест|еще раз тест|заново тест)
        script:
            sendFlashcardAction("repeat_test", {}, $context);

    state: ОтветТекстомВТесте
        q!: (в тесте ответ|ответ в тесте) $AnyText::answer
        script:
            sendFlashcardAction("answer_test_text", {
                answer: normalizeText($parseTree._answer),
                value: normalizeText($parseTree._answer)
            }, $context);
