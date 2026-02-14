<?php
// Admin: delete user completely (free up email for re-registration).
// Deletes from: sessions, user_roles, token_transactions, profiles, users, orders.
// Safety: prevents deleting yourself and prevents deleting the last admin.

require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
$admin = auth_require_admin();

$in = api_read_json();
$userId = trim((string)($in['user_id'] ?? ''));
if (!$userId) api_json(['error' => 'Missing user_id'], 400);
if ($userId === $admin['id']) api_json(['error' => 'You cannot delete your own account from admin panel'], 400);

$pdo = db();

// Ensure base tables exist (may not exist on fresh DB)
$pdo->exec('
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
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
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  UNIQUE (user_id, role)
);
CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT DEFAULT "",
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
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

// Check user exists
$stmt = $pdo->prepare('SELECT id, email FROM users WHERE id = :u LIMIT 1');
$stmt->execute([':u' => $userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) api_json(['error' => 'User not found'], 404);

// Prevent deleting the last admin
$stmt = $pdo->prepare('SELECT 1 FROM user_roles WHERE user_id = :u AND role="admin" LIMIT 1');
$stmt->execute([':u' => $userId]);
$isTargetAdmin = (bool)$stmt->fetchColumn();
if ($isTargetAdmin) {
  $adminsCount = (int)$pdo->query('SELECT COUNT(*) FROM user_roles WHERE role="admin"')->fetchColumn();
  if ($adminsCount <= 1) api_json(['error' => 'Cannot delete the last admin'], 400);
}

try {
  $pdo->exec('BEGIN IMMEDIATE;');

  $stmt = $pdo->prepare('DELETE FROM sessions WHERE user_id = :u');
  $stmt->execute([':u' => $userId]);

  $stmt = $pdo->prepare('DELETE FROM user_roles WHERE user_id = :u');
  $stmt->execute([':u' => $userId]);

  $stmt = $pdo->prepare('DELETE FROM token_transactions WHERE user_id = :u');
  $stmt->execute([':u' => $userId]);

  $stmt = $pdo->prepare('DELETE FROM orders WHERE user_id = :u');
  $stmt->execute([':u' => $userId]);

  // Also clear referrals pointing to this user (optional cleanup)
  $stmt = $pdo->prepare('UPDATE profiles SET referred_by = NULL WHERE referred_by = :u');
  $stmt->execute([':u' => $userId]);

  $stmt = $pdo->prepare('DELETE FROM profiles WHERE id = :u');
  $stmt->execute([':u' => $userId]);

  $stmt = $pdo->prepare('DELETE FROM users WHERE id = :u');
  $stmt->execute([':u' => $userId]);

  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
  api_json(['error' => 'Delete failed', 'detail' => $e->getMessage()], 500);
}

api_json(['ok' => true, 'deleted_user_id' => $userId, 'deleted_email' => $row['email']]);

