import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { getTopicById, saveSessionResult } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { FlashCard } from "../FlashCard";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches } from "../voice/flashcardVoice";

// (Хук useStudyVoiceIntegration оставляем без изменений, он не влияет на стили)
// ...вставьте сюда хук useStudyVoiceIntegration из предыдущего сообщения...

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
      didKnow ? setKnown(newKnown) : setUnknown(newUnknown);
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
      setCardKey((k) => k + 1);
    }
  }, [card, currentIndex, isCustom, known, navigate, topic, total, unknown]);

  const resetStudy = useCallback(() => {
    setCurrentIndex(0); setKnown(0); setUnknown(0); setIsFlipped(false); setCardKey((key) => key + 1);
  }, []);

  // useStudyVoiceIntegration({...}) - вызов хука

  if (!topic || !card || total === 0) return null;
  const progress = (currentIndex / total) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-10">
      {/* Ограничитель ширины (решает проблему растягивания) */}
      <div className="w-full max-w-lg flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <button 
            className="text-muted-foreground hover:text-foreground transition-colors" 
            onClick={() => navigate(isCustom ? `/topics/${topicId}` : "/")}
          >
            ← Назад
          </button>
          <span className="font-medium text-lg">
            {topic.emoji} {topic.title}
          </span>
          <span className="text-muted-foreground text-sm">
            {currentIndex + 1} / {total}
          </span>
        </header>

        {/* Progress Bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Card Container */}
        <div className="h-[320px] w-full [perspective:1000px]">
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

        {/* Actions */}
        <div className={`flex gap-4 transition-all duration-300 ${isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
          <button 
            className="flex-1 bg-card text-destructive border border-destructive/20 hover:bg-destructive/10 rounded-lg py-4 font-medium transition-colors active:scale-[0.98]" 
            onClick={() => handleAnswer(false)}
          >
            Не знаю
          </button>
          <button 
            className="flex-1 bg-primary text-primary-foreground hover:opacity-90 rounded-lg py-4 font-medium transition-colors active:scale-[0.98]" 
            onClick={() => handleAnswer(true)}
          >
            Знаю ✓
          </button>
        </div>

        <p className={`text-center text-sm text-muted-foreground transition-opacity ${isFlipped ? "opacity-0" : "opacity-100"}`}>
          Нажмите на карточку, чтобы увидеть ответ
        </p>

        {/* Score */}
        <div className="flex justify-center items-center gap-8 mt-4">
          <div className="text-center">
            <div className="text-2xl font-medium text-foreground">{known}</div>
            <div className="text-xs text-muted-foreground">знаю</div>
          </div>
          <div className="w-[1px] h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-medium text-destructive">{unknown}</div>
            <div className="text-xs text-muted-foreground">не знаю</div>
          </div>
        </div>

      </div>
    </div>
  );
}