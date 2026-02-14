<?php
require_once __DIR__ . '/_util.php';

function db_path() {
  // Expected hosting layout:
  // /.../data/www/<domain>/api/*.php
  // /.../data/db/database.sqlite  (outside webroot)
  $root = dirname(__DIR__, 3); // .../data
  return $root . '/db/database.sqlite';
}

function db() {
  static $pdo = null;
  if ($pdo) return $pdo;

  $path = db_path();
  $dir = dirname($path);
  if (!is_dir($dir)) {
    throw new RuntimeException("DB directory not found: " . $dir);
  }
  if (!is_readable($dir) || !is_writable($dir)) {
    throw new RuntimeException("DB directory not readable/writable: " . $dir);
  }
  // Create file if missing (should be initialized with init script, but keep safe).
  if (!file_exists($path)) {
    @touch($path);
    @chmod($path, 0600);
  }
  if (!is_readable($path) || !is_writable($path)) {
    throw new RuntimeException("DB file not readable/writable: " . $path);
  }

  $pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  $pdo->exec('PRAGMA foreign_keys = ON;');
  $pdo->exec('PRAGMA journal_mode = WAL;');
  $pdo->exec('PRAGMA synchronous = NORMAL;');
  return $pdo;
}
