const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'amnam',
  password: 'твой_пароль',
  port: 5432
});

// Регистрация
app.post('/api/register', async (req, res) => {
  const { nickname, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const existing = await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
  if (existing.rows.length) return res.status(409).json({ error: 'Пользователь уже существует' });

  const result = await pool.query(
    'INSERT INTO users (nickname, password) VALUES ($1, $2) RETURNING uid, nickname',
    [nickname, hashed]
  );
  res.json(result.rows[0]);
});

// Вход
app.post('/api/login', async (req, res) => {
  const { nickname, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
  if (!result.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });

  const valid = await bcrypt.compare(password, result.rows[0].password);
  if (!valid) return res.status(403).json({ error: 'Неверный пароль' });

  const { uid, is_admin } = result.rows[0];
  res.json({ uid, nickname, is_admin });
});

// Получение профиля
app.get('/api/profile/:uid', async (req, res) => {
  const uid = req.params.uid;
  const user = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);
  const purchases = await pool.query('SELECT * FROM purchases WHERE uid = $1', [uid]);
  if (!user.rows.length) return res.status(404).json({ error: 'Профиль не найден' });

  res.json({
    user: user.rows[0],
    purchases: purchases.rows
  });
});

app.listen(3000, () => console.log('API запущен на http://localhost:3000'));
