# Gentrx User Web App - System Setup

This file lists what you need to fully run and test this project locally on Windows.

## 1) Required Apps

Install these first:

1. Node.js 20+ (LTS recommended)
2. npm 10+
3. Git
4. PowerShell 7+
5. curl
6. OpenSSH client (`ssh`, `scp`) for remote sync scripts

Recommended for full operations:

1. GitHub CLI (`gh`)
2. PHP 8.2+ CLI (for local diagnostic php scripts)
3. Composer (if you run Laravel-side diagnostics locally)
4. Bash environment (WSL2 Ubuntu or Git Bash) for `.sh` scripts

## 2) Required VS Code Extensions

1. `dbaeumer.vscode-eslint`
2. `esbenp.prettier-vscode`
3. `bradlc.vscode-tailwindcss`
4. `github.vscode-github-actions`
5. `redhat.vscode-yaml`
6. `ms-vscode.powershell`
7. `mikestead.dotenv`
8. `usernamehw.errorlens`

## 3) Frontend Environment Variables

Minimum variables required by project preflight:

1. `VITE_API_ADDRESS`
2. `VITE_FIREBASE_API_KEY`
3. `VITE_FIREBASE_AUTH_DOMAIN`
4. `VITE_FIREBASE_PROJECT_ID`
5. `VITE_FIREBASE_STORAGE_BUCKET`
6. `VITE_FIREBASE_MESSAGING_SENDER_ID`
7. `VITE_FIREBASE_APP_ID`
8. `VITE_FIREBASE_MEASUREMENT_ID`
9. `VITE_FIREBASE_FCM_PUBLIC_KEY`

Optional variables used by specific flows:

1. `VITE_OTPLESS_APP_ID`
2. `VITE_RAZORPAY_TEST_MODE`
3. `VITE_RAZORPAY_TEST_KEY`
4. `VITE_RAZORPAY_TEST_SECRET`
5. `VITE_FRONTEND_ORIGIN`
6. `VITE_APP_ORIGIN`

## 4) One-Command Readiness Check

Run this in the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ci/check_system_requirements.ps1
```

Include env validation too:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ci/check_system_requirements.ps1 -CheckEnv
```

Strict mode (fail on missing recommended extensions/env):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ci/check_system_requirements.ps1 -CheckEnv -Strict
```

## 5) Run/Test Commands

Install dependencies:

```powershell
npm ci
```

Frontend dev server:

```powershell
npm run dev
```

Build:

```powershell
npm run build
```

Frontend env preflight:

```powershell
npm run preflight:frontend
```

Deploy smoke check helper:

```powershell
npm run smoke:deploy
```

Backend image integrity test:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backend/image_crud_integrity_check.ps1 -EnforceBlockCompatiblePrefix
```

Read-only safe mode (no create/update/delete):

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/image_crud_integrity_check.ps1 -ReadOnlySafeMode -EnforceBlockCompatiblePrefix
```

Automated integrity flow (non-destructive by default):

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/automate_image_integrity_fix.ps1 -SkipRemote
```

Enable mutating CRUD check explicitly (only when approved):

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/backend/automate_image_integrity_fix.ps1 -SkipRemote -AllowMutatingCrudCheck
```
