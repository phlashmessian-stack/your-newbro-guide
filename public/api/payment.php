<?php
/**
 * NeuroBro — FreeKassa API: создание заказа и получение ссылки оплаты
 *
 * ИНСТРУКЦИЯ:
 * 1) В кабинете FreeKassa возьмите:
 *    - ID кассы (shopId)
 *    - API key (для подписи запросов API)
 * 2) Укажите URL оповещения (Result URL) на:
 *    https://ВАШ-ДОМЕН/api/webhook.php
 * 3) Задайте "Секретное слово 2" (нужно для проверки SIGN в webhook) и сохраните его в конфиге.
 */

require_once __DIR__ . '/_util.php';
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_config.php';
require_once __DIR__ . '/_schema.php';

api_cors();
api_require_post();

$u = auth_require_user();

function ensure_orders_schema(PDO $pdo) {
    // Create base table if missing. Avoid creating indexes here: on old schemas
    // some columns may not exist yet and index creation would throw (500).
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

    // If table existed before, add missing columns.
    $cols = [];
    foreach ($pdo->query('PRAGMA table_info(orders)')->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $cols[(string)$r['name']] = true;
    }
    $adds = [
        'provider TEXT NOT NULL DEFAULT "freekassa"',
        'yk_payment_id TEXT',
        'yk_status TEXT',
        'yk_paid INTEGER',
    ];
    foreach ($adds as $def) {
        $name = trim(explode(' ', $def)[0]);
        if (!isset($cols[$name])) {
            try { $pdo->exec('ALTER TABLE orders ADD COLUMN ' . $def); } catch (Throwable $e) { /* ignore */ }
        }
    }

    // Create indexes after columns are ensured.
    foreach ([
        'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
        'CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider)',
        'CREATE INDEX IF NOT EXISTS idx_orders_yk_payment_id ON orders(yk_payment_id)',
    ] as $sql) {
        try { $pdo->exec($sql); } catch (Throwable $e) { /* ignore */ }
    }
}

// Products (must match frontend prices for now)
function ss_int(PDO $pdo, string $key, int $def): int {
    try {
        $pdo->exec('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
        $stmt = $pdo->prepare('SELECT value FROM site_settings WHERE key=:k LIMIT 1');
        $stmt->execute([':k' => $key]);
        $v = $stmt->fetchColumn();
        if ($v === false || $v === null || $v === '') return $def;
        return (int)$v;
    } catch (Throwable $e) { return $def; }
}

$pdo = db();
// Newer installs use shared schema helper; keep local helper for compatibility.
schema_ensure_orders($pdo);
ensure_orders_schema($pdo);

$packSmallTokens = ss_int($pdo, 'pack_small_tokens', 5000);
$packSmallPrice  = ss_int($pdo, 'pack_small_price', 99);
$packMedTokens   = ss_int($pdo, 'pack_medium_tokens', 20000);
$packMedPrice    = ss_int($pdo, 'pack_medium_price', 299);
$packLargeTokens = ss_int($pdo, 'pack_large_tokens', 50000);
$packLargePrice  = ss_int($pdo, 'pack_large_price', 699);
$subLitePrice    = ss_int($pdo, 'sub_lite_price', 299);
$subProPrice     = ss_int($pdo, 'sub_pro_price', 599);
$subUltraPrice   = ss_int($pdo, 'sub_ultra_price', 999);

// Products (editable in admin -> Настройки)
$products = [
    'pack_small'  => ['name' => number_format($packSmallTokens, 0, '.', ' ') . ' токенов',  'amount' => $packSmallPrice,  'tokens' => $packSmallTokens,  'type' => 'pack'],
    'pack_medium' => ['name' => number_format($packMedTokens, 0, '.', ' ') . ' токенов',   'amount' => $packMedPrice,    'tokens' => $packMedTokens,    'type' => 'pack'],
    'pack_large'  => ['name' => number_format($packLargeTokens, 0, '.', ' ') . ' токенов', 'amount' => $packLargePrice,  'tokens' => $packLargeTokens, 'type' => 'pack'],
    'sub_lite'    => ['name' => 'Подписка Lite',   'amount' => $subLitePrice,  'tokens' => 0, 'type' => 'subscription'],
    'sub_pro'     => ['name' => 'Подписка Pro',    'amount' => $subProPrice,   'tokens' => 0, 'type' => 'subscription'],
    'sub_ultra'   => ['name' => 'Подписка Ultra',  'amount' => $subUltraPrice, 'tokens' => 0, 'type' => 'subscription'],
];

$input = api_read_json();
$productId = (string)($input['product_id'] ?? '');
$userId    = (string)($input['user_id'] ?? '');
$userEmail = (string)($input['email'] ?? '');
$methodI   = (int)($input['i'] ?? 44); // 44=SBP QR, 36=cards РФ, 43=SberPay
$provider  = (string)($input['provider'] ?? cfg_get('PAY_PROVIDER', 'freekassa')); // freekassa|yookassa

if (!$productId || !$userId || !$userEmail) {
    api_json(['success' => false, 'error' => 'Missing product_id, user_id or email'], 400);
}

if (!isset($products[$productId])) {
    api_json(['success' => false, 'error' => 'Unknown product: ' . $productId], 400);
}

$userId = trim($userId);
if ($userId !== $u['id']) api_json(['success' => false, 'error' => 'Forbidden'], 403);
if (!filter_var($userEmail, FILTER_VALIDATE_EMAIL)) api_json(['success' => false, 'error' => 'Invalid email'], 400);
if (!in_array($methodI, [44, 36, 43], true)) $methodI = 44;
$provider = strtolower(trim($provider));
if (!in_array($provider, ['freekassa', 'yookassa'], true)) $provider = 'freekassa';

$product = $products[$productId];

// Determine IP (best-effort)
$ip = $_SERVER['HTTP_X_REAL_IP'] ?? '';
if (!$ip && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ip = trim(explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
}
if (!$ip) $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
if (!$ip) $ip = '127.0.0.1';

$stmt = $pdo->prepare('INSERT INTO orders(user_id,email,ip,product_id,amount,currency,method_i,status) VALUES (:u,:e,:ip,:p,:a,:c,:i,0)');
$stmt->execute([
    ':u' => $userId,
    ':e' => $userEmail,
    ':ip' => $ip,
    ':p' => $productId,
    ':a' => $product['amount'],
    ':c' => 'RUB',
    ':i' => $methodI,
]);
$paymentId = (int)$pdo->lastInsertId(); // our internal order id, used as FreeKassa paymentId

if ($provider === 'yookassa') {
    $YK_SHOP_ID = (string)cfg_get('YK_SHOP_ID', '');
    $YK_SECRET_KEY = (string)cfg_get('YK_SECRET_KEY', '');
    if (!$YK_SHOP_ID || !$YK_SECRET_KEY) {
        api_json(['success' => false, 'error' => 'Payment is not configured (YK_SHOP_ID/YK_SECRET_KEY missing)'], 500);
    }

    $returnUrl = (string)cfg_get('APP_URL', '') ?: (($_SERVER['REQUEST_SCHEME'] ?? 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? ''));
    $returnUrl = rtrim($returnUrl, '/') . '/dashboard.html';

    $payload = [
        'amount' => ['value' => number_format((float)$product['amount'], 2, '.', ''), 'currency' => 'RUB'],
        'capture' => true,
        'confirmation' => ['type' => 'redirect', 'return_url' => $returnUrl],
        'description' => 'NeuroBro: ' . $productId . ' #' . $paymentId,
        'metadata' => [
            'order_id' => (string)$paymentId,
            'product_id' => $productId,
            'user_id' => $userId,
        ],
    ];

    $idem = api_uuid4();
    $ch = curl_init('https://api.yookassa.ru/v3/payments');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Idempotence-Key: ' . $idem,
        ],
        CURLOPT_USERPWD => $YK_SHOP_ID . ':' . $YK_SECRET_KEY,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $raw = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        api_json(['success' => false, 'error' => 'Payment gateway error', 'detail' => $err, 'curl_errno' => $errno], 502);
    }
    if ($http < 200 || $http >= 300) {
        api_json(['success' => false, 'error' => 'Payment gateway error', 'status' => $http, 'response' => $raw], 502);
    }

    $resp = json_decode((string)$raw, true);
    $payId = (string)($resp['id'] ?? '');
    $confirmUrl = (string)($resp['confirmation']['confirmation_url'] ?? '');
    if (!$payId || !$confirmUrl) {
        api_json(['success' => false, 'error' => 'Payment gateway error', 'response' => $resp ?: $raw], 502);
    }

    try {
        $stmt = $pdo->prepare('UPDATE orders SET provider="yookassa", yk_payment_id=:pid, yk_status=:st, yk_paid=:pd WHERE id=:id');
        $stmt->execute([
            ':pid' => $payId,
            ':st' => (string)($resp['status'] ?? ''),
            ':pd' => (int)(($resp['paid'] ?? false) ? 1 : 0),
            ':id' => $paymentId,
        ]);
    } catch (Throwable $e) { /* ignore */ }

    api_json([
        'success' => true,
        'provider' => 'yookassa',
        'location' => $confirmUrl,
        'payment_id' => $paymentId,
        'yookassa_payment_id' => $payId,
    ]);
}

// Default: FreeKassa
$FK_SHOP_ID = (int)cfg_get('FK_SHOP_ID', 0);
$FK_API_KEY = (string)cfg_get('FK_API_KEY', '');
if ($FK_SHOP_ID <= 0 || !$FK_API_KEY) {
    api_json(['success' => false, 'error' => 'Payment is not configured (FK_SHOP_ID/FK_API_KEY missing)'], 500);
}

// Build FreeKassa API request
$data = [
    'shopId'    => $FK_SHOP_ID,
    // docs: "nonce must always be greater than previous". ms epoch is good enough.
    'nonce'     => (int)floor(microtime(true) * 1000),
    'paymentId' => (string)$paymentId,
    'i'         => $methodI,
    'email'     => $userEmail,
    'ip'        => $ip,
    'amount'    => $product['amount'],
    'currency'  => 'RUB',
];
ksort($data);
$data['signature'] = hash_hmac('sha256', implode('|', $data), $FK_API_KEY);

$ch = curl_init('https://api.fk.life/v1/orders/create');
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

if ($errno) {
    api_json(['success' => false, 'error' => 'Payment gateway error', 'detail' => $err, 'curl_errno' => $errno], 502);
}
if ($http < 200 || $http >= 300) {
    api_json(['success' => false, 'error' => 'Payment gateway error', 'status' => $http, 'response' => $raw], 502);
}

$resp = json_decode((string)$raw, true);
if (!is_array($resp) || ($resp['type'] ?? '') !== 'success' || empty($resp['location'])) {
    api_json(['success' => false, 'error' => 'Payment gateway error', 'response' => $resp ?: $raw], 502);
}

// Persist FK order meta
try {
    $stmt = $pdo->prepare('UPDATE orders SET provider="freekassa", fk_order_id=:oid, fk_order_hash=:h WHERE id=:id');
    $stmt->execute([
        ':oid' => (int)($resp['orderId'] ?? 0),
        ':h' => (string)($resp['orderHash'] ?? ''),
        ':id' => $paymentId,
    ]);
} catch (Throwable $e) { /* non-fatal */ }

api_json([
    'success' => true,
    'provider' => 'freekassa',
    'location' => (string)$resp['location'],
    'payment_id' => $paymentId,
    'fk_order_id' => (int)($resp['orderId'] ?? 0),
]);
