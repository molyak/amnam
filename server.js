
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('database.sqlite');

// Регистрация
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const uid = Math.random().toString(36).substring(2, 10);
  db.run(`UPDATE users SET purchases = json_insert(purchases, '$[#]', ?) WHERE username = ?`,
  [product, username],
  function (err) {
    if (err) return res.status(500).send('Ошибка при выдаче товара');
    res.send('Товар выдан');
  }
);

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err || !row) return res.status(401).json({ error: 'Неверные данные' });
    res.json(row);
  });
});

// Получение всех пользователей (для админки)
app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Выдача админки
app.post('/admin/give-admin', (req, res) => {
  const { username } = req.body;
  db.run('UPDATE users SET is_admin = 1 WHERE username = ?', [username], function (err) {
    if (err || this.changes === 0) return res.status(400).json({ error: 'Не найден' });
    res.json({ success: true });
  });
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
    if (!row) return res.status(400).json({ error: 'Неверный ключ' });
    db.run('DELETE FROM activation_keys WHERE key = ?', [key]);
    db.run(`UPDATE users SET purchases = json_insert(purchases, '$[#]', ?) WHERE username = ?`, [purchase, username]);
      ['Клиент активирован по ключу', username]);
    res.json({ success: true });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
