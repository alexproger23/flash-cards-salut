import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { VoiceAssistantProvider } from "./voice/VoiceAssistantProvider";
import { AuthProvider } from "./context/AuthContext";

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
        <div className="min-h-screen w-full transition-colors duration-300">
          <RouterProvider router={router} />
        </div>
      </VoiceAssistantProvider>
    </AuthProvider>
  );
}