# Migration Phase 2 Runbook

Date: 2026-03-27

## Goal

Operationalize the validated alignment by enforcing environment correctness and database safety checks in CI/CD before any apply step.

## What was added

- Environment preflight validator:
  - scripts/ci/preflight_env.mjs
- Example environment contract:
  - .env.example
- Manual GitHub Actions workflow:
  - .github/workflows/migration-preflight.yml
- NPM shortcuts:
  - preflight:env
  - preflight:frontend
  - preflight:db

## Required GitHub/Vercel secrets

Frontend:
- VITE_API_ADDRESS
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_FIREBASE_FCM_PUBLIC_KEY

DB automation:
- DEST_DATABASE_URL (preferred) or split DB vars
- DEST_DB_HOST
- DEST_DB_PORT
- DEST_DB_USER
- DEST_DB_PASSWORD
- DEST_DB_NAME
- DEST_DB_SCHEMA
- DEST_DB_SSL
- SCHEMA_PATCH_FILE (for apply)
- ALLOW_NON_VULTR_PG (optional; keep false in production)

## Operator flow

1. Configure/verify all required secrets in repository and Vercel project.
2. Trigger GitHub workflow: Migration Preflight.
3. Run with run_db_apply=false first to validate + dry-run.
4. Review dry-run output and approved SQL patch.
5. Re-run with run_db_apply=true for controlled apply.

## Safety controls in place

- Preflight fails when required vars are missing.
- Domain enforcement checks VITE_API_ADDRESS is on gentrx.ph.
- DB safety check enforces Vultr host unless explicit local-test override.
- DB apply runs only when workflow input is explicitly enabled.
