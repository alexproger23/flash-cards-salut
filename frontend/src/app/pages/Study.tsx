import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { getTopicById, saveSessionResult } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { FlashCard } from "../components/FlashCard";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches, getActionString } from "../voice/flashcardVoice";

const MAX_VOICE_ATTEMPTS = 3;
const AUTO_REVEAL_SECONDS = 5;
const AUTO_ADVANCE_SECONDS = 5;
const LISTEN_RESTART_DELAY_MS = 250;
const LISTEN_RETRY_INTERVAL_MS = 900;
const LISTEN_AFTER_FEEDBACK_DELAY_MS = 2200;

const normalizeSpokenAnswer = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/^(мой\s+ответ|ответ|я\s+думаю|думаю\s+что)\s+/i, "")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, " ");

const russianNumberWords: Record<string, number> = {
  ноль: 0,
  один: 1,
  одна: 1,
  первое: 1,
  первый: 1,
  второго: 2,
  второй: 2,
  два: 2,
  две: 2,
  третий: 3,
  третье: 3,
  три: 3,
  четыре: 4,
  четвертый: 4,
  четвертое: 4,
  пять: 5,
  пятый: 5,
  шестой: 6,
  шесть: 6,
  седьмой: 7,
  семь: 7,
  восемь: 8,
  восьмой: 8,
  девять: 9,
  девятый: 9,
  десять: 10,
  десятый: 10,
  одиннадцать: 11,
  одиннадцатый: 11,
  двенадцать: 12,
  двенадцатый: 12,
  тринадцать: 13,
  тринадцатый: 13,
  четырнадцать: 14,
  четырнадцатый: 14,
  пятнадцать: 15,
  пятнадцатый: 15,
  шестнадцать: 16,
  шестнадцатый: 16,
  семнадцать: 17,
  семнадцатый: 17,
  восемнадцать: 18,
  восемнадцатый: 18,
  девятнадцать: 19,
  девятнадцатый: 19,
  двадцать: 20,
  двадцатый: 20,
  тридцать: 30,
  тридцатый: 30,
  сорок: 40,
  сороковой: 40,
  пятьдесят: 50,
  пятидесятый: 50,
  шестьдесят: 60,
  шестидесятый: 60,
  семьдесят: 70,
  семидесятый: 70,
  восемьдесят: 80,
  восьмидесятый: 80,
  девяносто: 90,
  девяностый: 90,
  сто: 100,
  сотый: 100,
  двести: 200,
  двухсотый: 200,
  триста: 300,
  трехсотый: 300,
  четыреста: 400,
  четырехсотый: 400,
  пятьсот: 500,
  пятисотый: 500,
  шестьсот: 600,
  шестисотый: 600,
  семьсот: 700,
  семисотый: 700,
  восемьсот: 800,
  восьмисотый: 800,
  девятьсот: 900,
  девятисотый: 900,
};

const parseRussianNumber = (value: string): number | null => {
  const words = value
    .replace(/[-–—]/g, " ")
    .replace(/[.,!?;:()"]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word &&
        !["в", "во", "год", "года", "году", "годом", "годы", "м", "й"].includes(word)
    );

  let total = 0;
  let current = 0;
  let found = false;

  for (const word of words) {
    if (word === "тысяча" || word === "тысячи" || word === "тысяч") {
      total += (current || 1) * 1000;
      current = 0;
      found = true;
      continue;
    }

    const valuePart = russianNumberWords[word];
    if (typeof valuePart === "number") {
      current += valuePart;
      found = true;
    }
  }

  return found ? total + current : null;
};

const normalizeAnswerForComparison = (value: string, expected: string): string => {
  const normalized = normalizeSpokenAnswer(value)
    .replace(/\b(год|года|году|годом|годы)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedExpected = normalizeSpokenAnswer(expected);

  if (/^\d+$/.test(normalizedExpected)) {
    const digits = normalized.match(/\d+/)?.[0];
    if (digits) {
      return String(Number(digits));
    }

    const parsed = parseRussianNumber(normalized);
    if (parsed !== null) {
      return String(parsed);
    }
  }

  return normalized;
};

export function Study() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const {
    setAssistantState,
    speak,
    startListening,
    mode,
    disabledReason,
    isSpeaking,
    recognizedText,
    recognizedStatus,
  } = useVoiceAssistant();

  const builtIn = topicId ? getTopicById(topicId) : undefined;
  const custom = topicId ? getCustomTopicById(topicId) : undefined;
  const topic = builtIn || custom;
  const isCustom = Boolean(custom);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [voiceAttempts, setVoiceAttempts] = useState(0);
  const [autoRevealEnabled, setAutoRevealEnabled] = useState(true);
  const [autoRevealRemaining, setAutoRevealRemaining] = useState<number | null>(null);
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState<number | null>(null);
  const [lastSpokenAnswer, setLastSpokenAnswer] = useState("");

  const listenTimeoutRef = useRef<number | null>(null);
  const listenRetryIntervalRef = useRef<number | null>(null);
  const autoRevealTimeoutRef = useRef<number | null>(null);
  const autoRevealIntervalRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const autoAdvanceIntervalRef = useRef<number | null>(null);
  const isFlippedRef = useRef(isFlipped);
  const autoRevealRemainingRef = useRef(autoRevealRemaining);
  const isSpeakingRef = useRef(isSpeaking);
  const recognizedStatusRef = useRef(recognizedStatus);
  const listenResumeAtRef = useRef(0);

  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);

  useEffect(() => {
    autoRevealRemainingRef.current = autoRevealRemaining;
  }, [autoRevealRemaining]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    recognizedStatusRef.current = recognizedStatus;
  }, [recognizedStatus]);

  useEffect(() => {
    if (!topic) {
      navigate("/");
      return;
    }
    if (topic.cards.length === 0) {
      navigate(isCustom ? `/topics/${topicId}` : "/");
    }
  }, [topic, navigate, isCustom, topicId]);

  const total = topic?.cards.length ?? 0;
  const card = topic && total > 0 ? topic.cards[currentIndex] : undefined;

  const clearScheduledListening = useCallback(() => {
    if (listenTimeoutRef.current !== null) {
      window.clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
  }, []);

  const clearListeningRetry = useCallback(() => {
    if (listenRetryIntervalRef.current !== null) {
      window.clearInterval(listenRetryIntervalRef.current);
      listenRetryIntervalRef.current = null;
    }
  }, []);

  const clearAutoRevealTimer = useCallback((resetCountdown = true) => {
    if (autoRevealTimeoutRef.current !== null) {
      window.clearTimeout(autoRevealTimeoutRef.current);
      autoRevealTimeoutRef.current = null;
    }

    if (autoRevealIntervalRef.current !== null) {
      window.clearInterval(autoRevealIntervalRef.current);
      autoRevealIntervalRef.current = null;
    }

    if (resetCountdown) {
      setAutoRevealRemaining(null);
    }
  }, []);

  const clearAutoAdvanceTimer = useCallback((resetCountdown = true) => {
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    if (autoAdvanceIntervalRef.current !== null) {
      window.clearInterval(autoAdvanceIntervalRef.current);
      autoAdvanceIntervalRef.current = null;
    }

    if (resetCountdown) {
      setAutoAdvanceRemaining(null);
    }
  }, []);

  const requestListening = useCallback(() => {
    startListening();
  }, [startListening]);

  const pauseListeningRestart = useCallback((delay = LISTEN_AFTER_FEEDBACK_DELAY_MS) => {
    listenResumeAtRef.current = Date.now() + delay;
  }, []);

  const shouldRequestListening = useCallback(() => {
    if (
      mode === "noop" ||
      isFlippedRef.current ||
      autoRevealRemainingRef.current !== null ||
      isSpeakingRef.current ||
      Date.now() < listenResumeAtRef.current
    ) {
      return false;
    }

    return recognizedStatusRef.current !== "listen";
  }, [mode]);

  const scheduleListening = useCallback(
    (delay = LISTEN_RESTART_DELAY_MS) => {
      if (mode === "noop") {
        return;
      }

      clearScheduledListening();
      listenTimeoutRef.current = window.setTimeout(() => {
        listenTimeoutRef.current = null;

        if (shouldRequestListening()) {
          requestListening();
        }
      }, delay);
    },
    [clearScheduledListening, mode, requestListening, shouldRequestListening]
  );

  const startAutoRevealCountdown = useCallback(() => {
    if (!card) {
      return;
    }

    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
    clearScheduledListening();
    clearListeningRetry();
    pauseListeningRestart();
    setAutoRevealRemaining(AUTO_REVEAL_SECONDS);
    speak(`Неправильно. Покажу ответ через ${AUTO_REVEAL_SECONDS} секунд.`, "answer_auto_reveal_pending");

    autoRevealIntervalRef.current = window.setInterval(() => {
      setAutoRevealRemaining((remaining) => {
        if (remaining === null || remaining <= 1) {
          return remaining;
        }

        return remaining - 1;
      });
    }, 1000);

    autoRevealTimeoutRef.current = window.setTimeout(() => {
      if (autoRevealIntervalRef.current !== null) {
        window.clearInterval(autoRevealIntervalRef.current);
        autoRevealIntervalRef.current = null;
      }

      autoRevealTimeoutRef.current = null;
      setAutoRevealRemaining(null);
      setVoiceAttempts(0);
      isFlippedRef.current = true;
      setIsFlipped(true);
      speak(`Ответ: ${card.back}`, "answer_auto_revealed");
    }, AUTO_REVEAL_SECONDS * 1000);
  }, [
    card,
    clearAutoAdvanceTimer,
    clearAutoRevealTimer,
    clearListeningRetry,
    clearScheduledListening,
    pauseListeningRestart,
    speak,
  ]);

  useEffect(() => {
    listenResumeAtRef.current = 0;
    setVoiceAttempts(0);
    setLastSpokenAnswer("");
    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
    clearScheduledListening();
    clearListeningRetry();
  }, [
    card?.id,
    clearAutoAdvanceTimer,
    clearAutoRevealTimer,
    clearListeningRetry,
    clearScheduledListening,
    currentIndex,
  ]);

  useEffect(() => {
    clearListeningRetry();

    if (
      mode === "noop" ||
      !topic ||
      !card ||
      isFlipped ||
      autoRevealRemaining !== null ||
      isSpeaking
    ) {
      return;
    }

    scheduleListening(LISTEN_RESTART_DELAY_MS);

    listenRetryIntervalRef.current = window.setInterval(() => {
      if (shouldRequestListening()) {
        requestListening();
      }
    }, LISTEN_RETRY_INTERVAL_MS);

    return clearListeningRetry;
  }, [
    autoRevealRemaining,
    card,
    isFlipped,
    isSpeaking,
    mode,
    clearListeningRetry,
    requestListening,
    scheduleListening,
    shouldRequestListening,
    topic,
  ]);

  useEffect(
    () => () => {
      listenResumeAtRef.current = Number.POSITIVE_INFINITY;
      clearScheduledListening();
      clearListeningRetry();
      clearAutoRevealTimer(false);
      clearAutoAdvanceTimer(false);
    },
    [clearAutoAdvanceTimer, clearAutoRevealTimer, clearListeningRetry, clearScheduledListening]
  );

  const handleAnswer = useCallback((didKnow: boolean) => {
    if (!topic || !card || total === 0) {
      return;
    }

    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
    clearScheduledListening();
    clearListeningRetry();
    listenResumeAtRef.current = 0;
    setVoiceAttempts(0);

    const newKnown = didKnow ? known + 1 : known;
    const newUnknown = didKnow ? unknown : unknown + 1;

    if (currentIndex + 1 >= total) {
      saveSessionResult({
        topicId: topic.id,
        known: newKnown,
        unknown: newUnknown,
        date: new Date().toISOString(),
      });
      navigate(`/results/${topic.id}`, {
        state: { known: newKnown, unknown: newUnknown, total, isCustom },
      });
    } else {
      if (didKnow) setKnown(newKnown);
      else setUnknown(newUnknown);
      setCurrentIndex((i) => i + 1);
      isFlippedRef.current = false;
      setIsFlipped(false);
      setCardKey((k) => k + 1);
    }
  }, [
    card,
    clearAutoAdvanceTimer,
    clearAutoRevealTimer,
    clearScheduledListening,
    clearListeningRetry,
    currentIndex,
    isCustom,
    known,
    navigate,
    topic,
    total,
    unknown,
  ]);

  const scheduleAutoAdvance = useCallback(
    (didKnow: boolean) => {
      clearAutoAdvanceTimer();
      setAutoAdvanceRemaining(AUTO_ADVANCE_SECONDS);

      autoAdvanceIntervalRef.current = window.setInterval(() => {
        setAutoAdvanceRemaining((remaining) => {
          if (remaining === null || remaining <= 1) {
            return remaining;
          }

          return remaining - 1;
        });
      }, 1000);

      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        if (autoAdvanceIntervalRef.current !== null) {
          window.clearInterval(autoAdvanceIntervalRef.current);
          autoAdvanceIntervalRef.current = null;
        }

        autoAdvanceTimeoutRef.current = null;
        setAutoAdvanceRemaining(null);
        handleAnswer(didKnow);
      }, AUTO_ADVANCE_SECONDS * 1000);
    },
    [clearAutoAdvanceTimer, handleAnswer]
  );

  useEffect(() => {
    if (!topic || !card) {
      return;
    }

    setAssistantState({
      screen: "study",
      currentTopic: {
        id: topic.id,
        title: topic.title,
        cardsCount: total,
        custom: isCustom,
      },
      currentCard: {
        number: currentIndex + 1,
        id: card.id,
        front: card.front,
        back: card.back,
        flipped: isFlipped,
        frontLabel: topic.frontLabel,
        backLabel: topic.backLabel,
      },
      study: {
        currentIndex,
        total,
        known,
        unknown,
        isFlipped,
      },
      item_selector: {
        items: topic.cards.map((item, index) => ({
          number: index + 1,
          id: item.id,
          title: item.front,
        })),
        ignored_words: ["покажи", "ответ", "знаю", "не", "следующая", "карточка"],
      },
    });
  }, [card, currentIndex, isCustom, isFlipped, known, setAssistantState, topic, total, unknown]);

  useVoiceActionHandler(
    (action) => {
      if (!topic || !card) {
        return false;
      }

      if (isFlipped) {
        return false;
      }

      if (actionMatches(action, ["dont_know_card", "do_not_know_card", "i_dont_know"])) {
        clearAutoRevealTimer();
        clearAutoAdvanceTimer();
        clearScheduledListening();
        clearListeningRetry();
        listenResumeAtRef.current = Number.POSITIVE_INFINITY;
        setVoiceAttempts(0);
        setLastSpokenAnswer(recognizedText || "Я не знаю");
        isFlippedRef.current = true;
        setIsFlipped(true);
        speak(`Показываю ответ. Ответ: ${card.back}`, "dont_know_reveal");
        scheduleAutoAdvance(false);
        return true;
      }

      if (actionMatches(action, ["check_answer", "submit_answer", "answer"])) {
        const spokenAnswer = getActionString(action, ["answer", "spoken_answer", "value", "text"]);
        const normalizedSpoken = normalizeAnswerForComparison(spokenAnswer, card.back);
        const normalizedExpected = normalizeAnswerForComparison(card.back, card.back);
        setLastSpokenAnswer(spokenAnswer.trim());

        clearAutoRevealTimer();
        clearAutoAdvanceTimer();

        if (!normalizedSpoken) {
          pauseListeningRestart();
          speak("Я не расслышала ответ. Попробуйте еще раз.", "answer_empty");
          scheduleListening(LISTEN_AFTER_FEEDBACK_DELAY_MS);
          return true;
        }

        if (normalizedSpoken === normalizedExpected) {
          clearScheduledListening();
          clearListeningRetry();
          listenResumeAtRef.current = Number.POSITIVE_INFINITY;
          setVoiceAttempts(0);
          isFlippedRef.current = true;
          setIsFlipped(true);
          speak("Правильно!", "answer_correct");
          scheduleAutoAdvance(true);
          return true;
        }

        const nextAttempts = voiceAttempts + 1;
        setVoiceAttempts(nextAttempts);

        if (nextAttempts >= MAX_VOICE_ATTEMPTS && autoRevealEnabled) {
          startAutoRevealCountdown();
          return true;
        }

        pauseListeningRestart();
        speak("Неправильно, попробуйте еще раз.", "answer_incorrect");
        scheduleListening(LISTEN_AFTER_FEEDBACK_DELAY_MS);
        return true;
      }

      return false;
    },
    [
      autoRevealEnabled,
      card,
      clearAutoAdvanceTimer,
      clearAutoRevealTimer,
      clearScheduledListening,
      clearListeningRetry,
      isFlipped,
      pauseListeningRestart,
      recognizedText,
      scheduleAutoAdvance,
      scheduleListening,
      speak,
      startAutoRevealCountdown,
      topic,
      voiceAttempts,
    ],
    30
  );

  if (!topic || !card || total === 0) return null;

  const progress = (currentIndex / total) * 100;
  const displayedVoiceText = recognizedText || lastSpokenAnswer;

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-10"
      style={{ backgroundColor: "#fafafa" }}
    >
      {/* Top Bar */}
      <div className="w-full max-w-lg flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(isCustom ? `/topics/${topicId}` : "/")}
          className="text-sm transition-opacity hover:opacity-60"
          style={{ color: "#9898b0" }}
        >
          ← Back
        </button>
        <span style={{ color: "#1a1a2e", fontSize: "0.95rem", fontWeight: 500 }}>
          {topic.emoji} {topic.title}
        </span>
        <span style={{ color: "#9898b0", fontSize: "0.9rem" }}>
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-lg mb-10">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: "3px", backgroundColor: "#ebebf0" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: "#1a1a2e" }}
          />
        </div>
      </div>

      {/* Flash Card */}
      <div className="w-full max-w-lg mb-10">
        <FlashCard
          key={cardKey}
          front={card.front}
          back={card.back}
          frontLabel={topic.frontLabel}
          backLabel={topic.backLabel}
          flipped={isFlipped}
          onFlip={(next) => {
            clearAutoRevealTimer();
            clearAutoAdvanceTimer();
            clearScheduledListening();
            clearListeningRetry();
            listenResumeAtRef.current = next ? Number.POSITIVE_INFINITY : 0;
            isFlippedRef.current = next;
            setIsFlipped(next);
          }}
        />
      </div>

      <div
        className="w-full max-w-lg mb-6 rounded-2xl px-4 py-3"
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid rgba(26,26,46,0.06)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span style={{ color: "#1a1a2e", fontSize: "0.86rem", fontWeight: 500 }}>
            Voice answer
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-xs"
            style={{
              backgroundColor: mode === "noop" ? "#fff5f5" : isFlipped ? "#f0f0f5" : "#f0f9f2",
              color: mode === "noop" ? "#c07070" : isFlipped ? "#7070a0" : "#2f8a45",
            }}
          >
            {mode === "noop"
              ? "off"
              : isFlipped
                ? "paused"
                : recognizedStatus === "listen"
                  ? "listening"
                  : "starting"}
          </span>
        </div>
        <p className="mt-2 text-sm" style={{ color: "#707090", lineHeight: 1.45 }}>
          {mode === "noop"
            ? disabledReason || "Salute is not configured."
            : autoRevealRemaining !== null
              ? `Покажу ответ через ${autoRevealRemaining} сек.`
              : autoAdvanceRemaining !== null
                ? `Следующая карточка через ${autoAdvanceRemaining} сек.`
              : isFlipped
                ? "Ответ открыт."
                : displayedVoiceText
                  ? displayedVoiceText
                  : voiceAttempts > 0
                  ? `Попытка ${voiceAttempts}/${MAX_VOICE_ATTEMPTS}.`
                  : "Скажите ответ вслух."}
        </p>
      </div>

      {/* Action Buttons */}
      <div
        className="w-full max-w-lg flex gap-4 transition-all duration-300"
        style={{
          opacity: isFlipped ? 1 : 0,
          pointerEvents: isFlipped ? "auto" : "none",
          transform: isFlipped ? "translateY(0)" : "translateY(8px)",
        }}
      >
        <button
          onClick={() => handleAnswer(false)}
          className="flex-1 rounded-2xl py-4 text-sm transition-all duration-150 active:scale-95"
          style={{
            backgroundColor: "#ffffff",
            color: "#e05252",
            border: "1.5px solid rgba(224,82,82,0.2)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff5f5")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ffffff")}
        >
          I didn't know
        </button>
        <button
          onClick={() => handleAnswer(true)}
          className="flex-1 rounded-2xl py-4 text-sm transition-all duration-150 active:scale-95"
          style={{
            backgroundColor: "#1a1a2e",
            color: "#ffffff",
            border: "1.5px solid transparent",
            boxShadow: "0 2px 12px rgba(26,26,46,0.15)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a3e")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a2e")}
        >
          I knew it ✓
        </button>
      </div>

      {/* Hint */}
      <p
        className="mt-8 text-xs transition-all duration-300"
        style={{ color: "#c8c8d8", opacity: isFlipped ? 0 : 1 }}
      >
        Click the card to reveal the answer
      </p>

      {/* Score tracker */}
      <div className="flex gap-6 mt-10">
        <div className="text-center">
          <div style={{ fontSize: "1.3rem", color: "#1a1a2e", fontWeight: 500 }}>{known}</div>
          <div style={{ fontSize: "0.75rem", color: "#9898b0" }}>knew it</div>
        </div>
        <div style={{ width: "1px", backgroundColor: "#ebebf0" }} />
        <div className="text-center">
          <div style={{ fontSize: "1.3rem", color: "#e05252", fontWeight: 500 }}>{unknown}</div>
          <div style={{ fontSize: "0.75rem", color: "#9898b0" }}>didn't know</div>
        </div>
      </div>

      <label
        className="w-full max-w-lg mt-8 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 cursor-pointer select-none"
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid rgba(26,26,46,0.06)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.03)",
        }}
      >
        <span>
          <span style={{ display: "block", color: "#1a1a2e", fontSize: "0.88rem", fontWeight: 500 }}>
            Auto reveal after 3 misses
          </span>
          <span style={{ display: "block", color: "#9898b0", fontSize: "0.76rem", marginTop: 2 }}>
            {autoRevealEnabled ? "On" : "Off"}
          </span>
        </span>
        <input
          type="checkbox"
          checked={autoRevealEnabled}
          onChange={(event) => {
            const enabled = event.target.checked;
            setAutoRevealEnabled(enabled);

            if (!enabled) {
              clearAutoRevealTimer();
              clearAutoAdvanceTimer();
              listenResumeAtRef.current = 0;
              scheduleListening(LISTEN_RESTART_DELAY_MS);
            }
          }}
          className="sr-only"
          aria-label="Auto reveal after 3 misses"
        />
        <span
          aria-hidden="true"
          className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors"
          style={{ backgroundColor: autoRevealEnabled ? "#1a1a2e" : "#d8d8e4" }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
            style={{
              left: 2,
              transform: autoRevealEnabled ? "translateX(20px)" : "translateX(0)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            }}
          />
        </span>
      </label>
    </div>
  );
}
