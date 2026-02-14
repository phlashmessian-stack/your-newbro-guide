<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();

$u = auth_user();
if (!$u) api_json(['session' => null]);

// Track last seen (best-effort).
try {
  $pdo = db();
  schema_ensure_users($pdo);
  $stmt = $pdo->prepare('UPDATE users SET last_seen_at=CURRENT_TIMESTAMP WHERE id=:u');
  $stmt->execute([':u' => $u['id']]);
} catch (Throwable $e) { /* ignore */ }

api_json(['session' => ['user' => ['id' => $u['id'], 'email' => $u['email']]]]);
