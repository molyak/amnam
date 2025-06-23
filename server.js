const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('database.sqlite');

// Создание таблиц при запуске
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      uid TEXT NOT NULL,
      purchases TEXT DEFAULT '[]',
      is_admin INTEGER DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activation_keys (
      key TEXT PRIMARY KEY
    )
  `);
});

// Регистрация
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const uid = Math.random().toString(36).substring(2, 10);
  db.run(
    'INSERT INTO users (username, password, uid) VALUES (?, ?, ?)',
    [username, password, uid],
    function (err) {
      if (err) return res.status(500).send('Ошибка регистрации');
      res.send('Пользователь зарегистрирован');
    }
  );
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err || !row) return res.status(401).json({ error: 'Неверные данные' });
      res.json(row);
    }
  );
});

// Получение всех пользователей
app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Выдача админки
app.post('/admin/give-admin', (req, res) => {
  const { username } = req.body;
  db.run(
    'UPDATE users SET is_admin = 1 WHERE username = ?',
    [username],
    function (err) {
      if (err || this.changes === 0)
        return res.status(400).json({ error: 'Пользователь не найден' });
      res.json({ success: true });
    }
  );
});

// Генерация ключа
app.post('/admin/generate-key', (req, res) => {
  const key = Math.random().toString(36).substring(2, 10).toUpperCase();
  db.run('INSERT INTO activation_keys (key) VALUES (?)', [key], function (err) {
    if (err) return res.status(500).json({ error: 'Ошибка генерации' });
    res.json({ key });
  });
});

// Активация ключа
app.post('/activate-key', (req, res) => {
  const { username, key } = req.body;
  db.get('SELECT * FROM activation_keys WHERE key = ?', [key], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Неверный ключ' });

    // Удаляем ключ
    db.run('DELETE FROM activation_keys WHERE key = ?', [key]);

    // Обновляем покупки пользователя
    db.run(
      `UPDATE users SET purchases = json_insert(purchases, '$[#]', ?) WHERE username = ?`,
      ['Клиент активирован по ключу', username],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'Ошибка при обновлении покупок' });
        res.json({ success: true });
      }
    );
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
