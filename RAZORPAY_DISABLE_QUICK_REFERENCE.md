# Razorpay Disable - Quick Command Reference

## Step 1: SSH into Vultr Server
```powershell
# From your Windows PowerShell:
ssh root@your-vultr-server-ip
```

## Step 2: Run ONE of these commands on the server:

### Option A: Direct PostgreSQL Command (FASTEST) - YOUR CREDENTIALS
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk"
psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"
```

### Option B: One-liner (copy-paste ready)
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk" && psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"
```

## Where to Get Your Credentials

On your Vultr server, check:
```bash
cat /opt/gentrx-api/.env | grep DB_
```

Look for:
- `DB_HOST=` → your-db.vultrdb.com
- `DB_DATABASE=` → database name
- `DB_USERNAME=` → usually postgres
- `DB_PASSWORD=` → your password

## Verify Success

After running the command, verify:
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk"
psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "SELECT title, is_active FROM payment_gateway WHERE title = 'Razorpay';"
```

Expected output: `is_active = f` (false)

