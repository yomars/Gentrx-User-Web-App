<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add patient authentication columns to patients table.
 *
 * Deploy to: /opt/gentrx-api/database/migrations/
 * Filename:  2026_04_13_000001_add_patient_auth_columns.php
 * Run with:  cd /opt/gentrx-api && php artisan migrate
 *
 * Strategy: Additive only — all new columns are nullable to preserve backward compatibility.
 * Patient credentials can be populated on-demand or via migration script.
 * No existing patient records are modified by this migration.
 * New patients (via patient/signup endpoint) will have credentials populated immediately.
 * Existing patients can migrate credentials by resetting password or via admin backfill script.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add patient auth columns to patients table
        Schema::table('patients', function (Blueprint $table) {
            // Password storage
            if (!Schema::hasColumn('patients', 'password_hash')) {
                $table->string('password_hash', 255)
                    ->nullable()
                    ->after('phone')
                    ->comment('Bcrypt-hashed patient password (nullable for backward compat)');
            }

            // Brute-force protection
            if (!Schema::hasColumn('patients', 'login_attempts')) {
                $table->unsignedInteger('login_attempts')
                    ->default(0)
                    ->after('password_hash')
                    ->comment('Failed login attempts counter; reset on success');
            }

            if (!Schema::hasColumn('patients', 'locked_until')) {
                $table->timestamp('locked_until')
                    ->nullable()
                    ->after('login_attempts')
                    ->comment('Account lockout expiry; null means unlocked');
            }

            // Alternative identifier (email)
            if (!Schema::hasColumn('patients', 'email')) {
                $table->string('email', 255)
                    ->nullable()
                    ->unique()
                    ->after('locked_until')
                    ->comment('Patient email; optional, globally unique if present');
            }

            // Account status
            if (!Schema::hasColumn('patients', 'auth_status')) {
                $table->string('auth_status', 20)
                    ->default('active')
                    ->after('email')
                    ->comment("Account state: 'active', 'blocked', 'suspended'");
            }

            // Audit trail
            if (!Schema::hasColumn('patients', 'last_login_at')) {
                $table->timestamp('last_login_at')
                    ->nullable()
                    ->after('auth_status')
                    ->comment('Timestamp of last successful login');
            }

            if (!Schema::hasColumn('patients', 'credential_setup_at')) {
                $table->timestamp('credential_setup_at')
                    ->nullable()
                    ->after('last_login_at')
                    ->comment('When patient first established credentials (signup or reset)');
            }
        });

        if (!Schema::hasTable('patients')) {
            return; // patients table doesn't exist; exit gracefully
        }

        // Postgres-compatible idempotent index creation.
        DB::statement('CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone)');
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Drop columns in reverse order
            $columnsToRemove = [
                'credential_setup_at',
                'last_login_at',
                'auth_status',
                'email',
                'locked_until',
                'login_attempts',
                'password_hash',
            ];

            foreach ($columnsToRemove as $column) {
                if (Schema::hasColumn('patients', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        DB::statement('DROP INDEX IF EXISTS idx_patients_phone');
    }
};
