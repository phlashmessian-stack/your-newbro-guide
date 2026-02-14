<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$pdo = db();
schema_ensure_users($pdo);
schema_ensure_orders($pdo);

// Top signup IPs
$ips = [];
try {
  $stmt = $pdo->query('
    SELECT signup_ip AS ip, COUNT(*) AS signups,
      SUM(CASE WHEN COALESCE(login_count,0) > 0 THEN 1 ELSE 0 END) AS logged_in
    FROM users
    WHERE signup_ip IS NOT NULL AND signup_ip <> ""
    GROUP BY signup_ip
    HAVING COUNT(*) >= 3
    ORDER BY signups DESC
    LIMIT 50
  ');
  $ips = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) { /* ignore */ }

// Recent orders by IP (for abuse spotting)
$ordersByIp = [];
try {
  $stmt = $pdo->query('
    SELECT ip, COUNT(*) AS orders, SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS paid
    FROM orders
    WHERE ip IS NOT NULL AND ip <> ""
    GROUP BY ip
    HAVING COUNT(*) >= 5
    ORDER BY orders DESC
    LIMIT 50
  ');
  $ordersByIp = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) { /* ignore */ }

// Banned users
$banned = [];
try {
  $stmt = $pdo->query('SELECT id,email,ban_reason,banned_at,signup_ip,last_login_at,last_seen_at,login_count FROM users WHERE COALESCE(is_banned,0)=1 ORDER BY datetime(banned_at) DESC LIMIT 200');
  $banned = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) { /* ignore */ }

api_json([
  'signup_ips' => $ips,
  'orders_by_ip' => $ordersByIp,
  'banned' => $banned,
]);

