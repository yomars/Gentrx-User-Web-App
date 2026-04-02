param(
  [string]$Base = "https://api.gentrx.ph/api/v1",
  [string]$Email = "gentrxadmin@gmail.com",
  [string]$Password = "2205",
  [int]$SamplePerEntity = 30
)

$ErrorActionPreference = "Stop"

function Get-Prefix($path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return "" }
  return ($path -split "/")[0].ToLowerInvariant()
}

function Test-PathStatus([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return 0 }
  $url = "https://api.gentrx.ph/storage/$path"
  $line = (curl.exe -sI $url | Select-String "HTTP/1.1" | Select-Object -First 1).Line
  if ($line -match "200") { return 200 }
  if ($line -match "404") { return 404 }
  if ($line -match "403") { return 403 }
  return -1
}

function Audit-Entity([string]$name, $items, [string[]]$allowedPrefixes) {
  $paths = @($items | Where-Object { $_.image } | ForEach-Object { [string]$_.image } | Sort-Object -Unique | Select-Object -First $SamplePerEntity)

  $allowed = 0
  $unexpected = 0
  $ok200 = 0
  $notFound404 = 0
  $other = 0

  foreach ($p in $paths) {
    $prefix = Get-Prefix $p
    if ($allowedPrefixes -contains $prefix) { $allowed++ } else { $unexpected++ }

    $status = Test-PathStatus $p
    if ($status -eq 200) { $ok200++ }
    elseif ($status -eq 404) { $notFound404++ }
    else { $other++ }
  }

  $total = [Math]::Max($paths.Count, 1)
  $allowedPct = [Math]::Round(($allowed * 100.0) / $total, 2)

  [PSCustomObject]@{
    Entity = $name
    Sampled = $paths.Count
    AllowedPrefix = $allowed
    UnexpectedPrefix = $unexpected
    AllowedPrefixPercent = $allowedPct
    Http200 = $ok200
    Http404 = $notFound404
    HttpOther = $other
    Pass = ($allowedPct -eq 100 -and $notFound404 -eq 0)
  }
}

Write-Host "[1/3] Authenticating..."
$login = ((curl.exe -s -X POST "$Base/login" -F "email=$Email" -F "password=$Password") | ConvertFrom-Json)
if (-not $login.status) {
  throw "Login failed: $($login.message)"
}
$token = [string]$login.token

Write-Host "[2/3] Fetching entities..."
$doctors = ((curl.exe -s "$Base/get_doctor?active=1" -H "Authorization: Bearer $token") | ConvertFrom-Json).data
$clinics = ((curl.exe -s "$Base/get_clinic" -H "Authorization: Bearer $token") | ConvertFrom-Json).data
$departments = ((curl.exe -s "$Base/get_department" -H "Authorization: Bearer $token") | ConvertFrom-Json).data

Write-Host "[3/3] Running image audit..."
$results = @(
  Audit-Entity -name "Doctors" -items $doctors -allowedPrefixes @("users", "doctors", "clients", "system")
  Audit-Entity -name "Clinics" -items $clinics -allowedPrefixes @("clinics", "system")
  Audit-Entity -name "Departments" -items $departments -allowedPrefixes @("department", "system")
)

$results | Format-Table -AutoSize | Out-String | Write-Host

$failed = @($results | Where-Object { -not $_.Pass })
if ($failed.Count -gt 0) {
  Write-Host "FAIL: Storage serving policy is not satisfied." -ForegroundColor Red
  Write-Host "Expected: 100% allowed prefixes and 0 HTTP 404 per entity sample." -ForegroundColor Yellow
  exit 2
}

Write-Host "PASS: Platform image paths are healthy (allowed prefixes, no sampled 404s)." -ForegroundColor Green
