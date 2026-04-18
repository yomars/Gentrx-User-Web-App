<?php
chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
use Illuminate\Support\Facades\DB;

echo "=== wallets table columns ===\n";
$cols = DB::select("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='wallets' ORDER BY ordinal_position");
foreach ($cols as $c) {
    echo "{$c->column_name} | {$c->data_type} | " . ($c->character_maximum_length ?? '-') . "\n";
}

echo "\n=== sample wallets rows ===\n";
$rows = DB::select('SELECT id, patient_id FROM wallets LIMIT 5');
foreach ($rows as $r) {
    echo "wallet_id={$r->id} | patient_id={$r->patient_id}\n";
}

echo "\n=== check patient_code for those patient_ids ===\n";
foreach ($rows as $r) {
    $p = DB::select('SELECT id, patient_code FROM patients WHERE id=?', [$r->patient_id]);
    $pc = $p ? $p[0]->patient_code : 'NOT FOUND';
    echo "patient_id={$r->patient_id} => patient_code={$pc}\n";
}
