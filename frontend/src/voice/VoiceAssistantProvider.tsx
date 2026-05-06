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
<<<<<<< HEAD:frontend/src/voice/VoiceAssistantProvider.tsx
import {
  actionMatches,
  findTopicFromAction,
  getCardBackFromAction,
  getCardFrontFromAction,
  getTopicDescriptionFromAction,
  getTopicTitleFromAction,
  isCustomVoiceTopic,
  type VoiceTopic,
} from "./flashcardVoice";
// Новые импорты для работы с сервером
import { fetchUserData, saveCustomTopic, type CustomTopic } from "../data/customTopics";
import { topics as baseTopics } from "../data/flashcards";

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

type Navigate = (to: string | number, options?: NavigateOptions) => void;
=======
import { subscribeCompactNativePanelRecognition } from "./compactNativePanel";
import { getAllVoiceTopics } from "./flashcardVoice";
import { loadCustomTopics } from "../data/customTopics";
>>>>>>> df347738be23e3ef152b1d04b42d68ee096a0191:frontend/src/app/voice/VoiceAssistantProvider.tsx

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringField = (value: unknown, field: string): string => {
  if (!isRecord(value)) {
    return "";
  }
<<<<<<< HEAD:frontend/src/voice/VoiceAssistantProvider.tsx
  return isCustomVoiceTopic(topic) ? `/topics/${topic.id}` : `/study/${topic.id}`;
=======

  const candidate = value[field];
  return typeof candidate === "string" ? candidate.toLowerCase() : "";
};

const getTtsState = (event: unknown): string => {
  if (typeof event === "string") {
    return event.toLowerCase();
  }

  const directState = getStringField(event, "state") || getStringField(event, "status");
  if (directState) {
    return directState;
  }

  if (!isRecord(event)) {
    return "";
  }

  const nestedCandidates = [
    event.payload,
    event.tts,
    event.tts_state,
    event.tts_state_update,
    event.smart_app_data,
  ];

  for (const candidate of nestedCandidates) {
    const nestedState = getStringField(candidate, "state") || getStringField(candidate, "status");
    if (nestedState) {
      return nestedState;
    }
  }

  return "";
>>>>>>> df347738be23e3ef152b1d04b42d68ee096a0191:frontend/src/app/voice/VoiceAssistantProvider.tsx
};

// Функция сборки состояния теперь принимает актуальный список тем
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

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const assistantRef = useRef<VoiceAssistant | null>(null);
  const startListeningRef = useRef<() => boolean>(() => false);
  const speakingTimeoutRef = useRef<number | null>(null);
  const assistantStateRef = useRef<AssistantScreenState>({ screen: "home" });
  const handlersRef = useRef<RegisteredHandler[]>([]);
  const nextHandlerIdRef = useRef(1);
  
  // Кэш тем для моментальных синхронных ответов ассистенту
  const customTopicsRef = useRef<CustomTopic[]>([]);

  const [mode, setMode] = useState<VoiceAssistantMode>("noop");
  const [error, setError] = useState("");
  const [disabledReason, setDisabledReason] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognizedFinal, setRecognizedFinal] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognizedStatus, setRecognizedStatus] = useState("idle");
  const [lastAction, setLastAction] = useState<VoiceAction | null>(null);

  // Функция для фонового обновления кэша тем
  const refreshTopics = useCallback(async () => {
    try {
      const data = await fetchUserData();
      customTopicsRef.current = data.customTopics || [];
    } catch (e) {
      console.error("Ошибка обновления кэша тем для Салют", e);
    }
  }, []);

  // Обновляем кэш при первом запуске
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

  const startListening = useCallback((): boolean => startListeningRef.current(), []);

  const speak = useCallback(
    (text: string, reason = "feedback") => {
      if (!text.trim()) return;
      sendAssistantAction("voice_feedback", { value: text, text, reason });
    },
    [sendAssistantAction]
  );

<<<<<<< HEAD:frontend/src/voice/VoiceAssistantProvider.tsx
  // Теперь эта функция асинхронная
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
      if (actionMatches(action, ["new_topic", "open_new_topic_form"])) {
        navigate("/topics/new");
        return true;
      }
      
      // Создание новой темы голосом
      if (actionMatches(action, ["create_topic"])) {
        const title = getTopicTitleFromAction(action);
        if (!title) {
          navigate("/topics/new");
          return true;
        }
        
        const newTopic: CustomTopic = {
          id: `custom-${Date.now()}`,
          title,
          description: getTopicDescriptionFromAction(action) || "",
          emoji: "📝",
          frontLabel: "Вопрос",
          backLabel: "Ответ",
          color: "#f0f4ff",
          cards: [],
          isCustom: true
        };
        
        await saveCustomTopic(newTopic);
        await refreshTopics(); // Обновляем кэш для ассистента
        
        navigate(`/topics/${newTopic.id}`);
        speak(`Тема ${newTopic.title} создана. Можно добавлять карточки.`, "topic_created");
        return true;
      }
      
      if (actionMatches(action, ["open_topic", "start_topic", "start_study", "practice_topic"])) {
        const availableTopics = [...customTopicsRef.current, ...baseTopics];
        const topic = await findTopicFromAction(action, availableTopics);
        if (!topic) {
          speak("Не нашла такую тему.", "topic_not_found");
          return true;
        }
        const mode = actionMatches(action, ["start_topic", "start_study", "practice_topic"])
          ? "study"
          : "open";
        navigate(getTopicPath(topic, mode));
        return true;
      }
      
      // Добавление карточки голосом
      if (actionMatches(action, ["add_card", "create_card"])) {
        const availableTopics = [...customTopicsRef.current, ...baseTopics];
        const topic = await findTopicFromAction(action, availableTopics);
        const front = getCardFrontFromAction(action);
        const back = getCardBackFromAction(action);
        
        if (!topic || !isCustomVoiceTopic(topic)) {
          speak("Карточки можно добавлять только в свою тему.", "card_topic_missing");
          return true;
        }
        if (!front || !back) {
          navigate(`/topics/${topic.id}`);
          speak("Открой тему и продиктуй вопрос и ответ для новой карточки.", "card_data_missing");
          return true;
        }
        
        const newCard = { id: Date.now().toString(), front, back };
        const updatedTopic = { ...topic, cards: [...topic.cards, newCard] };
        
        await saveCustomTopic(updatedTopic);
        await refreshTopics(); // Обновляем кэш
        
        navigate(`/topics/${updatedTopic.id}`);
        speak("Карточка добавлена.", "card_created");
        return true;
      }
      return false;
    },
    [navigate, speak, refreshTopics]
  );

  // Сделали обработчик действий асинхронным
=======
>>>>>>> df347738be23e3ef152b1d04b42d68ee096a0191:frontend/src/app/voice/VoiceAssistantProvider.tsx
  const dispatchAction = useCallback(
    async (action: VoiceAction) => {
      setLastAction(action);
      setError("");
<<<<<<< HEAD:frontend/src/voice/VoiceAssistantProvider.tsx
=======

      if (assistantStateRef.current.screen !== "study") {
        console.warn("Ignoring assistant action outside study screen", action);
        return;
      }

>>>>>>> df347738be23e3ef152b1d04b42d68ee096a0191:frontend/src/app/voice/VoiceAssistantProvider.tsx
      const handlers = [...handlersRef.current].sort((a, b) => b.priority - a.priority || b.id - a.id);
      
      for (const { handler } of handlers) {
        if (handler(action)) return;
      }
<<<<<<< HEAD:frontend/src/voice/VoiceAssistantProvider.tsx
      
      if (await handleGlobalAction(action)) return;
      
      speak("Команда пока не поддерживается.", "unsupported_action");
=======

      console.warn("Unsupported study assistant action received", action);
>>>>>>> df347738be23e3ef152b1d04b42d68ee096a0191:frontend/src/app/voice/VoiceAssistantProvider.tsx
    },
    []
  );

  const setAssistantState = useCallback(
    (state: AssistantScreenState) => {
      assistantStateRef.current = state;

      if (state.screen !== "study") {
        setRecognizedFinal(false);
        setRecognizedText("");
        setRecognizedStatus("idle");
        setIsSpeaking(false);
      }
    },
    []
  );

  const registerHandler = useCallback((handler: VoiceActionHandler, priority = 0) => {
    const id = nextHandlerIdRef.current;
    nextHandlerIdRef.current += 1;
    handlersRef.current = [...handlersRef.current, { id, priority, handler }];
    return () => {
      handlersRef.current = handlersRef.current.filter((entry) => entry.id !== id);
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
      onAction: (action) => dispatchAction(action),
      onError: (event) => {
        const message = formatAssistantError(event);
        setError(message);
      },
      onStart: (_event, initialData) => {
        console.log("assistant.on(start)", initialData);
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
        }

        if (state === "stop" || state === "stopped" || state === "end" || state === "done") {
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
      unsubscribeRecognition();
      clearSpeakingTimeout();
      setup.assistant.close?.();
      assistantRef.current = null;
      startListeningRef.current = () => false;
    };
  }, [clearSpeakingTimeout, dispatchAction]);

  const contextValue = useMemo<VoiceAssistantContextValue>(
    () => ({
      mode,
      error,
      disabledReason,
      isSpeaking,
      recognizedFinal,
      recognizedText,
      recognizedStatus,
      lastAction,
      setAssistantState,
      registerHandler,
      sendAssistantAction,
      startListening,
      speak,
      clearError: () => setError(""),
    }),
<<<<<<< HEAD:frontend/src/voice/VoiceAssistantProvider.tsx
    [disabledReason, error, lastAction, mode, registerHandler, sendAssistantAction, setAssistantState, speak]
=======
    [
      disabledReason,
      error,
      isSpeaking,
      lastAction,
      mode,
      recognizedFinal,
      recognizedText,
      recognizedStatus,
      registerHandler,
      sendAssistantAction,
      setAssistantState,
      startListening,
      speak,
    ]
>>>>>>> df347738be23e3ef152b1d04b42d68ee096a0191:frontend/src/app/voice/VoiceAssistantProvider.tsx
  );

  return (
    <VoiceAssistantContext.Provider value={contextValue}>
      {children}
      {error ? (
        <div
          role="alert"
          className="fixed left-4 right-4 top-4 z-[200] mx-auto max-w-lg rounded-2xl px-5 py-4 text-sm shadow-2xl border animate-in slide-in-from-top-4 bg-card text-foreground border-destructive/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="font-bold">Ошибка Salute:</span>
            <span className="opacity-90">{error}</span>
          </div>
        </div>
      ) : null}
    </VoiceAssistantContext.Provider>
  );
}

export const useVoiceAssistant = (): VoiceAssistantContextValue => {
  const context = useContext(VoiceAssistantContext);
  if (!context) throw new Error("useVoiceAssistant must be used inside VoiceAssistantProvider");
  return context;
};

export const useVoiceActionHandler = (
  handler: VoiceActionHandler,
  deps: React.DependencyList,
  priority = 0
) => {
  const { registerHandler } = useVoiceAssistant();
  useEffect(() => registerHandler(handler, priority), [registerHandler, priority, ...deps]);
};