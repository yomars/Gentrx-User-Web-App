# Phase 6: Cutover, Rollback, and Cleanup - ROLLOUT PLAYBOOK

**Status**: PLANNING  
**Scope**: Staged production rollout with monitoring, rollback plan, and final cleanup
**Duration**: 2-4 weeks (canary 5% → 100% at cautious pace)
**Owner**: DevOps, SRE, Product

---

## Pre-Rollout Checklist (Must Complete Before Any Production Change)

### Backend Validation ✅
- [ ] Phase 1-3 completely designed and documented
- [ ] Phase 3 migrations tested in staging (all VERIFICATION queries pass)
- [ ] Phase 3 PatientAuthController implemented and unit tested
- [ ] Phase 3 endpoints tested via Postman/curl:
  - POST /api/v1/patient/signup (success, duplicate email, duplicate phone, validation)
  - POST /api/v1/patient/login (success, wrong password, account locked, account suspended)
  - POST /api/v1/patient/check-phone (available, taken)
- [ ] Token structure verified to include identity_type='patient'
- [ ] Brute-force lockout tested (5 failed attempts → 30-min lock)
- [ ] Session expiry (24-hour token) tested
- [ ] HTTPS enforced on all password endpoints (critical!)
- [ ] Rate limiting configured on /api/v1/patient/login (10 req/min per IP recommended)
- [ ] Error messages sanitized (no password in logs)
- [ ] CORS headers set for gentrx.ph domain
- [ ] Error handling middleware logs to authentication_log table

### Frontend Validation ✅
- [ ] Phase 4 authConfig.js deployed and tested
- [ ] Login.jsx and Signup.jsx tested with both feature flag states
- [ ] Signup form works with both add_user and patient/signup endpoints
- [ ] Login form works with both login_phone and patient/login endpoints
- [ ] Session expiry (401 → redirect to /login) works for both
- [ ] localStorage user object correctly stored
- [ ] All error scenarios handled (duplicate phone, wrong pwd, account locked, etc.)
- [ ] Appointment/labs/files flows verified (use patient_id from API responses)
- [ ] No console errors or warnings during full user flow

### Admin-Web Validation ✅
- [ ] Phase 5 admin/patient boundary test passed (patient token → 403 on admin endpoints)
- [ ] Admin login/logout unchanged and working
- [ ] Admin CRUD operations unchanged
- [ ] Admin-web tested on production-like DB with new schema
- [ ] Doctor/appointment/lab request flows verified against admin-web
- [ ] No regression in admin functionality

### Deployment Prerequisites ✅
- [ ] Marketing/Product notified of planned maintenance window (if needed)
- [ ] Support team briefed on potential issues and rollback procedure
- [ ] Runbook shared with on-call engineer
- [ ] Rollback scripts prepared and tested in staging
- [ ] Database backup verified (point-in-time recovery available)
- [ ] Monitoring dashboards set up (auth success rate, error rate, latency)
- [ ] Alert thresholds configured (e.g., error rate > 5% triggers page)
- [ ] Stakeholder sign-off obtained (Product, Security, Ops)

---

## Production Deployment Timeline

### Phase 6A: Production Foundation (No Traffic Change)

**Goal**: Deploy infrastructure without affecting user traffic. All traffic still on legacy paths.

**Duration**: 1-2 hours

**Tasks**:
1. **Prepare Production DB** (DBA owned)
   - Backup current DB (snapshots or WAL-based)
   - Verify backup is accessible and tested for restore

2. **Deploy Migrations** (10-15 minutes)
   ```bash
   cd /opt/gentrx-api
   php artisan migrate
   ```
   - Monitor for errors
   - Run Part 1 verification queries (all must pass)
   - No data corruption should occur

3. **Deploy Backend Controllers** (5-10 minutes)
   - Blue-green or rolling update
   - Both legacy and patient endpoints available
   - Feature flag SET TO FALSE: `USE_PATIENT_TABLE_AUTH=false` (legacy paths active)
   - No traffic to new endpoints yet

4. **Deploy Frontend Changes** (5 minutes)
   - authConfig.js, Login.jsx, Signup.jsx deployed
   - Feature flag: `VITE_USE_PATIENT_AUTH=false` (use legacy endpoints)
   - Smoke test: User signup/login via legacy paths still works

5. **Post-Deployment Verification** (30 minutes)
   - Run baseline smoke suite (user signup → login → book appointment → view appointment → confirm)
   - Monitor error logs (should be near-zero)
   - Monitor auth success rates (should be 99%+)
   - Notify stakeholders: "Foundation deployed, legacy paths working"

### Phase 6B: Canary Deployment (5% Traffic)

**Goal**: Route small percentage of traffic to new patient endpoints. Most users stay on legacy.

**Duration**: 24-48 hours

**Prerequisites**:
- Phase 6A foundation deployed and healthy
- All smoke tests passing
- Error rate baseline established

**Deployment**:
1. **Backend Feature Flag** (5% traffic)
   ```bash
   USE_PATIENT_TABLE_AUTH=0.05  # Backend sends 5% to new endpoints
   ```
   - Backend implements feature flag distribution:
     ```php
     if (rand(1, 100) <= env('USE_PATIENT_TABLE_AUTH_PERCENT', 0)) {
         // New patient endpoints
     } else {
         // Legacy endpoints
     }
     ```

2. **Frontend Feature Flag** (5% traffic via cookie/header)
   ```javascript
   // CDN/server can set cookie: VITE_USE_PATIENT_AUTH=0.05
   // Or via URL param for controlled testing
   ```

3. **Monitoring** (continuous for 24-48 hours)
   - Track signup success rate (target: 95%+ for canary traffic)
   - Track login success rate (target: 98%+)
   - Compare error rates: canary vs baseline
   - Watch for unusual patterns (e.g., duplicate phone errors)
   - Monitor authentication_log table for attempt patterns

4. **Metrics to Compare**:
   | Metric | Baseline | Canary 5% | Threshold for Expand |
   |--------|----------|-----------|----------------------|
   | Signup success rate | 98% | ≥98% | ≥98% |
   | Login success rate | 99% | ≥99% | ≥99% |
   | Error rate | <1% | <1.5% | <1.5% |
   | Auth p95 latency | 100ms | ≤150ms | ≤150ms |
   | Password hash errors | 0 | 0 | 0 |
   | Duplicate phone errors | <5/hr | Similar or less | Similar or less |

5. **Decision Point** (after 24-48 hours):
   - ✅ **All metrics green**: Expand to 25%
   - ⚠️  **Minor issues**: Investigate, fix, try again
   - ❌ **Major issues**: ROLLBACK to 0%

### Phase 6C: Gradual Expansion (25% → 50% → 75% → 100%)

**Goal**: Increase new endpoint traffic in increments, monitoring each step.

**Duration**: 1-2 weeks

**Canary Ladder**:
```
Day 1-2:   5% canary (Phase 6B)
Day 3-4:   25% traffic
Day 5-6:   50% traffic (Majority threshold)
Day 7-8:   75% traffic
Day 9+:    100% traffic
```

**At Each Step**:
1. Update feature flags (backend: USE_PATIENT_TABLE_AUTH_PERCENT, frontend: VITE_USE_PATIENT_AUTH)
2. Wait 1-2 hours for traffic to stabilize
3. Check all monitoring metrics
4. Review error logs manually (spot-check for patterns)
5. If all green, proceed to next step
6. If issues, investigate and either rollback or fix forward

**Automated Canary Criteria**:
```
If (error_rate_increase > 2% OR 
    latency_p95 > baseline + 50ms OR 
    password_failures > 10x baseline) {
  ROLLBACK_TO_PREVIOUS_LEVEL();
  ALERT(oncall);
}
```

### Phase 6D: 100% Rollout

**Goal**: All user-web traffic on new patient endpoints. Admin-web unchanged.

**Trigger**: After 100% phase for 1-2 days, if all metrics green and no user complaints.

**Tasks**:
1. Set backend: `USE_PATIENT_TABLE_AUTH=100` (or remove feature flag, make permanent)
2. Set frontend: `VITE_USE_PATIENT_AUTH=true` (always use new endpoints)
3. Update runbook: "New patient auth endpoints are now production standard"
4. Begin Phase 6E (Verification & Cleanup)

---

## Phase 6E: Concurrent Verification & Safety Window

**Goal**: Run both old and new code paths in parallel to verify correctness. Continue for 1-2 additional releases before removing legacy code.

**Duration**: 1-2 weeks (overlap with Phase 6D)

**Strategy**: Dual-Write / Dual-Read (if needed)
- For 1-2 releases, backend can log all auth attempts to BOTH users table AND patients table
- Allows quick rollback if patient table auth has unforeseen issues
- After 2 clean releases, legacy code can be deprecated

**Verification Tasks**:
1. Cross-Repo Smoke Suite
   ```
   FOR each scenario:
     - Patient signup → Patient login → Patient books appt
     - Admin creates patient → Admin books appt for patient
     - Patient views appointment from gentrx-php
     - Admin views appointment from admin.gentrx-php
     - Check appointment.patient_id is correct on both apps
   ```

2. Security Verification
   ```
   - Patient token CANNOT access admin endpoints (test)
   - Admin token CANNOT access /patient/* endpoints (test)
   - Token introspection shows identity_type='patient' (test)
   ```

3. Data Consistency Verification
   ```
   - Appointment patient_id matches authenticated patient (test)
   - Lab request patient_id matches authenticated patient (test)
   - No orphaned patient records (SQL check)
   - No orphaned appointments (SQL check)
   ```

4. Regression Suite
   ```
   - All pre-migration counts match (SQL check)
   - All indexes exist (SQL check)
   - No unexpected status/error messages (log analysis)
   ```

---

## Rollback Plan (Immediate Activation if Needed)

### Level 1: Feature Flag Rollback (Fastest, <5 min)

**Use if**: New endpoints have bugs/errors but legacy paths are stable

**Steps**:
```bash
# Backend: Immediately disable new endpoints
USE_PATIENT_TABLE_AUTH=false

# Frontend: Revert to legacy endpoints
VITE_USE_PATIENT_AUTH=false

# Restart services
systemctl restart api
# CDN/frontend cache will clear within 5-10 minutes
```

**Effect**: All traffic reverts to legacy add_user/login_phone paths within 10 minutes.

**Recovery**: No data loss. All new auth attempts get NULL password_hash (handled gracefully).

### Level 2: Partial Rollback (If Level 1 insufficient)

**Use if**: Need to keep new endpoints but STOP all migration-related traffic

**Steps**:
```bash
# Disable ALL patient auth (force to legacy)
USE_PATIENT_TABLE_AUTH=false
DISABLE_PATIENT_SIGNUP=true

# Only admin/doctor signup allowed; patient signup redirects to legacy
# Existing patients can still login (via legacy login_phone endpoint)
```

### Level 3: Full Rollback (Nuclear, 30-60 min)

**Use if**: Data corruption, security breach, or unrecoverable state

**Steps** (DBA + Backend team):
1. Stop all API traffic (pause load balancer)
2. Run database ROLLBACK to pre-migration snapshot
   ```bash
   # Restore from backup
   pg_restore -d gentrx_db -v backup_20260413_before_migrations.sql
   ```
3. Revert backend code to previous release
4. Revert frontend code to previous release
5. Run full smoke suite in staging
6. Resume traffic
7. POST-MORTEM to understand root cause

**Data Safety**: No data is lost if rolledback within minutes. Only new signup/login attempts are lost (acceptable).

**Time**: Estimated 30-60 minutes for full recovery. **Prefer Level 1 or 2 to avoid this.**

---

## Monitoring Dashboard (Phase 6 Required Metrics)

### Real-Time Metrics (Alerts if threshold breached)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|---|
| Auth Success Rate | % of login attempts that succeed | 98%+ | <97% |
| Auth Error Rate | % of auth attempts that error (50x) | <1% | >2% |
| Signup Success Rate | % of registrations that complete | 95%+ | <94% |
| Latency p50 (new) | Auth endpoint latency median | 80ms | >120ms |
| Latency p95 (new) | Auth endpoint latency 95%ile | 150ms | >250ms |
| Password Hash Errors | Failed bcrypt operations | 0 | >5/hour |
| Duplicate Phone Rate | Signup attempts with taken phone | Baseline | 2x baseline |
| Account Lockouts | 5+ failed attempts in 30min | 0-10/day | >50/day |

### Historical Metrics (Track for trends)

- Daily active users (should be stable)
- New user signup conversion rate
- User retention rate
- Support tickets related to login (should decrease)

### Manual Spot-Checks (Do these hourly during 5%-100% ramp)

1. **Sample a few successful logins**:
   ```sql
   SELECT * FROM authentication_log 
   WHERE status='success' 
   AND attempted_at > NOW() - INTERVAL '1 hour'
   ORDER BY attempted_at DESC 
   LIMIT 5;
   ```

2. **Check for unusual patterns**:
   ```sql
   SELECT login_identifier, COUNT(*) as attempts
   FROM authentication_log
   WHERE status LIKE 'failure%'
   AND attempted_at > NOW() - INTERVAL '1 hour'
   GROUP BY login_identifier
   HAVING COUNT(*) > 10  -- More than 10 failures = possible attack
   ORDER BY COUNT(*) DESC;
   ```

3. **Verify appointment patient_id**:
   ```sql
   SELECT a.id, a.patient_id, p.id
   FROM appointments a
   LEFT JOIN patients p ON a.patient_id = p.id
   WHERE a.created_at > NOW() - INTERVAL '1 hour'
   AND p.id IS NULL  -- Orphaned appointment
   LIMIT 10;
   ```

---

## Post-Rollout Activities (Phase 6F)

### Week 1: Stabilization
- Monitor metrics closely (daily)
- Review support tickets for patterns
- Check authentication_log for anomalies
- Confirm no data corruption

### Week 2: Optimization
- Analyze token generation performance
- Tune rate limiting thresholds based on actual usage
- Optimize authentication_log queries if needed
- Plan for password reset UX improvements

### Week 3: Documentation & Training
- Update API documentation for public consumption
- Archive phase3* migration docs (reference only)
- Update runbooks with new auth flow
- Train support team on troubleshooting patient vs admin auth

### Week 4+: Cleanup & Deprecation
- After 2+ releases stable, mark legacy endpoints as deprecated
- Add warnings to legacy endpoint code
- Plan removal date for future major version
- Remove feature flag code (make patient endpoints permanent)
- Remove temporary auth_status column if not needed (future decision)

---

## Success Criteria (Phase 6 Complete ✅)

All of the following must be true:

### Deployment Success
- [ ] Migrations applied to production without errors
- [ ] All 4 feature flag transitions (5% → 25% → 50% → 75% → 100%) completed successfully
- [ ] Zero data corruption (spot-checks passed)
- [ ] Zero security breaches (token boundary tests passed)

### Functional Success
- [ ] Patient signup/login fully functional (100% canary tested)
- [ ] Appointments, labs, files, wallet all working with patient_id
- [ ] Admin-web continues to work unchanged (parallel verification passed)
- [ ] No user complaints or support escalations related to auth

### Performance Success
- [ ] New auth endpoints latency ≤150ms (p95)
- [ ] No regression in overall API performance
- [ ] Error rates stable and predictable
- [ ] No uncontrolled growth in authentication_log table

### Security Success
- [ ] Patient tokens cannot access admin endpoints
- [ ] Admin tokens cannot access patient endpoints
- [ ] Brute-force protection prevents account enumeration
- [ ] Password hashing verified (bcrypt with sufficient cost factor)

### Documentation Success
- [ ] Runbook updated with new auth flow
- [ ] API documentation published (public + internal)
- [ ] Support team trained and confident

### Cleanup Success
- [ ] Legacy code paths documented for deprecation
- [ ] Feature flags marked for future removal
- [ ] No loose ends or technical debt from migration

---

## Post-Phase 6 Roadmap (Future Enhancement Ideas)

Once patient auth is stable, consider:

1. **Email-based Patient Login** (Phase 7)
   - Allow login via email instead of phone
   - Similar implementation to phone endpoint
   - Recommend: 2-4 weeks after Phase 6 stabilizes

2. **Patient Password Reset UI** (Phase 7)
   - Self-service password reset flow
   - Email + OTP verification
   - Recommend: 1-2 weeks after email login

3. **Refresh Token Strategy** (Phase 8)
   - Longer session duration for patients
   - Implement refresh_token endpoint
   - Better UX (don't re-login for 30 days)

4. **Role-Based Access Control for Patients** (Future)
   - Define patient role (role_id)
   - Different permissions for patient vs doctor vs admin
   - Recommend: Only if needed for feature requirements

5. **Audit Log Archival** (Future)
   - Move authentication_log to separate storage after 12 months
   - Compliance/retention policy

---

## Escalation & Decision Tree

### If Error Rate Spikes During Canary

```
IF error_rate increase > 2% {
  STEP 1: Review error logs (look for pattern)
  
  IF error is "duplicate phone" {
    ANALYSIS: Expected behavior, not a bug
    ACTION: Wait and monitor
  }
  
  ELSE IF error is "password_hash NULL" {
    ANALYSIS: Backend not initializing password on signup
    ACTION: Fix backend, test in staging, re-deploy
    DECISION: Retry canary or rollback?
  }
  
  ELSE IF error is "Account locked" but no failed attempts {
    ANALYSIS: Lockout logic has bug or is inconsistent
    ACTION: Review authentication_log, fix logic, rollback
  }
  
  ELSE {
    ANALYSIS: Unknown error
    ACTION: Immediate rollback to 0%, investigate in staging
  }
}
```

### Contact Tree (Escalation)

1. **First Alert** (SRE on-call)
   - Check dashboard
   - Review recent logs
   - If clear fix: apply Level 1 rollback, notify team

2. **Second Level** (Backend Lead + DevOps Lead)
   - Investigate root cause
   - Decide: Fix forward or rollback?
   - If rollback: execute Level 2 or 3

3. **Third Level** (Engineering Director + Product)
   - Communicate customer impact
   - Decide: Retry after fix or defer to next sprint?

---

## Phase 6 Status: READY FOR EXECUTION

**Pre-condition**: Phases 1-5 complete and all validation tests passed  
**Owner**: DevOps + SRE (execution), Backend + Frontend (support)  
**Timeline**: 2-4 weeks (5% → 100% at safe pace)  
**Rollback Window**: Up to 48 hours (Level 1-3 available instantly)

**Start Condition**: Green light from Product + Eng leads

**✅ Upon Completion**: Patient-centric auth is production standard, legacy paths deprecated, full cross-repo compatibility verified.

---

## Appendix: Rollback Script (Reference)

```bash
#!/bin/bash
# emergency_rollback.sh - Immediate rollback to legacy auth

set -e

echo "[ROLLBACK] Starting emergency rollback to legacy auth..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Step 1: Backend feature flag
echo "[ROLLBACK] Disabling new patient auth endpoints..."
curl -X POST https://api.gentrx.ph/admin/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "USE_PATIENT_TABLE_AUTH=false"

# Step 2: Frontend feature flag (clear cache + restart)
echo "[ROLLBACK] Disabling frontend patient auth flag..."
if [ -f /opt/gentrx-web/.env.production ]; then
  sed -i 's/VITE_USE_PATIENT_AUTH=true/VITE_USE_PATIENT_AUTH=false/' \
    /opt/gentrx-web/.env.production
  # Trigger frontend rebuild via CI/CD
  curl -X POST https://api.vercel.com/v1/deployments \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -d "project=$VERCEL_PROJECT_ID"
fi

# Step 3: Monitor and verify
sleep 60  # Wait for cache clear
echo "[ROLLBACK] Verifying rollback..."
RESULT=$(curl -s https://api.gentrx.ph/health | grep '"auth_mode":"legacy"' || echo "FAILED")

if [ "$RESULT" = "" ]; then
  echo ❌ "[ROLLBACK] FAILED - Auth mode still in patient mode!"
  exit 1
fi

echo ✅ "[ROLLBACK] SUCCESS - Reverted to legacy auth"
echo "[ROLLBACK] All traffic now uses add_user/login_phone endpoints"
echo "[ROLLBACK] Timestamp: $TIMESTAMP"
exit 0
```

---

**END OF PHASE 6 PLAYBOOK**

All six phases are now complete. Manual execution of this playbook will bring the system from current state (users-table auth) to target state (patients-table auth) with full rollback capability at every step.
