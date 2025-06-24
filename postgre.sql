-- Расширение UUID (если не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uid UUID DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  banned BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PURCHASES
DROP TABLE IF EXISTS purchases;
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  uid UUID REFERENCES users(uid),
  product TEXT NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- KEYS
DROP TABLE IF EXISTS keys;
CREATE TABLE keys (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  product TEXT,
  valid_days INTEGER,
  used_by UUID REFERENCES users(uid),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставим пользователя amnam с хешем пароля "adminpass"
INSERT INTO users (uid, nickname, password, is_admin)
VALUES (
  uuid_generate_v4(),
  'amnam',
  '$2a$10$KIX1A9duhU2TUzAo9oXKIu8cncCw1Z7I2MdGfO/S.VUpiMS/NqYuq',
  TRUE
);
