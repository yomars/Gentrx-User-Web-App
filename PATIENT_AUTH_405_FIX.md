# 405 Error Quick Fix

**The Problem**: 
Routes for patient auth endpoints are not registered on the server.

**The Fix** (3 steps, takes 2 minutes on server):

## Step 1: Add Route Include to `/opt/gentrx-api/routes/api.php`

At the end of the file (before `?>`), add:

```php
// Patient Authentication Routes (Phase 3+)
require __DIR__.'/api/patient-auth.php';
```

## Step 2: Copy Routes File

```bash
cp /path/to/workspace/scripts/backend/laravel/routes/api/patient-auth.php \
   /opt/gentrx-api/routes/api/
```

## Step 3: Clear Caches

```bash
cd /opt/gentrx-api
php artisan route:cache
php artisan config:cache
```

**Done!** The 405 error should be gone.

---

## Verify It Works

```bash
curl -X POST https://api.gentrx.ph/api/v1/patient/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

Should return 200 with `{"response":200,"status":false,...}` (not 405)
