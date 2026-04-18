#!/usr/bin/env php
<?php
chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
use Illuminate\Support\Facades\DB;
$rows = DB::select('SELECT id, patient_code FROM appointments ORDER BY id DESC LIMIT 6');
foreach ($rows as $r) {
    echo "appointment_id={$r->id} | patient_code=" . ($r->patient_code ?? 'NULL') . "\n";
}
// Clean up test appointment
DB::delete('DELETE FROM appointments WHERE id=5');
echo "Test appointment 5 deleted.\n";
