<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$userId = (string)($in['user_id'] ?? '');
$amount = (int)($in['amount'] ?? 0);
$desc = trim((string)($in['description'] ?? ''));

if (!$userId || $userId !== $u['id']) api_json(['error' => 'Forbidden'], 403);
if ($amount <= 0) api_json(['error' => 'Invalid amount'], 400);

$pdo = db();
$pdo->exec('BEGIN IMMEDIATE;');
try {
  $stmt = $pdo->prepare('SELECT tokens_balance FROM profiles WHERE id = :u LIMIT 1');
  $stmt->execute([':u' => $userId]);
  $bal = (int)($stmt->fetchColumn() ?: 0);
  if ($bal < $amount) {
    $pdo->exec('ROLLBACK;');
    api_json(['ok' => false]);
  }

  $stmt = $pdo->prepare('UPDATE profiles SET tokens_balance = tokens_balance - :a WHERE id = :u');
  $stmt->execute([':a' => $amount, ':u' => $userId]);
  $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,:amt,"spend",:d)');
  $stmt->execute([
    ':id' => api_uuid4(),
    ':u' => $userId,
    ':amt' => -$amount,
    ':d' => $desc,
  ]);
  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  $pdo->exec('ROLLBACK;');
  api_json(['error' => 'Failed: ' . $e->getMessage()], 500);
}

api_json(['ok' => true]);

