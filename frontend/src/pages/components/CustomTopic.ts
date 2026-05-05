export interface CustomTopic {
    id: string;
    title: string;
    emoji: string;
    cards: { front: string; back: string }[];
  }
  
  // Загрузка тем: теперь строго по userId
  export const loadCustomTopics = (userId: string | undefined): CustomTopic[] => {
    if (!userId) return [];
    const saved = localStorage.getItem(`custom_topics_${userId}`);
    return saved ? JSON.parse(saved) : [];
  };
  
  // Сохранение: добавляем userId в ключ
  export const saveCustomTopic = (userId: string | undefined, topic: CustomTopic) => {
    if (!userId) return;
    const topics = loadCustomTopics(userId);
    const existingIndex = topics.findIndex((t) => t.id === topic.id);
  
    if (existingIndex > -1) {
      topics[existingIndex] = topic;
    } else {
      topics.push(topic);
    }
  
    localStorage.setItem(`custom_topics_${userId}`, JSON.stringify(topics));
  };
  
  // Удаление: чистим только базу этого пользователя
  export const deleteCustomTopic = (userId: string | undefined, topicId: string) => {
    if (!userId) return;
    const topics = loadCustomTopics(userId);
    const filtered = topics.filter((t) => t.id !== topicId);
    localStorage.setItem(`custom_topics_${userId}`, JSON.stringify(filtered));
  };