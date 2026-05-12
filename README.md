# Flash Cards Salut

Веб-приложение для изучения карточек с поддержкой личных тем, тренировок, тестов и голосового управления. Проект состоит из React-фронтенда, Node.js backend API и сценария SmartApp Code для интеграции с Салютом.

Публичный фронтенд: https://alexproger23.github.io/flash-cards-salut/

## Возможности

- просмотр встроенных наборов карточек;
- регистрация и вход в аккаунт;
- создание своих тем и карточек;
- тренировка по карточкам с отметками `знаю` / `не знаю`;
- режим теста по выбранной теме;
- генерация карточек по описанию через LLM API;
- голосовое управление в браузере и в окружении Салюта.

## Стек

- Frontend: React, Vite, React Router, Tailwind CSS, Framer Motion;
- Backend: Node.js, Express, SQLite, JWT;
- Voice: Web Speech API в браузере, SmartApp Code / Salute SDK для Салюта;
- Deploy: GitHub Pages для фронтенда, Render для backend.

## Структура

```text
frontend/                 React-приложение
back/                     Express API и SQLite база
flashcards-smartapp-code/ SmartApp Code сценарий для Салюта
docker-compose.yaml       Локальный запуск через Docker
```

Ключевые файлы фронтенда:

```text
frontend/src/pages/       Основные экраны приложения
frontend/src/data/        Встроенные темы и работа с API
frontend/src/voice/       Голосовой слой и обработка команд
frontend/src/config.ts    URL backend API
```

## Запуск Локально

Установить зависимости:

```powershell
cd back
npm install

cd ../frontend
npm install
```

Запустить backend:

```powershell
cd back
node server.js
```

Запустить frontend:

```powershell
cd frontend
npm run dev
```

По умолчанию frontend открывается на `http://localhost:5173`, backend слушает `http://localhost:5000`.

## Переменные Окружения

В корне проекта можно создать `.env` на основе `.env.example`.

Основные backend-переменные:

```dotenv
JWT_SECRET=your-secret
DB_PATH=./database.db
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-oss-120b
LLM_API_URL=https://ai.api.cloud.yandex.net/v1/responses
LLM_API_FOLDER=your-yandex-folder-id
LLM_MAX_OUTPUT_TOKENS=2000
```

Для frontend можно задать URL API:

```dotenv
VITE_API_URL=https://flash-cards-salut-back.onrender.com/api
```

Если `VITE_API_URL` не задан, frontend использует production backend на Render.

## Docker

```powershell
docker-compose up --build
```

## Сборка И Деплой Frontend

Проверить production-сборку:

```powershell
cd frontend
npm run build
```

Опубликовать на GitHub Pages:

```powershell
cd frontend
npm run deploy
```

Если команда `gh-pages` не найдена, сначала установите зависимости:

```powershell
npm install
```

## Голосовое Управление

В обычном браузере используется Web Speech API. Лучше всего работает в Chrome и Edge. В окружении Салюта приложение может работать через `AssistantHost` и сценарий из `flashcards-smartapp-code/`.

Голосовой код фронтенда находится в `frontend/src/voice/`.
