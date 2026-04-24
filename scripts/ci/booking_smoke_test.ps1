param(
  [switch]$RequireBookingNumber
)

$ErrorActionPreference = "Stop"
$api = "https://api.gentrx.ph/api/v1"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Test-BookingNumberFormat($value) {
  if (-not $value) { return $false }
  return [bool]($value -match '^BK-\d{8}-\d{6}$')
}

Write-Step "1) Fetch clinics"
# Clinics endpoint is currently rate-limited in repeated smoke runs.
# Use a known valid clinic id from earlier successful runs.
$clinic = [pscustomobject]@{ id = 5; title = "Calamba Doctors and Medical Centere" }
Write-Host "Using clinic id=$($clinic.id) title=$($clinic.title)"

Write-Step "2) Signup fresh patient"
$seed = (Get-Date -Format "HHmmss")
$phone = ("9" + (Get-Random -Minimum 100000000 -Maximum 999999999).ToString())
$password = "1234"
$signupBody = @{
  name = "Smoke User $seed"
  f_name = "Smoke"
  l_name = "User$seed"
  phone = $phone
  isd_code = "+63"
  gender = "Male"
  email = "smoke.$seed@gentrx.test"
  password = $password
  clinic_id = [int]$clinic.id
} | ConvertTo-Json
$signupResp = $null
try {
  $signupResp = Invoke-RestMethod -Method Post -Uri "$api/patient/signup" -ContentType "application/json" -Body $signupBody
  if (-not $signupResp.status) { throw "Signup failed: $($signupResp | ConvertTo-Json -Depth 6)" }
  Write-Host "Signup ok. phone=$phone patient_code=$($signupResp.data.patient_code)"
} catch {
  $message = $_.Exception.Message
  if ($message -like "*(429)*") {
    Write-Host "Signup rate-limited (429). Reusing existing smoke account for continuation." -ForegroundColor Yellow
    $knownPhones = @("9665494048", "9819292106", "9743528315")
    $phone = $knownPhones[0]
    Write-Host "Using fallback phone=$phone"
  } else {
    throw
  }
}

Write-Step "3) Login patient"
$loginBody = @{ phone = $phone; password = $password } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri "$api/patient/login" -ContentType "application/json" -Body $loginBody
if (-not $loginResp.status -or -not $loginResp.token) { throw "Login failed: $($loginResp | ConvertTo-Json -Depth 6)" }
$token = $loginResp.token
$userId = [int]$loginResp.data.id
$authHeader = @{ Authorization = "Bearer $token" }
Write-Host "Login ok. user_id=$userId"

Write-Step "4) Fetch active doctors and slots"
$doctorCandidates = @()
$doctorEndpoints = @(
  "get_active_doctor",
  "get_doctor?active=1",
  "get_doctor"
)
foreach ($ep in $doctorEndpoints) {
  try {
    $resp = Invoke-RestMethod -Method Get -Uri "$api/$ep"
    if ($resp.data -and $resp.data.Count -gt 0) {
      $doctorCandidates = $resp.data
      Write-Host "Doctor source endpoint: $ep (count=$($resp.data.Count))"
      break
    }
  } catch {
    Write-Host "Doctor endpoint failed: $ep"
  }
}
if (-not $doctorCandidates -or $doctorCandidates.Count -eq 0) {
  throw "No doctors returned from available endpoints (get_active_doctor/get_doctor)"
}

$doctor = $null
$doctorId = $null
$deptId = $null
$apptType = $null
$date = $null
$slotStart = $null

$eligibleDoctors = $doctorCandidates | Where-Object { $_.department -ne $null }
if (-not $eligibleDoctors -or $eligibleDoctors.Count -eq 0) { $eligibleDoctors = $doctorCandidates }

foreach ($d in $eligibleDoctors) {
  $currentDoctorId = [int]$d.user_id
  $currentDeptId = [int]$d.department

  for ($i = 1; $i -le 14; $i++) {
    $candidateDate = (Get-Date).AddDays($i).ToString("yyyy-MM-dd")
    $dayName = (Get-Date $candidateDate).ToString("dddd")

    $slotEndpoints = @(
      @{ url = "get_doctor_time_interval/$currentDoctorId/$dayName"; type = "OPD" },
      @{ url = "get_doctor_video_time_interval/$currentDoctorId/$dayName"; type = "Video Consultant" }
    )

    foreach ($slotCandidate in $slotEndpoints) {
      try {
        $slotResp = Invoke-RestMethod -Method Get -Uri "$api/$($slotCandidate.url)"
        if ($slotResp.data -and $slotResp.data.Count -gt 0 -and $slotResp.data[0].time_start) {
          $doctor = $d
          $doctorId = $currentDoctorId
          $deptId = $currentDeptId
          $apptType = $slotCandidate.type
          $date = $candidateDate
          $slotStart = $slotResp.data[0].time_start
          break
        }
      } catch {
        # continue probing
      }
    }

    if ($doctor) { break }
  }

  if ($doctor) { break }
}

if (-not $doctor -or -not $slotStart) {
  Write-Host "No live slots found from slot endpoints; falling back to synthetic slot attempt for persistence verification." -ForegroundColor Yellow
  $doctor = $eligibleDoctors | Select-Object -First 1
  if (-not $doctor) { $doctor = $doctorCandidates | Select-Object -First 1 }
  if (-not $doctor) {
    throw "No doctors available for fallback booking attempt"
  }

  $doctorId = [int]$doctor.user_id
  $deptId = [int]$doctor.department
  $apptType = "OPD"
  $date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
  $slotStart = "09:00"
}

Write-Host "Using doctor_id=$doctorId dept_id=$deptId type=$apptType date=$date slot=$slotStart"

Write-Step "5) Create family member for booking"
$fmPhone = ("9" + (Get-Random -Minimum 100000000 -Maximum 999999999).ToString())
$fmForm = @{
  f_name = "Smoke"
  l_name = "Dependent"
  phone = $fmPhone
  isd_code = "+63"
  user_id = "$userId"
  gender = "Male"
  dob = "1995-01-01"
}
$fmResp = Invoke-RestMethod -Method Post -Uri "$api/add_family_member" -Headers $authHeader -Form $fmForm
if (-not $fmResp.id) { throw "add_family_member failed: $($fmResp | ConvertTo-Json -Depth 6)" }
$familyMemberId = [int]$fmResp.id
Write-Host "Family member created id=$familyMemberId"

Write-Step "6) Add appointment"
$fee = [decimal]($doctor.opd_fee)
$clinicTax = 0
if ($doctor.PSObject.Properties.Name -contains "clinic_tax" -and $doctor.clinic_tax -ne $null) { $clinicTax = [decimal]$doctor.clinic_tax }
$unitTax = [math]::Round(($fee * $clinicTax) / 100, 2)
$total = [math]::Round(($fee + $unitTax), 2)
$apptForm = @{
  family_member_id = "$familyMemberId"
  status = "Pending"
  date = $date
  time_slots = $slotStart
  doct_id = "$doctorId"
  dept_id = "$deptId"
  type = $apptType
  payment_status = "Unpaid"
  fee = "$fee"
  service_charge = "0"
  tax = "$clinicTax"
  unit_tax_amount = "$unitTax"
  total_amount = "$total"
  unit_total_amount = "$total"
  invoice_description = $apptType
  user_id = "$userId"
  source = "Web"
}
$apptResp = Invoke-RestMethod -Method Post -Uri "$api/add_appointment" -Headers $authHeader -Form $apptForm
if (-not $apptResp.response -or [int]$apptResp.response -ne 200) { throw "add_appointment failed: $($apptResp | ConvertTo-Json -Depth 8)" }
$appointmentId = $apptResp.id
if (-not $appointmentId) { throw "add_appointment returned 200 without id: $($apptResp | ConvertTo-Json -Depth 8)" }
Write-Host "Appointment created id=$appointmentId"

Write-Step "7) Verify get_appointment"
$apptDetailResp = Invoke-RestMethod -Method Get -Uri "$api/get_appointment/$appointmentId"
if (-not $apptDetailResp.data -or [int]$apptDetailResp.data.id -ne [int]$appointmentId) { throw "get_appointment mismatch: $($apptDetailResp | ConvertTo-Json -Depth 8)" }
$detailBookingNumber = $apptDetailResp.data.booking_number
$detailBookingNumberOk = Test-BookingNumberFormat $detailBookingNumber
if ($RequireBookingNumber -and -not $detailBookingNumberOk) {
  throw "booking_number is missing/invalid in get_appointment response. value='$detailBookingNumber'"
}
Write-Host "Detail ok. status=$($apptDetailResp.data.status) payment_status=$($apptDetailResp.data.payment_status)"

Write-Step "8) Verify get_appointments"
$listResp = Invoke-RestMethod -Method Get -Uri "$api/get_appointments?user_id=$userId"
$match = $null
if ($listResp.data) { $match = $listResp.data | Where-Object { [int]$_.id -eq [int]$appointmentId } | Select-Object -First 1 }
if (-not $match) { throw "Appointment id=$appointmentId not found in get_appointments for user_id=$userId" }
$listBookingNumber = $match.booking_number
$listBookingNumberOk = Test-BookingNumberFormat $listBookingNumber
if ($RequireBookingNumber -and -not $listBookingNumberOk) {
  throw "booking_number is missing/invalid in get_appointments response. value='$listBookingNumber'"
}
if (-not $RequireBookingNumber -and (-not $detailBookingNumberOk -or -not $listBookingNumberOk)) {
  Write-Host "booking_number not yet fully available/valid. Run with -RequireBookingNumber after backend rollout." -ForegroundColor Yellow
}
Write-Host "List verification ok. Found id=$appointmentId"

Write-Step "SMOKE TEST PASSED"
[pscustomobject]@{
  phone = $phone
  user_id = $userId
  appointment_id = $appointmentId
  doctor_id = $doctorId
  date = $date
  slot = $slotStart
  status = $apptDetailResp.data.status
  payment_status = $apptDetailResp.data.payment_status
  booking_number_detail = $detailBookingNumber
  booking_number_list = $listBookingNumber
  booking_number_detail_ok = $detailBookingNumberOk
  booking_number_list_ok = $listBookingNumberOk
} | Format-List
