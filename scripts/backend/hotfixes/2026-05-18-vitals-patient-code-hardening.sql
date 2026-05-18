-- GentRx Admin Backend hardening migration
-- Date: 2026-05-18
-- Purpose:
--   1) Enforce patient_code on family_members and vitals_measurements
--   2) Enforce invariant: vitals_measurements.family_member_id -> family_members.id
--   3) Enforce invariant: vitals_measurements.patient_code = family_members.patient_code
--
-- Apply on production PostgreSQL (api.gentrx.ph DB) during maintenance window.

BEGIN;

-- 1) Ensure family_members.patient_code exists and is populated.
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS patient_code VARCHAR(50);

UPDATE family_members fm
SET patient_code = p.patient_code
FROM patients p
WHERE fm.patient_code IS NULL
  AND p.patient_code IS NOT NULL
  AND (p.user_id = fm.user_id OR p.id = fm.user_id);

ALTER TABLE family_members
  ALTER COLUMN patient_code SET NOT NULL;

-- 2) Ensure vitals_measurements.patient_code exists and is populated from family members.
ALTER TABLE vitals_measurements
  ADD COLUMN IF NOT EXISTS patient_code VARCHAR(50);

UPDATE vitals_measurements vm
SET patient_code = fm.patient_code
FROM family_members fm
WHERE vm.patient_code IS NULL
  AND vm.family_member_id = fm.id
  AND fm.patient_code IS NOT NULL;

ALTER TABLE vitals_measurements
  ALTER COLUMN patient_code SET NOT NULL;

ALTER TABLE vitals_measurements
  ALTER COLUMN family_member_id SET NOT NULL;

-- 3) Add constraints for hard invariants.
ALTER TABLE family_members
  ADD CONSTRAINT IF NOT EXISTS family_members_id_patient_code_uk
  UNIQUE (id, patient_code);

ALTER TABLE vitals_measurements
  ADD CONSTRAINT IF NOT EXISTS vitals_measurements_family_member_id_patient_code_fk
  FOREIGN KEY (family_member_id, patient_code)
  REFERENCES family_members (id, patient_code)
  ON UPDATE RESTRICT
  ON DELETE RESTRICT;

-- Helpful indexes for lookups.
CREATE INDEX IF NOT EXISTS idx_family_members_patient_code
  ON family_members (patient_code);

CREATE INDEX IF NOT EXISTS idx_vitals_measurements_patient_code_date
  ON vitals_measurements (patient_code, date DESC, time DESC, id DESC);

COMMIT;
