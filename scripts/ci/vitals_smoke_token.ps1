param(
  [string]$Api = "https://api.gentrx.ph/api/v1",
  [string]$Token,
  [int]$UserId,
  [int]$FamilyMemberId = 0,
  [switch]$CreateFamilyMemberIfMissing
)

$ErrorActionPreference = "Stop"

if (-not $Token) { throw "Token is required." }
if (-not $UserId -or $UserId -le 0) { throw "UserId is required and must be > 0." }

$headers = @{ Authorization = "Bearer $Token" }
$today = Get-Date -Format "yyyy-MM-dd"
$nowTime = Get-Date -Format "HH:mm"

function Step($message) {
  Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Info($message) {
  Write-Host "[INFO] $message"
}

function Test-ResponseSuccess {
  param(
    [object]$Response,
    [string]$Context
  )

  $respCode = $null
  if ($Response -and $Response.PSObject.Properties.Name -contains "response") {
    $respCode = [int]$Response.response
  }

  if ($respCode -ne 200) {
    throw "$Context failed. Response: $($Response | ConvertTo-Json -Depth 10)"
  }
}

function Get-AnyFamilyMemberId {
  param(
    [string]$BaseApi,
    [int]$CurrentUserId
  )

  $resp = Invoke-RestMethod -Method Get -Uri "$BaseApi/get_family_members/user/$CurrentUserId"

  if ($resp.data -and $resp.data.Count -gt 0) {
    return [int]$resp.data[0].id
  }

  return 0
}

function New-FamilyMember {
  param(
    [string]$BaseApi,
    [hashtable]$AuthHeaders,
    [int]$CurrentUserId
  )

  $phone = "9" + (Get-Random -Minimum 100000000 -Maximum 999999999).ToString()
  $seed = Get-Date -Format "HHmmss"

  $form = @{
    f_name = "Vitals"
    l_name = "Smoke$seed"
    phone = $phone
    isd_code = "+63"
    user_id = "$CurrentUserId"
    gender = "Male"
    dob = "1990-01-01"
  }

  $resp = Invoke-RestMethod -Method Post -Uri "$BaseApi/add_family_member" -Headers $AuthHeaders -Form $form

  if (-not $resp.id) {
    throw "Unable to create family member. Response: $($resp | ConvertTo-Json -Depth 10)"
  }

  return [int]$resp.id
}

function Get-VitalsByType {
  param(
    [string]$BaseApi,
    [int]$TargetFamilyMemberId,
    [string]$Type,
    [string]$StartDate,
    [string]$EndDate
  )

  $encodedType = [uri]::EscapeDataString($Type)
  $url = "$BaseApi/get_vitals_family_member_id_type?family_member_id=$TargetFamilyMemberId&type=$encodedType&start_date=$StartDate&end_date=$EndDate"
  $resp = Invoke-RestMethod -Method Get -Uri $url

  if ($resp.data) { return @($resp.data) }
  return @()
}

function Resolve-RecordIdFromResponseOrList {
  param(
    [object]$AddResponse,
    [object[]]$Items,
    [string]$Date,
    [string]$Time
  )

  if ($AddResponse -and $AddResponse.PSObject.Properties.Name -contains "id" -and $AddResponse.id) {
    return [int]$AddResponse.id
  }

  $match = $Items |
    Where-Object { $_.date -eq $Date -and $_.time -like "$Time*" } |
    Sort-Object -Property id -Descending |
    Select-Object -First 1

  if ($match -and $match.id) {
    return [int]$match.id
  }

  return 0
}

function Assert-Fields {
  param(
    [object]$Record,
    [hashtable]$Expected,
    [string]$Context
  )

  foreach ($k in $Expected.Keys) {
    $actual = $Record.$k
    $expected = [string]$Expected[$k]
    $actualText = [string]$actual

    if ($actualText -ne $expected) {
      throw "$Context mismatch for '$k'. Expected '$expected' but got '$actualText'."
    }
  }
}

function Test-VitalFlow {
  param(
    [string]$BaseApi,
    [hashtable]$AuthHeaders,
    [int]$CurrentUserId,
    [int]$TargetFamilyMemberId,
    [string]$Type,
    [hashtable]$AddFields,
    [hashtable]$UpdateFields,
    [string]$Date,
    [string]$Time
  )

  Step "Testing $Type"

  $addForm = @{
    user_id = "$CurrentUserId"
    family_member_id = "$TargetFamilyMemberId"
    type = $Type
    date = $Date
    time = $Time
  }

  foreach ($k in $AddFields.Keys) { $addForm[$k] = [string]$AddFields[$k] }

  $addResp = Invoke-RestMethod -Method Post -Uri "$BaseApi/add_vitals" -Headers $AuthHeaders -Form $addForm
  Test-ResponseSuccess -Response $addResp -Context "add_vitals ($Type)"

  $listAfterAdd = Get-VitalsByType -BaseApi $BaseApi -TargetFamilyMemberId $TargetFamilyMemberId -Type $Type -StartDate $Date -EndDate $Date
  $id = Resolve-RecordIdFromResponseOrList -AddResponse $addResp -Items $listAfterAdd -Date $Date -Time $Time

  if ($id -le 0) {
    throw "Unable to resolve added record id for $Type."
  }

  $addedRecord = $listAfterAdd | Where-Object { [int]$_.id -eq $id } | Select-Object -First 1
  if (-not $addedRecord) {
    throw "Added record id=$id not found in GET list for $Type."
  }

  Assert-Fields -Record $addedRecord -Expected $AddFields -Context "add verification ($Type)"

  $updateForm = @{
    id = "$id"
    user_id = "$CurrentUserId"
    family_member_id = "$TargetFamilyMemberId"
    type = $Type
    date = $Date
    time = $Time
  }

  foreach ($k in $UpdateFields.Keys) { $updateForm[$k] = [string]$UpdateFields[$k] }

  $updateResp = Invoke-RestMethod -Method Post -Uri "$BaseApi/update_vitals" -Headers $AuthHeaders -Form $updateForm
  Test-ResponseSuccess -Response $updateResp -Context "update_vitals ($Type)"

  $listAfterUpdate = Get-VitalsByType -BaseApi $BaseApi -TargetFamilyMemberId $TargetFamilyMemberId -Type $Type -StartDate $Date -EndDate $Date
  $updatedRecord = $listAfterUpdate | Where-Object { [int]$_.id -eq $id } | Select-Object -First 1

  if (-not $updatedRecord) {
    throw "Updated record id=$id not found in GET list for $Type."
  }

  Assert-Fields -Record $updatedRecord -Expected $UpdateFields -Context "update verification ($Type)"

  $deleteResp = Invoke-RestMethod -Method Post -Uri "$BaseApi/delete_vitals" -Headers $AuthHeaders -Form @{ id = "$id" }
  Test-ResponseSuccess -Response $deleteResp -Context "delete_vitals ($Type)"

  $listAfterDelete = Get-VitalsByType -BaseApi $BaseApi -TargetFamilyMemberId $TargetFamilyMemberId -Type $Type -StartDate $Date -EndDate $Date
  $deletedStillExists = $listAfterDelete | Where-Object { [int]$_.id -eq $id } | Select-Object -First 1
  if ($deletedStillExists) {
    throw "Delete verification failed for $Type. Record id=$id still exists."
  }

  return [pscustomobject]@{
    type = $Type
    id = $id
    add = "PASS"
    update = "PASS"
    delete = "PASS"
  }
}

Step "Vitals smoke setup"
Info "API: $Api"
Info "UserId: $UserId"

if ($FamilyMemberId -le 0) {
  $FamilyMemberId = Get-AnyFamilyMemberId -BaseApi $Api -CurrentUserId $UserId
}

if ($FamilyMemberId -le 0 -and $CreateFamilyMemberIfMissing) {
  Info "No family member found. Creating one for smoke test."
  $FamilyMemberId = New-FamilyMember -BaseApi $Api -AuthHeaders $headers -CurrentUserId $UserId
}

if ($FamilyMemberId -le 0) {
  throw "No family member available. Provide -FamilyMemberId or use -CreateFamilyMemberIfMissing."
}

Info "Using FamilyMemberId: $FamilyMemberId"

$results = @()

$tests = @(
  @{
    type = "Blood Pressure"
    add = @{ bp_systolic = 120; bp_diastolic = 80 }
    update = @{ bp_systolic = 126; bp_diastolic = 84 }
  },
  @{
    type = "Sugar"
    add = @{ sugar_fasting = 90; sugar_random = 130 }
    update = @{ sugar_fasting = 95; sugar_random = 140 }
  },
  @{
    type = "Weight"
    add = @{ weight = 70 }
    update = @{ weight = 71 }
  },
  @{
    type = "Temperature"
    add = @{ temperature = 36.5 }
    update = @{ temperature = 37.1 }
  },
  @{
    type = "SpO2"
    add = @{ spo2 = 97 }
    update = @{ spo2 = 98 }
  }
)

foreach ($t in $tests) {
  $result = Test-VitalFlow `
    -BaseApi $Api `
    -AuthHeaders $headers `
    -CurrentUserId $UserId `
    -TargetFamilyMemberId $FamilyMemberId `
    -Type $t.type `
    -AddFields $t.add `
    -UpdateFields $t.update `
    -Date $today `
    -Time $nowTime

  $results += $result
}

Step "Vitals smoke test PASSED"
$results | Format-Table -AutoSize
