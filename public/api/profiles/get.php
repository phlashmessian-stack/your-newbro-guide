<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$id = (string)($in['id'] ?? '');

// Only allow reading own profile.
if (!$id || $id !== $u['id']) api_json(['error' => 'Forbidden'], 403);

$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM profiles WHERE id = :i LIMIT 1');
$stmt->execute([':i' => $id]);
$p = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$p) api_json(['error' => 'Profile not found'], 404);

api_json(['profile' => $p]);

