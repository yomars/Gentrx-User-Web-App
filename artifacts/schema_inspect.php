#!/usr/bin/env php
<?php
require '/opt/gentrx-api/bootstrap/app.php';
$app = app();
$db = $app->make('db');

echo "=== appointments table columns ===\n";
$cols = $db->select("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name='appointments' ORDER BY ordinal_position");
foreach ($cols as $c) {
    echo "{$c->column_name} | {$c->data_type}" . ($c->character_maximum_length ? " ({$c->character_maximum_length})" : "") . "\n";
}

echo "\n=== patient_id references in appointment_invoices ===\n";
$cols2 = $db->select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='appointment_invoices' AND column_name IN ('patient_id', 'user_id') ORDER BY ordinal_position");
foreach ($cols2 as $c) {
    echo "{$c->column_name} | {$c->data_type}\n";
}

echo "\n=== sample appointments.patient_id values ===\n";
$rows = $db->select("SELECT id, patient_id FROM appointments LIMIT 5");
foreach ($rows as $r) {
    echo "id={$r->id} | patient_id={$r->patient_id}\n";
}

echo "\n=== patients sample (id + patient_code) ===\n";
$patients = $db->select("SELECT id, patient_code FROM patients WHERE id IN (SELECT DISTINCT patient_id FROM appointments) LIMIT 5");
foreach ($patients as $p) {
    echo "id={$p->id} | patient_code={$p->patient_code}\n";
}
