param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$KeyName = "id_gentrx_deploy",
  [ValidateSet("rsa", "ed25519")]
  [string]$KeyType = "rsa",
  [switch]$ForceRegenerate = $false,
  [switch]$RequireNonInteractiveKeyLogin = $false,
  [string]$SshPassword = ""
)

$ErrorActionPreference = "Stop"

$sshDir = Join-Path $HOME ".ssh"
if (-not (Test-Path -LiteralPath $sshDir)) {
  New-Item -ItemType Directory -Path $sshDir | Out-Null
}

$keyPath = Join-Path $sshDir $KeyName
$pubKeyPath = "$keyPath.pub"

function Ensure-PoshSsh {
  if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module for non-interactive password auth..."
    Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
    Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber
  }

  Import-Module Posh-SSH -Force
}

function Install-PubKeyWithPassword {
  param(
    [string]$PasswordText,
    [string]$PublicKeyText
  )

  Ensure-PoshSsh

  $securePassword = ConvertTo-SecureString $PasswordText -AsPlainText -Force
  $credential = New-Object System.Management.Automation.PSCredential($User, $securePassword)
  $sshSession = $null

  try {
    $sshSession = New-SSHSession -ComputerName $Server -Credential $credential -AcceptKey -ConnectionTimeout 15
    $pubKeyEscaped = $PublicKeyText
    $remoteCommand = "mkdir -p ~/.ssh; chmod 700 ~/.ssh; touch ~/.ssh/authorized_keys; if ! grep -qxF '$pubKeyEscaped' ~/.ssh/authorized_keys; then echo '$pubKeyEscaped' >> ~/.ssh/authorized_keys; fi; chmod 600 ~/.ssh/authorized_keys"
    $result = Invoke-SSHCommand -SessionId $sshSession.SessionId -Command $remoteCommand -TimeOut 20000
    if ($result.ExitStatus -ne 0) {
      throw "Failed to install SSH public key on server."
    }
  }
  finally {
    if ($sshSession) {
      Remove-SSHSession -SessionId $sshSession.SessionId | Out-Null
    }
  }
}

if ($ForceRegenerate -and (Test-Path -LiteralPath $keyPath)) {
  Remove-Item -LiteralPath $keyPath -Force
}

if ($ForceRegenerate -and (Test-Path -LiteralPath $pubKeyPath)) {
  Remove-Item -LiteralPath $pubKeyPath -Force
}

# Avoid probing key passphrase state here because some OpenSSH builds can block for
# interactive input. Non-interactive SSH validation below is the source of truth.

if (-not (Test-Path -LiteralPath $keyPath)) {
  Write-Host "Generating $KeyType SSH key at $keyPath"
  $genOutput = @()
  if ($KeyType -eq "rsa") {
    $genOutput = & ssh-keygen -t rsa -b 4096 -f $keyPath -N "" -q 2>&1
  } else {
    $genOutput = & ssh-keygen -t ed25519 -f $keyPath -N "" -q 2>&1
  }
  if ($LASTEXITCODE -ne 0) {
    $genText = ($genOutput | Out-String)
    if ($genText -match "passphrase is too short") {
      throw "ssh-keygen failed because this machine enforces a minimum key passphrase length. For non-interactive deploys, use password mode (-UsePasswordAuth) or load the key into ssh-agent before deploy."
    }

    throw "ssh-keygen failed. $genText"
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
if (-not [string]::IsNullOrWhiteSpace($SshPassword)) {
  Install-PubKeyWithPassword -PasswordText $SshPassword -PublicKeyText $pubKey
} else {
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
  $message = "Key-based login test failed in non-interactive mode. This usually means the key requires a passphrase and is not loaded in ssh-agent."
  if ($RequireNonInteractiveKeyLogin) {
    throw $message
  }

  Write-Warning $message
  Write-Host "If your machine enforces key passphrases, this is expected unless ssh-agent is preloaded." -ForegroundColor Yellow
  Write-Host "To try agent mode:" -ForegroundColor Yellow
  Write-Host "  ssh-add $keyPath" -ForegroundColor Yellow
  Write-Host "You can still deploy with server password prompts using:" -ForegroundColor Yellow
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy_prod_149.ps1 -UsePasswordAuth" -ForegroundColor Yellow
  exit 0
}

Write-Host "Key-based login is working. You can now run deploy_prod_149.ps1 without password prompts."
