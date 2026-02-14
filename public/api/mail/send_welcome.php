<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_config.php';

api_cors();
api_require_post();

$in = api_read_json();
$email = trim((string)($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) api_json(['error' => 'Invalid email'], 400);
if (!$password) api_json(['error' => 'Missing password'], 400);

// Default implementation: Resend (as in your old Supabase function).
// If you use another provider ("Sender"), paste its API details and we will adapt this endpoint.
$apiKey = (string)cfg_get('RESEND_API_KEY', '');
$from = (string)cfg_get('MAIL_FROM', 'NeuroBro <noreply@example.com>');
// Optional SSL knobs for shared-hosting environments:
// - RESEND_CAINFO: absolute path to CA bundle file
// - RESEND_INSECURE_SSL: true to disable SSL verification (not recommended)
$caInfo = (string)cfg_get('RESEND_CAINFO', '');
$insecure = (bool)cfg_get('RESEND_INSECURE_SSL', false);

if (!$apiKey) api_json(['error' => 'Mail is not configured (RESEND_API_KEY missing)'], 500);

// Force links to APP_URL from config. If missing, default to neuro-bro.ru.
// This avoids sending users to an old/staging domain even if the request came from there.
$appUrl = trim((string)cfg_get('APP_URL', 'https://neuro-bro.ru'));
$appUrl = rtrim($appUrl, '/');
$dashboardUrl = $appUrl . '/dashboard.html';

$payload = [
  'from' => $from,
  'to' => [$email],
  'subject' => 'Добро пожаловать в NeuroBro! 🤖',
  'html' => '
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:500px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px 24px;text-align:center">
        <h1 style="margin:0;font-size:28px;color:#fff">🤖 NeuroBro</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Все нейросети в одном окне</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="margin:0 0 16px;font-size:20px;color:#fff">Добро пожаловать!</h2>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a0a0b0">
          Ваш аккаунт создан. Вот ваши данные для входа:
        </p>
        <div style="background:#16162a;border:1px solid #2a2a4a;border-radius:12px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 12px;font-size:13px;color:#888">📧 <strong style="color:#e0e0e0">Email:</strong></p>
          <p style="margin:0 0 16px;font-size:15px;color:#7c3aed;font-family:monospace;word-break:break-all">' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</p>
          <p style="margin:0 0 12px;font-size:13px;color:#888">🔑 <strong style="color:#e0e0e0">Пароль:</strong></p>
          <p style="margin:0;font-size:15px;color:#06b6d4;font-family:monospace">' . htmlspecialchars($password, ENT_QUOTES, 'UTF-8') . '</p>
        </div>
        <!-- "Bulletproof" button for mobile email clients -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 auto">
          <tr>
            <td align="center" bgcolor="#7c3aed" style="border-radius:10px">
              <a href="' . htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8') . '" target="_blank" style="display:inline-block;padding:14px 24px;font-weight:600;font-size:15px;line-height:1;color:#ffffff;text-decoration:none">
                Войти в NeuroBro →
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:12px;line-height:1.4;color:#666;text-align:center">
          Если кнопка не нажимается на телефоне, откройте ссылку вручную:<br>
          <a href="' . htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8') . '" style="color:#06b6d4;text-decoration:underline;word-break:break-all">
            ' . htmlspecialchars($dashboardUrl, ENT_QUOTES, 'UTF-8') . '
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#666;text-align:center">Рекомендуем сменить пароль после первого входа.</p>
      </div>
    </div>
  ',
];

$ch = curl_init('https://api.resend.com/emails');
// Auto-detect common CA bundle locations if not provided.
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
  CURLOPT_TIMEOUT => 20,
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

if ($err) api_json([
  'error' => 'Mail error',
  'curl_errno' => $errno,
  'curl_error' => $err,
  'ca_info' => $caInfo ?: null,
  'insecure_ssl' => $insecure,
], 502);
if ($code < 200 || $code >= 300) api_json(['error' => 'Mail provider error', 'status' => $code, 'response' => $resp], 502);

api_json(['ok' => true]);
