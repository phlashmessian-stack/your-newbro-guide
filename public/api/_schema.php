<?php
// Lightweight schema migrations for SQLite (shared-hosting friendly).

function schema_table_cols(PDO $pdo, $table) {
  $cols = [];
  try {
    $stmt = $pdo->query('PRAGMA table_info(' . $table . ')');
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
      $cols[(string)$r['name']] = true;
    }
  } catch (Throwable $e) { /* ignore */ }
  return $cols;
}

function schema_add_col(PDO $pdo, $table, $def) {
  $name = trim(explode(' ', trim($def))[0]);
  $cols = schema_table_cols($pdo, $table);
  if (isset($cols[$name])) return;
  try { $pdo->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $def); } catch (Throwable $e) { /* ignore */ }
}

function schema_ensure_users(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
');
  // Add columns for analytics/anti-fraud.
  foreach ([
    'signup_ip TEXT',
    'last_login_at TEXT',
    'last_login_ip TEXT',
    'last_seen_at TEXT',
    'login_count INTEGER DEFAULT 0',
    'is_banned INTEGER DEFAULT 0',
    'ban_reason TEXT',
    'banned_at TEXT',
  ] as $def) schema_add_col($pdo, 'users', $def);
}

function schema_ensure_sessions(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
');
}

function schema_ensure_profiles(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tokens_balance INTEGER DEFAULT 100,
  subscription TEXT DEFAULT NULL,
  referral_code TEXT UNIQUE,
  referred_by TEXT DEFAULT NULL,
  last_daily_bonus TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
');
  foreach ([
    'utm_source TEXT',
    'utm_medium TEXT',
    'utm_campaign TEXT',
    'utm_content TEXT',
    'utm_term TEXT',
    'landing_path TEXT',
    'referrer TEXT',
    'subscription_started_at TEXT',
    'subscription_until TEXT',
    'subscription_status TEXT DEFAULT "inactive"',
  ] as $def) schema_add_col($pdo, 'profiles', $def);
}

function schema_ensure_roles(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  UNIQUE (user_id, role)
);
');
}

function schema_ensure_transactions(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT DEFAULT "",
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
');
}

function schema_ensure_orders(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT "freekassa",
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  product_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  method_i INTEGER NOT NULL,
  fk_order_id INTEGER,
  fk_order_hash TEXT,
  yk_payment_id TEXT,
  yk_status TEXT,
  yk_paid INTEGER,
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);
');
  foreach ([
    'provider TEXT NOT NULL DEFAULT "freekassa"',
    'yk_payment_id TEXT',
    'yk_status TEXT',
    'yk_paid INTEGER',
  ] as $def) schema_add_col($pdo, 'orders', $def);
  foreach ([
    'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider)',
    'CREATE INDEX IF NOT EXISTS idx_orders_yk_payment_id ON orders(yk_payment_id)',
  ] as $sql) { try { $pdo->exec($sql); } catch (Throwable $e) {} }
}

function schema_ensure_events(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS user_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event TEXT NOT NULL,
  meta_json TEXT DEFAULT "{}",
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON user_events(event);
');
}

function schema_ensure_templates(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
');
}

function schema_ensure_tickets(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT "open",
  priority TEXT NOT NULL DEFAULT "normal",
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  author TEXT NOT NULL, -- "user" | "admin"
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
');
}

function schema_ensure_subscription_history(PDO $pdo) {
  $pdo->exec('
CREATE TABLE IF NOT EXISTS subscription_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL, -- admin user id (or "system")
  action TEXT NOT NULL,   -- pause|resume|extend_days|set_plan|clear
  meta_json TEXT DEFAULT "{}",
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sub_hist_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_hist_created_at ON subscription_history(created_at);
');
}

function schema_ensure_rate_limits(PDO $pdo) {
  // Simple persistent limiter (per key + window). Safe for shared-hosting, low QPS.
  $pdo->exec('
CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT PRIMARY KEY,
  cnt INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
');
}
