import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { Home } from "./pages/Home";
import { Study } from "./pages/Study";
import { Results } from "./pages/Results";
import { CreateEditTopic } from "./pages/CreateEditTopic";
import { TopicManager } from "./pages/TopicManager";
import { Auth } from "./pages/Auth";
import { useAuth } from "./context/AuthContext";
import { Sidebar } from "./pages/Sidebar";
import { Toaster } from "sonner";

// 1. Общий Layout для всего приложения
const RootLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    /* Мы убрали bg-[#F8F9FC]. Теперь фон берется из глобального index.css.
       Добавили transition, чтобы все элементы (включая Sidebar) менялись плавно.
    */
    <div className="min-h-screen transition-colors duration-300">
      {/* Исправленный Toaster без сокращений */}
      <Toaster 
        position="top-center" 
        richColors 
        toastOptions={{
          style: { borderRadius: '1.25rem' },
        }} 
      />
      
      {isAuthenticated && <Sidebar />}
      
      <main className="w-full min-h-screen pt-20 px-6"> 
        <div className="max-w-5xl mx-auto">
           <Outlet />
        </div>
      </main>
    </div>
  );
};

// 2. Компонент-обертка для защиты приватных страниц
const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    // Весь сайт оборачиваем в RootLayout
    element: <RootLayout />,
    children: [
      // Публичные роуты
      { path: "/auth", Component: Auth },
      
      // Группа защищенных роутов
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/", Component: Home },
          { path: "/study/:topicId", Component: Study },
          { path: "/results/:topicId", Component: Results },
          { path: "/topics/new", Component: CreateEditTopic },
          { path: "/topics/:topicId", Component: TopicManager },
          { path: "/topics/:topicId/edit", Component: CreateEditTopic },
        ],
      },
      
      // Редирект для всех остальных путей
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);