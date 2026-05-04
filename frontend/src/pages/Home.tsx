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
        const created = createCustomTopic({ title, description: getTopicDescriptionFromAction(action), emoji: "📝" });
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
    <div className="min-h-screen flex flex-col items-center px-4 py-16 bg-background">
      <div className="text-center mb-14">
        <div className="text-5xl mb-2">🗂️</div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Flashcards</h1>
        <p className="text-muted-foreground text-sm">Pick a topic and start learning</p>
      </div>

      <div className="w-full max-w-lg">
        {/* My Topics Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            My Topics
          </p>
          <button
            onClick={() => navigate("/topics/new")}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-xl transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New topic
          </button>
        </div>

        {customTopics.length === 0 ? (
          <button
            onClick={() => navigate("/topics/new")}
            className="w-full rounded-2xl py-10 mb-8 flex flex-col items-center text-center transition-colors bg-card border-2 border-dashed border-border hover:border-primary group"
          >
            <span className="text-3xl mb-2 text-muted-foreground group-hover:text-primary transition-colors">✦</span>
            <p className="text-foreground font-medium text-sm mb-1">No topics yet</p>
            <p className="text-muted-foreground text-xs">Create your first study topic</p>
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
                  className="w-full text-left rounded-2xl px-6 py-5 transition-all duration-200 bg-card border border-border shadow-sm hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{topic.emoji}</span>
                      <div>
                        <div className="text-foreground font-medium text-base">{topic.title}</div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                          {topic.cards.length === 0
                            ? "No cards yet — tap to add"
                            : `${topic.cards.length} ${topic.cards.length === 1 ? "card" : "cards"}${topic.description ? ` · ${topic.description}` : ""}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {last ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {last.known}/{last.known + last.unknown} last time
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {topic.cards.length > 0 ? "Not studied yet" : "Empty"}
                        </span>
                      )}
                      <span className="text-muted-foreground text-lg">→</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            Example topics
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Built-in Topics */}
        <div className="flex flex-col gap-3">
          {topics.map((topic) => {
            const results = loadSessionResults(topic.id);
            const last = results[0];
            return (
              <button
                key={topic.id}
                onClick={() => navigate(`/study/${topic.id}`)}
                className="w-full text-left rounded-2xl px-6 py-5 transition-all duration-200 bg-card border border-border shadow-sm hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{topic.emoji}</span>
                    <div>
                      <div className="text-foreground font-medium text-base">{topic.title}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{topic.cards.length} cards</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {last ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                        {last.known}/{last.known + last.unknown} last time
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        Try it
                      </span>
                    )}
                    <span className="text-muted-foreground text-lg">→</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center mt-10 text-xs text-muted-foreground/60">
          Progress is saved on your device
        </p>
      </div>
    </div>
  );
}