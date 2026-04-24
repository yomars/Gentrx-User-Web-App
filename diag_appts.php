<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Get patient info
$patients = DB::select("SELECT id, patient_code, f_name, l_name FROM patients ORDER BY id DESC LIMIT 10");
echo "=== PATIENTS ===\n";
foreach ($patients as $p) {
    echo "id={$p->id} patient_code={$p->patient_code} name={$p->f_name} {$p->l_name}\n";
}

// Get appointments for first patient
if (!empty($patients)) {
    $pid = $patients[0]->id;
    $pcode = $patients[0]->patient_code;
    echo "\n=== APPOINTMENTS for patient_code=$pcode (id=$pid) ===\n";
    $appts = DB::select("SELECT id, patient_code, date, status FROM appointments WHERE patient_code = ? LIMIT 5", [$pcode]);
    foreach ($appts as $a) {
        echo "appt_id={$a->id} patient_code={$a->patient_code} date={$a->date} status={$a->status}\n";
    }
    
    // Also check by id
    echo "\n=== APPOINTMENTS where patient_code = id ($pid) ===\n";
    $appts2 = DB::select("SELECT id, patient_code, date, status FROM appointments WHERE patient_code = ? LIMIT 5", [$pid]);
    foreach ($appts2 as $a) {
        echo "appt_id={$a->id} patient_code={$a->patient_code} date={$a->date} status={$a->status}\n";
    }
}

// Show appointments table columns
echo "\n=== APPOINTMENTS COLUMNS ===\n";
$cols = DB::select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='appointments' ORDER BY ordinal_position");
foreach ($cols as $c) {
    echo "{$c->column_name} ({$c->data_type})\n";
}
