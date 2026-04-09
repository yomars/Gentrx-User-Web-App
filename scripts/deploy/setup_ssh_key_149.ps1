param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$KeyName = "id_gentrx_deploy",
  [ValidateSet("rsa", "ed25519")]
  [string]$KeyType = "rsa",
  [switch]$ForceRegenerate = $false,
  [switch]$RequireNonInteractiveKeyLogin = $false
)

$ErrorActionPreference = "Stop"

$sshDir = Join-Path $HOME ".ssh"
if (-not (Test-Path -LiteralPath $sshDir)) {
  New-Item -ItemType Directory -Path $sshDir | Out-Null
}

$keyPath = Join-Path $sshDir $KeyName
$pubKeyPath = "$keyPath.pub"

function Test-KeyReadableWithoutPassphrase {
  param([string]$Path)

  & ssh-keygen -y -P "" -f $Path *> $null
  return ($LASTEXITCODE -eq 0)
}

if ($ForceRegenerate -and (Test-Path -LiteralPath $keyPath)) {
  Remove-Item -LiteralPath $keyPath -Force
}

if ($ForceRegenerate -and (Test-Path -LiteralPath $pubKeyPath)) {
  Remove-Item -LiteralPath $pubKeyPath -Force
}

if ((Test-Path -LiteralPath $keyPath) -and -not (Test-KeyReadableWithoutPassphrase -Path $keyPath)) {
  Write-Host "Existing key requires a passphrase and cannot be used for automated deploy. Regenerating..." -ForegroundColor Yellow
  Remove-Item -LiteralPath $keyPath -Force
  if (Test-Path -LiteralPath $pubKeyPath) {
    Remove-Item -LiteralPath $pubKeyPath -Force
  }
}

if (-not (Test-Path -LiteralPath $keyPath)) {
  Write-Host "Generating $KeyType SSH key at $keyPath"
  if ($KeyType -eq "rsa") {
    & ssh-keygen -t rsa -b 4096 -f $keyPath -N "" -q
  } else {
    & ssh-keygen -t ed25519 -f $keyPath -N "" -q
  }
  if ($LASTEXITCODE -ne 0) {
    throw "ssh-keygen failed."
  }
}

if (-not (Test-Path -LiteralPath $pubKeyPath)) {
  throw "Public key not found: $pubKeyPath"
}

$pubKey = (Get-Content -Raw $pubKeyPath).Trim()
if (-not $pubKey) {
  throw "Public key is empty: $pubKeyPath"
}

Write-Host "Installing public key on $User@$Server (you may be prompted for password once)..."
$installArgs = @(
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "PreferredAuthentications=password",
  "-o", "PubkeyAuthentication=no",
  "$User@$Server",
  "mkdir -p ~/.ssh; chmod 700 ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys"
)
$pubKey | ssh @installArgs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install SSH public key on server."
}

Write-Host "SSH key installed successfully. Testing key-based login..."
$testArgs = @(
  "-o", "BatchMode=yes",
  "-o", "IdentitiesOnly=yes",
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "PreferredAuthentications=publickey",
  "-i", $keyPath,
  "$User@$Server",
  "echo key-login-ok"
)
& ssh @testArgs
if ($LASTEXITCODE -ne 0) {
  $message = "Key-based login test failed in non-interactive mode. This can happen on some Windows SSH clients that still request key passphrase input."
  if ($RequireNonInteractiveKeyLogin) {
    throw $message
  }

  Write-Warning $message
  Write-Host "You can still deploy with server password prompts using:" -ForegroundColor Yellow
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy_prod_149.ps1 -UsePasswordAuth" -ForegroundColor Yellow
  exit 0
}

Write-Host "Key-based login is working. You can now run deploy_prod_149.ps1 without password prompts."
