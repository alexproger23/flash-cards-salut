import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// useNavigate УДАЛЕН отсюда
import {
  createVoiceAssistant,
  formatAssistantError,
  type VoiceAction,
  type VoiceAssistant,
  type VoiceAssistantMode,
} from "./assistantClient";
import {
  actionMatches,
  findTopicFromAction,
  getTopicDescriptionFromAction,
  getTopicTitleFromAction,
} from "./flashcardVoice";
import { fetchUserData, saveCustomTopic, type CustomTopic } from "../data/customTopics";
import { topics as baseTopics } from "../data/flashcards";

// Вспомогательная функция для определения пути темы
const getTopicPath = (topic: any, mode: 'study' | 'open') => {
  return mode === 'study' ? `/study/${topic.id}` : `/topics/${topic.id}`;
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
    event.payload,
    event.tts,
    event.tts_state,
    event.tts_state_update,
    event.smart_app_data,
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

// Добавлен тип для пропса navigate
type NavigateFn = (to: string | number, options?: { replace?: boolean; state?: any }) => void;

export function VoiceAssistantProvider({ 
  children, 
  navigate // Теперь получаем navigate из пропсов
}: { 
  children: React.ReactNode;
  navigate: NavigateFn; 
}) {
  // const navigate = useNavigate(); <--- ЭТА СТРОКА УДАЛЕНА
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

  const startListening = useCallback((): boolean => startListeningRef.current(), []);

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
      if (actionMatches(action, ["new_topic", "open_new_topic_form"])) {
        navigate("/topics/new");
        return true;
      }
      
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
        await refreshTopics();
        navigate(`/topics/${newTopic.id}`);
        speak(`Тема ${newTopic.title} создана.`, "topic_created");
        return true;
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
      
      return false;
    },
    [navigate, speak, refreshTopics]
  );

  const dispatchAction = useCallback(
    async (action: VoiceAction) => {
      setLastAction(action);
      setError("");
      
      const handlers = [...handlersRef.current].sort((a, b) => b.priority - a.priority || b.id - a.id);
      for (const { handler } of handlers) {
        if (handler(action)) return;
      }
      
      if (await handleGlobalAction(action)) return;
      speak("Команда пока не поддерживается.", "unsupported_action");
    },
    [handleGlobalAction, speak]
  );

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
    const setup = createVoiceAssistant({
      getState: () => buildAssistantState(assistantStateRef.current, customTopicsRef.current),
      getRecoveryState: () => ({
        state: buildAssistantState(assistantStateRef.current, customTopicsRef.current),
        topics: [...customTopicsRef.current, ...baseTopics],
      }),
      onAction: (action) => dispatchAction(action),
      onError: (event) => setError(formatAssistantError(event)),
      onTts: (event) => {
        const state = getTtsState(event);
        if (state === "start" || state === "play") {
          clearSpeakingTimeout();
          setIsSpeaking(true);
        } else if (["stop", "end", "done"].includes(state)) {
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
      clearSpeakingTimeout();
      setup.assistant.close?.();
      assistantRef.current = null;
    };
  }, [clearSpeakingTimeout, dispatchAction]);

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