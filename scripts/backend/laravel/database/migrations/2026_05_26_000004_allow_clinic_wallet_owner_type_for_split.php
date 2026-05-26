<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Allow clinic wallet ownership for split credits while keeping strict owner validation.
 *
 * owner_type mappings after this migration:
 * - patient => patients.patient_code
 * - doctor  => doctors.user_id
 * - clinic  => clinics.id
 * - user    => users.id (used for Pipe wallet credits)
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'wallets'
                      AND column_name = 'owner_type'
                )
                AND EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'wallets'
                      AND column_name = 'owner_id'
                ) THEN
                    IF EXISTS (
                        SELECT 1
                        FROM wallets w
                        WHERE w.owner_type = 'pipe'
                          AND (
                              w.owner_id IS NULL
                              OR btrim(w.owner_id) = ''
                              OR NOT EXISTS (
                                  SELECT 1
                                  FROM users u
                                  WHERE CAST(u.id AS TEXT) = w.owner_id
                              )
                          )
                    ) THEN
                        RAISE EXCEPTION 'Cannot normalize wallets.owner_type=pipe to user because one or more rows have owner_id that does not map to users.id';
                    END IF;

                    UPDATE wallets
                    SET owner_type = 'user'
                    WHERE owner_type = 'pipe';
                END IF;
            END;
            $$;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'wallets'
                      AND column_name = 'owner_type'
                ) THEN
                    ALTER TABLE wallets
                        DROP CONSTRAINT IF EXISTS wallets_owner_type_check;

                    ALTER TABLE wallets
                        ADD CONSTRAINT wallets_owner_type_check
                        CHECK (owner_type IN ('patient', 'doctor', 'clinic', 'user'));
                END IF;
            END;
            $$;

            CREATE OR REPLACE FUNCTION enforce_wallet_owner_mapping()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF NEW.owner_type = 'patient' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=patient';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM patients p WHERE p.patient_code = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid patients.patient_code', NEW.owner_id;
                    END IF;
                ELSIF NEW.owner_type = 'doctor' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=doctor';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM doctors d WHERE CAST(d.user_id AS TEXT) = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid doctors.user_id', NEW.owner_id;
                    END IF;
                ELSIF NEW.owner_type = 'clinic' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=clinic';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM clinics c WHERE CAST(c.id AS TEXT) = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid clinics.id', NEW.owner_id;
                    END IF;
                ELSIF NEW.owner_type = 'user' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=user';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM users u WHERE CAST(u.id AS TEXT) = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid users.id', NEW.owner_id;
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$;
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'wallets'
                      AND column_name = 'owner_type'
                ) THEN
                    ALTER TABLE wallets
                        DROP CONSTRAINT IF EXISTS wallets_owner_type_check;

                    ALTER TABLE wallets
                        ADD CONSTRAINT wallets_owner_type_check
                        CHECK (owner_type IN ('patient', 'doctor', 'user'));
                END IF;
            END;
            $$;

            CREATE OR REPLACE FUNCTION enforce_wallet_owner_mapping()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF NEW.owner_type = 'patient' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=patient';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM patients p WHERE p.patient_code = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid patients.patient_code', NEW.owner_id;
                    END IF;
                ELSIF NEW.owner_type = 'doctor' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=doctor';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM doctors d WHERE CAST(d.user_id AS TEXT) = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid doctors.user_id', NEW.owner_id;
                    END IF;
                ELSIF NEW.owner_type = 'user' THEN
                    IF NEW.owner_id IS NULL OR btrim(NEW.owner_id) = '' THEN
                        RAISE EXCEPTION 'wallet owner_id is required for owner_type=user';
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM users u WHERE CAST(u.id AS TEXT) = NEW.owner_id
                    ) THEN
                        RAISE EXCEPTION 'wallet owner_id % is not a valid users.id', NEW.owner_id;
                    END IF;
                END IF;

                RETURN NEW;
            END;
            $$;
        SQL);
    }
};
