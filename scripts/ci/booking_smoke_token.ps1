param(
  [string]$Api = "https://api.gentrx.ph/api/v1",
  [int]$UserId = 50,
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"
if (-not $Token) { throw "Token is required" }

function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
$auth = @{ Authorization = "Bearer $Token" }

function Invoke-FormPost {
  param(
    [string]$Uri,
    [hashtable]$Fields,
    [string]$BearerToken
  )

  $args = @(
    "-sS",
    "-X", "POST",
    "-H", "Authorization: Bearer $BearerToken"
  )

  foreach ($k in $Fields.Keys) {
    $args += "-F"
    $args += ("{0}={1}" -f $k, $Fields[$k])
  }

  $args += $Uri
  $raw = & curl.exe @args
  if (-not $raw) { throw "Empty response from $Uri" }
  return ($raw | ConvertFrom-Json)
}

Step "A) Create family member"
$fmPhone = ("9" + (Get-Random -Minimum 100000000 -Maximum 999999999).ToString())
$fm = Invoke-FormPost -Uri "$Api/add_family_member" -BearerToken $Token -Fields @{
  f_name = "Smoke"
  l_name = "Persist"
  phone = $fmPhone
  isd_code = "+63"
  user_id = "$UserId"
  gender = "Male"
  dob = "1990-01-01"
}
if (-not $fm.id) { throw "add_family_member failed: $($fm | ConvertTo-Json -Depth 6)" }
$familyId = [int]$fm.id
Write-Host "family_member_id=$familyId"

Step "B) Discover doctor and slot"
$doctorsResp = Invoke-RestMethod -Method Get -Uri "$Api/get_doctor?active=1"
if (-not $doctorsResp.data -or $doctorsResp.data.Count -eq 0) { throw "No active doctors" }

$chosen = $null
foreach ($doc in $doctorsResp.data) {
  $doctorId = [int]$doc.user_id
  $deptId = [int]$doc.department

  for ($i = 1; $i -le 30; $i++) {
    $candidateDate = (Get-Date).AddDays($i).ToString("yyyy-MM-dd")
    $dayName = (Get-Date $candidateDate).ToString("dddd")

    $candidates = @(
      @{ ep = "get_doctor_time_interval/$doctorId/$dayName"; type = "OPD" },
      @{ ep = "get_doctor_video_time_interval/$doctorId/$dayName"; type = "Video Consultant" }
    )

    foreach ($s in $candidates) {
      try {
        $slotResp = Invoke-RestMethod -Method Get -Uri "$Api/$($s.ep)"
        if ($slotResp.data -and $slotResp.data.Count -gt 0 -and $slotResp.data[0].time_start) {
          $fee = 0
          if ($s.type -eq "Video Consultant") {
            $fee = [decimal]$doc.video_fee
          } else {
            $fee = [decimal]$doc.opd_fee
          }

          $tax = 0
          if ($doc.PSObject.Properties.Name -contains "clinic_tax" -and $null -ne $doc.clinic_tax) {
            $tax = [decimal]$doc.clinic_tax
          }

          $chosen = [pscustomobject]@{
            doctorId = $doctorId
            deptId = $deptId
            date = $candidateDate
            slot = $slotResp.data[0].time_start
            type = $s.type
            fee = $fee
            tax = $tax
            slotSource = $s.ep
          }
          break
        }
      } catch {
      }
    }

    if ($chosen) { break }
  }

  if ($chosen) { break }
}

if (-not $chosen) {
  Write-Host "No live slots found in next 30 days; using synthetic slot for persistence probe" -ForegroundColor Yellow
  $doc = $doctorsResp.data[0]
  $tax = 0
  if ($doc.PSObject.Properties.Name -contains "clinic_tax" -and $null -ne $doc.clinic_tax) {
    $tax = [decimal]$doc.clinic_tax
  }
  $chosen = [pscustomobject]@{
    doctorId = [int]$doc.user_id
    deptId = [int]$doc.department
    date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    slot = "09:00"
    type = "OPD"
    fee = [decimal]$doc.opd_fee
    tax = $tax
    slotSource = "synthetic"
  }
}

Write-Host "doctor=$($chosen.doctorId) dept=$($chosen.deptId) date=$($chosen.date) slot=$($chosen.slot) type=$($chosen.type) source=$($chosen.slotSource)"

Step "C) Add appointment"
$unitTax = [math]::Round(($chosen.fee * $chosen.tax) / 100, 2)
$total = [math]::Round(($chosen.fee + $unitTax), 2)

$appt = Invoke-FormPost -Uri "$Api/add_appointment" -BearerToken $Token -Fields @{
  family_member_id = "$familyId"
  status = "Pending"
  date = $chosen.date
  time_slots = $chosen.slot
  doct_id = "$($chosen.doctorId)"
  dept_id = "$($chosen.deptId)"
  type = $chosen.type
  payment_status = "Unpaid"
  fee = "$($chosen.fee)"
  service_charge = "0"
  tax = "$($chosen.tax)"
  unit_tax_amount = "$unitTax"
  total_amount = "$total"
  unit_total_amount = "$total"
  invoice_description = $chosen.type
  user_id = "$UserId"
  source = "Web"
}

Write-Host ("add_appointment => " + ($appt | ConvertTo-Json -Depth 8))

if ($appt.response -eq 200 -and $appt.id) {
  $appointmentId = [int]$appt.id

  Step "D) Verify detail and list"
  $detail = Invoke-RestMethod -Method Get -Uri "$Api/get_appointment/$appointmentId"
  $list = Invoke-RestMethod -Method Get -Uri "$Api/get_appointments?user_id=$UserId"
  $match = $null
  if ($list.data) {
    $match = $list.data | Where-Object { [int]$_.id -eq $appointmentId } | Select-Object -First 1
  }

  [pscustomobject]@{
    result = "PASS"
    appointment_id = $appointmentId
    detail_ok = ([int]$detail.data.id -eq $appointmentId)
    list_ok = ($null -ne $match)
    status = $detail.data.status
    payment_status = $detail.data.payment_status
  } | Format-List
} else {
  [pscustomobject]@{
    result = "BLOCKED"
    reason = "add_appointment rejected or missing id"
    response = ($appt | ConvertTo-Json -Depth 8)
  } | Format-List
}
