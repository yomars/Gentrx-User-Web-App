<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Movider SMS Verify Service
 *
 * Uses the Movider Verify API:
 *   POST https://api.movider.co/v1/verify            - send OTP to phone
 *   POST https://api.movider.co/v1/verify/acknowledge - validate code entered by user
 *
 * Required environment variables:
 *   MOVIDER_API_KEY     - your Movider API key
 *   MOVIDER_API_SECRET  - your Movider API secret
 *
 * Phone number format: E.164 with leading '+'.
 * For Philippine numbers: +63XXXXXXXXXX
 */
class MoviderSmsService
{
    private string $verifyUrl      = 'https://api.movider.co/v1/verify';
    private string $acknowledgeUrl = 'https://api.movider.co/v1/verify/acknowledge';
    private string $cancelUrl      = 'https://api.movider.co/v1/verify/cancel';
    private ?array $lastSendFailure = null;

    private function apiKey(): ?string
    {
        return Config::get('services.movider.api_key');
    }

    private function apiSecret(): ?string
    {
        return Config::get('services.movider.api_secret');
    }

    /**
     * Send OTP via Movider Verify API.
     *
     * @param  string  $phone  Local 10-digit or full E.164 phone number
     * @return string|null     Movider request_id on success, null on failure
     */
    public function sendVerify(string $phone): ?string
    {
        $normalized = $this->normalizePhone($phone);
        $this->lastSendFailure = null;

        try {
            $response = Http::timeout(10)->asForm()->post($this->verifyUrl, [
                'api_key'    => $this->apiKey(),
                'api_secret' => $this->apiSecret(),
                'to'         => $normalized,
            ]);

            $body = $response->json();

            if (!$response->successful() || isset($body['error'])) {
                $this->lastSendFailure = is_array($body) ? $body : ['error' => ['description' => 'Movider rejected the OTP request.']];
                Log::warning('MoviderSmsService: sendVerify failed', [
                    'phone'  => $normalized,
                    'status' => $response->status(),
                    'body'   => $body,
                ]);
                return null;
            }

            return $body['request_id'] ?? null;

        } catch (\Throwable $e) {
            $this->lastSendFailure = [
                'error' => [
                    'description' => $e->getMessage(),
                ],
            ];
            Log::error('MoviderSmsService: sendVerify exception', [
                'phone'   => $normalized,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function lastSendFailure(): ?array
    {
        return $this->lastSendFailure;
    }

    /**
     * Acknowledge (verify) an OTP code via Movider.
     *
     * @param  string  $requestId  The request_id returned by sendVerify()
     * @param  string  $code       The OTP code entered by the user
     * @return bool                True if the code is valid and accepted
     */
    public function acknowledgeVerify(string $requestId, string $code): bool
    {
        try {
            $response = Http::timeout(10)->asForm()->post($this->acknowledgeUrl, [
                'api_key'    => $this->apiKey(),
                'api_secret' => $this->apiSecret(),
                'request_id' => $requestId,
                'code'       => $code,
            ]);

            $body = $response->json();

            if (isset($body['error'])) {
                Log::info('MoviderSmsService: acknowledgeVerify failed', [
                    'request_id' => $requestId,
                    'error'      => $body['error'],
                ]);
                return false;
            }

            return $response->successful();

        } catch (\Throwable $e) {
            Log::error('MoviderSmsService: acknowledgeVerify exception', [
                'request_id' => $requestId,
                'message'    => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Cancel a pending Movider Verify session (best-effort, no throw).
     */
    public function cancelVerify(string $requestId): void
    {
        try {
            Http::timeout(5)->asForm()->post($this->cancelUrl, [
                'api_key'    => $this->apiKey(),
                'api_secret' => $this->apiSecret(),
                'request_id' => $requestId,
            ]);
        } catch (\Throwable $e) {
            Log::warning('MoviderSmsService: cancelVerify exception', [
                'request_id' => $requestId,
                'message'    => $e->getMessage(),
            ]);
        }
    }

    /**
     * Normalize a Philippine mobile number to E.164 format with '+'.
     */
    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (str_starts_with($digits, '63')) {
            return '+' . $digits;
        }

        if (strlen($digits) === 10 && $digits[0] === '9') {
            return '+63' . $digits;
        }

        if (strlen($digits) === 11 && $digits[0] === '0') {
            return '+63' . substr($digits, 1);
        }

        return '+' . $digits;
    }
}
