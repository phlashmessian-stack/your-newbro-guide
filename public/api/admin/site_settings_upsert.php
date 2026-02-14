<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$row = $in['row'] ?? null;
if (!is_array($row)) api_json(['error' => 'Invalid payload'], 400);
$key = (string)($row['key'] ?? '');
$value = (string)($row['value'] ?? '');
if (!$key) api_json(['error' => 'Missing key'], 400);

$pdo = db();
$pdo->exec('
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
');

$stmt = $pdo->prepare('INSERT INTO site_settings(key,value) VALUES (:k,:v) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
$stmt->execute([':k' => $key, ':v' => $value]);

api_json(['ok' => true]);

