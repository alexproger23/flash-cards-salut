import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { VoiceAssistantProvider } from "./voice/VoiceAssistantProvider";
import { AuthProvider } from "./context/AuthContext";

/**
 * Главный корневой компонент.
 * Мы убрали отсюда классы bg-background, чтобы фон страницы 
 * управлялся единолично файлом index.css. Это решит проблему 
 * "разного времени закраски" центра и краев.
 */
export default function App() {
  return (
    <AuthProvider>
      <VoiceAssistantProvider
        navigate={(to, options) => {
          if (typeof to === "number") {
            void router.navigate(to);
            return;
          }
          void router.navigate(to, options);
        }}
      >
        {/* Контейнер-оболочка. 
          min-h-screen гарантирует, что контент занимает всю высоту.
          w-full гарантирует полную ширину.
          Мы не вешаем сюда bg-background, чтобы избежать дублирования слоев.
        */}
        <div className="min-h-screen w-full transition-colors duration-300">
          <RouterProvider router={router} />
        </div>
      </VoiceAssistantProvider>
    </AuthProvider>
  );
}