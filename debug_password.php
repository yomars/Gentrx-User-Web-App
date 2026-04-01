<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();
$db = $app['db'];

$phone = '9624754190';
$password = '2205';

// Get the user
$user = $db->table('users')->where('phone', $phone)->first();

if (!$user) {
  echo "USER_NOT_FOUND\n";
  exit(0);
}

echo "=== STORED DATA ===\n";
echo "ID: " . $user->id . "\n";
echo "PHONE: " . $user->phone . "\n";
echo "NAME: " . $user->f_name . " " . $user->l_name . "\n";
echo "FULL_PASSWORD_HASH: " . $user->password . "\n";

echo "\n=== VERIFICATION TESTS ===\n";

// Test 1: password_verify
$verify = password_verify($password, $user->password);
echo "password_verify('2205', hash): " . ($verify ? "TRUE" : "FALSE") . "\n";

// Test 2: plain comparison
$plain = ($user->password === $password);
echo "Direct comparison (===): " . ($plain ? "TRUE" : "FALSE") . "\n";

// Test 3: hash info
$info = password_get_info($user->password);
echo "Hash algorithm: " . ($info['algo'] === PASSWORD_BCRYPT ? "BCRYPT" : "OTHER") . "\n";

// Try to see if maybe it was hashed differently
// Hash the password with bcrypt to see what it should be
$newHash = password_hash($password, PASSWORD_BCRYPT);
echo "\n=== NEW HASH ATTEMPT ===\n";
echo "If '2205' was hashed with PASSWORD_BCRYPT: " . $newHash . "\n";
echo "Does NEW hash verify against '2205': " . (password_verify($password, $newHash) ? "TRUE" : "FALSE") . "\n";
