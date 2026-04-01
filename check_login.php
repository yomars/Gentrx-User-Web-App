<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();
$db = $app['db'];

$phone = '9624754190';
$password = '2205';

// Check if user exists
$user = $db->table('users')->where('phone', $phone)->first();

if (!$user) {
  echo "USER_EXISTS=0\n";
  echo "USER_NOT_FOUND=1\n";
  exit(0);
}

echo "USER_EXISTS=1\n";
echo "USER_ID=" . $user->id . "\n";
echo "USER_NAME=" . $user->f_name . " " . $user->l_name . "\n";
echo "USER_PHONE=" . $user->phone . "\n";
echo "STORED_PASSWORD_HASH=" . substr($user->password, 0, 20) . "...\n";

// Check if password matches
$passwordMatches = password_verify($password, $user->password);
echo "PASSWORD_MATCHES=" . ($passwordMatches ? 1 : 0) . "\n";

// Also check if it's a simple comparison (some apps store plain text)
if ($user->password === $password) {
  echo "PASSWORD_PLAIN_MATCH=1\n";
} else {
  echo "PASSWORD_PLAIN_MATCH=0\n";
}

// Try to hash the password with the same algo and see if it matches
echo "PASSWORD_HASH_ALGO=" . password_get_info($user->password)['algo'] . "\n";
