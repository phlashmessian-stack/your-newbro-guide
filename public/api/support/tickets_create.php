<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$subject = trim((string)($in['subject'] ?? ''));
$message = trim((string)($in['message'] ?? ''));
$priority = trim((string)($in['priority'] ?? 'normal'));
if (!in_array($priority, ['low', 'normal', 'high'], true)) $priority = 'normal';

if ($subject === '' || $message === '') api_json(['error' => 'subject and message are required'], 400);
if (strlen($subject) > 160) api_json(['error' => 'subject too long'], 400);
if (strlen($message) > 4000) api_json(['error' => 'message too long'], 400);

$pdo = db();
schema_ensure_tickets($pdo);

// Basic anti-spam: 3 tickets per hour per user.
$ok = api_rate_limit($pdo, 'ticket_create:' . $u['id'], 3, 3600);
if (!$ok) api_json(['error' => 'Too many requests. Try again later.'], 429);

$ticketId = api_uuid4();
try {
  $pdo->exec('BEGIN IMMEDIATE;');
  $stmt = $pdo->prepare('INSERT INTO tickets(id,user_id,email,subject,status,priority,created_at,updated_at) VALUES (:id,:u,:e,:s,"open",:p,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)');
  $stmt->execute([':id' => $ticketId, ':u' => $u['id'], ':e' => $u['email'], ':s' => $subject, ':p' => $priority]);
  $stmt = $pdo->prepare('INSERT INTO ticket_messages(id,ticket_id,author,message,created_at) VALUES (:id,:t,"user",:m,CURRENT_TIMESTAMP)');
  $stmt->execute([':id' => api_uuid4(), ':t' => $ticketId, ':m' => $message]);
  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
  api_json(['error' => 'DB error', 'detail' => $e->getMessage()], 500);
}

api_json(['ok' => true, 'ticket_id' => $ticketId]);

