import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  createCustomTopic,
  updateCustomTopic,
  getCustomTopicById,
} from "../data/customTopics";
import { useVoiceAssistant } from "../voice/VoiceAssistantProvider";

const EMOJI_OPTIONS = [
  "📝", "📚", "🔬", "🏛️", "🧮", "🌍", "💡", "🎵",
  "🎨", "⚗️", "🌱", "🏆", "🧠", "🔤", "🎯", "🧬",
  "📐", "🌐", "🎭", "🏺",
];

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength?: number;
  autoFocus?: boolean;
}

function Field({ label, value, onChange, placeholder, maxLength, autoFocus }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label style={{ fontSize: "0.78rem", color: "#9898b0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-150"
        style={{
          backgroundColor: "#f5f5f8",
          border: "1.5px solid transparent",
          color: "#1a1a2e",
          fontSize: "0.95rem",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#1a1a2e")}
        onBlur={(e) => (e.target.style.borderColor = "transparent")}
      />
    </div>
  );
}

export function CreateEditTopic() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const isEditing = Boolean(topicId);
  const { setAssistantState } = useVoiceAssistant();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEditing && topicId) {
      const topic = getCustomTopicById(topicId);
      if (topic) {
        setTitle(topic.title);
        setDescription(topic.description);
        setEmoji(topic.emoji);
      } else {
        navigate("/");
      }
    }
  }, [isEditing, topicId, navigate]);

  useEffect(() => {
    setAssistantState({
      screen: "topic_form",
      editing: isEditing,
      topicId,
      draft: { title, description, emoji },
    });
  }, [description, emoji, isEditing, setAssistantState, title, topicId]);

  const saveTopic = (nextTitle = title, nextDescription = description, nextEmoji = emoji) => {
    if (!nextTitle.trim()) {
      setError("Please add a title for your topic.");
      return;
    }
    if (isEditing && topicId) {
      updateCustomTopic(topicId, { title: nextTitle, description: nextDescription, emoji: nextEmoji });
      navigate(`/topics/${topicId}`);
    } else {
      const created = createCustomTopic({
        title: nextTitle,
        description: nextDescription,
        emoji: nextEmoji,
      });
      navigate(`/topics/${created.id}`);
    }
  };

  const handleSave = () => {
    saveTopic();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ backgroundColor: "#fafafa" }}
    >
      <div className="w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => navigate(isEditing && topicId ? `/topics/${topicId}` : "/")}
          className="text-sm transition-opacity hover:opacity-60 mb-10 flex items-center gap-1"
          style={{ color: "#9898b0" }}
        >
          ← Back
        </button>

        {/* Heading */}
        <h1 style={{ color: "#1a1a2e", marginBottom: "0.25rem" }}>
          {isEditing ? "Edit topic" : "New topic"}
        </h1>
        <p style={{ color: "#9898b0", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
          {isEditing ? "Update the details of your study set." : "Give your study set a clear name."}
        </p>

        {/* Emoji Picker */}
        <div className="mb-6">
          <p style={{ fontSize: "0.78rem", color: "#9898b0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Icon
          </p>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150"
                style={{
                  fontSize: "1.3rem",
                  backgroundColor: emoji === e ? "#1a1a2e" : "#f0f0f5",
                  border: emoji === e ? "2px solid #1a1a2e" : "2px solid transparent",
                  transform: emoji === e ? "scale(1.1)" : "scale(1)",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
          <Field
            label="Title"
            value={title}
            onChange={(v) => { setTitle(v); setError(""); }}
            placeholder="e.g. English Irregular Verbs"
            maxLength={60}
            autoFocus
          />
          <Field
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            placeholder="e.g. Verbs for my English exam on Friday"
            maxLength={120}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-sm" style={{ color: "#e05252" }}>{error}</p>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full mt-8 rounded-2xl py-4 text-sm transition-all duration-150 active:scale-95"
          style={{
            backgroundColor: "#1a1a2e",
            color: "#ffffff",
            boxShadow: "0 2px 12px rgba(26,26,46,0.15)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a3e")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a2e")}
        >
          {isEditing ? "Save changes" : "Create topic"}
        </button>
      </div>
    </div>
  );
}
