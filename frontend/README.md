# Flashcards Frontend

Фронтенд приложения для флеш-карт с интеграцией голосового помощника Салют.

Пользователь может:

- создавать свои темы;
- добавлять, редактировать и удалять карточки;
- проходить тренировку по карточкам;
- отмечать карточку как `знаю` / `не знаю`;
- управлять основными действиями голосом через SmartApp Code сценарий.

## Запуск

Установить зависимости:

```powershell
npm i
```

Запустить dev-сервер:

```powershell
npm run dev
```

Если менялись зависимости, Salute SDK или `.env`, лучше запускать с очисткой Vite cache:

```powershell
npm run dev -- --force
```

Проверить production-сборку:

```powershell
npm run build
```


## Основная структура

```text
src/App.tsx                         # Router + VoiceAssistantProvider
src/routes.tsx                      # Маршруты приложения
src/pages/Home.tsx                  # Главная, список тем
src/pages/TopicManager.tsx          # Управление своей темой и карточками
src/pages/CreateEditTopic.tsx       # Создание/редактирование темы
src/pages/Study.tsx                 # Тренировка по карточкам
src/pages/Results.tsx               # Результаты тренировки
src/pages/Tests.tsx                 # Режим теста
src/pages/components/FlashCard.tsx  # Переворачиваемая карточка
src/data/flashcards.ts              # Встроенные примеры тем
src/data/customTopics.ts            # Свои темы через backend API
src/voice/                          # Интеграция Salute
docs/salute-voice.md                # Формат команд SmartApp Code
```

Структура БД (Таблицы)

Для корректной работы приложения в Supabase должны быть созданы следующие таблицы:
    profiles (id, email, avatar_url) — расширение данных пользователей.
    topics (id, user_id, title, description, emoji, is_public) — темы.
    cards (id, topic_id, front, back, created_at) — карточки внутри тем.


## Роуты

| Роут | Назначение |
| --- | --- |
| `/` | Главная со списком тем |
| `/study/:topicId` | Тренировка |
| `/results/:topicId` | Результаты |
| `/tests` | Режим теста |
| `/topics/new` | Создание своей темы |
| `/topics/:topicId` | Управление своей темой |
| `/topics/:topicId/edit` | Редактирование своей темы |

Встроенные темы открываются сразу в тренировке. Пользовательские темы сначала открываются на экране управления, где можно добавлять карточки.

## Salute / голос

Голосовой слой находится в `src/voice`.

Главные файлы:

```text
src/voice/assistantClient.ts         # createSmartappDebugger/createAssistant, parsing events
src/voice/VoiceAssistantProvider.tsx # общий провайдер, dispatch команд
src/voice/flashcardVoice.ts          # helper-функции для action parameters
src/voice/compactNativePanel.ts      # компактная dev-панель вместо нижней панели Salute
```

В development используется `createSmartappDebugger`. В опубликованном CanvasApp используется `createAssistant`.

Для локальной работы нужен `frontend/.env`:

```dotenv
VITE_SALUTE_TOKEN=токен_эмулятора_из_SmartApp_Studio
VITE_SALUTE_SMARTAPP=имя_CanvasApp
```

Также поддерживаются старые имена из CRA-примера:

```dotenv
REACT_APP_TOKEN=...
REACT_APP_SMARTAPP=...
```


После изменения `.env` нужно перезапустить dev-сервер.

## Как frontend получает команды

SmartApp Code должен отправлять во frontend `smart_app_data` с `action_id`:

```json
{
  "action": {
    "action_id": "show_answer",
    "parameters": {}
  }
}
```

Frontend нормализует payload в `VoiceAction` и отправляет его зарегистрированным обработчикам страниц. Если текущая страница команду не обработала, команда проходит через глобальный обработчик в `VoiceAssistantProvider`.

Подробный формат команд лежит в:

```text
docs/salute-voice.md
```

## Основные action_id

| action_id | Что делает |
| --- | --- |
| `go_home` | Открыть главную |
| `back` | Назад |
| `new_topic` | Открыть создание темы |
| `create_topic` | Создать тему |
| `open_topic` | Открыть тему |
| `start_study` | Начать тренировку |
| `show_answer` | Показать и озвучить ответ |
| `flip_card` | Перевернуть карточку |
| `check_answer` | Проверить голосовой ответ |
| `repeat_question` | Озвучить текущий вопрос |
| `know_card` | Отметить карточку как известную |
| `dont_know_card` | Отметить карточку как неизвестную |
| `study_again` | Начать тренировку заново |
| `add_card` | Добавить карточку |
| `delete_card` | Удалить карточку |
| `save_topic` | Сохранить форму темы |

Пример добавления карточки:

```json
{
  "action": {
    "action_id": "add_card",
    "parameters": {
      "topic_title": "Английские глаголы",
      "front": "go",
      "back": "went, gone"
    }
  }
}
```

## SmartApp Code сценарий

Готовый сценарий лежит рядом с фронтом:

```text
../flashcards-smartapp-code/
../flashcards-smartapp-code.zip
```

Архив можно загрузить в SmartApp Studio как SmartApp Code проект.

После загрузки сценария:

1. Собрать/опубликовать SmartApp Code.
2. Скопировать webhook.
3. В CanvasApp выбрать сценарий `SmartApp Code API`.
4. Вставить webhook.
5. В `frontend/.env` указать свежий токен эмулятора и имя CanvasApp.

Если имя CanvasApp не `flashcards`, нужно поменять фразу запуска в:

```text
../flashcards-smartapp-code/src/entryPoint.sc
```

## Dev-панель Salute

Стандартная нижняя панель `createSmartappDebugger` заменена на компактную панель в правом верхнем углу.

Она нужна только локально, чтобы:

- нажать микрофон;
- ввести команду текстом;
- нажать подсказку.

В обычном CanvasApp эта dev-панель не используется.

Полностью убрать пользовательское действие для микрофона в браузере нельзя: браузер требует разрешение и действие пользователя для записи звука.

## Частые проблемы

### `Срок действия токена истек`

Нужно взять новый токен эмулятора в SmartApp Studio и заменить `VITE_SALUTE_TOKEN`.

### `WebSocket connection to wss://nlp2.devices.sberbank.ru/vps/ failed`

Проверь:

- токен свежий;
- `VITE_SALUTE_SMARTAPP` совпадает с именем CanvasApp;
- CanvasApp привязан к опубликованному SmartApp Code webhook;
- в системе/браузере установлены и доверены сертификаты Минцифры, если TLS ругается на `Russian Trusted Root CA`.

### Голос распознаётся, но команда не выполняется

Открой консоль браузера и смотри логи:

```text
assistant.on(data)
Unsupported assistant action received
```

Нужно проверить, какой `action_id` реально прислал сценарий, и есть ли такой обработчик во frontend.

### После изменения SDK всё равно старое поведение

Запусти:

```powershell
npm run patch:salute-client
npm run dev -- --force
```

`patch:salute-client` также удаляет Vite cache `node_modules/.vite`.

## История проекта

Изначальный UI был сгенерирован из Figma Make проекта `Minimalistic Flashcard Website`.
Интеграция Salute перенесена из соседнего примера `salut-smart-app` и адаптирована под сценарий флеш-карт.

