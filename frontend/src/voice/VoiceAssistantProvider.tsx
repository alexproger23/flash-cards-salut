import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createVoiceAssistant,
  formatAssistantError,
  type VoiceAction,
  type VoiceAssistant,
  type VoiceAssistantMode,
} from "./assistantClient";
import { subscribeCompactNativePanelRecognition } from "./compactNativePanel";
import {
  actionMatches,
  findTopicFromAction,
  getActionString,
} from "./flashcardVoice";
import { fetchUserData, type CustomTopic } from "../data/customTopics";
import { topics as baseTopics } from "../data/flashcards";

/** * Вспомогательные функции для путей 
 */
const getTopicPath = (topic: any, mode: 'study' | 'open') => {
  if (mode === 'study') return `/study/${topic.id}`;
  const isBaseTopic = baseTopics.some((baseTopic) => baseTopic.id === topic.id);
  return isBaseTopic ? `/study/${topic.id}` : `/topics/${topic.id}`;
};

export type AssistantScreenState = Record<string, unknown> & {
  screen?: string;
  item_selector?: Record<string, unknown>;
};

export type VoiceActionHandler = (action: VoiceAction) => boolean | void;

type RegisteredHandler = {
  id: number;
  priority: number;
  handler: VoiceActionHandler;
};

type VoiceAssistantContextValue = {
  mode: VoiceAssistantMode;
  error: string;
  disabledReason: string;
  isSpeaking: boolean;
  recognizedFinal: boolean;
  recognizedText: string;
  recognizedStatus: string;
  lastAction: VoiceAction | null;
  setAssistantState: (state: AssistantScreenState) => void;
  registerHandler: (handler: VoiceActionHandler, priority?: number) => () => void;
  sendAssistantAction: (actionId: string, parameters?: Record<string, unknown>) => void;
  startListening: () => boolean;
  speak: (text: string, reason?: string) => void;
  clearError: () => void;
};

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | null>(null);

/**
 * Логика обработки TTS состояний
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringField = (value: unknown, field: string): string => {
  if (!isRecord(value)) return "";
  const candidate = value[field];
  return typeof candidate === "string" ? candidate.toLowerCase() : "";
};

const getTtsState = (event: unknown): string => {
  if (typeof event === "string") return event.toLowerCase();
  const directState = getStringField(event, "state") || getStringField(event, "status");
  if (directState) return directState;
  if (!isRecord(event)) return "";

  const nestedCandidates = [
    (event as any).payload,
    (event as any).tts,
    (event as any).tts_state,
    (event as any).tts_state_update,
    (event as any).smart_app_data,
  ];

  for (const candidate of nestedCandidates) {
    const nestedState = getStringField(candidate, "state") || getStringField(candidate, "status");
    if (nestedState) return nestedState;
  }
  return "";
};

const buildAssistantState = (
  screenState: AssistantScreenState,
  customTopics: CustomTopic[]
): Record<string, unknown> => ({
  ...screenState,
  route: window.location.pathname,
  customTopics: customTopics.map((topic, index) => ({
    number: index + 1,
    id: topic.id,
    title: topic.title,
    cardsCount: topic.cards.length,
  })),
});

type NavigateFn = (to: string | number, options?: { replace?: boolean; state?: any }) => void;

export function VoiceAssistantProvider({ 
  children, 
  navigate 
}: { 
  children: React.ReactNode;
  navigate: NavigateFn; 
}) {
  const assistantRef = useRef<VoiceAssistant | null>(null);
  const startListeningRef = useRef<() => boolean>(() => false);
  const speakingTimeoutRef = useRef<number | null>(null);
  const assistantStateRef = useRef<AssistantScreenState>({ screen: "home" });
  const handlersRef = useRef<RegisteredHandler[]>([]);
  const nextHandlerIdRef = useRef(1);
  const customTopicsRef = useRef<CustomTopic[]>([]);

  const [mode, setMode] = useState<VoiceAssistantMode>("noop");
  const [error, setError] = useState("");
  const [disabledReason, setDisabledReason] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognizedFinal, setRecognizedFinal] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognizedStatus, setRecognizedStatus] = useState("idle");
  const [lastAction, setLastAction] = useState<VoiceAction | null>(null);

  const refreshTopics = useCallback(async () => {
    try {
      const data = await fetchUserData();
      customTopicsRef.current = data.customTopics || [];
    } catch (e) {
      console.error("Ошибка обновления кэша тем для Салют", e);
    }
  }, []);

  useEffect(() => {
    refreshTopics();
  }, [refreshTopics]);

  const sendAssistantAction = useCallback(
    (actionId: string, parameters: Record<string, unknown> = {}) => {
      const assistant = assistantRef.current;
      if (!assistant) return;
      assistant.sendData({
        action: { action_id: actionId, parameters },
      });
    },
    []
  );

  const applyTheme = useCallback(
    (theme: "light" | "dark") => {
      const root = window.document.documentElement;
      root.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
      window.dispatchEvent(new CustomEvent("flashcards-theme-change", { detail: { theme } }));
      sendAssistantAction("set_theme", { theme });
    },
    [sendAssistantAction]
  );

  const startListening = useCallback((): boolean => {
    console.log("Попытка включить микрофон...");
    return startListeningRef.current();
  }, []);

  const speak = useCallback(
    (text: string, reason = "feedback") => {
      if (!text.trim()) return;
      sendAssistantAction("voice_feedback", { value: text, text, reason });
    },
    [sendAssistantAction]
  );

  const handleGlobalAction = useCallback(
    async (action: VoiceAction): Promise<boolean> => {
      if (actionMatches(action, ["go_home", "home", "show_topics", "all_topics"])) {
        navigate("/");
        return true;
      }
      if (actionMatches(action, ["back", "go_back"])) {
        navigate(-1);
        return true;
      }
      if (actionMatches(action, ["open_auth", "login", "show_auth"])) {
        navigate("/auth");
        return true;
      }
      if (actionMatches(action, ["open_tests", "show_tests"])) {
        navigate("/tests");
        return true;
      }
      if (actionMatches(action, ["new_topic", "open_new_topic_form"])) {
        navigate("/topics/new");
        return true;
      }

      if (actionMatches(action, ["set_theme", "toggle_theme"])) {
        if (actionMatches(action, ["toggle_theme"])) {
          const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
          applyTheme(nextTheme);
          return true;
        }

        const requestedTheme = getActionString(action, ["theme", "value"]);
        if (requestedTheme === "dark" || requestedTheme === "light") {
          applyTheme(requestedTheme);
          return true;
        }
      }
      
      if (actionMatches(action, ["open_topic", "start_topic", "start_study"])) {
        const availableTopics = [...customTopicsRef.current, ...baseTopics];
        const topic = await findTopicFromAction(action, availableTopics);
        if (!topic) {
          speak("Не нашла такую тему.", "topic_not_found");
          return true;
        }
        const studyMode = actionMatches(action, ["start_topic", "start_study"]) ? "study" : "open";
        navigate(getTopicPath(topic, studyMode));
        return true;
      }

      if (actionMatches(action, ["start_test"])) {
        const availableTopics = [...customTopicsRef.current, ...baseTopics];
        const topic = await findTopicFromAction(action, availableTopics);
        if (!topic) {
          navigate("/tests");
          return true;
        }
        navigate("/tests", { state: { autoStartTopicId: topic.id } });
        return true;
      }

      if (actionMatches(action, ["edit_topic"])) {
        const availableTopics = [...customTopicsRef.current, ...baseTopics];
        const topic = await findTopicFromAction(action, availableTopics);
        if (!topic) {
          speak("Не нашла такую тему.", "topic_not_found");
          return true;
        }

        const isBaseTopic = baseTopics.some((baseTopic) => baseTopic.id === topic.id);
        if (isBaseTopic) {
          speak("Стандартную тему можно только тренировать или пройти в тесте.", "base_topic_edit_blocked");
          return true;
        }

        navigate(`/topics/${topic.id}`);
        return true;
      }
      
      return false;
    },
    [applyTheme, navigate, speak]
  );

  const dispatchAction = useCallback(
    async (action: VoiceAction) => {
      console.log(">>> САЛЮТ ПРИСЛАЛ ЭКШЕН:", action.type, action);
      setLastAction(action);
      setError("");
      
      const handlers = [...handlersRef.current].sort((a, b) => b.priority - a.priority || b.id - a.id);
      
      for (const { handler } of handlers) {
        if (handler(action)) {
            console.log("Экшен обработан локальным хэндлером");
            return;
        }
      }
      
      if (await handleGlobalAction(action)) return;
      
      console.warn("Команда не была обработана ни одним хэндлером");
      speak("Команда пока не поддерживается.", "unsupported_action");
    },
    [handleGlobalAction, speak]
  );

  // Чтобы useEffect не перезапускался при каждом изменении dispatchAction,
  // используем Ref для актуальной функции обработки
  const dispatchRef = useRef(dispatchAction);
  useEffect(() => {
    dispatchRef.current = dispatchAction;
  }, [dispatchAction]);

  const setAssistantState = useCallback((state: AssistantScreenState) => {
    assistantStateRef.current = state;
    if (state.screen !== "study") {
      setRecognizedFinal(false);
      setRecognizedText("");
      setRecognizedStatus("idle");
      setIsSpeaking(false);
    }
  }, []);

  const registerHandler = useCallback((handler: VoiceActionHandler, priority = 0) => {
    const id = nextHandlerIdRef.current;
    nextHandlerIdRef.current += 1;
    handlersRef.current = [...handlersRef.current, { id, priority, handler }];
    console.log(`Зарегистрирован новый хэндлер (ID: ${id}, Priority: ${priority})`);
    return () => {
      handlersRef.current = handlersRef.current.filter((entry) => entry.id !== id);
      console.log(`Удален хэндлер (ID: ${id})`);
    };
  }, []);

  const clearSpeakingTimeout = useCallback(() => {
    if (speakingTimeoutRef.current !== null) {
      window.clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const unsubscribeRecognition = subscribeCompactNativePanelRecognition((state) => {
      setRecognizedFinal(state.final);
      setRecognizedText(state.text);
      setRecognizedStatus(state.status);
    });

    const setup = createVoiceAssistant({
      getState: () => buildAssistantState(assistantStateRef.current, customTopicsRef.current),
      getRecoveryState: () => ({
        state: buildAssistantState(assistantStateRef.current, customTopicsRef.current),
        topics: [...customTopicsRef.current, ...baseTopics],
      }),
      // Используем Ref, чтобы обработчик всегда был актуальным без перезапуска эффекта
      onAction: (action) => dispatchRef.current(action),
      onError: (event) => {
        const message = formatAssistantError(event);
        console.error("Salute assistant error:", message, event);
        setError(message);
      },
      onRecognition: (state) => {
        setRecognizedFinal(state.final);
        setRecognizedText(state.text);
        setRecognizedStatus(state.status);
      },
      onTts: (event) => {
        const state = getTtsState(event);
        if (state === "start" || state === "started" || state === "play") {
          clearSpeakingTimeout();
          setIsSpeaking(true);
          speakingTimeoutRef.current = window.setTimeout(() => {
            speakingTimeoutRef.current = null;
            setIsSpeaking(false);
          }, 6000);
        } else if (["stop", "stopped", "end", "done"].includes(state)) {
          clearSpeakingTimeout();
          setIsSpeaking(false);
        }
      },
    });

    assistantRef.current = setup.assistant;
    startListeningRef.current = setup.startListening;
    setMode(setup.mode);
    setDisabledReason(setup.disabledReason || "");

    return () => {
      console.log("Удаление экземпляра ассистента");
      unsubscribeRecognition();
      clearSpeakingTimeout();
      if (setup.assistant) {
        setup.assistant.close?.();
      }
      assistantRef.current = null;
      startListeningRef.current = () => false;
    };
  }, [clearSpeakingTimeout]);

  const contextValue = useMemo(() => ({
    mode, error, disabledReason, isSpeaking, recognizedFinal,
    recognizedText, recognizedStatus, lastAction, setAssistantState,
    registerHandler, sendAssistantAction, startListening, speak,
    clearError: () => setError(""),
  }), [mode, error, disabledReason, isSpeaking, recognizedFinal, recognizedText, recognizedStatus, lastAction, setAssistantState, registerHandler, sendAssistantAction, startListening, speak]);

  return (
    <VoiceAssistantContext.Provider value={contextValue}>
      {children}
      {error && (
        <div className="fixed left-4 right-4 top-4 z-[200] mx-auto max-w-lg rounded-2xl px-5 py-4 text-sm shadow-2xl border bg-card text-foreground border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="font-bold">Ошибка Salute:</span>
            <span className="opacity-90">{error}</span>
            <button onClick={() => setError("")} className="ml-auto opacity-50 hover:opacity-100">✕</button>
          </div>
        </div>
      )}
    </VoiceAssistantContext.Provider>
  );
}

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) throw new Error("useVoiceAssistant must be used inside VoiceAssistantProvider");
  return context;
};

export const useVoiceActionHandler = (handler: VoiceActionHandler, deps: React.DependencyList, priority = 0) => {
  const { registerHandler } = useVoiceAssistant();
  useEffect(() => registerHandler(handler, priority), [registerHandler, priority, ...deps]);
};
