<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add api_token to patients for auth:api token guard compatibility.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('patients')) {
            return;
        }

        if (!Schema::hasColumn('patients', 'api_token')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->string('api_token', 80)
                    ->nullable()
                    ->unique()
                    ->after('password_hash')
                    ->comment('Opaque API token for auth:api guard');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('patients')) {
            return;
        }

        if (Schema::hasColumn('patients', 'api_token')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->dropColumn('api_token');
            });
        }
    }
};
