import React, { useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { RotateCcw, Home, LayoutList, Trophy, Star, CheckCircle2 } from "lucide-react";
import { getTopicById } from "../data/flashcards";
import { getCustomTopicById } from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches } from "../voice/flashcardVoice";
import { TopicIcon } from "./components/TopicIcon"; // Импортируем наш универсальный компонент

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
    if (percentage === 100) return { text: "Идеальный результат!", icon: <Trophy className="text-yellow-500" size={54} /> };
    if (percentage >= 80) return { text: "Отличная работа!", icon: <Star className="text-yellow-400" size={54} /> };
    if (percentage >= 60) return { text: "Хороший прогресс!", icon: <CheckCircle2 className="text-green-500" size={54} /> };
    return { text: "Нужно попрактиковаться", icon: <LayoutList className="text-primary" size={54} /> };
  };

  const { text, icon } = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-sm bg-card border border-border rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
        
        {/* Декоративный фон для иконки результата */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
          <div className="relative animate-bounce duration-[3000ms]">
            {icon}
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-foreground mb-3 leading-tight">
          {text}
        </h1>
        
        {/* Бейдж темы с иконкой */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-10 border border-border/50">
          <div className="text-primary">
            <TopicIcon name={topic.emoji} size={14} />
          </div>
          <span className="truncate max-w-[150px]">{topic.title}</span>
        </div>

        {/* Кольцо прогресса */}
        <div className="relative flex items-center justify-center mb-12 group">
          <svg className="w-36 h-36 -rotate-90">
            <circle cx="72" cy="72" r="64" fill="none" className="stroke-muted/20" strokeWidth="12" />
            <circle
              cx="72"
              cy="72"
              r="64"
              fill="none"
              className="stroke-primary"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 64}
              strokeDashoffset={2 * Math.PI * 64 * (1 - percentage / 100)}
              style={{ transition: "stroke-dashoffset 2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black text-foreground">{percentage}%</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">успеха</span>
          </div>
        </div>

        {/* Статистика */}
        <div className="flex w-full gap-4 mb-10">
          <div className="flex-1 rounded-[1.5rem] py-5 bg-green-500/5 border border-green-500/10 transition-all hover:bg-green-500/10">
            <div className="text-3xl font-black text-green-600 dark:text-green-400">{known}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-green-600/60 mt-1">Верно</div>
          </div>
          <div className="flex-1 rounded-[1.5rem] py-5 bg-destructive/5 border border-destructive/10 transition-all hover:bg-destructive/10">
            <div className="text-3xl font-black text-destructive">{unknown}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-destructive/60 mt-1">Ошибки</div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate(`/study/${topic.id}`)}
            className="w-full flex items-center justify-center gap-3 rounded-2xl py-4.5 text-sm font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <RotateCcw size={18} strokeWidth={3} />
            Повторить
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            {isCustom && (
              <button
                onClick={() => navigate(`/topics/${topic.id}`)}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all border border-border"
              >
                <LayoutList size={16} />
                К теме
              </button>
            )}
            <button
              onClick={() => navigate("/")}
              className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 active:scale-95 transition-all border border-border ${!isCustom ? 'col-span-2' : ''}`}
            >
              <Home size={16} />
              Главная
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}