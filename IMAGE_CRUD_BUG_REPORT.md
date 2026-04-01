# Doctor Image CRUD Smoke Report

Date: 2026-04-01
Environment: Production API (`https://api.gentrx.ph/api/v1`)
Test Scope: Doctor image Create/Read/Update/Remove/Delete behavior
Tester: Copilot (with provided admin credentials)

## Summary

Doctor record CRUD is working, but doctor image upload persistence is failing.

- `add_doctor` with `image` file returns success but persisted doctor `image` field remains empty.
- `update_doctor` with `image` file returns success but persisted doctor `image` field remains empty.
- `remove_doctor_image` returns success even when no image was persisted.
- `delete_doctor` works and cleanup was verified.

Impact:
- Frontend cannot display real doctor profile images for newly created/updated doctors.
- Users see placeholder image due to missing stored image path.

Severity:
- High (core profile media flow is broken despite success responses).

## Reproduction (Authenticated)

1. Login (email-based admin) succeeded via `POST /login`.
2. Create doctor with multipart `image=@public/doctor-2.png` via `POST /add_doctor`.
3. Read doctor via `GET /get_doctor?active=1` and inspect new record.
4. Update same doctor with multipart `image=@public/doctors.webp` via `POST /update_doctor`.
5. Read doctor again via `GET /get_doctor?active=1`.
6. Remove image via `POST /remove_doctor_image`.
7. Delete doctor via `POST /delete_doctor`.
8. Verify deletion by confirming doctor id no longer appears in `GET /get_doctor?active=1`.

## Actual Results

- Auth: OK
- Create response:
  - `{"response":200,"status":true,"message":"successfully","id":104}`
- Read after create:
  - `image` is empty for `id=104`
- Update response:
  - `{"response":200,"status":true,"message":"successfully"}`
- Read after update:
  - `image` is still empty for `id=104`
- Remove image response:
  - `{"response":200,"status":true,"message":"successfully"}`
- Delete response:
  - `{"response":200,"status":true,"message":"successfully Deleted"}`
- Verify delete:
  - `exists_count=0`

## Expected Results

- After create with image, doctor record should contain non-empty image path in `image` (or mapped image field), and file should be reachable under `/storage/...`.
- After update with a new image, doctor record should reflect updated path (or metadata) and file should be reachable.
- `remove_doctor_image` should clear an existing persisted image and optionally return a no-op message only when image is already absent.

## Important Additional Finding

During early smoke attempts, create failed with a foreign key error when using `clinic_id=1`:

- `SQLSTATE[23503]: insert or update on table "doctors" violates foreign key constraint "doctors_clinic_id_fkey"`
- `Key (clinic_id)=(1) is not present in table "clinics"`

This was resolved by using valid production IDs (`clinic_id=4`, `department=12`, `specialization=Surgeon`).

## Likely Backend Fault Area

Check doctor create/update backend path for these issues:

1. Uploaded file key handling:
   - Ensure request is reading `image` multipart field correctly.
2. File storage invocation:
   - Ensure file upload service is called for doctor image in both create and update flows.
3. DB mapping persistence:
   - Ensure returned storage path is written to doctor record (`image` and/or `image_path`).
4. Response correctness:
   - Avoid returning success when upload/persistence step is skipped or fails.
5. Storage disk path and permissions:
   - Confirm doctors image writes are enabled and not silently failing.

## Acceptance Criteria for Fix

1. Create doctor with image returns success and persisted non-empty image field/path.
2. Update doctor with image replaces persisted path and serves new file.
3. Remove image clears persisted field/path and removes file reference.
4. API returns meaningful failure if upload persistence fails.
5. End-to-end smoke test passes with all image fields verified after each step.

## Suggested Quick Verification Command Set

Use the same authenticated flow already executed in shell, then assert after each create/update:

- `GET /get_doctor?active=1` contains new/updated doctor id with non-empty `image`
- `HEAD https://api.gentrx.ph/storage/<image>` returns `200` and image content type

