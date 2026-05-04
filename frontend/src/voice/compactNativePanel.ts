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

let root: HTMLDivElement | null = null;
let unsubscribeListen: (() => void) | void;
let unsubscribeHypotesis: (() => void) | void;
let listenStatus = "idle";
let hypothesis = "";

// ИСПОЛЬЗУЕМ ПЕРЕМЕННЫЕ ТЕМЫ
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
    background: #ef4444; /* Цвет записи */
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
  return "Готова к команде";
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

  mic?.addEventListener("click", () => props.onListen?.());

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
  if (props.hideNativePanel) {
    root?.remove();
    root = null;
    unsubscribeListen?.();
    unsubscribeHypotesis?.();
    unsubscribeListen = undefined;
    unsubscribeHypotesis = undefined;
    return;
  }

  unsubscribeListen?.();
  unsubscribeHypotesis?.();

  unsubscribeListen = props.onSubscribeListenStatus?.((status) => {
    listenStatus = status;
    render(props);
  });

  unsubscribeHypotesis = props.onSubscribeHypotesis?.((text, last) => {
    hypothesis = last ? "" : text;
    render(props);
  });

  render(props);
};