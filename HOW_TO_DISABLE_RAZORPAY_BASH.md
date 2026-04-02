# How to Disable Razorpay on VultrDB - Bash/SSH Method

## Quick Start (3 Steps)

### Step 1: SSH into Your Vultr Server
```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

### Step 2: Navigate to Project Directory
```bash
cd /path/to/gentrx-api
# or wherever your backend Laravel app is installed
```

### Step 3: Run the Bash Script
```bash
bash disable_razorpay.sh -h "your-db.vultrdb.com" -d "your_database" -u "postgres" -p "your_password"
```

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

**Command to run (via SSH):**
```bash
bash disable_razorpay.sh -h "db-abc123.vultrdb.com" -d "gentrx_production" -u "postgres" -p "MySecurePasswordHere123"
```

Or with custom port:
```bash
bash disable_razorpay.sh -h "db-abc123.vultrdb.com" -P 5432 -d "gentrx_production" -u "postgres" -p "MySecurePasswordHere123"
```

---

## Expected Output

When successful, you'll see:
```
=== PostgreSQL Razorpay Disable Script ===
Connecting to: db-abc123.vultrdb.com:5432 / gentrx_production

[ACTION] Disabling Razorpay...
UPDATE 1

[VERIFY] Current Razorpay status:
 id | title    | is_active | updated_at
----+----------+-----------+---------------------
  1 | Razorpay | f         | 2026-04-02 12:34:56
(1 row)

[SUCCESS] Razorpay has been disabled
```

---

## Alternative: Direct SQL via psql

If you prefer running the command directly:

```bash
export PGPASSWORD="your_password"
psql -h "db-abc123.vultrdb.com" -p 5432 -U postgres -d gentrx_production -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"
```

---

## Alternative: Laravel Tinker (On Your Server)

```bash
php artisan tinker
DB::table('payment_gateway')->where('title', 'Razorpay')->update(['is_active' => false])
```

---

## Find Your VultrDB Credentials

1. SSH into your Vultr server
2. Check environment file:
   ```bash
   cat .env | grep DB_
   # or
   cat /opt/gentrx-api/.env | grep DB_
   ```

3. Look for these lines:
   ```
   DB_HOST=db-abc123.vultrdb.com
   DB_PORT=5432
   DB_DATABASE=gentrx_production
   DB_USERNAME=postgres
   DB_PASSWORD=MySecurePasswordHere123
   ```

---

## Troubleshooting

### "psql: command not found"
PostgreSQL client not installed. Install it:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

### "FATAL: password authentication failed"
- Check password is correct
- Verify username matches

### "could not translate host name"
- Verify VultrDB host is correct
- Check network connectivity to VultrDB from server

### "No rows updated"
- Razorpay entry doesn't exist in payment_gateway table
- Check what gateways exist:
  ```bash
  export PGPASSWORD="your_password"
  psql -h "your-host" -U postgres -d your_db -c "SELECT * FROM payment_gateway;"
  ```

---

## Verify After Execution

Check Razorpay status:
```bash
export PGPASSWORD="your_password"
psql -h "db-abc123.vultrdb.com" -U postgres -d gentrx_production -c "SELECT title, is_active FROM payment_gateway WHERE title = 'Razorpay';"
```

Expected result: `is_active = f` (false)

