import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { getTopicById, saveSessionResult } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { FlashCard } from "../components/FlashCard";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches } from "../voice/flashcardVoice";

export function Study() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { setAssistantState, speak } = useVoiceAssistant();

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

  const handleAnswer = useCallback((didKnow: boolean) => {
    if (!topic || !card || total === 0) {
      return;
    }

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
      setIsFlipped(false);
      setCardKey((k) => k + 1);
    }
  }, [card, currentIndex, isCustom, known, navigate, topic, total, unknown]);

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

      if (actionMatches(action, ["show_answer", "reveal_answer", "read_answer"])) {
        setIsFlipped(true);
        speak(`Ответ: ${card.back}`, "read_answer");
        return true;
      }

      if (actionMatches(action, ["flip_card", "turn_card"])) {
        const next = !isFlipped;
        setIsFlipped(next);
        speak(next ? `Ответ: ${card.back}` : `Вопрос: ${card.front}`, next ? "read_answer" : "read_question");
        return true;
      }

      if (actionMatches(action, ["repeat_question", "read_question"])) {
        speak(`Вопрос: ${card.front}`, "read_question");
        return true;
      }

      if (actionMatches(action, ["know_card", "mark_known", "known", "i_know"])) {
        handleAnswer(true);
        return true;
      }

      if (
        actionMatches(action, [
          "dont_know_card",
          "do_not_know_card",
          "mark_unknown",
          "unknown",
          "i_dont_know",
        ])
      ) {
        handleAnswer(false);
        return true;
      }

      if (actionMatches(action, ["study_again", "restart_study"])) {
        setCurrentIndex(0);
        setKnown(0);
        setUnknown(0);
        setIsFlipped(false);
        setCardKey((key) => key + 1);
        return true;
      }

      return false;
    },
    [card, handleAnswer, isFlipped, speak, topic],
    30
  );

  if (!topic || !card || total === 0) return null;

  const progress = (currentIndex / total) * 100;

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
          onFlip={setIsFlipped}
        />
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
    </div>
  );
}
