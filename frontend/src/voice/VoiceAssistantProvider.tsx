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
  getAllVoiceTopics,
  getCardBackFromAction,
  getCardFrontFromAction,
  getTopicDescriptionFromAction,
  getTopicTitleFromAction,
  isCustomVoiceTopic,
  type VoiceTopic,
} from "./flashcardVoice";
import { createCustomTopic, addCard, loadCustomTopics } from "../data/customTopics";

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

const buildAssistantState = (screenState: AssistantScreenState): Record<string, unknown> => ({
  ...screenState,
  route: window.location.pathname,
  customTopics: loadCustomTopics().map((topic, index) => ({
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

  const [mode, setMode] = useState<VoiceAssistantMode>("noop");
  const [error, setError] = useState("");
  const [disabledReason, setDisabledReason] = useState("");
  const [lastAction, setLastAction] = useState<VoiceAction | null>(null);

  const sendAssistantAction = useCallback(
    (actionId: string, parameters: Record<string, unknown> = {}) => {
      const assistant = assistantRef.current;
      if (!assistant) {
        return;
      }

      assistant.sendData(
        {
          action: {
            action_id: actionId,
            parameters,
          },
        },
        (response) => {
          console.log("assistant.sendData response", response);
        }
      );
    },
    []
  );

  const speak = useCallback(
    (text: string, reason = "feedback") => {
      if (!text.trim()) {
        return;
      }

      sendAssistantAction("voice_feedback", {
        value: text,
        text,
        reason,
      });
    },
    [sendAssistantAction]
  );

  const handleGlobalAction = useCallback(
    (action: VoiceAction): boolean => {
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

        const created = createCustomTopic({
          title,
          description: getTopicDescriptionFromAction(action),
          emoji: "📝",
        });
        navigate(`/topics/${created.id}`);
        speak(`Тема ${created.title} создана. Можно добавлять карточки.`, "topic_created");
        return true;
      }

      if (actionMatches(action, ["open_topic", "start_topic", "start_study", "practice_topic"])) {
        const topic = findTopicFromAction(action);
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

      if (actionMatches(action, ["add_card", "create_card"])) {
        const topic = findTopicFromAction(action);
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

        const updated = addCard(topic.id, front, back);
        if (updated) {
          navigate(`/topics/${updated.id}`);
          speak("Карточка добавлена.", "card_created");
        }
        return true;
      }

      return false;
    },
    [navigate, speak]
  );

  const dispatchAction = useCallback(
    (action: VoiceAction) => {
      setLastAction(action);
      setError("");

      const handlers = [...handlersRef.current].sort((a, b) => b.priority - a.priority || b.id - a.id);

      for (const { handler } of handlers) {
        if (handler(action)) {
          return;
        }
      }

      if (handleGlobalAction(action)) {
        return;
      }

      console.warn("Unsupported assistant action received", action);
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
      getState: () => buildAssistantState(assistantStateRef.current),
      getRecoveryState: () => ({
        state: buildAssistantState(assistantStateRef.current),
        topics: getAllVoiceTopics(),
      }),
      onAction: (action) => dispatchAction(action),
      onError: (event) => {
        const message = formatAssistantError(event);
        console.error("Salute assistant error:", message, event);
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
    [
      disabledReason,
      error,
      lastAction,
      mode,
      registerHandler,
      sendAssistantAction,
      setAssistantState,
      speak,
    ]
  );

  return (
    <VoiceAssistantContext.Provider value={contextValue}>
      {children}
      {error ? (
        <div
          role="alert"
          className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-lg rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{
            backgroundColor: "#fff5f5",
            border: "1px solid rgba(224,82,82,0.2)",
            color: "#7a4040",
          }}
        >
          Ошибка Salute: {error}
        </div>
      ) : null}
    </VoiceAssistantContext.Provider>
  );
}

export const useVoiceAssistant = (): VoiceAssistantContextValue => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error("useVoiceAssistant must be used inside VoiceAssistantProvider");
  }
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
