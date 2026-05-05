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
  lastAction: VoiceAction | null;
  setAssistantState: (state: AssistantScreenState) => void;
  registerHandler: (handler: VoiceActionHandler, priority?: number) => () => void;
  sendAssistantAction: (actionId: string, parameters?: Record<string, unknown>) => void;
  speak: (text: string, reason?: string) => void;
  clearError: () => void;
};

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | null>(null);

const getTopicPath = (topic: VoiceTopic, mode: "open" | "study"): string => {
  if (mode === "study") {
    return `/study/${topic.id}`;
  }
  return isCustomVoiceTopic(topic) ? `/topics/${topic.id}` : `/study/${topic.id}`;
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

export function VoiceAssistantProvider({
  children,
  navigate,
}: {
  children: React.ReactNode;
  navigate: Navigate;
}) {
  const assistantRef = useRef<VoiceAssistant | null>(null);
  const assistantStateRef = useRef<AssistantScreenState>({ screen: "home" });
  const handlersRef = useRef<RegisteredHandler[]>([]);
  const nextHandlerIdRef = useRef(1);
  
  // Кэш тем для моментальных синхронных ответов ассистенту
  const customTopicsRef = useRef<CustomTopic[]>([]);

  const [mode, setMode] = useState<VoiceAssistantMode>("noop");
  const [error, setError] = useState("");
  const [disabledReason, setDisabledReason] = useState("");
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

  const speak = useCallback(
    (text: string, reason = "feedback") => {
      if (!text.trim()) return;
      sendAssistantAction("voice_feedback", { value: text, text, reason });
    },
    [sendAssistantAction]
  );

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
  }, []);

  const registerHandler = useCallback((handler: VoiceActionHandler, priority = 0) => {
    const id = nextHandlerIdRef.current;
    nextHandlerIdRef.current += 1;
    handlersRef.current = [...handlersRef.current, { id, priority, handler }];
    return () => {
      handlersRef.current = handlersRef.current.filter((entry) => entry.id !== id);
    };
  }, []);

  useEffect(() => {
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
    });

    assistantRef.current = setup.assistant;
    setMode(setup.mode);
    setDisabledReason(setup.disabledReason || "");

    return () => {
      setup.assistant.close?.();
      assistantRef.current = null;
    };
  }, [dispatchAction]);

  const contextValue = useMemo<VoiceAssistantContextValue>(
    () => ({
      mode,
      error,
      disabledReason,
      lastAction,
      setAssistantState,
      registerHandler,
      sendAssistantAction,
      speak,
      clearError: () => setError(""),
    }),
    [disabledReason, error, lastAction, mode, registerHandler, sendAssistantAction, setAssistantState, speak]
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