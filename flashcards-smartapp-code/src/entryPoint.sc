require: slotfilling/slotFilling.sc
  module = sys.zb-common

require: js/getters.js
require: js/reply.js
require: js/actions.js

require: sc/study.sc
require: sc/frontendEvents.sc

patterns:
    $AnyText = $nonEmptyGarbage
    $Number = $regexp<[0-9]+>

theme: /

    state: Start
        q!: $regex</start>
        q!: (запусти | открой | вруби) flashcards
        script:
            addSuggestions([
                "Ответ example",
                "Я не знаю"
            ], $context);
        a: Открываю карточки.

    state: Fallback
        event!: noMatch
        script:
            log("fallback: " + JSON.stringify($context));
            addSuggestions([
                "Ответ example",
                "Я не знаю"
            ], $context);
        a: Повторите ответ.
