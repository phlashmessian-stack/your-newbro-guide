<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';

api_cors();
api_require_post();

$pdo = db();
// Ensure table exists
$pdo->exec('CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);');

$keys = [
  'daily_bonus_amount' => 10,
  'referral_bonus_amount' => 3000,
  'registration_bonus' => 100,
  'chat_token_cost' => 1,
  'image_token_cost' => 5,
  'video_token_cost' => 20,
  'sub_lite_price' => 299,
  'sub_pro_price' => 599,
  'sub_ultra_price' => 999,
  'pack_small_tokens' => 5000,
  'pack_small_price' => 99,
  'pack_medium_tokens' => 20000,
  'pack_medium_price' => 299,
  'pack_large_tokens' => 50000,
  'pack_large_price' => 699,
  'maintenance_mode' => false,
  'demo_mode' => true,
];

$stmt = $pdo->query('SELECT key,value FROM site_settings');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
$out = [];
foreach ($keys as $k => $def) $out[$k] = $def;
foreach ($rows as $r) {
  $k = (string)($r['key'] ?? '');
  if (!array_key_exists($k, $keys)) continue;
  $v = (string)($r['value'] ?? '');
  if (is_bool($keys[$k])) $out[$k] = ($v === 'true' || $v === '1');
  else $out[$k] = (int)$v;
}

api_json(['settings' => $out]);

