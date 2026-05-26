require: slotfilling/slotFilling.sc
  module = sys.zb-common

require: js/getters.js
require: js/reply.js
require: js/actions.js

require: sc/navigation.sc
require: sc/topics.sc
require: sc/forms.sc
require: sc/tests.sc
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
                "Покажи темы",
                "Создать тему",
                "Режим теста"
            ], $context);
        a: Открываю карточки.

    state: Fallback
        event!: noMatch
        script:
            log("fallback: " + JSON.stringify($context));
            addSuggestions([
                "Покажи темы",
                "Создать тему",
                "Режим теста"
            ], $context);
        a: Не поняла команду.
