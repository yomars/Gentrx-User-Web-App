#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Appends Movider SMS env vars to /opt/gentrx-api/.env on production and
    refreshes the Laravel config cache so the OTP feature goes live immediately.

.PARAMETER Server
    SSH target IP. Defaults to 149.28.145.80.

.PARAMETER User
    SSH user. Defaults to root.

.PARAMETER LaravelPath
    Absolute path to the Laravel app on the server. Defaults to /opt/gentrx-api.

.PARAMETER UsePasswordAuth
    When $true, passes -o PreferredAuthentications=password to ssh/scp.

.PARAMETER SshPassword
    Password for SSH authentication (used with plink if available, or ssh -o).

.EXAMPLE
    & .\scripts\backend\set_movider_env_on_prod.ps1 -UsePasswordAuth:$true -SshPassword 'yourpassword'
#>
param(
    [string]$Server        = "149.28.145.80",
    [string]$User          = "root",
    [string]$LaravelPath   = "/opt/gentrx-api",
    [switch]$UsePasswordAuth,
    [string]$SshPassword   = ""
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Env vars to ensure are present in .env
# ---------------------------------------------------------------------------
$EnvVars = @{
    MOVIDER_API_KEY              = "35sfUcHlupBFggQPx0gKolTeNe7"
    MOVIDER_API_SECRET           = "W5x1g5McdWXVJTjgGUfITi7Taqij1JWrIgI8XhGC"
    GENTRX_PHONE_VERIFY_REQUIRED = "true"
}

# ---------------------------------------------------------------------------
# Build the remote shell snippet:
#   For each key — if the line already exists update it, otherwise append it.
#   Then run config:cache.
# ---------------------------------------------------------------------------
$envFile = "$LaravelPath/.env"
$snippets = @()
foreach ($kv in $EnvVars.GetEnumerator()) {
    $key = $kv.Key
    $val = $kv.Value
    # Use grep to check existence; sed to update in-place if found; else append
    $snippets += @"
if grep -qE '^${key}=' $envFile 2>/dev/null; then
  sed -i "s|^${key}=.*|${key}=${val}|" $envFile
  echo "[movider-env] Updated ${key}"
else
  echo "${key}=${val}" >> $envFile
  echo "[movider-env] Appended ${key}"
fi
"@
}
$snippets += "cd $LaravelPath && php artisan config:cache && echo '[movider-env] config:cache OK'"

$remoteCmd = $snippets -join "`n"

# ---------------------------------------------------------------------------
# SSH execution helpers
# ---------------------------------------------------------------------------
function Invoke-RemoteCmd {
    param([string]$Cmd)

    if ($UsePasswordAuth -and $SshPassword -ne "") {
        # Prefer plink (PuTTY) for password auth on Windows
        if (Get-Command plink -ErrorAction SilentlyContinue) {
            Write-Host "[ssh] Using plink with password auth ..."
            plink -batch -ssh -l $User -pw $SshPassword $Server $Cmd
            return $LASTEXITCODE
        }
        # Fall back to sshpass if available
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            Write-Host "[ssh] Using sshpass ..."
            sshpass -p $SshPassword ssh -o StrictHostKeyChecking=no "${User}@${Server}" $Cmd
            return $LASTEXITCODE
        }
        Write-Warning "Neither plink nor sshpass found. Falling back to ssh (may prompt for password)."
    }

    ssh "${User}@${Server}" $Cmd
    return $LASTEXITCODE
}

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Activating Movider env vars on $User@$Server ===" -ForegroundColor Cyan
Write-Host "Target .env: $envFile"
Write-Host ""

$exit = Invoke-RemoteCmd $remoteCmd
if ($exit -ne 0) {
    throw "Remote command failed (exit $exit). Check SSH output above."
}

Write-Host ""
Write-Host "=== Verifying env vars are readable by Laravel ===" -ForegroundColor Cyan
$verifyCmd = "cd $LaravelPath && php artisan tinker --execute=""echo json_encode(['key'=>env('MOVIDER_API_KEY')!==null,'secret'=>env('MOVIDER_API_SECRET')!==null,'verify'=>env('GENTRX_PHONE_VERIFY_REQUIRED')]);"" 2>/dev/null || echo 'tinker_unavailable'"
$exit2 = Invoke-RemoteCmd $verifyCmd
if ($exit2 -ne 0) {
    Write-Warning "Verification step failed — but env vars were already written. Check manually."
} else {
    Write-Host ""
    Write-Host "=== Movider env activation complete ===" -ForegroundColor Green
}
