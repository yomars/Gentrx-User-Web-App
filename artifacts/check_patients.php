#!/usr/bin/env php
<?php
chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Check patients 8 and 62
$patients = DB::select("SELECT id, f_name, l_name, patient_code, clinic_id FROM patients WHERE id IN (8, 62)");
echo "=== Patients with no patient_code ===\n";
foreach ($patients as $p) {
    echo "id={$p->id} | name={$p->f_name} {$p->l_name} | patient_code=" . ($p->patient_code ?? 'NULL') . " | clinic_id={$p->clinic_id}\n";
}

// Also check what clinic_id-based patient_code format looks like
echo "\n=== Sample patient_codes with clinic_id ===\n";
$samples = DB::select("SELECT id, patient_code, clinic_id FROM patients WHERE patient_code IS NOT NULL LIMIT 10");
foreach ($samples as $p) {
    echo "id={$p->id} | patient_code={$p->patient_code} | clinic_id={$p->clinic_id}\n";
}

// Check how patient_code is generated (look at max per clinic)
echo "\n=== Max patient_code per clinic ===\n";
$maxCodes = DB::select("SELECT clinic_id, MAX(patient_code) as max_code, COUNT(*) as cnt FROM patients WHERE patient_code IS NOT NULL GROUP BY clinic_id");
foreach ($maxCodes as $r) {
    echo "clinic_id={$r->clinic_id} | max_code={$r->max_code} | count={$r->cnt}\n";
}
