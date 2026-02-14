<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(200); exit; }
auth_require_admin();

$type = trim((string)($_GET['type'] ?? '')); // purchase|subscription|bonus|spend|referral|...
$onlyPositive = (string)($_GET['only_positive'] ?? '') === '1';
$q = trim((string)($_GET['q'] ?? ''));
$limit = (int)($_GET['limit'] ?? 5000);
if ($limit <= 0 || $limit > 50000) $limit = 5000;

$pdo = db();
schema_ensure_transactions($pdo);
schema_ensure_profiles($pdo);

$where = [];
$params = [];
if ($type !== '') { $where[] = 't.type = :ty'; $params[':ty'] = $type; }
if ($onlyPositive) $where[] = 't.amount > 0';
if ($q !== '') {
  $where[] = '(p.email LIKE :q OR t.description LIKE :q OR t.type LIKE :q OR t.user_id LIKE :q)';
  $params[':q'] = '%' . $q . '%';
}
$whereSql = count($where) ? ('WHERE ' . implode(' AND ', $where)) : '';

$sql = '
  SELECT t.id,t.user_id,p.email,t.amount,t.type,t.description,t.created_at
  FROM token_transactions t
  LEFT JOIN profiles p ON p.id=t.user_id
  ' . $whereSql . '
  ORDER BY datetime(t.created_at) DESC
  LIMIT :l
';
$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="transactions.csv"');

$out = fopen('php://output', 'w');
fputcsv($out, ['id','user_id','email','amount','type','description','created_at']);
foreach ($rows as $r) {
  fputcsv($out, [
    $r['id'] ?? '',
    $r['user_id'] ?? '',
    $r['email'] ?? '',
    $r['amount'] ?? '',
    $r['type'] ?? '',
    $r['description'] ?? '',
    $r['created_at'] ?? '',
  ]);
}
fclose($out);
exit;

