import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/index.css"; // Скоро мы наведем тут порядок с Tailwind

createRoot(document.getElementById("root")!).render(<App />);