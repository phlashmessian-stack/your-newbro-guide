<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$ticketId = trim((string)($in['ticket_id'] ?? ''));
$status = trim((string)($in['status'] ?? ''));
$priority = trim((string)($in['priority'] ?? ''));

if ($ticketId === '') api_json(['error' => 'ticket_id required'], 400);
if ($status !== '' && !in_array($status, ['open', 'pending', 'closed'], true)) api_json(['error' => 'Invalid status'], 400);
if ($priority !== '' && !in_array($priority, ['low', 'normal', 'high'], true)) api_json(['error' => 'Invalid priority'], 400);
if ($status === '' && $priority === '') api_json(['error' => 'Nothing to update'], 400);

$pdo = db();
schema_ensure_tickets($pdo);

$sets = [];
$params = [':t' => $ticketId];
if ($status !== '') { $sets[] = 'status=:s'; $params[':s'] = $status; }
if ($priority !== '') { $sets[] = 'priority=:p'; $params[':p'] = $priority; }
$sets[] = 'updated_at=CURRENT_TIMESTAMP';

$stmt = $pdo->prepare('UPDATE tickets SET ' . implode(',', $sets) . ' WHERE id=:t');
$stmt->execute($params);

api_json(['ok' => true]);

