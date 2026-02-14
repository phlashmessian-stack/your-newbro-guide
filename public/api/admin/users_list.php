<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$limit = (int)($in['limit'] ?? 5000);
if ($limit <= 0 || $limit > 5000) $limit = 5000;

$pdo = db();
$stmt = $pdo->prepare('SELECT id,email,tokens_balance,subscription,referral_code,created_at FROM profiles ORDER BY datetime(created_at) DESC LIMIT :l');
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

api_json(['users' => $rows]);

