<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();

$u = auth_require_user();
$in = api_read_json();
$userId = (string)($in['user_id'] ?? '');

if (!$userId || $userId !== $u['id']) api_json(['error' => 'Forbidden'], 403);

$pdo = db();
$pdo->exec('BEGIN IMMEDIATE;');
try {
  $stmt = $pdo->prepare('SELECT last_daily_bonus FROM profiles WHERE id = :u LIMIT 1');
  $stmt->execute([':u' => $userId]);
  $last = $stmt->fetchColumn();
  if ($last) {
    $lastTs = strtotime($last . ' UTC');
    if ($lastTs !== false && (time() - $lastTs) < 24 * 3600) {
      $pdo->exec('ROLLBACK;');
      api_json(['ok' => false]);
    }
  }

  $bonus = 10;
  try {
    $x = $pdo->query("SELECT value FROM site_settings WHERE key='daily_bonus_amount' LIMIT 1")->fetchColumn();
    if ($x !== false) $bonus = (int)$x;
  } catch (Throwable $e) { /* ignore */ }

  $stmt = $pdo->prepare('UPDATE profiles SET tokens_balance = tokens_balance + :a, last_daily_bonus = datetime("now") WHERE id = :u');
  $stmt->execute([':a' => $bonus, ':u' => $userId]);

  $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,:amt,"daily_bonus",:d)');
  $stmt->execute([
    ':id' => api_uuid4(),
    ':u' => $userId,
    ':amt' => $bonus,
    ':d' => 'Ежедневный бонус',
  ]);

  $pdo->exec('COMMIT;');
} catch (Throwable $e) {
  $pdo->exec('ROLLBACK;');
  api_json(['error' => 'Failed: ' . $e->getMessage()], 500);
}

api_json(['ok' => true]);

