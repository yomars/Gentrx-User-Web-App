[CmdletBinding()]
param(
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'

function Test-Command {
  param([Parameter(Mandatory)] [string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param(
    [string]$Item,
    [bool]$Ok,
    [string]$Details
  )

  $results.Add([pscustomobject]@{
    Item    = $Item
    Status  = if ($Ok) { 'OK' } else { 'MISSING' }
    Details = $Details
  }) | Out-Null
}

$nodeOk = Test-Command -Name 'node'
$npmOk = Test-Command -Name 'npm'
$pwshOk = Test-Command -Name 'pwsh'
$gitOk = Test-Command -Name 'git'
$curlOk = Test-Command -Name 'curl'

Add-Result -Item 'Node.js' -Ok $nodeOk -Details (if ($nodeOk) { (node -v) } else { 'Install Node.js 18+' })
Add-Result -Item 'npm' -Ok $npmOk -Details (if ($npmOk) { (npm -v) } else { 'Install npm (comes with Node.js)' })
Add-Result -Item 'PowerShell 7 (pwsh)' -Ok $pwshOk -Details (if ($pwshOk) { (pwsh -v) } else { 'Install PowerShell 7+' })
Add-Result -Item 'git' -Ok $gitOk -Details (if ($gitOk) { (git --version) } else { 'Install Git' })
Add-Result -Item 'curl' -Ok $curlOk -Details (if ($curlOk) { ((curl --version | Select-Object -First 1) -join '') } else { 'Install curl' })

$packageJson = Join-Path $PSScriptRoot '..\..\package.json'
$hasPackageJson = Test-Path -LiteralPath $packageJson
Add-Result -Item 'package.json' -Ok $hasPackageJson -Details $packageJson

$apiAddress = Join-Path $PSScriptRoot '..\..\src\Controllers\apiAddress.js'
$hasApiAddress = Test-Path -LiteralPath $apiAddress
Add-Result -Item 'apiAddress.js' -Ok $hasApiAddress -Details $apiAddress

$sshAvailable = Test-Command -Name 'ssh'
Add-Result -Item 'ssh client' -Ok $sshAvailable -Details (if ($sshAvailable) { 'Found (for remote sync scripts)' } else { 'Install OpenSSH client if using remote scripts' })

Write-Host ''
Write-Host '=== System Requirements Check ===' -ForegroundColor Cyan
$results | Format-Table -AutoSize

$missing = @($results | Where-Object { $_.Status -eq 'MISSING' })
if ($missing.Count -gt 0) {
  Write-Warning ("Missing {0} requirement(s)." -f $missing.Count)
  if ($Strict) {
    exit 1
  }
} else {
  Write-Host 'All core requirements are present.' -ForegroundColor Green
}
