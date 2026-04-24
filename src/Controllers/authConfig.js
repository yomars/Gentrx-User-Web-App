import api from "./api";

/**
 * API Endpoint Configuration for Patient Auth
 * 
 * LIVE CONFIGURATION: Patient table is now the ONLY auth source.
 * All login/signup/check-phone calls route to patient endpoints.
 * No feature flag, no fallback to legacy endpoints.
 */

export const AUTH_ENDPOINTS = {
  // Patient Signup Endpoints
  signup: 'patient/signup',
  
  // Patient login endpoint — authenticates against patients table
  login: 'patient/login',
  
  // Pre-check endpoints
  checkPhone: 'patient/check-phone',
  
  // Logout
  logout: 'patient/logout',

  // OTP verification (used before signup to confirm phone ownership)
  sendOtp:   'patient/send-otp',
  verifyOtp: 'patient/verify-otp',
};

let patientBackendReadyPromise = null;

/**
 * Fail fast when patient POST routes are not deployed on backend.
 * This prevents ambiguous retry loops and points to the real fix path.
 */
export async function ensurePatientAuthBackendReady() {
  if (!patientBackendReadyPromise) {
    patientBackendReadyPromise = (async () => {
      const url = `${api}/${AUTH_ENDPOINTS.checkPhone}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: "9876543210" }),
      });

      // Any non-405 response means POST route exists and is reachable.
      if (response.status === 405) {
        throw new Error(
          "Patient auth backend routes are not deployed (POST patient/check-phone returned 405). Run scripts/backend/run_patient_auth_deploy_on_prod.ps1 on backend server."
        );
      }

      return true;
    })();
  }

  return patientBackendReadyPromise;
}

/**
 * Determine which auth endpoint to use
 */
export function getAuthEndpoint(operation) {
  switch (operation) {
    case 'signup':
      return AUTH_ENDPOINTS.signup;
    case 'login':
      return AUTH_ENDPOINTS.login;
    case 'checkPhone':
      return AUTH_ENDPOINTS.checkPhone;
    case 'logout':
      return AUTH_ENDPOINTS.logout;
    case 'sendOtp':
      return AUTH_ENDPOINTS.sendOtp;
    case 'verifyOtp':
      return AUTH_ENDPOINTS.verifyOtp;
    default:
      throw new Error(`Unknown auth operation: ${operation}`);
  }
}
