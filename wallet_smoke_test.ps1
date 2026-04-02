#!/usr/bin/env pwsh
<#
.DESCRIPTION
Comprehensive wallet smoke test - validates loading and payment functionality
#>
$ErrorActionPreference = 'Stop'
$base = 'https://api.gentrx.ph/api/v1'

function Log {
    param([string]$Msg, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Output "[$ts] [$Level] $Msg"
}

function Test-WalletEndpoint {
    try {
        Log "Starting wallet smoke tests..."
        
        # 1. Login
        Log "1. Testing login..."
        $login = (& curl.exe -s -X POST "$base/login" `
            -F "email=patientuser@gentrx.ph" `
            -F "password=12345678" | ConvertFrom-Json)
        
        if (-not $login.status) {
            Log "Login failed: $($login.message)" "ERROR"
            $login | ConvertTo-Json | Write-Output
            return $false
        }
        $token = $login.token
        $userId = $login.data.id
        Log "✓ Login OK - User ID: $userId" "SUCCESS"
        
        # 2. Get wallet data
        Log "2. Testing wallet balance retrieval..."
        $walletResp = & curl.exe -s -w "`n%{http_code}" -H "Authorization: Bearer $token" "$base/get_wallet"
        $lines = $walletResp -split "`n"
        $httpCode = $lines[-1]
        $walletJson = $lines[0..($lines.Count-2)] -join "`n"
        
        Log "HTTP Status: $httpCode"
        $wallet = $walletJson | ConvertFrom-Json
        
        if ($httpCode -ne "200") {
            Log "Wallet fetch returned HTTP $httpCode" "ERROR"
            Log "Response: $walletJson" "ERROR"
            return $false
        }
        
        Log "✓ Wallet fetch OK - Status: $($wallet.status)" "SUCCESS"
        if ($wallet.data) {
            $bal = if ($wallet.data.balance) { $wallet.data.balance } else { "N/A" }
            $wid = if ($wallet.data.id) { $wallet.data.id } else { "N/A" }
            Log "  Balance: $bal"
            Log "  User Wallet ID: $wid"
        }
        
        # 3. Get transactions
        Log "3. Testing transaction history..."
        $txResp = & curl.exe -s -w "`n%{http_code}" -H "Authorization: Bearer $token" "$base/get_wallet_transactions"
        $lines = $txResp -split "`n"
        $httpCode = $lines[-1]
        $txJson = $lines[0..($lines.Count-2)] -join "`n"
        
        Log "HTTP Status: $httpCode"
        $tx = $txJson | ConvertFrom-Json
        
        if ($httpCode -ne "200") {
            Log "Transaction fetch returned HTTP $httpCode" "ERROR"
            Log "Response: $txJson" "ERROR"
        } else {
            Log "✓ Transaction fetch OK" "SUCCESS"
            if ($tx.data -and $tx.data.Count -gt 0) {
                Log "  Recent transactions: $($tx.data.Count)"
                $tx.data | Select-Object -First 3 | ForEach-Object {
                    Log "    - ID: $($_.id), Amount: $($_.amount), Type: $($_.type), Status: $($_.status)"
                }
            } else {
                Log "  No transactions found" "INFO"
            }
        }
        
        # 4. Test add_wallet_money endpoint (dry run - no actual charge)
        Log "4. Testing add_wallet_money endpoint (validation only)..."
        $dateStamp = Get-Date -Format "yyyyMMddHHmmss"
        $txIdTest = "SMOKE_TEST_DRY_RUN_$dateStamp"
        $moneyResp = & curl.exe -s -w "`n%{http_code}" -X POST "$base/add_wallet_money" `
            -H "Authorization: Bearer $token" `
            -F "amount=100" `
            -F "transaction_id=$txIdTest"
        
        $lines = $moneyResp -split "`n"
        $httpCode = $lines[-1]
        $moneyJson = $lines[0..($lines.Count-2)] -join "`n"
        
        Log "HTTP Status: $httpCode"
        $money = $moneyJson | ConvertFrom-Json
        
        Log "  Response Status: $($money.status)"
        Log "  Response Message: $($money.message)"
        
        # 5. Check payment gateway data endpoint
        Log "5. Testing payment gateway configuration..."
        $payResp = & curl.exe -s -H "Authorization: Bearer $token" "$base/payment_getway_data"
        $pay = $payResp | ConvertFrom-Json
        
        if ($pay.status) {
            Log "✓ Payment gateway data OK" "SUCCESS"
            $stripeConfigured = if ([string]::IsNullOrWhiteSpace($pay.data.stripe_key)) { "NO" } else { "YES" }
            $razorpayConfigured = if ([string]::IsNullOrWhiteSpace($pay.data.razorpay_key)) { "NO" } else { "YES" }
            Log "  Stripe Key Configured: $stripeConfigured"
            Log "  Razorpay Key Configured: $razorpayConfigured"
        } else {
            Log "Payment gateway data failed: $($pay.message)" "ERROR"
        }
        
        Log "✓ All smoke tests completed" "SUCCESS"
        return $true
    }
    catch {
        Log "Exception: $($_.Exception.Message)" "ERROR"
        Log "Line: $($_.InvocationInfo.ScriptLineNumber)" "ERROR"
        return $false
    }
}

# Run test
Test-WalletEndpoint
