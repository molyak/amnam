// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// Настройка подключения к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://username:password@localhost:5432/amnamdb'
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Инициализация таблиц
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      uid TEXT NOT NULL,
      reg_date TIMESTAMP NOT NULL,
      purchases TEXT[] DEFAULT '{}',
      is_admin BOOLEAN DEFAULT FALSE,
      is_blocked BOOLEAN DEFAULT FALSE
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activation_keys (
      key TEXT PRIMARY KEY,
      duration TEXT NOT NULL
    );
  `);
})();

// ### Регистрация ###
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ error: "Неверные данные" });
  const uid = crypto.randomBytes(4).toString('hex');
  const user = await pool.query('SELECT username FROM users WHERE username = $1', [username]);
  if (user.rowCount) return res.json({ error: "Пользователь уже существует" });

  await pool.query(`
    INSERT INTO users (username, password, uid, reg_date) VALUES ($1,$2,$3,NOW())
  `, [username, password, uid]);
  res.json({ success: true, username, uid });
});

// ### Вход ###
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(`
    SELECT username, uid, is_blocked FROM users 
    WHERE username = $1 AND password = $2
  `, [username, password]);
  if (!result.rowCount) return res.json({ error: "Неверный логин или пароль" });
  const user = result.rows[0];
  if (user.is_blocked) return res.json({ error: "Вы заблокированы" });
  res.json({ success: true, username: user.username, uid: user.uid });
});

// ### Получить профиль ###
app.get('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  const r = await pool.query(`SELECT username, uid, reg_date, purchases, is_admin, is_blocked
    FROM users WHERE username = $1`, [username]);
  if (!r.rowCount) return res.json({});
  res.json(r.rows[0]);
});

// ### Код для доступа к админке ###
const SECRET = 'a1m2n3a4m5c6l7i8e9n10t11';
app.post('/api/validate-code', (req, res) => {
  res.json({ success: req.body.code === SECRET });
});

// ### Админ: выдать продукт / ключи / блокировка / админка ###
app.post('/api/admin/:action', async (req, res) => {
  const { action } = req.params;
  const { username, product, duration, key } = req.body;

  // Простейшая авторизация: проверяем секрет-код
  if (req.headers['x-secret-code'] !== SECRET) return res.status(403).json({ error: 'Нет доступа' });

  const u = await pool.query(`SELECT username, purchases, is_admin, is_blocked FROM users WHERE username = $1`, [username]);
  if (!u.rowCount) return res.json({ error: 'Пользователь не найден' });

  const user = u.rows[0];
  let query;
  let params;

  switch (action) {
    case 'give-product':
      query = `UPDATE users SET purchases = array_append(purchases, $2) WHERE username = $1`;
      params = [username, product];
      break;
    case 'give-admin':
      query = `UPDATE users SET is_admin = TRUE WHERE username = $1`;
      params = [username];
      break;
    case 'block-user':
      query = `UPDATE users SET is_blocked = TRUE WHERE username = $1`;
      params = [username];
      break;
    case 'unblock-user':
      query = `UPDATE users SET is_blocked = FALSE WHERE username = $1`;
      params = [username];
      break;
    case 'generate-key':
      const newKey = crypto.randomBytes(6).toString('hex').toUpperCase();
      await pool.query(`
        INSERT INTO activation_keys (key, duration) VALUES ($1, $2)
      `, [newKey, duration]);
      return res.json({ success: true, key: newKey });
    case 'activate-key':
      // активация на клиенте — сюда не нужно
      return res.json({ error: 'недоступно' });
    default:
      return res.json({ error: 'Неизвестное действие' });
  }

  await pool.query(query, params);
  res.json({ success: true });
});

app.listen(PORT, () => console.log('Server on', PORT));
