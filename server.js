const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'amnam',
  password: 'your_password', // ← замени на свой
  port: 5432,
});

// ==================== USER ====================

// Регистрация
app.post('/api/register', async (req, res) => {
  const { nickname, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const existing = await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
  if (existing.rows.length) return res.status(409).json({ error: 'Пользователь уже существует' });

  const result = await pool.query(
    'INSERT INTO users (uid, nickname, password) VALUES ($1, $2, $3) RETURNING uid, nickname',
    [uuidv4(), nickname, hashed]
  );
  res.json(result.rows[0]);
});

// Вход
app.post('/api/login', async (req, res) => {
  const { nickname, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
  if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(403).json({ error: 'Неверный пароль' });

  if (user.banned) return res.status(403).json({ error: 'Вы заблокированы' });

  res.json({ uid: user.uid, nickname: user.nickname, is_admin: user.is_admin });
});

// Профиль
app.get('/api/profile/:uid', async (req, res) => {
  const { uid } = req.params;
  const user = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
  if (!user.rows.length) return res.status(404).json({ error: 'Профиль не найден' });

  const purchases = await pool.query('SELECT * FROM purchases WHERE uid = $1', [uid]);
  res.json({ user: user.rows[0], purchases: purchases.rows });
});

// ==================== ADMIN ====================

// Выдать админку
app.post('/admin/give-admin', async (req, res) => {
  const { nickname } = req.body;
  const result = await pool.query('UPDATE users SET is_admin = TRUE WHERE nickname = $1 RETURNING uid', [nickname]);
  if (!result.rowCount) return res.status(404).json({ message: 'Пользователь не найден' });
  res.json({ message: `Админка выдана ${nickname}` });
});

// Сгенерировать ключ
app.post('/admin/generate-key', async (req, res) => {
  const { product, days } = req.body;
  const key = uuidv4().replace(/-/g, '').slice(0, 16);

  await pool.query(
    'INSERT INTO keys (key, product, valid_days) VALUES ($1, $2, $3)',
    [key, product, days]
  );
  res.json({ key });
});

// Выдать товар
app.post('/admin/give-product', async (req, res) => {
  const { uid, product } = req.body;
  const purchased_at = new Date();
  const expires_at = null; // бессрочно

  await pool.query(
    'INSERT INTO purchases (uid, product, purchased_at, expires_at) VALUES ($1, $2, $3, $4)',
    [uid, product, purchased_at, expires_at]
  );
  res.json({ message: `Товар ${product} выдан UID: ${uid}` });
});

// Заблокировать пользователя
app.post('/admin/ban', async (req, res) => {
  const { nickname } = req.body;
  const result = await pool.query('UPDATE users SET banned = TRUE WHERE nickname = $1', [nickname]);
  if (!result.rowCount) return res.status(404).json({ message: 'Пользователь не найден' });
  res.json({ message: `${nickname} заблокирован` });
});

// ==================== START ====================
app.listen(3000, () => {
  console.log('✅ Сервер запущен: http://localhost:3000');
});
