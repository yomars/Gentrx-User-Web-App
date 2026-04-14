#!/usr/bin/env bash
set -euo pipefail

LARAVEL_ROOT="${1:-/opt/gentrx-api}"
PUBLIC_API_BASE="${2:-https://api.gentrx.ph}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"

echo "[patient-auth] Laravel root: $LARAVEL_ROOT"
echo "[patient-auth] Public API base: $PUBLIC_API_BASE"

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "[patient-auth] ERROR: Missing required file: $file" >&2
    exit 1
  fi
}

require_file "$REPO_ROOT/scripts/backend/laravel/app/Http/Controllers/PatientAuthController.php"
require_file "$REPO_ROOT/scripts/backend/laravel/app/Models/Patient.php"
require_file "$REPO_ROOT/scripts/backend/laravel/app/Models/AuthenticationLog.php"
require_file "$REPO_ROOT/scripts/backend/laravel/app/Http/Middleware/EnforcePatientIdentity.php"
require_file "$REPO_ROOT/scripts/backend/laravel/routes/api/patient-auth.php"
require_file "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_13_000001_add_patient_auth_columns.php"
require_file "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_13_000002_create_authentication_log_table.php"
require_file "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_14_000003_add_name_to_patients_table.php"
require_file "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_14_000004_add_api_token_to_patients_table.php"
require_file "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_14_000005_add_patient_code_to_patients.php"

if [[ ! -d "$LARAVEL_ROOT" ]]; then
  echo "[patient-auth] ERROR: Laravel root not found: $LARAVEL_ROOT" >&2
  exit 1
fi

if [[ ! -f "$LARAVEL_ROOT/routes/api.php" ]]; then
  echo "[patient-auth] ERROR: Missing routes/api.php in $LARAVEL_ROOT" >&2
  exit 1
fi

PHP_CMD="php"
if command -v php8.2 >/dev/null 2>&1; then
  PHP_CMD="php8.2"
fi
echo "[patient-auth] Using PHP binary: $PHP_CMD"

mkdir -p "$LARAVEL_ROOT/app/Http/Controllers"
mkdir -p "$LARAVEL_ROOT/app/Models"
mkdir -p "$LARAVEL_ROOT/app/Http/Middleware"
mkdir -p "$LARAVEL_ROOT/routes/api"
mkdir -p "$LARAVEL_ROOT/database/migrations"

cp "$REPO_ROOT/scripts/backend/laravel/app/Http/Controllers/PatientAuthController.php" "$LARAVEL_ROOT/app/Http/Controllers/PatientAuthController.php"
cp "$REPO_ROOT/scripts/backend/laravel/app/Models/Patient.php" "$LARAVEL_ROOT/app/Models/Patient.php"
cp "$REPO_ROOT/scripts/backend/laravel/app/Models/AuthenticationLog.php" "$LARAVEL_ROOT/app/Models/AuthenticationLog.php"
cp "$REPO_ROOT/scripts/backend/laravel/app/Http/Middleware/EnforcePatientIdentity.php" "$LARAVEL_ROOT/app/Http/Middleware/EnforcePatientIdentity.php"
cp "$REPO_ROOT/scripts/backend/laravel/routes/api/patient-auth.php" "$LARAVEL_ROOT/routes/api/patient-auth.php"
cp "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_13_000001_add_patient_auth_columns.php" "$LARAVEL_ROOT/database/migrations/2026_04_13_000001_add_patient_auth_columns.php"
cp "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_13_000002_create_authentication_log_table.php" "$LARAVEL_ROOT/database/migrations/2026_04_13_000002_create_authentication_log_table.php"
cp "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_14_000003_add_name_to_patients_table.php" "$LARAVEL_ROOT/database/migrations/2026_04_14_000003_add_name_to_patients_table.php"
cp "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_14_000004_add_api_token_to_patients_table.php" "$LARAVEL_ROOT/database/migrations/2026_04_14_000004_add_api_token_to_patients_table.php"
cp "$REPO_ROOT/scripts/backend/laravel/database/migrations/2026_04_14_000005_add_patient_code_to_patients.php" "$LARAVEL_ROOT/database/migrations/2026_04_14_000005_add_patient_code_to_patients.php"

ROUTE_INCLUDE_LINE="require __DIR__.'/api/patient-auth.php';"
if ! grep -Fq "$ROUTE_INCLUDE_LINE" "$LARAVEL_ROOT/routes/api.php"; then
  echo "[patient-auth] Adding patient-auth route include to routes/api.php"
  printf "\n// Patient Authentication Routes (Phase 3+)\n%s\n" "$ROUTE_INCLUDE_LINE" >> "$LARAVEL_ROOT/routes/api.php"
else
  echo "[patient-auth] Route include already present in routes/api.php"
fi

pushd "$LARAVEL_ROOT" >/dev/null

echo "[patient-auth] Running migrations"
$PHP_CMD artisan migrate --force

echo "[patient-auth] Verifying required migrations are applied"
MIGRATION_STATUS="$($PHP_CMD artisan migrate:status || true)"
if [[ "$MIGRATION_STATUS" != *"2026_04_13_000001_add_patient_auth_columns"* ]] || [[ "$MIGRATION_STATUS" != *"2026_04_13_000002_create_authentication_log_table"* ]] || [[ "$MIGRATION_STATUS" != *"2026_04_14_000003_add_name_to_patients_table"* ]] || [[ "$MIGRATION_STATUS" != *"2026_04_14_000004_add_api_token_to_patients_table"* ]] || [[ "$MIGRATION_STATUS" != *"2026_04_14_000005_add_patient_code_to_patients"* ]]; then
  echo "[patient-auth] ERROR: Required patient-auth migrations are missing from migrate:status output." >&2
  echo "$MIGRATION_STATUS" >&2
  exit 1
fi
if echo "$MIGRATION_STATUS" | grep -Eq "Pending\s+2026_04_13_000001_add_patient_auth_columns|Pending\s+2026_04_13_000002_create_authentication_log_table|Pending\s+2026_04_14_000003_add_name_to_patients_table|Pending\s+2026_04_14_000004_add_api_token_to_patients_table|Pending\s+2026_04_14_000005_add_patient_code_to_patients"; then
  echo "[patient-auth] ERROR: One or more required patient-auth migrations are still pending." >&2
  echo "$MIGRATION_STATUS" >&2
  exit 1
fi

echo "[patient-auth] Clearing and rebuilding caches"
$PHP_CMD artisan optimize:clear
$PHP_CMD artisan route:cache
$PHP_CMD artisan config:cache

echo "[patient-auth] Verifying routes are registered"
ROUTES_OUTPUT="$($PHP_CMD artisan route:list | grep -E "api/v1/patient/(check-phone|signup|login|me|logout|clinics)" || true)"
if [[ -z "$ROUTES_OUTPUT" ]]; then
  echo "[patient-auth] ERROR: Patient routes are not registered (route:list empty)." >&2
  exit 1
fi
echo "$ROUTES_OUTPUT"

echo "[patient-auth] Verifying auth guard/provider wiring in config/auth.php"
if ! grep -Eq "'providers'\s*=>" config/auth.php; then
  echo "[patient-auth] ERROR: config/auth.php missing providers section" >&2
  exit 1
fi

echo "[patient-auth] Ensuring auth guard/provider wiring in config/auth.php"
$PHP_CMD -r '
$authFile = "config/auth.php";
$content = @file_get_contents($authFile);
if ($content === false) {
    fwrite(STDERR, "[patient-auth] ERROR: unable to read config/auth.php\n");
    exit(1);
}

$updated = $content;

if (!preg_match("/\x27patients\x27\s*=>\s*\[/", $updated)) {
    $patientsProvider = "\n\n        \x27patients\x27 => [\n            \x27driver\x27 => \x27eloquent\x27,\n            \x27model\x27 => App\\\\Models\\\\Patient::class,\n        ],";
    $updated = preg_replace("/(\x27providers\x27\s*=>\s*\[)/", "$1" . $patientsProvider, $updated, 1);
}

if (!preg_match("/\x27api\x27\s*=>\s*\[/", $updated)) {
  $apiGuard = "\n\n        \x27api\x27 => [\n            \x27driver\x27 => \x27token\x27,\n            \x27provider\x27 => \x27patients\x27,\n            \x27hash\x27 => false,\n        ],";
  $updated = preg_replace("/(\x27guards\x27\s*=>\s*\[)/", "$1" . $apiGuard, $updated, 1);
}

if (!preg_match("/\x27api\x27\s*=>\s*\[[\s\S]*?\x27provider\x27\s*=>\s*\x27patients\x27/", $updated)) {
    $updated = preg_replace(
        "/(\x27api\x27\s*=>\s*\[[\s\S]*?\x27provider\x27\s*=>\s*\x27)([^\x27]+)(\x27)/",
        "$1patients$3",
        $updated,
        1
    );
}

if ($updated !== $content) {
    if (@file_put_contents($authFile, $updated) === false) {
        fwrite(STDERR, "[patient-auth] ERROR: unable to write config/auth.php\n");
        exit(1);
    }
    fwrite(STDOUT, "[patient-auth] Updated config/auth.php for patient auth guard/provider\n");
}
' || {
  echo "[patient-auth] ERROR: failed to auto-fix config/auth.php" >&2
  exit 1
}

if ! grep -Eq "'patients'\s*=>\s*\[" config/auth.php; then
  echo "[patient-auth] ERROR: config/auth.php missing patients provider." >&2
  echo "[patient-auth] Add providers.patients => App\\Models\\Patient::class" >&2
  exit 1
fi
if ! grep -Eq "'guards'\s*=>" config/auth.php; then
  echo "[patient-auth] ERROR: config/auth.php missing guards section" >&2
  exit 1
fi
if ! grep -Eq "'api'\s*=>\s*\[" config/auth.php; then
  echo "[patient-auth] ERROR: config/auth.php missing api guard definition" >&2
  exit 1
fi
if ! grep -Eq "'provider'\s*=>\s*'patients'" config/auth.php; then
  echo "[patient-auth] ERROR: config/auth.php api guard is not mapped to patients provider." >&2
  echo "[patient-auth] Set guards.api.provider = 'patients'" >&2
  exit 1
fi

echo "[patient-auth] Running endpoint probe to catch 405 early"
HTTP_CODE="$(curl -sS -o /tmp/patient_check_phone_probe.json -w "%{http_code}" \
  -X POST "$PUBLIC_API_BASE/api/v1/patient/check-phone" \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}' || true)"

if [[ "$HTTP_CODE" == "405" ]]; then
  echo "[patient-auth] ERROR: Probe returned HTTP 405. Route wiring still broken." >&2
  echo "[patient-auth] Probe body:" >&2
  cat /tmp/patient_check_phone_probe.json >&2 || true
  exit 1
fi

echo "[patient-auth] Probe HTTP code: $HTTP_CODE"
echo "[patient-auth] Probe body:"
cat /tmp/patient_check_phone_probe.json || true

popd >/dev/null

echo "[patient-auth] SUCCESS: Patient auth deployment checks passed."