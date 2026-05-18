# Vitals Patient Code Hardening (2026-05-18)

## What was enforced live

The admin backend runtime logic is already hardened in production:

1. `patient_code` is required for vitals CRUD (`add_vitals`, `update_vitals`, `delete_vitals`).
2. `get_family_members/patient/:patient_code` uses strict patient scope (no permissive OR expansion).
3. `add_family_member` requires `patient_code`; `user_id` is derived server-side.
4. Vitals ownership is validated by both:
   - `vitals_measurements.family_member_id == family_members.id`
   - `vitals_measurements.patient_code == family_members.patient_code`

## Why this SQL file exists

The current runtime code was updated to avoid mutating schema during requests.
This migration should be applied once to enforce the same rules at the database level.

File: `scripts/backend/hotfixes/2026-05-18-vitals-patient-code-hardening.sql`

## Apply guide (production)

1. SSH to server.
2. Load DB env from `/var/www/gentrx-api/.env`.
3. Run migration against PostgreSQL.

Example (server-side):

```bash
set -a
. /var/www/gentrx-api/.env
set +a
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f /path/to/2026-05-18-vitals-patient-code-hardening.sql
```

## Post-apply checks

```sql
-- Ensure no null patient_code remains
SELECT COUNT(*) AS null_patient_code_family
FROM family_members
WHERE patient_code IS NULL;

SELECT COUNT(*) AS null_patient_code_vitals
FROM vitals_measurements
WHERE patient_code IS NULL;

-- Ensure no mismatched family_member/patient_code rows remain
SELECT COUNT(*) AS mismatches
FROM vitals_measurements vm
JOIN family_members fm ON fm.id = vm.family_member_id
WHERE vm.patient_code <> fm.patient_code;
```

Expected: all counts are `0`.
