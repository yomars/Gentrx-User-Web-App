<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * EnforcePatientIdentity Middleware
 * 
 * Location: app/Http/Middleware/EnforcePatientIdentity.php
 * 
 * Purpose: Enforce auth domain boundaries - patient tokens cannot call non-patient endpoints
 * 
 * 🔴 CRITICAL SECURITY BOUNDARY:
 * - Patient token with identity_type='patient' → can access /patient/* routes only
 * - Admin token with identity_type='admin_user' → cannot access /patient/* routes
 * - Prevents privilege escalation attacks
 * 
 * Usage: Apply to patient-only route groups
 *   Route::middleware('enforce.patient.identity')->group(...)
 */

class EnforcePatientIdentity
{
    public function handle(Request $request, Closure $next)
    {
        // Get auth token (may be from JWT or session guard)
        $user = auth('api')->user();
        
        // Token must be present
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
                'message' => 'Missing or invalid authentication token',
            ], 401);
        }

        // Token must be from patient identity (not admin)
        $identityType = $this->getIdentityType($user);
        
        if ($identityType !== 'patient') {
            return response()->json([
                'success' => false,
                'error' => 'Forbidden',
                'message' => 'This endpoint is for patient access only',
                'identity_type' => $identityType,
            ], 403);
        }

        // Patient must be active (not suspended/deleted)
        if ($user->auth_status !== 'active') {
            return response()->json([
                'success' => false,
                'error' => 'Forbidden',
                'message' => "Account status: {$user->auth_status}",
            ], 403);
        }

        return $next($request);
    }

    /**
     * Extract identity_type from token/user
     * 
     * Supports both:
     * - JWT payload claim
     * - Eloquent model attribute (if decoded token is stored on user)
     */
    private function getIdentityType($user)
    {
        // If user is Patient model, it's a patient
        if ($user instanceof \App\Models\Patient) {
            return 'patient';
        }

        // If user is User model (admin/doctor), it's admin
        if ($user instanceof \App\Models\User) {
            return 'admin_user';
        }

        // Fallback: check attributes
        return $user->identity_type ?? 'unknown';
    }
}
