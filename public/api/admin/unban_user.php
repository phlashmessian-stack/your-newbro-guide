<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$userId = trim((string)($in['user_id'] ?? ''));
if (!$userId) api_json(['error' => 'Missing user_id'], 400);

$pdo = db();
schema_ensure_users($pdo);
$stmt = $pdo->prepare('UPDATE users SET is_banned=0, ban_reason=NULL, banned_at=NULL WHERE id=:u');
$stmt->execute([':u' => $userId]);

api_json(['ok' => true]);

