<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();
$db = $app['db'];

$gw = $db->table('payment_gateway')->where('title','Razorpay')->first();
if (!$gw) {
  echo "NO_GATEWAY\n";
  exit(0);
}

echo "GATEWAY_ACTIVE=" . (int)$gw->is_active . "\n";

// --- Credential sanity checks ---
$key    = $gw->key    ?? '';
$secret = $gw->secret ?? '';
$keyOk  = preg_match('/^rzp_(test|live)_[A-Za-z0-9]{14,}$/', $key);
$secOk  = strlen($secret) >= 18 && $secret !== str_repeat('x', strlen($secret));
echo "KEY_FORMAT_VALID=" . (int)$keyOk . " (value: " . substr($key, 0, 16) . "...)\n";
echo "SECRET_LENGTH=" . strlen($secret) . " (expected 18+, is_placeholder=" . (int)($secret === str_repeat('x', strlen($secret))) . ")\n";

if (!$keyOk || !$secOk) {
  echo "CREDENTIAL_STATUS=PLACEHOLDER_OR_INVALID — update in your Razorpay dashboard then save to the payment_gateway table\n";
  exit(0);
}

// --- Live Razorpay API call ---
$payload = json_encode(['amount' => 100, 'currency' => 'INR', 'receipt' => 'diag_' . time()]);
$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_USERPWD        => $key . ':' . $secret,
  CURLOPT_TIMEOUT        => 15,
]);
$res  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$ch   = null;
$json = json_decode($res, true) ?? [];

echo "RAZORPAY_ORDER_HTTP=" . $code . "\n";
if ($code >= 200 && $code < 300) {
  echo "RAZORPAY_ORDER_OK=1\n";
  echo "RAZORPAY_ORDER_ID=" . ($json['id'] ?? 'UNKNOWN') . "\n";
  echo "CREDENTIAL_STATUS=VALID\n";
} else {
  echo "RAZORPAY_ORDER_OK=0\n";
  echo "RAZORPAY_ERROR=" . ($json['error']['description'] ?? 'unknown') . "\n";
  echo "CREDENTIAL_STATUS=REJECTED_BY_RAZORPAY\n";
}

// --- Webhook test (only if credential check passed) ---
$before = $db->table('webhook_log')->count();
$body = json_encode([
  'event' => 'payment.authorized',
  'payload' => [
    'payment' => [
      'entity' => [
        'id'     => 'pay_diag_' . time(),
        'status' => 'authorized',
        'notes'  => ['type' => 'Wallet', 'payload' => '{}'],
      ],
    ],
  ],
]);
$sig  = hash_hmac('sha256', $body, $gw->webhook_secret_key ?? '');
$ch2  = curl_init('https://api.gentrx.ph/api/v1/rz_webhook');
curl_setopt_array($ch2, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $body,
  CURLOPT_HTTPHEADER     => [
    'Content-Type: application/json',
    'X-Razorpay-Signature: ' . $sig,
  ],
  CURLOPT_TIMEOUT => 20,
]);
$res2  = curl_exec($ch2);
$code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
$ch2   = null;
$after = $db->table('webhook_log')->count();

echo "WEBHOOK_HTTP="           . $code2 . "\n";
echo "WEBHOOK_LOG_INCREMENT="  . (int)($after > $before) . "\n";


echo "RAZORPAY_ORDER_HTTP=" . $code . "\n";
if ($code >= 200 && $code < 300) {
  echo "RAZORPAY_ORDER_OK=1\n";
  echo "RAZORPAY_ORDER_ID=" . ($json['id'] ?? 'UNKNOWN') . "\n";
} else {
  echo "RAZORPAY_ORDER_OK=0\n";
}

$before = $db->table('webhook_log')->count();
$body = json_encode([
  'event' => 'payment.authorized',
  'payload' => [
    'payment' => [
      'entity' => [
        'id' => 'pay_diag_' . time(),
        'status' => 'authorized',
        'notes' => [
          'type' => 'Wallet',
          'payload' => '{}'
        ]
      ]
    ]
  ]
]);
$sig = hash_hmac('sha256', $body, $gw->webhook_secret_key);
$ch2 = curl_init('https://api.gentrx.ph/api/v1/rz_webhook');
curl_setopt_array($ch2, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $body,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'X-Razorpay-Signature: ' . $sig,
  ],
  CURLOPT_TIMEOUT => 20,
]);
$res2 = curl_exec($ch2);
$code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
// curl_close() is deprecated in newer PHP versions; releasing the handle is enough.
$ch2 = null;
$after = $db->table('webhook_log')->count();

echo "WEBHOOK_HTTP=" . $code2 . "\n";
echo "WEBHOOK_LOG_INCREMENT=" . ($after > $before ? 1 : 0) . "\n";
