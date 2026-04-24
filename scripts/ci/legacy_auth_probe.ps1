$ErrorActionPreference = "Stop"
$phone = "9" + (Get-Random -Minimum 100000000 -Maximum 999999999).ToString()
Write-Host "PHONE=$phone"

$signupArgs = @(
  "-s", "-X", "POST", "https://api.gentrx.ph/api/v1/add_user",
  "-F", "f_name=Legacy",
  "-F", "l_name=Smoke",
  "-F", "name=Legacy Smoke",
  "-F", "phone=$phone",
  "-F", "isd_code=+63",
  "-F", "gender=Male",
  "-F", "email=legacy.$phone@gentrx.test",
  "-F", "password=1234"
)
$signup = & curl.exe @signupArgs
Write-Host "SIGNUP=$signup"

$loginArgs = @(
  "-s", "-X", "POST", "https://api.gentrx.ph/api/v1/login_phone",
  "-F", "phone=$phone"
)
$login = & curl.exe @loginArgs
Write-Host "LOGIN=$login"
