theme: /

    state: ОзвучкаИзФронтенда
        event!: voice_feedback
        script:
            var eventData = get_event_data($context);
            var text = eventData.text || eventData.value || "";
            log("voice_feedback: " + JSON.stringify(eventData));
            if (text) {
                $reactions.answer({
                    value: text
                });
            }

    state: ГотовоИзФронтенда
        event!: done
        script:
            var eventData = get_event_data($context);
            $reactions.answer({
                value: eventData.value || "Готово"
            });

    