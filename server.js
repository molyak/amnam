// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require("crypto");
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_CODE = "a1m2n3a4m5c6l7i8e9n10t11";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// SQLite init
const db = new sqlite3.Database('database.sqlite');
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    uid TEXT,
    is_admin INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT,
    expires_at TEXT,
    used INTEGER DEFAULT 0
  )
`);

// UID Generator
function generateUID() {
  return crypto.randomBytes(6).toString("hex");
}

// Генерация ключа
function generateKey(duration) {
  const key = crypto.randomBytes(8).toString("hex");
  let expires_at = null;
  if (duration === '30') {
    expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
  } else if (duration === '365') {
    expires_at = new Date(Date.now() + 365 * 86400000).toISOString();
  }
  return { key, expires_at };
}

// Регистрация
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: "Неверные данные" });

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, existing) => {
    if (err) return res.json({ error: "Ошибка базы данных" });
    if (existing) return res.json({ error: "Пользователь уже существует" });

    const uid = generateUID();
    db.run('INSERT INTO users (username, password, uid) VALUES (?, ?, ?)', [username, password, uid], err => {
      if (err) return res.json({ error: "Ошибка при регистрации" });
      res.json({ success: true, username, uid });
    });
  });
});

// Вход
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err || !user) return res.json({ error: "Неверный логин или пароль" });
    res.json({ success: true, username: user.username, uid: user.uid, is_admin: user.is_admin });
  });
});

// Проверка секретного кода
app.post('/api/validate-code', (req, res) => {
  const { code } = req.body;
  res.json({ success: code === SECRET_CODE });
});

// Генерация ключа
app.post('/api/admin/generate-key', (req, res) => {
  const { duration } = req.body;
  const { key, expires_at } = generateKey(duration);
  db.run('INSERT INTO keys (key, expires_at) VALUES (?, ?)', [key, expires_at], err => {
    if (err) return res.json({ error: 'Ошибка генерации' });
    res.json({ success: true, key });
  });
});

// Выдать админку
app.post('/api/admin/give-admin', (req, res) => {
  const { username } = req.body;
  db.run('UPDATE users SET is_admin = 1 WHERE username = ?', [username], err => {
    if (err) return res.json({ error: 'Ошибка базы данных' });
    res.json({ success: true });
  });
});

// Заблокировать пользователя
app.post('/api/admin/block-user', (req, res) => {
  const { username } = req.body;
  db.run('UPDATE users SET is_blocked = 1 WHERE username = ?', [username], err => {
    if (err) return res.json({ error: 'Ошибка базы данных' });
    res.json({ success: true });
  });
});

// Разблокировать пользователя
app.post('/api/admin/unblock-user', (req, res) => {
  const { username } = req.body;
  db.run('UPDATE users SET is_blocked = 0 WHERE username = ?', [username], err => {
    if (err) return res.json({ error: 'Ошибка базы данных' });
    res.json({ success: true });
  });
});

// Выдать товар (запись в purchases не требуется для демо)
app.post('/api/admin/give-product', (req, res) => {
  const { username } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.json({ error: "Пользователь не найден" });
    res.json({ success: true });
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
