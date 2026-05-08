import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, X, Check, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { getTopicById, saveSessionResult } from "../data/flashcards";
import { fetchUserData } from "../data/customTopics";
import { FlashCard } from "./components/FlashCard";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { getActionString } from "../voice/flashcardVoice";

const MAX_VOICE_ATTEMPTS = 3;

const cleanPhrase = (text: string): string => {
  return text.replace(/запусти/i, "").replace(/список задач/i, "").replace(/открой/i, "").trim();
};

const normalizeText = (t: string) => t.toLowerCase().replace(/ё/g, "е").replace(/[.,!?-]/g, "").trim();

export function Study() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  
  const {
    setAssistantState,
    startListening,
    sendAssistantAction,
    speak,
    isSpeaking,
    recognizedText,
    recognizedStatus,
  } = useVoiceAssistant();

  const [topic, setTopic] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [voiceAttempts, setVoiceAttempts] = useState(0);
  const [lastSpoken, setLastSpoken] = useState("");

  // 1. Загрузка данных
  useEffect(() => {
    const load = async () => {
      if (!topicId) return navigate("/");
      const builtIn = getTopicById(topicId);
      let t = builtIn || (await fetchUserData()).customTopics?.find((i: any) => i.id === topicId);
      if (t) setTopic(t); else navigate("/");
    };
    load();
  }, [topicId, navigate]);

  // 2. АВТО-МИКРОФОН (Исправленная логика)
  useEffect(() => {
    // Включаем микрофон только если:
    // 1. Загружена тема
    // 2. Ассистент сейчас НЕ говорит (isSpeaking === false)
    // 3. Он еще НЕ слушает (recognizedStatus !== "listen")
    if (topic && !isSpeaking && recognizedStatus !== "listen") {
      const timer = setTimeout(() => {
        try {
          startListening();
          // Принудительно уведомляем сервер, что мы ждем голос
          sendAssistantAction("run_recognition", { expect_response: true });
        } catch (e) {
          console.error("Mic activation failed", e);
        }
      }, 1000); // Задержка в 1 сек, чтобы WebSocket успел "продышаться"
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isSpeaking, recognizedStatus, topic]);

  // 3. Навигация
  const moveNext = useCallback((didKnow: boolean) => {
    if (!topic) return;
    setDirection(didKnow ? "right" : "left");
    setTimeout(() => {
      const isLast = currentIndex + 1 >= topic.cards.length;
      if (isLast) {
        saveSessionResult({ topicId: topic.id, known: known + (didKnow ? 1 : 0), unknown: unknown + (didKnow ? 0 : 1), date: new Date().toISOString() });
        navigate(`/results/${topic.id}`, { state: { known: known + (didKnow ? 1 : 0), unknown: unknown + (didKnow ? 0 : 1), total: topic.cards.length } });
      } else {
        if (didKnow) setKnown(k => k + 1); else setUnknown(u => u + 1);
        setCurrentIndex(v => v + 1);
        setIsFlipped(false);
        setCardKey(k => k + 1);
        setDirection(null);
        setVoiceAttempts(0);
        setLastSpoken("");
      }
    }, 300);
  }, [currentIndex, topic, known, unknown, navigate]);

  const moveNextRef = useRef(moveNext);
  useEffect(() => { moveNextRef.current = moveNext; }, [moveNext]);

  // 4. ОБРАБОТЧИК ГОЛОСА
  const onVoice = useCallback((action: any) => {
    const card = topic?.cards[currentIndex];
    // Блокируем обработку, если ассистент сам говорит
    if (!card || isSpeaking) return false;

    const rawPhrase = getActionString(action, ["answer", "text", "spoken_answer", "value"]) || "";
    const phrase = normalizeText(cleanPhrase(rawPhrase));

    if (!phrase) return true;

    if (phrase === "знаю" || phrase === "дальше") {
      moveNextRef.current(true);
      return true;
    }
    
    if (phrase === "не знаю" || phrase.includes("ответ")) {
      speak(`Это ${card.back}`, "reveal");
      setIsFlipped(true);
      return true;
    }

    setLastSpoken(rawPhrase);
    const correct = normalizeText(card.back);
    
    if (phrase.includes(correct) || correct.includes(phrase)) {
      speak("Правильно!", "correct");
      setIsFlipped(true);
      setTimeout(() => moveNextRef.current(true), 1500);
    } else {
      const attempts = voiceAttempts + 1;
      setVoiceAttempts(attempts);
      if (attempts >= MAX_VOICE_ATTEMPTS) {
        speak(`Нет, это слово ${card.back}`, "fail");
        setIsFlipped(true);
      } else {
        speak("Неверно, попробуй еще раз", `wrong_${attempts}`);
      }
    }
    return true;
  }, [topic, currentIndex, voiceAttempts, speak, isSpeaking]);

  useVoiceActionHandler(onVoice, [onVoice]);

  if (!topic) return null;
  const card = topic.cards[currentIndex];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 py-4 overflow-hidden">
      <div className="w-full max-w-md flex flex-col h-full gap-4">
        {/* Header */}
        <header className="flex justify-between items-center h-10 px-2 shrink-0">
          <button onClick={() => navigate("/")} className="text-muted-foreground font-bold text-xs flex items-center gap-1">
            <ChevronLeft size={18}/> Назад
          </button>
          <div className="text-center">
            <span className="font-black text-sm uppercase tracking-tight">{topic.title}</span>
            <p className="text-[10px] text-muted-foreground font-bold tracking-widest">{currentIndex + 1} / {topic.cards.length}</p>
          </div>
          <div className="w-16" />
        </header>

        {/* Card */}
        <div className="relative w-full h-[380px] perspective-1000 my-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key={cardKey} className="w-full h-full"
              initial={{ x: 160, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction === "right" ? 500 : -500, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
            >
              <FlashCard front={card.front} back={card.back} flipped={isFlipped} onFlip={setIsFlipped} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Индикатор - ТЕПЕРЬ ОН ВСЕГДА ПОКАЗЫВАЕТ СТАТУС МИКРОФОНА */}
        <div className="shrink-0 space-y-3 pb-8">
          <motion.div 
            animate={{ 
              borderColor: recognizedStatus === "listen" ? "var(--primary)" : "var(--border)",
              backgroundColor: recognizedStatus === "listen" ? "rgba(var(--primary-rgb), 0.05)" : "var(--card)"
            }}
            className="rounded-3xl border-2 p-5 shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {recognizedStatus === "listen" ? (
                  <Mic size={16} className="text-primary animate-pulse" />
                ) : (
                  <MicOff size={16} className="text-muted-foreground" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-widest ${recognizedStatus === "listen" ? "text-primary" : "text-muted-foreground"}`}>
                  {isSpeaking ? "Салют говорит..." : recognizedStatus === "listen" ? "Слушаю вас" : "Микрофон выключен"}
                </span>
              </div>
              {recognizedStatus === "listen" && (
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                </div>
              )}
            </div>
            <p className="text-sm font-bold min-h-[1.25rem]">
              {recognizedText || lastSpoken || <span className="opacity-20 italic font-normal">Жду ответа...</span>}
            </p>
          </motion.div>

          <div className="flex gap-4">
            <button onClick={() => moveNext(false)} className="flex-1 bg-card border-2 border-border py-5 rounded-[2rem] flex justify-center active:scale-95 transition-transform">
              <X size={28} className="text-destructive" strokeWidth={3} />
            </button>
            <button onClick={() => moveNext(true)} className="flex-1 bg-primary text-primary-foreground py-5 rounded-[2rem] shadow-lg flex justify-center active:scale-95 transition-transform">
              <Check size={28} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}