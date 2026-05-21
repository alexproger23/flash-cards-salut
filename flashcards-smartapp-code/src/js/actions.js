function sendFlashcardAction(action_id, parameters, context) {
    addAction({
        action_id: action_id,
        parameters: parameters || {}
    }, context);
}

function sendContextualCreateTopicAction(context) {
    var screen = get_screen(get_request(context));
    var actionId = screen === "topic_form" ? "save_topic" : "new_topic";
    sendFlashcardAction(actionId, {}, context);
}

function sendContextualTestOptionAction(number, text, context) {
    var screen = get_screen(get_request(context));

    if (screen === "test_quiz") {
        sendFlashcardAction("answer_test_option", {
            option_number: Number(number),
            number: Number(number)
        }, context);
        return;
    }

    sendFlashcardAction("check_answer", {
        answer: normalizeText(text)
    }, context);
}

function sendTopicActionByNumber(action_id, number, context) {
    var request = get_request(context);
    var topicId = get_id_by_number(request, number);
    var params = {
        number: Number(number)
    };

    if (topicId) {
        params.topic_id = topicId;
    }

    sendFlashcardAction(action_id, params, context);
}

function sendCardActionByNumber(action_id, number, context) {
    var request = get_request(context);
    var cardId = get_id_by_number(request, number);
    var params = {
        number: Number(number)
    };

    if (cardId) {
        params.card_id = cardId;
    }

    sendFlashcardAction(action_id, params, context);
}

function parseAddCardText(text) {
    var raw = normalizeText(text);
    var lower = raw.toLowerCase();
    var frontMarkers = [
        "вопрос ",
        "термин ",
        "слово ",
        "передняя сторона "
    ];

    for (var markerIndex = 0; markerIndex < frontMarkers.length; markerIndex++) {
        var marker = frontMarkers[markerIndex];
        if (lower.indexOf(marker) === 0) {
            raw = normalizeText(raw.slice(marker.length));
            lower = raw.toLowerCase();
            break;
        }
    }

    var answerMarker = " ответ ";
    var answerIndex = lower.indexOf(answerMarker);

    if (answerIndex === -1) {
        answerMarker = " значение ";
        answerIndex = lower.indexOf(answerMarker);
    }

    if (answerIndex === -1) {
        return {
            front: raw,
            back: ""
        };
    }

    return {
        front: normalizeText(raw.slice(0, answerIndex)),
        back: normalizeText(raw.slice(answerIndex + answerMarker.length))
    };
}
