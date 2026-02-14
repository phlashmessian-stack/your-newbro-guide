<?php
require_once __DIR__ . '/_util.php';
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_schema.php';

function auth_cookie_name() { return 'nb_session'; }

function auth_set_cookie($token) {
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  setcookie(auth_cookie_name(), $token, [
    'expires' => time() + 60 * 60 * 24 * 30,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
}

function auth_clear_cookie() {
  $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  setcookie(auth_cookie_name(), '', [
    'expires' => time() - 3600,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
}

function auth_token() {
  return $_COOKIE[auth_cookie_name()] ?? '';
}

function auth_user() {
  $token = auth_token();
  if (!$token) return null;

  $pdo = db();
  // Ensure columns exist before selecting them.
  schema_ensure_users($pdo);
  schema_ensure_sessions($pdo);
  $stmt = $pdo->prepare('
    SELECT u.id, u.email, COALESCE(u.is_banned,0) AS is_banned, u.ban_reason
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = :t AND s.expires_at > datetime("now")
    LIMIT 1
  ');
  $stmt->execute([':t' => $token]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  return $row ?: null;
}

function auth_require_user() {
  $u = auth_user();
  if (!$u) api_json(['error' => 'Unauthorized'], 401);
  if (!empty($u['is_banned'])) api_json(['error' => 'Banned', 'reason' => $u['ban_reason'] ?? ''], 403);
  return $u;
}

function auth_is_admin($userId) {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT 1 FROM user_roles WHERE user_id = :u AND role = "admin" LIMIT 1');
  $stmt->execute([':u' => $userId]);
  return (bool)$stmt->fetchColumn();
}

function auth_require_admin() {
  $u = auth_require_user();
  if (!auth_is_admin($u['id'])) api_json(['error' => 'Forbidden'], 403);
  return $u;
}
