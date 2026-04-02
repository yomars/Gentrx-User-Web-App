<?php

/**
 * Example patch for DoctorController image persistence.
 *
 * Purpose:
 * - Preserve current API/frontend contract (`image` must stay populated)
 * - Persist new metadata columns without changing DB structure
 * - Keep doctor and linked user image fields in sync
 *
 * Apply these snippets into the real backend controller methods.
 */

use App\Services\FileUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

private function applyProfileImage(Request $request, $doctor, $user): void
{
    if (! $request->hasFile('image') || ! $request->file('image')->isValid()) {
        return;
    }

    $service = app(FileUploadService::class);

    $oldPath =
        $doctor->image_path
        ?: $doctor->image
        ?: $user->image_path
        ?: $user->image
        ?: null;

    $meta = $oldPath
        ? $service->replace($request->file('image'), 'doctors', $oldPath)
        : $service->store($request->file('image'), 'doctors');

    // Persist metadata on doctors table.
    $doctor->image = $meta['disk_path'];
    $doctor->image_path = $meta['disk_path'];
    $doctor->image_mime = $meta['mime'];
    $doctor->image_size = $meta['size_bytes'];
    $doctor->image_checksum = $meta['checksum'];

    // Preserve current API behavior if image is resolved from users join.
    $user->image = $meta['disk_path'];
    $user->image_path = $meta['disk_path'];
    $user->image_mime = $meta['mime'];
    $user->image_size = $meta['size_bytes'];
    $user->image_checksum = $meta['checksum'];
}

private function clearProfileImage($doctor, $user): void
{
    $doctor->image = null;
    $doctor->image_path = null;
    $doctor->image_mime = null;
    $doctor->image_size = null;
    $doctor->image_checksum = null;

    $user->image = null;
    $user->image_path = null;
    $user->image_mime = null;
    $user->image_size = null;
    $user->image_checksum = null;
}

/*
Example use in create:

DB::transaction(function () use ($request, &$doctor, &$user) {
    $user = new User();
    // existing user field mapping...
    $user->save();

    $doctor = new Doctor();
    $doctor->user_id = $user->id;
    // existing doctor field mapping...

    $this->applyProfileImage($request, $doctor, $user);

    $user->save();
    $doctor->save();
});
*/

/*
Example use in update:

DB::transaction(function () use ($request, $doctor, $user) {
    // existing fill/update logic...

    $this->applyProfileImage($request, $doctor, $user);

    $user->save();
    $doctor->save();
});
*/

/*
Example use in remove_doctor_image:

$service = app(FileUploadService::class);
$oldPath =
    $doctor->image_path
    ?: $doctor->image
    ?: $user->image_path
    ?: $user->image
    ?: null;

if ($oldPath) {
    $service->delete($oldPath, 'doctors');
}

$this->clearProfileImage($doctor, $user);
$user->save();
$doctor->save();
*/
