<?php
$file = '/var/www/gentrx-api/app/Http/Controllers/Api/ProxyController.php';
$content = file_get_contents($file);
// Fix the broken config() call - add quotes around the key
$content = str_replace(
    "config( services.legacy_backend_url)",
    "config('services.legacy_backend_url')",
    $content
);
file_put_contents($file, $content);
// Show result
echo shell_exec("sed -n '14,17p' $file");
// Validate PHP syntax
echo shell_exec("php -l $file");
