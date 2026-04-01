<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * FileUploadService
 *
 * Central service for all file/image uploads in Gentrx.
 * Handles validation, path generation, storage, and metadata return.
 * All binaries go to block storage; only metadata (path, mime, size, checksum)
 * is stored in the database.
 *
 * Usage:
 *   $meta = app(FileUploadService::class)->store($request->file('image'), 'doctors');
 *   $user->update(['image_path' => $meta['disk_path'], ...]);
 */
class FileUploadService
{
    /**
     * Allowed MIME types per file class.
     */
    private const ALLOWED_MIMES = [
        'doctors'  => ['image/jpeg', 'image/png'],
        'clients'  => ['image/jpeg', 'image/png'],
        'patients' => ['image/jpeg', 'image/png', 'application/pdf'],
        'system'   => ['image/jpeg', 'image/png', 'image/svg+xml'],
    ];

    /**
     * Max upload size in MB per file class.
     * Overridable via env: UPLOAD_MAX_{CLASS}_MB
     */
    private const DEFAULT_MAX_MB = [
        'doctors'  => 2,
        'clients'  => 2,
        'patients' => 20,
        'system'   => 5,
    ];

    /**
     * Which disk to use per file class.
     * 'patients' disk is private (no public URL).
     */
    private const DISK_MAP = [
        'doctors'  => 'block_storage',
        'clients'  => 'block_storage',
        'patients' => 'patients',
        'system'   => 'block_storage',
    ];

    /**
     * Store an uploaded file and return its metadata.
     *
     * @param  UploadedFile  $file       The uploaded file from the request.
     * @param  string        $fileClass  One of: doctors, clients, patients, system
     * @return array{
     *     disk_path:   string,
     *     public_url:  string|null,
     *     disk:        string,
     *     mime:        string,
     *     size_bytes:  int,
     *     checksum:    string,
     * }
     *
     * @throws \RuntimeException  On validation failure or write error.
     */
    public function store(UploadedFile $file, string $fileClass): array
    {
        $this->validateClass($fileClass);
        $this->validateMime($file, $fileClass);
        $this->validateSize($file, $fileClass);

        $disk      = self::DISK_MAP[$fileClass];
        $path      = $this->generatePath($file, $fileClass);
        $checksum  = hash('sha256', file_get_contents($file->getRealPath()));

        $stored = Storage::disk($disk)->putFileAs(
            dirname($path),
            $file,
            basename($path)
        );

        if ($stored === false) {
            throw new RuntimeException("Failed to write file to disk [{$disk}].");
        }

        $publicUrl = $this->buildPublicUrl($disk, $path);

        return [
            'disk_path'  => $path,
            'public_url' => $publicUrl,
            'disk'       => $disk,
            'mime'       => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'checksum'   => 'sha256:' . $checksum,
        ];
    }

    /**
     * Delete a file from its disk given a stored disk_path and file class.
     * Silently skips if file does not exist (idempotent).
     *
     * @param  string  $diskPath   Value previously returned in store()['disk_path']
     * @param  string  $fileClass  One of: doctors, clients, patients, system
     */
    public function delete(string $diskPath, string $fileClass): void
    {
        if (empty($diskPath)) {
            return;
        }

        // Never delete the system default placeholder image
        if (basename($diskPath) === 'def.png') {
            return;
        }

        $disk = self::DISK_MAP[$fileClass] ?? 'block_storage';

        if (Storage::disk($disk)->exists($diskPath)) {
            Storage::disk($disk)->delete($diskPath);
        }
    }

    /**
     * Replace an existing file: store the new one, then delete the old one.
     * Atomic from the caller's perspective — old file is only removed after
     * new file is confirmed written.
     *
     * @param  UploadedFile   $file           New file to store.
     * @param  string         $fileClass      One of: doctors, clients, patients, system
     * @param  string|null    $oldDiskPath    Previous disk_path stored in DB (can be null).
     * @return array  Same shape as store().
     */
    public function replace(UploadedFile $file, string $fileClass, ?string $oldDiskPath): array
    {
        $meta = $this->store($file, $fileClass);

        if ($oldDiskPath !== null) {
            $this->delete($oldDiskPath, $fileClass);
        }

        return $meta;
    }

    /**
     * Generate a deterministic, collision-safe storage path.
     * Format: {class}/{year}/{month}/{uuid}.{ext}
     * Example: doctors/2026/04/550e8400-e29b-41d4-a716-446655440000.jpg
     */
    private function generatePath(UploadedFile $file, string $fileClass): string
    {
        $year  = now()->format('Y');
        $month = now()->format('m');
        $uuid  = Str::uuid()->toString();
        $ext   = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');

        return "{$fileClass}/{$year}/{$month}/{$uuid}.{$ext}";
    }

    /**
     * Build the public-facing URL for a stored file.
     * Returns null for private disks (patients).
     */
    private function buildPublicUrl(string $disk, string $path): ?string
    {
        if ($disk === 'patients') {
            return null; // Private — access via signed URL only
        }

        $baseUrl = rtrim(config('filesystems.disks.block_storage.url', ''), '/');

        // Strip leading class segment to align with Nginx alias paths
        // e.g. "doctors/2026/04/uuid.jpg" -> "/storage/doctors/2026/04/uuid.jpg"
        return $baseUrl . '/' . ltrim($path, '/');
    }

    // -------------------------------------------------------------------------
    // Validation helpers
    // -------------------------------------------------------------------------

    private function validateClass(string $fileClass): void
    {
        if (!array_key_exists($fileClass, self::ALLOWED_MIMES)) {
            $valid = implode(', ', array_keys(self::ALLOWED_MIMES));
            throw new RuntimeException("Invalid file class [{$fileClass}]. Valid: {$valid}");
        }
    }

    private function validateMime(UploadedFile $file, string $fileClass): void
    {
        $allowed = self::ALLOWED_MIMES[$fileClass];
        $mime    = $file->getMimeType();

        if (!in_array($mime, $allowed, true)) {
            $allowed_str = implode(', ', $allowed);
            throw new RuntimeException(
                "File type [{$mime}] is not allowed for class [{$fileClass}]. Allowed: {$allowed_str}"
            );
        }
    }

    private function validateSize(UploadedFile $file, string $fileClass): void
    {
        $envKey  = 'UPLOAD_MAX_' . strtoupper($fileClass) . '_MB';
        $maxMb   = (int) env($envKey, self::DEFAULT_MAX_MB[$fileClass]);
        $maxBytes = $maxMb * 1024 * 1024;

        if ($file->getSize() > $maxBytes) {
            throw new RuntimeException(
                "File exceeds maximum size of {$maxMb} MB for class [{$fileClass}]."
            );
        }
    }
}
