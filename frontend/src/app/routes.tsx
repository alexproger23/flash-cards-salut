import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Study } from "./pages/Study";
import { Results } from "./pages/Results";
import { CreateEditTopic } from "./pages/CreateEditTopic";
import { TopicManager } from "./pages/TopicManager";

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/study/:topicId", Component: Study },
  { path: "/results/:topicId", Component: Results },
  { path: "/topics/new", Component: CreateEditTopic },
  { path: "/topics/:topicId", Component: TopicManager },
  { path: "/topics/:topicId/edit", Component: CreateEditTopic },
  { path: "*", Component: Home },
]);
