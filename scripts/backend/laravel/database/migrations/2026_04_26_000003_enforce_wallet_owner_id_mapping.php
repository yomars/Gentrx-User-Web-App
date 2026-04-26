<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Enforce wallet owner mapping rules:
 * - patient wallet: owner_id = patients.patient_code
 * - doctor wallet:  owner_id = doctors.user_id
 * - user wallet:    owner_id = users.id
 *
 * This migration applies PostgreSQL trigger-based validation for polymorphic ownership.
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
                ) THEN
                    ALTER TABLE wallets
                        DROP CONSTRAINT IF EXISTS wallets_owner_type_check;

                    ALTER TABLE wallets
                        ADD CONSTRAINT wallets_owner_type_check
                        CHECK (owner_type IN ('patient', 'doctor', 'user'));
                END IF;
            END;
            $$;

            -- Normalize existing patient rows into strict owner mapping.
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                                        WHERE table_name = 'wallets'
                                            AND column_name = 'patient_code'
                )
                AND EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                                        WHERE table_name = 'wallets'
                                            AND column_name = 'owner_id'
                )
                AND EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                                        WHERE table_name = 'wallets'
                                            AND column_name = 'owner_type'
                ) THEN
                    UPDATE wallets
                                        SET owner_type = 'patient',
                        owner_id = patient_code
                    WHERE patient_code IS NOT NULL
                      AND (
                        owner_type IS NULL
                                                OR owner_type = 'patient'
                        OR owner_id IS DISTINCT FROM patient_code
                      );
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

            DROP TRIGGER IF EXISTS trg_enforce_wallet_owner_mapping ON wallets;
            CREATE TRIGGER trg_enforce_wallet_owner_mapping
            BEFORE INSERT OR UPDATE OF owner_type, owner_id
            ON wallets
            FOR EACH ROW
            EXECUTE FUNCTION enforce_wallet_owner_mapping();

            CREATE INDEX IF NOT EXISTS idx_wallets_owner_type_owner_id
                ON wallets(owner_type, owner_id);
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS trg_enforce_wallet_owner_mapping ON wallets;
            DROP FUNCTION IF EXISTS enforce_wallet_owner_mapping();
            DROP INDEX IF EXISTS idx_wallets_owner_type_owner_id;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE table_name = 'wallets'
                      AND constraint_name = 'wallets_owner_type_check'
                ) THEN
                    ALTER TABLE wallets
                        DROP CONSTRAINT wallets_owner_type_check;
                END IF;
            END;
            $$;
        SQL);
    }
};
