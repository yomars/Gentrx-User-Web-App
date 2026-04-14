<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add Patient Code System
 *
 * Introduces per-clinic, sequential Patient IDs in the format:
 *   <CLINIC_CODE>-<8-digit-zero-padded-sequence>
 *   e.g.  MXN-00000001, MXN-00000002, LAG-00000001
 *
 * Design decisions:
 * - `patient_code_sequences` is the single source of truth for the per-clinic
 *   counter. An INSERT ... ON CONFLICT DO UPDATE RETURNING pattern makes
 *   the increment fully atomic in PostgreSQL without advisory locks.
 * - `patients.patient_code` is UNIQUE and NULLABLE so all existing rows are
 *   unaffected by this migration.
 * - `patients.clinic_code` is stored denormalised (not a FK) so historical
 *   records remain stable even if the clinics table is later restructured.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ----------------------------------------------------------------
        // 1. Per-clinic sequence counter table
        //    Uses clinic_code (CHAR 3) as PK — one row per clinic.
        //    last_sequence starts at 0; the first patient for a clinic gets 1.
        // ----------------------------------------------------------------
        DB::statement("
            CREATE TABLE IF NOT EXISTS patient_code_sequences (
                clinic_code  CHAR(3)  NOT NULL,
                last_sequence INT  NOT NULL DEFAULT 0,
                CONSTRAINT patient_code_sequences_pkey PRIMARY KEY (clinic_code)
            )
        ");

        // ----------------------------------------------------------------
        // 2. New columns on patients (all NULLABLE for backward compat)
        // ----------------------------------------------------------------
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasColumn('patients', 'clinic_code')) {
                // Denormalised copy of the clinic's 3-letter code
                $table->string('clinic_code', 3)->nullable()->after('referred_by');
            }

            if (!Schema::hasColumn('patients', 'patient_sequence')) {
                // Raw numeric portion of the patient code (for queries/sorting)
                $table->unsignedInteger('patient_sequence')->nullable()->after('clinic_code');
            }

            if (!Schema::hasColumn('patients', 'patient_code')) {
                // Formatted patient ID stored as text, e.g. "MXN-00000001"
                $table->string('patient_code', 15)->nullable()->unique()->after('patient_sequence');
            }
        });

        // ----------------------------------------------------------------
        // 3. Index for filtering patients by clinic_code (common query)
        // ----------------------------------------------------------------
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_patients_clinic_code
            ON patients (clinic_code)
            WHERE clinic_code IS NOT NULL
        ");
    }

    public function down(): void
    {
        // Remove the index first
        DB::statement("DROP INDEX IF EXISTS idx_patients_clinic_code");

        // Remove columns from patients
        Schema::table('patients', function (Blueprint $table) {
            $columns = ['patient_code', 'patient_sequence', 'clinic_code'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('patients', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        // Drop the sequences counter table
        DB::statement("DROP TABLE IF EXISTS patient_code_sequences");
    }
};
