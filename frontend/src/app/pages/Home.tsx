import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { topics, loadSessionResults } from "../data/flashcards";
import { addCard, createCustomTopic, loadCustomTopics, type CustomTopic } from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import {
  actionMatches,
  findTopicFromAction,
  getCardBackFromAction,
  getCardFrontFromAction,
  getTopicDescriptionFromAction,
  getTopicTitleFromAction,
  isCustomVoiceTopic,
} from "../voice/flashcardVoice";

export function Home() {
  const navigate = useNavigate();
  const { setAssistantState, speak } = useVoiceAssistant();
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);

  useEffect(() => {
    setCustomTopics(loadCustomTopics());
  }, []);

  useEffect(() => {
    const allTopics = [...customTopics, ...topics];
    setAssistantState({
      screen: "home",
      topics: allTopics.map((topic, index) => ({
        number: index + 1,
        id: topic.id,
        title: topic.title,
        cardsCount: topic.cards.length,
        custom: isCustomVoiceTopic(topic),
      })),
      item_selector: {
        items: allTopics.map((topic, index) => ({
          number: index + 1,
          id: topic.id,
          title: topic.title,
        })),
        ignored_words: ["открой", "запусти", "начни", "тема", "карточки"],
      },
    });
  }, [customTopics, setAssistantState]);

  useVoiceActionHandler(
    (action) => {
      const allTopics = [...customTopics, ...topics];

      if (actionMatches(action, ["new_topic", "open_new_topic_form"])) {
        navigate("/topics/new");
        return true;
      }

      if (actionMatches(action, ["create_topic"])) {
        const title = getTopicTitleFromAction(action);
        if (!title) {
          navigate("/topics/new");
          return true;
        }

        const created = createCustomTopic({
          title,
          description: getTopicDescriptionFromAction(action),
          emoji: "📝",
        });
        setCustomTopics(loadCustomTopics());
        navigate(`/topics/${created.id}`);
        speak(`Тема ${created.title} создана.`, "topic_created");
        return true;
      }

      if (actionMatches(action, ["open_topic", "start_topic", "start_study", "practice_topic"])) {
        const topic = findTopicFromAction(action, allTopics);
        if (!topic) {
          speak("Не нашла такую тему.", "topic_not_found");
          return true;
        }

        const shouldStudy = actionMatches(action, ["start_topic", "start_study", "practice_topic"]);
        navigate(shouldStudy || !isCustomVoiceTopic(topic) ? `/study/${topic.id}` : `/topics/${topic.id}`);
        return true;
      }

      if (actionMatches(action, ["add_card", "create_card"])) {
        const topic = findTopicFromAction(action, allTopics);
        const front = getCardFrontFromAction(action);
        const back = getCardBackFromAction(action);

        if (!topic || !isCustomVoiceTopic(topic)) {
          speak("Карточки можно добавлять только в свою тему.", "card_topic_missing");
          return true;
        }

        if (!front || !back) {
          navigate(`/topics/${topic.id}`);
          speak("Открой тему и продиктуй вопрос и ответ для карточки.", "card_data_missing");
          return true;
        }

        const updated = addCard(topic.id, front, back);
        setCustomTopics(loadCustomTopics());
        if (updated) {
          navigate(`/topics/${updated.id}`);
          speak("Карточка добавлена.", "card_created");
        }
        return true;
      }

      return false;
    },
    [customTopics, navigate, speak],
    10
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-16"
      style={{ backgroundColor: "#fafafa" }}
    >
      {/* Header */}
      <div className="text-center mb-14">
        <div style={{ fontSize: "2.4rem", marginBottom: "0.5rem" }}>🗂️</div>
        <h1 style={{ color: "#1a1a2e", marginBottom: "0.4rem" }}>Flashcards</h1>
        <p style={{ color: "#9898b0", fontSize: "0.95rem" }}>
          Pick a topic and start learning
        </p>
      </div>

      <div className="w-full max-w-lg">

        {/* ── My Topics ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: "0.72rem", color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            My Topics
          </p>
          <button
            onClick={() => navigate("/topics/new")}
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl transition-colors"
            style={{ backgroundColor: "#1a1a2e", color: "#ffffff" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a3e")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a1a2e")}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New topic
          </button>
        </div>

        {customTopics.length === 0 ? (
          /* Empty state */
          <button
            onClick={() => navigate("/topics/new")}
            className="w-full rounded-2xl py-10 mb-8 flex flex-col items-center text-center transition-colors"
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px dashed #e0e0ea",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#1a1a2e")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e0ea")}
          >
            <span style={{ fontSize: "1.8rem", marginBottom: "0.6rem" }}>✦</span>
            <p style={{ color: "#9898b0", fontSize: "0.92rem", marginBottom: "0.2rem" }}>
              No topics yet
            </p>
            <p style={{ color: "#c8c8d8", fontSize: "0.82rem" }}>
              Create your first study topic
            </p>
          </button>
        ) : (
          <div className="flex flex-col gap-3 mb-8">
            {customTopics.map((topic) => {
              const results = loadSessionResults(topic.id);
              const last = results[0];
              return (
                <button
                  key={topic.id}
                  onClick={() => navigate(`/topics/${topic.id}`)}
                  className="w-full text-left rounded-2xl px-6 py-5 transition-all duration-200"
                  style={{
                    backgroundColor: "#ffffff",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
                    border: "1.5px solid rgba(0,0,0,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.09)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "0 2px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)";
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span style={{ fontSize: "1.6rem" }}>{topic.emoji}</span>
                      <div>
                        <div style={{ color: "#1a1a2e", fontSize: "0.98rem", fontWeight: 500 }}>
                          {topic.title}
                        </div>
                        <div style={{ color: "#9898b0", fontSize: "0.82rem", marginTop: "0.1rem" }}>
                          {topic.cards.length === 0
                            ? "No cards yet — tap to add"
                            : `${topic.cards.length} ${topic.cards.length === 1 ? "card" : "cards"}${topic.description ? ` · ${topic.description}` : ""}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {last ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#f0f0f7", color: "#7070a0" }}
                        >
                          {last.known}/{last.known + last.unknown} last time
                        </span>
                      ) : (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#f0f0f7", color: "#9898b0" }}
                        >
                          {topic.cards.length > 0 ? "Not studied yet" : "Empty"}
                        </span>
                      )}
                      <span style={{ color: "#c8c8d8", fontSize: "1rem" }}>→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Divider ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div style={{ flex: 1, height: "1px", backgroundColor: "#ebebf0" }} />
          <span style={{ fontSize: "0.7rem", color: "#c8c8d8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Example topics
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#ebebf0" }} />
        </div>

        {/* ── Built-in Topics ───────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {topics.map((topic) => {
            const results = loadSessionResults(topic.id);
            const last = results[0];
            return (
              <button
                key={topic.id}
                onClick={() => navigate(`/study/${topic.id}`)}
                className="w-full text-left rounded-2xl px-6 py-5 transition-all duration-200"
                style={{
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
                  border: "1.5px solid rgba(0,0,0,0.05)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.07)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 1px 8px rgba(0,0,0,0.04)";
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <span style={{ fontSize: "1.5rem" }}>{topic.emoji}</span>
                    <div>
                      <div style={{ color: "#1a1a2e", fontSize: "0.98rem", fontWeight: 500 }}>
                        {topic.title}
                      </div>
                      <div style={{ color: "#b0b0c0", fontSize: "0.82rem", marginTop: "0.1rem" }}>
                        {topic.cards.length} cards
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {last ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f5f5f8", color: "#9898b0" }}
                      >
                        {last.known}/{last.known + last.unknown} last time
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f5f5f8", color: "#b0b0c0" }}
                      >
                        Try it
                      </span>
                    )}
                    <span style={{ color: "#d8d8e0", fontSize: "1rem" }}>→</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center mt-10 text-xs" style={{ color: "#d0d0d8" }}>
          Progress is saved on your device
        </p>
      </div>
    </div>
  );
}
