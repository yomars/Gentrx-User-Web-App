# Remaining Tasks Plan (Non-Destructive)

Date: 2026-04-02
Scope: Continue remaining work without changing DB structure or core system logic.

## Current Overall Status

- Local runtime/tooling setup: COMPLETE
- Required VS Code extensions: COMPLETE
- Safe integrity automation path: COMPLETE (read-only mode)
- Department image availability: FAILED (all current department image URLs return 404)
- Doctor image persistence (mutating create/update): BLOCKED by backend/API data integrity issue

## Completed (Already Done)

1. Added system readiness checker:
   - `scripts/ci/check_system_requirements.ps1`
2. Added setup guide:
   - `SYSTEM_SETUP.md`
3. Added package script:
   - `npm run check:system`
4. Updated backend automation to use `pwsh` and default to non-mutating CRUD checks:
   - `scripts/backend/automate_image_integrity_fix.ps1`
5. Added read-only safe mode for image integrity checks:
   - `scripts/backend/image_crud_integrity_check.ps1 -ReadOnlySafeMode`

## Remaining Tasks

### 1) Department Image 404 Recovery

Status: OPEN
Risk: Frontend department cards reference broken images.
Evidence:
- `artifacts/department-image-integrity.csv` shows all 5 departments at HTTP 404.
- Image paths currently use `department/...` prefix and resolve to missing files.

Non-destructive actions:
1. Run department resync (remote script) when SSH auth is available.
2. Re-run department integrity report.
3. Confirm all department URLs return HTTP 200.

Commands:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/run_department_resync_on_prod.ps1 -Server 149.28.145.80 -User root -AllowInteractive
pwsh -ExecutionPolicy Bypass -File scripts/backend/department_image_integrity_report.ps1
```

Completion criteria:
- `artifacts/department-image-integrity.csv` has zero 404 rows.

---

### 2) Doctor Image CRUD Persistence (Backend)

Status: OPEN (backend bug)
Risk: API returns success, but image field remains empty after create/update.
Evidence:
- See `IMAGE_CRUD_BUG_REPORT.md`.
- Implementation-ready fix spec: `DOCTOR_IMAGE_BACKEND_FIX_SPEC.md`.
- Backend patch package: `scripts/backend/laravel/patches/README.md`.
- Previous smoke showed successful responses but no stored image path.
- Additional backend issue encountered: duplicate primary key on doctors insert (`doctors_pkey`) during mutating checks.

Non-destructive actions:
1. Keep running read-only integrity checks only until backend fix is deployed.
2. Handoff bug evidence to backend/API team.
3. Ask backend/API team to apply the patch package in `scripts/backend/laravel/patches/`.
4. Ask backend/API team to run the read-only SQL in `scripts/backend/laravel/patches/doctors_sequence_healthcheck.sql` before mutating verification is re-enabled.

Commands (safe):

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/image_crud_integrity_check.ps1 -ReadOnlySafeMode -EnforceBlockCompatiblePrefix
```

Completion criteria:
- Backend confirms fix for create/update image persistence and doctor id insert integrity.
- Then mutating check can be re-enabled explicitly:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/automate_image_integrity_fix.ps1 -SkipRemote -AllowMutatingCrudCheck
```

---

### 3) Daily Safe Verification (No DB structure changes)

Status: READY

Commands:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/ci/check_system_requirements.ps1
pwsh -ExecutionPolicy Bypass -File scripts/backend/automate_image_integrity_fix.ps1 -SkipRemote
```

Expected behavior now:
- Tooling and extensions pass.
- Read-only doctor image check passes.
- Department report may still fail until remote resync is run.

## Ownership Matrix

1. Local DevOps (current workspace): completed setup, safe automation, verification scripts.
2. Backend/API team: fix doctor image persistence and doctors id duplication issue.
3. Infra/Content sync owner: run department resync on production and validate 404 recovery.

## Notes

- This plan intentionally avoids DB schema changes and core app logic changes.
- All provided commands are either read-only or controlled remote sync actions.
