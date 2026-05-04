import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  createCustomTopic,
  updateCustomTopic,
  getCustomTopicById,
} from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import {
  actionMatches,
  getActionString,
  getTopicDescriptionFromAction,
  getTopicTitleFromAction,
} from "../voice/flashcardVoice";

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
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        {label}
      </label>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-150 bg-muted text-foreground border-2 border-transparent focus:border-primary text-sm"
      />
    </div>
  );
}

export function CreateEditTopic() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const isEditing = Boolean(topicId);
  const { setAssistantState, speak } = useVoiceAssistant();

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
      speak("Нужно название темы.", "topic_title_missing");
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

  const handleSave = () => saveTopic();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  useVoiceActionHandler(
    (action) => {
      if (actionMatches(action, ["set_topic_title", "set_title"])) {
        const nextTitle = getTopicTitleFromAction(action);
        if (nextTitle) {
          setTitle(nextTitle);
          setError("");
        }
        return true;
      }
      if (actionMatches(action, ["set_topic_description", "set_description"])) {
        setDescription(getTopicDescriptionFromAction(action) || getActionString(action, ["value"]));
        return true;
      }
      if (actionMatches(action, ["set_topic_emoji", "set_emoji"])) {
        const nextEmoji = getActionString(action, ["emoji", "icon", "value"]);
        if (nextEmoji) setEmoji(nextEmoji);
        return true;
      }
      if (actionMatches(action, ["create_topic", "save_topic"])) {
        const nextTitle = getTopicTitleFromAction(action) || title;
        const nextDescription = getTopicDescriptionFromAction(action) || description;
        const nextEmoji = getActionString(action, ["emoji", "icon"]) || emoji;
        saveTopic(nextTitle, nextDescription, nextEmoji);
        return true;
      }
      return false;
    },
    [description, emoji, isEditing, navigate, speak, title, topicId],
    20
  );

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(isEditing && topicId ? `/topics/${topicId}` : "/")}
          className="text-sm transition-opacity hover:opacity-60 mb-10 flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-semibold text-foreground mb-1">
          {isEditing ? "Edit topic" : "New topic"}
        </h1>
        <p className="text-muted-foreground text-sm mb-10">
          {isEditing ? "Update the details of your study set." : "Give your study set a clear name."}
        </p>

        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Icon
          </p>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-150 border-2 ${
                  emoji === e
                    ? "bg-primary border-primary scale-110"
                    : "bg-muted border-transparent hover:bg-accent"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

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

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          className="w-full mt-8 rounded-2xl py-4 text-sm font-medium transition-all duration-150 active:scale-95 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
        >
          {isEditing ? "Save changes" : "Create topic"}
        </button>
      </div>
    </div>
  );
}