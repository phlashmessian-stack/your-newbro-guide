<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$limit = (int)($in['limit'] ?? 50);
if ($limit <= 0 || $limit > 200) $limit = 50;

$pdo = db();
$pdo->exec('
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
');

$stmt = $pdo->prepare('SELECT key, value FROM site_settings LIMIT :l');
$stmt->bindValue(':l', $limit, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

api_json(['rows' => $rows]);

