<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
$admin = auth_require_admin();

$in = api_read_json();
$ticketId = trim((string)($in['ticket_id'] ?? ''));
$message = trim((string)($in['message'] ?? ''));
$status = trim((string)($in['status'] ?? ''));

if ($ticketId === '') api_json(['error' => 'ticket_id required'], 400);
if ($message === '') api_json(['error' => 'message required'], 400);
if (strlen($message) > 6000) api_json(['error' => 'message too long'], 400);
if ($status !== '' && !in_array($status, ['open', 'pending', 'closed'], true)) $status = '';

$pdo = db();
schema_ensure_tickets($pdo);

$stmt = $pdo->prepare('SELECT id FROM tickets WHERE id=:t LIMIT 1');
$stmt->execute([':t' => $ticketId]);
if (!$stmt->fetchColumn()) api_json(['error' => 'Not found'], 404);

try {
  $pdo->exec('BEGIN IMMEDIATE;');
  $stmt = $pdo->prepare('INSERT INTO ticket_messages(id,ticket_id,author,message,created_at) VALUES (:id,:t,"admin",:m,CURRENT_TIMESTAMP)');
  $stmt->execute([':id' => api_uuid4(), ':t' => $ticketId, ':m' => $message]);
  if ($status !== '') {
    $stmt = $pdo->prepare('UPDATE tickets SET status=:s, updated_at=CURRENT_TIMESTAMP WHERE id=:t');
    $stmt->execute([':s' => $status, ':t' => $ticketId]);
  } else {
    $stmt = $pdo->prepare('UPDATE tickets SET updated_at=CURRENT_TIMESTAMP WHERE id=:t');
    $stmt->execute([':t' => $ticketId]);
  }
  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
  api_json(['error' => 'DB error', 'detail' => $e->getMessage()], 500);
}

api_json(['ok' => true, 'admin_id' => $admin['id']]);

