<?php
/**
 * NeuroBro — Серверный прокси для OpenRouter AI
 * 
 * ИНСТРУКЦИЯ:
 * 1. Получите API-ключ на https://openrouter.ai/keys
 * 2. Вставьте его ниже в переменную $OPENROUTER_API_KEY
 * 3. Загрузите этот файл на хостинг в папку /api/
 * 
 * БЕЗОПАСНОСТЬ:
 * - Ключ хранится ТОЛЬКО на сервере, клиент его НЕ видит
 * - PHP-файлы не отдаются как текст (Apache исполняет их)
 * - Дополнительная защита через .htaccess (только POST-запросы)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

// ╔══════════════════════════════════════════════╗
// ║  ⬇️  ВСТАВЬТЕ СВОЙ КЛЮЧ OPENROUTER СЮДА  ⬇️  ║
// ╚══════════════════════════════════════════════╝
$OPENROUTER_API_KEY = 'sk-or-v1-ВСТАВЬТЕ_СВОЙ_КЛЮЧ_СЮДА';
// ⚠️ Не коммитьте этот файл в git с реальным ключом!

// Простой rate limiting по IP (10 запросов в минуту)
$ip = $_SERVER['REMOTE_ADDR'];
$rateFile = sys_get_temp_dir() . '/neurobro_rate_' . md5($ip);
$now = time();
$requests = [];

if (file_exists($rateFile)) {
    $requests = json_decode(file_get_contents($rateFile), true) ?: [];
    $requests = array_filter($requests, function($t) use ($now) { return $t > $now - 60; });
}

if (count($requests) >= 10) {
    http_response_code(429);
    echo json_encode(['error' => 'Слишком много запросов. Подождите минуту.']);
    exit;
}

$requests[] = $now;
file_put_contents($rateFile, json_encode(array_values($requests)));

// Парсинг запроса
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['messages']) || !is_array($input['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid messages array']);
    exit;
}

// Валидация и очистка сообщений
$messages = [];
foreach ($input['messages'] as $msg) {
    if (!isset($msg['role']) || !isset($msg['content'])) continue;
    if (!in_array($msg['role'], ['system', 'user', 'assistant'])) continue;
    $messages[] = [
        'role' => $msg['role'],
        'content' => mb_substr(trim($msg['content']), 0, 10000) // Лимит 10K символов на сообщение
    ];
}

if (empty($messages)) {
    http_response_code(400);
    echo json_encode(['error' => 'No valid messages']);
    exit;
}

// Разрешённые модели
$allowedModels = [
    'google/gemini-2.5-flash',
    'google/gemini-2.5-pro',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
];
$model = in_array($input['model'] ?? '', $allowedModels) ? $input['model'] : 'google/gemini-2.5-flash';

$payload = json_encode([
    'model' => $model,
    'messages' => $messages,
    'max_tokens' => min((int)($input['max_tokens'] ?? 2048), 4096),
    'temperature' => min(max((float)($input['temperature'] ?? 0.7), 0), 2),
]);

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENROUTER_API_KEY,
        'HTTP-Referer: https://neuro-bro.ru',
        'X-Title: NeuroBro',
    ],
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'AI service unavailable: ' . $curlError]);
    exit;
}

http_response_code($httpCode);
echo $response;
