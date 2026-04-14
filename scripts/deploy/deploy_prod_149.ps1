param(
  [string]$Server = "149.28.145.80",
  [string]$User = "root",
  [string]$DeployDir = "/var/www/gentrx-user-web-app",
  [string]$ProcessName = "gentrx-main",
  [int]$AppPort = 3000,
  [string]$VerifyHost = "gentrx.ph",
  [bool]$EnforceLocalHashMatch = $true,
  [bool]$CheckPublicHash = $true,
  [string]$ArtifactPath = "",
  [string]$SshKeyPath = "",
  [bool]$AutoBuildIfMissing = $true,
  [bool]$UsePasswordAuth = $false,
  [string]$SshPassword = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Get-LatestArtifact {
  $artifact = Get-ChildItem -Path "artifacts" -Filter "gentrx-user-web-dist-*.tar.gz" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $artifact) {
    throw "No deployment artifact found in artifacts/. Run npm run package:dist first."
  }

  return $artifact.FullName
}

function Ensure-Artifact {
  if ($ArtifactPath -and (Test-Path -LiteralPath $ArtifactPath)) {
    return
  }

  $latest = $null
  try {
    $latest = Get-LatestArtifact
  } catch {
    $latest = $null
  }

  if ($latest) {
    $script:ArtifactPath = $latest
    return
  }

  if (-not $AutoBuildIfMissing) {
    throw "No deployment artifact found in artifacts/. Run npm run package:dist first."
  }

  Write-Host "No artifact found. Building and packaging automatically..."
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed."
  }

  & npm run package:dist
  if ($LASTEXITCODE -ne 0) {
    throw "npm run package:dist failed."
  }

  $script:ArtifactPath = Get-LatestArtifact
}

function Ensure-PoshSsh {
  if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module for non-interactive password auth..."
    Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
    Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber
  }

  Import-Module Posh-SSH -Force
}

function Invoke-RemoteDeployWithPassword {
  param(
    [string]$PasswordText,
    [string]$ArtifactLocalPath,
    [string]$ArtifactRemotePath,
    [string]$RemoteCommand
  )

  Ensure-PoshSsh

  $securePassword = ConvertTo-SecureString $PasswordText -AsPlainText -Force
  $credential = New-Object System.Management.Automation.PSCredential($User, $securePassword)

  $sftpSession = $null
  $sshSession = $null

  try {
    Write-Host "Uploading artifact via SFTP: $artifactName"
    $sftpSession = New-SFTPSession -ComputerName $Server -Credential $credential -AcceptKey -ConnectionTimeout 15
    $remoteDestinationDir = [System.IO.Path]::GetDirectoryName($ArtifactRemotePath).Replace("\", "/")
    if ([string]::IsNullOrWhiteSpace($remoteDestinationDir)) {
      $remoteDestinationDir = "/tmp"
    }

    Set-SFTPItem -SessionId $sftpSession.SessionId -Path $ArtifactLocalPath -Destination $remoteDestinationDir -Force

    Write-Host "Running remote deploy via SSH"
    $sshSession = New-SSHSession -ComputerName $Server -Credential $credential -AcceptKey -ConnectionTimeout 15
    $result = Invoke-SSHCommand -SessionId $sshSession.SessionId -Command $RemoteCommand -TimeOut 180000

    if ($result.Output) {
      $result.Output | ForEach-Object { Write-Host $_ }
    }

    if ($result.ExitStatus -ne 0) {
      throw "Remote deploy command failed with exit status $($result.ExitStatus)."
    }
  }
  finally {
    if ($sshSession) {
      Remove-SSHSession -SessionId $sshSession.SessionId | Out-Null
    }
    if ($sftpSession) {
      Remove-SFTPSession -SessionId $sftpSession.SessionId | Out-Null
    }
  }
}

Ensure-Artifact

if (-not (Test-Path -LiteralPath $ArtifactPath)) {
  throw "Artifact not found: $ArtifactPath"
}

$artifactName = [System.IO.Path]::GetFileName($ArtifactPath)
$remoteTmpPath = "/tmp/$artifactName"

$sshArgs = @()
$scpArgs = @()

if (-not $UsePasswordAuth -and -not $SshKeyPath) {
  $candidateKeys = @(
    "$HOME/.ssh/id_gentrx_deploy",
    "$HOME/.ssh/id_ed25519",
    "$HOME/.ssh/id_rsa"
  )

  foreach ($candidate in $candidateKeys) {
    if (Test-Path -LiteralPath $candidate) {
      $SshKeyPath = $candidate
      Write-Host "Using detected SSH key: $SshKeyPath"
      break
    }
  }
}

if ($SshKeyPath -and -not $UsePasswordAuth) {
  if (-not (Test-Path -LiteralPath $SshKeyPath)) {
    throw "SSH key not found: $SshKeyPath"
  }
  $sshArgs += @("-i", $SshKeyPath)
  $scpArgs += @("-i", $SshKeyPath)
  $sshArgs += @("-o", "IdentitiesOnly=yes")
  $scpArgs += @("-o", "IdentitiesOnly=yes")
}

if ($UsePasswordAuth) {
  Write-Host "Using password authentication mode." -ForegroundColor Yellow
}

$sshArgs += @("-o", "ConnectTimeout=15")
$scpArgs += @("-o", "ConnectTimeout=15")
$sshArgs += @("-o", "StrictHostKeyChecking=accept-new")
$scpArgs += @("-o", "StrictHostKeyChecking=accept-new")

Write-Host "Uploading artifact: $artifactName"

$useNonInteractivePassword = $UsePasswordAuth -and -not [string]::IsNullOrWhiteSpace($SshPassword)

if (-not $UsePasswordAuth) {
  & scp @scpArgs "$ArtifactPath" "$User@$Server`:$remoteTmpPath"
  if ($LASTEXITCODE -ne 0) {
    throw "SCP upload failed. If key auth fails, retry with -UsePasswordAuth."
  }
} elseif (-not $useNonInteractivePassword) {
  $sshArgs += @("-o", "PreferredAuthentications=password")
  $scpArgs += @("-o", "PreferredAuthentications=password")
  $sshArgs += @("-o", "PubkeyAuthentication=no")
  $scpArgs += @("-o", "PubkeyAuthentication=no")

  Write-Host "No password parameter provided; falling back to interactive password prompts." -ForegroundColor Yellow
  & scp @scpArgs "$ArtifactPath" "$User@$Server`:$remoteTmpPath"
  if ($LASTEXITCODE -ne 0) {
    throw "SCP upload failed in password mode."
  }
}

$remoteScriptTemplate = @'
set -eu
set -o pipefail
mkdir -p "__DEPLOY_DIR__"
tar -xzf "__REMOTE_TMP_PATH__" -C "__DEPLOY_DIR__"

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2 serve
fi

# Cleanup accidental process name created by previous deploy experiments.
pm2 delete ecosystem.user-web >/dev/null 2>&1 || true
pm2 delete gentrx-user-web >/dev/null 2>&1 || true

if pm2 describe "__PROCESS_NAME__" >/dev/null 2>&1; then
  pm2 restart "__PROCESS_NAME__" --update-env
else
  pm2 start serve --name "__PROCESS_NAME__" --cwd "__DEPLOY_DIR__" -- -s dist -l "__APP_PORT__"
fi

pm2 save
nginx -t
systemctl reload nginx

echo "Waiting for app readiness through nginx route..."
ready=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if curl -fsS -H "Host: __VERIFY_HOST__" http://127.0.0.1/ >/dev/null; then
    ready=1
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo "ERROR: App did not become ready behind nginx in time."
  exit 1
fi

echo "Checking public HTTPS readiness..."
https_ready=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  status=$(curl -s -o /dev/null -w "%{http_code}" https://gentrx.ph/ || true)
  if [ "$status" = "200" ]; then
    https_ready=1
    break
  fi
  sleep 2
done

if [ "$https_ready" -ne 1 ]; then
  echo "ERROR: Public HTTPS endpoint did not return 200 in time."
  exit 1
fi

echo "=== post-deploy checks ==="
curl -sS -I https://gentrx.ph/ | head -n 5
curl -fsS https://gentrx.ph/version-live.json | head -c 220; echo
curl -fsS https://gentrx.ph/api/v1/get_doctor?active=1 | head -c 220; echo

DEPLOY_HASH=$(sha256sum "__DEPLOY_DIR__/dist/index.html" | awk '{print $1}')
LOCAL_HOST_HASH=$(curl -fsSL -H "Host: __VERIFY_HOST__" http://127.0.0.1/ | sha256sum | awk '{print $1}')

echo "DEPLOY_HASH=$DEPLOY_HASH"
echo "LOCAL_HOST_HASH=$LOCAL_HOST_HASH"

if [ "__ENFORCE_LOCAL_HASH_MATCH__" = "True" ] && [ "$DEPLOY_HASH" != "$LOCAL_HOST_HASH" ]; then
  echo "ERROR: Local host-route hash mismatch after deploy."
  exit 1
fi

if [ "__CHECK_PUBLIC_HASH__" = "True" ]; then
  PUBLIC_HASH=$(curl -fsSL "https://__VERIFY_HOST__/?ts=$(date +%s)" | sha256sum | awk '{print $1}')
  echo "PUBLIC_HASH=$PUBLIC_HASH"
fi
'@

$remoteScript = $remoteScriptTemplate.Replace("__DEPLOY_DIR__", $DeployDir)
$remoteScript = $remoteScript.Replace("__REMOTE_TMP_PATH__", $remoteTmpPath)
$remoteScript = $remoteScript.Replace("__PROCESS_NAME__", $ProcessName)
$remoteScript = $remoteScript.Replace("__APP_PORT__", $AppPort.ToString())
$remoteScript = $remoteScript.Replace("__VERIFY_HOST__", $VerifyHost)
$remoteScript = $remoteScript.Replace("__ENFORCE_LOCAL_HASH_MATCH__", $EnforceLocalHashMatch.ToString())
$remoteScript = $remoteScript.Replace("__CHECK_PUBLIC_HASH__", $CheckPublicHash.ToString())

$remoteScriptUnix = ($remoteScript -replace "`r`n", "`n") -replace "`r", ""

Write-Host "Running remote deploy on $Server"
if ($useNonInteractivePassword) {
  Invoke-RemoteDeployWithPassword -PasswordText $SshPassword -ArtifactLocalPath $ArtifactPath -ArtifactRemotePath $remoteTmpPath -RemoteCommand $remoteScriptUnix
} else {
  $remoteScriptUnix | ssh @sshArgs "$User@$Server" "bash -se"
  if ($LASTEXITCODE -ne 0) {
    throw "Remote deploy command failed. Verify SSH credentials and server permissions."
  }
}

Write-Host "Deployment completed on $Server"
