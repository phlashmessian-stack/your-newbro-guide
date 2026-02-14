<?php
// Admin: manually reconcile/apply an order if webhook was missed.
// This checks provider API before applying.

require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_config.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$orderId = (int)($in['order_id'] ?? 0);
if ($orderId <= 0) api_json(['error' => 'Missing order_id'], 400);

$products = [
  'pack_small'  => ['amount' => 99,  'tokens' => 5000,  'type' => 'pack'],
  'pack_medium' => ['amount' => 299, 'tokens' => 20000, 'type' => 'pack'],
  'pack_large'  => ['amount' => 699, 'tokens' => 50000, 'type' => 'pack'],
  'sub_lite'    => ['amount' => 299, 'tokens' => 0, 'type' => 'subscription'],
  'sub_pro'     => ['amount' => 599, 'tokens' => 0, 'type' => 'subscription'],
  'sub_ultra'   => ['amount' => 999, 'tokens' => 0, 'type' => 'subscription'],
];

$pdo = db();
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

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id=:id LIMIT 1');
$stmt->execute([':id' => $orderId]);
$order = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$order) api_json(['error' => 'Order not found'], 404);
if ((int)$order['status'] === 1) api_json(['ok' => true, 'already_paid' => true]);

$provider = strtolower((string)($order['provider'] ?? 'freekassa'));
$productId = (string)$order['product_id'];
if (!isset($products[$productId])) api_json(['error' => 'Unknown product'], 400);

$paid = false;
$providerInfo = null;

if ($provider === 'yookassa') {
  $YK_SHOP_ID = (string)cfg_get('YK_SHOP_ID', '');
  $YK_SECRET_KEY = (string)cfg_get('YK_SECRET_KEY', '');
  $paymentId = (string)($order['yk_payment_id'] ?? '');
  if (!$YK_SHOP_ID || !$YK_SECRET_KEY || !$paymentId) api_json(['error' => 'YooKassa is not configured for this order'], 400);

  $ch = curl_init('https://api.yookassa.ru/v3/payments/' . rawurlencode($paymentId));
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPGET => true,
    CURLOPT_USERPWD => $YK_SHOP_ID . ':' . $YK_SECRET_KEY,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
  ]);
  $raw = curl_exec($ch);
  $errno = curl_errno($ch);
  $err = curl_error($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($errno || $http < 200 || $http >= 300) api_json(['error' => 'YooKassa check failed', 'status' => $http, 'detail' => $err, 'response' => $raw], 502);
  $p = json_decode((string)$raw, true);
  $paid = (is_array($p) && (($p['status'] ?? '') === 'succeeded') && !empty($p['paid']));
  $providerInfo = $p;
}

if ($provider === 'freekassa') {
  $FK_SHOP_ID = (int)cfg_get('FK_SHOP_ID', 0);
  $FK_API_KEY = (string)cfg_get('FK_API_KEY', '');
  if ($FK_SHOP_ID <= 0 || !$FK_API_KEY) api_json(['error' => 'FreeKassa is not configured'], 500);

  // Check order status via FreeKassa API (fk.life v1): POST /orders
  // Docs mention ability to request by paymentId and get status.
  $data = [
    'shopId' => $FK_SHOP_ID,
    'nonce' => (int)floor(microtime(true) * 1000),
    'paymentId' => (string)$orderId,
  ];
  ksort($data);
  $data['signature'] = hash_hmac('sha256', implode('|', $data), $FK_API_KEY);

  $ch = curl_init('https://api.fk.life/v1/orders');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
  ]);
  $raw = curl_exec($ch);
  $errno = curl_errno($ch);
  $err = curl_error($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($errno || $http < 200 || $http >= 300) {
    api_json(['error' => 'FreeKassa check failed', 'status' => $http, 'detail' => $err, 'response' => $raw], 502);
  }
  $resp = json_decode((string)$raw, true);
  $providerInfo = $resp;
  if (is_array($resp) && ($resp['type'] ?? '') === 'success') {
    $items = $resp['orders'] ?? [];
    if (!is_array($items)) $items = [];
    foreach ($items as $it) {
      if (!is_array($it)) continue;
      $pid = (string)($it['merchant_order_id'] ?? $it['paymentId'] ?? $it['MERCHANT_ORDER_ID'] ?? '');
      if ($pid !== (string)$orderId) continue;
      $st = $it['status'] ?? $it['Status'] ?? null;
      // Most common: status=1 means paid.
      $paid = ((string)$st === '1' || (string)$st === 'paid' || (string)$st === 'success' || (string)$st === 'completed');
      break;
    }
  }
}

if (!$paid) api_json(['ok' => false, 'paid' => false, 'provider' => $provider, 'provider_info' => $providerInfo]);

try {
  $pdo->exec('BEGIN IMMEDIATE;');

  $prod = $products[$productId];
  $userId = (string)$order['user_id'];

  if ($prod['type'] === 'pack' && (int)$prod['tokens'] > 0) {
    $stmt = $pdo->prepare('UPDATE profiles SET tokens_balance = tokens_balance + :a WHERE id = :u');
    $stmt->execute([':a' => (int)$prod['tokens'], ':u' => $userId]);

    $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,:amt,"purchase",:d)');
    $stmt->execute([
      ':id' => api_uuid4(),
      ':u' => $userId,
      ':amt' => (int)$prod['tokens'],
      ':d' => 'Покупка (ручная проверка): ' . $productId . ' #' . $orderId,
    ]);
  }

  if ($prod['type'] === 'subscription') {
    $subName = str_replace('sub_', '', $productId);
    $stmt = $pdo->prepare('UPDATE profiles SET subscription = :s WHERE id = :u');
    $stmt->execute([':s' => $subName, ':u' => $userId]);
    $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,0,"subscription",:d)');
    $stmt->execute([
      ':id' => api_uuid4(),
      ':u' => $userId,
      ':d' => 'Подписка (ручная проверка): ' . $productId . ' #' . $orderId,
    ]);
  }

  $stmt = $pdo->prepare('UPDATE orders SET status=1, paid_at=CURRENT_TIMESTAMP WHERE id=:id');
  $stmt->execute([':id' => $orderId]);

  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
  api_json(['error' => 'Apply failed', 'detail' => $e->getMessage()], 500);
}

api_json(['ok' => true, 'paid' => true, 'provider' => $provider]);
