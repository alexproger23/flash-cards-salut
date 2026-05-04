import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { Home } from "./pages/Home";
import { Study } from "./pages/Study";
import { Results } from "./pages/Results";
import { CreateEditTopic } from "./pages/CreateEditTopic";
import { TopicManager } from "./pages/TopicManager";

// Временная заглушка для страниц авторизации
const LoginPlaceholder = () => <div className="p-10 text-center text-xl">Страница Входа (В разработке)</div>;

// Компонент-обертка для защиты приватных страниц
const ProtectedRoute = () => {
  // TODO: Здесь будем доставать токен из localStorage или стейта
  const isAuthenticated = true; // Поставь false, чтобы сымитировать неавторизованного юзера

  if (!isAuthenticated) {
    // Если не залогинен — перекидываем на логин
    return <Navigate to="/login" replace />;
  }

  // Если залогинен — показываем нужную страницу
  return <Outlet />;
};

export const router = createBrowserRouter([
  // Публичные роуты (доступны всем)
  { path: "/", Component: Home },
  { path: "/login", Component: LoginPlaceholder },
  
  // Приватные роуты (доступны только после входа)
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/study/:topicId", Component: Study },
      { path: "/results/:topicId", Component: Results },
      { path: "/topics/new", Component: CreateEditTopic },
      { path: "/topics/:topicId", Component: TopicManager },
      { path: "/topics/:topicId/edit", Component: CreateEditTopic },
    ],
  },
  
  // Fallback (404 или просто редирект на главную)
  { path: "*", Component: Home },
]);