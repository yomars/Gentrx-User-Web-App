<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PatientAuthController;

/**
 * Patient Authentication Routes
 *
 * Location: routes/api/patient-auth.php
 * Prefix:   /api/v1  (set by the parent api.php include)
 *
 * Auth pattern: Each protected endpoint calls resolvePatientFromToken() internally
 * and returns 401 if the Bearer token is invalid.  We intentionally do NOT use
 * auth:api middleware here because that guard requires config/auth.php to be wired
 * to the patients provider — if the guard is misconfigured the endpoints silently
 * break.  Direct api_token lookup is simpler and self-contained.
 */

Route::prefix('v1/patient')->group(function () {

    // -------------------------------------------------------------------------
    // Public endpoints — no authentication required
    // -------------------------------------------------------------------------

    Route::post('/check-phone', [PatientAuthController::class, 'checkPhone'])
        ->name('patient.check-phone')
        ->middleware('throttle:30,1'); // 30 requests/min

    Route::get('/clinics', [PatientAuthController::class, 'getClinics'])
        ->name('patient.clinics')
        ->middleware('throttle:60,1');

    Route::post('/signup', [PatientAuthController::class, 'signup'])
        ->name('patient.signup')
        ->middleware('throttle:10,1');

    Route::post('/login', [PatientAuthController::class, 'login'])
        ->name('patient.login')
        ->middleware('throttle:20,1');

    // OTP endpoints (public — called before account exists)
    Route::post('/send-otp', [PatientAuthController::class, 'sendOtp'])
        ->name('patient.send-otp')
        ->middleware('throttle:20,1'); // 20 sends/min per IP

    Route::post('/verify-otp', [PatientAuthController::class, 'verifyOtp'])
        ->name('patient.verify-otp')
        ->middleware('throttle:10,1');

    // -------------------------------------------------------------------------
    // Protected endpoints — Bearer token resolved inside each controller method
    // -------------------------------------------------------------------------

    Route::get('/me', [PatientAuthController::class, 'me'])
        ->name('patient.me');

    Route::post('/logout', [PatientAuthController::class, 'logout'])
        ->name('patient.logout');

    Route::post('/update', [PatientAuthController::class, 'update'])
        ->name('patient.update');

    Route::post('/change-password', [PatientAuthController::class, 'changePassword'])
        ->name('patient.change-password');
});
