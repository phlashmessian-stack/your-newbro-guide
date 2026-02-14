<?php
// Loads secrets/config from outside webroot.
// Expected path (based on hosting layout):
//   /var/www/<user>/data/config/neurobro.php
// The file must `return [ 'RESEND_API_KEY' => 're_...', 'MAIL_FROM' => 'NeuroBro <...>' ];`

function cfg() {
  static $cfg = null;
  if ($cfg !== null) return $cfg;

  $dataRoot = dirname(__DIR__, 3); // .../data
  $path = $dataRoot . '/config/neurobro.php';
  if (file_exists($path)) {
    $loaded = include $path;
    $cfg = is_array($loaded) ? $loaded : [];
  } else {
    $cfg = [];
  }
  return $cfg;
}

function cfg_get($key, $default = null) {
  $c = cfg();
  return array_key_exists($key, $c) ? $c[$key] : $default;
}

