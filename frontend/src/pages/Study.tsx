import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, X, Check, Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Твои импорты
import { getTopicById, saveSessionResult } from "../data/flashcards";
import { fetchUserData, type CustomTopic } from "../data/customTopics";
import { FlashCard } from "./components/FlashCard";
import { TopicIcon } from "./components/TopicIcon";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches, getActionString } from "../voice/flashcardVoice";

const MAX_VOICE_ATTEMPTS = 3;
const AUTO_REVEAL_SECONDS = 5;
const AUTO_ADVANCE_SECONDS = 5;

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

const getLevenshteinDistance = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
};

const getStringSimilarity = (left: string, right: string): number => {
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 1;
  return 1 - getLevenshteinDistance(left, right) / maxLength;
};

const getAnswerTokens = (value: string): string[] =>
  value
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const getTokenSimilarity = (left: string, right: string): number => {
  const leftTokens = new Set(getAnswerTokens(left));
  const rightTokens = new Set(getAnswerTokens(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let matches = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) matches += 1;
  });

  return (2 * matches) / (leftTokens.size + rightTokens.size);
};

const isAnswerCloseEnough = (spokenAnswer: string, expectedAnswer: string): boolean => {
  const normalizedSpoken = normalizeAnswerForComparison(spokenAnswer, expectedAnswer);
  const normalizedExpected = normalizeAnswerForComparison(expectedAnswer, expectedAnswer);

  if (!normalizedSpoken) return false;
  if (normalizedSpoken === normalizedExpected) return true;

  // Numeric answers stay strict: 1917 and 1918 are visually close but semantically wrong.
  if (/^\d+$/.test(normalizedExpected)) return false;
  if (normalizedExpected.length <= 3 || normalizedSpoken.length <= 2) return false;

  const shorter = normalizedSpoken.length < normalizedExpected.length ? normalizedSpoken : normalizedExpected;
  const longer = normalizedSpoken.length < normalizedExpected.length ? normalizedExpected : normalizedSpoken;
  if (shorter.length >= 4 && longer.includes(shorter) && shorter.length / longer.length >= 0.55) {
    return true;
  }

  const stringSimilarity = getStringSimilarity(normalizedSpoken, normalizedExpected);
  const tokenSimilarity = getTokenSimilarity(normalizedSpoken, normalizedExpected);
  const similarityThreshold =
    normalizedExpected.length < 8 ? 0.84 : normalizedExpected.length < 18 ? 0.78 : 0.72;

  return (
    stringSimilarity >= similarityThreshold ||
    tokenSimilarity >= 0.72 ||
    (stringSimilarity >= 0.68 && tokenSimilarity >= 0.5)
  );
};

export function Study() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  
  // Достаем методы ассистента
  const {
    setAssistantState,
    startListening,
    sendAssistantAction,
    speak,
    mode,
    disabledReason,
    isSpeaking,
    recognizedText,
    recognizedStatus,
  } = useVoiceAssistant();

  // Состояния карточек
  const [topic, setTopic] = useState<any>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  
  // Состояния для анимации
  const [cardKey, setCardKey] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [voiceAttempts, setVoiceAttempts] = useState(0);
  const [autoRevealEnabled, setAutoRevealEnabled] = useState(true);
  const [autoRevealRemaining, setAutoRevealRemaining] = useState<number | null>(null);
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState<number | null>(null);
  const [lastSpokenAnswer, setLastSpokenAnswer] = useState("");

  const autoRevealTimeoutRef = useRef<number | null>(null);
  const autoRevealIntervalRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const autoAdvanceIntervalRef = useRef<number | null>(null);

  // 1. ЗАГРУЗКА ТЕМЫ
  useEffect(() => {
    const loadTopic = async () => {
      if (!topicId) return navigate("/");
      setIsLoading(true);
      
      try {
        const builtIn = getTopicById(topicId);
        let currentTopic = builtIn;
        setIsCustom(false);

        if (!builtIn) {
          const data = await fetchUserData();
          currentTopic = data.customTopics?.find((t: CustomTopic) => t.id === topicId);
          setIsCustom(true);
        }

        if (currentTopic) {
          setTopic(currentTopic);
          // Синхронизируем состояние с облаком Салюта
          setAssistantState({ screen: "study" });
        } else {
          navigate("/");
        }
      } catch (e) {
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    loadTopic();
  }, [topicId, navigate, setAssistantState]);

  const total = topic?.cards.length ?? 0;
  const card = topic?.cards[currentIndex];

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

  useEffect(
    () => () => {
      clearAutoRevealTimer(false);
      clearAutoAdvanceTimer(false);
    },
    [clearAutoAdvanceTimer, clearAutoRevealTimer]
  );

  useEffect(() => {
    setVoiceAttempts(0);
    setLastSpokenAnswer("");
    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
  }, [card?.id, clearAutoAdvanceTimer, clearAutoRevealTimer, currentIndex]);

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
        id: card.id ?? currentIndex + 1,
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
        items: topic.cards.map((item: { id?: string | number; front: string }, index: number) => ({
          number: index + 1,
          id: item.id ?? index + 1,
          title: item.front,
        })),
        ignored_words: ["покажи", "ответ", "знаю", "не", "следующая", "карточка"],
      },
    });
  }, [card, currentIndex, isCustom, isFlipped, known, setAssistantState, topic, total, unknown]);

  // 2. ЛОГИКА ОТВЕТА (Обернута в Ref для доступа из голоса)
  const handleAnswer = useCallback((didKnow: boolean) => {
    if (!topic) return;

    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
    setVoiceAttempts(0);
    setDirection(didKnow ? "right" : "left");

    setTimeout(() => {
      const isLast = currentIndex + 1 >= total;
      const finalKnown = didKnow ? known + 1 : known;
      const finalUnknown = didKnow ? unknown : unknown + 1;

      if (isLast) {
        saveSessionResult({
          topicId: topic.id,
          known: finalKnown,
          unknown: finalUnknown,
          date: new Date().toISOString()
        });
        navigate(`/results/${topic.id}`, {
          state: { known: finalKnown, unknown: finalUnknown, total, isCustom }
        });
      } else {
        if (didKnow) setKnown(prev => prev + 1);
        else setUnknown(prev => prev + 1);
        
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setCardKey(prev => prev + 1);
        setDirection(null);
      }
    }, 300);
  }, [
    clearAutoAdvanceTimer,
    clearAutoRevealTimer,
    currentIndex,
    isCustom,
    known,
    navigate,
    topic,
    total,
    unknown,
  ]);

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => { handleAnswerRef.current = handleAnswer; }, [handleAnswer]);

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
        handleAnswerRef.current(didKnow);
      }, AUTO_ADVANCE_SECONDS * 1000);
    },
    [clearAutoAdvanceTimer]
  );

  const startAutoRevealCountdown = useCallback(() => {
    if (!card) {
      return;
    }

    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
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
      setIsFlipped(true);
      speak(`Ответ: ${card.back}`, "answer_auto_revealed");
    }, AUTO_REVEAL_SECONDS * 1000);
  }, [card, clearAutoAdvanceTimer, clearAutoRevealTimer, speak]);

  // 3. ГОЛОСОВОЙ ОБРАБОТЧИК
  const handleVoiceAction = useCallback((action: any) => {
    if (!topic || !card) {
      return false;
    }

    console.log(">>> SIGNAL IN STUDY:", action);

    const phrase = getActionString(action, ["answer", "spoken_answer", "value", "text"]).toLowerCase();

    if (phrase.includes("запусти")) {
      return false;
    }

    if (actionMatches(action, ["flip_card", "show_answer", "reveal_answer"])) {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      setIsFlipped(true);
      return true;
    }

    if (actionMatches(action, ["know", "next", "know_card", "known_card"])) {
      handleAnswerRef.current(true);
      return true;
    }

    if (actionMatches(action, ["dont_know", "dont_know_card", "do_not_know_card", "i_dont_know"])) {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      setVoiceAttempts(0);
      setLastSpokenAnswer(recognizedText || "Я не знаю");
      setIsFlipped(true);
      speak(`Показываю ответ. Ответ: ${card.back}`, "dont_know_reveal");
      scheduleAutoAdvance(false);
      return true;
    }

    if (actionMatches(action, ["check_answer", "submit_answer", "answer"]) || phrase.length > 0) {
      const spokenAnswer = getActionString(action, ["answer", "spoken_answer", "value", "text"]);
      const normalizedSpoken = normalizeAnswerForComparison(spokenAnswer, card.back);

      setLastSpokenAnswer(spokenAnswer.trim());
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();

      if (!normalizedSpoken) {
        speak("Я не расслышала ответ. Попробуйте еще раз.", "answer_empty");
        return true;
      }

      if (isAnswerCloseEnough(spokenAnswer, card.back)) {
        setVoiceAttempts(0);
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

      speak("Неправильно, попробуйте еще раз.", "answer_incorrect");
      return true;
    }

    return false;
  }, [
    autoRevealEnabled,
    card,
    clearAutoAdvanceTimer,
    clearAutoRevealTimer,
    recognizedText,
    scheduleAutoAdvance,
    speak,
    startAutoRevealCountdown,
    topic,
    voiceAttempts,
  ]);

  useVoiceActionHandler(handleVoiceAction, [handleVoiceAction], 30);

  // 4. МЕТОД ДЛЯ АКТИВАЦИИ МИКРОФОНА
  const activateVoice = () => {
    const micStarted = startListening();
    console.log("Mic Status:", micStarted);
    
    // Пингуем сценарий, чтобы он начал слушать (expect_response)
    sendAssistantAction("run_recognition", { expect_response: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!card) return null;
  const displayedVoiceText = recognizedText || lastSpokenAnswer;
  const voiceStatus =
    mode === "noop"
      ? "off"
      : isSpeaking
        ? "speaking"
        : recognizedStatus === "listen"
          ? "listening"
          : "ready";
  const voiceMessage =
    mode === "noop"
      ? disabledReason || "Salute недоступен."
      : autoRevealRemaining !== null
        ? `Покажу ответ через ${autoRevealRemaining} сек.`
        : autoAdvanceRemaining !== null
          ? `Следующая карточка через ${autoAdvanceRemaining} сек.`
          : displayedVoiceText
            ? displayedVoiceText
            : voiceAttempts > 0
              ? `Попытка ${voiceAttempts}/${MAX_VOICE_ATTEMPTS}.`
              : "Скажите ответ вслух.";

  return (
    <div 
      className="h-[calc(100dvh-5rem)] min-h-0 bg-background flex flex-col items-center px-3 py-2 sm:px-4 sm:py-4 overflow-hidden select-none"
      onClick={activateVoice} // Клик по экрану «будит» Салют
    >
      <div className="w-full max-w-md flex flex-col h-full min-h-0 gap-3 sm:gap-4">
        
        {/* Header */}
        <header className="flex justify-between items-center h-9 shrink-0 px-2">
          <button 
            onClick={(e) => { e.stopPropagation(); navigate("/"); }}
            className="flex items-center gap-1 text-muted-foreground font-bold text-xs"
          >
            <ChevronLeft size={18} /> Назад
          </button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <TopicIcon name={topic.emoji || topic.icon} size={14} />
              <span className="font-black text-sm truncate max-w-[120px]">{topic.title}</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">
              {currentIndex + 1} из {topic.cards.length}
            </p>
          </div>
          <div className="w-16" /> 
        </header>

        {/* Progress Bar */}
        <div className="h-1 shrink-0 bg-muted rounded-full mx-2 overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / topic.cards.length) * 100}%` }}
          />
        </div>

        {/* Card Canvas */}
        <div 
          className="relative w-full h-[clamp(240px,42dvh,380px)] shrink-0 perspective-1000"
          onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={cardKey}
              className="w-full h-full"
              initial={{ x: 160, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ 
                x: direction === "right" ? 500 : -500, 
                opacity: 0,
                rotate: direction === "right" ? 15 : -15
              }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
            >
              <FlashCard
                front={card.front}
                back={card.back}
                flipped={isFlipped}
                onFlip={setIsFlipped}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="mt-1 shrink-0 space-y-3 pb-2">
          <div
            className="rounded-[1.25rem] bg-card border border-border p-3 text-sm shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-foreground uppercase tracking-widest text-[10px]">
                Голос
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                {voiceStatus}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{voiceMessage}</p>
            <label className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-foreground">
              <span>Автоответ после 3 ошибок</span>
              <input
                type="checkbox"
                checked={autoRevealEnabled}
                onChange={(event) => setAutoRevealEnabled(event.target.checked)}
              />
            </label>
          </div>

          <div className={`hidden sm:block text-center transition-opacity ${isFlipped ? "opacity-0" : "opacity-100"}`}>
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Info size={12} />
                Нажми на экран или скажи «Переверни»
             </div>
          </div>

          <div className="flex gap-3 sm:gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
              className="flex-1 flex flex-col items-center gap-1 bg-card border-2 border-destructive/10 py-3.5 sm:py-5 rounded-[2rem] sm:rounded-[2.5rem] active:scale-95 transition-all"
            >
              <X size={28} className="text-destructive" strokeWidth={3} />
              <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Не знаю</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
              className="flex-1 flex flex-col items-center gap-1 bg-primary text-primary-foreground py-3.5 sm:py-5 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              <Check size={28} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest">Знаю</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
