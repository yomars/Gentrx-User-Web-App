param(
  [string]$Base = "https://api.gentrx.ph/api/v1",
  [string]$Email = "gentrxadmin@gmail.com",
  [string]$Password = "2205",
  [string]$Image1 = "public/doctor-2.png",
  [string]$Image2 = "public/doctors.webp",
  [switch]$ReadOnlySafeMode,
  [switch]$EnforceNewPrefix,
  [switch]$EnforceBlockCompatiblePrefix
)

$ErrorActionPreference = "Stop"

function Get-HttpStatus([string]$url) {
  $line = (curl.exe -sI $url | Select-String "HTTP/1.1" | Select-Object -First 1).Line
  if ($line -match "HTTP/1.1\s+(\d{3})") { return [int]$matches[1] }
  return -1
}

function Get-Prefix([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return "" }
  return ($path -split "/")[0].ToLowerInvariant()
}

Write-Host "[1/7] Login..."
$login = ((curl.exe -s -X POST "$Base/login" -F "email=$Email" -F "password=$Password") | ConvertFrom-Json)
if (-not $login.status) { throw "Login failed: $($login.message)" }
$token = [string]$login.token

if ($ReadOnlySafeMode) {
  Write-Host "[2/7] Read-only mode enabled (no create/update/delete)."
  $doctors = ((curl.exe -s "$Base/get_doctor?active=1") | ConvertFrom-Json).data
  if ($null -eq $doctors) { $doctors = @() }

  $withImage = @($doctors | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_.image) })
  $noImage = @($doctors | Where-Object { [string]::IsNullOrWhiteSpace([string]$_.image) })

  $http200 = 0
  $http404 = 0
  $other = 0
  $prefixes = @()

  foreach ($doc in $withImage) {
    $path = [string]$doc.image
    $prefixes += (Get-Prefix $path)
    $status = Get-HttpStatus "https://api.gentrx.ph/storage/$path"
    if ($status -eq 200) { $http200++ }
    elseif ($status -eq 404) { $http404++ }
    else { $other++ }
  }

  $prefixPass = $true
  if ($EnforceNewPrefix) {
    $allowed = @("clients", "doctors", "system")
    $prefixPass = @($prefixes | Where-Object { $allowed -notcontains $_ }).Count -eq 0
  }
  if ($EnforceBlockCompatiblePrefix) {
    $allowed = @("users", "clients", "doctors", "system")
    $prefixPass = @($prefixes | Where-Object { $allowed -notcontains $_ }).Count -eq 0
  }

  $readOnlyResult = [ordered]@{
    mode = "read-only"
    totalDoctors = @($doctors).Count
    withImage = @($withImage).Count
    noImage = @($noImage).Count
    imageHttp200 = $http200
    imageHttp404 = $http404
    imageOtherStatus = $other
    policy = @{
      readPass = ($http404 -eq 0)
      prefixPass = $prefixPass
      enforceNewPrefix = [bool]$EnforceNewPrefix
      enforceBlockCompatiblePrefix = [bool]$EnforceBlockCompatiblePrefix
    }
  }

  Write-Host "[7/7] Result"
  ($readOnlyResult | ConvertTo-Json -Depth 6) | Write-Host

  if (-not $readOnlyResult.policy.readPass) { exit 2 }
  if (-not $readOnlyResult.policy.prefixPass) { exit 3 }
  exit 0
}

$imgPath1 = (Resolve-Path $Image1).Path
$imgPath2 = (Resolve-Path $Image2).Path

Write-Host "[1.5/7] Discovering valid reference values from existing doctors..."
$seedDoctors = ((curl.exe -s "$Base/get_doctor?active=1") | ConvertFrom-Json).data
$seed = $seedDoctors | Select-Object -First 1
if ($null -eq $seed) { throw "No active doctors found to seed test payload." }

$seedClinicId = [string]$seed.clinic_id
$seedDepartment = [string]$seed.department
$seedSpecialization = [string]$seed.specialization
$seedGender = [string]$seed.gender
if ([string]::IsNullOrWhiteSpace($seedGender)) { $seedGender = "Male" }

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$rand = Get-Random -Minimum 1000 -Maximum 9999
$email = "img.integrity.$stamp.$rand@example.com"
$phone = "9$((Get-Random -Minimum 100000000 -Maximum 999999999))"

$result = [ordered]@{
  create = @{}
  update = @{}
  remove = @{}
  delete = @{}
  policy = @{}
}

Write-Host "[2/7] Create doctor with image..."
$createRaw = (curl.exe -s -X POST "$Base/add_doctor" -H "Authorization: Bearer $token" -F "f_name=Img" -F "l_name=Integrity" -F "email=$email" -F "password=TempPass123!" -F "phone=$phone" -F "isd_code=+63" -F "dob=1990-01-01" -F "gender=$seedGender" -F "department=$seedDepartment" -F "specialization=$seedSpecialization" -F "ex_year=5" -F "clinic_id=$seedClinicId" -F "active=1" -F "description=image integrity" -F "room=101" -F "license_number=LIC-$stamp-$rand" -F "ptr_number=PTR-$stamp-$rand" -F "image=@$imgPath1")
$create = ($createRaw | ConvertFrom-Json)
$id = [string]$create.id
if ([string]::IsNullOrWhiteSpace($id)) {
  Write-Host "Create raw response: $createRaw" -ForegroundColor Yellow
  throw "Create failed: no id"
}

$detail1 = ((curl.exe -s "$Base/get_doctor/$id" -H "Authorization: Bearer $token") | ConvertFrom-Json).data
$img1 = [string]$detail1.image
$st1 = if ($img1) { Get-HttpStatus "https://api.gentrx.ph/storage/$img1" } else { -1 }
$result.create = @{ id = $id; image = $img1; status = $st1; prefix = (Get-Prefix $img1) }

Write-Host "[3/7] Update doctor image..."
$null = (curl.exe -s -X POST "$Base/update_doctor" -H "Authorization: Bearer $token" -F "id=$id" -F "f_name=Img" -F "l_name=Integrity2" -F "dob=1990-01-01" -F "gender=$seedGender" -F "department=$seedDepartment" -F "specialization=$seedSpecialization" -F "ex_year=6" -F "clinic_id=$seedClinicId" -F "active=1" -F "description=image integrity update" -F "room=102" -F "image=@$imgPath2")

$detail2 = ((curl.exe -s "$Base/get_doctor/$id" -H "Authorization: Bearer $token") | ConvertFrom-Json).data
$img2 = [string]$detail2.image
$st2 = if ($img2) { Get-HttpStatus "https://api.gentrx.ph/storage/$img2" } else { -1 }
$result.update = @{ image = $img2; status = $st2; prefix = (Get-Prefix $img2) }

Write-Host "[4/7] Remove doctor image..."
$null = (curl.exe -s -X POST "$Base/remove_doctor_image" -H "Authorization: Bearer $token" -F "id=$id")
$detail3 = ((curl.exe -s "$Base/get_doctor/$id" -H "Authorization: Bearer $token") | ConvertFrom-Json).data
$result.remove = @{ image = [string]$detail3.image; isEmpty = [string]::IsNullOrWhiteSpace([string]$detail3.image) }

Write-Host "[5/7] Delete doctor..."
$null = (curl.exe -s -X POST "$Base/delete_doctor" -H "Authorization: Bearer $token" -F "id=$id")
$detail4Raw = (curl.exe -s "$Base/get_doctor/$id" -H "Authorization: Bearer $token") | ConvertFrom-Json
$result.delete = @{ dataIsNull = ($detail4Raw.data -eq $null) }

Write-Host "[6/7] Evaluate policy..."
$crudPass = ($result.create.status -eq 200 -and $result.update.status -eq 200 -and $result.remove.isEmpty -and $result.delete.dataIsNull)
$prefixPass = $true
if ($EnforceNewPrefix) {
  $allowed = @("clients", "doctors", "system")
  $prefixPass = ($allowed -contains $result.create.prefix -and $allowed -contains $result.update.prefix)
}
if ($EnforceBlockCompatiblePrefix) {
  $allowed = @("users", "clients", "doctors", "system")
  $prefixPass = ($allowed -contains $result.create.prefix -and $allowed -contains $result.update.prefix)
}

$result.policy = @{ crudPass = $crudPass; prefixPass = $prefixPass; enforceNewPrefix = [bool]$EnforceNewPrefix; enforceBlockCompatiblePrefix = [bool]$EnforceBlockCompatiblePrefix }

Write-Host "[7/7] Result"
($result | ConvertTo-Json -Depth 6) | Write-Host

if (-not $crudPass) { exit 2 }
if (-not $prefixPass) { exit 3 }
exit 0
