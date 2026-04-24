# Patient Auth Migration - Backend Integration Guide

**Status**: Ready for immediate backend team integration  
**Created**: 2026-04-13  
**Target**: Phase 3 Backend Implementation Launch

---

## Quick Start for Backend Team

### Step 1: Copy Laravel Files (15 minutes)

Copy these files into your Laravel project:

```bash
# Controllers
cp scripts/backend/laravel/app/Http/Controllers/PatientAuthController.php \
   your-laravel-project/app/Http/Controllers/

# Models
cp scripts/backend/laravel/app/Models/Patient.php \
   your-laravel-project/app/Models/

cp scripts/backend/laravel/app/Models/AuthenticationLog.php \
   your-laravel-project/app/Models/

# Middleware
cp scripts/backend/laravel/app/Http/Middleware/EnforcePatientIdentity.php \
   your-laravel-project/app/Http/Middleware/

# Routes
cp scripts/backend/laravel/routes/api/patient-auth.php \
   your-laravel-project/routes/api/

# Migrations
cp scripts/backend/laravel/database/migrations/2026_04_13_000001_add_patient_auth_columns.php \
   your-laravel-project/database/migrations/

cp scripts/backend/laravel/database/migrations/2026_04_13_000002_create_authentication_log_table.php \
   your-laravel-project/database/migrations/
```

### Step 2: Register Components (10 minutes)

**In `app/Http/Kernel.php`**, add middleware to `$routeMiddleware`:

```php
protected $routeMiddleware = [
    // ... existing middleware ...
    'enforce.patient.identity' => \App\Http\Middleware\EnforcePatientIdentity::class,
];
```

**In `routes/api.php`**, add at the end:

```php
// Patient authentication endpoints (Phase 3+)
require __DIR__.'/api/patient-auth.php';
```

### Step 3: Update Patient Model (5 minutes)

Ensure `app/Models/Patient.php` includes the new fields in `$fillable`:

```php
protected $fillable = [
    // ... legacy fields ...
    'password_hash',
    'login_attempts',
    'locked_until',
    'email',
    'auth_status',
    'last_login_at',
    'credential_setup_at',
];
```

### Step 4: Run Migrations (2 minutes)

```bash
php artisan migrate
```

Expected output:
```
Migrating: 2026_04_13_000001_add_patient_auth_columns
Migrated: 2026_04_13_000001_add_patient_auth_columns
Migrating: 2026_04_13_000002_create_authentication_log_table
Migrated: 2026_04_13_000002_create_authentication_log_table
```

### Step 5: Configure JWT (10 minutes)

Update `config/jwt.php` or `.env`:

```env
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY=86400  # 24 hours in seconds
JWT_BCRYPT_ROUNDS=12
```

If using Firebase JWT:

```bash
composer require firebase/php-jwt
```

### Step 6: Test Endpoints (30 minutes)

**Test check-phone**:
```bash
curl -X POST http://localhost/api/v1/patient/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Expected: {"success": true, "available": true}
```

**Test signup**:
```bash
curl -X POST http://localhost/api/v1/patient/signup \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "TestPass123!",
    "password_confirmation": "TestPass123!",
    "name": "John Doe",
    "email": "john@example.com",
    "gender": "M",
    "isd_code": "+91"
  }'

# Expected: {"success": true, "patient_id": 1, "token": "..."}
```

**Test login**:
```bash
curl -X POST http://localhost/api/v1/patient/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "TestPass123!"
  }'

# Expected: {"success": true, "patient_id": 1, "token": "..."}
```

**Test brute-force protection**:
```bash
# Run 6 times with wrong password
for i in {1..6}; do
  curl -X POST http://localhost/api/v1/patient/login \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "9876543210",
      "password": "WrongPassword"
    }'
done

# First 5 return 401, 6th returns 423 (locked)
```

### Step 7: Deploy to Staging

```bash
# Ensure VITE_USE_PATIENT_AUTH=false in frontend .env
# This keeps feature flag OFF during Phase 3 foundation deployment

# Deploy backend (migrations ran, endpoints available but not used yet)
git push origin develop
# (deploy via your CI/CD)

# Frontend stays on legacy paths during Phase 6A
```

---

## Pre-Flight Checklist (Must Pass Before Production)

### Database Verification
- [ ] Run migrations successfully on staging
- [ ] Run Part 1 SQL from `patient_auth_migration_helper.sql`
  ```sql
  -- All 8 verification queries should show:
  -- - patients table has new columns
  -- - authentication_log table created
  -- - indexes created
  -- - no data corruption
  ```

### Endpoint Testing
- [ ] POST /api/v1/patient/check-phone works (validates phone)
- [ ] POST /api/v1/patient/signup works (creates patient + password)
- [ ] POST /api/v1/patient/login works (authenticates patient)
- [ ] Brute-force lock works (5 failures → locked for 30 min)
- [ ] GET /api/v1/patient/me works (requires token)
- [ ] POST /api/v1/patient/logout works
- [ ] Rate limiting works (20 login attempts per minute)

### Security Testing (🔴 CRITICAL)
- [ ] Password hashed with bcrypt (never plaintext in DB)
- [ ] Failed login attempts logged to authentication_log
- [ ] Patient token has identity_type='patient' claim
- [ ] Admin token cannot call /api/v1/patient/* endpoints (403 Forbidden)
- [ ] Patient token cannot call admin endpoints (403 Forbidden)
- [ ] Middleware EnforcePatientIdentity blocks cross-domain access

### Load Testing
- [ ] 100 concurrent user signups (no errors)
- [ ] 500 concurrent login attempts (with rate limiting)
- [ ] Latency p95 < 150ms for login endpoint

### Admin-Web Compatibility
- [ ] Admin login still works (unaffected)
- [ ] Admin can create patients (existing endpoints)
- [ ] Admin can view appointments/labs (unaffected)
- [ ] No 500 errors in admin app

---

## Feature Flag Configuration (Phase 6A→6D)

### Phase 6A (Foundation - Feature Flag OFF)
```env
VITE_USE_PATIENT_AUTH=false
```
- Frontend uses legacy `login_phone`, `add_user` endpoints
- Backend has new endpoints deployed but not in use
- Duration: 24-48 hours, before canary starts

### Phase 6B (Canary 5% - Feature Flag ON for 5% of traffic)
```env
VITE_USE_PATIENT_AUTH=true  # For canary traffic
```
- 5% of browsers get feature flag ON → new endpoints
- 95% still get feature flag OFF → legacy endpoints
- Monitor metrics: error rate, latency, signup success
- Duration: 24-48 hours minimum

### Phase 6C (Gradual Expansion)
- 6C-1: 25% ON, 75% OFF
- 6C-2: 50% ON, 50% OFF
- 6C-3: 75% ON, 25% OFF
- Each: 1-2 days monitoring before expansion

### Phase 6D (100% Production)
```env
VITE_USE_PATIENT_AUTH=true
```
- All traffic on new patient auth endpoints
- Legacy endpoints still available (for fallback only)

---

## Trouble Shooting

### Issue: Migration fails with "table already exists"
**Solution**: Check if patients table already exists. Migration is designed to ADD columns, not CREATE table.
```sql
-- Verify table exists
SELECT COUNT(*) FROM patients;
```

### Issue: Password hashing slow (latency >500ms)
**Solution**: Check BCRYPT_ROUNDS config. Recommended: 12 (default). High values (>14) slow down login.
```env
BCRYPT_ROUNDS=12
```

### Issue: Brute-force lockout too aggressive
**Solution**: Adjust constants in PatientAuthController:
```php
const MAX_LOGIN_ATTEMPTS = 5;      // Increase to 10 if needed
const LOCKOUT_MINUTES = 30;        // Decrease to 15 if needed
```
No rollback needed—just redeploy backend.

### Issue: "Patient not found" during login (but patient exists)
**Solution**: Check auth_status column. Patients must have `auth_status='active'`.
```sql
SELECT id, phone, auth_status, password_hash 
FROM patients 
WHERE phone = '9876543210';
```

### Issue: Token generation fails in login
**Solution**: Ensure JWT secret is set in `.env`:
```env
JWT_SECRET=your-256-bit-secret-here
```

---

## Rollback Procedures (If Needed)

### Level 1: Feature Flag (Instant, <5 min)
```env
# Revert to legacy endpoints
VITE_USE_PATIENT_AUTH=false
```
- All traffic reverts to login_phone, add_user
- Zero data loss
- Use this for any logic errors in new endpoints

### Level 2: Disable New Signup (Partial, <30 min)
```php
// In PatientAuthController signup()
if (env('PATIENT_AUTH_DISABLED')) {
    return response()->json(['error' => 'Signup temporarily disabled'], 503);
}
```
- Keep login enabled, disable new signups
- Use if signup endpoint has bugs
- Existing patients can still login

### Level 3: Database Restore (Full, 30-60 min)
```bash
# Restore from pre-migration backup
pg_restore --dbname=gentrx backup-pre-phase3.sql

# Or rollback migration
php artisan migrate:rollback --step=2
```
- Use only if data corruption detected
- Requires coordination with DevOps/DBA
- Will lose data from Phase 3→rollback period

---

## Post-Deployment Verification (Day 1)

Run these checks 2 hours after deployment:

```sql
-- Check new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='patients' 
AND column_name IN ('password_hash', 'auth_status', 'login_attempts', 'locked_until');

-- Check audit table exists and has entries
SELECT COUNT(*) as total_attempts 
FROM authentication_log 
WHERE attempted_at > NOW() - INTERVAL '2 hours';

-- Check brute-force lockouts are working
SELECT COUNT(*) as locked_accounts 
FROM patients 
WHERE locked_until > NOW();

-- Check no data corruption
SELECT COUNT(*) 
FROM patients 
WHERE id IS NULL OR phone IS NULL;
```

---

## Next Steps

1. **Backend Team**:
   - [ ] Copy files (Step 1)
   - [ ] Register components (Step 2-3)
   - [ ] Run migrations (Step 4)
   - [ ] Configure JWT (Step 5)
   - [ ] Run test suite (Step 6)
   - [ ] Deploy to staging (Step 7)

2. **QA Team** (after backend staging deployment):
   - [ ] Execute 30+ test cases from `/memories/session/phase5-validation.md`
   - [ ] Run security boundary tests (patient ≠ admin)
   - [ ] Cross-repo smoke set (gentrx-web + admin-web)
   - [ ] Get sign-off on all tests

3. **DevOps Team** (after QA sign-off):
   - [ ] Follow PHASE6_CUTOVER_PLAYBOOK.md Phase 6A (foundation)
   - [ ] Deploy migrations to production
   - [ ] Deploy new endpoints (feature flag OFF)
   - [ ] Run Part 1 SQL verification
   - [ ] Proceed to Phase 6B canary when ready

---

## Support Escalation

**During Phase 3 Backend Integration**:
- Issues with file integration → ask backend lead
- Issues with migrations → ask DBA
- Issues with rate limiting → check Laravel config
- Issues with JWT tokens → check .env JWT settings

**During Phase 6 Production Rollout**:
- Issues with feature flag → DevOps can toggle instantly (Level 1)
- Issues with auth domain boundary → Security review required
- Issues with brute-force lockout → Adjust constants + redeploy (no rollback)
- Issues with performance → Check database indexes, query performance

---

**READY FOR BACKEND TEAM START**: All files in place, documentation complete, integration straightforward.

**Expected Timeline**: 
- Backend integration: 2-3 hours
- Staging testing: 1-2 days
- Production Phase 6A-D: 2-4 weeks

Let's ship this! 🚀
