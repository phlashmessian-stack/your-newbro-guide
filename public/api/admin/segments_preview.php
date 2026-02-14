<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$segment = (string)($in['segment'] ?? '');
$limit = (int)($in['limit'] ?? 50);
if ($limit <= 0 || $limit > 200) $limit = 50;

$pdo = db();
schema_ensure_users($pdo);
schema_ensure_profiles($pdo);
schema_ensure_orders($pdo);
schema_ensure_transactions($pdo);

function segment_sql(string $seg): array {
  // Returns [sql, params]
  switch ($seg) {
    case 'never_paid':
      return ['SELECT p.email FROM profiles p WHERE p.email<>"" AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id=p.id AND o.status=1)', []];
    case 'paid_any':
      return ['SELECT DISTINCT p.email FROM profiles p JOIN orders o ON o.user_id=p.id WHERE p.email<>"" AND o.status=1', []];
    case 'paid_tokens':
      return ['SELECT DISTINCT p.email FROM profiles p JOIN token_transactions t ON t.user_id=p.id WHERE p.email<>"" AND t.amount>0 AND t.type="purchase"', []];
    case 'subscribers_active':
      return ['SELECT p.email FROM profiles p WHERE p.email<>"" AND p.subscription IS NOT NULL AND p.subscription<>"" AND COALESCE(p.subscription_status,"")="active"', []];
    case 'subscribers_paused':
      return ['SELECT p.email FROM profiles p WHERE p.email<>"" AND p.subscription IS NOT NULL AND p.subscription<>"" AND COALESCE(p.subscription_status,"")="paused"', []];
    case 'inactive_7':
    case 'inactive_14':
    case 'inactive_30': {
      $d = (int)str_replace('inactive_', '', $seg);
      return ['SELECT p.email FROM profiles p LEFT JOIN users u ON u.id=p.id WHERE p.email<>"" AND (u.last_seen_at IS NULL OR datetime(u.last_seen_at) < datetime("now", :w))', [':w' => '-' . $d . ' days']];
    }
    default:
      return ['', []];
  }
}

[$sql, $params] = segment_sql($segment);
if ($sql === '') api_json(['error' => 'Unknown segment'], 400);

// Count
$countSql = 'SELECT COUNT(*) FROM (' . $sql . ')';
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$count = (int)$stmt->fetchColumn();

// Sample emails
$stmt = $pdo->prepare($sql . ' LIMIT :l');
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$emails = [];
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $e = (string)($r['email'] ?? '');
  if ($e !== '') $emails[] = $e;
}

api_json(['segment' => $segment, 'count' => $count, 'emails' => $emails]);

