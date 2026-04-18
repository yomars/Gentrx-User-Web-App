<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create the patient_otps table.
 *
 * Used by POST /api/v1/patient/send-otp  (stores hashed OTP + expiry)
 * and     POST /api/v1/patient/verify-otp (marks used, stores verification_token)
 *
 * The verification_token is then included in the POST /patient/signup payload
 * so the server can confirm the phone was verified before creating the account.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_otps', function (Blueprint $table) {
            $table->id();

            // The mobile phone number (10-digit local, no country prefix)
            $table->string('phone', 15);

            // bcrypt hash of the 6-digit OTP — never store plain OTPs
            $table->string('otp_hash', 255);

            // Short-lived token returned to the client after successful verification.
            // Included in the signup payload so the server can confirm phone ownership.
            $table->string('verification_token', 40)->nullable();

            // OTP expiry — 10 minutes after creation
            $table->timestamp('expires_at');

            // Populated when the OTP is successfully consumed
            $table->timestamp('used_at')->nullable();

            // created_at only (no updated_at — rows are effectively immutable)
            $table->timestamp('created_at')->useCurrent();

            // Index for fast lookup by phone (rate-limit check + verify lookup)
            $table->index('phone');

            // Composite index for the "latest unexpired OTP for phone" query
            $table->index(['phone', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_otps');
    }
};
