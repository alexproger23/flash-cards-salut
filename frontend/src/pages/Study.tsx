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

export function Study() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  
  // Достаем методы ассистента
  const { setAssistantState, startListening, sendAssistantAction } = useVoiceAssistant();

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

  // 1. ЗАГРУЗКА ТЕМЫ
  useEffect(() => {
    const loadTopic = async () => {
      if (!topicId) return navigate("/");
      setIsLoading(true);
      
      try {
        const builtIn = getTopicById(topicId);
        let currentTopic = builtIn;

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

  // 2. ЛОГИКА ОТВЕТА (Обернута в Ref для доступа из голоса)
  const handleAnswer = useCallback((didKnow: boolean) => {
    if (!topic) return;

    setDirection(didKnow ? "right" : "left");

    setTimeout(() => {
      const isLast = currentIndex + 1 >= topic.cards.length;
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
          state: { known: finalKnown, unknown: finalUnknown, total: topic.cards.length, isCustom }
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
  }, [currentIndex, topic, known, unknown, navigate, isCustom]);

  const handleAnswerRef = useRef(handleAnswer);
  useEffect(() => { handleAnswerRef.current = handleAnswer; }, [handleAnswer]);

  // 3. ГОЛОСОВОЙ ОБРАБОТЧИК
  useVoiceActionHandler(useCallback((action: any) => {
    console.log(">>> SIGNAL IN STUDY:", action);

    const phrase = (action.answer || "").toLowerCase();
    const type = action.type || "";

    // Игнорируем технические фразы запуска
    if (phrase.includes("запусти")) return false;

    // Переворот (по типу экшена или по любому тексту)
    if (type === "check_answer" || type === "flip_card" || phrase.length > 0) {
      setIsFlipped(true);
      return true;
    }

    // Ответы
    if (type === "know" || type === "next") {
      handleAnswerRef.current(true);
      return true;
    }

    if (type === "dont_know") {
      handleAnswerRef.current(false);
      return true;
    }

    return false;
  }, [setIsFlipped]), []);

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

  const card = topic?.cards[currentIndex];
  if (!card) return null;

  return (
    <div 
      className="min-h-[100dvh] bg-background flex flex-col items-center px-4 py-6 overflow-hidden select-none"
      onClick={activateVoice} // Клик по экрану «будит» Салют
    >
      <div className="w-full max-w-md flex flex-col h-full gap-6">
        
        {/* Header */}
        <header className="flex justify-between items-center h-10 px-2">
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
        <div className="h-1 bg-muted rounded-full mx-2 overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentIndex / topic.cards.length) * 100}%` }}
          />
        </div>

        {/* Card Canvas */}
        <div 
          className="relative w-full h-[400px] perspective-1000 my-auto"
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
        <div className="mt-auto space-y-6 pb-4">
          <div className={`text-center transition-opacity ${isFlipped ? "opacity-0" : "opacity-100"}`}>
             <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <Info size={12} />
                Нажми на экран или скажи «Переверни»
             </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); handleAnswer(false); }}
              className="flex-1 flex flex-col items-center gap-1 bg-card border-2 border-destructive/10 py-5 rounded-[2.5rem] active:scale-95 transition-all"
            >
              <X size={28} className="text-destructive" strokeWidth={3} />
              <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Не знаю</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleAnswer(true); }}
              className="flex-1 flex flex-col items-center gap-1 bg-primary text-primary-foreground py-5 rounded-[2.5rem] shadow-xl shadow-primary/20 active:scale-95 transition-all"
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