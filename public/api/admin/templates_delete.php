<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$id = trim((string)($in['id'] ?? ''));
$name = trim((string)($in['name'] ?? ''));

if ($id === '' && $name === '') api_json(['error' => 'id or name required'], 400);

$pdo = db();
schema_ensure_templates($pdo);

if ($id !== '') {
  $stmt = $pdo->prepare('DELETE FROM email_templates WHERE id=:id');
  $stmt->execute([':id' => $id]);
} else {
  $stmt = $pdo->prepare('DELETE FROM email_templates WHERE name=:n');
  $stmt->execute([':n' => $name]);
}

api_json(['ok' => true]);

