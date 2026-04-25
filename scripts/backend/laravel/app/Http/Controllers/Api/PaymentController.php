<?php
// app/Http/Controllers/Api/PaymentController.php
// Deploy to: app/Http/Controllers/Api/PaymentController.php on your Laravel server
//
// Provides:
//   GET  /api/v1/get_payment      — paginated list with search & clinic filter
//   GET  /api/v1/get_payment/{id} — single payment detail
//   POST /api/v1/add_payment      — record a new payment (auto-creates transaction entry)
//   POST /api/v1/update_payment   — update payment status
//   POST /api/v1/confirm_schedule_wallet_payment — wallet-first schedule confirmation

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PaymentController extends Controller
{
    // -----------------------------------------------------------------------
    // GET /api/v1/get_payment
    // Query params: start, end, search, clinic_id
    // -----------------------------------------------------------------------
    public function index(Request $request)
    {
        $start    = (int) $request->query('start', 0);
        $end      = (int) $request->query('end',   49);
        $limit    = $end - $start + 1;
        $search   = trim($request->query('search', ''));
        $clinicId = $request->query('clinic_id');

        $query = DB::table('payments as py')
            ->leftJoin('patients as p', 'p.id', '=', 'py.patient_id')
            ->leftJoin('doctors as d',  'd.id', '=', 'py.doctor_id')
            ->leftJoin('users as u',    'u.id', '=', 'd.user_id')
            ->leftJoin('clinics as c',  'c.id', '=', 'py.clinic_id')
            ->leftJoin('invoices as i', 'i.id', '=', 'py.invoice_id')
            ->select([
                'py.id',
                'py.appointment_id',
                'py.invoice_id',
                'py.service_charge',
                'py.payment_method',
                'py.payment_status',
                'py.payment_transaction_id',
                'py.invoice_description',
                'py.is_wallet_txn',
                'py.created_at',
                'py.updated_at',
                'i.invoice_number',
                DB::raw("CONCAT(p.f_name, ' ', p.l_name) AS patient_name"),
                DB::raw("u.name AS doctor_name"),
                'c.title AS clinic_name',
            ]);

        if ($clinicId) {
            $query->where('py.clinic_id', $clinicId);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('py.payment_status',    'LIKE', "%{$search}%")
                  ->orWhere('py.payment_method',  'LIKE', "%{$search}%")
                  ->orWhere('py.payment_transaction_id', 'LIKE', "%{$search}%")
                  ->orWhereRaw("CONCAT(p.f_name, ' ', p.l_name) LIKE ?", ["%{$search}%"]);
            });
        }

        $total    = $query->count();
        $payments = $query
            ->orderByDesc('py.created_at')
            ->skip($start)
            ->take($limit)
            ->get();

        return response()->json([
            'response'     => 200,
            'status'       => true,
            'data'         => $payments,
            'total_record' => $total,
        ]);
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/get_payment/{id}
    // -----------------------------------------------------------------------
    public function show($id)
    {
        $payment = DB::table('payments as py')
            ->leftJoin('patients as p', 'p.id', '=', 'py.patient_id')
            ->leftJoin('doctors as d',  'd.id', '=', 'py.doctor_id')
            ->leftJoin('users as u',    'u.id', '=', 'd.user_id')
            ->leftJoin('clinics as c',  'c.id', '=', 'py.clinic_id')
            ->select([
                'py.*',
                DB::raw("CONCAT(p.f_name, ' ', p.l_name) AS patient_name"),
                DB::raw("u.name AS doctor_name"),
                'c.title AS clinic_name',
            ])
            ->where('py.id', $id)
            ->first();

        if (!$payment) {
            return response()->json(['response' => 404, 'status' => false, 'message' => 'Payment not found'], 404);
        }

        return response()->json(['response' => 200, 'status' => true, 'data' => $payment]);
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/add_payment
    // Records a payment and auto-creates a corresponding transaction entry.
    // -----------------------------------------------------------------------
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'appointment_id'         => 'nullable|integer',
            'invoice_id'             => 'nullable|integer|exists:invoices,id',
            'clinic_id'              => 'nullable|integer',
            'patient_id'             => 'nullable|integer',
            'doctor_id'              => 'nullable|integer',
            'service_charge'         => 'nullable|numeric|min:0',
            'payment_method'         => 'nullable|string|max:80',
            'payment_status'         => 'nullable|string|in:Paid,Pending,Failed,Cancelled',
            'payment_transaction_id' => 'nullable|string|max:255',
            'invoice_description'    => 'nullable|string',
            'is_wallet_txn'          => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => $validator->errors()->first(),
            ], 422);
        }

        $paymentId = DB::table('payments')->insertGetId([
            'appointment_id'         => $request->appointment_id,
            'invoice_id'             => $request->invoice_id,
            'clinic_id'              => $request->clinic_id,
            'patient_id'             => $request->patient_id,
            'doctor_id'              => $request->doctor_id,
            'service_charge'         => $request->service_charge ?? 0,
            'payment_method'         => $request->payment_method ?? 'Other',
            'payment_status'         => $request->payment_status ?? 'Pending',
            'payment_transaction_id' => $request->payment_transaction_id,
            'invoice_description'    => $request->invoice_description ?? 'Appointment Payment',
            'is_wallet_txn'          => $request->is_wallet_txn ? 1 : 0,
            'created_at'             => Carbon::now(),
            'updated_at'             => Carbon::now(),
        ]);

        // Auto-create a transaction ledger entry
        $txnStatus = match (strtolower($request->payment_status ?? 'pending')) {
            'paid'      => 'success',
            'failed'    => 'failed',
            'cancelled' => 'cancelled',
            default     => 'pending',
        };

        DB::table('transactions')->insert([
            'transaction_id' => $this->generateTransactionId(),
            'clinic_id'      => $request->clinic_id,
            'appointment_id' => $request->appointment_id,
            'patient_id'     => $request->patient_id,
            'doctor_id'      => $request->doctor_id,
            'payment_id'     => $paymentId,
            'invoice_id'     => $request->invoice_id,
            'amount'         => $request->service_charge ?? 0,
            'type'           => 'debit',
            'status'         => $txnStatus,
            'payment_method' => $request->payment_method,
            'description'    => $request->invoice_description ?? 'Appointment Payment',
            'created_at'     => Carbon::now(),
            'updated_at'     => Carbon::now(),
        ]);

        // If wallet transaction, deduct from wallet balance
        if ($request->is_wallet_txn && $request->patient_id) {
            $this->deductFromWallet(
                $request->patient_id,
                $request->service_charge ?? 0,
                $request->appointment_id,
                'Appointment payment — ' . ($request->invoice_description ?? '')
            );
        }

        return response()->json([
            'response'   => 200,
            'status'     => true,
            'message'    => 'Payment recorded successfully.',
            'payment_id' => $paymentId,
        ]);
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/update_payment
    // Updates payment status and syncs related transaction status.
    // -----------------------------------------------------------------------
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id'             => 'required|integer|exists:payments,id',
            'payment_status' => 'nullable|string|in:Paid,Pending,Failed,Cancelled',
            'payment_method' => 'nullable|string|max:80',
            'payment_transaction_id' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => $validator->errors()->first(),
            ], 422);
        }

        $fields = array_filter([
            'payment_status'         => $request->payment_status,
            'payment_method'         => $request->payment_method,
            'payment_transaction_id' => $request->payment_transaction_id,
            'updated_at'             => Carbon::now(),
        ], fn($v) => !is_null($v));

        DB::table('payments')->where('id', $request->id)->update($fields);

        // Sync transaction status if payment status changed
        if ($request->payment_status) {
            $txnStatus = match (strtolower($request->payment_status)) {
                'paid'      => 'success',
                'failed'    => 'failed',
                'cancelled' => 'cancelled',
                default     => 'pending',
            };
            DB::table('transactions')
                ->where('payment_id', $request->id)
                ->update(['status' => $txnStatus, 'updated_at' => Carbon::now()]);
        }

        return response()->json([
            'response' => 200,
            'status'   => true,
            'message'  => 'Payment updated successfully.',
        ]);
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/confirm_schedule_wallet_payment
    // Enforces wallet-payment before schedule confirmation.
    // Atomic flow:
    // 1) Validate appointment status from legacy appointment backend
    // 2) Lock wallet and validate balance
    // 3) Deduct wallet + write ledger records locally
    // 4) Confirm appointment on legacy backend only after successful local writes
    // -----------------------------------------------------------------------
    public function confirmScheduleWalletPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'appointment_id'      => 'required|integer',
            'patient_id'          => 'required|integer',
            'clinic_id'           => 'nullable|integer',
            'doctor_id'           => 'nullable|integer',
            'service_charge'      => 'nullable|numeric|min:0',
            'invoice_description' => 'nullable|string',
            'payment_method'      => 'nullable|string|max:80',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => $validator->errors()->first(),
            ], 422);
        }

        try {
            $appointmentId = (int) $request->appointment_id;
            $patientId     = (int) $request->patient_id;
            $localClinicId = $this->resolveLocalClinicId($request->clinic_id ? (int) $request->clinic_id : null);
            $localDoctorId = $this->resolveLocalDoctorId($request->doctor_id ? (int) $request->doctor_id : null);

            $legacyAppointment = $this->fetchLegacyAppointment($appointmentId, $request->bearerToken());
            if (!$legacyAppointment) {
                return response()->json([
                    'response' => 404,
                    'status'   => false,
                    'message'  => 'Appointment not found',
                ], 404);
            }

            $currentStatus = strtolower((string) ($legacyAppointment['status'] ?? ''));
            if (in_array($currentStatus, ['confirmed', 'completed', 'visited'], true)) {
                return response()->json([
                    'response' => 409,
                    'status'   => false,
                    'message'  => 'Appointment is already confirmed',
                ], 409);
            }

            $result = DB::transaction(function () use ($request, $localClinicId, $localDoctorId) {
                $appointmentId = (int) $request->appointment_id;
                $patientId     = (int) $request->patient_id;
                $amount        = (float) ($request->service_charge ?? 0);

                $this->ensurePatientExists(
                    $patientId,
                    $localClinicId
                );

                // Ensure wallet row exists before locking.
                DB::table('wallets')->updateOrInsert(
                    ['patient_id' => $patientId],
                    [
                        'currency'   => 'PHP',
                        'updated_at' => Carbon::now(),
                        'created_at' => Carbon::now(),
                    ]
                );

                $wallet = DB::table('wallets')
                    ->where('patient_id', $patientId)
                    ->lockForUpdate()
                    ->first();

                $balance = (float) ($wallet->balance ?? 0);
                if ($balance < $amount) {
                    return [
                        'error' => true,
                        'code' => 422,
                        'payload' => [
                            'response' => 422,
                            'status' => false,
                            'message' => 'Insufficient wallet balance. Please top up to continue.',
                            'required_amount' => $amount,
                            'available_balance' => $balance,
                        ],
                    ];
                }

                if ($amount > 0) {
                    DB::table('wallets')
                        ->where('id', $wallet->id)
                        ->decrement('balance', $amount, ['updated_at' => Carbon::now()]);

                    DB::table('wallet_transactions')->insert([
                        'wallet_id'      => $wallet->id,
                        'patient_id'     => $patientId,
                        'appointment_id' => $appointmentId,
                        'amount'         => $amount,
                        'type'           => 'debit',
                        'description'    => $request->invoice_description ?? 'Appointment payment',
                        'created_at'     => Carbon::now(),
                        'updated_at'     => Carbon::now(),
                    ]);
                }

                $invoiceNumber = $this->generateInvoiceNumber();
                $invoiceId = DB::table('invoices')->insertGetId([
                    'invoice_number'         => $invoiceNumber,
                    'appointment_id'         => $appointmentId,
                    'clinic_id'              => $localClinicId,
                    'patient_id'             => $patientId,
                    'doctor_id'              => $localDoctorId,
                    'invoice_description'    => $request->invoice_description ?? 'Appointment payment',
                    'service_charge'         => $amount,
                    'payment_method'         => $request->payment_method ?? 'Wallet',
                    'payment_status'         => 'Paid',
                    'payment_transaction_id' => 'wallet_' . Carbon::now()->timestamp,
                    'is_wallet_txn'          => 1,
                    'created_at'             => Carbon::now(),
                    'updated_at'             => Carbon::now(),
                ]);

                $paymentId = DB::table('payments')->insertGetId([
                    'appointment_id'         => $appointmentId,
                    'invoice_id'             => $invoiceId,
                    'clinic_id'              => $localClinicId,
                    'patient_id'             => $patientId,
                    'doctor_id'              => $localDoctorId,
                    'service_charge'         => $amount,
                    'payment_method'         => $request->payment_method ?? 'Wallet',
                    'payment_status'         => 'Paid',
                    'payment_transaction_id' => 'pay_' . Carbon::now()->timestamp,
                    'invoice_description'    => $request->invoice_description ?? 'Appointment payment',
                    'is_wallet_txn'          => 1,
                    'created_at'             => Carbon::now(),
                    'updated_at'             => Carbon::now(),
                ]);

                DB::table('transactions')->insert([
                    'transaction_id' => $this->generateTransactionId(),
                    'clinic_id'      => $localClinicId,
                    'appointment_id' => $appointmentId,
                    'patient_id'     => $patientId,
                    'doctor_id'      => $localDoctorId,
                    'payment_id'     => $paymentId,
                    'invoice_id'     => $invoiceId,
                    'amount'         => $amount,
                    'type'           => 'debit',
                    'status'         => 'success',
                    'payment_method' => $request->payment_method ?? 'Wallet',
                    'description'    => $request->invoice_description ?? 'Appointment payment',
                    'created_at'     => Carbon::now(),
                    'updated_at'     => Carbon::now(),
                ]);

                $legacyUpdate = $this->updateLegacyAppointmentStatus(
                    $appointmentId,
                    'Confirmed',
                    $request->bearerToken()
                );
                if (!$legacyUpdate['ok']) {
                    return [
                        'error' => true,
                        'code' => 502,
                        'payload' => [
                            'response' => 502,
                            'status' => false,
                            'message' => $legacyUpdate['message'] ?: 'Failed to update appointment status on legacy backend',
                        ],
                    ];
                }

                $newBalance = (float) DB::table('wallets')
                    ->where('patient_id', $patientId)
                    ->value('balance');

                return [
                    'error' => false,
                    'payload' => [
                        'response' => 200,
                        'status'   => true,
                        'message'  => 'Payment successful. Appointment confirmed.',
                        'data'     => [
                            'appointment_id' => $appointmentId,
                            'invoice_id' => $invoiceId,
                            'invoice_number' => $invoiceNumber,
                            'payment_id' => $paymentId,
                            'wallet_balance' => $newBalance,
                        ],
                    ],
                ];
            });

            if (!empty($result['error'])) {
                return response()->json($result['payload'], $result['code']);
            }

            return response()->json($result['payload']);
        } catch (\Throwable $e) {
            return response()->json([
                'response' => 500,
                'status'   => false,
                'message'  => $e->getMessage(),
            ], 500);
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    private function legacyApiBase(): string
    {
        return rtrim((string) env('LEGACY_API_BASE_URL', 'https://api.gentrx.ph/api/v1'), '/');
    }

    private function fetchLegacyAppointment(int $appointmentId, ?string $bearerToken): ?array
    {
        try {
            $request = Http::acceptJson()->timeout(15)->retry(1, 250);
            if ($bearerToken) {
                $request = $request->withToken($bearerToken);
            }

            $response = $request->get($this->legacyApiBase() . '/get_appointment/' . $appointmentId);
            if (!$response->ok()) {
                return null;
            }

            $json = $response->json();
            $data = $json['data'] ?? null;
            return is_array($data) ? $data : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function updateLegacyAppointmentStatus(int $appointmentId, string $status, ?string $bearerToken): array
    {
        try {
            $request = Http::acceptJson()->timeout(15)->retry(1, 250);
            if ($bearerToken) {
                $request = $request->withToken($bearerToken);
            }

            $response = $request->post($this->legacyApiBase() . '/update_appointment_status', [
                'id' => $appointmentId,
                'status' => $status,
            ]);

            if (!$response->ok()) {
                return [
                    'ok' => false,
                    'message' => 'Legacy appointment status update failed with HTTP ' . $response->status(),
                ];
            }

            $json = $response->json();
            $isSuccess = (
                (isset($json['status']) && $json['status'] === true) ||
                ((int) ($json['response'] ?? 0) === 200)
            );

            if (!$isSuccess) {
                return [
                    'ok' => false,
                    'message' => $json['message'] ?? 'Legacy appointment status update was rejected',
                ];
            }

            return ['ok' => true, 'message' => null];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'Legacy appointment status update failed: ' . $e->getMessage(),
            ];
        }
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

    private function resolveLocalClinicId(?int $clinicId): ?int
    {
        if ($clinicId && DB::table('clinics')->where('id', $clinicId)->exists()) {
            return $clinicId;
        }

        $fallback = DB::table('clinics')->orderBy('id')->value('id');
        return $fallback ? (int) $fallback : null;
    }

    private function resolveLocalDoctorId(?int $doctorId): ?int
    {
        if ($doctorId && DB::table('doctors')->where('id', $doctorId)->exists()) {
            return $doctorId;
        }

        return null;
    }

    private function generateInvoiceNumber(): string
    {
        $year = Carbon::now()->year;
        $count = DB::table('invoices')->whereYear('created_at', $year)->count();
        return 'INV-' . $year . '-' . str_pad($count + 1, 6, '0', STR_PAD_LEFT);
    }

    private function generateTransactionId(): string
    {
        $year = Carbon::now()->year;
        $count = DB::table('transactions')->whereYear('created_at', $year)->count();
        return 'TXN-' . $year . '-' . str_pad($count + 1, 6, '0', STR_PAD_LEFT);
    }

    private function deductFromWallet(int $patientId, float $amount, ?int $appointmentId, string $description): void
    {
        // Ensure wallet exists across both legacy and migrated wallet schemas.
        $patientCode = DB::table('patients')->where('id', $patientId)->value('patient_code');
        $hasPatientCode = Schema::hasColumn('wallets', 'patient_code');
        $hasOwnerType = Schema::hasColumn('wallets', 'owner_type');

        $wallet = null;
        if ($patientCode) {
            $walletQuery = DB::table('wallets');
            if ($hasPatientCode) {
                $walletQuery->where('patient_code', $patientCode);
            } else {
                $walletQuery->where(function ($q) use ($patientId, $patientCode) {
                    $q->where('owner_id', (string) $patientId)
                      ->orWhere('owner_id', $patientCode);
                });
                if ($hasOwnerType) {
                    $walletQuery->where('owner_type', 'patient');
                }
            }
            $wallet = $walletQuery->orderByDesc('id')->first();
        }

        if (!$wallet) {
            $insert = [
                'balance'    => 0,
                'currency'   => 'PHP',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ];

            if ($hasPatientCode) {
                $insert['patient_code'] = $patientCode;
            } else {
                $insert['owner_id'] = $patientCode ?: (string) $patientId;
                if ($hasOwnerType) {
                    $insert['owner_type'] = 'patient';
                }
            }

            $walletId = DB::table('wallets')->insertGetId($insert);
        } else {
            $walletId = $wallet->id;
        }

        DB::table('wallets')
            ->where('id', $walletId)
            ->decrement('balance', $amount, ['updated_at' => Carbon::now()]);

        DB::table('wallet_transactions')->insert([
            'wallet_id'      => $walletId,
            'patient_id'     => $patientId,
            'appointment_id' => $appointmentId,
            'amount'         => $amount,
            'type'           => 'spent',
            'description'    => $description,
            'created_at'     => Carbon::now(),
            'updated_at'     => Carbon::now(),
        ]);
    }
}
