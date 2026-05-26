import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { 
  Plus, 
  Lock, 
  Layers, 
  Trash2, 
  AlertCircle, 
  Play, 
  Settings2,
  BookOpen,
  Brain
} from "lucide-react";

import { TopicIcon } from "./components/TopicIcon"; 
import { topics as builtInTopics } from "../data/flashcards";
import { fetchUserData, deleteCustomTopic, hideDefaultTopic, type CustomTopic } from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { useAuth } from "../context/AuthContext";
import { actionMatches, findTopicFromAction, isCustomVoiceTopic } from "../voice/flashcardVoice";
import { toast } from "sonner";

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setAssistantState, speak } = useVoiceAssistant();
  
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [visibleBuiltInTopics, setVisibleBuiltInTopics] = useState(builtInTopics);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; isCustom: boolean } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        try {
          const data = await fetchUserData();
          setCustomTopics(data.customTopics);
          setVisibleBuiltInTopics(builtInTopics.filter(t => !data.hiddenIds.includes(t.id)));
        } catch (error) {
          console.error("Ошибка при загрузке данных с сервера:", error);
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
    const topicItems = allTopicsForVoice.map((t, index) => ({
      number: index + 1,
      id: t.id,
      title: t.title,
      cardsCount: t.cards.length,
      custom: isCustomVoiceTopic(t),
    }));

    setAssistantState({
      screen: "home",
      topics: topicItems,
      item_selector: {
        type: "topics",
        items: topicItems,
      },
      pendingDelete: deleteConfirm,
    });
  }, [customTopics, deleteConfirm, visibleBuiltInTopics, setAssistantState]);

  const confirmDelete = useCallback(async () => {
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
      console.error("Ошибка при удалении:", error);
      toast.error("Не удалось удалить тему");
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm]);

  useVoiceActionHandler(
    (action) => {
      const allTopics = [...customTopics, ...visibleBuiltInTopics];

      if (deleteConfirm && actionMatches(action, ["confirm", "confirm_delete"])) {
        void confirmDelete();
        return true;
      }

      if (deleteConfirm && actionMatches(action, ["cancel", "cancel_delete"])) {
        setDeleteConfirm(null);
        speak("Отменила.", "delete_cancelled");
        return true;
      }

      if (actionMatches(action, ["open_topic", "start_topic", "start_study"])) {
        void (async () => {
          const topic = await findTopicFromAction(action, allTopics);
          if (!topic) {
            speak("Не нашла такую тему.", "topic_not_found");
            return;
          }

          const shouldStudy = actionMatches(action, ["start_topic", "start_study"]);
          navigate(shouldStudy || !isCustomVoiceTopic(topic) ? `/study/${topic.id}` : `/topics/${topic.id}`);
        })();
        return true;
      }

      if (actionMatches(action, ["start_test"])) {
        void (async () => {
          const topic = await findTopicFromAction(action, allTopics);
          if (!topic) {
            navigate("/tests");
            return;
          }
          navigate("/tests", { state: { autoStartTopicId: topic.id } });
        })();
        return true;
      }

      if (actionMatches(action, ["edit_topic"])) {
        void (async () => {
          const topic = await findTopicFromAction(action, allTopics);
          if (!topic) {
            speak("Не нашла такую тему.", "topic_not_found");
            return;
          }
          if (!isCustomVoiceTopic(topic)) {
            speak("Стандартную тему нельзя редактировать.", "base_topic_edit_blocked");
            return;
          }
          navigate(`/topics/${topic.id}`);
        })();
        return true;
      }

      if (actionMatches(action, ["delete_topic", "hide_topic"])) {
        void (async () => {
          const topic = await findTopicFromAction(action, allTopics);
          if (!topic) {
            speak("Не нашла такую тему.", "topic_not_found");
            return;
          }
          setDeleteConfirm({
            id: topic.id,
            title: topic.title,
            isCustom: isCustomVoiceTopic(topic),
          });
          speak(`Удалить тему ${topic.title}?`, "delete_confirm");
        })();
        return true;
      }

      return false;
    },
    [confirmDelete, customTopics, deleteConfirm, navigate, speak, visibleBuiltInTopics],
    20
  );

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 bg-background text-foreground">
      <header className="text-center mb-16 animate-in fade-in duration-700">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2.2rem] bg-primary text-primary-foreground mb-6 shadow-lg">
          <Layers size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-3 uppercase italic">Flash-cards</h1>
        <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm opacity-70 uppercase tracking-widest leading-none">Твоя библиотека знаний</p>
      </header>

      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8 px-1">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">Библиотека</h2>
            <span className="text-[10px] font-bold text-primary uppercase italic leading-none">Личные коллекции</span>
          </div>
          <button
            onClick={() => isAuthenticated ? navigate("/topics/new") : navigate("/auth")}
            className="flex items-center gap-2 text-[11px] font-black uppercase px-6 py-3 rounded-2xl bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-md shadow-primary/20"
          >
            <Plus size={14} strokeWidth={4} /> Создать
          </button>
        </div>

        {/* СЕКЦИЯ ЛИЧНЫХ КАРТ */}
        <section className="space-y-4 mb-14">
          {!isAuthenticated ? (
            <button 
              onClick={() => navigate("/auth")} 
              className="w-full rounded-[2.5rem] py-12 bg-card border-2 border-dashed border-border flex flex-col items-center hover:bg-muted/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:text-primary transition-all">
                <Lock size={24} />
              </div>
              <p className="font-black text-lg mb-1 uppercase tracking-tighter">Личное пространство</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Нажми, чтобы войти</p>
            </button>
          ) : (
            customTopics.length > 0 ? (
              customTopics.map((topic) => (
                <div key={topic.id} className="relative group flex gap-3">
                  <button
                    onClick={() => navigate(`/study/${topic.id}`)}
                    className="flex-1 text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card border border-border hover:border-primary/40 hover:shadow-xl shadow-sm"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <TopicIcon name={topic.emoji} size={28} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg leading-tight mb-1">{topic.title}</h3>
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">Повторять</span>
                      </div>
                    </div>
                    <Play size={20} className="text-primary fill-current" />
                  </button>

                  {/* КНОПКА ТЕСТА ДЛЯ ЛИЧНЫХ ТЕМ */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate("/tests", { state: { autoStartTopicId: topic.id } });
                    }}
                    className="w-16 rounded-[2rem] bg-muted/30 border border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm hover:shadow-md"
                  >
                    <Brain size={20} />
                    <span className="text-[8px] font-black uppercase mt-1">Тест</span>
                  </button>

                  {/* КНОПКА РЕДАКТИРОВАНИЯ */}
                  <button
                    onClick={() => navigate(`/topics/${topic.id}`)}
                    className="w-16 rounded-[2rem] bg-muted/30 border border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm hover:shadow-md"
                  >
                    <Settings2 size={20} />
                    <span className="text-[8px] font-black uppercase mt-1">Ред.</span>
                  </button>

                  <button 
                    onClick={() => setDeleteConfirm({ id: topic.id, title: topic.title, isCustom: true })}
                    className="absolute -right-2 -top-2 w-8 h-8 bg-background border-2 border-border text-muted-foreground rounded-full flex items-center justify-center shadow-lg transition-all z-20 md:opacity-0 md:group-hover:opacity-100 hover:bg-[#ef4444] hover:text-white hover:border-[#ef4444] hover:scale-110"
                  >
                    <Trash2 size={14} strokeWidth={3} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-[2.5rem] opacity-50">
                <p className="text-xs font-black uppercase italic">Коллекция пуста</p>
              </div>
            )
          )}
        </section>

        {/* СЕКЦИЯ ПРИМЕРОВ */}
        <div className="flex items-center gap-6 mb-10 opacity-60">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">Примеры</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <section className="grid grid-cols-1 gap-4">
          {visibleBuiltInTopics.map((topic) => (
            <div key={topic.id} className="relative group flex gap-3">
              <button 
                onClick={() => navigate(`/study/${topic.id}`)} 
                className="flex-1 text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card border border-border hover:border-primary/20 hover:shadow-lg shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <TopicIcon name={topic.emoji} size={26} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight mb-1">{topic.title}</h3>
                    <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 italic">
                      <BookOpen size={10} /> Стандартный набор
                    </p>
                  </div>
                </div>
                <Play size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              {/* КНОПКА ТЕСТА ДЛЯ БАЗОВЫХ ТЕМ */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate("/tests", { state: { autoStartTopicId: topic.id } });
                }}
                className="w-16 rounded-[2rem] bg-muted/30 border border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm hover:shadow-md"
              >
                <Brain size={20} />
                <span className="text-[8px] font-black uppercase mt-1">Тест</span>
              </button>

              <button 
                onClick={() => setDeleteConfirm({ id: topic.id, title: topic.title, isCustom: false })}
                className="absolute -right-2 -top-2 w-8 h-8 bg-background border-2 border-border text-muted-foreground rounded-full flex items-center justify-center transition-all z-20 md:opacity-0 md:group-hover:opacity-100 shadow-lg hover:bg-[#ef4444] hover:text-white hover:border-[#ef4444] hover:scale-110"
              >
                <Trash2 size={14} strokeWidth={3} />
              </button>
            </div>
          ))}
        </section>
      </div>

      {/* МОДАЛКА УДАЛЕНИЯ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card border-2 border-border shadow-2xl rounded-[2.5rem] max-w-xs w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-destructive/10 text-[#ef4444] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase italic">Удалить?</h3>
            <p className="text-muted-foreground text-sm mb-8 font-medium italic tracking-tight">
              "{deleteConfirm.title}" исчезнет из библиотеки.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete} 
                className="w-full py-4 bg-[#ef4444] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-red-500/20 active:scale-95"
              >
                Удалить
              </button>
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="w-full py-4 bg-muted text-foreground rounded-2xl font-black uppercase tracking-widest text-[11px] active:scale-95"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
