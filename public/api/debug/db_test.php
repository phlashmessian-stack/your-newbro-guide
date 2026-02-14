<?php
require_once __DIR__ . '/../_util.php';
require_once __DIR__ . '/../_db.php';

header('Content-Type: application/json; charset=utf-8');

$path = db_path();
$dir = dirname($path);

try {
  $pdo = db();
  $ok = true;
  $err = null;
} catch (Throwable $e) {
  $ok = false;
  $err = $e->getMessage();
}

echo json_encode([
  'ok' => $ok,
  'error' => $err,
  'db_dir' => $dir,
  'db_path' => $path,
  'dir_exists' => is_dir($dir),
  'dir_readable' => is_readable($dir),
  'dir_writable' => is_writable($dir),
  'file_exists' => file_exists($path),
  'file_readable' => file_exists($path) ? is_readable($path) : null,
  'file_writable' => file_exists($path) ? is_writable($path) : null,
], JSON_UNESCAPED_UNICODE);

