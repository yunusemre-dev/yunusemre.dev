PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  takeover INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'ai', 'human', 'presence')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  client_ip TEXT
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_id
ON messages(conversation_id, id);

CREATE TABLE IF NOT EXISTS conversation_visitors (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  looked_up_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operator_presence (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (conversation_id, session_id)
);

CREATE INDEX IF NOT EXISTS operator_presence_last_seen
ON operator_presence(last_seen);

CREATE TABLE IF NOT EXISTS operator_presence_state (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS operator_typing (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  expires_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS visitor_typing (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  expires_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  subscription_json TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS used_bot_challenges (
  nonce TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  used_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  caption TEXT NOT NULL DEFAULT '',
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  like_offset INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS photo_likes (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (photo_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
