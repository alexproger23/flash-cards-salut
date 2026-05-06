import React, { useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { getTopicById } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { useVoiceAssistant } from "../voice/VoiceAssistantProvider";

interface LocationState {
  known: number;
  unknown: number;
  total: number;
  isCustom?: boolean;
}

export function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topicId } = useParams<{ topicId: string }>();
  const { setAssistantState, startListening } = useVoiceAssistant();

  const state = location.state as LocationState | null;
  const builtIn = topicId ? getTopicById(topicId) : undefined;
  const custom = topicId ? getCustomTopicById(topicId) : undefined;
  const topic = builtIn || custom;
  const isCustom = Boolean(custom);

  useEffect(() => {
    if (!state || !topic) {
      return;
    }

    setAssistantState({
      screen: "results",
      currentTopic: {
        id: topic.id,
        title: topic.title,
        cardsCount: topic.cards.length,
        custom: isCustom,
      },
      results: state,
    });
  }, [isCustom, setAssistantState, state, topic]);

  if (!state || !topic) {
    navigate("/");
    return null;
  }

  const { known, unknown, total } = state;
  const percentage = Math.round((known / total) * 100);

  const getMessage = () => {
    if (percentage === 100) return { text: "Perfect score!", emoji: "🏆" };
    if (percentage >= 80) return { text: "Great job!", emoji: "🌟" };
    if (percentage >= 60) return { text: "Good effort!", emoji: "👍" };
    if (percentage >= 40) return { text: "Keep practicing!", emoji: "💪" };
    return { text: "Keep going!", emoji: "📚" };
  };

  const { text, emoji } = getMessage();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#fafafa" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-10 flex flex-col items-center text-center"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 32px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{emoji}</div>
        <h1 style={{ color: "#1a1a2e", marginBottom: "0.25rem" }}>{text}</h1>
        <p style={{ color: "#9898b0", fontSize: "0.9rem", marginBottom: "2rem" }}>
          {topic.emoji} {topic.title}
        </p>

        {/* Score Ring */}
        <div className="relative flex items-center justify-center mb-8" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#ebebf0" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#1a1a2e"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span style={{ fontSize: "1.6rem", fontWeight: 600, color: "#1a1a2e" }}>
              {percentage}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex w-full gap-3 mb-8">
          <div className="flex-1 rounded-2xl py-4" style={{ backgroundColor: "#f6f9f6" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 600, color: "#1a1a2e" }}>{known}</div>
            <div style={{ fontSize: "0.78rem", color: "#7a9a7a", marginTop: "0.1rem" }}>Knew it</div>
          </div>
          <div className="flex-1 rounded-2xl py-4" style={{ backgroundColor: "#fff5f5" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 600, color: "#e05252" }}>{unknown}</div>
            <div style={{ fontSize: "0.78rem", color: "#c08888", marginTop: "0.1rem" }}>Didn't know</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              startListening();
              navigate(`/study/${topic.id}`);
            }}
            className="w-full rounded-2xl py-4 text-sm transition-all duration-150 active:scale-95"
            style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a3e")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a2e")}
          >
            Study again
          </button>
          {isCustom && (
            <button
              onClick={() => navigate(`/topics/${topic.id}`)}
              className="w-full rounded-2xl py-4 text-sm transition-all duration-150 active:scale-95"
              style={{ backgroundColor: "#f0f0f7", color: "#5a5a7a" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e8e8f0")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f0f0f7")}
            >
              Back to topic
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full rounded-2xl py-4 text-sm transition-all duration-150 active:scale-95"
            style={{ backgroundColor: "#f5f5f8", color: "#5a5a7a" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ebebf0")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f5f5f8")}
          >
            All topics
          </button>
        </div>
      </div>
    </div>
  );
}
