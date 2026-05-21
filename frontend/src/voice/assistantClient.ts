import { createAssistant, createSmartappDebugger } from "@salutejs/client";
import { renderCompactNativePanel, startCompactNativePanelListening } from "./compactNativePanel";
import {
  createBrowserSpeechAssistant,
  type BrowserRecognitionState,
} from "./browserSpeech";

export type VoiceAction = {
  type: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
};

export type VoiceAssistant = {
  on: (event: string, handler: (event: unknown) => void) => (() => void) | void;
  sendData: (
    data: Record<string, unknown>,
    onData?: (data: unknown) => void
  ) => (() => void) | void;
  getInitialData: () => unknown;
  close?: () => void;
};

type CreateVoiceAssistantOptions = {
  getState: () => Record<string, unknown>;
  getRecoveryState: () => Record<string, unknown>;
  onAction: (action: VoiceAction, event: unknown) => void;
  onError: (error: unknown) => void;
  onStart?: (event: unknown, initialData: unknown) => void;
  onTts?: (event: unknown) => void;
  onRecognition?: (state: BrowserRecognitionState) => void;
};

export type VoiceAssistantMode = "debugger" | "canvas" | "browser" | "noop";

export type VoiceAssistantSetup = {
  assistant: VoiceAssistant;
  mode: VoiceAssistantMode;
  disabledReason?: string;
  startListening: () => boolean;
};

const createNoopAssistant = (): VoiceAssistant => ({
  on: () => () => {},
  sendData: (_data, onData) => {
    onData?.({ type: "noop", payload: null });
    return () => {};
  },
  getInitialData: () => ({}),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readBuildEnv = (key: string): string => {
  if (!import.meta.env.DEV) return "";
  const value = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
};

const readStorageValue = (keys: string[]): string => {
  if (typeof window === "undefined") return "";

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  return "";
};

const persistDebuggerSearchParams = () => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const token = url.searchParams.get("saluteToken") || url.searchParams.get("salute_token");
  const smartapp = url.searchParams.get("saluteSmartapp") || url.searchParams.get("salute_smartapp");
  let changed = false;

  if (token?.trim()) {
    window.localStorage.setItem("flashcards.salute.token", token.trim());
    url.searchParams.delete("saluteToken");
    url.searchParams.delete("salute_token");
    changed = true;
  }

  if (smartapp?.trim()) {
    window.localStorage.setItem("flashcards.salute.smartapp", smartapp.trim());
    url.searchParams.delete("saluteSmartapp");
    url.searchParams.delete("salute_smartapp");
    changed = true;
  }

  if (changed) {
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
};

const readSaluteToken = (): string =>
  readBuildEnv("VITE_SALUTE_TOKEN") ||
  readBuildEnv("REACT_APP_TOKEN") ||
  readStorageValue(["flashcards.salute.token", "VITE_SALUTE_TOKEN", "REACT_APP_TOKEN"]);

const readSaluteSmartapp = (): string =>
  readBuildEnv("VITE_SALUTE_SMARTAPP") ||
  readBuildEnv("REACT_APP_SMARTAPP") ||
  readStorageValue(["flashcards.salute.smartapp", "VITE_SALUTE_SMARTAPP", "REACT_APP_SMARTAPP"]);

const normalizeAssistantAction = (action: unknown): VoiceAction | null => {
  if (!isRecord(action)) return null;

  if (typeof action.action_id === "string") {
    const parameters = isRecord(action.parameters) ? action.parameters : {};
    return {
      type: action.action_id,
      parameters,
      ...parameters,
    };
  }

  if (typeof action.type === "string") {
    const payload = isRecord(action.payload) ? action.payload : {};
    const parameters = isRecord(action.parameters) ? action.parameters : {};
    return {
      ...action,
      ...payload,
      ...parameters,
      parameters,
      type: action.type,
    };
  }
  return null;
};

const ignoredAssistantDataTypes = new Set([
  "app_context", "asr", "character", "feature_launcher", "insets",
  "listen", "minimum_static_insets", "maximum_static_insets",
  "dynamic_insets", "tts", "tts_state_update",
]);

export const extractAssistantAction = (event: unknown): VoiceAction | null => {
  if (!isRecord(event)) return null;
  if (typeof event.type === "string" && ignoredAssistantDataTypes.has(event.type)) return null;

  const candidate =
    normalizeAssistantAction(event.action) ||
    normalizeAssistantAction((event.command as Record<string, unknown> | undefined)?.action) ||
    normalizeAssistantAction((event.smart_app_data as Record<string, unknown> | undefined)?.action) ||
    normalizeAssistantAction(((event.smart_app_data as Record<string, unknown> | undefined)?.command as Record<string, unknown> | undefined)?.action) ||
    normalizeAssistantAction(((event.smart_app_data as Record<string, unknown> | undefined)?.payload as Record<string, unknown> | undefined)?.action) ||
    normalizeAssistantAction((event.payload as Record<string, unknown> | undefined)?.action);

  if (candidate) return candidate;
  if (event.type === "smart_app_data" && isRecord(event.smart_app_data)) {
    return normalizeAssistantAction(event.smart_app_data);
  }
  return null;
};

const safeJsonStringify = (value: unknown): string => {
  try { return JSON.stringify(value); } catch { return String(value); }
};

export const formatAssistantError = (error: unknown): string => {
  if (!error) return "Неизвестная ошибка Salute SDK.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof Event !== "undefined" && error instanceof Event) {
    const target = error.target as { url?: string; src?: string } | null;
    return `Salute transport error: ${error.type || "event"}${target?.url || target?.src ? ` ${target?.url || target?.src}` : ""}`;
  }
  if (isRecord(error)) {
    if (typeof error.description === "string") return error.description;
    if (typeof error.message === "string") return error.message;
    if (typeof error.code !== "undefined") return `Salute error code ${String(error.code)}`;
  }
  return safeJsonStringify(error);
};

export const createVoiceAssistant = ({
  getState,
  getRecoveryState,
  onAction,
  onError,
  onStart,
  onTts,
  onRecognition,
}: CreateVoiceAssistantOptions): VoiceAssistantSetup => {
  persistDebuggerSearchParams();

  const token = readSaluteToken();
  const smartapp = readSaluteSmartapp();
  
  const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  let assistant: VoiceAssistant;
  let mode: VoiceAssistantMode;
  let disabledReason: string | undefined;
  let startListening = startCompactNativePanelListening;

  const hasAssistantHost = typeof window !== "undefined" && Boolean((window as any).AssistantHost);

  if (token && smartapp) {
    assistant = createSmartappDebugger({
      token,
      initPhrase: `Запусти ${smartapp}`,
      getState,
      getRecoveryState,
      nativePanel: {
        render: renderCompactNativePanel,
        hideNativePanel: false,
        defaultText: "Скажи команду или введи ее текстом",
        screenshotMode: false,
        tabIndex: 0,
      },
    });
    mode = "debugger";
  } else if (hasAssistantHost) {
    assistant = createAssistant({
      getState,
      getRecoveryState,
    });
    mode = "canvas";
  } else {
    const browserSetup = createBrowserSpeechAssistant({
      getState,
      onAction,
      onError,
      onTts,
      onRecognition: onRecognition || (() => {}),
    });

    assistant = browserSetup.assistant;
    startListening = browserSetup.startListening;
    mode = "browser";
    disabledReason = browserSetup.disabledReason;

    if (token && smartapp) {
      console.info("AssistantHost не обнаружен. Используется браузерное распознавание речи.");
    } else {
      console.info("Salute debugger не настроен. Используется браузерное распознавание речи.");
    }
  }

  assistant.on("start", (event) => {
    assistant.sendData({
      action: {
        action_id: "set_theme",
        parameters: { theme: currentTheme }
      }
    });
    onStart?.(event, assistant.getInitialData());
  });

  assistant.on("data", (event) => {
    if (!isRecord(event)) return;
    if (typeof event.type === "string" && ignoredAssistantDataTypes.has(event.type)) return;
    if (event.type === "smart_app_error") {
      onError(event.smart_app_error);
      return;
    }
    const action = extractAssistantAction(event);
    if (action) {
      onAction(action, event);
      return;
    }
  });

  assistant.on("error", onError);
  
  assistant.on("tts", (event) => {
    console.log("assistant.on(tts)", event);
    onTts?.(event);
  });

  return { 
    assistant, 
    mode, 
    disabledReason, 
    startListening
  };
};
