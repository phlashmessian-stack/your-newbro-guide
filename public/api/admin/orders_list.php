<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$limit = (int)($in['limit'] ?? 200);
if ($limit <= 0 || $limit > 500) $limit = 200;

$pdo = db();

// Ensure orders table exists (older installs may not have it yet).
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

$stmt = $pdo->prepare('
  SELECT
    o.id, o.provider, o.user_id, o.email, o.ip, o.product_id, o.amount, o.currency, o.method_i,
    o.fk_order_id, o.fk_order_hash, o.yk_payment_id, o.yk_status, o.yk_paid,
    o.status, o.created_at, o.paid_at,
    p.email AS profile_email
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.user_id
  ORDER BY datetime(o.created_at) DESC
  LIMIT :l
');
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();

$rows = [];
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $rows[] = [
    'id' => (int)$r['id'],
    'provider' => $r['provider'] ?: 'freekassa',
    'user_id' => $r['user_id'],
    'email' => $r['email'],
    'ip' => $r['ip'],
    'product_id' => $r['product_id'],
    'amount' => (float)$r['amount'],
    'currency' => $r['currency'],
    'method_i' => (int)$r['method_i'],
    'fk_order_id' => $r['fk_order_id'] !== null ? (int)$r['fk_order_id'] : null,
    'fk_order_hash' => $r['fk_order_hash'],
    'yk_payment_id' => $r['yk_payment_id'],
    'yk_status' => $r['yk_status'],
    'yk_paid' => $r['yk_paid'] !== null ? (int)$r['yk_paid'] : null,
    'status' => (int)$r['status'],
    'created_at' => $r['created_at'],
    'paid_at' => $r['paid_at'],
    'profiles' => $r['profile_email'] ? ['email' => $r['profile_email']] : null,
  ];
}

api_json(['orders' => $rows]);

