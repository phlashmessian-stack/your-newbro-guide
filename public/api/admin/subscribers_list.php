<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$limit = (int)($in['limit'] ?? 200);
if ($limit <= 0 || $limit > 500) $limit = 200;

$pdo = db();
schema_ensure_profiles($pdo);
schema_ensure_users($pdo);

$stmt = $pdo->prepare('
  SELECT
    p.id, p.email, p.subscription, p.subscription_status, p.subscription_started_at, p.subscription_until, p.created_at,
    u.last_login_at, u.last_seen_at, u.login_count
  FROM profiles p
  LEFT JOIN users u ON u.id = p.id
  WHERE p.subscription IS NOT NULL AND p.subscription <> ""
  ORDER BY datetime(p.subscription_started_at) DESC
  LIMIT :l
');
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
api_json(['subscribers' => $rows]);

