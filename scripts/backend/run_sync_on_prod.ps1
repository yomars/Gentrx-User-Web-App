param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$RemotePath = "/root/sync_legacy_to_block_storage.sh",
  [switch]$DryRun,
  [switch]$ApplyNginx,
  [switch]$SkipProbes,
  [switch]$EnforceNewStorage
)

$ErrorActionPreference = "Stop"

$localScript = "scripts/backend/sync_legacy_to_block_storage.sh"
 $localNginx = "scripts/backend/nginx/storage.conf"
if (-not (Test-Path $localScript)) {
  throw "Missing local script: $localScript"
}
if ($ApplyNginx -and -not (Test-Path $localNginx)) {
  throw "Missing local nginx config: $localNginx"
}

Write-Host "Uploading sync script to $User@$Server ..."
scp $localScript "${User}@${Server}:$RemotePath"

if ($ApplyNginx) {
  Write-Host "Uploading nginx storage config to $User@$Server ..."
  scp $localNginx "${User}@${Server}:/etc/nginx/conf.d/gentrx-storage.conf"
}

$remoteCmd = @(
  "chmod +x $RemotePath"
  if ($DryRun) { "DRY_RUN=1 bash $RemotePath" } else { "bash $RemotePath" }
  if ($ApplyNginx) { "nginx -t" }
  if ($ApplyNginx) { "systemctl reload nginx" }
) -join " && "

Write-Host "Running sync on server ..."
ssh "${User}@${Server}" $remoteCmd

if (-not $SkipProbes) {
  Write-Host "Running post-sync probes from local machine ..."

  $probeUrls = @(
    "https://api.gentrx.ph/storage/users/2026-03-30-69ca853754e3f.jpg",
    "https://api.gentrx.ph/storage/clinics/2026-03-30-69ca8d96be494.jpg",
    "https://api.gentrx.ph/storage/department/2026-02-01-697f02004615d.png"
  )

  foreach ($url in $probeUrls) {
    $headers = (curl.exe -sI $url) -join " "
    $statusLine = if ($headers -match "HTTP/1\.1\s+\d{3}[^\r\n]*") { $matches[0] } else { "HTTP status unavailable" }
    Write-Host "  $statusLine  <- $url"
  }
}

if ($EnforceNewStorage) {
  Write-Host "Running policy audit (must primarily serve new storage prefixes) ..."
  & powershell -ExecutionPolicy Bypass -File "scripts/backend/post_sync_image_audit.ps1"
  if ($LASTEXITCODE -ne 0) {
    throw "Post-sync policy audit failed. See output above."
  }
}

Write-Host "Completed."
