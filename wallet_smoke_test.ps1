#!/usr/bin/env pwsh
<#
.DESCRIPTION
Wallet-only smoke test (payment module excluded).
Validates login, wallet fetch, transaction history, and add_wallet_money endpoint behavior.
#>

$ErrorActionPreference = 'Stop'
$base = 'https://api.gentrx.ph/api/v1'

function Log {
    param([string]$Msg, [string]$Level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Output "[$ts] [$Level] $Msg"
}

function Parse-HttpWithBody {
    param([string]$Raw)
    $lines = $Raw -split "`n"
    $httpCode = $lines[-1].Trim()
    $json = if ($lines.Count -gt 1) { ($lines[0..($lines.Count - 2)] -join "`n") } else { '' }
    return @{ HttpCode = $httpCode; Json = $json }
}

function Test-WalletEndpoint {
    try {
        Log 'Starting wallet smoke tests...'

        # 1. Login
        Log '1. Testing login...'
        $login = (& curl.exe -s -X POST "$base/login" `
            -F 'email=patientuser@gentrx.ph' `
            -F 'password=12345678' | ConvertFrom-Json)

        if (-not $login.status) {
            Log "Login failed: $($login.message)" 'ERROR'
            $login | ConvertTo-Json | Write-Output
            return $false
        }

        $token = [string]$login.token
        $userId = $login.data.id
        Log "Login OK - User ID: $userId" 'SUCCESS'

        # 2. Get wallet data
        Log '2. Testing wallet balance retrieval...'
        $walletRaw = & curl.exe -s -w "`n%{http_code}" -H "Authorization: Bearer $token" "$base/get_wallet"
        $walletParsed = Parse-HttpWithBody -Raw $walletRaw
        $wallet = $walletParsed.Json | ConvertFrom-Json

        Log "HTTP Status: $($walletParsed.HttpCode)"
        if ($walletParsed.HttpCode -ne '200') {
            Log "Wallet fetch returned HTTP $($walletParsed.HttpCode)" 'ERROR'
            Log "Response: $($walletParsed.Json)" 'ERROR'
            return $false
        }

        Log "Wallet fetch OK - Status: $($wallet.status)" 'SUCCESS'
        if ($wallet.data) {
            $bal = if ($wallet.data.balance) { $wallet.data.balance } else { 'N/A' }
            $wid = if ($wallet.data.id) { $wallet.data.id } else { 'N/A' }
            Log "Balance: $bal"
            Log "User Wallet ID: $wid"
        }

        # 3. Get transactions
        Log '3. Testing transaction history...'
        $txRaw = & curl.exe -s -w "`n%{http_code}" -H "Authorization: Bearer $token" "$base/get_wallet_transactions"
        $txParsed = Parse-HttpWithBody -Raw $txRaw
        $tx = $txParsed.Json | ConvertFrom-Json

        Log "HTTP Status: $($txParsed.HttpCode)"
        if ($txParsed.HttpCode -ne '200') {
            Log "Transaction fetch returned HTTP $($txParsed.HttpCode)" 'ERROR'
            Log "Response: $($txParsed.Json)" 'ERROR'
        } else {
            Log 'Transaction fetch OK' 'SUCCESS'
            if ($tx.data -and $tx.data.Count -gt 0) {
                Log "Recent transactions: $($tx.data.Count)"
                $tx.data | Select-Object -First 3 | ForEach-Object {
                    Log "- ID: $($_.id), Amount: $($_.amount), Type: $($_.type), Status: $($_.status)"
                }
            } else {
                Log 'No transactions found'
            }
        }

        # 4. add_wallet_money endpoint check (no payment gateway required)
        Log '4. Testing add_wallet_money endpoint...'
        $dateStamp = Get-Date -Format 'yyyyMMddHHmmss'
        $txIdTest = "SMOKE_TEST_$dateStamp"
        $moneyRaw = & curl.exe -s -w "`n%{http_code}" -X POST "$base/add_wallet_money" `
            -H "Authorization: Bearer $token" `
            -F 'amount=100' `
            -F "transaction_id=$txIdTest"

        $moneyParsed = Parse-HttpWithBody -Raw $moneyRaw
        $money = $moneyParsed.Json | ConvertFrom-Json
        Log "HTTP Status: $($moneyParsed.HttpCode)"
        Log "Response Status: $($money.status)"
        Log "Response Message: $($money.message)"

        Log 'Wallet smoke tests completed' 'SUCCESS'
        return $true
    }
    catch {
        Log "Exception: $($_.Exception.Message)" 'ERROR'
        Log "Line: $($_.InvocationInfo.ScriptLineNumber)" 'ERROR'
        return $false
    }
}

# Run test
$ok = Test-WalletEndpoint
if (-not $ok) { exit 1 }
exit 0
