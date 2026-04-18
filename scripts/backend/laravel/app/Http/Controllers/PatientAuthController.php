<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\AuthenticationLog;
use App\Services\MoviderSmsService;
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
    const PASSWORD_MIN_LENGTH = 4;

    // -------------------------------------------------------------------------
    // PRIVATE HELPER: resolve the authenticated Patient from the Bearer token.
    //
    // We do a direct DB lookup against patients.api_token rather than relying
    // on auth('api')->user(), which depends on the Laravel guard configuration
    // being wired correctly to the patients provider.  This is self-contained
    // and works regardless of how config/auth.php is configured.
    // -------------------------------------------------------------------------
    private function resolvePatientFromToken(Request $request): ?Patient
    {
        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        return Patient::where('api_token', $token)
            ->where('auth_status', 'active')
            ->first();
    }

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
     * Register new patient with phone + password.
     * Requires a valid verification_token from POST /patient/verify-otp
     * (unless GENTRX_PHONE_VERIFY_REQUIRED env var is set to false).
     */
    public function signup(Request $request)
    {
        try {
            // ------------------------------------------------------------------
            // Phone OTP verification gate (configurable via env).
            // Default: ON in production. Set GENTRX_PHONE_VERIFY_REQUIRED=false
            // to bypass (e.g., during internal testing).
            // ------------------------------------------------------------------
            $phoneVerifyRequired = strtolower((string) env('GENTRX_PHONE_VERIFY_REQUIRED', 'true')) !== 'false';

            if ($phoneVerifyRequired) {
                $verificationToken = $request->input('verification_token');
                if (!$verificationToken) {
                    return response()->json([
                        'success'  => false,
                        'error'    => 'Phone verification required.',
                        'message'  => 'Please verify your phone number via OTP before signing up.',
                    ], 422);
                }

                $phone = $request->input('phone');
                $otpRecord = DB::table('patient_otps')
                    ->where('phone', $phone)
                    ->where('verification_token', $verificationToken)
                    ->whereNotNull('used_at')
                    ->where('expires_at', '>', now()->subMinutes(30)) // token valid for 30 min after use
                    ->first();

                if (!$otpRecord) {
                    return response()->json([
                        'success' => false,
                        'error'   => 'Invalid or expired phone verification. Please verify your phone again.',
                    ], 422);
                }
            }

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
                'clinic_id'   => 'required|integer|exists:clinics,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Validation failed',
                    'details' => $validator->errors(),
                ], 422);
            }

            DB::beginTransaction();

            try {
                $fName    = trim((string) $request->input('f_name', ''));
                $lName    = trim((string) $request->input('l_name', ''));
                $fullName = trim($fName . ' ' . $lName);

                // Resolve clinic_code from the clinic record.
                $clinic = DB::table('clinics')
                    ->where('id', (int) $request->input('clinic_id'))
                    ->select('id', 'title', 'clinic_code')
                    ->first();

                if (!empty($clinic->clinic_code)) {
                    $clinicCode = strtoupper(trim((string) $clinic->clinic_code));
                } else {
                    $alphaOnly  = preg_replace('/[^A-Za-z]/', '', $clinic->title ?? '');
                    $clinicCode = strtoupper(str_pad(substr($alphaOnly, 0, 3), 3, 'X'));
                }

                // Atomic per-clinic sequence increment (concurrency-safe).
                $sequenceResult = DB::select("
                    INSERT INTO patient_code_sequences (clinic_code, last_sequence)
                    VALUES (?, 1)
                    ON CONFLICT (clinic_code)
                    DO UPDATE SET last_sequence = patient_code_sequences.last_sequence + 1
                    RETURNING last_sequence
                ", [$clinicCode]);

                $sequence    = (int) $sequenceResult[0]->last_sequence;
                $patientCode = $clinicCode . '-' . str_pad($sequence, 8, '0', STR_PAD_LEFT);

                $patientPayload = [
                    'phone'    => $request->input('phone'),
                    'f_name'   => $fName,
                    'l_name'   => $lName,
                    'email'    => $request->input('email'),
                    'gender'   => $request->input('gender'),
                    'isd_code' => $request->input('isd_code') ?? '+63',

                    'clinic_code'      => $clinicCode,
                    'patient_sequence' => $sequence,
                    'patient_code'     => $patientCode,

                    'password_hash'       => Hash::make($request->input('password')),
                    'auth_status'         => 'active',
                    'login_attempts'      => 0,
                    'locked_until'        => null,
                    'credential_setup_at' => now(),
                    'last_login_at'       => now(),
                ];

                if (Schema::hasColumn('patients', 'name')) {
                    $patientPayload['name'] = $request->input('name') ?: $fullName;
                }

                $patient = Patient::create($patientPayload);

                AuthenticationLog::create([
                    'patient_id'       => $patient->id,
                    'login_identifier' => $request->input('phone'),
                    'attempt_type'     => 'signup',
                    'status'           => 'success',
                    'ip_address'       => $request->ip(),
                    'user_agent'       => $request->header('User-Agent'),
                ]);

                DB::commit();

                // Generate and persist token — unconditional; column must exist.
                $token = $this->generateToken($patient);
                DB::table('patients')->where('id', $patient->id)->update(['api_token' => $token]);

                return response()->json([
                    'response' => 201,
                    'status'   => true,
                    'message'  => 'Signup successful',
                    'data'     => $this->formatPatientResponse($patient, $token),
                    'token'    => $token,
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Signup failed',
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

            // Generate and persist token — unconditional; column must exist.
            $token = $this->generateToken($patient);
            DB::table('patients')->where('id', $patient->id)->update(['api_token' => $token]);

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
     * Invalidates the patient's api_token so subsequent requests are rejected.
     * Frontend always proceeds with local logout regardless of this response.
     */
    public function logout(Request $request)
    {
        try {
            $patient = $this->resolvePatientFromToken($request);

            if ($patient) {
                // Invalidate token server-side
                DB::table('patients')->where('id', $patient->id)->update(['api_token' => null]);

                AuthenticationLog::create([
                    'patient_id'   => $patient->id,
                    'attempt_type' => 'logout',
                    'status'       => 'success',
                    'ip_address'   => $request->ip(),
                    'user_agent'   => $request->header('User-Agent'),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully',
            ], 200);

        } catch (\Exception $e) {
            // Always return 200 for logout — client doesn't need to handle failures
            return response()->json([
                'success' => true,
                'message' => 'Logged out',
            ], 200);
        }
    }

    /**
     * POST /api/v1/patient/update
     *
     * Update the authenticated patient's profile fields.
     * Phone is intentionally excluded (change phone requires a separate OTP flow).
     * Requires Bearer token.
     */
    public function update(Request $request)
    {
        $patient = $this->resolvePatientFromToken($request);
        if (!$patient) {
            return response()->json(['success' => false, 'error' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'f_name'      => 'nullable|string|max:255',
            'l_name'      => 'nullable|string|max:255',
            'email'       => 'nullable|email|unique:patients,email,' . $patient->id,
            'gender'      => 'nullable|in:Male,Female,Other',
            'dob'         => 'nullable|date',
            'city'        => 'nullable|string|max:100',
            'state'       => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'address'     => 'nullable|string|max:500',
            'isd_code'    => 'nullable|string|max:5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error'   => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        $allowed    = ['f_name', 'l_name', 'email', 'gender', 'dob', 'city', 'state', 'postal_code', 'address', 'isd_code'];
        $updateData = array_filter($request->only($allowed), fn($v) => $v !== null && $v !== '');

        // Keep the denormalized name column in sync when present
        if (Schema::hasColumn('patients', 'name')) {
            $fName = $updateData['f_name'] ?? $patient->f_name ?? '';
            $lName = $updateData['l_name'] ?? $patient->l_name ?? '';
            $updateData['name'] = trim("$fName $lName");
        }

        if (!empty($updateData)) {
            $patient->update($updateData);
            $patient->refresh();
        }

        return response()->json([
            'response' => 200,
            'status'   => true,
            'message'  => 'Profile updated successfully',
            'data'     => $this->formatPatientResponse($patient, $request->bearerToken()),
        ], 200);
    }

    /**
     * POST /api/v1/patient/change-password
     *
     * Change the patient's 4-digit PIN.
     * Requires Bearer token + correct current PIN.
     */
    public function changePassword(Request $request)
    {
        $patient = $this->resolvePatientFromToken($request);
        if (!$patient) {
            return response()->json(['success' => false, 'error' => 'Unauthorized'], 401);
        }

        $validator = Validator::make($request->all(), [
            'old_password' => 'required|digits:4',
            'new_password' => 'required|digits:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error'   => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        if (!$patient->password_hash || !Hash::check($request->input('old_password'), $patient->password_hash)) {
            return response()->json([
                'success' => false,
                'error'   => 'Current PIN is incorrect',
            ], 401);
        }

        $patient->update(['password_hash' => Hash::make($request->input('new_password'))]);

        return response()->json([
            'response' => 200,
            'status'   => true,
            'message'  => 'PIN changed successfully',
        ], 200);
    }

    /**
     * POST /api/v1/patient/send-otp
     *
     * Send a 6-digit OTP via Movider SMS to the provided phone number.
     * Rate-limited to 1 OTP per phone per 60 seconds.
     * No authentication required (public endpoint).
     */
    public function sendOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|regex:/^[0-9]{10}$/',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error'   => 'Invalid phone number',
                'details' => $validator->errors(),
            ], 422);
        }

        $phone = $request->input('phone');

        // Rate limit: 1 OTP per phone per 60 seconds
        $recentOtp = DB::table('patient_otps')
            ->where('phone', $phone)
            ->where('created_at', '>=', now()->subSeconds(60))
            ->first();

        if ($recentOtp) {
            return response()->json([
                'success'              => false,
                'error'                => 'Please wait before requesting another OTP.',
                'retry_after_seconds'  => 60,
            ], 429);
        }

        // Generate cryptographically random 6-digit OTP
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store hashed OTP (10-minute expiry)
        DB::table('patient_otps')->insert([
            'phone'      => $phone,
            'otp_hash'   => Hash::make($otp),
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
        ]);

        // Send via Movider
        $sms  = new MoviderSmsService();
        $sent = $sms->send($phone, "Your GentRx verification code: {$otp}. Valid for 10 minutes. Do not share this code.");

        if (!$sent) {
            return response()->json([
                'success' => false,
                'error'   => 'Failed to send OTP. Please try again.',
            ], 500);
        }

        return response()->json([
            'response' => 200,
            'status'   => true,
            'message'  => 'OTP sent successfully. Check your SMS.',
        ], 200);
    }

    /**
     * POST /api/v1/patient/verify-otp
     *
     * Verify the OTP for a phone number.
     * On success returns a verification_token to be included in /patient/signup.
     * No authentication required (public endpoint).
     */
    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|regex:/^[0-9]{10}$/',
            'otp'   => 'required|digits:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error'   => 'Invalid request',
                'details' => $validator->errors(),
            ], 422);
        }

        $phone = $request->input('phone');
        $otp   = $request->input('otp');

        // Find the latest unexpired, unused OTP for this phone
        $record = DB::table('patient_otps')
            ->where('phone', $phone)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'error'   => 'OTP expired or not found. Please request a new one.',
            ], 422);
        }

        if (!Hash::check($otp, $record->otp_hash)) {
            return response()->json([
                'success' => false,
                'error'   => 'Invalid OTP. Please try again.',
            ], 422);
        }

        // Mark OTP as used and store a short-lived verification token
        $verificationToken = bin2hex(random_bytes(16)); // 32-char hex

        DB::table('patient_otps')
            ->where('id', $record->id)
            ->update([
                'used_at'            => now(),
                'verification_token' => $verificationToken,
            ]);

        return response()->json([
            'response'           => 200,
            'status'             => true,
            'message'            => 'Phone verified successfully.',
            'verification_token' => $verificationToken,
        ], 200);
    }

    /**
     * Helper: Generate an opaque auth token for a patient.
     * 64-char hex string stored in patients.api_token (column max 80).
     */
    private function generateToken($patient): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Helper: Format patient response matching frontend localStorage.user structure.
     *
     * NOTE: The 'token' key in this payload is used by login/signup responses.
     * For GET /patient/me, the frontend ignores this field and keeps its existing
     * token (see updateUserLocalStorage.js), so it is safe to pass bearerToken().
     */
    private function formatPatientResponse($patient, ?string $token): array
    {
        $fName = $patient->f_name ?? '';
        $lName = $patient->l_name ?? '';

        if (($fName === '' || $lName === '') && !empty($patient->name)) {
            $nameParts = preg_split('/\s+/', trim((string) $patient->name));
            $fName = $fName !== '' ? $fName : ($nameParts[0] ?? '');
            $lName = $lName !== '' ? $lName : (count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '');
        }

        // Fetch wallet balance keyed by patient_code (wallets.patient_id = VARCHAR patient_code).
        $patientCode = $patient->patient_code ?? null;
        $walletAmount = 0;
        if ($patientCode) {
            $wallet = DB::table('wallets')->where('patient_id', $patientCode)->first();
            $walletAmount = $wallet ? (float) $wallet->balance : 0;
        }

        return [
            'id'             => $patient->id,
            'f_name'         => $fName,
            'l_name'         => $lName,
            'phone'          => $patient->phone,
            'email'          => $patient->email,
            'gender'         => $patient->gender,
            'isd_code'       => $patient->isd_code,
            'dob'            => $patient->dob ? (is_string($patient->dob) ? $patient->dob : $patient->dob->format('Y-m-d')) : null,
            'city'           => $patient->city ?? null,
            'state'          => $patient->state ?? null,
            'postal_code'    => $patient->postal_code ?? null,
            'address'        => $patient->address ?? null,
            'image'          => $patient->image ?? null,
            'image_path'     => $patient->image_path ?? null,
            'image_mime'     => $patient->image_mime ?? null,
            'image_size'     => $patient->image_size ?? null,
            'image_checksum' => $patient->image_checksum ?? null,
            'token'          => $token,
            'auth_status'    => $patient->auth_status,
            'created_at'     => $patient->created_at ? $patient->created_at->toISOString() : null,
            'clinic_code'    => $patient->clinic_code ?? null,
            'patient_code'   => $patientCode,
            'wallet_amount'  => $walletAmount,
        ];
    }

    /**
     * GET /api/v1/patient/me
     *
     * Return the authenticated patient's profile.
     * Requires Bearer token.
     */
    public function me(Request $request)
    {
        $patient = $this->resolvePatientFromToken($request);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error'   => 'Unauthorized',
                'message' => 'Invalid or expired token.',
            ], 401);
        }

        return response()->json([
            'response' => 200,
            'status'   => true,
            'data'     => $this->formatPatientResponse($patient, $request->bearerToken()),
        ], 200);
    }
}
