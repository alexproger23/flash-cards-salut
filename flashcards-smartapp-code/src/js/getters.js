function get_request(context) {
    if (context && context.request) {
        return context.request.rawRequest;
    }
    return {};
}

function get_current_app_state(request) {
    if (
        request &&
        request.payload &&
        request.payload.meta &&
        request.payload.meta.current_app &&
        request.payload.meta.current_app.state
    ) {
        return request.payload.meta.current_app.state;
    }

    return {};
}

function get_screen(request) {
    var state = get_current_app_state(request);
    return state.screen || "";
}

function get_items(request) {
    var state = get_current_app_state(request);

    if (state && state.item_selector && state.item_selector.items) {
        return state.item_selector.items;
    }

    return null;
}

function get_id_by_number(request, number) {
    var items = get_items(request);
    var index = Number(number) - 1;

    if (items && items[index]) {
        return items[index].id;
    }

    return null;
}

function get_event_data(context) {
    if (
        context &&
        context.request &&
        context.request.data &&
        context.request.data.eventData
    ) {
        return context.request.data.eventData;
    }

    return {};
}

function normalizeText(text) {
    return String(text || "").replace(/^\s+|\s+$/g, "");
}
