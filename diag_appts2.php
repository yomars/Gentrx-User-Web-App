<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Michael Abejuro specific check
$p = DB::select("SELECT id, patient_code, f_name, l_name, user_id FROM patients WHERE id = 67");
if (!empty($p)) {
    $patient = $p[0];
    echo "Patient: id={$patient->id} patient_code={$patient->patient_code} user_id={$patient->user_id} name={$patient->f_name} {$patient->l_name}\n";
    
    echo "\n=== Appointments by patient_code ===\n";
    $appts = DB::select("SELECT id, patient_code, date, status FROM appointments WHERE patient_code = ?", [$patient->patient_code]);
    echo "Count: " . count($appts) . "\n";
    foreach ($appts as $a) {
        echo "  appt_id={$a->id} patient_code={$a->patient_code} date={$a->date} status={$a->status}\n";
    }
    
    echo "\n=== All appointments (total) ===\n";
    $total = DB::select("SELECT COUNT(*) as cnt FROM appointments");
    echo "Total appointments in DB: {$total[0]->cnt}\n";
    
    echo "\n=== Sample appointments (any) ===\n";
    $sample = DB::select("SELECT id, patient_code, date, status FROM appointments LIMIT 5");
    foreach ($sample as $a) {
        echo "  appt_id={$a->id} patient_code={$a->patient_code} date={$a->date} status={$a->status}\n";
    }
    
    echo "\n=== Full getData query simulation (user_id=67) ===\n";
    $results = DB::table("appointments")
        ->select("appointments.id", "appointments.status", "appointments.date", "appointments.patient_code", "patients.user_id", "patients.f_name", "patients.l_name")
        ->join("patients", "patients.patient_code", "=", "appointments.patient_code")
        ->where("patients.user_id", "=", 67)
        ->orderBy("appointments.date", "DESC")
        ->get();
    echo "Results count: " . count($results) . "\n";
    foreach ($results as $r) {
        echo "  id={$r->id} status={$r->status} date={$r->date} patient_code={$r->patient_code}\n";
    }
} else {
    echo "Patient id=67 not found\n";
}
