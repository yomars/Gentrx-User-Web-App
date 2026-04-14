<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add name column to patients table.
 *
 * Purpose:
 * - Keep backend compatible with frontend payloads that include full name.
 * - Support legacy/backend code paths that still expect patients.name.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('patients')) {
            return;
        }

        if (!Schema::hasColumn('patients', 'name')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->string('name', 255)
                    ->nullable()
                    ->after('phone')
                    ->comment('Full display name for compatibility with legacy/frontend flows');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('patients')) {
            return;
        }

        if (Schema::hasColumn('patients', 'name')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->dropColumn('name');
            });
        }
    }
};
