type NativePanelSuggestion = {
  title?: string;
  action?: {
    text?: string;
  };
};

type CompactNativePanelProps = {
  defaultText?: string;
  hideNativePanel?: boolean;
  suggestions?: NativePanelSuggestion[];
  bubbleText?: string;
  sendText?: (text: string) => void;
  onListen?: () => void;
  onSubscribeListenStatus?: (handler: (status: string) => void) => (() => void) | void;
  onSubscribeHypotesis?: (handler: (text: string, last?: boolean) => void) => (() => void) | void;
};

type RecognitionState = {
  text: string;
  final: boolean;
  status: string;
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

let root: HTMLDivElement | null = null;
let unsubscribeListen: (() => void) | void;
let unsubscribeHypotesis: (() => void) | void;
let listenStatus = "idle";
let hypothesis = "";
let currentListenHandler: (() => void) | undefined;
let currentPanelProps: CompactNativePanelProps | null = null;
let fallbackRecognition: SpeechRecognitionLike | null = null;
let fallbackTimer: number | null = null;
const recognitionSubscribers = new Set<(state: RecognitionState) => void>();

const getRecognitionState = (final = false): RecognitionState => ({
  text: hypothesis,
  final,
  status: listenStatus,
});

const notifyRecognitionSubscribers = (final = false) => {
  const state = getRecognitionState(final);
  recognitionSubscribers.forEach((subscriber) => subscriber(state));
};

const panelStyles = `
  .FlashcardsSalutePanel {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1000;
    width: min(340px, calc(100vw - 32px));
    color: var(--foreground);
    font-family: Inter, system-ui, sans-serif;
    transition: all 0.3s ease;
  }

  .FlashcardsSalutePanel__shell {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--card);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(12px);
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }

  .FlashcardsSalutePanel__row {
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 8px;
    align-items: center;
  }

  .FlashcardsSalutePanel__mic {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 12px;
    color: #fff;
    background: var(--primary);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .FlashcardsSalutePanel__mic:hover {
    filter: brightness(1.1);
  }

  .FlashcardsSalutePanel__mic[data-active="true"] {
    background: #ef4444;
    animation: pulse-red 1.5s infinite;
  }

  @keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  .FlashcardsSalutePanel__input {
    width: 100%;
    height: 38px;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: 12px;
    outline: 0;
    padding: 0 12px;
    color: var(--foreground);
    background: var(--muted);
    font: inherit;
    font-size: 13px;
    transition: all 0.2s ease;
  }

  .FlashcardsSalutePanel__input:focus {
    border-color: var(--primary);
    background: var(--card);
  }

  .FlashcardsSalutePanel__status {
    min-height: 16px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--foreground);
    opacity: 0.6;
    font-size: 11px;
    padding-left: 4px;
  }

  .FlashcardsSalutePanel__suggests {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-top: 4px;
  }

  .FlashcardsSalutePanel__suggests::-webkit-scrollbar { display: none; }

  .FlashcardsSalutePanel__suggest {
    flex: 0 0 auto;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 12px;
    color: var(--foreground);
    background: var(--muted);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .FlashcardsSalutePanel__suggest:hover {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
  }
`;

const ensureRoot = (): HTMLDivElement => {
  if (root) return root;
  root = document.createElement("div");
  root.id = "FlashcardsSalutePanel";
  root.className = "FlashcardsSalutePanel";
  document.body.appendChild(root);
  return root;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getStatusText = (bubbleText?: string): string => {
  if (hypothesis) return hypothesis;
  if (bubbleText) return bubbleText;
  if (listenStatus === "listen") return "Слушаю...";
  if (listenStatus === "error") return "Микрофон недоступен";
  return "Готова к команде";
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  const browserWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
};

const updateFallbackState = (props: CompactNativePanelProps, final = false) => {
  notifyRecognitionSubscribers(final);
  if (!props.hideNativePanel) {
    render(props);
  }
};

const startBrowserFallbackListening = (props: CompactNativePanelProps): boolean => {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  if (!SpeechRecognition) {
    listenStatus = "error";
    hypothesis = "Браузер не поддерживает распознавание речи";
    updateFallbackState(props, true);
    return false;
  }

  let lastTranscript = "";
  let sent = false;

  fallbackRecognition?.abort();
  fallbackRecognition = new SpeechRecognition();
  fallbackRecognition.lang = "ru-RU";
  fallbackRecognition.continuous = false;
  fallbackRecognition.interimResults = true;
  fallbackRecognition.maxAlternatives = 1;

  fallbackRecognition.onstart = () => {
    listenStatus = "listen";
    hypothesis = "";
    updateFallbackState(props, false);
  };

  fallbackRecognition.onresult = (event) => {
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
      hypothesis = transcript;
    }

    updateFallbackState(props, final);

    if (final && lastTranscript && !sent) {
      sent = true;
      props.sendText?.(lastTranscript);
    }
  };

  fallbackRecognition.onerror = (event) => {
    listenStatus = "error";
    hypothesis = event.message || (event.error ? `Ошибка микрофона: ${event.error}` : "Ошибка микрофона");
    updateFallbackState(props, true);
  };

  fallbackRecognition.onend = () => {
    if (lastTranscript && !sent) {
      sent = true;
      props.sendText?.(lastTranscript);
    }

    listenStatus = "idle";
    updateFallbackState(props, Boolean(lastTranscript));
  };

  try {
    fallbackRecognition.start();
    return true;
  } catch (error) {
    listenStatus = "error";
    hypothesis = error instanceof Error ? error.message : "Не удалось включить микрофон";
    updateFallbackState(props, true);
    return false;
  }
};

const startPanelListening = (props: CompactNativePanelProps): boolean => {
  props.onListen?.();

  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer);
  }

  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null;
    if (listenStatus !== "listen") {
      startBrowserFallbackListening(props);
    }
  }, 700);

  return true;
};

const render = (props: CompactNativePanelProps) => {
  const container = ensureRoot();
  const active = listenStatus === "listen";
  const suggestions = (props.suggestions || [])
    .map((suggestion) => suggestion.action?.text || suggestion.title || "")
    .filter(Boolean)
    .slice(0, 4);

  container.innerHTML = `
    <style>${panelStyles}</style>
    <div class="FlashcardsSalutePanel__shell">
      <div class="FlashcardsSalutePanel__row">
        <button
          class="FlashcardsSalutePanel__mic"
          type="button"
          data-active="${active ? "true" : "false"}"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
        <input
          class="FlashcardsSalutePanel__input"
          type="text"
          placeholder="${escapeHtml(props.defaultText || "Скажи команду")}"
        />
      </div>
      <div class="FlashcardsSalutePanel__status">${escapeHtml(getStatusText(props.bubbleText))}</div>
      ${
        suggestions.length
          ? `<div class="FlashcardsSalutePanel__suggests">${suggestions
              .map(
                (suggestion) =>
                  `<button class="FlashcardsSalutePanel__suggest" type="button">${escapeHtml(suggestion)}</button>`
              )
              .join("")}</div>`
          : ""
      }
    </div>
  `;

  const mic = container.querySelector<HTMLButtonElement>(".FlashcardsSalutePanel__mic");
  const input = container.querySelector<HTMLInputElement>(".FlashcardsSalutePanel__input");
  const suggestButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>(".FlashcardsSalutePanel__suggest")
  );

  mic?.addEventListener("click", () => startPanelListening(props));

  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const text = input.value.trim();
    if (!text) return;
    props.sendText?.(text);
    input.value = "";
  });

  suggestButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.textContent?.trim();
      if (text) props.sendText?.(text);
    });
  });
};

export const renderCompactNativePanel = (props: CompactNativePanelProps) => {
  currentListenHandler = props.onListen;
  currentPanelProps = props;

  unsubscribeListen?.();
  unsubscribeHypotesis?.();

  unsubscribeListen = props.onSubscribeListenStatus?.((status) => {
    listenStatus = status;

    if (status === "listen") {
      hypothesis = "";
    }

    notifyRecognitionSubscribers(false);

    if (!props.hideNativePanel) {
      render(props);
    }
  });

  unsubscribeHypotesis = props.onSubscribeHypotesis?.((text, last) => {
    hypothesis = text.trim();
    notifyRecognitionSubscribers(Boolean(last));

    if (!props.hideNativePanel) {
      render(props);
    }
  });

  if (props.hideNativePanel) {
    root?.remove();
    root = null;
    return;
  }

  render(props);
};

export const startCompactNativePanelListening = (): boolean => {
  if (!currentListenHandler && !currentPanelProps) {
    return false;
  }

  if (currentPanelProps) {
    startPanelListening(currentPanelProps);
  } else {
    currentListenHandler?.();
  }
  return true;
};

export const subscribeCompactNativePanelRecognition = (
  subscriber: (state: RecognitionState) => void
): (() => void) => {
  subscriber(getRecognitionState());
  recognitionSubscribers.add(subscriber);

  return () => {
    recognitionSubscribers.delete(subscriber);
  };
};
