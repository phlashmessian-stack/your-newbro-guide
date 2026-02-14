<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$limit = (int)($in['limit'] ?? 50);
if ($limit <= 0 || $limit > 200) $limit = 50;

$pdo = db();
schema_ensure_tickets($pdo);

$stmt = $pdo->prepare('SELECT id,subject,status,priority,created_at,updated_at FROM tickets WHERE user_id=:u ORDER BY datetime(updated_at) DESC LIMIT :l');
$stmt->bindValue(':u', $u['id'], PDO::PARAM_STR);
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
api_json(['tickets' => $rows]);

