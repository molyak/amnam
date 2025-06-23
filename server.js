const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к базе данных SQLite
const db = new sqlite3.Database('amnam.db', (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

// Инициализация таблиц
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      uid TEXT UNIQUE NOT NULL,
      reg_date TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT 0,
      is_blocked BOOLEAN DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activation_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      duration TEXT NOT NULL,
      used BOOLEAN DEFAULT 0
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

// Генерация UID
function generateUID() {
  return crypto.randomBytes(4).toString('hex');
}

// Генерация ключа
function generateKey() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Регистрация пользователя
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });

  db.get('SELECT username FROM users WHERE username = ?', [username], (err, row) => {
    if (row) return res.status(400).json({ error: 'Пользователь уже существует' });

    const uid = generateUID();
    const regDate = new Date().toISOString();
    db.run(
      'INSERT INTO users (username, password, uid, reg_date) VALUES (?, ?, ?, ?)',
      [username, password, uid, regDate],
      (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка регистрации' });
        res.json({ success: true, username });
      }
    );
  });
});

// Вход пользователя
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, user) => {
      if (err || !user) return res.status(400).json({ error: 'Неверный ник или пароль' });
      if (user.is_blocked) return res.status(403).json({ error: 'Вы заблокированы' });
      res.json({ success: true, username: user.username });
    }
  );
});

// Получение данных пользователя
app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.all(
      'SELECT product, purchase_date FROM purchases WHERE user_id = ?',
      [user.id],
      (err, purchases) => {
        if (err) return res.status(500).json({ error: 'Ошибка получения покупок' });
        res.json({
          username: user.username,
          uid: user.uid,
          reg_date: user.reg_date,
          is_admin: user.is_admin,
          is_blocked: user.is_blocked,
          password: user.password,
          purchases: purchases.map((p) => p.product),
        });
      }
    );
  });
});

// Активация ключа
app.post('/api/activate-key', (req, res) => {
  const { key, username } = req.body;
  db.get('SELECT * FROM activation_keys WHERE key = ? AND used = 0', [key], (err, keyRow) => {
    if (err || !keyRow) return res.status(400).json({ error: 'Неверный или использованный ключ' });

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

      db.run(
        'INSERT INTO purchases (user_id, product, purchase_date) VALUES (?, ?, ?)',
        [user.id, `Активирован по ключу (${keyRow.duration})`, new Date().toISOString()],
        (err) => {
          if (err) return res.status(500).json({ error: 'Ошибка активации' });
          db.run('UPDATE activation_keys SET used = 1 WHERE key = ?', [key], (err) => {
            if (err) return res.status(500).json({ error: 'Ошибка обновления ключа' });
            res.json({ success: true });
          });
        }
      );
    });
  });
});

// Получение списка пользователей (для админ-панели)
app.get('/api/users', (req, res) => {
  db.all('SELECT username, is_admin FROM users', (err, users) => {
    if (err) return res.status(500).json({ error: 'Ошибка получения пользователей' });
    res.json(users);
  });
});

// Выдача товара (админ)
app.post('/api/admin/give-product', (req, res) => {
  const { username, product } = req.body;
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });

    db.run(
      'INSERT INTO purchases (user_id, product, purchase_date) VALUES (?, ?, ?)',
      [user.id, product, new Date().toISOString()],
      (err) => {
        if (err) return res.status(500).json({ error: 'Ошибка выдачи товара' });
        res.json({ success: true });
      }
    );
  });
});

// Назначение админа
app.post('/api/admin/give-admin', (req, res) => {
  const { username } = req.body;
  db.run(
    'UPDATE users SET is_admin = 1 WHERE username = ?',
    [username],
    function (err) {
      if (err || this.changes === 0)
        return res.status(404).json({ error: 'Пользователь не найден' });
      res.json({ success: true });
    }
  );
});

// Блокировка пользователя
app.post('/api/admin/block-user', (req, res) => {
  const { username } = req.body;
  db.run(
    'UPDATE users SET is_blocked = 1 WHERE username = ?',
    [username],
    function (err) {
      if (err || this.changes === 0)
        return res.status(404).json({ error: 'Пользователь не найден' });
      res.json({ success: true });
    }
  );
});

// Генерация ключа
app.post('/api/admin/generate-key', (req, res) => {
  const { duration } = req.body;
  const key = generateKey();
  db.run(
    'INSERT INTO activation_keys (key, duration, used) VALUES (?, ?, 0)',
    [key, duration],
    (err) => {
      if (err) return res.status(500).json({ error: 'Ошибка генерации ключа' });
      res.json({ success: true, key });
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
