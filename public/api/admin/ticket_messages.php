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
if ($ticketId === '') api_json(['error' => 'ticket_id required'], 400);

$pdo = db();
schema_ensure_tickets($pdo);

$stmt = $pdo->prepare('SELECT id,user_id,email,subject,status,priority,created_at,updated_at FROM tickets WHERE id=:t LIMIT 1');
$stmt->execute([':t' => $ticketId]);
$t = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$t) api_json(['error' => 'Not found'], 404);

$stmt = $pdo->prepare('SELECT author,message,created_at FROM ticket_messages WHERE ticket_id=:t ORDER BY datetime(created_at) ASC');
$stmt->execute([':t' => $ticketId]);
$msgs = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

api_json(['ticket' => $t, 'messages' => $msgs]);

