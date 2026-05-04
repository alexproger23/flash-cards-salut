import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import * as Icons from "lucide-react";
import { 
  ChevronLeft, Settings2, Trash2, Plus, Play, 
  Check, X, Pencil, Info, AlertCircle, BookText
} from "lucide-react";
import { 
  getCustomTopicById, deleteCustomTopic, addCard, 
  updateCard, deleteCard, type CustomTopic, type CustomCard 
} from "../data/customTopics";
import { TopicIcon } from "./components/TopicIcon"; // Используем наш общий компонент

function CardTextArea({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full bg-input-background border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm resize-none outline-none transition-all text-foreground placeholder:text-muted-foreground/40"
    />
  );
}

function CardRow({ card, topicId, onUpdate }: { card: CustomCard; topicId: string; onUpdate: (updated: CustomTopic) => void; }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  const handleSave = () => {
    if (!front.trim() || !back.trim()) return;
    const updated = updateCard(topicId, card.id, front, back);
    if (updated) onUpdate(updated);
    setMode("view");
  };

  if (mode === "edit") {
    return (
      <div className="bg-card border-2 border-primary/20 rounded-[2rem] p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="grid grid-cols-1 gap-4 mb-4">
          <CardTextArea value={front} onChange={setFront} placeholder="Передняя сторона" autoFocus />
          <CardTextArea value={back} onChange={setBack} placeholder="Задняя сторона" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold shadow-lg shadow-primary/20">
            Сохранить
          </button>
          <button onClick={() => { setFront(card.front); setBack(card.back); setMode("view"); }} className="flex-1 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-bold">
            Отмена
          </button>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="bg-destructive/5 border border-destructive/20 rounded-[2rem] p-6 flex items-center justify-between animate-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-destructive" size={20} />
          <p className="text-sm font-bold text-destructive">Удалить карточку?</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { const u = deleteCard(topicId, card.id); if (u) onUpdate(u); }} className="bg-destructive text-destructive-foreground rounded-xl px-4 py-2 text-xs font-bold">Да, удалить</button>
          <button onClick={() => setMode("view")} className="bg-card border border-border rounded-xl px-4 py-2 text-xs font-bold">Отмена</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[2rem] p-6 flex items-start justify-between group hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-black/5">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-2 opacity-60">Front</span>
          <p className="text-base font-medium leading-relaxed">{card.front}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2 opacity-60">Back</span>
          <p className="text-base text-muted-foreground leading-relaxed">{card.back}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-4">
        <button onClick={() => setMode("edit")} className="p-3 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors">
          <Pencil size={18} />
        </button>
        <button onClick={() => setMode("delete")} className="p-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export function TopicManager() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<CustomTopic | null>(null);
  const [addingCard, setAddingCard] = useState(false);
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState(false);

  useEffect(() => {
    if (!topicId) return;
    const t = getCustomTopicById(topicId);
    if (!t) navigate("/"); else setTopic(t);
  }, [topicId, navigate]);

  if (!topic) return null;

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        
        {/* Navigation */}
        <header className="flex justify-between items-center">
          <button className="group flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
              <ChevronLeft size={18} />
            </div>
            Все темы
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/topics/${topic.id}/edit`)} className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm">
              <Settings2 size={20} />
            </button>
            {!confirmDeleteTopic ? (
              <button onClick={() => setConfirmDeleteTopic(true)} className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all shadow-sm">
                <Trash2 size={20} />
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 p-1 rounded-xl animate-in fade-in zoom-in-95">
                <button onClick={() => { deleteCustomTopic(topic.id); navigate("/"); }} className="bg-destructive text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Удалить тему</button>
                <button onClick={() => setConfirmDeleteTopic(false)} className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">Отмена</button>
              </div>
            )}
          </div>
        </header>

        {/* Topic Banner */}
        <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 p-8 text-primary opacity-[0.05] pointer-events-none rotate-12">
            <TopicIcon name={topic.emoji} size={140} />
          </div>
          <div className="flex items-center gap-5 mb-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <TopicIcon name={topic.emoji} size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none mb-1">{topic.title}</h1>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider opacity-60">
                {topic.cards.length} карточек
              </p>
            </div>
          </div>
          {topic.description && (
            <p className="text-muted-foreground/80 leading-relaxed text-sm max-w-md relative z-10">{topic.description}</p>
          )}
        </section>

        {/* Practice CTA */}
        {topic.cards.length > 0 && (
          <button onClick={() => navigate(`/study/${topic.id}`)} className="group w-full bg-primary text-primary-foreground rounded-[2rem] py-5 font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all">
            <Play size={22} fill="currentColor" />
            Начать тренировку
          </button>
        )}

        {/* Cards List Section */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-end px-2 mb-2">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Состав набора</h2>
            <button onClick={() => setAddingCard(true)} className="flex items-center gap-1.5 text-xs font-black text-primary hover:opacity-80 transition-opacity">
              <Plus size={16} strokeWidth={3} /> ДОБАВИТЬ КАРТОЧКУ
            </button>
          </div>

          {addingCard && (
             <div className="bg-card border-2 border-dashed border-primary/30 rounded-[2rem] p-8 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 mb-6 text-primary">
                  <Plus size={18} strokeWidth={3} />
                  <span className="font-black text-sm uppercase tracking-wider">Новая карточка</span>
                </div>
                <AddCardForm topicId={topic.id} onAdd={(u) => { setTopic(u); setAddingCard(false); }} onCancel={() => setAddingCard(false)} />
             </div>
          )}

          <div className="flex flex-col gap-4">
            {topic.cards.map((card) => <CardRow key={card.id} card={card} topicId={topic.id} onUpdate={setTopic} />)}
          </div>

          {topic.cards.length === 0 && !addingCard && (
            <div className="border-2 border-dashed border-border rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center bg-card/50">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground/50">
                <Info size={32} />
              </div>
              <p className="font-bold text-foreground mb-1">Пусто</p>
              <p className="text-muted-foreground text-sm mb-6 max-w-[200px]">Добавьте хотя бы одну карточку для начала обучения</p>
              <button onClick={() => setAddingCard(true)} className="bg-foreground text-background px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all">
                Добавить первую
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AddCardForm({ topicId, onAdd, onCancel }: { topicId: string; onAdd: (updated: CustomTopic) => void; onCancel: () => void; }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) return;
    const updated = addCard(topicId, front, back);
    if (updated) onAdd(updated);
  };

  return (
    <div className="flex flex-col gap-4" onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handleAdd()}>
      <div className="grid grid-cols-1 gap-4">
        <CardTextArea value={front} onChange={setFront} placeholder="Вопрос или термин (напр. 'The Apple')" autoFocus />
        <CardTextArea value={back} onChange={setBack} placeholder="Ответ или перевод (напр. 'Яблоко')" />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={handleAdd} disabled={!front.trim() || !back.trim()} className="flex-1 bg-primary text-primary-foreground disabled:opacity-50 rounded-2xl py-4 font-bold transition-all shadow-lg shadow-primary/10">
          Добавить в набор
        </button>
        <button onClick={onCancel} className="px-6 bg-muted text-muted-foreground rounded-2xl font-bold transition-all">
          Отмена
        </button>
      </div>
    </div>
  );
}