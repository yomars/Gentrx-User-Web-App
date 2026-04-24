# Migration Compatibility Report: Appointments Canonical FK Adoption

## Scope
Frontend compatibility updates for appointment-related flows in Gentrx user web app.

## Implemented
1. Canonical-first identifier resolution is now centralized and reused:
- prefers `doctor_id` over `doct_id`
- prefers `patient_code` over `patient_id`

2. Legacy fallback remains available:
- fallback activates only when canonical value is missing.
- each fallback path increments a session counter and emits a warning log (unless disabled).

3. Booking payloads now include canonical identifiers:
- `doctor_id`
- `patient_code`
while retaining transitional fields (`doct_id`, `patient_id`) for compatibility.

4. Patient list rendering is deduplicated by canonical identity (`patient_code`) to avoid duplicate patient cards during mixed payload transitions.

5. Test coverage added for:
- canonical doctor path selection
- canonical patient lookup + legacy fallback behavior
- fallback hit counter updates
- duplicate patient filtering

## Operational Notes
- This repo does not contain active backend query builders/ORM models for appointments.
- Backend SQL/ORM migration changes must be applied in the API repository/service layer.

## Risk Level
- Low to medium (client-side only).
- Main risk is backend endpoints that strictly require legacy values in specific paths.
- Rollback switch is available via `VITE_USE_CANONICAL_APPOINTMENT_KEYS=false`.

## Rollback Plan
1. Set `VITE_USE_CANONICAL_APPOINTMENT_KEYS=false`.
2. Rebuild and deploy frontend artifact.
3. Monitor fallback logs and counter trends.
4. Re-enable canonical mode after backend consistency validation.

## Success Signal
- Fallback warnings trend to near zero in production sessions while appointment and patient flows remain stable.
