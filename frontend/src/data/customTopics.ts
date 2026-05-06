export interface CustomTopic {
  id: string;
  title: string;
  emoji: string;
  cards: { front: string; back: string }[];
}

const getHeaders = () => {
  // ПРОВЕРЬ: точно ли ключ называется "auth_token"?
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

// Загрузка данных с сервера
export const fetchUserData = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/userdata", { 
      headers: getHeaders(),
      // Добавим небольшой таймаут, чтобы fetch не висел вечно
      signal: AbortSignal.timeout(5000) 
    });

    if (!res.ok) {
        console.warn(`Сервер ответил статусом ${res.status}`);
        return { customTopics: [], hiddenIds: [] };
    }

    return await res.json();
  } catch (err) {
    // Вместо throw new Error, мы просто логируем и возвращаем пустую структуру
    console.error("Ошибка обновления кэша тем для Салют:", err);
    return { customTopics: [], hiddenIds: [] }; 
  }
};

// Сохранение темы
export const saveCustomTopic = async (topic: CustomTopic) => {
  try {
    const res = await fetch("http://localhost:5000/api/topics", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(topic)
    });
    if (!res.ok) throw new Error("Не удалось сохранить тему");
  } catch (err) {
    console.error(err);
    throw err; // Тут можно прокинуть ошибку, чтобы показать уведомление пользователю
  }
};

// Удаление темы
export const deleteCustomTopic = async (topicId: string) => {
  try {
    await fetch(`http://localhost:5000/api/topics/${topicId}`, {
      method: "DELETE",
      headers: getHeaders()
    });
  } catch (err) {
    console.error("Ошибка при удалении:", err);
  }
};

// Скрытие тем
export const hideDefaultTopic = async (topicId: string) => {
  try {
    await fetch("http://localhost:5000/api/topics/hide-default", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ topicId })
    });
  } catch (err) {
    console.error("Ошибка при скрытии темы:", err);
  }
};