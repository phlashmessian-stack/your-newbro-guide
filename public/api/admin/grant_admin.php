<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$email = trim(strtolower((string)($in['email'] ?? '')));
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) api_json(['error' => 'Invalid email'], 400);

$pdo = db();
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :e LIMIT 1');
$stmt->execute([':e' => $email]);
$userId = $stmt->fetchColumn();
if (!$userId) api_json(['error' => 'User not found'], 404);

$stmt = $pdo->prepare('INSERT OR IGNORE INTO user_roles(id,user_id,role) VALUES (:id,:u,"admin")');
$stmt->execute([':id' => api_uuid4(), ':u' => $userId]);

api_json(['ok' => true, 'user_id' => $userId]);

