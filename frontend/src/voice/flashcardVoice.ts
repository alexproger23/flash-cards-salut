import { topics, type Topic } from "../data/flashcards";
import { fetchUserData, type CustomTopic } from "../data/customTopics";
import type { VoiceAction } from "./assistantClient";

export type VoiceTopic = Topic | CustomTopic;

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const actionMatches = (action: VoiceAction, names: string[]): boolean =>
  names.includes(action.type);

export const getActionString = (action: VoiceAction, keys: string[]): string => {
  const parameters = isRecord(action.parameters) ? action.parameters : {};

  for (const key of keys) {
    const value = action[key] ?? parameters[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
};

export const getActionNumber = (action: VoiceAction, keys: string[]): number | undefined => {
  const raw = getActionString(action, keys);
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Делаем функцию асинхронной, так как теперь данные скачиваются с сервера
export const getAllVoiceTopics = async (): Promise<VoiceTopic[]> => {
  try {
    const data = await fetchUserData();
    const customTopics = data.customTopics || [];
    return [...customTopics, ...topics];
  } catch (error) {
    console.error("Ошибка при загрузке тем для ассистента", error);
    return [...topics]; // Если сервер не ответил, отдаем хотя бы базовые темы
  }
};

export const isCustomVoiceTopic = (topic: VoiceTopic): topic is CustomTopic =>
  "isCustom" in topic && topic.isCustom === true;

// Эта функция тоже стала асинхронной, так как использует getAllVoiceTopics
export const findTopicFromAction = async (
  action: VoiceAction,
  availableTopics?: VoiceTopic[]
): Promise<VoiceTopic | undefined> => {
  // Если темы не переданы напрямую, скачиваем их
  const targetTopics = availableTopics ?? (await getAllVoiceTopics());

  const id = getActionString(action, ["topic_id", "topicId", "id"]);
  if (id) {
    const byId = targetTopics.find((topic) => topic.id === id);
    if (byId) {
      return byId;
    }
  }

  const number = getActionNumber(action, ["topic_number", "topicNumber", "number"]);
  if (number && targetTopics[number - 1]) {
    return targetTopics[number - 1];
  }

  const title = getActionString(action, ["topic_title", "topicTitle", "title", "topic", "name"]);
  if (!title) {
    return undefined;
  }

  const normalizedTitle = normalizeText(title);
  return targetTopics.find((topic) => normalizeText(topic.title) === normalizedTitle);
};

export const findCardIdFromAction = (
  action: VoiceAction,
  cards: Array<{ id: string | number; front: string }>
): string | number | undefined => {
  const id = getActionString(action, ["card_id", "cardId", "id"]);
  if (id) {
    const byId = cards.find((card) => String(card.id) === id);
    if (byId) {
      return byId.id;
    }
  }

  const number = getActionNumber(action, ["card_number", "cardNumber", "number"]);
  if (number && cards[number - 1]) {
    return cards[number - 1].id;
  }

  const front = getActionString(action, ["front", "question", "term", "word"]);
  if (!front) {
    return undefined;
  }

  const normalizedFront = normalizeText(front);
  return cards.find((card) => normalizeText(card.front) === normalizedFront)?.id;
};

export const getCardFrontFromAction = (action: VoiceAction): string =>
  getActionString(action, ["front", "question", "term", "word", "value"]);

export const getCardBackFromAction = (action: VoiceAction): string =>
  getActionString(action, ["back", "answer", "definition", "translation"]);

export const getTopicTitleFromAction = (action: VoiceAction): string =>
  getActionString(action, ["topic_title", "topicTitle", "title", "topic", "name", "value"]);

export const getTopicDescriptionFromAction = (action: VoiceAction): string =>
  getActionString(action, ["description", "topic_description", "topicDescription"]);