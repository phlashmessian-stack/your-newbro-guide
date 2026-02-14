<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_schema.php';

api_cors();
api_require_post();

try {
  $in = api_read_json();
  $email = trim(strtolower($in['email'] ?? ''));
  $password = (string)($in['password'] ?? '');
  $ref = trim((string)($in['ref'] ?? ''));
  $utm = is_array($in['utm'] ?? null) ? $in['utm'] : [];
  $landingPath = trim((string)($in['landing_path'] ?? ''));
  $referrer = trim((string)($in['referrer'] ?? ''));

  if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) api_json(['error' => 'Invalid email'], 400);
  if (strlen($password) < 6) api_json(['error' => 'Password too short'], 400);

  $pdo = db();

  // Ensure schema exists.
  schema_ensure_users($pdo);
  schema_ensure_sessions($pdo);
  schema_ensure_profiles($pdo);
  schema_ensure_roles($pdo);
  schema_ensure_transactions($pdo);
  schema_ensure_events($pdo);

// Prevent duplicates
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :e LIMIT 1');
$stmt->execute([':e' => $email]);
if ($stmt->fetchColumn()) api_json(['error' => 'Email already registered'], 400);

$userId = api_uuid4();
$hash = password_hash($password, PASSWORD_DEFAULT);

$pdo->beginTransaction();
try {
  // Determine signup IP (best-effort)
  $ip = $_SERVER['HTTP_X_REAL_IP'] ?? '';
  if (!$ip && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = trim(explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
  if (!$ip) $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');

  $stmt = $pdo->prepare('INSERT INTO users(id,email,password_hash,signup_ip,last_login_at,last_login_ip,last_seen_at,login_count,is_banned) VALUES (:i,:e,:h,:ip,NULL,NULL,NULL,0,0)');
  $stmt->execute([':i' => $userId, ':e' => $email, ':h' => $hash, ':ip' => $ip]);

  // Unique referral code
  $refCode = '';
  for ($i = 0; $i < 5; $i++) {
    $refCode = bin2hex(random_bytes(4));
    $chk = $pdo->prepare('SELECT 1 FROM profiles WHERE referral_code = :c LIMIT 1');
    $chk->execute([':c' => $refCode]);
    if (!$chk->fetchColumn()) break;
  }

  // Referral lookup (optional): if provided, store as referred_by and grant bonus.
  $referredBy = null;
  if ($ref) {
    $s = $pdo->prepare('SELECT id FROM profiles WHERE referral_code = :c LIMIT 1');
    $s->execute([':c' => $ref]);
    $referredBy = $s->fetchColumn() ?: null;
  }

  // Registration bonus from settings (fallback 100)
  $regBonus = 100;
  try {
    $x = $pdo->query("SELECT value FROM site_settings WHERE key='registration_bonus' LIMIT 1")->fetchColumn();
    if ($x !== false) $regBonus = (int)$x;
  } catch (Throwable $e) { /* ignore */ }

  $stmt = $pdo->prepare('
    INSERT INTO profiles(
      id,email,tokens_balance,referral_code,referred_by,
      utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_path,referrer,
      subscription_status
    ) VALUES (
      :i,:e,:t,:r,:b,
      :us,:um,:uc,:uco,:ut,:lp,:rf,
      "inactive"
    )
  ');
  $stmt->execute([
    ':i' => $userId,
    ':e' => $email,
    ':t' => $regBonus,
    ':r' => $refCode,
    ':b' => $referredBy,
    ':us' => trim((string)($utm['utm_source'] ?? '')),
    ':um' => trim((string)($utm['utm_medium'] ?? '')),
    ':uc' => trim((string)($utm['utm_campaign'] ?? '')),
    ':uco' => trim((string)($utm['utm_content'] ?? '')),
    ':ut' => trim((string)($utm['utm_term'] ?? '')),
    ':lp' => $landingPath,
    ':rf' => $referrer,
  ]);

  // Default role
  $stmt = $pdo->prepare('INSERT OR IGNORE INTO user_roles(id,user_id,role) VALUES (:id,:u,"user")');
  $stmt->execute([':id' => api_uuid4(), ':u' => $userId]);

  // Event
  $stmt = $pdo->prepare('INSERT INTO user_events(id,user_id,event,meta_json) VALUES (:id,:u,:e,:m)');
  $stmt->execute([
    ':id' => api_uuid4(),
    ':u' => $userId,
    ':e' => 'signup',
    ':m' => json_encode(['ref' => $ref ?: null, 'utm' => $utm], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  ]);

  // Referral bonus to inviter
  if ($referredBy) {
    // 3000 default; if site_settings exists, read it.
    $bonus = 3000;
    try {
      $x = $pdo->query("SELECT value FROM site_settings WHERE key='referral_bonus_amount' LIMIT 1")->fetchColumn();
      if ($x !== false) $bonus = (int)$x;
    } catch (Throwable $e) { /* ignore */ }

    $stmt = $pdo->prepare('UPDATE profiles SET tokens_balance = tokens_balance + :a WHERE id = :u');
    $stmt->execute([':a' => $bonus, ':u' => $referredBy]);
    $stmt = $pdo->prepare('INSERT INTO token_transactions(id,user_id,amount,type,description) VALUES (:id,:u,:a,"referral",:d)');
    $stmt->execute([
      ':id' => api_uuid4(),
      ':u' => $referredBy,
      ':a' => $bonus,
      ':d' => 'Реферальный бонус за приглашение',
    ]);
  }

  $pdo->commit();
} catch (Throwable $e) {
  $pdo->rollBack();
  api_json(['error' => 'Signup failed: ' . $e->getMessage()], 500);
}

// Create session
$token = bin2hex(random_bytes(32));
$expires = gmdate('Y-m-d H:i:s', time() + 60 * 60 * 24 * 30);
$stmt = $pdo->prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES (:t,:u,:x)');
$stmt->execute([':t' => $token, ':u' => $userId, ':x' => $expires]);
  auth_set_cookie($token);
  api_json(['session' => ['user' => ['id' => $userId, 'email' => $email]]]);
} catch (Throwable $e) {
  api_json(['error' => 'Signup failed', 'detail' => $e->getMessage()], 500);
}
