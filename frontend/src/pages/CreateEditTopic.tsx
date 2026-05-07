import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { 
  ChevronLeft, Save, Plus, Sparkles, 
  BookText, Microscope, Landmark, Calculator, Globe, Lightbulb, 
  Music, Palette, TestTube, Leaf, Trophy, Brain, SpellCheck, 
  Target, Dna, Ruler, Languages, Theater, Ghost, Rocket, Loader2
} from "lucide-react";
import { toast } from "sonner";

import { fetchUserData, generateCustomTopicCards, saveCustomTopic, type CustomTopic } from "../data/customTopics";
import { useVoiceActionHandler, useVoiceAssistant } from "../voice/VoiceAssistantProvider";
import {
  actionMatches,
  getActionString,
  getTopicDescriptionFromAction,
  getTopicTitleFromAction,
} from "../voice/flashcardVoice";
import { TopicIcon } from "./components/TopicIcon";


const ICON_OPTIONS = [
  { id: "BookText", Icon: BookText },
  { id: "Brain", Icon: Brain },
  { id: "Languages", Icon: Languages },
  { id: "Rocket", Icon: Rocket },
  { id: "Target", Icon: Target },
  { id: "Microscope", Icon: Microscope },
  { id: "Lightbulb", Icon: Lightbulb },
  { id: "Calculator", Icon: Calculator },
  { id: "Globe", Icon: Globe },
  { id: "Palette", Icon: Palette },
  { id: "Music", Icon: Music },
  { id: "Trophy", Icon: Trophy },
  { id: "Leaf", Icon: Leaf },
  { id: "TestTube", Icon: TestTube },
  { id: "Dna", Icon: Dna },
  { id: "Landmark", Icon: Landmark },
  { id: "Ruler", Icon: Ruler },
  { id: "Theater", Icon: Theater },
  { id: "SpellCheck", Icon: SpellCheck },
  { id: "Ghost", Icon: Ghost },
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
    <div className="flex flex-col gap-2.5">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 opacity-70">
        {label}
      </label>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-[1.25rem] px-6 py-4.5 outline-none transition-all duration-200 bg-input-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 text-foreground placeholder:text-muted-foreground/30 font-medium"
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
  const [iconId, setIconId] = useState("BookText");
  const [error, setError] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [cardsCount, setCardsCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Сохраняем исходную тему при редактировании, чтобы не потерять карточки
  const [existingTopic, setExistingTopic] = useState<CustomTopic | null>(null);

  // Асинхронная загрузка данных при редактировании
  useEffect(() => {
    if (isEditing && topicId) {
      const loadTopic = async () => {
        try {
          const data = await fetchUserData();
          const topic = data.customTopics.find((t: CustomTopic) => t.id === topicId);
          if (topic) {
            setExistingTopic(topic);
            setTitle(topic.title);
            setDescription(topic.description);
            setIconId(topic.emoji || "BookText");
          } else {
            navigate("/");
          }
        } catch (error) {
          console.error("Ошибка загрузки темы:", error);
          navigate("/");
        }
      };
      loadTopic();
    }
  }, [isEditing, topicId, navigate]);

  useEffect(() => {
    setAssistantState({
      screen: "topic_form",
      editing: isEditing,
      topicId,
      draft: { title, description, emoji: iconId },
    });
  }, [description, iconId, isEditing, setAssistantState, title, topicId]);

  // Асинхронное сохранение/создание
  const saveTopic = async (nextTitle = title, nextDescription = description, nextIcon = iconId) => {
    if (!nextTitle.trim()) {
      setError("Пожалуйста, введите название темы.");
      speak("Нужно название темы.", "topic_title_missing");
      return;
    }

    if (!isEditing && autoGenerate && nextDescription.trim().length < 15) {
      setError("Для автогенерации нужно описание минимум 15 символов.");
      speak("Для автогенерации нужно описание минимум 15 символов.", "topic_description_missing");
      return;
    }

    try {
      setIsGenerating(!isEditing && autoGenerate);
      if (isEditing && topicId && existingTopic) {
        // Обновляем существующую
        const updatedTopic = { 
          ...existingTopic,
          title: nextTitle, 
          description: nextDescription, 
          emoji: nextIcon 
        };
        await saveCustomTopic(updatedTopic);
        toast.success("Изменения сохранены");
        navigate(`/topics/${topicId}`);
      } else {
        // Создаем новую
        const generatedCards = autoGenerate
          ? await generateCustomTopicCards(nextDescription.trim(), cardsCount)
          : [];

        const newTopic: CustomTopic = {
          id: `custom-${Date.now()}`,
          title: nextTitle,
          description: nextDescription,
          emoji: nextIcon,
          frontLabel: "Вопрос",
          backLabel: "Ответ",
          color: "#f0f4ff", // Дефолтный цвет
          cards: generatedCards,
          isCustom: true
        };
        await saveCustomTopic(newTopic);
        toast.success("Тема создана!");
        navigate(`/topics/${newTopic.id}`);
      }
    } catch (e) {
      setIsGenerating(false);
      console.error("Ошибка сохранения:", e);
      toast.error("Ошибка при сохранении");
    }
  };

  const handleSave = () => saveTopic();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  };

  useVoiceActionHandler(
    (action) => {
      if (actionMatches(action, ["set_topic_title", "set_title"])) {
        const nextTitle = getTopicTitleFromAction(action);
        if (nextTitle) { setTitle(nextTitle); setError(""); }
        return true;
      }
      if (actionMatches(action, ["set_topic_description", "set_description"])) {
        setDescription(getTopicDescriptionFromAction(action) || getActionString(action, ["value"]));
        return true;
      }
      if (actionMatches(action, ["create_topic", "save_topic"])) {
        const nextTitle = getTopicTitleFromAction(action) || title;
        const nextDescription = getTopicDescriptionFromAction(action) || description;
        saveTopic(nextTitle, nextDescription, iconId);
        return true;
      }
      return false;
    },
    [description, iconId, isEditing, navigate, speak, title, topicId, existingTopic], // Добавили existingTopic в зависимости
    20
  );

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 animate-in fade-in duration-500">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(isEditing && topicId ? `/topics/${topicId}` : "/")}
          className="group flex items-center gap-3 text-sm font-bold text-muted-foreground hover:text-primary transition-all mb-8"
        >
          <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shadow-sm">
            <ChevronLeft size={20} />
          </div>
          Назад
        </button>

        <div className="bg-card border border-border rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-black/5 relative overflow-hidden">
          {/* Декоративный элемент фона */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />

          <header className="mb-12 relative z-10">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-14 h-14 bg-primary/10 text-primary rounded-[1.25rem] flex items-center justify-center shadow-inner">
                  <TopicIcon name={iconId} size={28} />
               </div>
               <div>
                  <h1 className="text-3xl font-black tracking-tight text-foreground leading-tight">
                    {isEditing ? "Настройки темы" : "Новый набор"}
                  </h1>
                  <p className="text-muted-foreground text-sm font-medium opacity-80">
                    {isEditing ? "Обновите оформление и описание" : "Создайте структуру для обучения"}
                  </p>
               </div>
            </div>
          </header>

          {/* ВЫБОР ИКОНКИ */}
          <section className="mb-10 relative z-10">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-5 ml-1 opacity-70">
              Визуальный стиль
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
              {ICON_OPTIONS.map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIconId(id)}
                  className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 border-2 ${
                    iconId === id
                      ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/25 scale-110 z-10"
                      : "bg-input-background border-transparent hover:border-border hover:bg-muted/50 text-muted-foreground/40"
                  }`}
                >
                  <Icon size={22} strokeWidth={iconId === id ? 3 : 2} />
                </button>
              ))}
            </div>
          </section>

          {/* ПОЛЯ ВВОДА */}
          <div className="flex flex-col gap-8 relative z-10" onKeyDown={handleKeyDown}>
            <Field
              label="Название курса"
              value={title}
              onChange={(v) => { setTitle(v); setError(""); }}
              placeholder="Напр: Иррегулярные глаголы"
              maxLength={60}
              autoFocus
            />
            <Field
              label="Краткое описание"
              value={description}
              onChange={setDescription}
              placeholder="О чем этот набор карточек?"
              maxLength={500}
            />
            {!isEditing && (
              <div className="rounded-[1.5rem] border border-border bg-muted/30 p-4">
                <label className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-3 text-sm font-black text-foreground">
                    <Sparkles size={18} className="text-primary" />
                    Автогенерация карточек
                  </span>
                  <input
                    type="checkbox"
                    checked={autoGenerate}
                    onChange={(event) => {
                      setAutoGenerate(event.target.checked);
                      setError("");
                    }}
                    className="h-5 w-5 accent-primary"
                  />
                </label>

                {autoGenerate && (
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-muted-foreground">
                      Описание минимум 15 символов.
                    </span>
                    <select
                      value={cardsCount}
                      onChange={(event) => setCardsCount(Number(event.target.value))}
                      className="shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold outline-none"
                    >
                      {[5, 10, 15, 20, 25, 30].map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-in slide-in-from-top-2">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              {error}
            </div>
          )}

          {/* КНОПКА СОХРАНЕНИЯ */}
          <button
            onClick={handleSave}
            disabled={isGenerating}
            className="w-full mt-12 bg-primary text-primary-foreground py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-[0.97] transition-all relative z-10"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : isEditing ? <Save size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
            {isEditing ? "Сохранить изменения" : "Создать колоду"}
          </button>
        </div>
      </div>
    </div>
  );
}
