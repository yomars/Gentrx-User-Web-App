# Migration Phase 5 Runbook — Auto-rollback & Branch Protection

## What Was Added

### 1. Post-Deploy Rollback (`scripts/ci/rollback.mjs`)

Triggered automatically when the `smoke-check` job in **Vercel Release Gate** fails
on a production deployment. The script:

1. Calls the Vercel API to list the 5 most recent `READY` production deployments.
2. Selects `deployments[1]` — the last known-good release.
3. Executes `npx vercel@latest rollback <deployment-id>` to promote the stable
   deployment back to production aliases.

The rollback job runs under the `production` environment gate, so the same
approval rules that guard deployment also guard rollback.

### 2. `rollback-on-failure` Job in `vercel-release-gate.yml`

The new job runs only when both conditions are true:

```
needs.deploy-production.result == 'success'
needs.smoke-check.result == 'failure'
```

It **does not** fire for preview deployments, build failures, or dry runs.

### 3. CI Gate Workflow (`.github/workflows/ci-gate.yml`)

Triggered on every pull request to `main`. Two parallel jobs:

| Job | What it validates |
|---|---|
| `build-check` | `preflight:frontend` + `npm run build` (full production build) |
| `lint-check` | `npm run lint` |

Once registered as a required status check (see below), no PR can be merged
until both jobs pass.

### 4. Branch Protection Script (`scripts/ci/configure_branch_protection.mjs`)

One-time setup script that calls the GitHub REST API to enforce:

- **Required status checks**: `CI Gate / build-check` and `CI Gate / lint-check`
- Branch must be up-to-date before merge (`strict: true`)
- 1 required approving reviewer
- Stale reviews dismissed on new commits
- Force pushes and branch deletions blocked
- Rules applied to admins too

---

## New npm Scripts

| Script | Command |
|---|---|
| `npm run rollback:vercel` | Run the Vercel rollback script |
| `npm run branch:protect` | Run the branch protection configuration script |

---

## Required Secrets

### GitHub Repository Secrets (Settings → Secrets and variables → Actions)

All previously required secrets remain. No new repository secrets are needed
for the CI gate — it reuses the existing `VITE_*` secrets.

### For Rollback (already present from Phase 3)

| Secret | Where used |
|---|---|
| `VERCEL_TOKEN` | `rollback-on-failure` job |
| `VERCEL_ORG_ID` | `rollback-on-failure` job |
| `VERCEL_PROJECT_ID` | `rollback-on-failure` job |

---

## Operator Setup Steps

### Step 1 — Merge this branch and let the first CI Gate run complete

After the `ci-gate.yml` workflow runs at least once on a PR (even a dummy PR),
GitHub registers the check names. Branch protection rules must reference check
names that exist.

### Step 2 — Configure branch protection (one-time)

```bash
# Requires a GitHub Personal Access Token (classic) or fine-grained token
# with "administration: write" permission on the repository.

GITHUB_TOKEN=ghp_YOUR_TOKEN \
GITHUB_REPO=owner/gentrx-user-web-app \
npm run branch:protect
```

Expected output:

```
Configuring branch protection for owner/gentrx-user-web-app → main
Branch protection configured successfully.
Required checks: CI Gate / build-check, CI Gate / lint-check
Require up-to-date branch: true
Required reviewers: 1
Enforced for admins: true
```

### Step 3 — (Optional) Set `production` environment protection in GitHub

Go to **Settings → Environments → production** and add required reviewers.
This means the `deploy-production` and `rollback-on-failure` jobs both require
a human approval before executing.

### Step 4 — Verify rollback path (dry-run verification)

You can verify the rollback script can reach the Vercel API without executing
a real rollback by checking your Vercel project deployments manually:

```bash
VERCEL_TOKEN=... VERCEL_ORG_ID=... VERCEL_PROJECT_ID=... \
node -e "
import('./scripts/ci/rollback.mjs').catch(()=>{});
"
```

Or simply trigger a production deploy via the **Vercel Release Gate** workflow;
if the smoke check passes, rollback never fires. If you need to test the path
end-to-end, deploy a broken build intentionally to a preview environment
(rollback only fires for `target_environment == production`).

---

## Full Pipeline Flow (Post Phase 5)

```
PR opened → CI Gate runs (build-check + lint-check)
         ↓ both pass
PR approved by reviewer
         ↓
Merge to main
         ↓
Operator triggers: Vercel Release Gate (target=production, dry_run=false)
         ↓
  preflight-and-build
         ↓
  deploy-production  (requires "production" environment approval)
         ↓
  smoke-check
    ├── PASS → pipeline green, deployment live ✅
    └── FAIL → rollback-on-failure fires
                  ↓
              Vercel rolls back to last stable deployment 🔄
```

---

## Files Changed / Added

| File | Action |
|---|---|
| `scripts/ci/rollback.mjs` | Created |
| `scripts/ci/configure_branch_protection.mjs` | Created |
| `.github/workflows/ci-gate.yml` | Created |
| `.github/workflows/vercel-release-gate.yml` | Added `rollback-on-failure` job |
| `package.json` | Added `rollback:vercel`, `branch:protect` scripts |
| `.env.example` | Added Vercel secrets + GitHub token sections |
