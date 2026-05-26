const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Загружаем .env в самом начале

const createDatabase = (dbPath) => {
  try {
    const sqlite3 = require('sqlite3').verbose();
    return new sqlite3.Database(dbPath);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }

    const { DatabaseSync } = require('node:sqlite');
    const database = new DatabaseSync(dbPath);
    const asArray = (params) => Array.isArray(params) ? params : [];

    return {
      serialize(callback) {
        callback();
      },
      run(sql, params, callback) {
        const actualCallback = typeof params === 'function' ? params : callback;
        const actualParams = typeof params === 'function' ? [] : asArray(params);
        try {
          if (actualParams.length === 0) {
            database.exec(sql);
          } else {
            database.prepare(sql).run(...actualParams);
          }
          actualCallback?.(null);
        } catch (err) {
          if (actualCallback) {
            actualCallback(err);
          } else {
            throw err;
          }
        }
      },
      get(sql, params, callback) {
        try {
          const row = database.prepare(sql).get(...asArray(params));
          callback(null, row);
        } catch (err) {
          callback(err);
        }
      },
      all(sql, params, callback) {
        try {
          const rows = database.prepare(sql).all(...asArray(params));
          callback(null, rows);
        } catch (err) {
          callback(err);
        }
      },
    };
  }
};

const app = express(); // СНАЧАЛА создаем app

// Настройки Middlewares (ТОЛЬКО ОДИН РАЗ)
app.use(cors()); 
app.use(express.json());

// Константы из окружения
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-for-flashcards';

// Функция загрузки ENV (если нужно ручное управление, но dotenv выше уже справляется)
const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};
loadEnvFile(path.resolve(__dirname, '../.env'));
loadEnvFile(path.resolve(__dirname, '.env'));

// Путь к БД
const DB_PATH = process.env.DB_PATH || './database.db';
const db = createDatabase(DB_PATH);

// Создаем таблицы
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )`);

  // Таблица для личных тем
  db.run(`CREATE TABLE IF NOT EXISTS custom_topics (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    description TEXT DEFAULT '',
    emoji TEXT,
    cards TEXT -- Сохраняем массив карточек как JSON-строку
  )`);

  // Таблица для скрытых стандартных тем
  db.run(`ALTER TABLE custom_topics ADD COLUMN description TEXT DEFAULT ''`, (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Failed to add custom_topics.description:', err.message);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS hidden_defaults (
    user_id INTEGER,
    topic_id TEXT,
    UNIQUE(user_id, topic_id)
  )`);
});


// Middleware для проверки токена
const extractJsonObject = (value) => {
  if (typeof value !== 'string') return value;
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : value;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LLM response does not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
};

const normalizeGeneratedCards = (payload, count) => {
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];
  if (cards.length === 0) {
    throw new Error('LLM response does not contain cards');
  }

  return cards.slice(0, count).map((card, index) => {
    const front = typeof card.front === 'string' ? card.front.trim() : '';
    const back = typeof card.back === 'string' ? card.back.trim() : '';
    if (!front || !back) {
      throw new Error('LLM response contains an invalid card');
    }

    return {
      id: `generated-${Date.now()}-${index + 1}`,
      front,
      back,
    };
  });
};

const stringifyLlmContent = (value) => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const parseGeneratedCards = (content, count) => {
  if (Array.isArray(content?.cards)) {
    return normalizeGeneratedCards(content, count);
  }

  return normalizeGeneratedCards(extractJsonObject(content), count);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableLlmError = (error) => {
  const code = error?.cause?.code || error?.code;
  return error?.name === 'AbortError' ||
    ['EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNREFUSED'].includes(code) ||
    error?.status === 429 ||
    error?.status >= 500;
};

const buildCardsPrompt = ({ description, count }) => [
  `Сгенерируй ${count} учебных карточек по описанию темы.`,
  `Описание: ${description}`,
  '',
  'Верни ровно один валидный JSON-объект без markdown, без комментариев и без текста до или после JSON.',
  'Структура ответа строго такая:',
  '{"cards":[{"front":"вопрос или термин","back":"краткий правильный ответ"}]}',
  '',
  'Требования к структуре:',
  `- cards должен быть массивом ровно из ${count} объектов.`,
  '- каждый объект должен содержать только строковые поля front и back;',
  '- front должен быть вопросом или термином;',
  '- back должен быть кратким правильным ответом;',
  '- не добавляй id, title, description, markdown-блоки или поясняющий текст;',
  '- экранируй кавычки внутри строк так, чтобы весь ответ можно было сразу распарсить через JSON.parse.',
  '',
  'Текст карточек должен быть на русском языке.',
].join('\n');

const buildRepairPrompt = ({ previousResponse, parseError, count }) => [
  'Предыдущий ответ не удалось распарсить или привести к нужной структуре.',
  `Ошибка парсинга: ${parseError.message}`,
  '',
  'Исправь только формат ответа, сохрани смысл уже сгенерированных карточек.',
  'Верни ровно один валидный JSON-объект без markdown, без комментариев и без текста до или после JSON.',
  'Структура ответа строго такая:',
  '{"cards":[{"front":"вопрос или термин","back":"краткий правильный ответ"}]}',
  '',
  'Требования:',
  `- cards должен быть массивом ровно из ${count} объектов;`,
  '- каждый объект должен содержать только строковые поля front и back;',
  '- если карточек больше, оставь лучшие;',
  '- если карточек меньше, добавь недостающие в том же стиле;',
  '- экранируй кавычки внутри строк так, чтобы весь ответ можно было сразу распарсить через JSON.parse.',
  '',
  'Предыдущий ответ:',
  previousResponse,
].join('\n');

const callCardsLlm = async ({ description, count }) => {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL;
  const folderId = process.env.LLM_API_FOLDER || process.env.LLM_FOLDER_ID;
  const rawModel = process.env.LLM_MODEL;
  const isYandexResponsesApi = apiUrl?.includes('ai.api.cloud.yandex.net') || apiUrl?.endsWith('/responses');
  const model = isYandexResponsesApi && folderId && rawModel && !rawModel.startsWith('gpt://')
    ? `gpt://${folderId}/${rawModel}/latest`
    : rawModel;


  if (!apiKey || !model || !apiUrl || (isYandexResponsesApi && !folderId)) {
    const missing = [
      !apiKey && 'LLM_API_KEY',
      !model && 'LLM_MODEL',
      !apiUrl && 'LLM_API_URL',
      isYandexResponsesApi && !folderId && 'LLM_API_FOLDER',
    ].filter(Boolean).join(', ');
    throw new Error(`Missing LLM env variables: ${missing}`);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(isYandexResponsesApi
      ? { Authorization: `Api-Key ${apiKey}`, 'OpenAI-Project': folderId }
      : { Authorization: `Bearer ${apiKey}`, ...(folderId ? { 'OpenAI-Project': folderId } : {}) }),
  };

  const requestCards = async (prompt, temperature) => {
    const body = isYandexResponsesApi
      ? {
          model,
          instructions: 'Ты помогаешь создавать учебные flashcards. Отвечай только валидным JSON в заданной структуре.',
          input: prompt,
          temperature,
          max_output_tokens: Number.parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '2000', 10),
        }
      : {
          model,
          messages: [
            { role: 'system', content: 'Ты помогаешь создавать учебные flashcards. Отвечай только валидным JSON в заданной структуре.' },
            { role: 'user', content: prompt },
          ],
          temperature,
          response_format: { type: 'json_object' },
        };

    const maxAttempts = 3;
    let responseText = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        responseText = await response.text();
        if (!response.ok) {
          const error = new Error(`LLM request failed with ${response.status}: ${responseText.slice(0, 500)}`);
          error.status = response.status;
          throw error;
        }
        break;
      } catch (error) {
        if (attempt >= maxAttempts || !isRetriableLlmError(error)) {
          throw error;
        }
        console.warn(`LLM request failed on attempt ${attempt}/${maxAttempts}, retrying:`, error);
        await wait(500 * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return responseText;
    }
    if (Array.isArray(data?.cards)) {
      return data;
    }

    return data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.output_text ??
      data?.output?.flatMap((item) => item?.content || []).find((item) => item?.text)?.text ??
      responseText;
  };

  const content = await requestCards(buildCardsPrompt({ description, count }), 0.3);
  try {
    return parseGeneratedCards(content, count);
  } catch (parseError) {
    console.warn('LLM card generation response parse failed, retrying with repair prompt:', parseError);
    const repairPrompt = buildRepairPrompt({
      previousResponse: stringifyLlmContent(content),
      parseError,
      count,
    });
    const repairedContent = await requestCards(repairPrompt, 0);
    return parseGeneratedCards(repairedContent, count);
  }
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Нет токена' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Токен недействителен' });
    req.user = decoded; // Добавляем данные юзера в запрос
    next();
  });
};

// ================= АВТОРИЗАЦИЯ =================

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Заполните все поля' });
  
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, hashedPassword], function (err) {
    if (err) return res.status(400).json({ message: 'Email уже занят' });
    res.status(201).json({ message: 'Успех' });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Неверные данные' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id.toString(), email: user.email } });
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ id: req.user.id.toString(), email: req.user.email });
});



// Получить все данные пользователя
app.get('/api/userdata', authenticate, (req, res) => {
  const userId = req.user.id;
  
  db.all(`SELECT * FROM custom_topics WHERE user_id = ?`, [userId], (err, topics) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Парсим JSON обратно в массив
    const parsedTopics = topics.map(t => ({
      ...t,
      cards: JSON.parse(t.cards)
    }));

    db.all(`SELECT topic_id FROM hidden_defaults WHERE user_id = ?`, [userId], (err, hidden) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const hiddenIds = hidden.map(h => h.topic_id);
      res.json({ customTopics: parsedTopics, hiddenIds });
    });
  });
});

// Сохранить/обновить личную тему
app.post('/api/topics', authenticate, (req, res) => {
  const { id, title, description = '', emoji, cards } = req.body;
  const userId = req.user.id;
  const cardsJson = JSON.stringify(cards);

  db.run(
    `INSERT INTO custom_topics (id, user_id, title, description, emoji, cards) 
     VALUES (?, ?, ?, ?, ?, ?) 
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, emoji=excluded.emoji, cards=excluded.cards`,
    [id, userId, title, description, emoji, cardsJson],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Удалить личную тему
app.post('/api/topics/generate-cards', authenticate, async (req, res) => {
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const count = Number.parseInt(req.body.count, 10);

  if (description.length < 15) {
    return res.status(400).json({ error: 'Description must contain at least 15 characters' });
  }

  if (!Number.isInteger(count) || count < 1 || count > 30) {
    return res.status(400).json({ error: 'Count must be an integer from 1 to 30' });
  }

  try {
    const cards = await callCardsLlm({ description, count });
    res.json({ cards });
  } catch (error) {
    console.error('LLM card generation failed:', error);
    res.status(502).json({ error: 'Failed to generate cards' });
  }
});

app.delete('/api/topics/:id', authenticate, (req, res) => {
  db.run(`DELETE FROM custom_topics WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Скрыть стандартную тему
app.post('/api/topics/hide-default', authenticate, (req, res) => {
  db.run(`INSERT OR IGNORE INTO hidden_defaults (user_id, topic_id) VALUES (?, ?)`, [req.user.id, req.body.topicId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// В САМОМ КОНЦЕ ФАЙЛА исправляем запуск:
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
