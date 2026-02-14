<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$ticketId = trim((string)($in['ticket_id'] ?? ''));
$message = trim((string)($in['message'] ?? ''));

if ($ticketId === '') api_json(['error' => 'ticket_id required'], 400);
if ($message !== '' && strlen($message) > 4000) api_json(['error' => 'message too long'], 400);

$pdo = db();
schema_ensure_tickets($pdo);

// Verify ownership
$stmt = $pdo->prepare('SELECT id,status FROM tickets WHERE id=:t AND user_id=:u LIMIT 1');
$stmt->execute([':t' => $ticketId, ':u' => $u['id']]);
$t = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$t) api_json(['error' => 'Not found'], 404);

if ($message !== '') {
  // Rate limit: 10 msgs / 10 min per ticket+user
  $ok = api_rate_limit($pdo, 'ticket_msg:' . $u['id'] . ':' . $ticketId, 10, 600);
  if (!$ok) api_json(['error' => 'Too many requests. Try again later.'], 429);

  $pdo->exec('BEGIN IMMEDIATE;');
  try {
    $stmt = $pdo->prepare('INSERT INTO ticket_messages(id,ticket_id,author,message,created_at) VALUES (:id,:t,"user",:m,CURRENT_TIMESTAMP)');
    $stmt->execute([':id' => api_uuid4(), ':t' => $ticketId, ':m' => $message]);
    $stmt = $pdo->prepare('UPDATE tickets SET updated_at=CURRENT_TIMESTAMP WHERE id=:t');
    $stmt->execute([':t' => $ticketId]);
    $pdo->exec('COMMIT;');
  } catch (Throwable $e) {
    try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
    api_json(['error' => 'DB error', 'detail' => $e->getMessage()], 500);
  }
}

$stmt = $pdo->prepare('SELECT author,message,created_at FROM ticket_messages WHERE ticket_id=:t ORDER BY datetime(created_at) ASC');
$stmt->execute([':t' => $ticketId]);
$msgs = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

api_json(['ticket_id' => $ticketId, 'messages' => $msgs, 'status' => (string)($t['status'] ?? 'open')]);

