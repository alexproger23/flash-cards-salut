import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  getCustomTopicById,
  deleteCustomTopic,
  addCard,
  updateCard,
  deleteCard,
  type CustomTopic,
  type CustomCard,
} from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import {
  actionMatches,
  findCardIdFromAction,
  getCardBackFromAction,
  getCardFrontFromAction,
} from "../voice/flashcardVoice";

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  backgroundColor: "#f5f5f8",
  border: "1.5px solid transparent",
  borderRadius: 10,
  color: "#1a1a2e",
  fontSize: "0.9rem",
  padding: "10px 14px",
  outline: "none",
  width: "100%",
  resize: "none",
  fontFamily: "inherit",
  lineHeight: 1.5,
};

function CardTextArea({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      style={inputStyle}
      onFocus={(e) => (e.target.style.borderColor = "#1a1a2e")}
      onBlur={(e) => (e.target.style.borderColor = "transparent")}
    />
  );
}

// ─── Card Row ─────────────────────────────────────────────────────────────────

interface CardRowProps {
  card: CustomCard;
  topicId: string;
  onUpdate: (updated: CustomTopic) => void;
}

function CardRow({ card, topicId, onUpdate }: CardRowProps) {
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

  const handleCancelEdit = () => {
    setFront(card.front);
    setBack(card.back);
    setMode("view");
  };

  if (mode === "edit") {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #1a1a2e",
          boxShadow: "0 2px 12px rgba(26,26,46,0.08)",
        }}
      >
        <div className="flex flex-col gap-3">
          <div>
            <p style={{ fontSize: "0.72rem", color: "#9898b0", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Front</p>
            <CardTextArea value={front} onChange={setFront} placeholder="Question / term / word" autoFocus />
          </div>
          <div>
            <p style={{ fontSize: "0.72rem", color: "#9898b0", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Back</p>
            <CardTextArea value={back} onChange={setBack} placeholder="Answer / definition / translation" />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!front.trim() || !back.trim()}
              className="flex-1 rounded-xl py-2 text-sm transition-all duration-150"
              style={{
                backgroundColor: front.trim() && back.trim() ? "#1a1a2e" : "#e8e8ee",
                color: front.trim() && back.trim() ? "#fff" : "#9898b0",
              }}
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 rounded-xl py-2 text-sm"
              style={{ backgroundColor: "#f5f5f8", color: "#5a5a7a" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
        style={{
          backgroundColor: "#fff5f5",
          border: "1.5px solid rgba(224,82,82,0.2)",
        }}
      >
        <p style={{ fontSize: "0.88rem", color: "#7a4040" }}>Delete this card?</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ backgroundColor: "#e05252", color: "#fff" }}
          >
            Delete
          </button>
          <button
            onClick={() => setMode("view")}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ backgroundColor: "#f0e8e8", color: "#7a4040" }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-start gap-4 group transition-all duration-150"
      style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
      }}
    >
      {/* Card content */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-w-0">
        <div>
          <p style={{ fontSize: "0.7rem", color: "#c8c8d8", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Front</p>
          <p
            style={{ color: "#1a1a2e", fontSize: "0.9rem", lineHeight: 1.5 }}
            className="break-words"
          >
            {card.front}
          </p>
        </div>
        <div>
          <p style={{ fontSize: "0.7rem", color: "#c8c8d8", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Back</p>
          <p
            style={{ color: "#5a5a7a", fontSize: "0.9rem", lineHeight: 1.5 }}
            className="break-words"
          >
            {card.back}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => setMode("edit")}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: "#f0f0f5", color: "#7070a0" }}
          title="Edit"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          onClick={() => setMode("delete")}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: "#f0f0f5", color: "#c07070" }}
          title="Delete"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Add Card Form ────────────────────────────────────────────────────────────

interface AddCardFormProps {
  topicId: string;
  onAdd: (updated: CustomTopic) => void;
  onCancel: () => void;
}

function AddCardForm({ topicId, onAdd, onCancel }: AddCardFormProps) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const handleAdd = () => {
    if (!front.trim() || !back.trim()) return;
    const updated = addCard(topicId, front, back);
    if (updated) onAdd(updated);
    setFront("");
    setBack("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid #1a1a2e",
        boxShadow: "0 4px 20px rgba(26,26,46,0.08)",
      }}
    >
      <p style={{ fontSize: "0.82rem", color: "#7070a0", marginBottom: "0.85rem" }}>
        New flashcard
      </p>
      <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
        <div>
          <p style={{ fontSize: "0.72rem", color: "#9898b0", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Front</p>
          <CardTextArea value={front} onChange={setFront} placeholder="Question, term, word, date…" autoFocus />
        </div>
        <div>
          <p style={{ fontSize: "0.72rem", color: "#9898b0", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Back</p>
          <CardTextArea value={back} onChange={setBack} placeholder="Answer, definition, translation…" />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleAdd}
            disabled={!front.trim() || !back.trim()}
            className="flex-1 rounded-xl py-2 text-sm transition-all duration-150 active:scale-95"
            style={{
              backgroundColor: front.trim() && back.trim() ? "#1a1a2e" : "#e8e8ee",
              color: front.trim() && back.trim() ? "#fff" : "#9898b0",
            }}
          >
            Add card
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2 text-sm"
            style={{ backgroundColor: "#f5f5f8", color: "#5a5a7a" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TopicManager() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { setAssistantState, speak } = useVoiceAssistant();

  const [topic, setTopic] = useState<CustomTopic | null>(null);
  const [addingCard, setAddingCard] = useState(false);
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState(false);

  useEffect(() => {
    if (!topicId) { navigate("/"); return; }
    const t = getCustomTopicById(topicId);
    if (!t) { navigate("/"); return; }
    setTopic(t);
  }, [topicId, navigate]);

  useEffect(() => {
    if (!topic) {
      return;
    }

    setAssistantState({
      screen: "topic",
      currentTopic: {
        id: topic.id,
        title: topic.title,
        cardsCount: topic.cards.length,
        custom: true,
      },
      cards: topic.cards.map((card, index) => ({
        number: index + 1,
        id: card.id,
        front: card.front,
        back: card.back,
      })),
      addingCard,
      item_selector: {
        items: topic.cards.map((card, index) => ({
          number: index + 1,
          id: card.id,
          title: card.front,
        })),
        ignored_words: ["карточка", "удали", "добавь", "вопрос", "ответ"],
      },
    });
  }, [addingCard, setAssistantState, topic]);

  useVoiceActionHandler(
    (action) => {
      if (!topic) {
        return false;
      }

      if (actionMatches(action, ["start_topic", "start_study", "practice_topic"])) {
        if (topic.cards.length === 0) {
          speak("В этой теме пока нет карточек.", "empty_topic");
          return true;
        }

        navigate(`/study/${topic.id}`);
        return true;
      }

      if (actionMatches(action, ["new_card", "open_new_card_form"])) {
        setAddingCard(true);
        return true;
      }

      if (actionMatches(action, ["add_card", "create_card"])) {
        const front = getCardFrontFromAction(action);
        const back = getCardBackFromAction(action);

        if (!front || !back) {
          setAddingCard(true);
          speak("Продиктуй вопрос и ответ для новой карточки.", "card_data_missing");
          return true;
        }

        const updated = addCard(topic.id, front, back);
        if (updated) {
          setTopic(updated);
          setAddingCard(false);
          speak("Карточка добавлена.", "card_created");
        }
        return true;
      }

      if (actionMatches(action, ["delete_card", "remove_card"])) {
        const cardId = findCardIdFromAction(action, topic.cards);
        if (!cardId) {
          speak("Не нашла такую карточку.", "card_not_found");
          return true;
        }

        const updated = deleteCard(topic.id, String(cardId));
        if (updated) {
          setTopic(updated);
          speak("Карточка удалена.", "card_deleted");
        }
        return true;
      }

      if (actionMatches(action, ["edit_topic"])) {
        navigate(`/topics/${topic.id}/edit`);
        return true;
      }

      return false;
    },
    [navigate, speak, topic],
    20
  );

  if (!topic) return null;

  const handleDeleteTopic = () => {
    deleteCustomTopic(topic.id);
    navigate("/");
  };

  const handleTopicUpdate = (updated: CustomTopic) => setTopic(updated);

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-10"
      style={{ backgroundColor: "#fafafa" }}
    >
      <div className="w-full max-w-lg">

        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => navigate("/")}
            className="text-sm transition-opacity hover:opacity-60 flex items-center gap-1"
            style={{ color: "#9898b0" }}
          >
            ← All topics
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/topics/${topic.id}/edit`)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors"
              style={{ backgroundColor: "#f0f0f5", color: "#5a5a7a" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e5ec")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f0f0f5")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
            {!confirmDeleteTopic ? (
              <button
                onClick={() => setConfirmDeleteTopic(true)}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors"
                style={{ backgroundColor: "#f0f0f5", color: "#c07070" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#faf0f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f0f0f5")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#fff5f5", border: "1px solid rgba(224,82,82,0.2)" }}>
                <span style={{ fontSize: "0.8rem", color: "#7a4040" }}>Delete topic?</span>
                <button
                  onClick={handleDeleteTopic}
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{ backgroundColor: "#e05252", color: "#fff" }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDeleteTopic(false)}
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{ backgroundColor: "#f0e8e8", color: "#7a4040" }}
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Topic Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span style={{ fontSize: "2rem" }}>{topic.emoji}</span>
            <h1 style={{ color: "#1a1a2e" }}>{topic.title}</h1>
          </div>
          {topic.description && (
            <p style={{ color: "#9898b0", fontSize: "0.9rem", marginLeft: "3rem" }}>
              {topic.description}
            </p>
          )}
        </div>

        {/* Practice Button */}
        {topic.cards.length > 0 && (
          <button
            onClick={() => navigate(`/study/${topic.id}`)}
            className="w-full rounded-2xl py-4 text-sm mb-8 transition-all duration-150 active:scale-[0.99]"
            style={{
              backgroundColor: "#1a1a2e",
              color: "#ffffff",
              boxShadow: "0 2px 16px rgba(26,26,46,0.15)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a3e")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a2e")}
          >
            Start practicing · {topic.cards.length} {topic.cards.length === 1 ? "card" : "cards"}
          </button>
        )}

        {/* Cards Section Header */}
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontSize: "0.8rem", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Flashcards
            {topic.cards.length > 0 && (
              <span style={{ color: "#c8c8d8", marginLeft: "0.4rem" }}>({topic.cards.length})</span>
            )}
          </p>
          {!addingCard && (
            <button
              onClick={() => setAddingCard(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-xl transition-colors"
              style={{ backgroundColor: "#f0f0f5", color: "#5a5a7a" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e5ec")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f0f0f5")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add card
            </button>
          )}
        </div>

        {/* Empty State */}
        {topic.cards.length === 0 && !addingCard && (
          <div
            className="rounded-2xl py-14 flex flex-col items-center text-center mb-4"
            style={{ backgroundColor: "#ffffff", border: "1.5px dashed #e0e0ea" }}
          >
            <span style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✦</span>
            <p style={{ color: "#9898b0", fontSize: "0.95rem", marginBottom: "0.25rem" }}>No flashcards yet</p>
            <p style={{ color: "#c8c8d8", fontSize: "0.85rem" }}>Add your first flashcard to start practicing.</p>
            <button
              onClick={() => setAddingCard(true)}
              className="mt-5 px-6 py-2.5 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: "#1a1a2e", color: "#fff" }}
            >
              Add first card
            </button>
          </div>
        )}

        {/* Add Card Form */}
        {addingCard && (
          <div className="mb-4">
            <AddCardForm
              topicId={topic.id}
              onAdd={(updated) => { setTopic(updated); setAddingCard(false); }}
              onCancel={() => setAddingCard(false)}
            />
          </div>
        )}

        {/* Cards List */}
        {topic.cards.length > 0 && (
          <div className="flex flex-col gap-2">
            {topic.cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                topicId={topic.id}
                onUpdate={handleTopicUpdate}
              />
            ))}
          </div>
        )}

        {/* Footer hint */}
        {topic.cards.length > 0 && (
          <p className="text-center mt-8 text-xs" style={{ color: "#c8c8d8" }}>
            Hover over a card to edit or delete it
          </p>
        )}
      </div>
    </div>
  );
}
