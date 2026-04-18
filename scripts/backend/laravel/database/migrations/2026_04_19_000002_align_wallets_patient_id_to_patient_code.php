<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Align wallets.patient_id data type with patients.patient_code (VARCHAR 15).
 *
 * Before: wallets.patient_id  INTEGER  NOT NULL  FK → patients(id)
 * After:  wallets.patient_id  VARCHAR(15)  NOT NULL  FK → patients(patient_code)
 *
 * Steps (PostgreSQL):
 *   1. Drop FK wallets_patient_id_fkey  (references patients.id)
 *   2. Drop UNIQUE wallets_patient_id_key
 *   3. ALTER COLUMN type to VARCHAR(15) using explicit CAST
 *   4. Add UNIQUE constraint back
 *   5. Add FK referencing patients.patient_code
 *
 * The wallets table was empty at migration time so no data conversion is needed.
 * The patients.patient_code column already has a UNIQUE index, satisfying the
 * FK reference requirement.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Use raw SQL so the exact PostgreSQL syntax is clear and auditable.
        DB::unprepared('
            -- 1. Drop FK referencing patients(id)
            ALTER TABLE wallets
                DROP CONSTRAINT IF EXISTS wallets_patient_id_fkey;

            -- 2. Drop unique constraint on patient_id
            ALTER TABLE wallets
                DROP CONSTRAINT IF EXISTS wallets_patient_id_key;

            -- 3. Change column type: INTEGER → VARCHAR(15)
            --    USING cast is required by PostgreSQL for type changes.
            ALTER TABLE wallets
                ALTER COLUMN patient_id TYPE VARCHAR(15)
                USING patient_id::text;

            -- 4. Re-add unique constraint
            ALTER TABLE wallets
                ADD CONSTRAINT wallets_patient_id_key UNIQUE (patient_id);

            -- 5. Add FK referencing patients.patient_code (VARCHAR 15, already UNIQUE)
            ALTER TABLE wallets
                ADD CONSTRAINT wallets_patient_id_fkey
                FOREIGN KEY (patient_id)
                REFERENCES patients (patient_code)
                ON DELETE CASCADE;
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('
            -- Reverse: drop new FK and unique
            ALTER TABLE wallets
                DROP CONSTRAINT IF EXISTS wallets_patient_id_fkey;

            ALTER TABLE wallets
                DROP CONSTRAINT IF EXISTS wallets_patient_id_key;

            -- Revert type back to INTEGER
            ALTER TABLE wallets
                ALTER COLUMN patient_id TYPE INTEGER
                USING patient_id::integer;

            -- Restore original unique constraint
            ALTER TABLE wallets
                ADD CONSTRAINT wallets_patient_id_key UNIQUE (patient_id);

            -- Restore original FK to patients(id)
            ALTER TABLE wallets
                ADD CONSTRAINT wallets_patient_id_fkey
                FOREIGN KEY (patient_id)
                REFERENCES patients (id)
                ON DELETE CASCADE;
        ');
    }
};
