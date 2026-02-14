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
$subject = trim((string)($in['subject'] ?? ''));
$html = (string)($in['html'] ?? '');

if ($name === '' || $subject === '' || trim($html) === '') api_json(['error' => 'name, subject, html are required'], 400);
if (strlen($name) > 80) api_json(['error' => 'name too long'], 400);

$pdo = db();
schema_ensure_templates($pdo);

$id = api_uuid4();
try {
  // Use name as unique key: convenient for selecting template in UI.
  $stmt = $pdo->prepare('
    INSERT INTO email_templates(id,name,subject,html,created_at,updated_at)
    VALUES (:id,:n,:s,:h,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      subject=excluded.subject,
      html=excluded.html,
      updated_at=CURRENT_TIMESTAMP
  ');
  $stmt->execute([':id' => $id, ':n' => $name, ':s' => $subject, ':h' => $html]);
} catch (Throwable $e) {
  api_json(['error' => 'DB error', 'detail' => $e->getMessage()], 500);
}

api_json(['ok' => true]);

