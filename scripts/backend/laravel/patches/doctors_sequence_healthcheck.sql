-- Read-only diagnostic SQL for the duplicate doctors primary key issue.
-- Run this before re-enabling mutating CRUD integrity checks.
--
-- 1) Inspect current max id and backing sequence state.
SELECT MAX(id) AS max_doctor_id FROM doctors;

SELECT pg_get_serial_sequence('doctors', 'id') AS doctors_id_sequence;

SELECT last_value, is_called
FROM doctors_id_seq;

-- 2) If sequence is behind the table max, backend team can compare values first.
-- Expected safe invariant:
--   last_value >= max(id)
--
-- 3) Only backend/DBA should decide whether to run a setval correction.
--    This file intentionally does NOT include a write statement.
