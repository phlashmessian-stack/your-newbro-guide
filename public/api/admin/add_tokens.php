<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$userId = (string)($in['user_id'] ?? '');
$amount = (int)($in['amount'] ?? 0);
$type = trim((string)($in['type'] ?? 'bonus'));
$desc = trim((string)($in['description'] ?? ''));

if (!$userId) api_json(['error' => 'Missing user_id'], 400);
if ($amount === 0) api_json(['error' => 'Invalid amount'], 400);

$pdo = db();
$pdo->exec('BEGIN IMMEDIATE;');
try {
  $stmt = $pdo->prepare('UPDATE profiles SET tokens_balance = tokens_balance + :a WHERE id = :u');
  $stmt->execute([':a' => $amount, ':u' => $userId]);
  $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,:amt,:t,:d)');
  $stmt->execute([
    ':id' => api_uuid4(),
    ':u' => $userId,
    ':amt' => $amount,
    ':t' => $type,
    ':d' => $desc,
  ]);
  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  $pdo->exec('ROLLBACK;');
  api_json(['error' => 'Failed: ' . $e->getMessage()], 500);
}

api_json(['ok' => true]);

