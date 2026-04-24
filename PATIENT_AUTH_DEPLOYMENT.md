# Patient Auth Deployment Guide

## Overview
This guide covers deploying the patient authentication system to the production Laravel backend. The 405 (Method Not Allowed) error you're seeing indicates the patient auth routes are not yet registered on the server.

## Error Diagnosis: 405 Method Not Allowed

**Cause**: The `routes/api/patient-auth.php` file has not been included in the main `routes/api.php` file on the server.

**Solution**: Complete the steps below in order on the production server at `/opt/gentrx-api`.

---

## Step-by-Step Deployment

### Step 1: Copy Backend Files to Server

Copy all files from the workspace to the production Laravel app:

```bash
# From workspace root: c:\PHP\Workspace\Gentrx-User-Web-App\scripts\backend\laravel\

# Copy Controller
cp scripts/backend/laravel/app/Http/Controllers/PatientAuthController.php \
   /opt/gentrx-api/app/Http/Controllers/

# Copy Model
cp scripts/backend/laravel/app/Models/Patient.php \
   /opt/gentrx-api/app/Models/

# Copy Model (AuthenticationLog)
cp scripts/backend/laravel/app/Models/AuthenticationLog.php \
   /opt/gentrx-api/app/Models/

# Copy Middleware
cp scripts/backend/laravel/app/Http/Middleware/EnforcePatientIdentity.php \
   /opt/gentrx-api/app/Http/Middleware/

# Copy Routes file
cp scripts/backend/laravel/routes/api/patient-auth.php \
   /opt/gentrx-api/routes/api/

# Copy Migration files
cp scripts/backend/laravel/database/migrations/2026_04_* \
   /opt/gentrx-api/database/migrations/
```

### Step 2: Register Routes in Main API Router

**File**: `/opt/gentrx-api/routes/api.php`

Add this line at the end of the file (before the closing `?>`):

```php
// Patient Authentication Routes (Phase 3+)
require __DIR__.'/api/patient-auth.php';
```

**Full context** (your routes/api.php should look like):
```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
// ... other imports and routes ...

// Existing routes (doctor, clinic, etc.) go here...

// Patient Authentication Routes (Phase 3+)
require __DIR__.'/api/patient-auth.php';
```

### Step 3: Run Database Migrations

SSH into the production server and run:

```bash
cd /opt/gentrx-api

# Run pending migrations (includes patient auth migrations)
php artisan migrate

# Verify migrations were applied:
php artisan migrate:status
```

**Expected output**: 2 new patient auth migrations should show as "Ran"

### Step 4: Verify Patient Model Configuration

**File**: `/opt/gentrx-api/app/Models/Patient.php`

Ensure the model has the correct `$fillable` array:

```php
protected $fillable = [
    'phone',
    'name',
    'f_name',
    'l_name',
    'email',
    'gender',
    'dob',
    'isd_code',
    'image',
    'image_path',
    'image_mime',
    'image_size',
    'image_checksum',
    'created_by',
    'referred_by',
    // Auth fields (Phase 3+)
    'password_hash',
    'login_attempts',
    'locked_until',
    'auth_status',
    'last_login_at',
    'credential_setup_at',
];
```

### Step 5: Clear Laravel Caches

```bash
cd /opt/gentrx-api

php artisan cache:clear
php artisan route:cache
php artisan config:cache
```

### Step 6: Verify Middleware Registration (Optional but Recommended)

**File**: `/opt/gentrx-api/app/Http/Kernel.php`

If you want to use `EnforcePatientIdentity` middleware on protected routes, register it in the `$routeMiddleware` array:

```php
protected $routeMiddleware = [
    // ... existing middleware ...
    'enforce.patient.identity' => \App\Http\Middleware\EnforcePatientIdentity::class,
];
```

---

## Step 7: Test the Endpoints

Once deployed, test each endpoint:

### Test 1: Check Phone (POST, public)
```bash
curl -X POST https://api.gentrx.ph/api/v1/patient/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'

# Expected response:
# {"response":200,"status":false,"available":true,"phone":"9876543210"}
```

### Test 2: Signup (POST, public)
```bash
curl -X POST https://api.gentrx.ph/api/v1/patient/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"9876543210",
    "f_name":"John",
    "l_name":"Doe",
    "name":"John Doe",
    "email":"john@example.com",
    "password":"1234",
    "gender":"Male",
    "isd_code":"+63"
  }'

# Expected response (201):
# {"response":201,"status":true,"message":"Signup successful","data":{...},"token":"..."}
```

### Test 3: Login (POST, public)
```bash
curl -X POST https://api.gentrx.ph/api/v1/patient/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"9876543210",
    "password":"1234"
  }'

# Expected response (200):
# {"response":200,"status":true,"message":"Login successful","data":{...},"token":"..."}
```

### Test 4: Get Profile (GET, protected)
```bash
curl -X GET https://api.gentrx.ph/api/v1/patient/me \
  -H "Authorization: Bearer <token_from_login>"

# Expected response (200):
# {"response":200,"status":true,"data":{...}}
```

### Test 5: Logout (POST, protected)
```bash
curl -X POST https://api.gentrx.ph/api/v1/patient/logout \
  -H "Authorization: Bearer <token_from_login>"

# Expected response (200):
# {"response":200,"status":true,"message":"Logged out successfully"}
```

---

## Troubleshooting

### Still Getting 405 Error?

1. **Verify routes file is included**:
   ```bash
   cd /opt/gentrx-api
   php artisan route:list | grep patient
   ```
   Should output 5 patient routes. If not, you missed Step 2.

2. **Clear route cache**:
   ```bash
   php artisan route:cache
   ```

3. **Check PHP artisan works**:
   ```bash
   php artisan tinker
   > exit
   ```

### Getting 422 Validation Error?

The request is reaching the endpoint but validation failed. Check:
- `phone` must be exactly 10 digits
- `password` must be exactly 4 digits (not 8+)
- `gender` must be "Male", "Female", or "Other" (not M/F/O)
- Frontend is sending all required fields

### Getting 401 Unauthorized on Protected Routes?

1. Verify the token from login was included in Authorization header
2. Check token format: `Authorization: Bearer <token>`
3. Verify token hasn't expired (24 hours)

### Getting 500 Internal Server Error?

Check Laravel logs:
```bash
tail -f /opt/gentrx-api/storage/logs/laravel.log
```

Common causes:
- PatientAuthController not found (verify Step 1 copied it)
- Patient model not found (verify Step 1)
- Database migrations not run (verify Step 3)
- Middleware not registered (verify Step 6 if using middleware)

---

## Database Verification

After migrations run, verify the schema in PostgreSQL:

```sql
-- Check patients table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;

-- Check authentication_log table exists
SELECT * FROM information_schema.tables
WHERE table_name = 'authentication_log';

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'patients';
```

---

## Rollback (If Needed)

To rollback patient auth and restore legacy endpoints:

```bash
cd /opt/gentrx-api

# Rollback migrations (undoes schema changes)
php artisan migrate:rollback --step=2

# Remove route include from routes/api.php (undo Step 2)
# Remove patient-auth.php line

# Remove copied files:
rm app/Http/Controllers/PatientAuthController.php
rm app/Models/AuthenticationLog.php

# Clear caches
php artisan cache:clear
php artisan route:cache
```

---

## Deployment Checklist

- [ ] Step 1: Copied all backend files to `/opt/gentrx-api`
- [ ] Step 2: Added `require __DIR__.'/api/patient-auth.php';` to `routes/api.php`
- [ ] Step 3: Ran `php artisan migrate` (2 new migrations applied)
- [ ] Step 4: Verified Patient model `$fillable` array
- [ ] Step 5: Cleared Laravel caches (`route:cache`, `config:cache`)
- [ ] Step 6: (Optional) Registered middleware in `app/Http/Kernel.php`
- [ ] Step 7: Tested all 5 endpoints with curl/Postman
- [ ] Database: Verified 7 new columns in patients table
- [ ] Database: Verified authentication_log table created

---

## Next Steps (Frontend)

Once backend is verified working, run frontend locally:

```bash
cd c:\PHP\Workspace\Gentrx-User-Web-App
npm run dev
```

Navigate to:
- `/signup` — Should submit to `POST /api/v1/patient/signup`
- `/login` — Should submit to `POST /api/v1/patient/login`

Both should now work without the 405 error.

---

## Contact/Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all 7 steps completed in order
3. Check Laravel logs at `/opt/gentrx-api/storage/logs/laravel.log`
4. Verify database migrations with `php artisan migrate:status`
