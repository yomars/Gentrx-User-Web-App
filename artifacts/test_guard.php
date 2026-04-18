<?php
chdir('/opt/gentrx-api');
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Http\Kernel::class)->handle(Illuminate\Http\Request::capture());
$request = Illuminate\Http\Request::create('/api/v1/test', 'GET');
$request->headers->set('Authorization', 'Bearer ed18e9a0813d4d1bee4311162ca856a61a3b5423c5823c23a31f97abdd40e94d');
$auth = app('auth');
$guard = $auth->guard('api');
$guard->setRequest($request);
$ok = $guard->check();
echo "api guard check: " . ($ok ? "PASS" : "FAIL") . PHP_EOL;
if ($ok) { echo "Patient ID: " . $guard->user()->id . PHP_EOL; }

// Also test token driver directly
$token = 'ed18e9a0813d4d1bee4311162ca856a61a3b5423c5823c23a31f97abdd40e94d';
$patient = App\Models\Patient::where('api_token', $token)->first();
echo "Direct DB lookup: " . ($patient ? "FOUND id=" . $patient->id : "NOT FOUND") . PHP_EOL;
