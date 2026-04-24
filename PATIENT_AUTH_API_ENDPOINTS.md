# Patient Authentication API Endpoints (Phase 3)

## Overview
New patient-specific auth endpoints to be implemented alongside (not replacing) existing `add_user`/`login_phone` endpoints during the transition phase. Both paths coexist behind a feature flag.

---

## Endpoint: POST /api/v1/patient/signup
**Purpose**: Register a new patient with credentials in the patients table.
**Frontend Caller**: Updated [Signup.jsx](src/Pages/Signup.jsx) (Phase 4)
**Backend Implementation**: New PatientAuthController

### Request Contract
```json
{
  "f_name": "string, required",
  "l_name": "string, required",
  "phone": "string, required, must be unique",
  "isd_code": "string, required",
  "gender": "string, required (male|female|other)",
  "email": "string, optional, must be unique if provided",
  "password": "string, required, min 8 chars",
  "password_confirmation": "string, required, must match password"
}
```

### Validation Rules
- `phone`: Must be unique across all patients
- `email`: Must be unique if provided, format must be valid email
- `password`: Min 8 characters, recommend: uppercase + lowercase + digit + special char
- `f_name`, `l_name`: Must not be empty after trim
- `gender`: Only one of: 'male', 'female', 'other'

### Pre-Check Endpoint (Helper)
**POST /api/v1/patient/check-phone**
- **Request**: `{"phone": "string"}`
- **Response**: `{"available": true/false}`
- **Purpose**: Allow frontend to warn user before form submission if phone exists

### Success Response (201)
```json
{
  "response": 201,
  "status": true,
  "message": "Patient created successfully",
  "data": {
    "id": 45,
    "f_name": "John",
    "l_name": "Doe",
    "phone": "9876543210",
    "isd_code": "+91",
    "email": "john@example.com",
    "gender": "male",
    "auth_status": "active",
    "credential_setup_at": "2026-04-13T10:30:00Z",
    "image": null,
    "image_path": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_claims": {
    "sub": 45,
    "identity_type": "patient",
    "phone": "9876543210",
    "patient_id": 45
  }
}
```

### Error Response: Duplicate Phone (400)
```json
{
  "response": 400,
  "status": false,
  "message": "Phone number already registered. Use password reset or login instead."
}
```

### Error Response: Duplicate Email (400)
```json
{
  "response": 400,
  "status": false,
  "message": "Email already in use"
}
```

### Error Response: Validation Error (422)
```json
{
  "response": 422,
  "status": false,
  "message": "Validation failed",
  "errors": {
    "password": ["Password must be at least 8 characters"],
    "email": ["Email must be a valid email address"]
  }
}
```

### Backend Implementation Logic
```php
/**
 * PatientAuthController::signup()
 */
public function signup(PatientSignupRequest $request) {
    // 1. Validate form data
    $validated = $request->validated();
    
    // 2. Check phone uniqueness
    if (Patient::where('phone', $validated['phone'])->exists()) {
        return response()->json([
            'response' => 400,
            'status' => false,
            'message' => 'Phone number already registered...'
        ], 400);
    }
    
    // 3. Hash password
    $validated['password_hash'] = bcrypt($validated['password']);
    $validated['credential_setup_at'] = now();
    $validated['auth_status'] = 'active';
    unset($validated['password'], $validated['password_confirmation']);
    
    // 4. Create patient record (transaction)
    $patient = Patient::create($validated);
    
    // 5. Generate token
    $token = $this->generatePatientToken($patient);
    
    // 6. Log authentication attempt
    AuthenticationLog::create([
        'patient_id' => $patient->id,
        'login_identifier' => $patient->phone,
        'attempt_type' => 'signup',
        'status' => 'success',
        'ip_address' => request()->ip(),
        'user_agent' => request()->userAgent(),
    ]);
    
    return response()->json([
        'response' => 201,
        'status' => true,
        'message' => 'Patient created successfully',
        'data' => $patient->toArray(),
        'token' => $token,
    ], 201);
}
```

---

## Endpoint: POST /api/v1/patient/login
**Purpose**: Authenticate an existing patient and return session token.
**Frontend Caller**: Updated [Login.jsx](src/Pages/Login.jsx) (Phase 4)
**Backend Implementation**: New PatientAuthController

### Request Contract
```json
{
  "phone": "string, required",
  "password": "string, required"
}
```

### Success Response (200)
```json
{
  "response": 200,
  "status": true,
  "message": "Login successful",
  "data": {
    "id": 45,
    "f_name": "John",
    "l_name": "Doe",
    "phone": "9876543210",
    "isd_code": "+91",
    "email": "john@example.com",
    "gender": "male",
    "auth_status": "active",
    "last_login_at": "2026-04-13T10:45:00Z",
    "image": null,
    "image_path": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_claims": {
    "sub": 45,
    "identity_type": "patient",
    "phone": "9876543210",
    "patient_id": 45
  }
}
```

### Error Response: Invalid Credentials (401)
```json
{
  "response": 401,
  "status": false,
  "message": "Invalid phone or password"
}
```

### Error Response: Account Locked (403)
```json
{
  "response": 403,
  "status": false,
  "message": "Account locked due to too many failed attempts. Try again in 30 minutes."
}
```

### Error Response: Account Suspended (403)
```json
{
  "response": 403,
  "status": false,
  "message": "Account suspended. Contact support."
}
```

### Backend Implementation Logic (Pseudocode)
```php
/**
 * PatientAuthController::login()
 * Implements brute-force protection
 */
public function login(PatientLoginRequest $request) {
    $phone = $request->input('phone');
    $password = $request->input('password');
    
    // 1. Find patient by phone
    $patient = Patient::where('phone', $phone)->first();
    if (!$patient) {
        AuthenticationLog::create([
            'login_identifier' => $phone,
            'attempt_type' => 'login_phone',
            'status' => 'failure_not_found',
            'ip_address' => request()->ip(),
        ]);
        return response()->json([
            'response' => 401,
            'status' => false,
            'message' => 'Invalid phone or password'
        ], 401);
    }
    
    // 2. Check if account is locked (too many failed attempts)
    if ($patient->locked_until && $patient->locked_until->isFuture()) {
        AuthenticationLog::create([
            'patient_id' => $patient->id,
            'login_identifier' => $phone,
            'attempt_type' => 'login_phone',
            'status' => 'failure_account_locked',
            'ip_address' => request()->ip(),
        ]);
        return response()->json([
            'response' => 403,
            'status' => false,
            'message' => 'Account locked due to too many failed attempts...'
        ], 403);
    }
    
    // 3. Check if account is suspended by admin
    if ($patient->auth_status === 'suspended' || $patient->auth_status === 'blocked') {
        AuthenticationLog::create([
            'patient_id' => $patient->id,
            'login_identifier' => $phone,
            'attempt_type' => 'login_phone',
            'status' => 'failure_account_suspended',
            'ip_address' => request()->ip(),
        ]);
        return response()->json([
            'response' => 403,
            'status' => false,
            'message' => 'Account suspended. Contact support.'
        ], 403);
    }
    
    // 4. Verify password (only if patient has credentials)
    if (!$patient->password_hash || !password_verify($password, $patient->password_hash)) {
        $patient->increment('login_attempts');
        
        // Lock account after 5 failed attempts
        if ($patient->login_attempts >= 5) {
            $patient->update(['locked_until' => now()->addMinutes(30)]);
        }
        
        AuthenticationLog::create([
            'patient_id' => $patient->id,
            'login_identifier' => $phone,
            'attempt_type' => 'login_phone',
            'status' => 'failure_invalid_credentials',
            'ip_address' => request()->ip(),
        ]);
        
        return response()->json([
            'response' => 401,
            'status' => false,
            'message' => 'Invalid phone or password'
        ], 401);
    }
    
    // 5. Successful login: reset attempt counter and update last_login_at
    $patient->update([
        'login_attempts' => 0,
        'locked_until' => null,
        'last_login_at' => now(),
    ]);
    
    // 6. Generate token
    $token = $this->generatePatientToken($patient);
    
    // 7. Log successful attempt
    AuthenticationLog::create([
        'patient_id' => $patient->id,
        'login_identifier' => $phone,
        'attempt_type' => 'login_phone',
        'status' => 'success',
        'ip_address' => request()->ip(),
    ]);
    
    return response()->json([
        'response' => 200,
        'status' => true,
        'message' => 'Login successful',
        'data' => $patient->toArray(),
        'token' => $token,
    ]);
}

private function generatePatientToken(Patient $patient): string {
    $payload = [
        'sub' => $patient->id,
        'identity_type' => 'patient',
        'phone' => $patient->phone,
        'patient_id' => $patient->id,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60), // 24 hours
    ];
    
    // Sign and return JWT (or session token, depending on backend strategy)
    return JWT::encode($payload, env('APP_KEY'), 'HS256');
}
```

---

## Endpoint: POST /api/v1/patient/check-phone
**Purpose**: Check if phone is available before signup (optional but recommended).
**Request**: `{"phone": "string"}`
**Response (Available)**: 
```json
{"available": true}
```
**Response (Taken)**:
```json
{"available": false, "message": "Phone already registered"}
```

---

## Endpoint: POST /api/v1/patient/logout (Optional)
**Purpose**: Explicitly invalidate a patient's session token (optional feature).
**Authentication**: Required (Bearer token)
**Request**: Empty body or minimal metadata
**Response**: `{"response": 200, "status": true, "message": "Logged out successfully"}`

---

## Endpoint: POST /api/v1/patient/password-reset (Future, Phase 3+)
**Purpose**: Allow patient to reset forgotten password via phone verification.
**Request**:
```json
{
  "phase": "request" | "verify" | "reset",
  "phone": "string",
  "otp": "string (if verify or reset phase)",
  "new_password": "string (if reset phase)"
}
```

---

## Token Generation Strategy

### Token Library
Use Laravel's built-in JWT or session token generation.

### Payload Structure (Minimum)
```json
{
  "sub": 45,
  "identity_type": "patient",
  "phone": "9876543210",
  "patient_id": 45,
  "iat": 1681241400,
  "exp": 1681327800
}
```

### Key Requirements
- **Expiry**: 24 hours from issuance (recommend)
- **Algorithm**: HS256 (HMAC SHA-256) with APP_KEY
- **Issuer**: Include `iss: 'gentrx-api'` for identification
- **Identity Type**: MUST include `identity_type: 'patient'` to distinguish from admin tokens

### Validation on Backend
```php
// Middleware or in any protected endpoint
$token = $request->bearerToken();
$decoded = JWT::decode($token, new Key(env('APP_KEY'), 'HS256'));

if ($decoded->identity_type !== 'patient') {
    return response()->json([
        'response' => 403,
        'status' => false,
        'message' => 'This token does not have patient scope'
    ], 403);
}

$patientId = $decoded->patient_id;
```

---

## Feature Flag: USE_PATIENT_TABLE_AUTH

### Location
Environment variable: `USE_PATIENT_TABLE_AUTH=false` (default)

### Router Mapping (Pseudo-code)
```php
// routes/api.php (Phase 3 implementation)
Route::post('/login_phone', [UserAuthController::class, 'login']); // Legacy
Route::post('/add_user', [UserAuthController::class, 'signup']);   // Legacy

if (env('USE_PATIENT_TABLE_AUTH')) {
    // New routes take precedence
    Route::post('/patient/login', [PatientAuthController::class, 'login']);
    Route::post('/patient/signup', [PatientAuthController::class, 'signup']);
    Route::post('/patient/check-phone', [PatientAuthController::class, 'checkPhone']);
} else {
    // For safety, define both during transition window
    Route::post('/patient/login', [UserAuthController::class, 'login']); // Alias to legacy
    Route::post('/patient/signup', [UserAuthController::class, 'signup']);
}
```

### Gradual Rollout Levels
- `false` (0%): All traffic via legacy endpoints
- Intermediate (manual feature flag percentage dispatch):
  - 5%: 95% legacy, 5% patient
  - 25%: 75% legacy, 25% patient
  - 50%: 50/50 split
  - 75%: Mostly patient, fallback to legacy
  - 100% (true): All traffic via patient endpoints

---

## Error Handling & Logging

All authentication attempts must be logged to `authentication_log` table:
- Attempt type (login_phone, signup, check_phone, password_reset_request)
- Status (success, failure_invalid_credentials, failure_account_locked, etc.)
- IP address and user agent for security investigation
- Timestamp

---

## Backward Compatibility Window

**Duration**: One full release cycle (recommend 4 weeks minimum)

**Strategy**: 
- Phase 3: New endpoints available but not default
- Phase 4-5: Gradual frontend cutover with feature flag
- Phase 6: Full cutover, legacy endpoints in compatibility mode for 1 more release
- Release N+2: Legacy endpoints can be deprecated (but kept for safety)

---

## Security Considerations

1. **Password Transmission**: ALWAYS use HTTPS; never log passwords
2. **Brute-Force Protection**: Lock account after 5 failed attempts for 30 minutes
3. **Token Expiry**: 24-hour expiry; recommend refresh token strategy later
4. **Rate Limiting**: Recommend API rate limit on /patient/login (e.g., 10 req/min per IP)
5. **Input Validation**: Sanitize phone and email; validate against regex
6. **CORS**: Ensure /api/v1/patient/* endpoints include correct CORS headers for gentrx.ph domain
7. **No Token in Logs**: Strip tokens from error messages before logging

---

## Testing Checklist (Backend QA)

- [ ] Signup with valid phone creates patient record with hashed password
- [ ] Signup with duplicate phone returns 400 error
- [ ] Signup with invalid email format returns 422 error
- [ ] Login with valid credentials returns token with identity_type='patient'
- [ ] Login with wrong password increments login_attempts
- [ ] Login with 5+ failed attempts locks account for 30 minutes
- [ ] Locked account cannot login even with correct password
- [ ] Successful login resets login_attempts to 0 and updates last_login_at
- [ ] Authentication_log table records all attempts (success and failure)
- [ ] Token includes patient_id in payload
- [ ] Expired token returns 401 and 'Session expired' message
- [ ] Patient token cannot be used to call admin-only endpoints
