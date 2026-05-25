<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProxyController extends Controller
{
    public function handle(Request $request, string $path = '')
    {
        $legacyBaseUrl = rtrim((string) env('LEGACY_BACKEND_URL', 'https://hs-mcgi.org'), '/');
        $targetUrl = $legacyBaseUrl . '/api/v1/' . ltrim($path, '/');

        if ($request->getQueryString()) {
            $targetUrl .= '?' . $request->getQueryString();
        }

        $headers = [];
        foreach ($request->headers->all() as $name => $values) {
            if (in_array(strtolower($name), ['host', 'content-length', 'connection'], true)) {
                continue;
            }

            $headers[$name] = implode(', ', $values);
        }

        $forwardBody = $request->getContent();

        // Legacy add_appointment wallet deduction uses user_id as patient id.
        // Normalize that payload here so all clients get consistent wallet behavior.
        if (strtolower($request->method()) === 'post' && trim($path, '/') === 'add_appointment') {
            $payload = $request->all();
            $normalized = $this->normalizeWalletAppointmentPayload($payload);
            if ($normalized !== null) {
                $forwardBody = json_encode($normalized);
                $headers['content-type'] = 'application/json';
            }
        }

        $client = new Client([
            'allow_redirects' => false,
            'http_errors' => false,
            'verify' => false,
            'timeout' => 120,
        ]);

        $response = $client->request($request->method(), $targetUrl, [
            'body' => $forwardBody,
            'headers' => $headers,
        ]);

        $proxyHeaders = [];
        foreach ($response->getHeaders() as $name => $values) {
            if (in_array(strtolower($name), ['content-length', 'transfer-encoding', 'connection'], true)) {
                continue;
            }

            $proxyHeaders[$name] = implode(', ', $values);
        }

        $responseBody = (string) $response->getBody();
        $responseData = json_decode($responseBody, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

        if (
            strtolower($request->method()) === 'post' &&
            trim($path, '/') === 'add_appointment' &&
            is_array($responseData)
        ) {
            $normalizedPayload = json_decode($forwardBody, true);
            if (!is_array($normalizedPayload)) {
                $normalizedPayload = $request->all();
            }

            $this->applySplitCreditsForAppointmentProxy($normalizedPayload, $responseData);
        }

        return response($responseBody, $response->getStatusCode())
            ->withHeaders($proxyHeaders);
    }

    private function normalizeWalletAppointmentPayload(array $payload): ?array
    {
        $isWalletTxn = (int) ($payload['is_wallet_txn'] ?? 0) === 1;
        if (!$isWalletTxn) {
            return null;
        }

        $patientCode = $payload['patient_code'] ?? $payload['owner_id'] ?? null;
        if (!is_string($patientCode) || trim($patientCode) === '') {
            return null;
        }

        $patientId = DB::table('patients')->where('patient_code', trim($patientCode))->value('id');
        if (!$patientId) {
            return null;
        }

        $payload['patient_id'] = $patientId;
        $payload['user_id'] = $patientId;

        return $payload;
    }

    private function isLegacySuccessResponse(array $responseData): bool
    {
        if (($responseData['status'] ?? null) === true) {
            return true;
        }

        return (int) ($responseData['response'] ?? 0) === 200;
    }

    private function isPaidStatusValue($value): bool
    {
        return strtolower(trim((string) ($value ?? ''))) === 'paid';
    }

    private function resolveAppointmentIdFromLegacyResponse(array $responseData): ?int
    {
        $candidates = [
            $responseData['id'] ?? null,
            $responseData['appointment_id'] ?? null,
            $responseData['data']['id'] ?? null,
            $responseData['data']['appointment_id'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_numeric($candidate) && (int) $candidate > 0) {
                return (int) $candidate;
            }
        }

        return null;
    }

    private function resolvePipeOwnerId(): ?string
    {
        $config = DB::table('configurations')
            ->select('id_name', 'value')
            ->whereIn('id_name', ['pipe_user_id', 'pipe_wallet_user_id', 'pipe_owner_user_id', 'pipe_owner_id'])
            ->first();

        if (!$config) {
            return null;
        }

        $value = trim((string) ($config->value ?? ''));
        return $value !== '' ? $value : null;
    }

    private function normalizeOwnerId($value): ?string
    {
        $normalized = trim((string) ($value ?? ''));
        return $normalized !== '' ? $normalized : null;
    }

    private function ensureOwnerWallet(string $ownerId, string $ownerType): int
    {
        if (!Schema::hasColumn('wallets', 'owner_id')) {
            throw new \RuntimeException('wallets.owner_id column is required for split credits');
        }

        $hasOwnerType = Schema::hasColumn('wallets', 'owner_type');
        $walletQuery = DB::table('wallets')->where('owner_id', $ownerId);
        if ($hasOwnerType) {
            $walletQuery->where('owner_type', $ownerType);
        }

        $wallet = $walletQuery->orderByDesc('id')->lockForUpdate()->first();
        if ($wallet) {
            return (int) $wallet->id;
        }

        $insert = [
            'owner_id' => $ownerId,
            'balance' => 0,
            'currency' => 'PHP',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if ($hasOwnerType) {
            $insert['owner_type'] = $ownerType;
        }

        return (int) DB::table('wallets')->insertGetId($insert);
    }

    private function applySplitCreditsForAppointmentProxy(array $payload, array $responseData): void
    {
        if (!$this->isLegacySuccessResponse($responseData)) {
            return;
        }

        if (!$this->isPaidStatusValue($payload['payment_status'] ?? null)) {
            return;
        }

        $appointmentId = $this->resolveAppointmentIdFromLegacyResponse($responseData);
        if (!$appointmentId) {
            return;
        }

        $patientCode = trim((string) ($payload['patient_code'] ?? $payload['owner_id'] ?? ''));
        if ($patientCode === '') {
            return;
        }

        $patientId = DB::table('patients')->where('patient_code', $patientCode)->value('id');
        $clinicId = is_numeric($payload['clinic_id'] ?? null) ? (int) $payload['clinic_id'] : null;
        $paymentReference = trim((string) ($payload['payment_transaction_id'] ?? ('proxy_appt_' . $appointmentId)));

        $entries = [
            [
                'owner_type' => 'doctor',
                'owner_id' => $this->normalizeOwnerId($payload['doctor_wallet_owner_id'] ?? $payload['doct_id'] ?? $payload['doctor_id'] ?? null),
                'amount' => (float) ($payload['doctor_fee'] ?? 0),
                'description' => 'Split: Doctor fee credit',
            ],
            [
                'owner_type' => 'clinic',
                'owner_id' => $this->normalizeOwnerId($payload['clinic_wallet_owner_id'] ?? $payload['clinic_id'] ?? null),
                'amount' => (float) ($payload['clinic_fee'] ?? 0),
                'description' => 'Split: Clinic fee credit',
            ],
            [
                'owner_type' => 'pipe',
                'owner_id' => $this->normalizeOwnerId($payload['pipe_wallet_owner_id'] ?? $this->resolvePipeOwnerId()),
                'amount' => (float) ($payload['pipe_fee'] ?? 0),
                'description' => 'Split: Pipe fee credit',
            ],
        ];

        DB::transaction(function () use ($entries, $appointmentId, $patientId, $patientCode, $clinicId, $paymentReference) {
            foreach ($entries as $entry) {
                if ($entry['amount'] <= 0 || !$entry['owner_id']) {
                    continue;
                }

                $walletId = $this->ensureOwnerWallet($entry['owner_id'], $entry['owner_type']);

                $existsQuery = DB::table('wallet_transactions')
                    ->where('wallet_id', $walletId)
                    ->where('type', 'credit')
                    ->where('description', $entry['description']);
                if (Schema::hasColumn('wallet_transactions', 'appointment_id')) {
                    $existsQuery->where('appointment_id', $appointmentId);
                }

                if ($existsQuery->exists()) {
                    continue;
                }

                DB::table('wallets')
                    ->where('id', $walletId)
                    ->increment('balance', $entry['amount'], ['updated_at' => now()]);

                $insert = [
                    'wallet_id' => $walletId,
                    'amount' => $entry['amount'],
                    'type' => 'credit',
                    'description' => $entry['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('wallet_transactions', 'appointment_id')) {
                    $insert['appointment_id'] = $appointmentId;
                }
                if (Schema::hasColumn('wallet_transactions', 'patient_id') && $patientId) {
                    $insert['patient_id'] = (int) $patientId;
                }
                if (Schema::hasColumn('wallet_transactions', 'patient_code')) {
                    $insert['patient_code'] = $patientCode;
                }
                if (Schema::hasColumn('wallet_transactions', 'clinic_id') && $clinicId) {
                    $insert['clinic_id'] = $clinicId;
                }
                if (Schema::hasColumn('wallet_transactions', 'payment_transaction_id')) {
                    $insert['payment_transaction_id'] = $paymentReference;
                }
                if (Schema::hasColumn('wallet_transactions', 'user_id') && in_array($entry['owner_type'], ['doctor', 'pipe'], true) && is_numeric($entry['owner_id'])) {
                    $insert['user_id'] = (int) $entry['owner_id'];
                }

                DB::table('wallet_transactions')->insert($insert);
            }
        });
    }
}
