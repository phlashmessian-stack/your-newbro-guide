<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$days = (int)($in['days'] ?? 30);
if ($days <= 0 || $days > 365) $days = 30;

$pdo = db();
schema_ensure_users($pdo);
schema_ensure_profiles($pdo);
schema_ensure_orders($pdo);

// Orders summary (paid only)
$stmt = $pdo->prepare('
  SELECT
    COUNT(*) AS cnt,
    COALESCE(SUM(amount),0) AS revenue,
    COALESCE(AVG(amount),0) AS avg_check
  FROM orders
  WHERE status=1 AND created_at >= datetime("now", :w)
');
$stmt->execute([':w' => '-' . $days . ' days']);
$sum = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['cnt'=>0,'revenue'=>0,'avg_check'=>0];

// Paid orders by day
$stmt = $pdo->prepare('
  SELECT
    substr(created_at,1,10) AS day,
    COUNT(*) AS cnt,
    COALESCE(SUM(amount),0) AS revenue
  FROM orders
  WHERE status=1 AND created_at >= datetime("now", :w)
  GROUP BY substr(created_at,1,10)
  ORDER BY day ASC
');
$stmt->execute([':w' => '-' . $days . ' days']);
$byDay = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

// Funnel
$totalUsers = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$signedIn = (int)$pdo->query('SELECT COUNT(*) FROM users WHERE COALESCE(login_count,0) > 0')->fetchColumn();
$purchasers = (int)$pdo->query('SELECT COUNT(DISTINCT user_id) FROM orders WHERE status=1')->fetchColumn();
$subscribers = (int)$pdo->query('SELECT COUNT(*) FROM profiles WHERE subscription IS NOT NULL AND subscription <> ""')->fetchColumn();
$repeat = (int)$pdo->query('SELECT COUNT(*) FROM (SELECT user_id, COUNT(*) c FROM orders WHERE status=1 GROUP BY user_id HAVING c>1)')->fetchColumn();

// Breakdown by provider & method for paid
$stmt = $pdo->prepare('
  SELECT provider, method_i, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS revenue
  FROM orders
  WHERE status=1 AND created_at >= datetime("now", :w)
  GROUP BY provider, method_i
  ORDER BY revenue DESC
');
$stmt->execute([':w' => '-' . $days . ' days']);
$byPay = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

// Breakdown by UTM source/campaign (signups)
$stmt = $pdo->prepare('
  SELECT
    COALESCE(NULLIF(utm_source,""),"(none)") AS utm_source,
    COALESCE(NULLIF(utm_campaign,""),"(none)") AS utm_campaign,
    COUNT(*) AS signups
  FROM profiles
  WHERE created_at >= datetime("now", :w)
  GROUP BY utm_source, utm_campaign
  ORDER BY signups DESC
  LIMIT 50
');
$stmt->execute([':w' => '-' . $days . ' days']);
$byUtm = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

api_json([
  'range_days' => $days,
  'sales' => [
    'paid_orders' => (int)$sum['cnt'],
    'revenue' => (float)$sum['revenue'],
    'avg_check' => (float)$sum['avg_check'],
    'by_day' => $byDay,
    'by_payment' => $byPay,
  ],
  'funnel' => [
    'registrations' => $totalUsers,
    'first_login' => $signedIn,
    'first_purchase' => $purchasers,
    'subscribers' => $subscribers,
    'repeat_purchase' => $repeat,
  ],
  'attribution' => [
    'signups_by_utm' => $byUtm,
  ],
]);

