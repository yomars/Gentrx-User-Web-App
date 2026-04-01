<?php
require '/opt/gentrx-api/vendor/autoload.php';
$app = require '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make('Illuminate\\Contracts\\Console\\Kernel');
$kernel->bootstrap();
$db = $app->make('db');

echo "PAYMENT_GATEWAYS\n";
foreach ($db->table('payment_gateway')->select('id', 'title', 'is_active', 'updated_at')->orderBy('id')->get() as $row) {
    echo implode("\t", [(string)$row->id, (string)$row->title, (string)$row->is_active, (string)$row->updated_at]) . "\n";
}

echo "WEBHOOK_LOGS\n";
foreach ($db->table('webhook_log')->select('id', 'payment_id', 'status', 'created_at')->orderByDesc('id')->limit(8)->get() as $row) {
    echo implode("\t", [(string)$row->id, (string)$row->payment_id, (string)$row->status, (string)$row->created_at]) . "\n";
}