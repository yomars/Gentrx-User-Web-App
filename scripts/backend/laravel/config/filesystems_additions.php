<?php

/**
 * =============================================================================
 * Block Storage Filesystem Disk Configuration
 * =============================================================================
 * Merge these two disk entries into the 'disks' array in:
 *   /opt/gentrx-api/config/filesystems.php
 *
 * Before:
 *   'disks' => [
 *       'local'   => [...],
 *       'public'  => [...],
 *       's3'      => [...],
 *   ],
 *
 * After:
 *   'disks' => [
 *       'local'         => [...],
 *       'public'        => [...],
 *       's3'            => [...],
 *       'block_storage' => [...],  // ← add this
 *       'patients'      => [...],  // ← add this
 *   ],
 * =============================================================================
 */

// Copy the two entries below into the 'disks' array in config/filesystems.php:

        // ---------------------------------------------------------------
        // Block storage — public assets (doctors, clients, system)
        // Root: /mnt/gentrx/uploads (production block volume)
        // URL:  https://api.gentrx.ph/storage (served via Nginx)
        // ---------------------------------------------------------------
        'block_storage' => [
            'driver'     => 'local',
            'root'       => env('BLOCK_STORAGE_ROOT', '/mnt/gentrx/uploads'),
            'url'        => env('BLOCK_STORAGE_URL', 'https://api.gentrx.ph/storage'),
            'visibility' => 'public',
            'throw'      => true,
        ],

        // ---------------------------------------------------------------
        // Patients disk — PRIVATE (no public URL, no Nginx alias)
        // Files here must ONLY be accessed via signed/authenticated routes
        // ---------------------------------------------------------------
        'patients' => [
            'driver'     => 'local',
            'root'       => env('BLOCK_STORAGE_ROOT', '/mnt/gentrx/uploads') . '/patients',
            'visibility' => 'private',
            'throw'      => true,
        ],
