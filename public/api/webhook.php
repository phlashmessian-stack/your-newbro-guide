<?php
/**
 * NeuroBro — FreeKassa "Оповещение о платеже" (Result URL)
 *
 * Настройка в ЛК FreeKassa:
 * - Result URL: https://ВАШ-ДОМЕН/api/webhook.php
 * - Secret word 2: задайте и сохраните в /var/www/<user>/data/config/neurobro.php как FK_SECRET2
 *
 * Реализация: PHP + SQLite (database.sqlite вне webroot)
 */

require_once __DIR__ . '/_util.php';
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_config.php';
require_once __DIR__ . '/_schema.php';

function nb_ss_int(PDO $pdo, string $key, int $def): int {
  try {
    $pdo->exec('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    $stmt = $pdo->prepare('SELECT value FROM site_settings WHERE key=:k LIMIT 1');
    $stmt->execute([':k' => $key]);
    $v = $stmt->fetchColumn();
    if ($v === false || $v === null || $v === '') return $def;
    return (int)$v;
  } catch (Throwable $e) { return $def; }
}

function nb_products(PDO $pdo): array {
  $packSmallTokens = nb_ss_int($pdo, 'pack_small_tokens', 5000);
  $packSmallPrice  = nb_ss_int($pdo, 'pack_small_price', 99);
  $packMedTokens   = nb_ss_int($pdo, 'pack_medium_tokens', 20000);
  $packMedPrice    = nb_ss_int($pdo, 'pack_medium_price', 299);
  $packLargeTokens = nb_ss_int($pdo, 'pack_large_tokens', 50000);
  $packLargePrice  = nb_ss_int($pdo, 'pack_large_price', 699);
  $subLitePrice    = nb_ss_int($pdo, 'sub_lite_price', 299);
  $subProPrice     = nb_ss_int($pdo, 'sub_pro_price', 599);
  $subUltraPrice   = nb_ss_int($pdo, 'sub_ultra_price', 999);

  return [
    'pack_small'  => ['name' => 'Пакет S', 'amount' => $packSmallPrice,  'tokens' => $packSmallTokens,  'type' => 'pack'],
    'pack_medium' => ['name' => 'Пакет M', 'amount' => $packMedPrice,    'tokens' => $packMedTokens,    'type' => 'pack'],
    'pack_large'  => ['name' => 'Пакет L', 'amount' => $packLargePrice,  'tokens' => $packLargeTokens, 'type' => 'pack'],
    'sub_lite'    => ['name' => 'Подписка Lite',  'amount' => $subLitePrice,  'tokens' => 0, 'type' => 'subscription'],
    'sub_pro'     => ['name' => 'Подписка Pro',   'amount' => $subProPrice,   'tokens' => 0, 'type' => 'subscription'],
    'sub_ultra'   => ['name' => 'Подписка Ultra', 'amount' => $subUltraPrice, 'tokens' => 0, 'type' => 'subscription'],
  ];
}

// Accept both POST and GET notifications (some providers allow GET).
// If a user lands here in a browser without provider params, show a friendly page.
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'OPTIONS') { http_response_code(200); exit; }

header('Content-Type: text/plain; charset=utf-8');

$raw = file_get_contents('php://input');
$payload = null;
if ($method === 'GET' && !empty($_GET)) {
  $payload = $_GET;
} else if (!empty($_POST)) {
  $payload = $_POST;
} else {
  $j = json_decode((string)$raw, true);
  if (is_array($j)) $payload = $j;
}

if (!is_array($payload) || count($payload) === 0) {
  header('Content-Type: text/html; charset=utf-8');
  $app = rtrim((string)cfg_get('APP_URL', 'https://neuro-bro.ru'), '/');
  $to = $app . '/dashboard.html?pay=success';
  echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>NeuroBro</title></head><body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b0b12;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px"><div style="max-width:560px;width:100%;background:rgba(22,22,42,0.85);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 18px;text-align:center"><h1 style="margin:0 0 8px;font-size:20px">Платеж обработается автоматически</h1><p style="margin:0 0 14px;color:rgba(255,255,255,0.7);font-size:14px;line-height:1.45">Этот адрес используется для оповещений платежной системы. Если вы видите эту страницу после оплаты, вернитесь в личный кабинет. Начисление токенов обычно занимает 1–2 минуты.</p><a href="' . htmlspecialchars($to, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700">Перейти в кабинет →</a><p style="margin:14px 0 0;color:rgba(255,255,255,0.5);font-size:12px">Если токены не появились, обновите кабинет через 1–2 минуты.</p></div><script>setTimeout(function(){location.href=' . json_encode($to) . ';},1500);</script></body></html>';
  exit;
}

// === YooKassa notifications ===
// We intentionally do not rely on signature headers; instead we verify payment status via YooKassa API.
if (!empty($payload['event']) && !empty($payload['object']) && is_array($payload['object'])) {
  $YK_SHOP_ID = (string)cfg_get('YK_SHOP_ID', '');
  $YK_SECRET_KEY = (string)cfg_get('YK_SECRET_KEY', '');
  if (!$YK_SHOP_ID || !$YK_SECRET_KEY) {
    error_log("YooKassa webhook: missing YK_SHOP_ID/YK_SECRET_KEY");
    echo "OK";
    exit;
  }

  $paymentId = (string)($payload['object']['id'] ?? '');
  if (!$paymentId) { echo "OK"; exit; }

  // Fetch actual payment state from YooKassa.
  $ch = curl_init('https://api.yookassa.ru/v3/payments/' . rawurlencode($paymentId));
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPGET => true,
    CURLOPT_USERPWD => $YK_SHOP_ID . ':' . $YK_SECRET_KEY,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
  ]);
  $raw2 = curl_exec($ch);
  $errno = curl_errno($ch);
  $err = curl_error($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($errno || $http < 200 || $http >= 300) {
    error_log("YooKassa webhook: fetch failed http=" . $http . " err=" . $err);
    echo "OK";
    exit;
  }
  $p = json_decode((string)$raw2, true);
  if (!is_array($p)) { echo "OK"; exit; }

  $status = (string)($p['status'] ?? '');
  $paid = (bool)($p['paid'] ?? false);
  if ($status !== 'succeeded' || !$paid) { echo "OK"; exit; }

  $meta = is_array($p['metadata'] ?? null) ? $p['metadata'] : [];
  $orderId = (string)($meta['order_id'] ?? '');

  try {
    $pdo = db();
    // Ensure tables exist (in case webhook is first touch)
    schema_ensure_profiles($pdo);
    schema_ensure_transactions($pdo);
    schema_ensure_orders($pdo);
    schema_ensure_events($pdo);

    // Locate order: prefer metadata.order_id, fallback to yk_payment_id.
    $pdo->exec('BEGIN IMMEDIATE;');
    if ($orderId !== '') {
      $stmt = $pdo->prepare('SELECT id,user_id,product_id,status FROM orders WHERE id=:id LIMIT 1');
      $stmt->execute([':id' => (int)$orderId]);
    } else {
      $stmt = $pdo->prepare('SELECT id,user_id,product_id,status FROM orders WHERE yk_payment_id=:p LIMIT 1');
      $stmt->execute([':p' => $paymentId]);
    }
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$order) { $pdo->exec('ROLLBACK;'); echo "OK"; exit; }
    if ((int)$order['status'] === 1) { $pdo->exec('COMMIT;'); echo "OK"; exit; }

    $products = nb_products($pdo);
    $productId = (string)$order['product_id'];
    if (!isset($products[$productId])) { $pdo->exec('ROLLBACK;'); echo "OK"; exit; }
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
        ':d' => 'Покупка: ' . $productId . ' (YooKassa ' . $paymentId . ')',
      ]);
      try {
        $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,"purchase",:m)');
        $stmt->execute([':id' => api_uuid4(), ':u' => $userId, ':m' => json_encode(['provider'=>'yookassa','product_id'=>$productId,'payment_id'=>$paymentId], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
      } catch (Throwable $e) { /* ignore */ }
    }
    if ($prod['type'] === 'subscription') {
      $subName = str_replace('sub_', '', $productId);
      $stmt = $pdo->prepare('UPDATE profiles SET subscription = :s WHERE id = :u');
      $stmt->execute([':s' => $subName, ':u' => $userId]);
      try {
        $stmt = $pdo->prepare('UPDATE profiles SET subscription_started_at=CURRENT_TIMESTAMP, subscription_until=datetime(\"now\",\"+30 days\"), subscription_status=\"active\" WHERE id=:u');
        $stmt->execute([':u' => $userId]);
      } catch (Throwable $e) { /* ignore */ }
      $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,0,"subscription",:d)');
      $stmt->execute([
        ':id' => api_uuid4(),
        ':u' => $userId,
        ':d' => 'Подписка: ' . $productId . ' (YooKassa ' . $paymentId . ')',
      ]);
      try {
        $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,"subscription",:m)');
        $stmt->execute([':id' => api_uuid4(), ':u' => $userId, ':m' => json_encode(['provider'=>'yookassa','product_id'=>$productId,'payment_id'=>$paymentId], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
      } catch (Throwable $e) { /* ignore */ }
    }

    $stmt = $pdo->prepare('UPDATE orders SET provider="yookassa", yk_payment_id=:pid, yk_status="succeeded", yk_paid=1, status=1, paid_at=CURRENT_TIMESTAMP WHERE id=:id');
    $stmt->execute([':pid' => $paymentId, ':id' => (int)$order['id']]);

    $pdo->exec('COMMIT;');
  } catch (Throwable $e) {
    try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
    error_log("YooKassa webhook error: " . $e->getMessage());
  }

  echo "OK";
  exit;
}

// === FreeKassa notifications ===
// Optional: allowlist FK IPs (docs list). If hosting is behind reverse proxy, you may need to rely on X-Real-IP.
$enforceIp = (bool)cfg_get('FK_IP_ALLOWLIST', true);
if ($enforceIp) {
  $FK_IPS = [
    '168.119.157.136',
    '168.119.60.227',
    '178.154.197.79',
    '51.250.54.238',
  ];
  $remoteIp = $_SERVER['HTTP_X_REAL_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '');
  if ($remoteIp && filter_var($remoteIp, FILTER_VALIDATE_IP)) {
    if (!in_array($remoteIp, $FK_IPS, true)) {
      // Keep 200 to avoid retries storms, but do not process.
      error_log("FreeKassa webhook: blocked ip=" . $remoteIp);
      echo "NO";
      exit;
    }
  }
}

$secret2 = (string)cfg_get('FK_SECRET2', '');
if (!$secret2) {
  error_log("FreeKassa webhook: FK_SECRET2 missing in config");
  echo "NO";
  exit;
}

$merchantId = (string)($payload['MERCHANT_ID'] ?? '');
$amount = (string)($payload['AMOUNT'] ?? '');
$orderId = (string)($payload['MERCHANT_ORDER_ID'] ?? '');
$sign = (string)($payload['SIGN'] ?? '');
$intid = (string)($payload['intid'] ?? $payload['INTID'] ?? '');

if (!$amount || !$orderId || !$sign) {
  error_log("FreeKassa webhook: missing required fields");
  echo "NO";
  exit;
}

// Signature per docs: md5(MERCHANT_ID:AMOUNT:SECRET2:MERCHANT_ORDER_ID)
$expected = md5($merchantId . ':' . $amount . ':' . $secret2 . ':' . $orderId);
if (!hash_equals(strtolower($expected), strtolower($sign))) {
  error_log("FreeKassa webhook: bad sign order=" . $orderId);
  echo "NO";
  exit;
}

try {
  $pdo = db();

  // Ensure tables exist (in case webhook is first touch)
  schema_ensure_profiles($pdo);
  schema_ensure_transactions($pdo);
  schema_ensure_orders($pdo);
  schema_ensure_events($pdo);
  $products = nb_products($pdo);

  $pdo->exec('BEGIN IMMEDIATE;');

  $stmt = $pdo->prepare('SELECT id,user_id,product_id,amount,status FROM orders WHERE id = :id LIMIT 1');
  $stmt->execute([':id' => (int)$orderId]);
  $order = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$order) {
    $pdo->exec('ROLLBACK;');
    error_log("FreeKassa webhook: order not found id=" . $orderId);
    echo "NO";
    exit;
  }

  if ((int)$order['status'] === 1) {
    // Idempotent: already processed
    $pdo->exec('COMMIT;');
    echo "YES";
    exit;
  }

  $productId = (string)$order['product_id'];
  if (!isset($products[$productId])) {
    $pdo->exec('ROLLBACK;');
    error_log("FreeKassa webhook: unknown product=" . $productId . " order=" . $orderId);
    echo "NO";
    exit;
  }

  $prod = $products[$productId];
  // Amount guard (best-effort, string->float)
  $paid = (float)$amount;
  $expectedAmount = (float)$prod['amount'];
  if ($paid + 0.0001 < $expectedAmount) {
    $pdo->exec('ROLLBACK;');
    error_log("FreeKassa webhook: amount mismatch order=" . $orderId . " paid=" . $amount);
    echo "NO";
    exit;
  }

  $userId = (string)$order['user_id'];

  if ($prod['type'] === 'pack' && (int)$prod['tokens'] > 0) {
    $stmt = $pdo->prepare('UPDATE profiles SET tokens_balance = tokens_balance + :a WHERE id = :u');
    $stmt->execute([':a' => (int)$prod['tokens'], ':u' => $userId]);

    $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,:amt,"purchase",:d)');
    $stmt->execute([
      ':id' => api_uuid4(),
      ':u' => $userId,
      ':amt' => (int)$prod['tokens'],
      ':d' => 'Покупка: ' . $productId . ' (FK intid ' . $intid . ')',
    ]);
    try {
      $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,"purchase",:m)');
      $stmt->execute([':id' => api_uuid4(), ':u' => $userId, ':m' => json_encode(['provider'=>'freekassa','product_id'=>$productId,'order_id'=>(int)$orderId,'intid'=>$intid], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
    } catch (Throwable $e) { /* ignore */ }
  }

  if ($prod['type'] === 'subscription') {
    $subName = str_replace('sub_', '', $productId); // lite, pro, ultra
    $stmt = $pdo->prepare('UPDATE profiles SET subscription = :s WHERE id = :u');
    $stmt->execute([':s' => $subName, ':u' => $userId]);
    // Track subscription window (30 days) and status.
    try {
      $stmt = $pdo->prepare('UPDATE profiles SET subscription_started_at=CURRENT_TIMESTAMP, subscription_until=datetime("now","+30 days"), subscription_status="active" WHERE id=:u');
      $stmt->execute([':u' => $userId]);
    } catch (Throwable $e) { /* ignore */ }
    $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,0,"subscription",:d)');
    $stmt->execute([
      ':id' => api_uuid4(),
      ':u' => $userId,
      ':d' => 'Подписка: ' . $productId . ' (FK intid ' . $intid . ')',
    ]);
    try {
      $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,"subscription",:m)');
      $stmt->execute([':id' => api_uuid4(), ':u' => $userId, ':m' => json_encode(['provider'=>'freekassa','product_id'=>$productId,'order_id'=>(int)$orderId,'intid'=>$intid], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
    } catch (Throwable $e) { /* ignore */ }
  }

  $stmt = $pdo->prepare('UPDATE orders SET status=1, paid_at=CURRENT_TIMESTAMP WHERE id=:id');
  $stmt->execute([':id' => (int)$orderId]);

  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
  error_log("FreeKassa webhook error: " . $e->getMessage());
  echo "NO";
  exit;
}

echo "YES";
