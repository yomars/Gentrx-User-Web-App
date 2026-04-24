<?php
$file = '/opt/gentrx-api/app/Http/Controllers/Api/V1/AppointmentController.php';
$content = file_get_contents($file);
$old = 'DB::raw(\'TIME_FORMAT(appointments.time_slots, "%H:%i") as time_slots\')';
$new = 'DB::raw(\'TO_CHAR(appointments.time_slots::time, \'\'HH24:MI\'\') as time_slots\')';
if (strpos($content, $old) !== false) {
    file_put_contents($file, str_replace($old, $new, $content));
    echo "Fixed OK\n";
} else {
    echo "String not found - checking raw...\n";
    // Try without the DB::raw wrapper
    $old2 = 'TIME_FORMAT(appointments.time_slots, "%H:%i") as time_slots';
    $new2 = 'TO_CHAR(appointments.time_slots::time, \'HH24:MI\') as time_slots';
    if (strpos($content, $old2) !== false) {
        file_put_contents($file, str_replace($old2, $new2, $content));
        echo "Fixed OK (raw match)\n";
    } else {
        echo "ERROR: Could not find pattern\n";
        // Print line 576 area for debugging
        $lines = explode("\n", $content);
        for ($i = 573; $i < 580; $i++) {
            echo ($i+1) . ': ' . $lines[$i] . "\n";
        }
    }
}
