import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  ArrowLeft, 
  Trophy, 
  RotateCcw, 
  Home as HomeIcon,
  ChevronRight,
  BrainCircuit
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

  const startQuiz = (topic: any) => {
    if (topic.cards.length < 5) {
      toast.error("В теме должно быть минимум 5 карточек для теста");
      return;
    }

    const cards = [...topic.cards];
    
    // ЛОГИКА ИЗМЕНЕНА: Перемешиваем и берем либо 10, либо всё что есть
    const shuffledCards = cards.sort(() => 0.5 - Math.random());
    const selectedCards = shuffledCards.length >= 10 
      ? shuffledCards.slice(0, 10) 
      : shuffledCards;

    const generatedQuestions: Question[] = selectedCards.map((card, idx) => {
      const otherBacks = topic.cards
        .filter((c: any) => c.back !== card.back)
        .map((c: any) => c.back)
        .sort(() => 0.5 - Math.random());
      
      const options = [card.back, otherBacks[0], otherBacks[1]]
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
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }

    const loadTopics = async () => {
      try {
        const data = await fetchUserData();
        const combined = [
          ...data.customTopics,
          ...builtInTopics.filter(t => !data.hiddenIds.includes(t.id))
        ];
        setAllTopics(combined);

        const autoTopicId = location.state?.autoStartTopicId;
        if (autoTopicId) {
          const target = combined.find(t => t.id === autoTopicId);
          if (target) {
            startQuiz(target);
          }
        }
      } catch (e) {
        toast.error("Ошибка загрузки тем");
      } finally {
        setIsLoading(false);
      }
    };
    loadTopics();
  }, [isAuthenticated, navigate, location.state]);

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

  if (isLoading) return null;

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
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <TopicIcon name={topic.emoji || topic.icon} size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-lg leading-tight">{topic.title}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{topic.cards.length} карточек</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "quiz" && (
          <div className="animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              {/* ИЗМЕНЕНО: Динамический счетчик / questions.length */}
              <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                Вопрос {currentIndex + 1} / {questions.length}
              </div>
              <button onClick={() => setStep("select")} className="text-muted-foreground hover:text-destructive transition-colors">
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
                  className="w-full p-6 bg-card border border-border rounded-[1.5rem] font-bold text-sm text-left hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition-all"
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
            <p className="text-muted-foreground mb-8 text-sm font-bold uppercase tracking-tight">Результат: {selectedTopic.title}</p>
            
            {/* ИЗМЕНЕНО: Динамический итоговый счетчик */}
            <div className="text-7xl font-black text-primary mb-12 tabular-nums">
              {score}<span className="text-2xl text-muted-foreground">/{questions.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => startQuiz(selectedTopic)}
                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Пересдать
              </button>
              <button 
                onClick={() => navigate("/")}
                className="w-full py-5 bg-muted text-foreground rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <HomeIcon size={18} /> В библиотеку
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}