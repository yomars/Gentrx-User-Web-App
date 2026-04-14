-- Rollback, Verification, and Diagnostic SQL for Patient Auth Migration
-- 
-- PART 1: Verification queries (read-only, safe to run anytime)
-- PART 2: Cleanup queries (for manual rollback if needed)
-- PART 3: Data backfill queries (optional, after migration verification)
--
-- Location: /opt/gentrx-api/
-- Usage: psql -U gentrx_user -d gentrx_db -f patient_auth_migration_helper.sql

-- ============================================================================
-- PART 1: VERIFICATION QUERIES (RUN THESE FIRST)
-- ============================================================================

-- 1. Check if patients table exists and has new columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN ('password_hash', 'login_attempts', 'locked_until', 'email', 'auth_status', 'last_login_at', 'credential_setup_at')
ORDER BY ordinal_position;

-- Expected output: 7 rows with new columns, all nullable='YES'

-- 2. Check if authentication_log table was created
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'authentication_log';

-- Expected output: 1 row (authentication_log)

-- 3. Verify indexes on patients table
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_stat_user_indexes
WHERE tablename = 'patients'
  AND indexname IN ('idx_patients_phone', 'idx_patients_email');

-- Expected output: 2 rows (phone and email indexes)

-- 4. Check current patient data (sample)
SELECT 
    id,
    f_name,
    l_name,
    phone,
    password_hash,
    auth_status,
    credential_setup_at
FROM patients
LIMIT 5;

-- Expected: password_hash and credential_setup_at are NULL for existing patients

-- 5. Verify no existing patients were modified
SELECT COUNT(*) as total_patients FROM patients;
SELECT COUNT(*) as patients_with_credentials 
FROM patients 
WHERE password_hash IS NOT NULL;

-- Expected: patients_with_credentials should be 0 or very small (only new signups)

-- 6. Check for email duplicates (should be none if unique constraint works)
SELECT 
    email,
    COUNT(*) as count
FROM patients
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Expected output: Empty (no duplicates)

-- 7. Check authentication_log schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'authentication_log'
ORDER BY ordinal_position;

-- Expected output: All columns from migration (id, patient_id, login_identifier, etc.)

-- 8. Check for constraint violations (email unique)
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE table_name = 'patients'
  AND constraint_name LIKE '%email%';

-- Expected: One unique constraint on email

-- ============================================================================
-- PART 2: ROLLBACK QUERIES (ONLY IF MIGRATION FAILED)
-- ============================================================================
-- WARNING: Only run if the migration had errors and must be undone.
-- Delete the migration file and run these queries, then re-run migration.

-- Step 1: Drop indexes (if they exist)
DROP INDEX IF EXISTS idx_patients_phone;
DROP INDEX IF EXISTS idx_patients_email;
DROP INDEX IF EXISTS idx_auth_log_patient_id;
DROP INDEX IF EXISTS idx_auth_log_attempted_at;
DROP INDEX IF EXISTS idx_auth_log_identifier;
DROP INDEX IF EXISTS idx_auth_log_patient_date;

-- Step 2: Drop authentication_log table
DROP TABLE IF EXISTS authentication_log CASCADE;

-- Step 3: Remove new columns from patients table
ALTER TABLE patients
    DROP COLUMN IF EXISTS credential_setup_at CASCADE,
    DROP COLUMN IF EXISTS last_login_at CASCADE,
    DROP COLUMN IF EXISTS auth_status CASCADE,
    DROP COLUMN IF EXISTS email CASCADE,
    DROP COLUMN IF EXISTS locked_until CASCADE,
    DROP COLUMN IF EXISTS login_attempts CASCADE,
    DROP COLUMN IF EXISTS password_hash CASCADE;

-- Step 4: Verify rollback (should see 0 rows if successful)
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN ('password_hash', 'login_attempts', 'locked_until', 'email', 'auth_status', 'last_login_at', 'credential_setup_at');

-- Expected: 0 rows (all columns removed)

-- ============================================================================
-- PART 3: BACKFILL QUERIES (OPTIONAL, AFTER FULL MIGRATION SUCCESS)
-- ============================================================================
-- Run these ONLY after:
-- 1. New patient-auth endpoints are deployed
-- 2. New patients have successfully signed up via new endpoints
-- 3. 1-2 weeks of observation with feature flag
-- 4. Explicit approval from product/engineering

-- WARNING: These are data-modifying operations. Test in staging first!

-- Step 1: Create mapping table (for reference, not modifying patients yet)
-- This shows which existing users should map to patients
SELECT 
    u.id as user_id,
    u.phone,
    p.id as patient_id,
    CASE 
        WHEN p.id IS NULL THEN 'NO_PATIENT_MAPPING'
        WHEN p.password_hash IS NOT NULL THEN 'ALREADY_HAS_CREDENTIALS'
        ELSE 'READY_FOR_BACKFILL'
    END as status
FROM users u
LEFT JOIN patients p ON u.phone = p.phone
WHERE u.phone IS NOT NULL
  AND u.phone != ''
LIMIT 10;

-- Expected: Shows potential mappings; use this to validate before committing

-- Step 2: Backfill user_id for patients with matching phones (OPTIONAL)
-- This is only needed if you want to maintain the user_id ↔ patient_id link
-- 
-- WARNING: This modifies the patients table. Run in staging first!
--
-- BEGIN TRANSACTION;
-- UPDATE patients
-- SET user_id = (
--     SELECT id FROM users 
--     WHERE users.phone = patients.phone 
--     LIMIT 1
-- )
-- WHERE user_id IS NULL 
--   AND phone IS NOT NULL
--   AND password_hash IS NULL;  -- Only for existing (non-migrated) patients
-- 
-- -- Verify update count
-- SELECT changes() as rows_updated;
-- 
-- -- Check for any unexpected changes
-- SELECT COUNT(*) FROM patients WHERE user_id IS NOT NULL;
-- 
-- -- If satisfied, commit; else ROLLBACK;
-- COMMIT;

-- Step 3: Security audit - summarize patients with credentials
SELECT 
    COUNT(*) as total_patients,
    SUM(CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END) as patients_with_credentials,
    SUM(CASE WHEN auth_status IN ('active') THEN 1 ELSE 0 END) as active_patients,
    SUM(CASE WHEN auth_status IN ('suspended', 'blocked') THEN 1 ELSE 0 END) as inactive_patients
FROM patients;

-- ============================================================================
-- PART 4: MIGRATION HEALTH CHECK (Run after deployment)
-- ============================================================================

-- 1. Patient auth attempt summary (should be 0 initially, then grow)
SELECT 
    attempt_type,
    status,
    COUNT(*) as count
FROM authentication_log
GROUP BY attempt_type, status;

-- 2. Failed login attempts by patient (for security investigation)
SELECT 
    patient_id,
    COUNT(*) as failed_attempts,
    MAX(attempted_at) as last_attempt
FROM authentication_log
WHERE status LIKE 'failure%'
GROUP BY patient_id
ORDER BY failed_attempts DESC
LIMIT 10;

-- 3. Locked accounts (should be rare)
SELECT 
    id,
    f_name,
    l_name,
    phone,
    login_attempts,
    locked_until
FROM patients
WHERE locked_until IS NOT NULL
  AND locked_until > NOW();

-- Expected: Few or none (only accounts that had 5+ failed attempts within last 30 min)

-- 4. Active new signups today
SELECT 
    COUNT(DISTINCT patient_id) as new_patients_today
FROM patients
WHERE DATE(credential_setup_at) = CURRENT_DATE
  AND password_hash IS NOT NULL;

-- ============================================================================
-- FINAL CHECKLIST
-- ============================================================================
-- Verify all checks pass before promoting to production:
--
-- ✓ VERIFICATION QUERIES 1-8 all return expected output
-- ✓ No rollback queries needed
-- ✓ authentication_log table exists and is empty initially
-- ✓ Indexes are created on patients(phone) and patients(email)
-- ✓ UNIQUE constraint on patients.email is active
-- ✓ New patient-auth endpoints tested in staging
-- ✓ Feature flag USE_PATIENT_TABLE_AUTH ready for gradual rollout
-- ✓ Existing users/patients/doctors remain unchanged
-- ✓ Frontend Signup.jsx and Login.jsx ready for updated endpoint calls
-- ✓ Rate limiting configured for /api/v1/patient/login endpoint
-- ✓ HTTPS enforced for all password endpoints
-- ✓ Error messages do not leak sensitive data
--
-- Once all ✓, proceed to Phase 4: Frontend Migration
