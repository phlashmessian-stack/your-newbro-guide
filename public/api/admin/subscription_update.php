<?php
// Admin: pause/unpause/extend subscription.

require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
$admin = auth_require_admin();

$in = api_read_json();
$userId = trim((string)($in['user_id'] ?? ''));
$action = (string)($in['action'] ?? '');

if (!$userId) api_json(['error' => 'Missing user_id'], 400);
if (!in_array($action, ['pause', 'resume', 'extend_days', 'set_plan', 'clear'], true)) api_json(['error' => 'Invalid action'], 400);

$pdo = db();
schema_ensure_profiles($pdo);
schema_ensure_transactions($pdo);
schema_ensure_subscription_history($pdo);

function subhist(PDO $pdo, string $userId, string $actorId, string $action, array $meta = []) {
  try {
    $stmt = $pdo->prepare('INSERT INTO subscription_history(id,user_id,actor_id,action,meta_json) VALUES (:id,:u,:a,:ac,:m)');
    $stmt->execute([
      ':id' => api_uuid4(),
      ':u' => $userId,
      ':a' => $actorId,
      ':ac' => $action,
      ':m' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
  } catch (Throwable $e) { /* ignore */ }
}

if ($action === 'pause') {
  $stmt = $pdo->prepare('UPDATE profiles SET subscription_status="paused" WHERE id=:u');
  $stmt->execute([':u' => $userId]);
  subhist($pdo, $userId, $admin['id'], 'pause');
  api_json(['ok' => true]);
}

if ($action === 'resume') {
  $stmt = $pdo->prepare('UPDATE profiles SET subscription_status="active" WHERE id=:u AND subscription IS NOT NULL AND subscription <> ""');
  $stmt->execute([':u' => $userId]);
  subhist($pdo, $userId, $admin['id'], 'resume');
  api_json(['ok' => true]);
}

if ($action === 'clear') {
  $stmt = $pdo->prepare('UPDATE profiles SET subscription=NULL, subscription_status="inactive", subscription_started_at=NULL, subscription_until=NULL WHERE id=:u');
  $stmt->execute([':u' => $userId]);
  subhist($pdo, $userId, $admin['id'], 'clear');
  api_json(['ok' => true]);
}

if ($action === 'set_plan') {
  $plan = (string)($in['plan'] ?? '');
  if (!in_array($plan, ['lite', 'pro', 'ultra'], true)) api_json(['error' => 'Invalid plan'], 400);
  $stmt = $pdo->prepare('UPDATE profiles SET subscription=:s, subscription_status="active", subscription_started_at=COALESCE(subscription_started_at,CURRENT_TIMESTAMP), subscription_until=COALESCE(subscription_until,datetime("now","+30 days")) WHERE id=:u');
  $stmt->execute([':s' => $plan, ':u' => $userId]);
  $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,0,"subscription",:d)');
  $stmt->execute([':id' => api_uuid4(), ':u' => $userId, ':d' => 'Админ: подписка ' . $plan]);
  subhist($pdo, $userId, $admin['id'], 'set_plan', ['plan' => $plan]);
  api_json(['ok' => true]);
}

if ($action === 'extend_days') {
  $days = (int)($in['days'] ?? 0);
  if ($days <= 0 || $days > 365) api_json(['error' => 'Invalid days'], 400);
  $stmt = $pdo->prepare('
    UPDATE profiles
    SET subscription_until = CASE
      WHEN subscription_until IS NULL OR subscription_until = "" THEN datetime("now", :d)
      ELSE datetime(subscription_until, :d)
    END,
    subscription_status="active",
    subscription_started_at=COALESCE(subscription_started_at,CURRENT_TIMESTAMP)
    WHERE id=:u AND subscription IS NOT NULL AND subscription <> ""
  ');
  $stmt->execute([':d' => '+' . $days . ' days', ':u' => $userId]);
  $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,0,"subscription",:d)');
  $stmt->execute([':id' => api_uuid4(), ':u' => $userId, ':d' => 'Админ: продление подписки +' . $days . 'д']);
  subhist($pdo, $userId, $admin['id'], 'extend_days', ['days' => $days]);
  api_json(['ok' => true]);
}

api_json(['ok' => false], 500);
