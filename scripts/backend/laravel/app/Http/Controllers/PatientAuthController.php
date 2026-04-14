<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\AuthenticationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class PatientAuthController extends Controller
{
    // Configuration
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 30;
    const TOKEN_EXPIRY_HOURS = 24;
    const PASSWORD_MIN_LENGTH = 8;

    /**
     * POST /api/v1/patient/check-phone
     * 
     * Pre-check if phone number is already registered
     * Used for real-time validation during signup
     */
    public function checkPhone(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone' => 'required|regex:/^[0-9]{10}$/',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid phone format',
                    'details' => $validator->errors(),
                ], 422);
            }

            $phone = $request->input('phone');
            
            // Check if phone exists in patients table
            $patientExists = Patient::where('phone', $phone)
                ->where('auth_status', '!=', 'deleted')
                ->exists();

            return response()->json([
                'response' => 200,
                'status' => !$patientExists,
                'available' => !$patientExists,
                'phone' => $phone,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Server error during phone check',
            ], 500);
        }
    }

    /**
     * GET /api/v1/patient/clinics
     *
     * Return all active clinics for the signup clinic-selection dropdown.
     * Public endpoint — no authentication required.
     * Returns: id, name, clinic_code for each active clinic.
     */
    public function getClinics()
    {
        try {
            $clinics = DB::table('clinics')
                ->where('active', 1)
                ->select('id', 'title', 'clinic_code')
                ->orderBy('title')
                ->get();

            return response()->json([
                'response' => 200,
                'status'   => true,
                'data'     => $clinics,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to fetch clinics',
            ], 500);
        }
    }

    /**
     * POST /api/v1/patient/signup
     * 
     * Register new patient with phone + password
     * Creates patient record with auth fields
     * Returns JWT token for immediate login
     */
    public function signup(Request $request)
    {
        try {
            // Validation
            $validator = Validator::make($request->all(), [
                'phone'       => 'required|regex:/^[0-9]{10}$/|unique:patients,phone',
                'password'    => 'required|digits:4',
                'f_name'      => 'required|string|max:255',
                'l_name'      => 'required|string|max:255',
                'name'        => 'nullable|string|max:255',
                'email'       => 'nullable|email|unique:patients,email',
                'gender'      => 'nullable|in:Male,Female,Other',
                'isd_code'    => 'nullable|string|max:5',
                // clinic_id: required, must exist in the clinics table
                'clinic_id'   => 'required|integer|exists:clinics,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Validation failed',
                    'details' => $validator->errors(),
                ], 422);
            }

            // Begin transaction
            DB::beginTransaction();

            try {
                $fName     = trim((string) $request->input('f_name', ''));
                $lName     = trim((string) $request->input('l_name', ''));
                $fullName  = trim($fName . ' ' . $lName);

                // ----------------------------------------------------------
                // Resolve clinic_code from the clinic record.
                // If clinic_code is not yet populated in the clinics table,
                // auto-derive a 3-letter code from the clinic title
                // (uppercase first 3 alpha characters, e.g. "Main Clinic" -> "MAI").
                // This ensures the system works even before clinic codes are assigned.
                // ----------------------------------------------------------
                $clinic = DB::table('clinics')
                    ->where('id', (int) $request->input('clinic_id'))
                    ->select('id', 'title', 'clinic_code')
                    ->first();

                if (!empty($clinic->clinic_code)) {
                    $clinicCode = strtoupper(trim((string) $clinic->clinic_code));
                } else {
                    // Derive: strip non-alpha, take first 3 chars, uppercase, pad with 'X' if short
                    $alphaOnly  = preg_replace('/[^A-Za-z]/', '', $clinic->title ?? '');
                    $clinicCode = strtoupper(str_pad(substr($alphaOnly, 0, 3), 3, 'X'));
                }

                // ----------------------------------------------------------
                // Atomic per-clinic sequence increment (concurrency-safe).
                //
                // PostgreSQL's ON CONFLICT DO UPDATE guarantees that even if
                // two requests race, each gets a distinct last_sequence value.
                // The RETURNING clause gives us our assigned number immediately
                // without a second SELECT, keeping the window of conflict tiny.
                // ----------------------------------------------------------
                $sequenceResult = DB::select("
                    INSERT INTO patient_code_sequences (clinic_code, last_sequence)
                    VALUES (?, 1)
                    ON CONFLICT (clinic_code)
                    DO UPDATE SET last_sequence = patient_code_sequences.last_sequence + 1
                    RETURNING last_sequence
                ", [$clinicCode]);

                $sequence = (int) $sequenceResult[0]->last_sequence;

                // Format: "MXN-00000001" (3-letter code + dash + 8-digit zero-padded)
                $patientCode = $clinicCode . '-' . str_pad($sequence, 8, '0', STR_PAD_LEFT);

                $patientPayload = [
                    'phone'    => $request->input('phone'),
                    'f_name'   => $fName,
                    'l_name'   => $lName,
                    'email'    => $request->input('email'),
                    'gender'   => $request->input('gender'),
                    'isd_code' => $request->input('isd_code') ?? '+63',

                    // Patient code fields
                    'clinic_code'      => $clinicCode,
                    'patient_sequence' => $sequence,
                    'patient_code'     => $patientCode,

                    // Auth fields
                    'password_hash'      => Hash::make($request->input('password')),
                    'auth_status'        => 'active',
                    'login_attempts'     => 0,
                    'locked_until'       => null,
                    'credential_setup_at' => now(),
                    'last_login_at'      => now(),
                ];

                // Some deployments have patients.name, others do not.
                if (Schema::hasColumn('patients', 'name')) {
                    $patientPayload['name'] = $request->input('name') ?: $fullName;
                }

                // Create patient record
                $patient = Patient::create($patientPayload);

                // Log signup attempt
                AuthenticationLog::create([
                    'patient_id' => $patient->id,
                    'login_identifier' => $request->input('phone'),
                    'attempt_type' => 'signup',
                    'status' => 'success',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->header('User-Agent'),
                ]);

                DB::commit();

                // Generate token
                $token = $this->generateToken($patient);

                if (Schema::hasColumn('patients', 'api_token')) {
                    $patient->update(['api_token' => $token]);
                }

                return response()->json([
                    'response' => 201,
                    'status' => true,
                    'message' => 'Signup successful',
                    'data' => $this->formatPatientResponse($patient, $token),
                    'token' => $token,
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Signup failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/patient/login
     * 
     * Authenticate patient with phone + password
     * Returns JWT token valid for 24 hours
     * Enforces brute-force lockout (5 failures = 30-min lock)
     */
    public function login(Request $request)
    {
        try {
            // Validation
            $validator = Validator::make($request->all(), [
                'phone' => 'required|regex:/^[0-9]{10}$/',
                'password' => 'required|digits:4',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid input',
                    'details' => $validator->errors(),
                ], 422);
            }

            $phone = $request->input('phone');
            $password = $request->input('password');

            // Find patient by phone
            $patient = Patient::where('phone', $phone)
                ->where('auth_status', 'active')
                ->first();

            // Patient not found
            if (!$patient) {
                AuthenticationLog::create([
                    'login_identifier' => $phone,
                    'attempt_type' => 'login',
                    'status' => 'failed',
                    'error_message' => 'Patient not found',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->header('User-Agent'),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Invalid phone or password',
                ], 401);
            }

            // Check lockout status
            if ($patient->locked_until && now()->lessThan($patient->locked_until)) {
                $remainingMinutes = now()->diffInMinutes($patient->locked_until);
                
                AuthenticationLog::create([
                    'patient_id' => $patient->id,
                    'login_identifier' => $phone,
                    'attempt_type' => 'login',
                    'status' => 'failed',
                    'error_message' => 'Account locked due to too many attempts',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->header('User-Agent'),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Account temporarily locked',
                    'locked_until' => $patient->locked_until,
                    'try_again_in_minutes' => $remainingMinutes,
                ], 423); // 423 Locked
            }

            // Password verification
            if (!Hash::check($password, $patient->password_hash)) {
                $patient->increment('login_attempts');

                // Apply lockout if max attempts reached
                if ($patient->login_attempts >= self::MAX_LOGIN_ATTEMPTS) {
                    $patient->update([
                        'locked_until' => now()->addMinutes(self::LOCKOUT_MINUTES),
                    ]);

                    AuthenticationLog::create([
                        'patient_id' => $patient->id,
                        'login_identifier' => $phone,
                        'attempt_type' => 'login',
                        'status' => 'failed',
                        'error_message' => 'Too many failed attempts. Account locked.',
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->header('User-Agent'),
                    ]);

                    return response()->json([
                        'success' => false,
                        'error' => 'Too many failed attempts. Account locked for 30 minutes.',
                        'locked_until' => $patient->locked_until,
                    ], 423);
                }

                AuthenticationLog::create([
                    'patient_id' => $patient->id,
                    'login_identifier' => $phone,
                    'attempt_type' => 'login',
                    'status' => 'failed',
                    'error_message' => "Invalid password (attempt {$patient->login_attempts})",
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->header('User-Agent'),
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Invalid phone or password',
                    'attempts_remaining' => self::MAX_LOGIN_ATTEMPTS - $patient->login_attempts,
                ], 401);
            }

            // Success: Reset attempts, update last login
            $patient->update([
                'login_attempts' => 0,
                'locked_until' => null,
                'last_login_at' => now(),
                'auth_status' => 'active',
            ]);

            // Log successful login
            AuthenticationLog::create([
                'patient_id' => $patient->id,
                'login_identifier' => $phone,
                'attempt_type' => 'login',
                'status' => 'success',
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent'),
            ]);

            // Generate token
            $token = $this->generateToken($patient);

            if (Schema::hasColumn('patients', 'api_token')) {
                $patient->update(['api_token' => $token]);
            }

            return response()->json([
                'response' => 200,
                'status' => true,
                'message' => 'Login successful',
                'data' => $this->formatPatientResponse($patient, $token),
                'token' => $token,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Login failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/patient/logout
     * 
     * Invalidate patient token (optional - frontend typically just clears localStorage)
     */
    public function logout(Request $request)
    {
        try {
            $bearerToken = $request->header('Authorization');
            
            if ($bearerToken) {
                AuthenticationLog::create([
                    'patient_id' => auth('api')->id(),
                    'attempt_type' => 'logout',
                    'status' => 'success',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->header('User-Agent'),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Logout failed',
            ], 500);
        }
    }

    /**
     * Helper: Generate JWT token for patient
     * 
     * Token claims:
     * - sub: patient_id
     * - identity_type: 'patient' (distinguishes from admin)
     * - phone: patient phone
     * - iat: issued at
     * - exp: expires at (24 hours)
     */
    private function generateToken($patient)
    {
        // Using simple JWT structure (implement with firebase/jwt or similar in production)
        $payload = [
            'sub' => $patient->id,
            'identity_type' => 'patient',
            'phone' => $patient->phone,
            'email' => $patient->email,
            'iat' => now()->timestamp,
            'exp' => now()->addHours(self::TOKEN_EXPIRY_HOURS)->timestamp,
        ];

        // In production, use Firebase JWT library:
        // return JWT::encode($payload, env('JWT_SECRET'), 'HS256');
        
        // Placeholder: use Laravel's built-in token if available
        return bin2hex(random_bytes(32)); // Temporary auth token
    }

    /**
     * Helper: Format patient response matching frontend expectations
     * 
     * Matches structure stored in localStorage.user
     */
    private function formatPatientResponse($patient, $token)
    {
        $fName = $patient->f_name ?? '';
        $lName = $patient->l_name ?? '';

        if (($fName === '' || $lName === '') && !empty($patient->name)) {
            $nameParts = preg_split('/\s+/', trim((string) $patient->name));
            $fName = $fName !== '' ? $fName : ($nameParts[0] ?? '');
            $lName = $lName !== '' ? $lName : (count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '');
        }

        return [
            'id'             => $patient->id,
            'f_name'         => $fName,
            'l_name'         => $lName,
            'phone'          => $patient->phone,
            'email'          => $patient->email,
            'gender'         => $patient->gender,
            'isd_code'       => $patient->isd_code,
            'image'          => $patient->image ?? null,
            'image_path'     => $patient->image_path ?? null,
            'image_mime'     => $patient->image_mime ?? null,
            'image_size'     => $patient->image_size ?? null,
            'image_checksum' => $patient->image_checksum ?? null,
            'token'          => $token,
            'auth_status'    => $patient->auth_status,
            // Patient code fields (null for legacy patients without a clinic assignment)
            'clinic_code'    => $patient->clinic_code ?? null,
            'patient_code'   => $patient->patient_code ?? null,
        ];
    }

    /**
     * GET /api/v1/patient/me
     * 
     * Return authenticated patient profile
     * Requires Bearer token
     */
    public function me(Request $request)
    {
        try {
            $patient = Patient::find(auth('api')->id());

            if (!$patient) {
                return response()->json([
                    'success' => false,
                    'error' => 'Patient not found',
                ], 404);
            }

            return response()->json([
                'response' => 200,
                'status' => true,
                'data' => $this->formatPatientResponse($patient, $request->header('Authorization')),
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch patient profile',
            ], 500);
        }
    }
}
