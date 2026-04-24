<?php
/**
 * Patch wallets.patient_id -> patient_code in PaymentController.php
 */
$file = '/opt/gentrx-api/app/Http/Controllers/Api/PaymentController.php';
copy($file, $file . '.bak2');
$src = file_get_contents($file);
// Normalize CRLF
$src = str_replace("\r\n", "\n", $src);

$old = <<<'PHP'
    private function deductFromWallet(int $patientId, float $amount, ?int $appointmentId, string $description): void
    {
        // Ensure wallet exists
        $wallet = DB::table('wallets')->where('patient_id', $patientId)->first();
        if (!$wallet) {
            $walletId = DB::table('wallets')->insertGetId([
                'patient_id' => $patientId,
                'balance'    => 0,
                'currency'   => 'PHP',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        } else {
            $walletId = $wallet->id;
        }
PHP;

$new = <<<'PHP'
    private function deductFromWallet(int $patientId, float $amount, ?int $appointmentId, string $description): void
    {
        // Resolve patient_code for wallet lookup (wallets keyed by patient_code VARCHAR)
        $patientCode = DB::table('patients')->where('id', $patientId)->value('patient_code');

        // Ensure wallet exists
        $wallet = $patientCode ? DB::table('wallets')->where('patient_code', $patientCode)->first() : null;
        if (!$wallet) {
            $walletId = DB::table('wallets')->insertGetId([
                'patient_code' => $patientCode,
                'balance'    => 0,
                'currency'   => 'PHP',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        } else {
            $walletId = $wallet->id;
        }
PHP;

$count = substr_count($src, $old);
if ($count !== 1) {
    echo "ERROR: pattern matched $count times (expected 1)\n";
    exit(1);
}
$src = str_replace($old, $new, $src);
file_put_contents($file, $src);
echo "PaymentController.php patched.\n";

// Verify
$check = file_get_contents($file);
$rem = substr_count($check, "wallets')->where('patient_id'") + substr_count($check, "'patient_id' => \$patientId,\n                'balance'");
echo "Remaining old wallet patient_id refs in deductFromWallet: $rem (should be 0)\n";
echo substr_count($check, "patient_code") . " occurrences of patient_code\n";
