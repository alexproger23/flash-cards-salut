import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { VoiceAssistantProvider } from "./voice/VoiceAssistantProvider";
import { AuthProvider } from "./context/AuthContext";

/**
 * Главный компонент приложения.
 * Здесь мы настраиваем иерархию провайдеров.
 * VoiceAssistantProvider получает функцию navigate напрямую из объекта router,
 * так как сам он находится ВНЕ контекста RouterProvider.
 */
export default function App() {
  return (
    <AuthProvider>
      <VoiceAssistantProvider
        navigate={(to, options) => {
          // Если ассистент просит вернуться назад (to === -1)
          if (typeof to === "number") {
            void router.navigate(to);
            return;
          }
          // Обычный переход по пути
          void router.navigate(to, options);
        }}
      >
        <div className="min-h-screen w-full transition-colors duration-300">
          <RouterProvider router={router} />
        </div>
      </VoiceAssistantProvider>
    </AuthProvider>
  );
}