<?php
// Shared helpers for API endpoints.

function api_json($data, $status = 200) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function api_read_json() {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function api_require_post() {
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    api_json(['error' => 'Only POST allowed'], 405);
  }
}

function api_rate_limit(PDO $pdo, string $key, int $limit, int $windowSeconds): bool {
  // Returns true if allowed, false if rate-limited.
  if ($limit <= 0 || $windowSeconds <= 0) return true;
  require_once __DIR__ . '/_schema.php';
  schema_ensure_rate_limits($pdo);

  $now = time();
  $pdo->exec('BEGIN IMMEDIATE;');
  try {
    $stmt = $pdo->prepare('SELECT cnt, reset_at FROM rate_limits WHERE k=:k LIMIT 1');
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
      $stmt = $pdo->prepare('INSERT INTO rate_limits(k,cnt,reset_at) VALUES (:k,1,:r)');
      $stmt->execute([':k' => $key, ':r' => $now + $windowSeconds]);
      $pdo->exec('COMMIT;');
      return true;
    }

    $cnt = (int)($row['cnt'] ?? 0);
    $resetAt = (int)($row['reset_at'] ?? 0);
    if ($resetAt <= $now) {
      $stmt = $pdo->prepare('UPDATE rate_limits SET cnt=1, reset_at=:r WHERE k=:k');
      $stmt->execute([':r' => $now + $windowSeconds, ':k' => $key]);
      $pdo->exec('COMMIT;');
      return true;
    }

    if ($cnt >= $limit) {
      $pdo->exec('COMMIT;');
      return false;
    }

    $stmt = $pdo->prepare('UPDATE rate_limits SET cnt=cnt+1 WHERE k=:k');
    $stmt->execute([':k' => $key]);
    $pdo->exec('COMMIT;');
    return true;
  } catch (Throwable $e) {
    try { $pdo->exec('ROLLBACK;'); } catch (Throwable $e2) {}
    return true; // fail-open
  }
}

function api_cors() {
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
}

function api_uuid4() {
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
