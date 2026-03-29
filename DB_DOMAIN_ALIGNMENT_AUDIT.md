# Database and Domain Alignment Audit

Date: 2026-03-27
Scope: Full workspace review of runtime code, scripts, configuration, and technical docs.

## Executive summary

- Active database tooling in this repository is now PostgreSQL-only and guarded for Vultr hosts.
- Legacy MySQL/MariaDB runtime references were removed from executable tooling and package dependencies.
- Primary domain configuration has been aligned to gentrx.ph where it is currently configured in this frontend repository.
- No backend service code is present in this workspace; API contracts and backend behavior appear in documentation files under .github.

## Database touchpoints

### Runtime and automation touchpoints

1. PostgreSQL client and schema extraction
- File: scripts/db-sync/schema_sync.mjs
- Touchpoints:
  - pg client import and usage
  - PostgreSQL information_schema introspection queries
  - env-based PostgreSQL connection resolution
  - schema search_path setting for apply mode

2. Table scope guard for schema operations
- File: scripts/db-sync/allowlist.json
- Touchpoint: allowlisted table names used to limit schema reporting.

3. NPM automation commands
- File: package.json
- Touchpoint: db:schema:dry-run and db:schema:apply script commands.

4. DB sync operational documentation
- File: scripts/db-sync/README.md
- Touchpoint: PostgreSQL/Vultr env model and apply controls.

### Documentation-level backend touchpoints (non-executable in this repo)

1. Laboratory schema and API references
- File: .github/LABORATORY_REQUEST_API_REFERENCE.md
- Touchpoint: table definitions and API examples.

2. Doctor/department/specialization behavior references
- Files:
  - .github/DOCTOR_API_DOCUMENTATION.md
  - .github/DEPARTMENT_API_DOCUMENTATION.md
  - .github/SPECIALIZATION_API_DOCUMENTATION.md
- Touchpoint: transactional behavior and relational constraints described for backend APIs.

### Artifact anomaly

- File: scripts/artifacts/db-dumps/hsmcupoo_hsmcgiorg_dump_latest.sql
- Observation: content is HTML, not SQL. This is not used by runtime DB tooling in this repository.

## Changes made for PostgreSQL/Vultr exclusivity

1. Removed MySQL/MariaDB executable paths from DB sync script
- File: scripts/db-sync/schema_sync.mjs
- Outcome:
  - removed mysql2 import and MariaDB origin extraction/diff generation blocks
  - retained PostgreSQL schema extraction and optional SQL apply path
  - added Vultr host enforcement with ALLOW_NON_VULTR_PG override for isolated local testing

2. Removed legacy mysql2 dependency
- Files:
  - package.json
  - package-lock.json
- Outcome: no mysql2 references remain in lock/dependency graph.

3. Updated DB tooling docs to PostgreSQL-only
- File: scripts/db-sync/README.md
- Outcome: docs now describe PostgreSQL destination env vars, SCHEMA_PATCH_FILE apply mode, and Vultr guard.

## Domain alignment update

1. API base domain
- File: .env
- Change: VITE_API_ADDRESS moved to https://gentrx.ph

2. User-facing contact email domain
- Files:
  - src/Pages/Login.jsx
  - src/Pages/Signup.jsx
- Change: info@gentrx.ph retained as the current contact email domain

## Domain-dependent logic inventory

1. API base URL resolution
- File: src/Controllers/apiAddress.js
- Uses VITE_API_ADDRESS.

2. Stripe return URL generation
- File: src/Controllers/StripePayController.jsx
- Uses window.location.origin/stripe-payment; follows active domain at runtime.

3. Firebase auth domain configuration
- File: src/Controllers/firebase.config.js
- Uses VITE_FIREBASE_AUTH_DOMAIN (must match configured auth domain in Firebase project).

4. Legacy copy in backup page
- File: src/Pages/Login_11172025.jsx
- Contains older auth flow/page copy and should be treated as inactive unless wired into routes.

## Compatibility and integrity impact summary

- This repository is frontend-first plus DB utility scripts; no backend runtime logic was altered.
- Business workflows, relational constraints, and transactional semantics described in docs were not changed.
- DB script changes are infrastructural/configurational only and do not mutate application business rules.
- Apply mode still executes SQL transactionally (BEGIN/COMMIT with rollback on failure).

## Required CI/CD and Vercel environment variables

### Frontend (Vercel project: gentrx-user-web-app)

Required:
- VITE_API_ADDRESS (set to https://gentrx.ph)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_FIREBASE_FCM_PUBLIC_KEY

Optional frontend/provider values as applicable to deployment environment:
- Google Maps API key env used by map modules (if required by runtime path)
- Payment provider keys managed server-side and never committed client-side

### DB automation (CI runner for schema sync)

Connection (choose URL or split vars):
- DEST_DATABASE_URL (preferred), or
- DEST_DB_HOST
- DEST_DB_PORT
- DEST_DB_USER
- DEST_DB_PASSWORD
- DEST_DB_NAME
- DEST_DB_SCHEMA
- DEST_DB_SSL

Apply control:
- SCHEMA_PATCH_FILE (required in apply mode)

Safety control:
- ALLOW_NON_VULTR_PG (default false; use true only for local non-production testing)

## Validation status

- Review complete for this workspace scope.
- PostgreSQL/Vultr alignment complete for executable DB tooling present here.
- Domain baseline updated to gentrx.ph in active configuration and user-facing auth pages.
- Ready for next migration phase, pending backend repository alignment if backend code lives outside this workspace.
