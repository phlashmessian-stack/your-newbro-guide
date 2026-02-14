<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$name = trim((string)($in['name'] ?? ''));
if ($name === '') api_json(['error' => 'name required'], 400);

$pdo = db();
schema_ensure_templates($pdo);
$stmt = $pdo->prepare('SELECT id,name,subject,html,created_at,updated_at FROM email_templates WHERE name=:n LIMIT 1');
$stmt->execute([':n' => $name]);
$t = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$t) api_json(['error' => 'Not found'], 404);
api_json(['template' => $t]);

