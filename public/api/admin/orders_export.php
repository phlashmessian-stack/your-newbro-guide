<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

// Allow GET download in browser (uses auth cookie).
api_cors();
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(200); exit; }
$admin = auth_require_admin();

$status = (string)($_GET['status'] ?? '');
$q = trim((string)($_GET['q'] ?? ''));
$limit = (int)($_GET['limit'] ?? 2000);
if ($limit <= 0 || $limit > 20000) $limit = 2000;

$pdo = db();
schema_ensure_orders($pdo);
schema_ensure_profiles($pdo);

$where = [];
$params = [];
if ($status === 'paid') $where[] = 'o.status=1';
if ($status === 'pending') $where[] = 'o.status<>1';
if ($q !== '') {
  $where[] = '(o.email LIKE :q OR o.product_id LIKE :q OR o.provider LIKE :q OR CAST(o.id AS TEXT) LIKE :q)';
  $params[':q'] = '%' . $q . '%';
}
$whereSql = count($where) ? ('WHERE ' . implode(' AND ', $where)) : '';

$sql = '
  SELECT o.id,o.provider,o.status,o.product_id,o.amount,o.currency,o.method_i,o.email,o.user_id,o.ip,o.created_at,o.paid_at,
         o.fk_order_id,o.fk_order_hash,o.yk_payment_id,o.yk_status,o.yk_paid
  FROM orders o
  ' . $whereSql . '
  ORDER BY o.id DESC
  LIMIT :l
';
$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="orders.csv"');

$out = fopen('php://output', 'w');
fputcsv($out, ['id','provider','status','product_id','amount','currency','method_i','email','user_id','ip','created_at','paid_at','fk_order_id','fk_order_hash','yk_payment_id','yk_status','yk_paid']);
foreach ($rows as $r) {
  fputcsv($out, [
    $r['id'] ?? '',
    $r['provider'] ?? '',
    $r['status'] ?? '',
    $r['product_id'] ?? '',
    $r['amount'] ?? '',
    $r['currency'] ?? '',
    $r['method_i'] ?? '',
    $r['email'] ?? '',
    $r['user_id'] ?? '',
    $r['ip'] ?? '',
    $r['created_at'] ?? '',
    $r['paid_at'] ?? '',
    $r['fk_order_id'] ?? '',
    $r['fk_order_hash'] ?? '',
    $r['yk_payment_id'] ?? '',
    $r['yk_status'] ?? '',
    $r['yk_paid'] ?? '',
  ]);
}
fclose($out);
exit;

