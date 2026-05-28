<?php
$content = file_get_contents('/var/www/gentrx-api/config/services.php');
$patch = "    'legacy_backend_url' => env('LEGACY_BACKEND_URL', 'http://127.0.0.1:8088'),\n";
$new = str_replace("    'movider' => [", $patch . "    'movider' => [", $content);
if ($new === $content) {
    // Already patched or different format — append before closing bracket
    echo "WARNING: could not find insertion point, checking...\n";
    echo $content;
} else {
    file_put_contents('/var/www/gentrx-api/config/services.php', $new);
    echo "done";
}
