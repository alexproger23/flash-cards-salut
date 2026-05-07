import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  ArrowLeft, 
  Trophy, 
  RotateCcw, 
  Home as HomeIcon,
  ChevronRight,
  BrainCircuit,
  Loader2
} from "lucide-react";
import { topics as builtInTopics } from "../data/flashcards";
import { fetchUserData } from "../data/customTopics";
import { TopicIcon } from "./components/TopicIcon";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface Question {
  id: string;
  term: string;
  correctAnswer: string;
  options: string[];
}

export function Tests() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const [step, setStep] = useState<"select" | "quiz" | "result">("select");
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Обернули функцию в useCallback, чтобы она не пересоздавалась и стабильно работала в useEffect
  const startQuiz = useCallback((topic: any) => {
    // Снизили лимит до 3 карточек (нужен 1 правильный ответ и 2 неправильных)
    if (!topic.cards || topic.cards.length < 3) {
      toast.error("В теме должно быть минимум 3 карточки для теста!");
      return;
    }

    const cards = [...topic.cards];
    
    // Перемешиваем и берем либо 10, либо всё что есть
    const shuffledCards = cards.sort(() => 0.5 - Math.random());
    const selectedCards = shuffledCards.length >= 10 
      ? shuffledCards.slice(0, 10) 
      : shuffledCards;

    const generatedQuestions: Question[] = selectedCards.map((card, idx) => {
      // Ищем другие варианты ответов (не равные правильному)
      const otherBacks = topic.cards
        .filter((c: any) => c.back !== card.back)
        .map((c: any) => c.back)
        .sort(() => 0.5 - Math.random());
      
      // Берем 2 неправильных (если вдруг их не хватает, ставим заглушку, чтобы не сломать UI)
      const wrong1 = otherBacks[0] || "Нет данных";
      const wrong2 = otherBacks[1] || "Пусто";

      const options = [card.back, wrong1, wrong2]
        .sort(() => 0.5 - Math.random());

      return {
        id: `${card.id}-${idx}`,
        term: card.front,
        correctAnswer: card.back,
        options
      };
    });

    setQuestions(generatedQuestions);
    setSelectedTopic(topic);
    setCurrentIndex(0);
    setScore(0);
    setStep("quiz");
  }, []);

  useEffect(() => {
    const loadTopics = async () => {
      setIsLoading(true);
      try {
        let combined: any[] = [...builtInTopics];

        // Если пользователь авторизован — подмешиваем его личные темы
        // Если нет — показываем только базовые (теперь не выкидывает гостей!)
        if (isAuthenticated) {
          const data = await fetchUserData();
          combined = [
            ...data.customTopics,
            ...builtInTopics.filter(t => !data.hiddenIds.includes(t.id))
          ];
        }

        setAllTopics(combined);

        // Проверяем, есть ли запрос на автозапуск теста
        const autoTopicId = location.state?.autoStartTopicId;
        if (autoTopicId) {
          const target = combined.find(t => t.id === autoTopicId);
          if (target) {
            // Небольшая задержка, чтобы избежать конфликтов рендера React
            setTimeout(() => startQuiz(target), 0);
          } else {
            toast.error("Тема для теста не найдена");
          }
        }
      } catch (e) {
        console.error(e);
        toast.error("Ошибка загрузки тем");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTopics();
  }, [isAuthenticated, location.state, startQuiz]);

  const handleAnswer = (answer: string) => {
    if (answer === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setStep("result");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-muted-foreground font-medium animate-pulse">Загрузка тестов...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="w-full max-w-xl">
        
        {step === "select" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => navigate("/")} className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-bold text-sm">
              <ArrowLeft size={18} /> На главную
            </button>
            <h1 className="text-4xl font-black mb-2 uppercase italic">Режим теста</h1>
            <p className="text-muted-foreground font-medium mb-10 text-sm uppercase tracking-widest">Выбери тему для проверки</p>
            
            <div className="grid gap-3">
              {allTopics.map(topic => (
                <button 
                  key={topic.id}
                  onClick={() => startQuiz(topic)}
                  className="flex items-center justify-between p-5 bg-card border border-border rounded-[2rem] hover:border-primary transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <TopicIcon name={topic.emoji || topic.icon} size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-lg leading-tight">{topic.title}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{topic.cards?.length || 0} карточек</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "quiz" && (
          <div className="animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                Вопрос {currentIndex + 1} / {questions.length}
              </div>
              <button 
                onClick={() => setStep("select")} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            <div className="bg-card border-2 border-border rounded-[3rem] p-10 mb-8 shadow-xl text-center">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-4 opacity-50">Термин</span>
              <h2 className="text-3xl font-black text-foreground leading-tight italic">
                {questions[currentIndex].term}
              </h2>
            </div>

            <div className="grid gap-3">
              {questions[currentIndex].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  className="w-full p-6 bg-card border border-border rounded-[1.5rem] font-bold text-sm text-center hover:border-primary hover:bg-primary/5 hover:shadow-md active:scale-[0.98] transition-all"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="text-center animate-in zoom-in-95 duration-500 py-10">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Trophy size={48} />
            </div>
            <h2 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">Тест завершен!</h2>
            <p className="text-muted-foreground mb-8 text-sm font-bold uppercase tracking-tight">Тема: {selectedTopic.title}</p>
            
            <div className="text-7xl font-black text-primary mb-12 tabular-nums">
              {score}<span className="text-2xl text-muted-foreground">/{questions.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => startQuiz(selectedTopic)}
                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RotateCcw size={18} strokeWidth={3} /> Повторить тест
              </button>
              <button 
                onClick={() => navigate("/")}
                className="w-full py-5 bg-muted text-foreground rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <HomeIcon size={18} strokeWidth={3} /> В библиотеку
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}