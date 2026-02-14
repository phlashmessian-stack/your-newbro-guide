<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$id = (string)($in['id'] ?? '');
$values = $in['values'] ?? null;
if (!$id || !is_array($values)) api_json(['error' => 'Invalid payload'], 400);

// Allowlist fields
$set = [];
$params = [':id' => $id];
foreach (['subscription', 'tokens_balance'] as $k) {
  if (array_key_exists($k, $values)) {
    $set[] = "$k = :$k";
    $params[":$k"] = $values[$k];
  }
}
if (!$set) api_json(['ok' => true]);

$pdo = db();
$sql = 'UPDATE profiles SET ' . implode(', ', $set) . ' WHERE id = :id';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

api_json(['ok' => true]);

