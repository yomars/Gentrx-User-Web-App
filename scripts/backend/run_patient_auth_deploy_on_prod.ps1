param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$LaravelPath = "/opt/gentrx-api",
  [string]$PublicApiBase = "https://api.gentrx.ph"
)

$ErrorActionPreference = "Stop"

$localPackageRoot = "scripts/backend/laravel"
$remotePackageRoot = "/tmp/gentrx-patient-auth"
$installer = "$remotePackageRoot/scripts/backend/laravel/install_patient_auth_on_server.sh"

if (-not (Test-Path $localPackageRoot)) {
  throw "Missing local package root: $localPackageRoot"
}

Write-Host "Preparing remote package directory on $User@$Server ..."
ssh "${User}@${Server}" "rm -rf $remotePackageRoot && mkdir -p $remotePackageRoot/scripts/backend"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to prepare remote package directory on $User@$Server"
}

Write-Host "Uploading patient auth package to $User@$Server ..."
scp -r $localPackageRoot "${User}@${Server}:$remotePackageRoot/scripts/backend/"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to upload patient auth package to $User@$Server"
}

$remoteCmd = @(
  "chmod +x $installer"
  "cd /root"
  "bash $installer $LaravelPath $PublicApiBase"
) -join " && "

Write-Host "Running remote installer and E2E checks ..."
ssh "${User}@${Server}" $remoteCmd
if ($LASTEXITCODE -ne 0) {
  throw "Remote installer reported a failure. Check logs above for details."
}

Write-Host "Patient auth deploy check completed successfully."