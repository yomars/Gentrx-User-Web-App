# PostgreSQL Razorpay Disable Script for VultrDB
# Usage: .\disable_razorpay.ps1 -Host "your-db.vultrdb.com" -Port 5432 -Database "your_db" -User "your_user" -Password "your_password"

param(
    [Parameter(Mandatory=$true)]
    [string]$Host,
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 5432,
    
    [Parameter(Mandatory=$true)]
    [string]$Database,
    
    [Parameter(Mandatory=$true)]
    [string]$User,
    
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$ErrorActionPreference = 'Stop'

Write-Host "=== PostgreSQL Razorpay Disable Script ===" -ForegroundColor Cyan
Write-Host "Connecting to: $Host`:$Port / $Database" -ForegroundColor Yellow

# Build connection string
$ConnectionString = "Host=$Host;Port=$Port;Database=$Database;Username=$User;Password=$Password;SSL Mode=Require;"

# Check if psql is available
$psqlExists = $null -ne (Get-Command psql -ErrorAction SilentlyContinue)

if ($psqlExists) {
    Write-Host "[INFO] Using psql client" -ForegroundColor Green
    
    # Set environment variable for password
    $env:PGPASSWORD = $Password
    
    # Disable Razorpay
    Write-Host "[ACTION] Disabling Razorpay..." -ForegroundColor Cyan
    $disableQuery = "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay'; SELECT id, title, is_active, updated_at FROM payment_gateway WHERE title = 'Razorpay';"
    
    psql -h $Host -p $Port -U $User -d $Database -c $disableQuery
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Razorpay has been disabled" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to disable Razorpay" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[WARNING] psql not found. Using .NET PostgreSQL approach..." -ForegroundColor Yellow
    
    # Try using Npgsql (requires installation)
    try {
        $NpgsqlPath = "C:\Program Files\PackageManagement\NuGet\Packages\Npgsql\*\lib\net6.0\Npgsql.dll"
        $DllPath = Get-Item $NpgsqlPath -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
        
        if (-not $DllPath) {
            Write-Host "[ERROR] psql not found and Npgsql not installed. Please install PostgreSQL client tools." -ForegroundColor Red
            Write-Host "" -ForegroundColor Gray
            Write-Host "Alternative: Run this SQL directly in your VultrDB dashboard:" -ForegroundColor Yellow
            Write-Host "  UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';" -ForegroundColor Cyan
            exit 1
        }
        
        [Reflection.Assembly]::LoadFrom($DllPath) | Out-Null
        
        $conn = New-Object Npgsql.NpgsqlConnection($ConnectionString)
        $conn.Open()
        
        Write-Host "[ACTION] Disabling Razorpay..." -ForegroundColor Cyan
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay'"
        $rowsAffected = $cmd.ExecuteNonQuery()
        
        if ($rowsAffected -gt 0) {
            Write-Host "[SUCCESS] Updated $rowsAffected row(s). Razorpay disabled." -ForegroundColor Green
        } else {
            Write-Host "[WARNING] No rows updated. Check if Razorpay exists in payment_gateway table." -ForegroundColor Yellow
        }
        
        # Verify
        $cmd.CommandText = "SELECT id, title, is_active, updated_at FROM payment_gateway WHERE title = 'Razorpay'"
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            Write-Host "  ID: $($reader[0]), Title: $($reader[1]), Active: $($reader[2]), Updated: $($reader[3])" -ForegroundColor Green
        }
        $reader.Close()
        
        $conn.Close()
    } catch {
        Write-Host "[ERROR] $_" -ForegroundColor Red
        Write-Host "" -ForegroundColor Gray
        Write-Host "Please run this SQL directly in your VultrDB dashboard:" -ForegroundColor Yellow
        Write-Host "  UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';" -ForegroundColor Cyan
        exit 1
    }
}
