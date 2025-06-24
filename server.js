const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const USERS_PATH = './data/users.json';
const KEYS_PATH = './data/keys.json';
const PURCHASES_PATH = './data/purchases.json';

// ====== UTILS ======
const readJSON = (path) => JSON.parse(fs.existsSync(path) ? fs.readFileSync(path) : '[]');
const writeJSON = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2));

// ====== REGISTER ======
app.post('/api/register', async (req, res) => {
  const users = readJSON(USERS_PATH);
  const { nickname, password } = req.body;
  if (users.find(u => u.nickname === nickname)) return res.status(409).json({ error: 'Пользователь уже существует' });
  const hashed = await bcrypt.hash(password, 10);
  const user = { uid: uuidv4(), nickname, password: hashed, is_admin: false, banned: false, registered_at: new Date().toISOString() };
  users.push(user);
  writeJSON(USERS_PATH, users);
  res.json({ uid: user.uid, nickname: user.nickname, is_admin: false });
});

// ====== LOGIN ======
app.post('/api/login', async (req, res) => {
  const users = readJSON(USERS_PATH);
  const { nickname, password } = req.body;
  const user = users.find(u => u.nickname === nickname);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.banned) return res.status(403).json({ error: 'Вы заблокированы' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(403).json({ error: 'Неверный пароль' });
  res.json({ uid: user.uid, nickname: user.nickname, is_admin: user.is_admin });
});

// ====== PROFILE ======
app.get('/api/profile/:uid', (req, res) => {
  const users = readJSON(USERS_PATH);
  const purchases = readJSON(PURCHASES_PATH);
  const user = users.find(u => u.uid === req.params.uid);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const userPurchases = purchases.filter(p => p.uid === user.uid);
  res.json({ user, purchases: userPurchases });
});

// ====== ACTIVATE KEY ======
app.post('/api/activate-key', (req, res) => {
  const keys = readJSON(KEYS_PATH);
  const users = readJSON(USERS_PATH);
  const purchases = readJSON(PURCHASES_PATH);
  const { key, uid } = req.body;
  const foundKey = keys.find(k => k.key === key && !k.used_by);
  if (!foundKey) return res.status(400).json({ error: 'Ключ недействителен или уже использован' });

  const product = foundKey.product || 'Товар';
  purchases.push({ uid, product, purchased_at: new Date().toISOString(), expires_at: null });
  foundKey.used_by = uid;
  writeJSON(PURCHASES_PATH, purchases);
  writeJSON(KEYS_PATH, keys);
  res.json({ message: 'Ключ активирован' });
});

// ====== ADMIN: GIVE ADMIN ======
app.post('/admin/give-admin', (req, res) => {
  const users = readJSON(USERS_PATH);
  const user = users.find(u => u.nickname === req.body.nickname);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  user.is_admin = true;
  writeJSON(USERS_PATH, users);
  res.json({ message: 'Админка выдана' });
});

// ====== ADMIN: GENERATE KEY ======
app.post('/admin/generate-key', (req, res) => {
  const keys = readJSON(KEYS_PATH);
  const { product, days } = req.body;
  const key = uuidv4().replace(/-/g, '').slice(0, 16);
  keys.push({ key, product, valid_days: days, created_at: new Date().toISOString(), used_by: null });
  writeJSON(KEYS_PATH, keys);
  res.json({ key });
});

// ====== ADMIN: GIVE PRODUCT ======
app.post('/admin/give-product', (req, res) => {
  const purchases = readJSON(PURCHASES_PATH);
  const { uid, product } = req.body;
  purchases.push({ uid, product, purchased_at: new Date().toISOString(), expires_at: null });
  writeJSON(PURCHASES_PATH, purchases);
  res.json({ message: 'Товар выдан' });
});

// ====== ADMIN: BAN USER ======
app.post('/admin/ban', (req, res) => {
  const users = readJSON(USERS_PATH);
  const user = users.find(u => u.nickname === req.body.nickname);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  user.banned = true;
  writeJSON(USERS_PATH, users);
  res.json({ message: 'Пользователь забанен' });
});

// ====== SERVER START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
