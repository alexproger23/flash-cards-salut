import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { VoiceAssistantProvider } from "./voice/VoiceAssistantProvider";

export default function App() {
  return (
    <VoiceAssistantProvider
      navigate={(to, options) => {
        if (typeof to === "number") {
          void router.navigate(to);
          return;
        }

        void router.navigate(to, options);
      }}
    >
      <RouterProvider router={router} />
    </VoiceAssistantProvider>
  );
}
