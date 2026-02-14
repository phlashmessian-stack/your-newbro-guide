<?php
// One-time admin bootstrap.
// Allows granting admin role to a user by email ONLY if there are no admins yet.
// Protect with a secret key and delete/disable after use.

require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';

api_cors();
api_require_post();

// ╔══════════════════════════════════════════════════╗
// ║  ⬇️  УСТАНОВИТЕ СЕКРЕТНЫЙ КЛЮЧ ДЛЯ БУТСТРАПА ⬇️  ║
// ╚══════════════════════════════════════════════════╝
$BOOTSTRAP_KEY = 'CHANGE_ME_LONG_RANDOM';

$in = api_read_json();
$key = (string)($in['key'] ?? '');
$email = trim(strtolower((string)($in['email'] ?? '')));

if (!$key || !hash_equals($BOOTSTRAP_KEY, $key)) api_json(['error' => 'Forbidden'], 403);
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) api_json(['error' => 'Invalid email'], 400);

$pdo = db();

// If any admin exists, refuse.
$hasAdmin = (bool)$pdo->query("SELECT 1 FROM user_roles WHERE role='admin' LIMIT 1")->fetchColumn();
if ($hasAdmin) api_json(['error' => 'Admin already exists'], 400);

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :e LIMIT 1');
$stmt->execute([':e' => $email]);
$userId = $stmt->fetchColumn();
if (!$userId) api_json(['error' => 'User not found'], 404);

$stmt = $pdo->prepare('INSERT OR IGNORE INTO user_roles(id,user_id,role) VALUES (:id,:u,"admin")');
$stmt->execute([':id' => api_uuid4(), ':u' => $userId]);

api_json(['ok' => true, 'user_id' => $userId]);
