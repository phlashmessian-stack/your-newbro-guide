<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$status = trim((string)($in['status'] ?? ''));
$q = trim((string)($in['q'] ?? ''));
$limit = (int)($in['limit'] ?? 200);
if ($limit <= 0 || $limit > 500) $limit = 200;

$pdo = db();
schema_ensure_tickets($pdo);

$where = [];
$params = [];
if ($status !== '' && in_array($status, ['open', 'pending', 'closed'], true)) {
  $where[] = 't.status = :st';
  $params[':st'] = $status;
}
if ($q !== '') {
  $where[] = '(t.email LIKE :q OR t.subject LIKE :q OR t.id LIKE :q)';
  $params[':q'] = '%' . $q . '%';
}
$whereSql = count($where) ? ('WHERE ' . implode(' AND ', $where)) : '';

// Include last message snippet
$sql = '
  SELECT
    t.id, t.user_id, t.email, t.subject, t.status, t.priority, t.created_at, t.updated_at,
    (SELECT substr(m.message,1,120) FROM ticket_messages m WHERE m.ticket_id=t.id ORDER BY datetime(m.created_at) DESC LIMIT 1) AS last_message,
    (SELECT m.author FROM ticket_messages m WHERE m.ticket_id=t.id ORDER BY datetime(m.created_at) DESC LIMIT 1) AS last_author
  FROM tickets t
  ' . $whereSql . '
  ORDER BY datetime(t.updated_at) DESC
  LIMIT :l
';

$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
api_json(['tickets' => $rows]);

