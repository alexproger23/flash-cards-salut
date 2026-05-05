import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { VoiceAssistantProvider } from "./voice/VoiceAssistantProvider";

export default function App() {
  return (
    <VoiceAssistantProvider>
      <RouterProvider router={router} />
    </VoiceAssistantProvider>
  );
}
