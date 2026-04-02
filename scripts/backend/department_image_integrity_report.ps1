param(
  [string]$Base = "https://api.gentrx.ph/api/v1",
  [string]$Email = "gentrxadmin@gmail.com",
  [string]$Password = "2205",
  [string]$OutCsv = "artifacts/department-image-integrity.csv"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/4] Authenticating..."
$login = ((curl.exe -s -X POST "$Base/login" -F "email=$Email" -F "password=$Password") | ConvertFrom-Json)
if (-not $login.status) { throw "Login failed: $($login.message)" }
$token = [string]$login.token

Write-Host "[2/4] Fetching departments..."
$departments = ((curl.exe -s "$Base/get_department" -H "Authorization: Bearer $token") | ConvertFrom-Json).data
if (-not $departments) { throw "No departments returned from API" }

Write-Host "[3/4] Probing image URLs..."
$rows = @()
foreach ($d in $departments) {
  $path = [string]$d.image
  if ([string]::IsNullOrWhiteSpace($path)) {
    $rows += [PSCustomObject]@{
      id = $d.id
      title = $d.title
      image = ""
      status = "NO_IMAGE"
      url = ""
    }
    continue
  }

  $url = "https://api.gentrx.ph/storage/$path"
  $statusLine = (curl.exe -sI $url | Select-String "HTTP/1.1" | Select-Object -First 1).Line
  $status = if ($statusLine -match "HTTP/1.1\s+(\d{3})") { $matches[1] } else { "UNKNOWN" }

  $rows += [PSCustomObject]@{
    id = $d.id
    title = $d.title
    image = $path
    status = $status
    url = $url
  }
}

$ok = @($rows | Where-Object { $_.status -eq "200" }).Count
$nf = @($rows | Where-Object { $_.status -eq "404" }).Count
$other = @($rows | Where-Object { $_.status -notin @("200", "404", "NO_IMAGE") }).Count
$noImage = @($rows | Where-Object { $_.status -eq "NO_IMAGE" }).Count

$dir = Split-Path -Parent $OutCsv
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$rows | Export-Csv -NoTypeInformation -Path $OutCsv -Encoding UTF8

Write-Host "[4/4] Done"
Write-Host "Total departments: $($rows.Count)"
Write-Host "HTTP 200: $ok"
Write-Host "HTTP 404: $nf"
Write-Host "No image set: $noImage"
Write-Host "Other status: $other"
Write-Host "CSV report: $OutCsv"

if ($nf -gt 0) { exit 2 }
exit 0
