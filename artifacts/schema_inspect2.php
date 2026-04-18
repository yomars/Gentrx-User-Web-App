#!/usr/bin/env php
<?php
chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== appointments table columns ===\n";
$cols = DB::select("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='appointments' ORDER BY ordinal_position");
foreach ($cols as $c) {
    $len = $c->character_maximum_length ? "({$c->character_maximum_length})" : "";
    echo "{$c->column_name} | {$c->data_type}{$len}\n";
}

echo "\n=== appointment_invoices patient_id column ===\n";
$cols2 = DB::select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='appointment_invoices' ORDER BY ordinal_position");
foreach ($cols2 as $c) {
    echo "{$c->column_name} | {$c->data_type}\n";
}

echo "\n=== sample rows ===\n";
$rows = DB::select("SELECT id, patient_id FROM appointments ORDER BY id DESC LIMIT 5");
foreach ($rows as $r) {
    echo "appointment_id={$r->id} | patient_id={$r->patient_id}\n";
}

echo "\n=== patient_code samples ===\n";
$patients = DB::select("SELECT id, patient_code FROM patients LIMIT 8");
foreach ($patients as $p) {
    echo "patient.id={$p->id} | patient_code={$p->patient_code}\n";
}

echo "\n=== backend files referencing patient_id in appointments ===\n";
$cmd = "grep -rn 'patient_id' /opt/gentrx-api/app/Http/Controllers/Api/V1/AppointmentController.php 2>&1 | head -20";
echo shell_exec($cmd);
