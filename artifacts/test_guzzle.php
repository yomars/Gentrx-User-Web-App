<?php
require '/var/www/gentrx-api/vendor/autoload.php';
$c = new GuzzleHttp\Client(['allow_redirects'=>false,'http_errors'=>false,'verify'=>false,'timeout'=>10]);
$r = $c->get('http://127.0.0.1:8088/api/v1/get_configurations');
echo $r->getStatusCode() . PHP_EOL;
echo substr($r->getBody(), 0, 200) . PHP_EOL;
