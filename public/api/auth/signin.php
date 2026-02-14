<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();

$in = api_read_json();
$email = trim(strtolower($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) api_json(['error' => 'Invalid email'], 400);
if (!$password) api_json(['error' => 'Missing password'], 400);

$pdo = db();
schema_ensure_users($pdo);
schema_ensure_sessions($pdo);
schema_ensure_events($pdo);

$stmt = $pdo->prepare('SELECT id, email, password_hash, COALESCE(is_banned,0) AS is_banned, ban_reason FROM users WHERE email = :e LIMIT 1');
$stmt->execute([':e' => $email]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) api_json(['error' => 'Invalid email or password'], 400);
if (!password_verify($password, $row['password_hash'])) api_json(['error' => 'Invalid email or password'], 400);
if (!empty($row['is_banned'])) api_json(['error' => 'Banned', 'reason' => $row['ban_reason'] ?? ''], 403);

$token = bin2hex(random_bytes(32));
$expires = gmdate('Y-m-d H:i:s', time() + 60 * 60 * 24 * 30);
$stmt = $pdo->prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES (:t,:u,:x)');
$stmt->execute([':t' => $token, ':u' => $row['id'], ':x' => $expires]);
auth_set_cookie($token);

// Track login/seen
$ip = $_SERVER['HTTP_X_REAL_IP'] ?? '';
if (!$ip && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = trim(explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
if (!$ip) $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
try {
  $prev = 0;
  try {
    $stmt = $pdo->prepare('SELECT COALESCE(login_count,0) FROM users WHERE id=:u LIMIT 1');
    $stmt->execute([':u' => $row['id']]);
    $prev = (int)$stmt->fetchColumn();
  } catch (Throwable $e) { $prev = 0; }
  $stmt = $pdo->prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP,last_login_ip=:ip,last_seen_at=CURRENT_TIMESTAMP,login_count=COALESCE(login_count,0)+1 WHERE id=:u');
  $stmt->execute([':ip' => $ip, ':u' => $row['id']]);

  $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,"login",:m)');
  $stmt->execute([':id' => api_uuid4(), ':u' => $row['id'], ':m' => json_encode(['ip'=>$ip], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
  if ($prev <= 0) {
    $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,"first_login",:m)');
    $stmt->execute([':id' => api_uuid4(), ':u' => $row['id'], ':m' => json_encode(['ip'=>$ip], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)]);
  }
} catch (Throwable $e) { /* ignore */ }

api_json(['session' => ['user' => ['id' => $row['id'], 'email' => $row['email']]]]);
