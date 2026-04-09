Param(
    [string]$OutputDir = "artifacts"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path "dist")) {
    throw "dist folder was not found. Run npm run build first."
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bundlePath = Join-Path $OutputDir ("gentrx-user-web-dist-" + $stamp + ".tar.gz")

$filesToPack = @(
    "dist",
    "scripts/deploy/ecosystem.user-web.cjs",
    "scripts/deploy/gentrx-user-web.nginx.conf"
)

tar -czf $bundlePath @filesToPack

Write-Host "Bundle created: $bundlePath" -ForegroundColor Green
