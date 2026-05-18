param(
  [string]$BaseUrl = "https://api.gentrx.ph/api/v1",
  [int]$CityA = 1,
  [int]$CityB = 2
)

$ErrorActionPreference = "Stop"

function Get-ClinicResponse {
  param([string]$Url)

  try {
    return Invoke-RestMethod -Method GET -Uri $Url
  }
  catch {
    Write-Host "FAIL: Request failed: $Url" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
  }
}

function Expand-ClinicTitles {
  param($Data)

  if (-not $Data) { return @() }
  return @($Data | ForEach-Object { [string]$_.title })
}

$baseEndpoint = "$BaseUrl/patient/clinics"

Write-Host "Checking clinics endpoint city filter behavior..." -ForegroundColor Cyan
Write-Host "Base endpoint: $baseEndpoint"
Write-Host "City A: $CityA | City B: $CityB"

$allResponse = Get-ClinicResponse -Url $baseEndpoint
$cityAUrl = "{0}?city_id={1}" -f $baseEndpoint, $CityA
$cityBUrl = "{0}?city_id={1}" -f $baseEndpoint, $CityB

$cityAResponse = Get-ClinicResponse -Url $cityAUrl
$cityBResponse = Get-ClinicResponse -Url $cityBUrl

$allTitles = Expand-ClinicTitles -Data $allResponse.data
$cityATitles = Expand-ClinicTitles -Data $cityAResponse.data
$cityBTitles = Expand-ClinicTitles -Data $cityBResponse.data

$allCount = $allTitles.Count
$cityACount = $cityATitles.Count
$cityBCount = $cityBTitles.Count

Write-Host "All clinics count: $allCount"
Write-Host "City $CityA clinics count: $cityACount"
Write-Host "City $CityB clinics count: $cityBCount"

$cityASignature = ($cityATitles | Sort-Object) -join "|"
$cityBSignature = ($cityBTitles | Sort-Object) -join "|"

if ($cityASignature -eq $cityBSignature) {
  Write-Host "FAIL: city_id filtering appears ineffective (City $CityA and City $CityB returned identical clinic sets)." -ForegroundColor Red
  Write-Host "City $CityA titles: $($cityATitles -join ' | ')"
  Write-Host "City $CityB titles: $($cityBTitles -join ' | ')"
  exit 1
}

Write-Host "PASS: city_id filtering changes the clinic set as expected." -ForegroundColor Green
exit 0
