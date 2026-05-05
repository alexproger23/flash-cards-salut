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
  BookOpen
} from "lucide-react";

// ТВОИ КОМПОНЕНТЫ
import { TopicIcon } from "./components/TopicIcon"; 
import { topics as builtInTopics } from "../data/flashcards";
// Импортируем новые функции для работы с бэкендом
import { fetchUserData, deleteCustomTopic, hideDefaultTopic, type CustomTopic } from "../data/customTopics";
import { useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { useAuth } from "../context/AuthContext";
import { isCustomVoiceTopic } from "../voice/flashcardVoice";
import { toast } from "sonner";

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // user.id больше не нужен, сервер определяет нас по токену
  const { setAssistantState } = useVoiceAssistant();
  
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [visibleBuiltInTopics, setVisibleBuiltInTopics] = useState(builtInTopics);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; isCustom: boolean } | null>(null);

  // Обновленный useEffect, который стучится на сервер
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated) {
        try {
          // Запрашиваем данные у нашего сервера (он сам проверит токен)
          const data = await fetchUserData();
          
          // Загружаем личные карты юзера
          setCustomTopics(data.customTopics);
          
          // Фильтруем базовые карты (убираем те, ID которых есть в hiddenIds)
          setVisibleBuiltInTopics(builtInTopics.filter(t => !data.hiddenIds.includes(t.id)));
        } catch (error) {
          console.error("Ошибка при загрузке данных с сервера:", error);
          toast.error("Не удалось загрузить данные");
        }
      } else {
        // Если гость — показываем стандарт и пустые личные
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

  // Обновленная асинхронная функция удаления
  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.isCustom) {
        // Отправляем запрос на удаление личной темы
        await deleteCustomTopic(deleteConfirm.id);
        setCustomTopics(prev => prev.filter(t => t.id !== deleteConfirm.id));
        toast.success(`Тема "${deleteConfirm.title}" удалена`);
      } else {
        // Отправляем запрос на скрытие базовой темы
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
  };

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
            onClick={() => isAuthenticated ? navigate("/topics/new") : setIsAuthModalOpen(true)}
            className="flex items-center gap-2 text-[11px] font-black uppercase px-6 py-3 rounded-2xl bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 shadow-md shadow-primary/20"
          >
            <Plus size={14} strokeWidth={4} /> Создать
          </button>
        </div>

        {/* СЕКЦИЯ ЛИЧНЫХ КАРТ */}
        <section className="space-y-4 mb-14">
          {!isAuthenticated ? (
            <button 
              onClick={() => setIsAuthModalOpen(true)} 
              className="w-full rounded-[2.5rem] py-12 bg-card border-2 border-dashed border-border flex flex-col items-center hover:bg-muted/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground group-hover:text-primary transition-all">
                <Lock size={24} />
              </div>
              <p className="font-black text-lg mb-1 uppercase tracking-tighter">Личное пространство</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Требуется вход</p>
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
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest italic">Начать тест</span>
                      </div>
                    </div>
                    <Play size={20} className="text-primary fill-current" />
                  </button>

                  <button
                    onClick={() => navigate(`/topics/${topic.id}`)}
                    className="w-16 rounded-[2rem] bg-muted border border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <Settings2 size={20} />
                    <span className="text-[8px] font-black uppercase mt-1">Ред.</span>
                  </button>

                  {/* КОРЗИНА: красная только при hover */}
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
            <div key={topic.id} className="relative group">
              <button 
                onClick={() => navigate(`/study/${topic.id}`)} 
                className="w-full text-left rounded-[2.2rem] p-5 flex items-center justify-between transition-all bg-card border border-border hover:border-primary/20 hover:shadow-lg shadow-sm"
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
                <div className="px-4 py-2 rounded-xl bg-primary/10 text-[10px] font-black text-primary tracking-widest uppercase">
                  Открыть
                </div>
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

      {/* МОДАЛКА АВТОРИЗАЦИИ */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" onClick={() => setIsAuthModalOpen(false)} />
          <div className="relative bg-card border border-border shadow-2xl rounded-[3rem] max-w-sm w-full p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Sparkles size={40} />
            </div>
            <h2 className="text-3xl font-black mb-4 uppercase italic tracking-tighter">Привет!</h2>
            <p className="text-muted-foreground mb-10 text-sm font-bold uppercase tracking-tight leading-relaxed">Чтобы сохранять свои колоды, нужно авторизоваться.</p>
            <div className="space-y-3">
              <button onClick={() => navigate("/auth")} className="w-full py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20">Войти</button>
              <button onClick={() => setIsAuthModalOpen(false)} className="w-full py-4 text-muted-foreground font-black uppercase text-[10px] tracking-widest hover:text-foreground">Позже</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}