param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$RemotePath = "/root/resync_department_only.sh",
  [switch]$AllowInteractive
)

$ErrorActionPreference = "Stop"

$localScript = "scripts/backend/resync_department_only.sh"
if (-not (Test-Path $localScript)) {
  throw "Missing local script: $localScript"
}

Write-Host "Uploading script to $User@$Server ..."
if ($AllowInteractive) {
  scp $localScript "${User}@${Server}:$RemotePath"
} else {
  ssh -o BatchMode=yes "${User}@${Server}" "echo ok" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "SSH non-interactive auth failed. Re-run with -AllowInteractive or configure SSH keys."
  }
  scp -o BatchMode=yes $localScript "${User}@${Server}:$RemotePath"
}

Write-Host "Running targeted department resync ..."
if ($AllowInteractive) {
  ssh "${User}@${Server}" "chmod +x $RemotePath && bash $RemotePath && nginx -t && systemctl reload nginx"
} else {
  ssh -o BatchMode=yes "${User}@${Server}" "chmod +x $RemotePath && bash $RemotePath && nginx -t && systemctl reload nginx"
}

Write-Host "Re-running local integrity report ..."
powershell -ExecutionPolicy Bypass -File scripts/backend/department_image_integrity_report.ps1
