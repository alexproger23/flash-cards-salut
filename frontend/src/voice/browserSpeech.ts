import type { VoiceAction, VoiceAssistant } from "./assistantClient";
import { renderCompactNativePanel } from "./compactNativePanel";

export type BrowserRecognitionState = {
  text: string;
  final: boolean;
  status: string;
};

type BrowserSpeechOptions = {
  getState: () => Record<string, unknown>;
  onAction: (action: VoiceAction, event: unknown) => void;
  onError: (error: unknown) => void;
  onRecognition: (state: BrowserRecognitionState) => void;
  onTts?: (event: unknown) => void;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeSpeechText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,!?;:()[\]{}"«»]/g, "")
    .replace(/\s+/g, " ");

const makeAction = (type: string, parameters: Record<string, unknown> = {}): VoiceAction => ({
  type,
  parameters,
  ...parameters,
});

const spokenNumbers: Record<string, number> = {
  первый: 1,
  первая: 1,
  один: 1,
  второй: 2,
  вторая: 2,
  два: 2,
  третий: 3,
  третья: 3,
  три: 3,
};

const readSpokenNumber = (value: string): number | undefined => {
  const direct = Number.parseInt(value, 10);
  if (Number.isFinite(direct)) return direct;
  return spokenNumbers[value.trim().toLowerCase()];
};

const parseTopicReference = (value: string): Record<string, unknown> => {
  const topic = value.trim();
  const numberMatch = topic.match(/^(?:номер|под номером)\s+(\d+)$/);
  if (numberMatch?.[1]) {
    return { topic_number: Number(numberMatch[1]), number: Number(numberMatch[1]) };
  }

  return {
    topic_title: topic,
    title: topic,
  };
};

const parseCardText = (value: string): { front: string; back: string } => {
  const cleaned = value
    .replace(/^(?:вопрос|термин|слово|передняя сторона)\s+/i, "")
    .trim();
  const markerMatch = cleaned.match(/\s+(?:ответ|значение)\s+/i);
  if (!markerMatch || markerMatch.index === undefined) {
    return { front: cleaned, back: "" };
  }

  return {
    front: cleaned.slice(0, markerMatch.index).trim(),
    back: cleaned.slice(markerMatch.index + markerMatch[0].length).trim(),
  };
};

export const buildBrowserAction = (
  text: string,
  state: Record<string, unknown>
): VoiceAction | null => {
  const normalized = normalizeSpeechText(text);
  if (!normalized) return null;
  const screen = typeof state.screen === "string" ? state.screen : "";

  if (["главная", "домой", "на главную", "все темы", "покажи темы"].includes(normalized)) {
    return makeAction("go_home", { text, value: text });
  }

  if (["назад", "вернись", "обратно"].includes(normalized)) {
    return makeAction("go_back", { text, value: text });
  }

  if (["да", "подтверди", "подтвердить", "готово"].includes(normalized)) {
    return makeAction("confirm", { text, value: text });
  }

  if (["нет", "отмена", "отмени", "не надо"].includes(normalized)) {
    return makeAction("cancel", { text, value: text });
  }

  if (["темная тема", "включи темную тему", "темное оформление"].includes(normalized)) {
    return makeAction("set_theme", { text, value: text, theme: "dark" });
  }

  if (["светлая тема", "включи светлую тему", "светлое оформление"].includes(normalized)) {
    return makeAction("set_theme", { text, value: text, theme: "light" });
  }

  if (["переключи тему", "смени тему", "переключи оформление"].includes(normalized)) {
    return makeAction("toggle_theme", { text, value: text });
  }

  if (["войти", "вход", "авторизация", "войти в аккаунт"].includes(normalized)) {
    return makeAction("open_auth", { text, value: text });
  }

  if (["регистрация", "создать аккаунт", "зарегистрироваться"].includes(normalized)) {
    return makeAction("show_register", { text, value: text });
  }

  if (["тесты", "режим теста", "открой тесты", "покажи тесты"].includes(normalized)) {
    return makeAction("open_tests", { text, value: text });
  }

  if (
    ["создай тему", "новая тема", "добавь тему", "создать тему"].includes(normalized)
  ) {
    return makeAction("new_topic", { text, value: text });
  }

  if (screen === "topic_form") {
    const titleMatch = normalized.match(/^(?:название темы|назови тему|заголовок темы|название)\s+(.+)$/);
    if (titleMatch?.[1]) {
      return makeAction("set_topic_title", { text, value: titleMatch[1], title: titleMatch[1] });
    }

    const descriptionMatch = normalized.match(/^(?:описание темы|описание|опиши тему|о теме)\s+(.+)$/);
    if (descriptionMatch?.[1]) {
      return makeAction("set_topic_description", {
        text,
        value: descriptionMatch[1],
        description: descriptionMatch[1],
      });
    }

    const iconMatch = normalized.match(/^(?:иконка|выбери иконку|значок)\s+(.+)$/);
    if (iconMatch?.[1]) {
      return makeAction("set_topic_icon", { text, value: iconMatch[1], icon: iconMatch[1] });
    }

    if (["сохрани", "сохранить", "сохрани тему", "сохранить тему", "создай колоду", "создать колоду", "готово"].includes(normalized)) {
      return makeAction("save_topic", { text, value: text });
    }

    if (["включи автогенерацию", "автогенерация", "генерируй карточки"].includes(normalized)) {
      return makeAction("enable_auto_generate", { text, value: text });
    }

    if (["выключи автогенерацию", "без автогенерации", "не генерируй карточки"].includes(normalized)) {
      return makeAction("disable_auto_generate", { text, value: text });
    }

    const countMatch = normalized.match(/^(?:количество карточек|карточек|сгенерируй)\s+(\d+)$/);
    if (countMatch?.[1]) {
      return makeAction("set_cards_count", {
        text,
        value: Number(countMatch[1]),
        count: Number(countMatch[1]),
      });
    }
  }

  if (screen === "topic_manager") {
    const addCardMatch = normalized.match(/^(?:добавь|добавить|создай|создать|новая)\s+карточку\s+(.+)$/);
    if (addCardMatch?.[1]) {
      const card = parseCardText(addCardMatch[1]);
      return makeAction("add_card", { text, value: text, ...card });
    }

    const deleteCardMatch = normalized.match(/^(?:удали|удалить)\s+карточку\s+(?:номер\s+|под номером\s+)?(\d+)$/);
    if (deleteCardMatch?.[1]) {
      return makeAction("delete_card", {
        text,
        value: text,
        card_number: Number(deleteCardMatch[1]),
        number: Number(deleteCardMatch[1]),
      });
    }

    if (["настройки темы", "редактировать тему", "изменить тему"].includes(normalized)) {
      return makeAction("edit_topic", { text, value: text });
    }
  }

  const testTopicMatch = normalized.match(
    /^(?:тест|запусти тест|начни тест|пройди тест|проверка)\s+(?:по теме\s+|тему\s+|колоду\s+|набор\s+)?(.+)$/
  );
  if (testTopicMatch?.[1]) {
    return makeAction("start_test", {
      text,
      value: text,
      ...parseTopicReference(testTopicMatch[1]),
    });
  }

  const editTopicMatch = normalized.match(
    /^(?:редактируй|редактировать|настрой|настроить|измени|изменить)\s+(?:тему\s+|колоду\s+|набор\s+)?(.+)$/
  );
  if (editTopicMatch?.[1]) {
    return makeAction("edit_topic", {
      text,
      value: text,
      ...parseTopicReference(editTopicMatch[1]),
    });
  }

  const deleteTopicMatch = normalized.match(
    /^(?:удали|удалить|скрой|скрыть)\s+(?:тему\s+|колоду\s+|набор\s+)?(.+)$/
  );
  if (deleteTopicMatch?.[1]) {
    return makeAction("delete_topic", {
      text,
      value: text,
      ...parseTopicReference(deleteTopicMatch[1]),
    });
  }

  const topicMatch = normalized.match(
    /^(?:открой|запусти|начни|изучай|изучить)\s+(?:тему\s+)?(.+)$/
  );
  if (topicMatch?.[1]) {
    const topicTitle = topicMatch[1].trim();
    return makeAction("start_topic", {
      text,
      value: text,
      ...parseTopicReference(topicTitle),
    });
  }

  if (screen === "study") {
    if (["покажи ответ", "открой ответ", "переверни", "переверни карточку"].includes(normalized)) {
      return makeAction("reveal_answer", { text, value: text });
    }

    if (["знаю", "я знаю", "правильно", "верно", "следующая", "следующая карточка", "дальше"].includes(normalized)) {
      return makeAction("mark_known", { text, value: text });
    }

    if (["не запомнил", "неверно", "неправильно", "ошибка", "пропустить"].includes(normalized)) {
      return makeAction("mark_unknown", { text, value: text });
    }

    if (["повтори вопрос", "прочитай вопрос", "что на карточке", "повтори карточку"].includes(normalized)) {
      return makeAction("repeat_card", { text, value: text });
    }

    if (
      normalized === "не знаю" ||
      normalized === "я не знаю" ||
      normalized === "не помню" ||
      normalized === "сдаюсь"
    ) {
      return makeAction("dont_know_card", { text, value: text, answer: text });
    }

    return makeAction("check_answer", {
      answer: text,
      text,
      value: text,
      spoken_answer: text,
    });
  }

  if (screen === "tests_select" && testTopicMatch?.[1]) {
    return makeAction("start_test", {
      text,
      value: text,
      ...parseTopicReference(testTopicMatch[1]),
    });
  }

  if (screen === "test_quiz") {
    const optionMatch = normalized.match(/^(?:вариант|ответ|выбери|номер)\s+(.+)$/);
    const optionNumber = optionMatch?.[1] ? readSpokenNumber(optionMatch[1]) : readSpokenNumber(normalized);
    if (optionNumber) {
      return makeAction("answer_test_option", {
        text,
        value: text,
        option_number: optionNumber,
        number: optionNumber,
      });
    }

    const answerText = text.replace(/^(ответ|мой ответ|я думаю|думаю что|думаю)\s+/i, "").trim();
    return makeAction("answer_test_text", {
      answer: answerText,
      text,
      value: text,
    });
  }

  if (screen === "test_results" && ["повторить тест", "повтори тест", "еще раз тест"].includes(normalized)) {
    return makeAction("repeat_test", { text, value: text });
  }

  return makeAction("browser_text", { text, value: text });
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;

  const browserWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
};

const getActionPayload = (data: Record<string, unknown>): Record<string, unknown> | null => {
  const action = data.action;
  return isRecord(action) ? action : null;
};

const getActionId = (data: Record<string, unknown>): string => {
  const action = getActionPayload(data);
  return typeof action?.action_id === "string" ? action.action_id : "";
};

const getActionParameters = (data: Record<string, unknown>): Record<string, unknown> => {
  const action = getActionPayload(data);
  return isRecord(action?.parameters) ? action.parameters : {};
};

export const createBrowserSpeechAssistant = ({
  getState,
  onAction,
  onError,
  onRecognition,
  onTts,
}: BrowserSpeechOptions): {
  assistant: VoiceAssistant;
  startListening: () => boolean;
  disabledReason?: string;
} => {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const SpeechRecognition = getSpeechRecognitionConstructor();
  let recognition: SpeechRecognitionLike | null = null;
  let isListening = false;
  let lastTranscript = "";
  const listenStatusSubscribers = new Set<(status: string) => void>();
  const hypothesisSubscribers = new Set<(text: string, last?: boolean) => void>();

  const emit = (event: string, payload: unknown) => {
    listeners.get(event)?.forEach((handler) => handler(payload));
  };

  const publishRecognition = (state: BrowserRecognitionState) => {
    onRecognition(state);
    listenStatusSubscribers.forEach((handler) => handler(state.status));
    hypothesisSubscribers.forEach((handler) => handler(state.text, state.final));
  };

  const assistant: VoiceAssistant = {
    on: (event, handler) => {
      const handlers = listeners.get(event) ?? new Set<(payload: unknown) => void>();
      handlers.add(handler);
      listeners.set(event, handlers);
      return () => handlers.delete(handler);
    },
    sendData: (data, onData) => {
      if (getActionId(data) === "voice_feedback") {
        const params = getActionParameters(data);
        const text = typeof params.text === "string" ? params.text : "";

        if (text && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "ru-RU";
          utterance.onstart = () => {
            onTts?.({ state: "start", owner: "browser" });
            emit("tts", { state: "start", owner: "browser" });
          };
          utterance.onend = () => {
            onTts?.({ state: "end", owner: "browser" });
            emit("tts", { state: "end", owner: "browser" });
          };
          utterance.onerror = () => {
            onTts?.({ state: "end", owner: "browser" });
            emit("tts", { state: "end", owner: "browser" });
          };
          window.speechSynthesis.speak(utterance);
        }
      }

      onData?.({ type: "browser", payload: null });
      return () => {};
    },
    getInitialData: () => ({}),
    close: () => {
      recognition?.abort();
      recognition = null;
      isListening = false;
      renderCompactNativePanel({ hideNativePanel: true });
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    },
  };

  const startListening = (): boolean => {
    if (!SpeechRecognition) {
      onError("Браузер не поддерживает голосовое распознавание. Используйте Chrome или Edge.");
      return false;
    }

    if (isListening) {
      return true;
    }

    lastTranscript = "";
    recognition?.abort();
    recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      publishRecognition({ text: "", final: false, status: "listen" });
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let final = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        transcript += result[0]?.transcript ?? "";
        final ||= result.isFinal;
      }

      transcript = transcript.trim();
      if (transcript) {
        lastTranscript = transcript;
      }

      publishRecognition({
        text: transcript || lastTranscript,
        final,
        status: "listen",
      });

      if (final && lastTranscript) {
        const action = buildBrowserAction(lastTranscript, getState());
        if (action) {
          onAction(action, { type: "browser_speech", text: lastTranscript });
        }
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      publishRecognition({ text: lastTranscript, final: Boolean(lastTranscript), status: "idle" });

      if (event.error && !["aborted", "no-speech"].includes(event.error)) {
        onError(event.message || `Ошибка распознавания речи: ${event.error}`);
      }
    };

    recognition.onend = () => {
      isListening = false;
      publishRecognition({ text: lastTranscript, final: Boolean(lastTranscript), status: "idle" });
    };

    try {
      recognition.start();
      return true;
    } catch (error) {
      isListening = false;
      publishRecognition({ text: lastTranscript, final: Boolean(lastTranscript), status: "idle" });
      onError(error);
      return false;
    }
  };

  const sendPanelText = (text: string) => {
    const action = buildBrowserAction(text, getState());
    if (action) {
      onAction(action, { type: "browser_panel_text", text });
    }
  };

  renderCompactNativePanel({
    hideNativePanel: false,
    defaultText: "Скажи команду или введи ее текстом",
    sendText: sendPanelText,
    onListen: startListening,
    onSubscribeListenStatus: (handler) => {
      listenStatusSubscribers.add(handler);
      return () => listenStatusSubscribers.delete(handler);
    },
    onSubscribeHypotesis: (handler) => {
      hypothesisSubscribers.add(handler);
      return () => hypothesisSubscribers.delete(handler);
    },
    suggestions: [
      { title: "Покажи темы", action: { text: "покажи темы" } },
      { title: "Создай тему", action: { text: "создай тему" } },
      { title: "Режим теста", action: { text: "режим теста" } },
    ],
  });

  return {
    assistant,
    startListening,
    disabledReason: SpeechRecognition
      ? undefined
      : "Browser speech recognition is not available in this browser.",
  };
};
