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
$stmt = $pdo->prepare('
  SELECT
    t.id, t.user_id, t.amount, t.type, t.description, t.created_at,
    p.email AS profile_email
  FROM token_transactions t
  LEFT JOIN profiles p ON p.id = t.user_id
  ORDER BY datetime(t.created_at) DESC
  LIMIT :l
');
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = [];
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
  $rows[] = [
    'id' => $r['id'],
    'user_id' => $r['user_id'],
    'amount' => (int)$r['amount'],
    'type' => $r['type'],
    'description' => $r['description'],
    'created_at' => $r['created_at'],
    'profiles' => $r['profile_email'] ? ['email' => $r['profile_email']] : null,
  ];
}

api_json(['transactions' => $rows]);

