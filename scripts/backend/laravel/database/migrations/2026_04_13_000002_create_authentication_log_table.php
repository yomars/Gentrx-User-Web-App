<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create authentication_log table for audit trail.
 *
 * Deploy to: /opt/gentrx-api/database/migrations/
 * Filename:  2026_04_13_000002_create_authentication_log_table.php
 * Run with:  cd /opt/gentrx-api && php artisan migrate
 *
 * Purpose: Track all login attempts (success and failure) for security investigation, compliance, and analytics.
 * Retention: Keep logs for 12 months; configure with separate archival/purge job.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('authentication_log', function (Blueprint $table) {
            // Primary key
            $table->id(); // bigint auto-increment

            // Identity reference
            $table->unsignedBigInteger('patient_id')
                ->nullable()
                ->comment('Attempted patient ID; null if login identifier could not be resolved');
            $table->foreign('patient_id')
                ->references('id')
                ->on('patients')
                ->onDelete('cascade');

            // Attempt details
            $table->string('login_identifier', 255)
                ->comment('Phone or email used in login attempt (not hashed for queryability)');
            $table->string('attempt_type', 50)
                ->comment("Type of attempt: 'login_phone', 'login_email', 'password_reset_request'");
            $table->string('status', 50)
                ->comment("Result: 'success', 'failure_invalid_credentials', 'failure_account_locked', 'failure_account_suspended', 'failure_not_found'");

            // Context
            $table->string('ip_address', 45)
                ->nullable()
                ->comment('Client IP (IPv4 or IPv6)');
            $table->string('user_agent', 500)
                ->nullable()
                ->comment('Browser/app user agent for device identification');
            $table->string('error_message', 500)
                ->nullable()
                ->comment('Detailed failure reason (safe to log, no sensitive data)');

            // Timestamps
            $table->timestamp('attempted_at')
                ->useCurrent()
                ->comment('When the authentication attempt occurred');
            $table->timestamps(); // created_at, updated_at

            // Indexes for common queries
            $table->index('patient_id', 'idx_auth_log_patient_id');
            $table->index('attempted_at', 'idx_auth_log_attempted_at');
            $table->index('login_identifier', 'idx_auth_log_identifier');
            $table->index(['patient_id', 'attempted_at'], 'idx_auth_log_patient_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('authentication_log');
    }
};
