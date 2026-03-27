# Migration Phase 3 Runbook

Date: 2026-03-27

## Goal

Gate frontend release promotion in CI/CD so deploys to Vercel happen only after environment preflight and successful build validation.

## Added in this phase

- Vercel release gate workflow:
  - .github/workflows/vercel-release-gate.yml

## Required secrets

Frontend runtime/build:

- VITE_API_ADDRESS
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_FIREBASE_FCM_PUBLIC_KEY

Vercel deployment:

- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

## Operator flow

1. Configure/verify all required GitHub repository secrets.
2. Trigger workflow: Vercel Release Gate.
3. Start with dry_run_only=true to validate environment + build only.
4. For preview release:
   - target_environment=preview
   - dry_run_only=false
5. For production promotion:
   - target_environment=production
   - dry_run_only=false

## Safety behavior

- Frontend preflight is always enforced before deploy.
- Build must succeed before any deploy job can run.
- Deploy execution is explicit via workflow_dispatch inputs.
- Production deploy runs under the production environment gate.

## Notes

- This phase does not hardcode any credentials.
- VITE_API_ADDRESS domain validation is enforced by preflight script and must target gentrx.ph.
