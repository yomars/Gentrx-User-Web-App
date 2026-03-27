# Migration Phase 4 Runbook

Date: 2026-03-27

## Goal

Add post-deploy smoke verification so preview and production releases are validated automatically before completion.

## Added in this phase

- Post-deploy smoke checker script:
  - scripts/ci/smoke_check.mjs
- NPM smoke command:
  - smoke:deploy
- Vercel release workflow integration:
  - .github/workflows/vercel-release-gate.yml

## Required/optional secrets

Required for deploy jobs:

- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

Optional for API runtime verification:

- API_HEALTHCHECK_URL

## Operator flow

1. Trigger Vercel Release Gate with dry_run_only=true first.
2. Trigger preview deploy (dry_run_only=false, target_environment=preview).
3. Smoke validation runs automatically after deploy and fails workflow on issues.
4. Trigger production deploy (dry_run_only=false, target_environment=production).
5. Production smoke requires target domain under gentrx.ph.

## Validation checks performed

- Frontend URL responds with successful HTTP status.
- Frontend response contains SPA root element.
- Optional API health endpoint returns successful HTTP status.
- Production target domain is restricted to gentrx.ph.

## Notes

- No credentials are hardcoded.
- Smoke timeout can be adjusted using SMOKE_TIMEOUT_MS env if needed.