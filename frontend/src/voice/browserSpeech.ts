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

const buildBrowserAction = (
  text: string,
  state: Record<string, unknown>
): VoiceAction | null => {
  const normalized = normalizeSpeechText(text);
  if (!normalized) return null;

  if (["главная", "домой", "на главную", "все темы", "покажи темы"].includes(normalized)) {
    return makeAction("go_home", { text, value: text });
  }

  if (["назад", "вернись", "обратно"].includes(normalized)) {
    return makeAction("go_back", { text, value: text });
  }

  if (
    ["создай тему", "новая тема", "добавь тему", "создать тему"].includes(normalized)
  ) {
    return makeAction("new_topic", { text, value: text });
  }

  const topicMatch = normalized.match(
    /^(?:открой|запусти|начни|изучай|изучить)\s+(?:тему\s+)?(.+)$/
  );
  if (topicMatch?.[1]) {
    const topicTitle = topicMatch[1].trim();
    return makeAction("start_topic", {
      text,
      value: text,
      topic_title: topicTitle,
      title: topicTitle,
    });
  }

  const screen = typeof state.screen === "string" ? state.screen : "";
  if (screen === "study") {
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
