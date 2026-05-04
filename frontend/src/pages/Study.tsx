import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, X, Check, Info } from "lucide-react";
import { getTopicById, saveSessionResult } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { FlashCard } from "./components/FlashCard";
import { TopicIcon } from "./components/TopicIcon";

export function Study() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const builtIn = topicId ? getTopicById(topicId) : undefined;
  const custom = topicId ? getCustomTopicById(topicId) : undefined;
  const topic = builtIn || custom;
  const isCustom = Boolean(custom);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    if (!topic) { navigate("/"); return; }
    if (topic.cards.length === 0) { navigate(isCustom ? `/topics/${topicId}` : "/"); }
  }, [topic, navigate, isCustom, topicId]);

  const total = topic?.cards.length ?? 0;
  const card = topic && total > 0 ? topic.cards[currentIndex] : undefined;

  const handleAnswer = useCallback((didKnow: boolean) => {
    if (!topic || !card || total === 0) return;
    const newKnown = didKnow ? known + 1 : known;
    const newUnknown = didKnow ? unknown : unknown + 1;

    if (currentIndex + 1 >= total) {
      saveSessionResult({ topicId: topic.id, known: newKnown, unknown: newUnknown, date: new Date().toISOString() });
      navigate(`/results/${topic.id}`, { state: { known: newKnown, unknown: newUnknown, total, isCustom } });
    } else {
      if (didKnow) setKnown(newKnown);
      else setUnknown(newUnknown);
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
      setCardKey((k) => k + 1);
    }
  }, [card, currentIndex, isCustom, known, navigate, topic, total, unknown]);

  if (!topic || !card || total === 0) return null;
  const progress = (currentIndex / total) * 100;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 py-6 md:py-10">
      <div className="w-full max-w-md flex flex-col h-full gap-6">
        
        {/* Header */}
        <header className="flex justify-between items-center px-2">
          <button 
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-bold text-sm transition-colors" 
            onClick={() => navigate(isCustom ? `/topics/${topicId}` : "/")}
          >
            <ChevronLeft size={20} />
            Выход
          </button>
          
          <div className="flex flex-col items-center max-w-[180px]">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-primary flex-shrink-0">
                <TopicIcon name={topic.emoji} size={16} />
              </div>
              <span className="font-black text-sm tracking-tight truncate">
                {topic.title}
              </span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {currentIndex + 1} / {total}
            </span>
          </div>
          
          <div className="w-10" />
        </header>

        {/* Progress Bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mx-2 shadow-inner">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        {/* CARD CONTAINER - Используем класс из index.css */}
        <div className="relative w-full h-[420px] perspective-1000 my-2">
          <FlashCard
            key={cardKey}
            front={card.front}
            back={card.back}
            frontLabel={topic.frontLabel}
            backLabel={topic.backLabel}
            flipped={isFlipped}
            onFlip={setIsFlipped}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 mt-auto pb-4">
          <div className={`flex justify-center transition-opacity duration-300 ${isFlipped ? "opacity-0" : "opacity-100"}`}>
             <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                <Info size={12} />
                Нажми на карточку
             </div>
          </div>

          <div className={`flex gap-4 w-full transition-all duration-500 ${isFlipped ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}>
            <button 
              className="flex-1 flex flex-col items-center gap-1 bg-card border-2 border-destructive/20 hover:bg-destructive/5 rounded-[2rem] py-5 transition-all active:scale-95" 
              onClick={() => handleAnswer(false)}
            >
              <X size={28} className="text-destructive" strokeWidth={3} />
              <span className="text-[10px] font-black uppercase text-destructive tracking-widest">Не знаю</span>
            </button>

            <button 
              className="flex-1 flex flex-col items-center gap-1 bg-primary text-primary-foreground rounded-[2rem] py-5 transition-all active:scale-95 shadow-xl shadow-primary/25 hover:brightness-110" 
              onClick={() => handleAnswer(true)}
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