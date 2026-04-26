#!/usr/bin/env php
<?php
chdir('/opt/gentrx-api');
require '/opt/gentrx-api/vendor/autoload.php';
$app = require_once '/opt/gentrx-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== recent all_transaction (wallet) ===\n";
$txns = DB::select("\n  SELECT id, user_id, patient_id, amount, transaction_type, is_wallet_txn,\n         last_wallet_amount, new_wallet_amount, payment_transaction_id, created_at\n  FROM all_transaction\n  WHERE is_wallet_txn = 1\n  ORDER BY id DESC\n  LIMIT 20\n");
foreach ($txns as $t) {
  echo "id={$t->id} user_id={$t->user_id} patient_id={$t->patient_id} amt={$t->amount} type={$t->transaction_type} last={$t->last_wallet_amount} new={$t->new_wallet_amount} pay_id={$t->payment_transaction_id} at={$t->created_at}\n";
}

echo "\n=== recent wallets ===\n";
$wallets = DB::select("\n  SELECT id, patient_code, owner_id, owner_type, balance, created_at, updated_at\n  FROM wallets\n  ORDER BY id DESC\n  LIMIT 30\n");
foreach ($wallets as $w) {
  $pc = $w->patient_code ?? 'NULL';
  $oi = $w->owner_id ?? 'NULL';
  $ot = $w->owner_type ?? 'NULL';
  echo "id={$w->id} patient_code={$pc} owner_id={$oi} owner_type={$ot} balance={$w->balance} updated={$w->updated_at}\n";
}

echo "\n=== recent patients map ===\n";
$patients = DB::select("\n  SELECT id, user_id, patient_code, f_name, l_name, clinic_id\n  FROM patients\n  ORDER BY id DESC\n  LIMIT 30\n");
foreach ($patients as $p) {
  echo "id={$p->id} user_id={$p->user_id} patient_code={$p->patient_code} name={$p->f_name} {$p->l_name} clinic={$p->clinic_id}\n";
}

echo "\n=== join check (wallets by patient_code) ===\n";
$joined = DB::select("\n  SELECT p.id AS patient_id, p.user_id, p.patient_code, w.id AS wallet_id, w.balance, w.owner_id, w.owner_type, w.updated_at\n  FROM patients p\n  LEFT JOIN wallets w ON (w.patient_code = p.patient_code OR w.owner_id = p.patient_code)\n  ORDER BY w.updated_at DESC NULLS LAST\n  LIMIT 40\n");
foreach ($joined as $j) {
  $wid = $j->wallet_id ?? 'NULL';
  $bal = $j->balance ?? 'NULL';
  $oi = $j->owner_id ?? 'NULL';
  $ot = $j->owner_type ?? 'NULL';
  $up = $j->updated_at ?? 'NULL';
  echo "patient_id={$j->patient_id} user_id={$j->user_id} patient_code={$j->patient_code} wallet_id={$wid} balance={$bal} owner_id={$oi} owner_type={$ot} updated={$up}\n";
}
