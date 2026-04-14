<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PatientAuthController;

/**
 * Patient Authentication Routes
 * 
 * Location: routes/api/patient-auth.php
 * Prefix: /api/v1
 * Middleware: api (rate limiting)
 * 
 * Phase 3+ Implementation: New patient-centric auth endpoints
 * During Phase 4-5 transition: Feature flag routes to legacy endpoints
 */

Route::prefix('v1/patient')->group(function () {
    // Public endpoints (no auth required)
    Route::post('/check-phone', [PatientAuthController::class, 'checkPhone'])
        ->name('patient.check-phone')
        ->middleware('throttle:30,1'); // 30 requests per minute

    // Public: list clinics for the signup dropdown (no auth required)
    Route::get('/clinics', [PatientAuthController::class, 'getClinics'])
        ->name('patient.clinics')
        ->middleware('throttle:60,1'); // 60 requests per minute

    Route::post('/signup', [PatientAuthController::class, 'signup'])
        ->name('patient.signup')
        ->middleware('throttle:10,1'); // 10 signups per minute to prevent spam

    Route::post('/login', [PatientAuthController::class, 'login'])
        ->name('patient.login')
        ->middleware('throttle:20,1'); // 20 attempts per minute (enables brute-force detection)

    // Protected endpoints (requires Bearer token with identity_type='patient')
    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [PatientAuthController::class, 'me'])
            ->name('patient.me');

        Route::post('/logout', [PatientAuthController::class, 'logout'])
            ->name('patient.logout');
    });
});
