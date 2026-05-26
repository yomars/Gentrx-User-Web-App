<?php
require '/var/www/gentrx-api/vendor/autoload.php';

// Simulate exactly what ProxyController does for GET get_configurations
$legacyBaseUrl = 'http://127.0.0.1:8088';
$path = 'get_configurations';
$targetUrl = $legacyBaseUrl . '/api/v1/' . ltrim($path, '/');

// Simulate forwarded headers (no host, content-length, connection)
$headers = [
    'accept' => 'application/json, text/plain, */*',
    'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'origin' => 'https://gentrx.ph',
    'referer' => 'https://gentrx.ph/',
    'accept-encoding' => 'gzip, deflate, br',
    'accept-language' => 'en-US,en;q=0.9',
];

$c = new GuzzleHttp\Client([
    'allow_redirects' => false,
    'http_errors'     => false,
    'verify'          => false,
    'timeout'         => 30,
]);

try {
    $response = $c->request('GET', $targetUrl, [
        'body'    => '',
        'headers' => $headers,
    ]);
    echo "STATUS: " . $response->getStatusCode() . PHP_EOL;
    echo "BODY: " . substr($response->getBody(), 0, 200) . PHP_EOL;
} catch (\Exception $e) {
    echo "EXCEPTION: " . get_class($e) . ": " . $e->getMessage() . PHP_EOL;
}
