<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

api_cors();
api_require_post();

$pdo = db();
$t = auth_token();
if ($t) {
  $stmt = $pdo->prepare('DELETE FROM sessions WHERE token = :t');
  $stmt->execute([':t' => $t]);
}
auth_clear_cookie();

api_json(['ok' => true]);

