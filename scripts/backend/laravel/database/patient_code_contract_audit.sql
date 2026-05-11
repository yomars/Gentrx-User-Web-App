-- Patient code contract audit and optional remediation helpers
-- Scope: all_transaction, checkins, laboratory_requests
-- Database: PostgreSQL

-- -----------------------------------------------------------------------------
-- 1) Table/column presence checks
-- -----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('all_transaction', 'checkins', 'laboratory_request', 'laboratory_requests', 'patients')
ORDER BY table_name;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('all_transaction', 'checkins', 'laboratory_request', 'laboratory_requests', 'patients')
  AND column_name IN ('patient_id', 'patient_code')
ORDER BY table_name, column_name;

-- -----------------------------------------------------------------------------
-- 2) Constraint and index checks
-- -----------------------------------------------------------------------------
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('all_transaction', 'checkins', 'laboratory_requests')
  AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('all_transaction', 'checkins', 'laboratory_requests')
  AND indexdef ILIKE '%patient_code%'
ORDER BY tablename, indexname;

-- -----------------------------------------------------------------------------
-- 3) Data integrity checks (nulls/blanks/orphans)
-- -----------------------------------------------------------------------------
SELECT 'all_transaction_null_or_blank_patient_code' AS check_name, COUNT(*) AS issue_count
FROM all_transaction
WHERE patient_code IS NULL OR btrim(patient_code) = ''
UNION ALL
SELECT 'checkins_null_or_blank_patient_code' AS check_name, COUNT(*) AS issue_count
FROM checkins
WHERE patient_code IS NULL OR btrim(patient_code) = ''
UNION ALL
SELECT 'laboratory_requests_null_or_blank_patient_code' AS check_name, COUNT(*) AS issue_count
FROM laboratory_requests
WHERE patient_code IS NULL OR btrim(patient_code) = '';

SELECT 'all_transaction_orphans' AS check_name, COUNT(*) AS issue_count
FROM all_transaction atx
LEFT JOIN patients p ON p.patient_code = atx.patient_code
WHERE atx.patient_code IS NOT NULL AND btrim(atx.patient_code) <> '' AND p.patient_code IS NULL
UNION ALL
SELECT 'checkins_orphans' AS check_name, COUNT(*) AS issue_count
FROM checkins c
LEFT JOIN patients p ON p.patient_code = c.patient_code
WHERE c.patient_code IS NOT NULL AND btrim(c.patient_code) <> '' AND p.patient_code IS NULL
UNION ALL
SELECT 'laboratory_requests_orphans' AS check_name, COUNT(*) AS issue_count
FROM laboratory_requests lr
LEFT JOIN patients p ON p.patient_code = lr.patient_code
WHERE lr.patient_code IS NOT NULL AND btrim(lr.patient_code) <> '' AND p.patient_code IS NULL;

-- -----------------------------------------------------------------------------
-- 4) Optional remediation DDL (review before applying in production)
-- -----------------------------------------------------------------------------
-- Ensure singular deprecated table is absent from runtime schema contracts
-- DROP TABLE IF EXISTS laboratory_request CASCADE;

-- Enforce FK + non-null + non-blank patient_code in target tables.
-- NOTE: Run only after data cleanup queries above return zero issues.
--
-- ALTER TABLE all_transaction
--   ALTER COLUMN patient_code SET NOT NULL;
-- ALTER TABLE all_transaction
--   ADD CONSTRAINT all_transaction_patient_code_fk
--   FOREIGN KEY (patient_code) REFERENCES patients(patient_code) ON DELETE RESTRICT;
-- CREATE INDEX IF NOT EXISTS idx_all_transaction_patient_code ON all_transaction(patient_code);
--
-- ALTER TABLE checkins
--   ALTER COLUMN patient_code SET NOT NULL;
-- ALTER TABLE checkins
--   ADD CONSTRAINT checkins_patient_code_fk
--   FOREIGN KEY (patient_code) REFERENCES patients(patient_code) ON DELETE RESTRICT;
-- CREATE INDEX IF NOT EXISTS idx_checkins_patient_code ON checkins(patient_code);
--
-- ALTER TABLE laboratory_requests
--   ALTER COLUMN patient_code SET NOT NULL;
-- ALTER TABLE laboratory_requests
--   ADD CONSTRAINT laboratory_requests_patient_code_not_blank
--   CHECK (btrim(patient_code) <> '');
-- ALTER TABLE laboratory_requests
--   ADD CONSTRAINT laboratory_requests_patient_code_fk
--   FOREIGN KEY (patient_code) REFERENCES patients(patient_code) ON DELETE RESTRICT;
-- CREATE INDEX IF NOT EXISTS idx_laboratory_requests_patient_code ON laboratory_requests(patient_code);
