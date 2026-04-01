<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add file metadata columns to all image-bearing tables.
 *
 * Deploy to: /opt/gentrx-api/database/migrations/
 * Filename:  2026_04_01_000000_add_file_metadata_columns.php
 * Run with:  cd /opt/gentrx-api && php artisan migrate
 *
 * Strategy: Additive only — existing VARCHAR image columns are left in place
 * so that legacy URLs continue to work. New *_path/*_mime/*_size/*_checksum
 * columns carry block-storage metadata for new uploads.
 * Once all files are migrated to block storage, the old columns can be dropped
 * in a follow-up migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ------------------------------------------------------------------
        // users — profile picture (doctors and patients share this table)
        // ------------------------------------------------------------------
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'image_path')) {
                $table->string('image_path', 500)->nullable()->after('image');
            }
            if (!Schema::hasColumn('users', 'image_mime')) {
                $table->string('image_mime', 100)->nullable()->after('image_path');
            }
            if (!Schema::hasColumn('users', 'image_size')) {
                $table->unsignedInteger('image_size')->nullable()->after('image_mime')
                      ->comment('File size in bytes');
            }
            if (!Schema::hasColumn('users', 'image_checksum')) {
                $table->string('image_checksum', 80)->nullable()->after('image_size')
                      ->comment('sha256:hex hash of file contents');
            }
        });

        // ------------------------------------------------------------------
        // doctors — profile image + signature
        // ------------------------------------------------------------------
        Schema::table('doctors', function (Blueprint $table) {
            // Profile image
            if (!Schema::hasColumn('doctors', 'image_path')) {
                $table->string('image_path', 500)->nullable()->after('image');
            }
            if (!Schema::hasColumn('doctors', 'image_mime')) {
                $table->string('image_mime', 100)->nullable()->after('image_path');
            }
            if (!Schema::hasColumn('doctors', 'image_size')) {
                $table->unsignedInteger('image_size')->nullable()->after('image_mime');
            }
            if (!Schema::hasColumn('doctors', 'image_checksum')) {
                $table->string('image_checksum', 80)->nullable()->after('image_size');
            }

            // Signature image
            if (!Schema::hasColumn('doctors', 'signature_path')) {
                $table->string('signature_path', 500)->nullable()->after('signature');
            }
            if (!Schema::hasColumn('doctors', 'signature_mime')) {
                $table->string('signature_mime', 100)->nullable()->after('signature_path');
            }
            if (!Schema::hasColumn('doctors', 'signature_size')) {
                $table->unsignedInteger('signature_size')->nullable()->after('signature_mime');
            }
            if (!Schema::hasColumn('doctors', 'signature_checksum')) {
                $table->string('signature_checksum', 80)->nullable()->after('signature_size');
            }
        });

        // ------------------------------------------------------------------
        // clinics — thumb image + full image
        // ------------------------------------------------------------------
        Schema::table('clinics', function (Blueprint $table) {
            if (!Schema::hasColumn('clinics', 'image_path')) {
                $table->string('image_path', 500)->nullable();
            }
            if (!Schema::hasColumn('clinics', 'image_mime')) {
                $table->string('image_mime', 100)->nullable();
            }
            if (!Schema::hasColumn('clinics', 'image_size')) {
                $table->unsignedInteger('image_size')->nullable();
            }
            if (!Schema::hasColumn('clinics', 'image_checksum')) {
                $table->string('image_checksum', 80)->nullable();
            }
            if (!Schema::hasColumn('clinics', 'thumb_image_path')) {
                $table->string('thumb_image_path', 500)->nullable();
            }
        });

        // ------------------------------------------------------------------
        // departments
        // ------------------------------------------------------------------
        Schema::table('departments', function (Blueprint $table) {
            if (!Schema::hasColumn('departments', 'image_path')) {
                $table->string('image_path', 500)->nullable()->after('image');
            }
            if (!Schema::hasColumn('departments', 'image_mime')) {
                $table->string('image_mime', 100)->nullable()->after('image_path');
            }
            if (!Schema::hasColumn('departments', 'image_size')) {
                $table->unsignedInteger('image_size')->nullable()->after('image_mime');
            }
            if (!Schema::hasColumn('departments', 'image_checksum')) {
                $table->string('image_checksum', 80)->nullable()->after('image_size');
            }
        });

        // ------------------------------------------------------------------
        // specializations
        // ------------------------------------------------------------------
        Schema::table('specializations', function (Blueprint $table) {
            if (!Schema::hasColumn('specializations', 'image_path')) {
                $table->string('image_path', 500)->nullable()->after('image');
            }
            if (!Schema::hasColumn('specializations', 'image_mime')) {
                $table->string('image_mime', 100)->nullable()->after('image_path');
            }
            if (!Schema::hasColumn('specializations', 'image_size')) {
                $table->unsignedInteger('image_size')->nullable()->after('image_mime');
            }
            if (!Schema::hasColumn('specializations', 'image_checksum')) {
                $table->string('image_checksum', 80)->nullable()->after('image_size');
            }
        });

        // ------------------------------------------------------------------
        // clinic_images (gallery images per clinic)
        // ------------------------------------------------------------------
        if (Schema::hasTable('clinic_images')) {
            Schema::table('clinic_images', function (Blueprint $table) {
                if (!Schema::hasColumn('clinic_images', 'image_path')) {
                    $table->string('image_path', 500)->nullable()->after('image');
                }
                if (!Schema::hasColumn('clinic_images', 'image_mime')) {
                    $table->string('image_mime', 100)->nullable()->after('image_path');
                }
                if (!Schema::hasColumn('clinic_images', 'image_size')) {
                    $table->unsignedInteger('image_size')->nullable()->after('image_mime');
                }
                if (!Schema::hasColumn('clinic_images', 'image_checksum')) {
                    $table->string('image_checksum', 80)->nullable()->after('image_size');
                }
            });
        }
    }

    public function down(): void
    {
        $columnsToRemove = ['image_path', 'image_mime', 'image_size', 'image_checksum'];

        $tables = ['users', 'departments', 'specializations', 'clinics', 'clinic_images'];
        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table, $columnsToRemove) {
                    foreach ($columnsToRemove as $col) {
                        if (Schema::hasColumn($table, $col)) {
                            $t->dropColumn($col);
                        }
                    }
                });
            }
        }

        Schema::table('doctors', function (Blueprint $table) {
            $cols = ['image_path', 'image_mime', 'image_size', 'image_checksum',
                     'signature_path', 'signature_mime', 'signature_size', 'signature_checksum'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('doctors', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        if (Schema::hasTable('clinics')) {
            Schema::table('clinics', function (Blueprint $table) {
                if (Schema::hasColumn('clinics', 'thumb_image_path')) {
                    $table->dropColumn('thumb_image_path');
                }
            });
        }
    }
};
