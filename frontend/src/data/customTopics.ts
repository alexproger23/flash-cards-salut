const STORAGE_KEY = "flashcard_custom_topics";

export interface CustomCard {
  id: string;
  front: string;
  back: string;
}

export interface CustomTopic {
  id: string;
  title: string;
  description: string;
  emoji: string;
  frontLabel: string;
  backLabel: string;
  cards: CustomCard[];
  createdAt: string;
  isCustom: true;
}

export function loadCustomTopics(): CustomTopic[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomTopics(topics: CustomTopic[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
}

export function getCustomTopicById(id: string): CustomTopic | undefined {
  return loadCustomTopics().find((t) => t.id === id);
}

export function createCustomTopic(data: {
  title: string;
  description: string;
  emoji: string;
}): CustomTopic {
  const topics = loadCustomTopics();
  const newTopic: CustomTopic = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: data.title.trim(),
    description: data.description.trim(),
    emoji: data.emoji || "BookText", // Было: "📝"
    frontLabel: "Question",
    backLabel: "Answer",
    cards: [],
    createdAt: new Date().toISOString(),
    isCustom: true,
  };
  topics.push(newTopic);
  saveCustomTopics(topics);
  return newTopic;
}

export function updateCustomTopic(
  id: string,
  updates: { title?: string; description?: string; emoji?: string }
): CustomTopic | undefined {
  const topics = loadCustomTopics();
  const idx = topics.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  topics[idx] = {
    ...topics[idx],
    ...(updates.title !== undefined && { title: updates.title.trim() }),
    ...(updates.description !== undefined && { description: updates.description.trim() }),
    ...(updates.emoji !== undefined && { emoji: updates.emoji }),
  };
  saveCustomTopics(topics);
  return topics[idx];
}

export function deleteCustomTopic(id: string): void {
  saveCustomTopics(loadCustomTopics().filter((t) => t.id !== id));
}

export function addCard(
  topicId: string,
  front: string,
  back: string
): CustomTopic | undefined {
  const topics = loadCustomTopics();
  const idx = topics.findIndex((t) => t.id === topicId);
  if (idx === -1) return undefined;
  topics[idx].cards.push({
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    front: front.trim(),
    back: back.trim(),
  });
  saveCustomTopics(topics);
  return topics[idx];
}

export function updateCard(
  topicId: string,
  cardId: string,
  front: string,
  back: string
): CustomTopic | undefined {
  const topics = loadCustomTopics();
  const tIdx = topics.findIndex((t) => t.id === topicId);
  if (tIdx === -1) return undefined;
  const cIdx = topics[tIdx].cards.findIndex((c) => c.id === cardId);
  if (cIdx === -1) return undefined;
  topics[tIdx].cards[cIdx] = { id: cardId, front: front.trim(), back: back.trim() };
  saveCustomTopics(topics);
  return topics[tIdx];
}

export function deleteCard(topicId: string, cardId: string): CustomTopic | undefined {
  const topics = loadCustomTopics();
  const idx = topics.findIndex((t) => t.id === topicId);
  if (idx === -1) return undefined;
  topics[idx].cards = topics[idx].cards.filter((c) => c.id !== cardId);
  saveCustomTopics(topics);
  return topics[idx];
}