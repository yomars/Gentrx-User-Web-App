<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Check time_start format in intervals
$intervals = \Illuminate\Support\Facades\DB::table("doctor_time_intervals")->select("time_start","time_end")->limit(3)->get();
echo "time intervals: " . json_encode($intervals) . "\n";

// Check what get_booked_time_slots returns for any existing appointment
$booked = \Illuminate\Support\Facades\DB::table("appointments")
    ->select(\Illuminate\Support\Facades\DB::raw("TO_CHAR(appointments.time_slots, 'HH24:MI') as time_slots"), "appointments.date", "appointments.type")
    ->where("appointments.status", "!=", 'Rejected')
    ->where("appointments.status", "!=", 'Completed')
    ->where("appointments.status", "!=", 'Cancelled')
    ->limit(3)->get();
echo "booked slots sample: " . json_encode($booked) . "\n";

// Also show raw time_slots value
$raw = \Illuminate\Support\Facades\DB::table("appointments")->select("time_slots")->limit(3)->get();
echo "raw time_slots: " . json_encode($raw) . "\n";
