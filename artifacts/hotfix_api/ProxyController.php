<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        return response((string) $response->getBody(), $response->getStatusCode())
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
}
