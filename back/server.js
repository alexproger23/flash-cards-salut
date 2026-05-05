const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'super-secret-key-for-flashcards';

app.use(cors());
app.use(express.json());

// 1. ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
const db = new sqlite3.Database('./database.db');

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
    emoji TEXT,
    cards TEXT -- Сохраняем массив карточек как JSON-строку
  )`);

  // Таблица для скрытых стандартных тем
  db.run(`CREATE TABLE IF NOT EXISTS hidden_defaults (
    user_id INTEGER,
    topic_id TEXT,
    UNIQUE(user_id, topic_id)
  )`);
});

// Middleware для проверки токена
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
  const { id, title, emoji, cards } = req.body;
  const userId = req.user.id;
  const cardsJson = JSON.stringify(cards);

  db.run(
    `INSERT INTO custom_topics (id, user_id, title, emoji, cards) 
     VALUES (?, ?, ?, ?, ?) 
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, emoji=excluded.emoji, cards=excluded.cards`,
    [id, userId, title, emoji, cardsJson],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Удалить личную тему
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

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));