<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Check column type
$rows = \Illuminate\Support\Facades\DB::select(
    "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'appointments' AND column_name LIKE '%time%'"
);
foreach ($rows as $r) {
    echo $r->column_name . ' => ' . $r->data_type . ' (' . $r->udt_name . ')' . "\n";
}

// Try the actual query
try {
    $data = \Illuminate\Support\Facades\DB::table("appointments")
        ->select(\Illuminate\Support\Facades\DB::raw("TO_CHAR(appointments.time_slots, 'HH24:MI') as time_slots"))
        ->limit(1)->get();
    echo "TO_CHAR direct: OK\n";
} catch (\Exception $e) {
    echo "TO_CHAR direct ERROR: " . $e->getMessage() . "\n";
}

try {
    $data = \Illuminate\Support\Facades\DB::table("appointments")
        ->select(\Illuminate\Support\Facades\DB::raw("TO_CHAR(appointments.time_slots::time, 'HH24:MI') as time_slots"))
        ->limit(1)->get();
    echo "TO_CHAR ::time cast: OK\n";
} catch (\Exception $e) {
    echo "TO_CHAR ::time cast ERROR: " . $e->getMessage() . "\n";
}

try {
    $data = \Illuminate\Support\Facades\DB::table("appointments")
        ->select(\Illuminate\Support\Facades\DB::raw("appointments.time_slots"))
        ->limit(1)->get();
    echo "Raw time_slots: " . json_encode($data) . "\n";
} catch (\Exception $e) {
    echo "Raw ERROR: " . $e->getMessage() . "\n";
}
