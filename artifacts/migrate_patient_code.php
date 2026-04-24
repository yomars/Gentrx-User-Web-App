#!/usr/bin/env php
<?php
/**
 * Migration: appointments.patient_id (bigint) → appointments.patient_code (varchar 15)
 *
 * Strategy (zero-data-loss):
 *  1. Add patient_code column
 *  2. Populate from patients.patient_code via join on patients.id = appointments.patient_id
 *  3. Verify no NULLs remain
 *  4. Drop old patient_id column
 */

chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$pdo = DB::connection()->getPdo();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== appointments migration: patient_id (bigint) → patient_code (varchar 15) ===\n\n";

// --- Pre-flight checks ---
$cols = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name='appointments'");
$colNames = array_column($cols, 'column_name');

if (in_array('patient_code', $colNames) && !in_array('patient_id', $colNames)) {
    echo "ALREADY DONE: patient_code column exists and patient_id does not. Nothing to do.\n";
    exit(0);
}

if (in_array('patient_code', $colNames) && in_array('patient_id', $colNames)) {
    echo "PARTIAL state: both patient_id and patient_code exist. Skipping step 1 & 2, checking NULLs...\n";
    goto verify;
}

echo "[1] Checking for orphaned appointments (no matching patient)...\n";
$missing = DB::select("
    SELECT a.id, a.patient_id
    FROM appointments a
    LEFT JOIN patients p ON p.id = a.patient_id
    WHERE a.patient_id IS NOT NULL AND p.id IS NULL
");
if (count($missing) > 0) {
    echo "WARNING: " . count($missing) . " orphaned appointment(s) — patient no longer exists, patient_code will be NULL:\n";
    foreach ($missing as $r) {
        echo "  appointment_id={$r->id} patient_id={$r->patient_id}\n";
    }
    echo "Proceeding (orphaned rows are acceptable).\n";
}

$nullPatient = DB::select("SELECT COUNT(*) as cnt FROM appointments WHERE patient_id IS NULL");
if ($nullPatient[0]->cnt > 0) {
    echo "WARNING: {$nullPatient[0]->cnt} appointments have NULL patient_id — these will get NULL patient_code too.\n";
}

echo "[2] Adding patient_code VARCHAR(15) column...\n";
DB::statement("ALTER TABLE appointments ADD COLUMN patient_code VARCHAR(15)");
echo "    Done.\n";

echo "[3] Populating patient_code from patients table...\n";
$updated = DB::statement("
    UPDATE appointments a
    SET patient_code = p.patient_code
    FROM patients p
    WHERE p.id = a.patient_id
");
$count = DB::select("SELECT COUNT(*) as cnt FROM appointments WHERE patient_code IS NOT NULL");
echo "    Populated {$count[0]->cnt} rows.\n";

verify:
echo "[4] Verifying — checking for NULLs in patient_code where a matching patient exists...\n";
$nullCode = DB::select("
    SELECT COUNT(*) as cnt FROM appointments a
    INNER JOIN patients p ON p.id = a.patient_id
    WHERE a.patient_code IS NULL
");
if ($nullCode[0]->cnt > 0) {
    echo "ERROR: {$nullCode[0]->cnt} rows have a matching patient but patient_code is NULL. Aborting before drop.\n";
    exit(1);
}
echo "    OK — all resolvable patients have patient_code populated.\n";

echo "[5] Sampling before drop:\n";
$sample = DB::select("SELECT id, patient_id, patient_code FROM appointments ORDER BY id DESC LIMIT 5");
foreach ($sample as $r) {
    echo "    appointment_id={$r->id} | old_patient_id={$r->patient_id} | new_patient_code={$r->patient_code}\n";
}

echo "[6] Dropping old patient_id column...\n";
DB::statement("ALTER TABLE appointments DROP COLUMN patient_id");
echo "    Done.\n";

echo "[7] Final verification:\n";
$colsAfter = DB::select("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='appointments' AND column_name IN ('patient_id','patient_code')");
foreach ($colsAfter as $c) {
    $len = $c->character_maximum_length ? "({$c->character_maximum_length})" : "";
    echo "    {$c->column_name} | {$c->data_type}{$len}\n";
}

echo "\nMIGRATION COMPLETE.\n";
