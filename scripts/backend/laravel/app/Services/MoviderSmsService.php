<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Movider SMS Service
 *
 * Wraps the Movider REST SMS API (https://api.movider.net/v1/sms).
 *
 * Required environment variables:
 *   MOVIDER_API_KEY     — your Movider API key
 *   MOVIDER_API_SECRET  — your Movider API secret
 *
 * Phone number format expected by Movider: E.164 without the leading '+'.
 * For Philippine numbers: 63XXXXXXXXXX (country code 63 + 10-digit local).
 */
class MoviderSmsService
{
    private string $baseUrl = 'https://api.movider.net/v1/sms';

    /**
     * Send an SMS message to the given phone number.
     *
     * @param  string  $phone    Local phone (10-digit) or full E.164 without '+'
     * @param  string  $message  Text to send
     * @return bool              True when Movider accepted the message
     */
    public function send(string $phone, string $message): bool
    {
        $normalized = $this->normalizePhone($phone);

        try {
            $response = Http::timeout(10)->asForm()->post($this->baseUrl, [
                'api_key'    => env('MOVIDER_API_KEY'),
                'api_secret' => env('MOVIDER_API_SECRET'),
                'to'         => $normalized,
                'text'       => $message,
            ]);

            if (!$response->successful()) {
                Log::warning('MoviderSmsService: non-2xx response', [
                    'phone'  => $normalized,
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
            }

            return $response->successful();

        } catch (\Throwable $e) {
            Log::error('MoviderSmsService: request exception', [
                'phone'   => $normalized,
                'message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Normalize a Philippine mobile number to Movider's expected format.
     *
     * Examples:
     *   9171234567   → 639171234567   (10-digit local starting with 9)
     *   09171234567  → 639171234567   (11-digit with leading 0)
     *   639171234567 → 639171234567   (already normalized)
     *   +639171234567→ 639171234567   (E.164 with plus)
     */
    private function normalizePhone(string $phone): string
    {
        // Strip all non-digit characters (spaces, dashes, parentheses, plus)
        $digits = preg_replace('/\D/', '', $phone);

        if (str_starts_with($digits, '63')) {
            // Already has country code
            return $digits;
        }

        if (strlen($digits) === 10 && $digits[0] === '9') {
            // Local 10-digit mobile
            return '63' . $digits;
        }

        if (strlen($digits) === 11 && $digits[0] === '0') {
            // Local 11-digit (leading 0)
            return '63' . substr($digits, 1);
        }

        // Best-effort: return as-is and let Movider validate
        return $digits;
    }
}
