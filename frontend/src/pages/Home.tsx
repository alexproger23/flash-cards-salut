import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  Plus, 
  Lock, 
  Layers, 
  Trash2, 
  AlertCircle, 
  Sparkles, 
  Play, 
  Settings2,
  BookOpen,
  BrainCircuit
} from "lucide-react";

import { TopicIcon } from "./components/TopicIcon"; 
import { topics as builtInTopics } from "../data/flashcards";
import { fetchUserData, deleteCustomTopic, hideDefaultTopic, type CustomTopic } from "../data/customTopics";
import { useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { useAuth } from "../context/AuthContext";
import { isCustomVoiceTopic } from "../voice/flashcardVoice";
import { toast } from "sonner";

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setAssistantState } = useVoiceAssistant();
  
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [visibleBuiltInTopics, setVisibleBuiltInTopics] = useState(builtInTopics);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; isCustom: boolean } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        try {
          const data = await fetchUserData();
          setCustomTopics(data.customTopics);
          setVisibleBuiltInTopics(builtInTopics.filter(t => !data.hiddenIds.includes(t.id)));
        } catch (error) {
          console.error("Ошибка при загрузке данных:", error);
          toast.error("Не удалось загрузить данные");
        }
      } else {
        setCustomTopics([]);
        setVisibleBuiltInTopics(builtInTopics);
      }
    };
    loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    const allTopicsForVoice = [...customTopics, ...visibleBuiltInTopics];
    setAssistantState({
      screen: "home",
      topics: allTopicsForVoice.map((t, index) => ({
        number: index + 1,
        id: t.id,
        title: t.title,
        cardsCount: t.cards.length,
        custom: isCustomVoiceTopic(t),
      })),
    });
  }, [customTopics, visibleBuiltInTopics, setAssistantState]);

  const handleTestClick = (e: React.MouseEvent, topic: any) => {
    e.stopPropagation();
    if (topic.cards.length < 5) {
      toast.error(`Для теста нужно минимум 5 карточек (сейчас: ${topic.cards.length})`);
      return;
    }
    navigate("/test", { state: { autoStartTopicId: topic.id } });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.isCustom) {
        await deleteCustomTopic(deleteConfirm.id);
        setCustomTopics(prev => prev.filter(t => t.id !== deleteConfirm.id));
        toast.success(`Тема "${deleteConfirm.title}" удалена`);
      } else {
        await hideDefaultTopic(deleteConfirm.id);
        setVisibleBuiltInTopics(prev => prev.filter(t => t.id !== deleteConfirm.id));
        toast.success(`Тема "${deleteConfirm.title}" скрыта`);
      }
    } catch (error) {
      toast.error("Ошибка удаления");
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 bg-background text-foreground">
      <header className="text-center mb-16 animate-in fade-in duration-700">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2.2rem] bg-primary text-primary-foreground mb-6 shadow-lg">
          <Layers size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-3 uppercase italic">Flash-cards</h1>
        <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm opacity-70 uppercase tracking-widest leading-none text-center">Твоя библиотека знаний</p>
      </header>

      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">Библиотека</h2>
            <span className="text-[10px] font-bold text-primary uppercase italic leading-none">Личные коллекции</span>
          </div>
          
          <button
            onClick={() => isAuthenticated ? navigate("/topics/new") : setIsAuthModalOpen(true)}
            className="flex items-center gap-2 text-[11px] font-black uppercase px-5 py-3 rounded-2xl bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-md shadow-primary/20"
          >
            <Plus size={14} strokeWidth={4} /> Создать
          </button>
        </div>

        <section className="space-y-4 mb-14">
          {!isAuthenticated ? (
            <button onClick={() => setIsAuthModalOpen(true)} className="w-full rounded-[2.5rem] py-12 bg-card border-2 border-dashed border-border flex flex-col items-center hover:bg-muted/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:text-primary transition-all">
                <Lock size={24} />
              </div>
              <p className="font-black text-lg mb-1 uppercase tracking-tighter">Личное пространство</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Требуется вход</p>
            </button>
          ) : (
            customTopics.map((topic) => (
              <div key={topic.id} className="relative group flex gap-2">
                <button
                  onClick={() => navigate(`/study/${topic.id}`)}
                  className="flex-1 text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card border border-border hover:border-primary/40 hover:shadow-xl shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <TopicIcon name={topic.emoji} size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-base leading-tight mb-0.5">{topic.title}</h3>
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest italic">Учить карточки</span>
                    </div>
                  </div>
                  <Play size={18} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={(e) => handleTestClick(e, topic)}
                  className={`w-14 rounded-[1.8rem] border flex flex-col items-center justify-center transition-all ${
                    topic.cards.length >= 5 
                    ? "bg-secondary border-border text-secondary-foreground hover:bg-primary hover:text-primary-foreground" 
                    : "bg-muted border-border text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                >
                  <BrainCircuit size={18} />
                  <span className="text-[7px] font-black uppercase mt-1">Тест</span>
                </button>

                <button
                  onClick={() => navigate(`/topics/${topic.id}`)}
                  className="w-14 rounded-[1.8rem] bg-muted border border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-foreground hover:text-background transition-all"
                >
                  <Settings2 size={18} />
                  <span className="text-[7px] font-black uppercase mt-1 leading-none text-center">Изменить</span>
                </button>

                <button 
                  onClick={() => setDeleteConfirm({ id: topic.id, title: topic.title, isCustom: true })}
                  className="absolute -right-1 -top-1 w-7 h-7 bg-background border-2 border-border text-muted-foreground rounded-full flex items-center justify-center shadow-lg transition-all z-20 md:opacity-0 md:group-hover:opacity-100 hover:bg-destructive hover:text-white"
                >
                  <Trash2 size={12} strokeWidth={3} />
                </button>
              </div>
            ))
          )}
        </section>

        <div className="flex items-center gap-6 mb-10 opacity-60">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">Примеры</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <section className="grid grid-cols-1 gap-4">
          {visibleBuiltInTopics.map((topic) => (
            <div key={topic.id} className="relative group flex gap-2">
              <button 
                onClick={() => navigate(`/study/${topic.id}`)} 
                className="flex-1 text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card border border-border hover:border-primary/20 hover:shadow-lg shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <TopicIcon name={topic.emoji} size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-base leading-tight mb-0.5">{topic.title}</h3>
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest italic flex items-center gap-1">
                      Учить карточки
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={(e) => handleTestClick(e, topic)}
                className={`w-14 rounded-[1.8rem] border flex flex-col items-center justify-center transition-all ${
                  topic.cards.length >= 5 
                  ? "bg-secondary border-border text-secondary-foreground hover:bg-primary hover:text-primary-foreground" 
                  : "bg-muted border-border text-muted-foreground opacity-50"
                }`}
              >
                <BrainCircuit size={18} />
                <span className="text-[7px] font-black uppercase mt-1">Тест</span>
              </button>

              <button 
                onClick={() => setDeleteConfirm({ id: topic.id, title: topic.title, isCustom: false })}
                className="absolute -right-1 -top-1 w-7 h-7 bg-background border-2 border-border text-muted-foreground rounded-full flex items-center justify-center transition-all z-20 md:opacity-0 md:group-hover:opacity-100 shadow-lg hover:bg-destructive hover:text-white"
              >
                <Trash2 size={12} strokeWidth={3} />
              </button>
            </div>
          ))}
        </section>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border-2 border-border shadow-2xl rounded-[2.5rem] max-w-xs w-full p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase italic text-center">Удалить?</h3>
            <div className="flex flex-col gap-2 mt-6">
              <button onClick={confirmDelete} className="w-full py-4 bg-destructive text-white rounded-2xl font-black uppercase tracking-widest text-[11px]">Удалить</button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 bg-muted text-foreground rounded-2xl font-black uppercase tracking-widest text-[11px]">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}