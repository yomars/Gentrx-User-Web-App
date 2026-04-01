<?php
$env = [];
foreach (file('/opt/gentrx-api/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
        continue;
    }
    [$key, $value] = explode('=', $line, 2);
    $env[trim($key)] = trim($value, "\"'");
}
$mysqli = new mysqli($env['DB_HOST'] ?? '127.0.0.1', $env['DB_USERNAME'] ?? '', $env['DB_PASSWORD'] ?? '', $env['DB_DATABASE'] ?? '', (int)($env['DB_PORT'] ?? 3306));
if ($mysqli->connect_errno) {
    fwrite(STDERR, "DB_CONNECT_ERROR\n");
    exit(1);
}
$gateway = $mysqli->query("select id,title,is_active,updated_at from payment_gateway order by id");
echo "PAYMENT_GATEWAYS\n";
while ($row = $gateway->fetch_assoc()) {
    echo implode("\t", $row) . "\n";
}
$webhooks = $mysqli->query("select id,payment_id,status,created_at from webhook_log order by id desc limit 8");
echo "WEBHOOK_LOGS\n";
while ($row = $webhooks->fetch_assoc()) {
    echo implode("\t", $row) . "\n";
}