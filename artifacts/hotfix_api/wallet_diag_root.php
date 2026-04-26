#!/usr/bin/env php
<?php
$root = $argv[1] ?? '/opt/gentrx-api';
chdir($root);
require $root . '/vendor/autoload.php';
$app = require_once $root . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

function hasColumn(string $table, string $column): bool {
  $rows = DB::select("SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ? LIMIT 1", [$table, $column]);
  return count($rows) > 0;
}

echo "=== root: {$root} ===\n";
$dbName = DB::select("SELECT current_database() AS db")[0]->db ?? 'unknown';
echo "db: {$dbName}\n";

echo "\n=== wallets columns ===\n";
$cols = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name='wallets' ORDER BY ordinal_position");
foreach ($cols as $c) {
  echo "{$c->column_name}\n";
}

$walletSelectCols = ['id', 'balance', 'created_at', 'updated_at'];
if (hasColumn('wallets', 'patient_code')) { $walletSelectCols[] = 'patient_code'; }
if (hasColumn('wallets', 'owner_id')) { $walletSelectCols[] = 'owner_id'; }
if (hasColumn('wallets', 'owner_type')) { $walletSelectCols[] = 'owner_type'; }

$walletSql = "SELECT " . implode(',', $walletSelectCols) . " FROM wallets ORDER BY id DESC LIMIT 20";

echo "\n=== recent wallets ===\n";
$wallets = DB::select($walletSql);
foreach ($wallets as $w) {
  echo json_encode($w) . "\n";
}

echo "\n=== recent wallet txns in all_transaction ===\n";
$txns = DB::select("SELECT id,user_id,patient_id,amount,transaction_type,is_wallet_txn,last_wallet_amount,new_wallet_amount,payment_transaction_id,created_at FROM all_transaction WHERE is_wallet_txn=1 ORDER BY id DESC LIMIT 10");
foreach ($txns as $t) {
  echo json_encode($t) . "\n";
}

echo "\n=== recent patients (id,user_id,patient_code) ===\n";
$patients = DB::select("SELECT id,user_id,patient_code,f_name,l_name FROM patients ORDER BY id DESC LIMIT 20");
foreach ($patients as $p) {
  echo json_encode($p) . "\n";
}
