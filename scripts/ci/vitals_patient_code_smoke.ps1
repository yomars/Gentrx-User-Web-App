param(
  [string]$BaseUrl = "https://api.gentrx.ph/api/v1",
  [string]$PatientCode = "",
  [string]$Type = "spo2"
)

$ErrorActionPreference = "Stop"

if (-not $PatientCode) {
  $PatientCode = [string]$env:GENTRX_SMOKE_PATIENT_CODE
}

if (-not $PatientCode) {
  Write-Host "FAIL: PatientCode is required. Pass -PatientCode or set GENTRX_SMOKE_PATIENT_CODE." -ForegroundColor Red
  exit 1
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [object]$Body = $null
  )

  try {
    if ($null -eq $Body) {
      return Invoke-RestMethod -Method $Method -Uri $Url
    }

    $json = $Body | ConvertTo-Json -Depth 8
    return Invoke-RestMethod -Method $Method -Uri $Url -ContentType "application/json" -Body $json
  }
  catch {
    Write-Host "FAIL: Request failed: $Method $Url" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
  }
}

function Assert-SuccessResponse {
  param(
    [object]$Response,
    [string]$Context
  )

  $responseCode = [int]($Response.response)
  $statusValue = [bool]($Response.status)
  if ($responseCode -ne 200 -or -not $statusValue) {
    Write-Host "FAIL: $Context returned non-success response." -ForegroundColor Red
    Write-Host ($Response | ConvertTo-Json -Depth 10) -ForegroundColor Red
    exit 1
  }
}

function Build-VitalsListUrl {
  param(
    [string]$Api,
    [string]$VitalsType,
    [string]$From,
    [string]$To,
    [string]$Code,
    [string]$FamilyMemberId = ""
  )

  $params = New-Object System.Collections.Generic.List[string]
  $params.Add("type=$([uri]::EscapeDataString($VitalsType))")
  $params.Add("start_date=$([uri]::EscapeDataString($From))")
  $params.Add("end_date=$([uri]::EscapeDataString($To))")
  $params.Add("patient_code=$([uri]::EscapeDataString($Code))")
  $params.Add("owner_id=$([uri]::EscapeDataString($Code))")
  $params.Add("owner_type=patient")

  if ($FamilyMemberId) {
    $params.Add("family_member_id=$([uri]::EscapeDataString($FamilyMemberId))")
  }

  return "$Api/get_vitals_family_member_id_type?" + ($params -join "&")
}

Write-Host "Running patient_code vitals smoke test..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Patient code: $PatientCode"
Write-Host "Type: $Type"

$familyUrl = "$BaseUrl/get_family_members/patient/$([uri]::EscapeDataString($PatientCode))"
$familyResponse = Invoke-Api -Method "GET" -Url $familyUrl
Assert-SuccessResponse -Response $familyResponse -Context "get_family_members/patient"

$familyData = @($familyResponse.data)
if ($familyData.Count -eq 0) {
  Write-Host "FAIL: No family members returned for patient_code $PatientCode." -ForegroundColor Red
  exit 1
}

$selfMember = $familyData | Where-Object { [string]$_.patient_code -eq $PatientCode } | Select-Object -First 1
if (-not $selfMember) {
  $selfMember = $familyData | Select-Object -First 1
}

$today = Get-Date -Format "yyyy-MM-dd"
$createTime = (Get-Date).ToString("HH:mm")
$updateTime = (Get-Date).AddMinutes(1).ToString("HH:mm")
$createSpo2 = Get-Random -Minimum 95 -Maximum 99
$updateSpo2 = $createSpo2 - 1

$createPayload = @{
  type = $Type
  date = $today
  time = $createTime
  spo2 = "$createSpo2"
  patient_code = $PatientCode
  owner_id = $PatientCode
  owner_type = "patient"
  note = "patient-code smoke"
}

$createResponse = Invoke-Api -Method "POST" -Url "$BaseUrl/add_vitals" -Body $createPayload
Assert-SuccessResponse -Response $createResponse -Context "add_vitals"

$recordId = [int]($createResponse.data.id)
if ($recordId -le 0) {
  Write-Host "FAIL: add_vitals did not return a valid record id." -ForegroundColor Red
  Write-Host ($createResponse | ConvertTo-Json -Depth 10) -ForegroundColor Red
  exit 1
}

$updatePayload = @{
  id = $recordId
  type = $Type
  date = $today
  time = $updateTime
  spo2 = "$updateSpo2"
  patient_code = $PatientCode
  owner_id = $PatientCode
  owner_type = "patient"
}

$updateResponse = Invoke-Api -Method "POST" -Url "$BaseUrl/update_vitals" -Body $updatePayload
Assert-SuccessResponse -Response $updateResponse -Context "update_vitals"

$listUrl = Build-VitalsListUrl -Api $BaseUrl -VitalsType $Type -From $today -To $today -Code $PatientCode -FamilyMemberId ([string]$selfMember.id)
$listResponse = Invoke-Api -Method "GET" -Url $listUrl
Assert-SuccessResponse -Response $listResponse -Context "get_vitals_family_member_id_type"

$updatedRecord = @($listResponse.data) | Where-Object { [int]$_.id -eq $recordId } | Select-Object -First 1
if (-not $updatedRecord) {
  Write-Host "FAIL: Updated record id=$recordId was not found in vitals list." -ForegroundColor Red
  exit 1
}

if ([string]$updatedRecord.spo2 -ne [string]$updateSpo2) {
  Write-Host "FAIL: Updated spo2 mismatch. Expected $updateSpo2, got $($updatedRecord.spo2)." -ForegroundColor Red
  exit 1
}

$deletePayload = @{
  id = $recordId
  patient_code = $PatientCode
  owner_id = $PatientCode
  owner_type = "patient"
}

$deleteResponse = Invoke-Api -Method "POST" -Url "$BaseUrl/delete_vitals" -Body $deletePayload
Assert-SuccessResponse -Response $deleteResponse -Context "delete_vitals"

$postDeleteResponse = Invoke-Api -Method "GET" -Url $listUrl
Assert-SuccessResponse -Response $postDeleteResponse -Context "post-delete vitals list"

$stillExists = @($postDeleteResponse.data) | Where-Object { [int]$_.id -eq $recordId } | Select-Object -First 1
if ($stillExists) {
  Write-Host "FAIL: Record id=$recordId still exists after delete_vitals." -ForegroundColor Red
  exit 1
}

Write-Host "PASS: patient_code vitals CRUD smoke test succeeded." -ForegroundColor Green
Write-Host "Validated member id: $($selfMember.id)"
Write-Host "Validated record id: $recordId"
exit 0