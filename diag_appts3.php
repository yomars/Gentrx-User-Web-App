<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Users table (all) ===\n";
$users = DB::select("SELECT id, f_name, l_name, email, phone FROM users ORDER BY id DESC LIMIT 20");
foreach ($users as $u) {
    echo "user_id={$u->id} name={$u->f_name} {$u->l_name} email={$u->email} phone={$u->phone}\n";
}

echo "\n=== Patients with NULL user_id ===\n";
$pats = DB::select("SELECT id, patient_code, f_name, l_name, user_id FROM patients WHERE user_id IS NULL OR user_id = ''");
foreach ($pats as $p) {
    echo "patient_id={$p->id} patient_code={$p->patient_code} name={$p->f_name} {$p->l_name} user_id={$p->user_id}\n";
}
