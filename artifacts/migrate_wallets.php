<?php
chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
use Illuminate\Support\Facades\DB;

echo "=== wallet_transactions columns ===\n";
$cols = DB::select("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='wallet_transactions' ORDER BY ordinal_position");
foreach ($cols as $c) {
    echo "{$c->column_name} | {$c->data_type} | " . ($c->character_maximum_length ?? '-') . "\n";
}

echo "\n=== rename wallets.patient_id -> patient_code ===\n";
try {
    DB::statement("ALTER TABLE wallets RENAME COLUMN patient_id TO patient_code");
    echo "DONE: wallets.patient_id renamed to patient_code\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n=== verify wallets columns after rename ===\n";
$cols2 = DB::select("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='wallets' ORDER BY ordinal_position");
foreach ($cols2 as $c) {
    echo "{$c->column_name} | {$c->data_type} | " . ($c->character_maximum_length ?? '-') . "\n";
}

echo "\n=== sample wallets rows ===\n";
$rows = DB::select('SELECT id, patient_code, balance FROM wallets LIMIT 5');
foreach ($rows as $r) {
    echo "id={$r->id} | patient_code={$r->patient_code} | balance={$r->balance}\n";
}
