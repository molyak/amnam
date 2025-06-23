// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const db = new sqlite3.Database('database.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Создание таблицы пользователей

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  uid TEXT,
  is_admin INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,
  token TEXT
)`);

// Регистрация
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const uid = crypto.randomBytes(4).toString('hex');
  const token = crypto.randomBytes(16).toString('hex');

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (row) return res.json({ error: 'Пользователь уже существует' });

    db.run("INSERT INTO users (username, password, uid, token) VALUES (?, ?, ?, ?)",
      [username, password, uid, token], (err) => {
        if (err) return res.json({ error: 'Ошибка при регистрации' });
        res.json({ token });
      });
  });
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (!row) return res.json({ error: 'Неверный логин или пароль' });
    if (row.is_blocked) return res.json({ error: 'Вы заблокированы' });

    res.json({ token: row.token });
  });
});

// Получение профиля
app.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ error: 'Нет токена' });

  db.get("SELECT username, uid, is_admin, is_blocked FROM users WHERE token = ?", [token], (err, user) => {
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

