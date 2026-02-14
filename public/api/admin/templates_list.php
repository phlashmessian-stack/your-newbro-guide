<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();
auth_require_admin();

$pdo = db();
schema_ensure_templates($pdo);

$stmt = $pdo->query('SELECT id,name,subject,created_at,updated_at FROM email_templates ORDER BY datetime(updated_at) DESC');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
api_json(['templates' => $rows]);

