param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$RemotePath = "/root/resync_department_only.sh"
)

$ErrorActionPreference = "Stop"

$localScript = "scripts/backend/resync_department_only.sh"
if (-not (Test-Path $localScript)) {
  throw "Missing local script: $localScript"
}

Write-Host "Uploading script to $User@$Server ..."
scp $localScript "${User}@${Server}:$RemotePath"

Write-Host "Running targeted department resync ..."
ssh "${User}@${Server}" "chmod +x $RemotePath && bash $RemotePath && nginx -t && systemctl reload nginx"

Write-Host "Re-running local integrity report ..."
powershell -ExecutionPolicy Bypass -File scripts/backend/department_image_integrity_report.ps1
