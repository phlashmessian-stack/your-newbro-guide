<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';
require_once __DIR__ . '/../_config.php';

api_cors();
api_require_post();
auth_require_admin();

$in = api_read_json();
$subject = trim((string)($in['subject'] ?? ''));
$html = (string)($in['html'] ?? '');
$filter = (string)($in['filter'] ?? 'all');
$segment = (string)($in['segment'] ?? '');

if (!$subject || !$html) api_json(['error' => 'subject and html are required'], 400);

$apiKey = (string)cfg_get('RESEND_API_KEY', '');
$from = (string)cfg_get('MAIL_FROM', 'NeuroBro <noreply@example.com>');
// Optional SSL knobs: see mail/send_welcome.php
$caInfo = (string)cfg_get('RESEND_CAINFO', '');
$insecure = (bool)cfg_get('RESEND_INSECURE_SSL', false);
if (!$apiKey) api_json(['error' => 'Mail is not configured (RESEND_API_KEY missing)'], 500);

$pdo = db();

// Support legacy filters and newer segments.
// segment can be passed explicitly or as filter "segment:<name>".
if (!$segment && strncmp($filter, 'segment:', 8) === 0) $segment = substr($filter, 8);

$emails = [];
if ($segment) {
  // Local segment queries (keep in sync with segments_preview.php)
  $sql = '';
  $params = [];
  if ($segment === 'never_paid') $sql = 'SELECT p.email FROM profiles p WHERE p.email<>"" AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id=p.id AND o.status=1)';
  if ($segment === 'paid_any') $sql = 'SELECT DISTINCT p.email FROM profiles p JOIN orders o ON o.user_id=p.id WHERE p.email<>"" AND o.status=1';
  if ($segment === 'paid_tokens') $sql = 'SELECT DISTINCT p.email FROM profiles p JOIN token_transactions t ON t.user_id=p.id WHERE p.email<>"" AND t.amount>0 AND t.type="purchase"';
  if ($segment === 'subscribers_active') $sql = 'SELECT p.email FROM profiles p WHERE p.email<>"" AND p.subscription IS NOT NULL AND p.subscription<>"" AND COALESCE(p.subscription_status,"")="active"';
  if ($segment === 'subscribers_paused') $sql = 'SELECT p.email FROM profiles p WHERE p.email<>"" AND p.subscription IS NOT NULL AND p.subscription<>"" AND COALESCE(p.subscription_status,"")="paused"';
  if (in_array($segment, ['inactive_7', 'inactive_14', 'inactive_30'], true)) {
    $d = (int)str_replace('inactive_', '', $segment);
    $sql = 'SELECT p.email FROM profiles p LEFT JOIN users u ON u.id=p.id WHERE p.email<>"" AND (u.last_seen_at IS NULL OR datetime(u.last_seen_at) < datetime("now", :w))';
    $params[':w'] = '-' . $d . ' days';
  }
  if (!$sql) api_json(['error' => 'Unknown segment'], 400);

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (!empty($r['email'])) $emails[] = $r['email'];
  }
} else {
  $where = '';
  if ($filter === 'with_subscription') $where = 'WHERE subscription IS NOT NULL AND subscription <> ""';
  if ($filter === 'without_subscription') $where = 'WHERE subscription IS NULL OR subscription = ""';

  $stmt = $pdo->query('SELECT email FROM profiles ' . $where);
  while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (!empty($r['email'])) $emails[] = $r['email'];
  }
}
if (count($emails) === 0) api_json(['success' => true, 'sent' => 0, 'total' => 0]);

// Resend batch: send up to ~50 per call (conservative).
$batchSize = 50;
$sent = 0;
$errors = [];

for ($i = 0; $i < count($emails); $i += $batchSize) {
  $batch = array_slice($emails, $i, $batchSize);
  $payload = [];
  foreach ($batch as $e) {
    $payload[] = [
      'from' => $from,
      'to' => [$e],
      'subject' => $subject,
      'html' => $html,
    ];
  }

  $ch = curl_init('https://api.resend.com/emails/batch');
  if (!$caInfo) {
    foreach ([
      '/etc/ssl/certs/ca-certificates.crt',
      '/etc/pki/tls/certs/ca-bundle.crt',
      '/etc/ssl/cert.pem',
    ] as $p) {
      if (file_exists($p)) { $caInfo = $p; break; }
    }
  }

  $opts = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
  ];
  if ($insecure) {
    $opts[CURLOPT_SSL_VERIFYPEER] = false;
    $opts[CURLOPT_SSL_VERIFYHOST] = 0;
  } else if ($caInfo) {
    $opts[CURLOPT_CAINFO] = $caInfo;
  }
  curl_setopt_array($ch, $opts);
  $resp = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  $errno = curl_errno($ch);
  curl_close($ch);

  if ($err) {
    $errors[] = 'curl ' . $errno . ': ' . $err;
    continue;
  }
  if ($code >= 200 && $code < 300) {
    $sent += count($batch);
  } else {
    $errors[] = 'HTTP ' . $code . ': ' . $resp;
  }
}

// Important: keep 200 so the JS client can show detailed errors without treating it as a transport failure.
$ok = ($sent > 0 && count($errors) === 0);
$partial = ($sent > 0 && count($errors) > 0);
$fail = ($sent === 0 && count($errors) > 0);

api_json([
  'success' => $ok || $partial, // true if anything was sent
  'sent' => $sent,
  'total' => count($emails),
  'errors' => $errors,
  'message' => $fail ? 'Resend rejected the request. Check RESEND_API_KEY and MAIL_FROM domain verification.' : ($partial ? 'Some batches failed.' : null),
]);
