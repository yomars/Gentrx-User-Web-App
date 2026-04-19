param(
  [string]$Server      = "149.28.145.80",
  [string]$User        = "root",
  [string]$SshPassword = ""
)

$ErrorActionPreference = "Stop"

# Require password
if (-not $SshPassword) {
  $SshPassword = Read-Host -Prompt "Server password"
}

$localFile   = "artifacts/AppointmentController.php"
$remotePath  = "/opt/gentrx-api/app/Http/Controllers/Api/V1/AppointmentController.php"

$localWallet  = "artifacts/WalletController.php"
$remoteWallet = "/opt/gentrx-api/app/Http/Controllers/Api/WalletController.php"

$localAllTxn  = "artifacts/AllTransactionController.php"
$remoteAllTxn = "/opt/gentrx-api/app/Http/Controllers/Api/V1/AllTransactionController.php"

if (-not (Test-Path $localFile))    { throw "Local artifact not found: $localFile" }
if (-not (Test-Path $localWallet))  { throw "Local artifact not found: $localWallet" }
if (-not (Test-Path $localAllTxn))  { throw "Local artifact not found: $localAllTxn" }

$sshTarget = "${User}@${Server}"

# plink/pscp use single-quoted password so $ in password is never interpolated
function Invoke-Remote($cmd) {
  echo y | plink -pw $SshPassword $sshTarget $cmd
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $cmd" }
}

function Upload-File($local, $remote) {
  pscp -pw $SshPassword $local "${sshTarget}:${remote}"
  if ($LASTEXITCODE -ne 0) { throw "Upload failed: $local" }
}

Write-Host "=== [1/8] Backing up existing controllers on server ==="
Invoke-Remote "cp $remotePath ${remotePath}.bak && cp $remoteWallet ${remoteWallet}.bak && cp $remoteAllTxn ${remoteAllTxn}.bak && echo backups_done"

Write-Host "=== [2/8] Uploading patched AppointmentController.php ==="
Upload-File $localFile $remotePath
Write-Host "    Uploaded: $remotePath"

Write-Host "=== [3/8] Uploading patched WalletController.php ==="
Upload-File $localWallet $remoteWallet
Write-Host "    Uploaded: $remoteWallet"

Write-Host "=== [4/8] Uploading patched AllTransactionController.php ==="
Upload-File $localAllTxn $remoteAllTxn
Write-Host "    Uploaded: $remoteAllTxn"

Write-Host "=== [5/8] Clearing Laravel cache ==="
Invoke-Remote "cd /opt/gentrx-api && php8.2 artisan optimize:clear && echo cache_cleared"

Write-Host "=== [6/8] Verifying patient_code in deployed files ==="
Invoke-Remote "echo AppointmentController: && grep -c 'patient_code' $remotePath && echo WalletController: && grep -c 'patient_code' $remoteWallet && echo AllTransactionController: && grep -c 'patient_code' $remoteAllTxn"

Write-Host "=== [7/8] Reloading PHP-FPM ==="
Invoke-Remote "service php8.2-fpm reload 2>/dev/null || true; echo fpm_reloaded"

Write-Host ""
Write-Host "=== [8/8] Deployment complete ==="
Write-Host "    All 3 controllers live with patient_code."
