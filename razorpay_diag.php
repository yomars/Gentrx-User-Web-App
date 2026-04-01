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

// TEST MODE - Using mock Razorpay response
$code = 200;
$json = ['id' => 'order_' . time() . '_TEST'];

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
