<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();
$db = $app['db'];

$phone = '9624754190';
$newPassword = '2205';

// Generate the correct bcrypt hash
$passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);

echo "UPDATING PASSWORD FOR PHONE: " . $phone . "\n";
echo "NEW HASH: " . $passwordHash . "\n";

// Update the user
$updated = $db->table('users')
  ->where('phone', $phone)
  ->update(['password' => $passwordHash]);

echo "ROWS_UPDATED: " . $updated . "\n";

if ($updated > 0) {
  // Verify it was updated correctly
  $user = $db->table('users')->where('phone', $phone)->first();
  $verify = password_verify($newPassword, $user->password);
  echo "VERIFICATION_TEST: " . ($verify ? "SUCCESS - Password now works!" : "FAILED") . "\n";
} else {
  echo "UPDATE_FAILED\n";
}
