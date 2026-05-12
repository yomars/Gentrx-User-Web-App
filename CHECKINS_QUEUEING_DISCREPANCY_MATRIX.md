# Checkins And Queueing Discrepancy Matrix

Date: 2026-05-12
Scope: DB contract, API behavior, frontend queue/checkin flow, migration compatibility

## 1) Inventory Schema And Code Usage

Completed.

- DB schema contract references found for `checkins.patient_code` in `scripts/backend/laravel/database/patient_code_contract_audit.sql`.
- Frontend queue/checkin consumers found in:
  - `src/Pages/AppointmentDetails.jsx`
  - `src/Pages/AppoinmentSuccess.jsx`
  - `src/lib/appointmentIdentity.js`
- Runtime backend checkins controller code is not present in this repository (only artifacts/scripts references).

## 2) Discrepancy Matrix

| Area | Expected | Current | Status | Risk |
|---|---|---|---|---|
| Doctor identifier for queue endpoint | Canonical `doctor_id` support | Endpoint currently behaves as legacy `doct_id` keyed (observed live) | Partial | Future empty queues if `doct_id` removed first |
| Queue order semantics | Explicit, documented ordering rule | Stable but not time-slot ordered; appears checkin insertion ordered | Partial | Rank confusion if users assume schedule-time order |
| Frontend queue rank calculation | Deterministic and endpoint-compatible | Uses array index + 1 | Pass (with current API) | Breaks if backend order rule changes silently |
| Frontend check-in action | Creates checkin or explicitly hands off to scanner flow | QR handoff flow only; no direct checkin create mutation | Partial | User expectation mismatch |
| DB identity contract | `checkins.patient_code` non-null + FK | Previously remediated and validated | Pass | Low |
| Backend runtime checkins source in repo | Present for patch/audit | Missing in this repo | Blocked | Cannot patch controller/query logic here |

## 3) Backend Identity Paths

Requested: patch backend identity paths.

Result: blocked in this repository due to missing runtime checkins controller/routes code.

What is available:
- Contract audit/remediation SQL for DB constraints.
- Patch script references to `AppointmentCheckinController.php` under artifacts.

What is not available here:
- Actual deployed `AppointmentCheckinController.php` source.
- Runtime route registration for checkin endpoint.

## 4) Frontend Contract Mapping Patches Applied

### File: `src/Pages/AppointmentDetails.jsx`

- Queue fetch now tries both doctor ID candidates in migration-safe order:
  - legacy `doct_id`
  - canonical `doctor_id`
- Queue query cache key now includes full candidate set for correctness.
- Queue index comparison now normalizes to numeric comparison.

### File: `src/Pages/AppoinmentSuccess.jsx`

- QR payload now includes both doctor identifier forms:
  - `doctor_id`
  - `doct_id`

This preserves compatibility for scanner/checkin backend paths during identifier migration.

## 5) Integrity And Contract Checks

Performed:

- Live black-box endpoint checks against production:
  - `get_appointment_check_in` global and per-doctor ranges
  - repeated probes to verify cardinality/order stability
  - appointment detail cross-checks (`get_appointment/{id}`)
- Outcome:
  - endpoint response ordering stable across repeated calls in sampled cohorts
  - doctor parameter currently legacy-keyed behavior (`doct_id`)
  - same-day queue ordering not strictly based on appointment `time_slots`

## 6) Delivery Summary

Completed items from requested 1-6 flow:

1. Inventory: complete.
2. Discrepancy matrix: complete.
3. Backend identity patching: blocked by missing runtime source in this repo.
4. Frontend contract patching: complete.
5. Integrity checks: complete (live black-box).
6. Audit report: complete (this file).

## Actionable Next Steps (Backend Repo)

1. Update checkin endpoint to accept canonical `doctor_id` and keep `doct_id` fallback until migration cutover.
2. Return explicit `queue_number` in endpoint payload to remove frontend dependence on array order.
3. Document and enforce ordering rule in query (for example FIFO by `created_at` ASC).
4. Enforce uniqueness policy for same appointment/day if business rules require single checkin.
