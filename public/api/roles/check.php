<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$userId = (string)($in['user_id'] ?? '');
$role = (string)($in['role'] ?? '');

// Only allow checking own roles.
if (!$userId || $userId !== $u['id']) api_json(['error' => 'Forbidden'], 403);
if (!$role) api_json(['rows' => []]);

$pdo = db();
$stmt = $pdo->prepare('SELECT role FROM user_roles WHERE user_id = :u AND role = :r');
$stmt->execute([':u' => $userId, ':r' => $role]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

api_json(['rows' => $rows]);

