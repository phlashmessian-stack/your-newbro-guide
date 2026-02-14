<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
$admin = auth_require_admin();

$in = api_read_json();
$userId = trim((string)($in['user_id'] ?? ''));
$reason = trim((string)($in['reason'] ?? ''));
if (!$userId) api_json(['error' => 'Missing user_id'], 400);
if ($userId === $admin['id']) api_json(['error' => 'Cannot ban yourself'], 400);

$pdo = db();
schema_ensure_users($pdo);

$stmt = $pdo->prepare('UPDATE users SET is_banned=1, ban_reason=:r, banned_at=CURRENT_TIMESTAMP WHERE id=:u');
$stmt->execute([':r' => $reason, ':u' => $userId]);

// Also invalidate sessions
try {
  schema_ensure_sessions($pdo);
  $stmt = $pdo->prepare('DELETE FROM sessions WHERE user_id=:u');
  $stmt->execute([':u' => $userId]);
} catch (Throwable $e) { /* ignore */ }

api_json(['ok' => true]);

