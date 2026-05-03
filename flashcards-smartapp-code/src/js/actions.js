function sendFlashcardAction(action_id, parameters, context) {
    addAction({
        action_id: action_id,
        parameters: parameters || {}
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
