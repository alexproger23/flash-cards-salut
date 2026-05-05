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
import { getAllVoiceTopics } from "./flashcardVoice";
import { loadCustomTopics } from "../data/customTopics";

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

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const assistantRef = useRef<VoiceAssistant | null>(null);
  const startListeningRef = useRef<() => boolean>(() => false);
  const speakingTimeoutRef = useRef<number | null>(null);
  const assistantStateRef = useRef<AssistantScreenState>({ screen: "home" });
  const handlersRef = useRef<RegisteredHandler[]>([]);
  const nextHandlerIdRef = useRef(1);

  const [mode, setMode] = useState<VoiceAssistantMode>("noop");
  const [error, setError] = useState("");
  const [disabledReason, setDisabledReason] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognizedFinal, setRecognizedFinal] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognizedStatus, setRecognizedStatus] = useState("idle");
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

  const startListening = useCallback((): boolean => startListeningRef.current(), []);

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

  const dispatchAction = useCallback(
    (action: VoiceAction) => {
      setLastAction(action);
      setError("");

      if (assistantStateRef.current.screen !== "study") {
        console.warn("Ignoring assistant action outside study screen", action);
        return;
      }

      const handlers = [...handlersRef.current].sort((a, b) => b.priority - a.priority || b.id - a.id);

      for (const { handler } of handlers) {
        if (handler(action)) {
          return;
        }
      }

      console.warn("Unsupported study assistant action received", action);
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
