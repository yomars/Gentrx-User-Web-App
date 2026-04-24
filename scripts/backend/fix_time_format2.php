<?php
$file = '/opt/gentrx-api/app/Http/Controllers/Api/V1/AppointmentController.php';

// Restore from backup first
copy($file . '.bak', $file);
echo "Restored from backup\n";

$content = file_get_contents($file);

// The broken old line uses single quotes, replace with double-quoted string to avoid quoting issues
$old = "DB::raw('TIME_FORMAT(appointments.time_slots, \"%H:%i\") as time_slots')";
$new = "DB::raw(\"TO_CHAR(appointments.time_slots, 'HH24:MI') as time_slots\")";

if (strpos($content, $old) !== false) {
    file_put_contents($file, str_replace($old, $new, $content));
    echo "Fixed OK\n";
} else {
    echo "Pattern not found, current line 576:\n";
    $lines = explode("\n", $content);
    echo $lines[575] . "\n";
}
