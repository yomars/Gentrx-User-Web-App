<?php
/**
 * Patch wallets.patient_id -> patient_code in WalletController.php
 */
$file = '/opt/gentrx-api/app/Http/Controllers/Api/WalletController.php';
copy($file, $file . '.bak2');
$src = file_get_contents($file);

// ---- index(): fix two JOINs on p.id = w.patient_id ----
// Join in main query
$src = str_replace(
    "->join('patients as p', 'p.id', '=', 'w.patient_id')\n            ->leftJoin('clinics as c', 'c.id', '=', 'p.clinic_id')\n            ->select([",
    "->join('patients as p', 'p.patient_code', '=', 'w.patient_code')\n            ->leftJoin('clinics as c', 'c.id', '=', 'p.clinic_id')\n            ->select([",
    $src
);

// Select field w.patient_id -> w.patient_code
$src = str_replace(
    "                'w.patient_id',\n                'w.balance',",
    "                'w.patient_code',\n                'w.balance',",
    $src
);

// Join in summary query
$src = str_replace(
    "->join('patients as p', 'p.id', '=', 'w.patient_id')\n            ->when(\$clinicId",
    "->join('patients as p', 'p.patient_code', '=', 'w.patient_code')\n            ->when(\$clinicId",
    $src
);

// ---- showByPatient(): fix JOIN + where + insert ----
$src = str_replace(
    "->join('patients as p', 'p.id', '=', 'w.patient_id')\n            ->select([\n                'w.*',",
    "->join('patients as p', 'p.patient_code', '=', 'w.patient_code')\n            ->select([\n                'w.*',",
    $src
);

$src = str_replace(
    "->where('w.patient_id', \$patientId)\n            ->first();",
    "->where('w.patient_code', \$patientId)\n            ->first();",
    $src
);

$src = str_replace(
    "            \$id = DB::table('wallets')->insertGetId([\n                'patient_id' => \$patientId,",
    "            \$id = DB::table('wallets')->insertGetId([\n                'patient_code' => \$patientId,",
    $src
);

// ---- topup(): resolve patient_code before ensureWallet ----
$src = str_replace(
    "        \$walletId = \$this->ensureWallet((int) \$request->patient_id);\n\n        DB::table('wallets')\n            ->where('id', \$walletId)\n            ->increment('balance', \$request->amount",
    "        \$patientRec = DB::table('patients')->where('id', (int) \$request->patient_id)->first();\n        \$patientCode = \$patientRec ? \$patientRec->patient_code : null;\n        if (!\$patientCode) {\n            return response()->json(['response' => 422, 'status' => false, 'message' => 'Patient has no patient_code.'], 422);\n        }\n        \$walletId = \$this->ensureWallet(\$patientCode);\n\n        DB::table('wallets')\n            ->where('id', \$walletId)\n            ->increment('balance', \$request->amount",
    $src
);

// ---- deduct(): resolve patient_code before ensureWallet ----
$src = str_replace(
    "        \$walletId = \$this->ensureWallet((int) \$request->patient_id);\n        \$wallet   = DB::table('wallets')->where('id', \$walletId)->first();",
    "        \$patientRec = DB::table('patients')->where('id', (int) \$request->patient_id)->first();\n        \$patientCode = \$patientRec ? \$patientRec->patient_code : null;\n        if (!\$patientCode) {\n            return response()->json(['response' => 422, 'status' => false, 'message' => 'Patient has no patient_code.'], 422);\n        }\n        \$walletId = \$this->ensureWallet(\$patientCode);\n        \$wallet   = DB::table('wallets')->where('id', \$walletId)->first();",
    $src
);

// ---- ensureWallet(): signature + where + insert ----
$src = str_replace(
    "    private function ensureWallet(int \$patientId): int\n    {\n        \$wallet = DB::table('wallets')->where('patient_id', \$patientId)->first();\n        if (\$wallet) {\n            return \$wallet->id;\n        }\n        return DB::table('wallets')->insertGetId([\n            'patient_id' => \$patientId,",
    "    private function ensureWallet(string \$patientCode): int\n    {\n        \$wallet = DB::table('wallets')->where('patient_code', \$patientCode)->first();\n        if (\$wallet) {\n            return \$wallet->id;\n        }\n        return DB::table('wallets')->insertGetId([\n            'patient_code' => \$patientCode,",
    $src
);

file_put_contents($file, $src);
echo "WalletController.php patched.\n";

// Verify the patch
$check = file_get_contents($file);
$remaining = substr_count($check, "w.patient_id") + substr_count($check, "'patient_id' => \$patientId") + substr_count($check, "ensureWallet(int \$patientId");
echo "Remaining old wallet patient_id refs: $remaining (should be 0)\n";
echo substr_count($check, "w.patient_code") . " occurrences of w.patient_code\n";
echo substr_count($check, "ensureWallet(string \$patientCode") . " ensureWallet(string) signatures\n";
