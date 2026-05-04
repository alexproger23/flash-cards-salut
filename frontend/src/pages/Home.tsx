import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import * as Icons from "lucide-react";
import { Plus, Lock, ArrowRight, Sparkles, Layers, Trash2, AlertCircle } from "lucide-react";
import { topics } from "../data/flashcards";
import { loadCustomTopics, type CustomTopic, deleteCustomTopic } from "../data/customTopics";
import { useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { useAuth } from "../context/AuthContext";
import { isCustomVoiceTopic } from "../voice/flashcardVoice";
import { toast } from "sonner";

const TopicIcon = ({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) => {
  const LucideIcon = (Icons as any)[name];
  if (LucideIcon) return <LucideIcon size={size} className={className} />;
  return <span style={{ fontSize: `${size}px` }} className={`leading-none ${className}`}>{name || "📚"}</span>;
};

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setAssistantState } = useVoiceAssistant();
  
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [visibleBuiltInTopics, setVisibleBuiltInTopics] = useState(topics);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; isCustom: boolean } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setCustomTopics(loadCustomTopics());
    } else {
      setCustomTopics([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const allTopics = [...customTopics, ...visibleBuiltInTopics];
    setAssistantState({
      screen: "home",
      topics: allTopics.map((t, index) => ({
        number: index + 1,
        id: t.id,
        title: t.title,
        cardsCount: t.cards.length,
        custom: isCustomVoiceTopic(t),
      })),
    });
  }, [customTopics, visibleBuiltInTopics, setAssistantState]);

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.isCustom) {
      deleteCustomTopic(deleteConfirm.id);
      setCustomTopics(loadCustomTopics());
    } else {
      setVisibleBuiltInTopics(prev => prev.filter(t => t.id !== deleteConfirm.id));
    }
    toast.success(`Тема "${deleteConfirm.title}" удалена`);
    setDeleteConfirm(null);
  };

  const handleProtectedAction = (targetPath: string) => {
    if (!isAuthenticated) setIsAuthModalOpen(true);
    else navigate(targetPath);
  };

  return (
    <div className="min-h-screen pt-12 pb-24 animate-in fade-in duration-700 px-4 bg-background text-foreground">
      <header className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2.2rem] bg-primary/10 text-primary mb-6 shadow-inner relative">
          <Layers size={32} strokeWidth={2.5} className="relative z-10" />
        </div>
        <h1 className="text-5xl font-black tracking-tight text-foreground mb-3 uppercase italic">Flash-cards</h1>
        <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm">Твоя умная библиотека знаний</p>
      </header>

      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">Библиотека</h2>
          <button
            onClick={() => handleProtectedAction("/topics/new")}
            className="group flex items-center gap-2 text-[11px] font-black uppercase px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground transition-all hover:shadow-xl active:scale-95 shadow-lg shadow-primary/20"
          >
            <Plus size={14} strokeWidth={4} /> Создать
          </button>
        </div>

        {/* Личные темы */}
        <section className="space-y-4 mb-14">
          {!isAuthenticated ? (
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              className="w-full rounded-[2.5rem] py-14 bg-card border-2 border-dashed border-border flex flex-col items-center hover:bg-muted/50 transition-colors"
            >
              <Lock size={26} className="mb-4 text-muted-foreground" />
              <p className="font-black text-xl text-foreground">Личное пространство</p>
            </button>
          ) : (
            customTopics.map((topic) => (
              <div key={topic.id} className="relative group">
                <button
                  onClick={() => navigate(`/topics/${topic.id}`)}
                  className="w-full text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card border border-border hover:border-primary/30 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-primary">
                      <TopicIcon name={topic.emoji} size={28} />
                    </div>
                    <div>
                      <h3 className="text-foreground font-bold text-lg leading-tight mb-1">{topic.title}</h3>
                      <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60">{topic.cards.length} карточек</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ArrowRight size={18} />
                  </div>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: topic.id, title: topic.title, isCustom: true }); }}
                  className="absolute -right-2 -top-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-90 z-20"
                >
                  <Trash2 size={14} strokeWidth={3} />
                </button>
              </div>
            ))
          )}
        </section>

        {/* Примеры */}
        <div className="flex items-center gap-6 mb-10 opacity-60 px-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">Примеры</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border" />
        </div>

        <section className="grid grid-cols-1 gap-4">
          {visibleBuiltInTopics.map((topic) => (
            <div key={topic.id} className="relative group">
              <button 
                onClick={() => navigate(`/study/${topic.id}`)} 
                className="w-full text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card/60 border border-border hover:bg-card hover:border-primary/20 hover:shadow-lg"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                    <TopicIcon name={topic.emoji} size={26} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-black text-lg leading-tight mb-1">{topic.title}</h3>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Стандартный набор</p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-primary/10 text-[10px] font-black text-primary tracking-[0.2em] group-hover:bg-primary group-hover:text-primary-foreground transition-all">TRY</div>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: topic.id, title: topic.title, isCustom: false }); }}
                className="absolute -right-2 -top-2 w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-destructive hover:text-destructive-foreground z-20"
              >
                <Trash2 size={14} strokeWidth={3} />
              </button>
            </div>
          ))}
        </section>
      </div>

      {/* MODAL: ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md transition-all" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border-2 border-border shadow-2xl rounded-[2.5rem] max-w-xs w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 tracking-tight text-foreground">Удалить тему?</h3>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
              Вы уверены, что хотите удалить <span className="text-foreground font-bold italic">"{deleteConfirm.title}"</span>? Это действие нельзя отменить.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete}
                className="w-full py-4 bg-destructive text-destructive-foreground rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all"
              >
                Да, удалить
              </button>
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="w-full py-4 bg-muted text-foreground rounded-2xl font-bold text-xs hover:bg-border transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: АВТОРИЗАЦИЯ */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl transition-all" onClick={() => setIsAuthModalOpen(false)} />
          <div className="relative bg-card border border-border shadow-2xl rounded-[3.5rem] max-w-sm w-full p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 rotate-12">
              <Sparkles size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 text-foreground">Новый уровень</h2>
            <p className="text-muted-foreground mb-10 text-sm font-medium leading-relaxed">Создавайте свои колоды и отслеживайте прогресс.</p>
            <div className="space-y-3">
              <button onClick={() => navigate("/auth")} className="w-full py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20">Войти</button>
              <button onClick={() => setIsAuthModalOpen(false)} className="w-full py-4 text-muted-foreground font-bold text-xs hover:bg-muted rounded-[1.25rem]">Позже</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}