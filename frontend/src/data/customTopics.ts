export interface CustomTopic {
  id: string;
  title: string;
  emoji: string;
  cards: { front: string; back: string }[];
}

// Достаем токен из памяти, чтобы показать его серверу
const getHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

// Загрузка данных с сервера
export const fetchUserData = async () => {
  const res = await fetch("http://localhost:5000/api/userdata", { headers: getHeaders() });
  if (!res.ok) throw new Error("Ошибка загрузки данных");
  return await res.json(); 
};

// Сохранение темы на сервере
export const saveCustomTopic = async (topic: CustomTopic) => {
  await fetch("http://localhost:5000/api/topics", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(topic)
  });
};

// Удаление темы на сервере
export const deleteCustomTopic = async (topicId: string) => {
  await fetch(`http://localhost:5000/api/topics/${topicId}`, {
    method: "DELETE",
    headers: getHeaders()
  });
};

// Скрытие стандартных тем (сохраняем ID скрытой темы в БД)
export const hideDefaultTopic = async (topicId: string) => {
  await fetch("http://localhost:5000/api/topics/hide-default", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ topicId })
  });
};