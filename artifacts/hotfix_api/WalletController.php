<?php
// app/Http/Controllers/Api/WalletController.php
// Deploy to: app/Http/Controllers/Api/WalletController.php on your Laravel server
//
// Provides:
//   GET  /api/v1/get_wallet               — paginated wallet list with search & clinic
//   GET  /api/v1/get_wallet/{patient_id}  — single patient's wallet
//   GET  /api/v1/get_wallet_transaction   — paginated wallet transaction list
//   POST /api/v1/wallet_topup             — credit patient wallet (admin top-up)
//   POST /api/v1/wallet_deduct            — manually deduct from patient wallet

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class WalletController extends Controller
{
    // -----------------------------------------------------------------------
    // GET /api/v1/get_wallet
    // Query params: start, end, search, clinic_id
    // -----------------------------------------------------------------------
    public function index(Request $request)
    {
        $start    = (int) $request->query('start', 0);
        $end      = (int) $request->query('end',   49);
        $limit    = $end - $start + 1;
        $search   = trim($request->query('search', ''));
        $clinicId = $request->query('clinic_id');

        $query = DB::table('wallets as w')
            ->join('patients as p', 'p.patient_code', '=', 'w.patient_code')
            ->leftJoin('clinics as c', 'c.id', '=', 'p.clinic_id')
            ->select([
                'w.id',
                'w.patient_code',
                'w.balance',
                'w.currency',
                'w.created_at',
                'w.updated_at',
                DB::raw("CONCAT(p.f_name, ' ', p.l_name) AS patient_name"),
                'c.title AS clinic_name',
            ]);

        if ($clinicId) {
            $query->where('p.clinic_id', $clinicId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereRaw("CONCAT(p.f_name, ' ', p.l_name) LIKE ?", ["%{$search}%"])
                  ->orWhere('w.currency', 'LIKE', "%{$search}%");
            });
        }

        $total   = $query->count();
        $wallets = $query
            ->orderByDesc('w.updated_at')
            ->skip($start)
            ->take($limit)
            ->get();

        // Summary stats
        $summary = DB::table('wallets as w')
            ->join('patients as p', 'p.patient_code', '=', 'w.patient_code')
            ->when($clinicId, fn($q) => $q->where('p.clinic_id', $clinicId))
            ->selectRaw('SUM(w.balance) AS total_balance, COUNT(*) AS active_wallets')
            ->first();

        return response()->json([
            'response'     => 200,
            'status'       => true,
            'data'         => $wallets,
            'total_record' => $total,
            'summary'      => $summary,
        ]);
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/get_wallet/{patient_id}
    // Returns the wallet for a specific patient (creates one if missing)
    // -----------------------------------------------------------------------
    public function showByPatient($patientId)
    {
        // Support either numeric patient ID or patient_code in the URL.
        $patientQuery = DB::table('patients');
        if (is_numeric($patientId)) {
            $patientQuery->where('id', (int) $patientId);
        } else {
            $patientQuery->where('patient_code', $patientId);
        }

        $patient = $patientQuery->first();
        if (!$patient || !$patient->patient_code) {
            return response()->json(['response' => 404, 'status' => false, 'message' => 'Patient not found.'], 404);
        }
        $patientCode = $patient->patient_code;
        $hasPatientCode = Schema::hasColumn('wallets', 'patient_code');
        $hasOwnerId = Schema::hasColumn('wallets', 'owner_id');
        $hasOwnerType = Schema::hasColumn('wallets', 'owner_type');

        $walletQuery = DB::table('wallets')->select('*');
        if ($hasPatientCode) {
            $walletQuery->where('patient_code', $patientCode);
        } elseif ($hasOwnerId) {
            // owner_id can be either numeric patient id or patient_code depending on migration state.
            $walletQuery->where(function ($q) use ($patient, $patientCode) {
                $q->where('owner_id', (string) $patient->id)
                  ->orWhere('owner_id', $patientCode);
            });
        }

        if ($hasOwnerType) {
            $walletQuery->where('owner_type', 'patient');
        }

        $wallet = $walletQuery->orderByDesc('id')->first();

        if (!$wallet) {
            // Auto-create wallet on first access
            $insert = [
                'balance'    => 0.00,
                'currency'   => 'PHP',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ];

            if ($hasPatientCode) {
                $insert['patient_code'] = $patientCode;
            }

            if ($hasOwnerId) {
                // Store patient_code in owner_id to remain compatible with current production data shape.
                $insert['owner_id'] = $patientCode;
            }

            if ($hasOwnerType) {
                $insert['owner_type'] = 'patient';
            }

            $id = DB::table('wallets')->insertGetId($insert);
            $wallet = DB::table('wallets')->where('id', $id)->first();
        }

        if ($wallet) {
            $wallet->patient_name = trim(($patient->f_name ?? '') . ' ' . ($patient->l_name ?? ''));
        }

        return response()->json(['response' => 200, 'status' => true, 'data' => $wallet]);
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/get_wallet_transaction
    // Query params: start, end, search, clinic_id, patient_id
    // -----------------------------------------------------------------------
    public function transactions(Request $request)
    {
        $start     = (int) $request->query('start', 0);
        $end       = (int) $request->query('end',   49);
        $limit     = $end - $start + 1;
        $search    = trim($request->query('search', ''));
        $clinicId  = $request->query('clinic_id');
        $patientId = $request->query('patient_id');

        $query = DB::table('wallet_transactions as wt')
            ->join('wallets as w',   'w.id',  '=', 'wt.wallet_id')
            ->join('patients as p',  'p.id',  '=', 'wt.patient_id')
            ->leftJoin('clinics as c', 'c.id', '=', 'p.clinic_id')
            ->select([
                'wt.id',
                'wt.wallet_id',
                'wt.appointment_id',
                'wt.amount',
                'wt.type',
                'wt.description',
                'wt.created_at',
                'wt.updated_at',
                DB::raw("CONCAT(p.f_name, ' ', p.l_name) AS patient_name"),
                'wt.patient_id',
                'c.title AS clinic_name',
            ]);

        if ($clinicId) {
            $query->where('p.clinic_id', $clinicId);
        }

        if ($patientId) {
            $query->where('wt.patient_id', $patientId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('wt.type',        'LIKE', "%{$search}%")
                  ->orWhere('wt.description','LIKE', "%{$search}%")
                  ->orWhereRaw("CONCAT(p.f_name, ' ', p.l_name) LIKE ?", ["%{$search}%"]);
            });
        }

        $total        = $query->count();
        $transactions = $query
            ->orderByDesc('wt.created_at')
            ->skip($start)
            ->take($limit)
            ->get();

        return response()->json([
            'response'     => 200,
            'status'       => true,
            'data'         => $transactions,
            'total_record' => $total,
        ]);
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/wallet_topup
    // Admin credits a patient's wallet
    // -----------------------------------------------------------------------
    public function topup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id'  => 'required|integer',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'clinic_id'   => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => $validator->errors()->first(),
            ], 422);
        }

        $this->ensurePatientExists(
            (int) $request->patient_id,
            $request->clinic_id ? (int) $request->clinic_id : null
        );

        $topupPatient = DB::table('patients')->where('id', $request->patient_id)->first();
        if (!$topupPatient || !$topupPatient->patient_code) {
            return response()->json(['response' => 422, 'status' => false, 'message' => 'Patient not found.'], 422);
        }
        $walletId = $this->ensureWallet($topupPatient->patient_code);

        DB::table('wallets')
            ->where('id', $walletId)
            ->increment('balance', $request->amount, ['updated_at' => Carbon::now()]);

        DB::table('wallet_transactions')->insert([
            'wallet_id'   => $walletId,
            'patient_id'  => $request->patient_id,
            'amount'      => $request->amount,
            'type'        => 'topup',
            'description' => $request->description ?? 'Admin wallet top-up',
            'created_at'  => Carbon::now(),
            'updated_at'  => Carbon::now(),
        ]);

        // Record in master transaction ledger
        DB::table('transactions')->insert([
            'transaction_id' => 'TXN-' . Carbon::now()->year . '-' . str_pad(
                DB::table('transactions')->whereYear('created_at', Carbon::now()->year)->count() + 1,
                6, '0', STR_PAD_LEFT
            ),
            'patient_id'     => $request->patient_id,
            'amount'         => $request->amount,
            'type'           => 'credit',
            'status'         => 'success',
            'description'    => $request->description ?? 'Wallet top-up',
            'created_at'     => Carbon::now(),
            'updated_at'     => Carbon::now(),
        ]);

        $newBalance = DB::table('wallets')->where('id', $walletId)->value('balance');

        return response()->json([
            'response'    => 200,
            'status'      => true,
            'message'     => 'Wallet topped up successfully.',
            'new_balance' => $newBalance,
        ]);
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/wallet_deduct
    // Admin manually deducts from a patient's wallet
    // -----------------------------------------------------------------------
    public function deduct(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id'  => 'required|integer',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'clinic_id'   => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => $validator->errors()->first(),
            ], 422);
        }

        $this->ensurePatientExists(
            (int) $request->patient_id,
            $request->clinic_id ? (int) $request->clinic_id : null
        );

        $deductPatient = DB::table('patients')->where('id', $request->patient_id)->first();
        if (!$deductPatient || !$deductPatient->patient_code) {
            return response()->json(['response' => 422, 'status' => false, 'message' => 'Patient not found.'], 422);
        }
        $walletId = $this->ensureWallet($deductPatient->patient_code);
        $wallet   = DB::table('wallets')->where('id', $walletId)->first();

        if ($wallet->balance < $request->amount) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => 'Insufficient wallet balance.',
            ], 422);
        }

        DB::table('wallets')
            ->where('id', $walletId)
            ->decrement('balance', $request->amount, ['updated_at' => Carbon::now()]);

        DB::table('wallet_transactions')->insert([
            'wallet_id'   => $walletId,
            'patient_id'  => $request->patient_id,
            'amount'      => $request->amount,
            'type'        => 'debit',
            'description' => $request->description ?? 'Admin wallet deduction',
            'created_at'  => Carbon::now(),
            'updated_at'  => Carbon::now(),
        ]);

        $newBalance = DB::table('wallets')->where('id', $walletId)->value('balance');

        return response()->json([
            'response'    => 200,
            'status'      => true,
            'message'     => 'Amount deducted from wallet successfully.',
            'new_balance' => $newBalance,
        ]);
    }

    // -----------------------------------------------------------------------
    // Private: ensure wallet row exists for patient, returns wallet id
    // -----------------------------------------------------------------------
    private function ensureWallet(string $patientCode): int
    {
        $wallet = DB::table('wallets')->where('patient_code', $patientCode)->first();
        if ($wallet) {
            return $wallet->id;
        }
        return DB::table('wallets')->insertGetId([
            'patient_code' => $patientCode,
            'balance'      => 0.00,
            'currency'     => 'PHP',
            'created_at'   => Carbon::now(),
            'updated_at'   => Carbon::now(),
        ]);
    }

    private function ensurePatientExists(int $patientId, ?int $clinicId = null): void
    {
        if (DB::table('patients')->where('id', $patientId)->exists()) {
            return;
        }

        $resolvedClinicId = $clinicId ?: (int) DB::table('clinics')->orderBy('id')->value('id');
        if (!$resolvedClinicId) {
            throw new \RuntimeException('Unable to create wallet for patient because no clinic exists in local database');
        }

        DB::table('patients')->insert([
            'id' => $patientId,
            'clinic_id' => $resolvedClinicId,
            'f_name' => 'External',
            'l_name' => 'Patient ' . $patientId,
            'phone' => null,
            'gender' => null,
            'active' => 1,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        try {
            DB::statement("SELECT setval(pg_get_serial_sequence('patients', 'id'), (SELECT COALESCE(MAX(id), 1) FROM patients))");
        } catch (\Throwable $e) {
            // Ignore on non-PostgreSQL drivers.
        }
    }
}
