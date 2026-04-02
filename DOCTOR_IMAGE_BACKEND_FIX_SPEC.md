# Doctor Image Persistence Fix Spec

Date: 2026-04-02
Scope: Backend/API fix only
Constraint: Do not change DB structure. Preserve current frontend and API response shape.

## Problem Summary

Observed production behavior:

1. `POST /api/v1/add_doctor` with multipart `image` returns success.
2. `POST /api/v1/update_doctor` with multipart `image` returns success.
3. `GET /api/v1/get_doctor` or `GET /api/v1/get_doctor/{id}` still returns empty `image`.
4. Frontend therefore falls back to placeholder.

## Most Likely Root Cause

There is a mismatch between:

1. New file metadata approach in [scripts/backend/laravel/app/Services/FileUploadService.php](scripts/backend/laravel/app/Services/FileUploadService.php)
2. New metadata columns in [scripts/backend/laravel/database/migrations/2026_04_01_000000_add_file_metadata_columns.php](scripts/backend/laravel/database/migrations/2026_04_01_000000_add_file_metadata_columns.php)
3. Legacy API/frontend behavior that still expects a non-empty `image` field in doctor responses

### Important implication

Even if the file is stored successfully, image persistence will still appear broken unless controller code writes a path back to the legacy `image` field consumed by the existing API response.

## Safe Fix Strategy

Do not change schema.
Do not change frontend logic.
Do not change response contract.

Instead:

1. Keep using the new metadata columns.
2. Also write the relative path string into legacy `image` fields for backward compatibility.
3. Clear both legacy and metadata fields on remove.
4. Make `get_doctor` return `image` from the first non-empty source.

## Required Backend Behavior

### Create Doctor

When request has file `image`:

1. Validate with `hasFile('image')` and `isValid()`.
2. Store via `FileUploadService`.
3. Persist all metadata fields.
4. Also set legacy `image` to the same relative disk path.
5. Update the user-linked profile image too if the doctor response currently reads from `users.image`.

### Update Doctor

When request has file `image`:

1. Resolve old stored path from `doctor.image_path`, then `doctor.image`, then `user.image_path`, then `user.image`.
2. Replace using `FileUploadService::replace(...)`.
3. Update both metadata and legacy fields.
4. Keep response success only if persistence succeeded.

### Remove Doctor Image

1. Resolve old path from legacy/metadata fields.
2. Delete file using `FileUploadService::delete(...)`.
3. Clear `image`, `image_path`, `image_mime`, `image_size`, `image_checksum`.
4. Clear the user-linked image fields too if they are the response source.

## Controller Patch Pattern

The actual `DoctorController` is not in this workspace, but the fix should follow this shape.

### Shared helper logic

```php
private function applyProfileImage($request, $doctor, $user): void
{
    if (! $request->hasFile('image') || ! $request->file('image')->isValid()) {
        return;
    }

    $service = app(\App\Services\FileUploadService::class);

    $oldPath =
        $doctor->image_path
        ?: $doctor->image
        ?: $user->image_path
        ?: $user->image
        ?: null;

    $meta = $oldPath
        ? $service->replace($request->file('image'), 'doctors', $oldPath)
        : $service->store($request->file('image'), 'doctors');

    $doctor->image = $meta['disk_path'];
    $doctor->image_path = $meta['disk_path'];
    $doctor->image_mime = $meta['mime'];
    $doctor->image_size = $meta['size_bytes'];
    $doctor->image_checksum = $meta['checksum'];

    // Backward compatibility for existing joins/response shape.
    $user->image = $meta['disk_path'];
    $user->image_path = $meta['disk_path'];
    $user->image_mime = $meta['mime'];
    $user->image_size = $meta['size_bytes'];
    $user->image_checksum = $meta['checksum'];
}
```

### In create flow

```php
DB::transaction(function () use ($request, &$doctor, &$user) {
    $user = new User();
    // existing user field assignment...
    $user->save();

    $doctor = new Doctor();
    $doctor->user_id = $user->id;
    // existing doctor field assignment...

    $this->applyProfileImage($request, $doctor, $user);

    $user->save();
    $doctor->save();
});
```

### In update flow

```php
DB::transaction(function () use ($request, $doctor, $user) {
    // existing fill/update logic...

    $this->applyProfileImage($request, $doctor, $user);

    $user->save();
    $doctor->save();
});
```

### In remove image flow

```php
$service = app(\App\Services\FileUploadService::class);

$oldPath =
    $doctor->image_path
    ?: $doctor->image
    ?: $user->image_path
    ?: $user->image
    ?: null;

if ($oldPath) {
    $service->delete($oldPath, 'doctors');
}

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

$user->save();
$doctor->save();
```

## Response Compatibility Requirement

If `get_doctor` currently selects only one source, make sure `image` resolves from the first non-empty field.

Preferred SQL/select pattern:

```php
DB::raw("COALESCE(NULLIF(users.image, ''), NULLIF(doctors.image, ''), NULLIF(users.image_path, ''), NULLIF(doctors.image_path, '')) as image")
```

This preserves current frontend behavior with no frontend changes.

## Validation Rules To Confirm

1. `image` must be treated as file in create/update validation.
2. The request must be multipart form data.
3. Fail the request if file upload or metadata persistence fails.
4. Do not return success when image storage step is skipped unexpectedly.

## Post-Fix Verification

After backend deploy, run these commands:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/automate_image_integrity_fix.ps1 -SkipRemote -AllowMutatingCrudCheck
```

Expected result:

1. Create doctor with image returns success and `image` becomes non-empty.
2. Update doctor image changes the stored path and URL resolves 200.
3. Remove doctor image clears the field.
4. Delete doctor succeeds.

## Notes

- This fix does not require schema changes.
- This fix does not require frontend changes.
- This fix preserves the current `image` field contract while also using the new metadata columns.
