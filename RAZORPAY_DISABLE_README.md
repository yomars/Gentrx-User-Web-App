# Razorpay Disable - Implementation Status

## Objective
Disable Razorpay payment gateway on VultrDB PostgreSQL instance to allow wallet add-money functionality to proceed.

## Implementation Files Created

### 1. disable_razorpay.ps1
- PowerShell script for automated PostgreSQL execution
- Supports both `psql` client and .NET Npgsql approaches
- Usage: `.\disable_razorpay.ps1 -Host "your-db.vultrdb.com" -Port 5432 -Database "your_db" -User "user" -Password "pass"`
- Location: `c:\PHP\Workspace\Gentrx-User-Web-App\disable_razorpay.ps1`

### 2. disable_razorpay.sql
- PostgreSQL-compatible SQL script
- Contains disable and verification queries
- Can be run in VultrDB dashboard or via psql
- Location: `c:\PHP\Workspace\Gentrx-User-Web-App\disable_razorpay.sql`

## PostgreSQL Command (for VultrDB)

```sql
UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';
SELECT id, title, is_active, updated_at FROM payment_gateway WHERE title = 'Razorpay';
```

## Next Steps

Execute one of the following:

1. **Via VultrDB Dashboard** (Easiest)
   - Log into your VultrDB management console
   - Open SQL editor/query tool
   - Copy and execute the SQL commands above

2. **Via psql command line** (if available on your server)
   ```bash
   psql -h your-db.vultrdb.com -p 5432 -U postgres_user -d your_database -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"
   ```

3. **Via PowerShell** (from this workspace)
   ```powershell
   .\disable_razorpay.ps1 -Host "your-db.vultrdb.com" -Port 5432 -Database "your_db" -User "your_user" -Password "your_password"
   ```

## Expected Outcome

After execution:
- `payment_gateway.is_active` for Razorpay = `FALSE` (0 in some systems)
- Frontend will no longer offer Razorpay as a payment option
- Wallet add-money flow can proceed with alternative payment methods

## To Re-enable Razorpay Later

```sql
UPDATE payment_gateway SET is_active = TRUE WHERE title = 'Razorpay';
```

---
**Status**: Ready for execution. Awaiting user to run one of the above methods.
