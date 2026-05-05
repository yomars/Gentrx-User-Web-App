<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ClinicResolutionController extends Controller
{
    /**
     * GET /api/v1/resolve_clinic
     *
     * Query params:
     *   city_id      (integer, optional) – resolve clinic by city selection (preferred)
     *   latitude     (numeric, optional) – device latitude
     *   longitude    (numeric, optional) – device longitude
     *   patient_code (string, optional)  – patient identifier (patients.patient_code)
     *   guest        (0|1, optional)     – treat request as guest context (default 0)
     *
     * Response:
     *   { clinic_id, clinic_title, city_id, city_title, source }
     *   source ∈ { city_lookup, nearest, patient_profile, global_default }
     */
    public function resolve(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'city_id'      => ['nullable', 'integer', 'min:1'],
            'latitude'     => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'    => ['nullable', 'numeric', 'between:-180,180'],
            'patient_code' => ['nullable', 'string', 'max:20'],
            'guest'        => ['nullable', 'in:0,1'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'response' => 422,
                'status'   => false,
                'message'  => 'Invalid input.',
                'errors'   => $validator->errors(),
            ], 422);
        }

        $cityId      = $request->query('city_id') !== null ? (int) $request->query('city_id') : null;
        $lat         = $request->query('latitude')  !== null ? (float) $request->query('latitude')  : null;
        $lng         = $request->query('longitude') !== null ? (float) $request->query('longitude') : null;
        $patientCode = trim((string) $request->query('patient_code', ''));
        $isGuest     = (int) $request->query('guest', 0) === 1;

        $hasCoordinates = $lat !== null && $lng !== null;

        // ── Branch 0: city_id provided – direct city→clinic lookup (most reliable) ─
        if ($cityId !== null && $cityId > 0) {
            $clinic = $this->resolveByCity($cityId);

            if ($clinic) {
                Log::info('clinic_resolver', [
                    'source'    => 'city_lookup',
                    'city_id'   => $cityId,
                    'clinic_id' => $clinic->clinic_id,
                ]);

                return $this->clinicResponse($clinic, 'city_lookup');
            }

            Log::warning('clinic_resolver_fallback', [
                'reason'  => 'no_clinic_for_city',
                'city_id' => $cityId,
            ]);
            // Fall through to other strategies
        }

        // ── Branch 1: coordinates provided – return nearest active clinic ──────
        if ($hasCoordinates) {
            $clinic = $this->resolveNearest($lat, $lng);

            if ($clinic) {
                Log::info('clinic_resolver', [
                    'source'      => 'nearest',
                    'context'     => $isGuest ? 'guest' : 'patient',
                    'clinic_id'   => $clinic->clinic_id,
                ]);

                return $this->clinicResponse($clinic, 'nearest');
            }

            // Fall through if no clinic has coordinates in DB
        }

        // ── Branch 2: no coordinates + authenticated patient context ─────────
        if (!$isGuest && $patientCode !== '') {
            $clinic = $this->resolveForPatient($patientCode);

            if ($clinic) {
                Log::info('clinic_resolver', [
                    'source'       => 'patient_profile',
                    'context'      => 'patient',
                    'patient_code' => $patientCode,
                    'clinic_id'    => $clinic->clinic_id,
                ]);

                return $this->clinicResponse($clinic, 'patient_profile');
            }

            Log::warning('clinic_resolver_fallback', [
                'reason'       => 'patient_profile_clinic_missing',
                'patient_code' => $patientCode,
            ]);
            // Fall through to global default
        }

        // ── Branch 3: guest / no patient_code / fallback ─────────────────────
        $clinic = $this->resolveGlobalDefault();

        if (!$clinic) {
            Log::error('clinic_resolver_misconfigured', [
                'global_default_clinic_id' => env('GLOBAL_DEFAULT_CLINIC_ID'),
            ]);

            return response()->json([
                'response' => 503,
                'status'   => false,
                'message'  => 'Clinic resolver is misconfigured. No global default clinic is set.',
            ], 503);
        }

        Log::info('clinic_resolver', [
            'source'    => 'global_default',
            'context'   => $isGuest ? 'guest' : 'patient',
            'clinic_id' => $clinic->clinic_id,
        ]);

        return $this->clinicResponse($clinic, 'global_default');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Find the best active clinic for the given city_id.
     * Prefers the clinic with the most active doctors; ties broken by clinic id.
     */
    private function resolveByCity(int $cityId): ?object
    {
        return DB::table('clinics AS c')
            ->leftJoin('cities AS ci', 'ci.id', '=', 'c.city_id')
            ->leftJoin('doctors AS d', function ($join) {
                $join->on('d.clinic_id', '=', 'c.id')
                     ->where('d.active', true);
            })
            ->select([
                'c.id AS clinic_id',
                'c.title AS clinic_title',
                'c.city_id',
                DB::raw("ci.title AS city_title"),
                DB::raw("COUNT(d.id) AS doctor_count"),
            ])
            ->where('c.city_id', $cityId)
            ->where('c.active', true)
            ->where('c.is_active', true)
            ->groupBy('c.id', 'c.title', 'c.city_id', 'ci.title')
            ->orderByDesc('doctor_count')
            ->orderBy('c.id')
            ->first();
    }

    /**
     * Find the nearest active clinic to the given coordinates using the
     * Haversine formula. Only considers clinics with non-null lat/lng.
     */
    private function resolveNearest(float $lat, float $lng): ?object
    {
        return DB::table('clinics AS c')
            ->leftJoin('cities AS ci', 'ci.id', '=', 'c.city_id')
            ->select([
                'c.id   AS clinic_id',
                'c.title AS clinic_title',
                'c.city_id',
                DB::raw("ci.title AS city_title"),
                DB::raw(
                    "(6371 * acos(
                        GREATEST(-1, LEAST(1,
                            cos(radians(?)) * cos(radians(c.latitude))
                            * cos(radians(c.longitude) - radians(?))
                            + sin(radians(?)) * sin(radians(c.latitude))
                        ))
                    )) AS distance_km"
                ),
            ])
            ->addBinding([$lat, $lng, $lat], 'select')
            ->where('c.active', true)
            ->where('c.is_active', true)
            ->whereNotNull('c.latitude')
            ->whereNotNull('c.longitude')
            ->orderBy('distance_km')
            ->first();
    }

    /**
     * Look up the clinic assigned to a patient via patient_code.
     */
    private function resolveForPatient(string $patientCode): ?object
    {
        return DB::table('patients AS p')
            ->join('clinics AS c', 'c.id', '=', 'p.clinic_id')
            ->leftJoin('cities AS ci', 'ci.id', '=', 'c.city_id')
            ->select([
                'c.id    AS clinic_id',
                'c.title AS clinic_title',
                'c.city_id',
                DB::raw("ci.title AS city_title"),
            ])
            ->where('p.patient_code', $patientCode)
            ->where('p.active', true)
            ->whereNull('p.deleted_at')
            ->where('c.active', true)
            ->where('c.is_active', true)
            ->first();
    }

    /**
     * Return the globally configured default clinic.
     * Configured via GLOBAL_DEFAULT_CLINIC_ID in .env.
     */
    private function resolveGlobalDefault(): ?object
    {
        $defaultId = (int) env('GLOBAL_DEFAULT_CLINIC_ID', 0);

        if ($defaultId <= 0) {
            return null;
        }

        return DB::table('clinics AS c')
            ->leftJoin('cities AS ci', 'ci.id', '=', 'c.city_id')
            ->select([
                'c.id    AS clinic_id',
                'c.title AS clinic_title',
                'c.city_id',
                DB::raw("ci.title AS city_title"),
            ])
            ->where('c.id', $defaultId)
            ->where('c.active', true)
            ->where('c.is_active', true)
            ->first();
    }

    /**
     * Build the standard clinic resolver JSON response.
     */
    private function clinicResponse(object $clinic, string $source): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'response'     => 200,
            'status'       => true,
            'data'         => [
                'clinic_id'    => (int) $clinic->clinic_id,
                'clinic_title' => $clinic->clinic_title,
                'city_id'      => $clinic->city_id ? (int) $clinic->city_id : null,
                'city_title'   => $clinic->city_title ?? null,
                'source'       => $source,
            ],
        ]);
    }
}
