# How to Disable Razorpay on VultrDB - Step-by-Step Guide

## Quick Start (3 Steps)

### Step 1: Gather VultrDB Connection Details
Log into your Vultr dashboard and locate your PostgreSQL database instance:
- **Host**: The database hostname (ends with `.vultrdb.com`)
- **Port**: Usually `5432`
- **Database**: Your database name (e.g., `gentrx_db`)
- **Username**: Database user (default: `postgres`)
- **Password**: Your database password

### Step 2: Open PowerShell Terminal
```powershell
cd C:\PHP\Workspace\Gentrx-User-Web-App
```

### Step 3: Execute the Script
```powershell
.\disable_razorpay.ps1 -Host "YOUR_HOST" -Port 5432 -Database "YOUR_DB" -User "YOUR_USER" -Password "YOUR_PASSWORD"
```

Replace the placeholders with your actual credentials.

---

## Detailed Example

**Your VultrDB Details (example):**
```
Host: db-abc123.vultrdb.com
Port: 5432
Database: gentrx_production
Username: postgres
Password: MySecurePasswordHere123
```

**Command to run:**
```powershell
.\disable_razorpay.ps1 -Host "db-abc123.vultrdb.com" -Port 5432 -Database "gentrx_production" -User "postgres" -Password "MySecurePasswordHere123"
```

---

## Expected Output

When successful, you'll see:
```
=== PostgreSQL Razorpay Disable Script ===
Connecting to: db-abc123.vultrdb.com:5432 / gentrx_production
[INFO] Using psql client
[ACTION] Disabling Razorpay...
UPDATE 1
[SUCCESS] Razorpay has been disabled
```

Or with .NET Npgsql fallback:
```
[ACTION] Disabling Razorpay...
[SUCCESS] Updated 1 row(s). Razorpay disabled.
  ID: 1, Title: Razorpay, Active: f, Updated: 2026-04-02 12:34:56
```

---

## Troubleshooting

### "psql not found" Warning
- If you see this but script continues, Npgsql is handling the connection (normal)
- Connection will still succeed if .NET Npgsql is available

### Connection Failed
- Verify host/port are correct
- Check username and password
- Ensure you can access VultrDB from your network (firewall rules)

### "No rows updated"
- Razorpay entry may not exist in payment_gateway table
- Check current payment gateways first

---

## Verify After Execution

To double-check Razorpay is disabled, run in your Laravel backend:
```bash
php artisan tinker
DB::table('payment_gateway')->where('title', 'Razorpay')->first();
```

Look for: `"is_active" => false` (or `0`)

---

## To Re-enable Razorpay Later

Run this SQL or PowerShell script with modified command:
```sql
UPDATE payment_gateway SET is_active = TRUE WHERE title = 'Razorpay';
```

---

## Need Help Finding Your Credentials?

1. Log into **Vultr Dashboard**
2. Navigate to **Databases** → Select your PostgreSQL instance
3. Look for **Connection Details** or **Connection String**
4. Extract: `Host`, `Port`, `Database`, `Username`
5. Use your database password (set during creation)

