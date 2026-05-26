import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Trash2, Type, MessageSquare, Lock, Settings } from "lucide-react";
import { fetchUserData, saveCustomTopic, type CustomTopic } from "../data/customTopics";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import {
  actionMatches,
  findCardIdFromAction,
  getActionNumber,
  getCardBackFromAction,
  getCardFrontFromAction,
} from "../voice/flashcardVoice";

export function TopicManager() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAssistantState, speak } = useVoiceAssistant();
  const isAuthenticated = !!user;

  const [topic, setTopic] = useState<CustomTopic | null>(null);
  const [newCard, setNewCard] = useState({ front: "", back: "" });


  useEffect(() => {
    const loadTopic = async () => {
      try {
        const data = await fetchUserData();
        const found = data.customTopics.find((t: CustomTopic) => t.id === topicId);
        if (found) {
          setTopic(found);
        } else {
          toast.error("Тема не найдена");
          navigate("/");
        }
      } catch (error) {
        console.error("Ошибка загрузки:", error);
        navigate("/");
      }
    };
    
    loadTopic();
  }, [topicId, navigate]);

  useEffect(() => {
    if (!topic) return;

    const cardItems = topic.cards.map((card, index) => ({
      number: index + 1,
      id: card.id,
      front: card.front,
      back: card.back,
    }));

    setAssistantState({
      screen: "topic_manager",
      topicId: topic.id,
      topicTitle: topic.title,
      cards: cardItems,
      item_selector: {
        type: "cards",
        items: cardItems,
      },
      draftCard: newCard,
    });
  }, [newCard, setAssistantState, topic]);

  const saveCard = useCallback(async (front: string, back: string) => {
    if (!topic || !front.trim() || !back.trim()) return false;
    if (!isAuthenticated) {
      speak("Войдите, чтобы редактировать карточки.", "auth_required");
      return false;
    }

    const updatedTopic = {
      ...topic,
      cards: [...topic.cards, { id: Date.now().toString(), front: front.trim(), back: back.trim() }]
    };

    try {
      // Отправляем обновленную тему на сервер
      await saveCustomTopic(updatedTopic);
      // Обновляем состояние на экране только после успешного сохранения
      setTopic(updatedTopic);
      setNewCard({ front: "", back: "" });
      toast.success("Карточка добавлена");
      speak("Карточка добавлена.", "card_added");
      return true;
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      toast.error("Не удалось сохранить карточку");
      return false;
    }
  }, [isAuthenticated, speak, topic]);

  // Асинхронное добавление карточки
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCard(newCard.front, newCard.back);
  };

  // Асинхронное удаление карточки
  const deleteCard = useCallback(async (id: string) => {
    if (!topic || !isAuthenticated) {
      speak("Войдите, чтобы редактировать карточки.", "auth_required");
      return;
    }

    const updatedTopic = {
      ...topic,
      cards: topic.cards.filter(c => c.id !== id)
    };
    
    try {
      // Отправляем тему без удаленной карточки на сервер
      await saveCustomTopic(updatedTopic);
      setTopic(updatedTopic);
      toast.success("Карточка удалена");
      speak("Карточка удалена.", "card_deleted");
    } catch (error) {
      console.error("Ошибка удаления:", error);
      toast.error("Не удалось удалить карточку");
    }
  }, [isAuthenticated, speak, topic]);

  useVoiceActionHandler(
    (action) => {
      if (!topic) return false;

      if (actionMatches(action, ["edit_topic"])) {
        navigate(`/topics/${topic.id}/edit`);
        return true;
      }

      if (actionMatches(action, ["start_topic", "start_study", "study_again"])) {
        navigate(`/study/${topic.id}`);
        return true;
      }

      if (actionMatches(action, ["start_test"])) {
        navigate("/tests", { state: { autoStartTopicId: topic.id } });
        return true;
      }

      if (actionMatches(action, ["add_card"])) {
        const front = getCardFrontFromAction(action);
        const back = getCardBackFromAction(action);

        if (front && back) {
          void saveCard(front, back);
        } else {
          setNewCard((current) => ({
            front: front || current.front,
            back: back || current.back,
          }));
          speak("Для карточки нужны вопрос и ответ.", "card_data_missing");
        }
        return true;
      }

      if (actionMatches(action, ["delete_card"])) {
        const cardId =
          findCardIdFromAction(
            action,
            topic.cards.map((card, index) => ({
              id: card.id ?? String(index + 1),
              front: card.front,
            }))
          ) ??
          (() => {
            const number = getActionNumber(action, ["card_number", "cardNumber", "number"]);
            return number ? topic.cards[number - 1]?.id : undefined;
          })();

        if (!cardId) {
          speak("Не нашла такую карточку.", "card_not_found");
          return true;
        }

        void deleteCard(String(cardId));
        return true;
      }

      return false;
    },
    [deleteCard, navigate, saveCard, speak, topic],
    20
  );

  if (!topic) return null;

  return (
    <div className="min-h-screen bg-background pb-20 px-4 pt-8">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate("/")} className="mb-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-bold text-sm">
          <ArrowLeft size={18} /> К библиотеке
        </button>

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black text-foreground mb-2">{topic.title}</h1>
            <p className="text-muted-foreground text-sm font-medium">{topic.description}</p>
          </div>
          <button 
            onClick={() => navigate(`/topics/${topic.id}/edit`)}
            className="p-3 bg-muted rounded-2xl hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* ПРЯМОУГОЛЬНИК ДОБАВЛЕНИЯ КАРТЫ */}
        <div className="relative mb-12">
          <div className={`p-8 rounded-[3rem] bg-card border-2 transition-all duration-300 ${!isAuthenticated ? 'border-dashed border-border opacity-80' : 'border-primary/10 shadow-2xl'}`}>
            
            {/* Overlay для гостей */}
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[2px] rounded-[3rem] p-6 text-center">
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center shadow-lg mb-4">
                  <Lock size={20} className="text-primary" />
                </div>
                <p className="font-black text-foreground mb-1 uppercase tracking-tighter">Режим просмотра</p>
                <button onClick={() => navigate("/auth")} className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline">Войдите, чтобы редактировать</button>
              </div>
            )}

            <form onSubmit={handleAddCard} className="space-y-6 relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary ml-2">Новая карточка</h3>
              <div className="space-y-4">
                <div className="relative">
                  <Type size={16} className="absolute left-4 top-4 text-muted-foreground" />
                  <input
                    disabled={!isAuthenticated}
                    value={newCard.front}
                    onChange={(e) => setNewCard({...newCard, front: e.target.value})}
                    placeholder="Вопрос..."
                    className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-4 top-4 text-muted-foreground" />
                  <textarea
                    disabled={!isAuthenticated}
                    value={newCard.back}
                    onChange={(e) => setNewCard({...newCard, back: e.target.value})}
                    placeholder="Ответ..."
                    className="w-full bg-background border border-border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-primary outline-none transition-all min-h-[80px] resize-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!isAuthenticated || !newCard.front || !newCard.back}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Добавить в колоду
              </button>
            </form>
          </div>
        </div>

        {/* Список карт */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-4 ml-2">Карточки ({topic.cards.length})</h2>
          {topic.cards.map((card) => (
            <div key={card.id} className="group flex items-center gap-4 bg-card border border-border p-5 rounded-[2rem] hover:border-primary/20 transition-all">
              <div className="flex-1">
                <p className="font-bold text-foreground mb-1">{card.front}</p>
                <p className="text-sm text-muted-foreground">{card.back}</p>
              </div>
              {isAuthenticated && (
                <button onClick={() => card.id && deleteCard(card.id)} className="p-3 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
