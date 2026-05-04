import React, { useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { getTopicById } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches } from "../voice/flashcardVoice";

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
  const { setAssistantState } = useVoiceAssistant();

  const state = location.state as LocationState | null;
  const builtIn = topicId ? getTopicById(topicId) : undefined;
  const custom = topicId ? getCustomTopicById(topicId) : undefined;
  const topic = builtIn || custom;
  const isCustom = Boolean(custom);

  useEffect(() => {
    if (!state || !topic) return;

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

  useVoiceActionHandler(
    (action) => {
      if (!topic) return false;
      if (actionMatches(action, ["study_again", "restart_study", "start_study"])) {
        navigate(`/study/${topic.id}`);
        return true;
      }
      if (actionMatches(action, ["open_topic", "back_to_topic"]) && isCustom) {
        navigate(`/topics/${topic.id}`);
        return true;
      }
      return false;
    },
    [isCustom, navigate, topic],
    20
  );

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm rounded-3xl p-10 flex flex-col items-center text-center bg-card shadow-xl border border-border/50">
        <div className="text-5xl mb-2">{emoji}</div>
        <h1 className="text-2xl font-bold text-foreground mb-1">{text}</h1>
        <p className="text-muted-foreground text-sm mb-8">
          {topic.emoji} {topic.title}
        </p>

        {/* Score Ring */}
        <div className="relative flex items-center justify-center mb-8 w-[120px] h-[120px]">
          <svg className="w-[120px] h-[120px] -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" className="stroke-muted" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              className="stroke-primary"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold text-foreground">
              {percentage}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex w-full gap-3 mb-8">
          <div className="flex-1 rounded-2xl py-4 bg-green-50 dark:bg-green-950/30">
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{known}</div>
            <div className="text-xs font-medium text-green-600/70 dark:text-green-500/70 mt-1">Knew it</div>
          </div>
          <div className="flex-1 rounded-2xl py-4 bg-red-50 dark:bg-red-950/30">
            <div className="text-2xl font-bold text-destructive">{unknown}</div>
            <div className="text-xs font-medium text-destructive/70 mt-1">Didn't know</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate(`/study/${topic.id}`)}
            className="w-full rounded-2xl py-4 text-sm font-medium transition-all duration-150 active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Study again
          </button>
          {isCustom && (
            <button
              onClick={() => navigate(`/topics/${topic.id}`)}
              className="w-full rounded-2xl py-4 text-sm font-medium transition-all duration-150 active:scale-95 bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Back to topic
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full rounded-2xl py-4 text-sm font-medium transition-all duration-150 active:scale-95 bg-muted text-muted-foreground hover:bg-muted/80"
          >
            All topics
          </button>
        </div>
      </div>
    </div>
  );
}