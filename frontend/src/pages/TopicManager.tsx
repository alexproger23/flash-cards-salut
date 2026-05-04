import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { getCustomTopicById, deleteCustomTopic, addCard, updateCard, deleteCard, type CustomTopic, type CustomCard } from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import { actionMatches, findCardIdFromAction, getCardBackFromAction, getCardFrontFromAction } from "../voice/flashcardVoice";

// (Хук useTopicManagerVoice оставляем без изменений)
// ...вставьте сюда хук useTopicManagerVoice из предыдущего сообщения...

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
      className="w-full bg-input-background border border-transparent focus:border-ring focus:ring-1 focus:ring-ring rounded-md p-3 text-sm resize-none outline-none transition-all text-foreground placeholder:text-muted-foreground"
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

  const handleDelete = () => {
    const updated = deleteCard(topicId, card.id);
    if (updated) onUpdate(updated);
  };

  if (mode === "edit") {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Front</label>
            <CardTextArea value={front} onChange={setFront} placeholder="Вопрос / термин" autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Back</label>
            <CardTextArea value={back} onChange={setBack} placeholder="Ответ / перевод" />
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSave} 
            disabled={!front.trim() || !back.trim()} 
            className="flex-1 bg-primary text-primary-foreground disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Сохранить
          </button>
          <button onClick={() => { setFront(card.front); setBack(card.back); setMode("view"); }} className="flex-1 bg-secondary text-secondary-foreground rounded-lg py-2 text-sm font-medium hover:bg-secondary/80">
            Отмена
          </button>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm text-destructive font-medium">Удалить эту карточку?</p>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">Удалить</button>
          <button onClick={() => setMode("view")} className="bg-background text-foreground border border-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent">Отмена</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm flex gap-4 group hover:border-ring/50 transition-colors">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Front</span>
          <p className="text-sm">{card.front}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Back</span>
          <p className="text-sm text-muted-foreground">{card.back}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setMode("edit")} className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors" title="Редактировать">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z" /></svg>
        </button>
        <button onClick={() => setMode("delete")} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" title="Удалить">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
        </button>
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
    setFront(""); setBack("");
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4" onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handleAdd()}>
      <p className="text-sm font-medium">Новая карточка</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Front</label>
          <CardTextArea value={front} onChange={setFront} placeholder="Вопрос, термин..." autoFocus />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Back</label>
          <CardTextArea value={back} onChange={setBack} placeholder="Ответ, перевод..." />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={!front.trim() || !back.trim()} className="flex-1 bg-primary text-primary-foreground disabled:opacity-50 rounded-lg py-2 text-sm font-medium hover:opacity-90">
          Добавить
        </button>
        <button onClick={onCancel} className="flex-1 bg-secondary text-secondary-foreground rounded-lg py-2 text-sm font-medium hover:bg-secondary/80">
          Отмена
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
    if (!topicId) { navigate("/"); return; }
    const t = getCustomTopicById(topicId);
    if (!t) { navigate("/"); return; }
    setTopic(t);
  }, [topicId, navigate]);

  // useTopicManagerVoice(...) - вызов хука

  if (!topic) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <button className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors" onClick={() => navigate("/")}>
            ← Все темы
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/topics/${topic.id}/edit`)} className="bg-secondary text-secondary-foreground text-sm px-4 py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              Редактировать
            </button>
            {!confirmDeleteTopic ? (
              <button onClick={() => setConfirmDeleteTopic(true)} className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors">
                Удалить тему
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-destructive font-medium">Точно?</span>
                <button onClick={() => { deleteCustomTopic(topic.id); navigate("/"); }} className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-md">Да</button>
                <button onClick={() => setConfirmDeleteTopic(false)} className="bg-background text-foreground border border-border text-xs px-2 py-1 rounded-md">Нет</button>
              </div>
            )}
          </div>
        </header>

        {/* Topic Info */}
        <section>
          <h1 className="text-2xl font-semibold flex items-center gap-3 mb-2">
            <span className="text-3xl">{topic.emoji}</span>
            {topic.title}
          </h1>
          {topic.description && <p className="text-muted-foreground ml-[52px]">{topic.description}</p>}
        </section>

        {/* Practice Button */}
        {topic.cards.length > 0 && (
          <button onClick={() => navigate(`/study/${topic.id}`)} className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-medium hover:opacity-90 active:scale-[0.99] transition-all shadow-md">
            Начать тренировку · {topic.cards.length} карточек
          </button>
        )}

        {/* Cards Section */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              Карточки {topic.cards.length > 0 && `(${topic.cards.length})`}
            </h2>
            {!addingCard && (
              <button onClick={() => setAddingCard(true)} className="text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 px-4 py-1.5 rounded-lg transition-colors">
                + Добавить
              </button>
            )}
          </div>

          {topic.cards.length === 0 && !addingCard && (
            <div className="border-2 border-dashed border-border rounded-xl py-12 flex flex-col items-center justify-center text-center bg-card">
              <span className="text-2xl mb-2">✦</span>
              <p className="font-medium mb-1">Пока нет карточек</p>
              <p className="text-sm text-muted-foreground mb-4">Добавьте первую карточку, чтобы начать.</p>
              <button onClick={() => setAddingCard(true)} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
                Добавить
              </button>
            </div>
          )}

          {addingCard && <AddCardForm topicId={topic.id} onAdd={(u) => { setTopic(u); setAddingCard(false); }} onCancel={() => setAddingCard(false)} />}

          <div className="flex flex-col gap-3">
            {topic.cards.map((card) => <CardRow key={card.id} card={card} topicId={topic.id} onUpdate={setTopic} />)}
          </div>
        </section>

      </div>
    </div>
  );
}