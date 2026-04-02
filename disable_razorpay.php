<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();
$db = $app['db'];

echo "=== Disabling Razorpay Gateway ===\n\n";

// Check if Razorpay gateway exists
$gw = $db->table('payment_gateway')->where('title', 'Razorpay')->first();
if (!$gw) {
  echo "ERROR: Razorpay gateway not found in database\n";
  exit(1);
}

echo "Gateway found: ID=" . $gw->id . ", is_active=" . (int)$gw->is_active . "\n";

if ((int)$gw->is_active === 0) {
  echo "INFO: Razorpay is already disabled\n";
  exit(0);
}

// Disable Razorpay
$updated = $db->table('payment_gateway')
  ->where('title', 'Razorpay')
  ->update(['is_active' => 0]);

if ($updated) {
  echo "SUCCESS: Razorpay has been disabled\n";
  
  // Verify the change
  $verifyGw = $db->table('payment_gateway')->where('title', 'Razorpay')->first();
  echo "Verification: is_active=" . (int)$verifyGw->is_active . "\n";
  exit(0);
} else {
  echo "ERROR: Failed to update payment_gateway table\n";
  exit(1);
}
?>
