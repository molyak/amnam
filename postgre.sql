CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uid UUID DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  uid UUID REFERENCES users(uid),
  product TEXT,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE keys (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  product TEXT,
  valid_days INTEGER,
  used_by UUID REFERENCES users(uid),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
