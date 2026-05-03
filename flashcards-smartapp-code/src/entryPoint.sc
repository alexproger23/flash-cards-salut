require: slotfilling/slotFilling.sc
  module = sys.zb-common

require: js/getters.js
require: js/reply.js
require: js/actions.js

require: sc/navigation.sc
require: sc/study.sc
require: sc/topics.sc
require: sc/cards.sc
require: sc/frontendEvents.sc

patterns:
    $AnyText = $nonEmptyGarbage
    $Number = $regexp<[0-9]+>

theme: /

    state: Start
        q!: $regex</start>
        q!: (запусти | открой | вруби) flashcards
        script:
            sendFlashcardAction("go_home", {}, $context);
            addSuggestions([
                "Начни первую тему",
                "Создай тему Английские глаголы",
                "Покажи ответ"
            ], $context);
        a: Открываю карточки.

    state: Help
        q!: (помощь|что ты умеешь|какие команды|что можно сказать)
        script:
            addSuggestions([
                "Начни первую тему",
                "Покажи ответ",
                "Я знаю",
                "Я не знаю",
                "Создай тему Английские глаголы"
            ], $context);
        a: Можно сказать: начни первую тему, покажи ответ, я знаю, я не знаю, повтори вопрос, создай тему.

    state: Fallback
        event!: noMatch
        script:
            log("fallback: " + JSON.stringify($context));
            addSuggestions([
                "Начни первую тему",
                "Покажи ответ",
                "Помощь"
            ], $context);
        a: Я не поняла команду.
