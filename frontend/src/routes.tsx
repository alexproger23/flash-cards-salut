import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { Home } from "./pages/Home";
import { Study } from "./pages/Study";
import { Results } from "./pages/Results";
import { CreateEditTopic } from "./pages/CreateEditTopic";
import { TopicManager } from "./pages/TopicManager";
import { Auth } from "./pages/Auth";
import { Tests } from "./pages/Tests"; // 👈 Исправлено имя на Tests
import { useAuth } from "./context/AuthContext";
import { Sidebar } from "./pages/Sidebar";
import { Toaster } from "sonner";

const RootLayout = () => {
  const { loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Toaster position="top-center" richColors />
      {!loading && <Sidebar />}
      <main className="w-full min-h-screen pt-20 px-6"> 
        <div className="max-w-5xl mx-auto">
           <Outlet />
        </div>
      </main>
    </div>
  );
};

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null; 
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/auth", element: <Auth /> },
      { path: "/", element: <Home /> },
      { path: "/study/:topicId", element: <Study /> },
      { path: "/results/:topicId", element: <Results /> },
      { path: "/topics/:topicId", element: <TopicManager /> },
      { path: "/test", element: <Tests /> }, // 👈 Ссылка на компонент Tests

      {
        element: <ProtectedRoute />,
        children: [
          { path: "/topics/new", element: <CreateEditTopic /> },
          { path: "/topics/:topicId/edit", element: <CreateEditTopic /> },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);