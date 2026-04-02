param(
  [switch]$SkipRemote,
  [string]$Server = "149.28.145.80",
  [string]$User = "root"
)

$ErrorActionPreference = "Continue"

function Run-Step([string]$name, [scriptblock]$action) {
  Write-Host "`n=== $name ===" -ForegroundColor Cyan
  try {
    & $action
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
    Write-Host "[$name] exit=$code" -ForegroundColor Yellow
    return $code
  } catch {
    Write-Host "[$name] error: $($_.Exception.Message)" -ForegroundColor Red
    return 99
  }
}

$summary = [ordered]@{
  preDepartmentReport = -1
  remoteResync = -1
  postDepartmentReport = -1
  crudIntegrity = -1
  overall = "UNKNOWN"
}

$summary.preDepartmentReport = Run-Step "Pre Department Report" {
  powershell -ExecutionPolicy Bypass -File scripts/backend/department_image_integrity_report.ps1
}

if (-not $SkipRemote) {
  $summary.remoteResync = Run-Step "Remote Department Resync" {
    powershell -ExecutionPolicy Bypass -File scripts/backend/run_department_resync_on_prod.ps1 -Server $Server -User $User
  }
} else {
  Write-Host "Skipping remote resync by request." -ForegroundColor Yellow
  $summary.remoteResync = 0
}

$summary.postDepartmentReport = Run-Step "Post Department Report" {
  powershell -ExecutionPolicy Bypass -File scripts/backend/department_image_integrity_report.ps1
}

$summary.crudIntegrity = Run-Step "CRUD Integrity Check" {
  powershell -ExecutionPolicy Bypass -File scripts/backend/image_crud_integrity_check.ps1 -EnforceBlockCompatiblePrefix
}

if ($summary.postDepartmentReport -eq 0 -and $summary.crudIntegrity -eq 0) {
  $summary.overall = "PASS"
} else {
  $summary.overall = "FAIL"
}

Write-Host "`n=== FINAL SUMMARY ===" -ForegroundColor Green
$summary | ConvertTo-Json -Depth 3 | Write-Host

if ($summary.overall -ne "PASS") { exit 2 }
exit 0
