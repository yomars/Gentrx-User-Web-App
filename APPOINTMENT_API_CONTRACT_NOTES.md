# Appointment API Contract Notes (Canonical FK Migration)

## Purpose
Align client payloads and response consumption with canonical appointment linkage keys while retaining legacy compatibility during transition.

## Primary Identifiers
- `appointments.doctor_id` is now the canonical doctor identifier in payloads and responses.
- `appointments.patient_code` is now the canonical patient identifier in payloads and responses.

## Compatibility Identifiers (Deprecated)
- `appointments.doct_id` remains accepted/returned for transition fallback only.
- `appointments.patient_id` remains accepted/returned for display/search compatibility only.

## Client Request Payload Expectations
For `add_appointment` and payment-assisted appointment creation payloads:
- Canonical-first:
  - `doctor_id`
  - `patient_code`
- Transitional fields still included:
  - `doct_id`
  - `patient_id` (when booking for self)

## Client Response Consumption Rules
- Doctor lookups and queue retrieval use:
  - primary `doctor_id`
  - fallback `doct_id` when canonical value is missing.
- Patient lookup from appointment uses:
  - primary `patient_code`
  - fallback `patient_id` when canonical value is missing.

## Feature Flag (Rollback Safe)
- `VITE_USE_CANONICAL_APPOINTMENT_KEYS`
  - Default: enabled (true when not set)
  - Set to `false` to prioritize legacy identifiers temporarily.

## Fallback Observability
- `VITE_LOG_APPOINTMENT_FALLBACKS`
  - Default: enabled.
  - Emits warning logs when canonical fields are absent and fallback is used.
- Session counter key:
  - `appointment_legacy_fallback_hits`
  - Incremented on each fallback usage.

## Query and Index Guidance (Backend)
Recommended canonical query pattern:
- `appointments.doctor_id -> doctors.id`
- `appointments.patient_code -> patients.code`

Recommended index:
- composite index on `(doctor_id, appointment_date, status)` for doctor appointment timeline/listing workloads.
