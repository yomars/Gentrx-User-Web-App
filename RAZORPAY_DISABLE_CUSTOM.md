# Razorpay Disable - Your Customized Command

## Your VultrDB Credentials
- **Host**: vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com
- **Port**: 16751
- **Database**: defaultdb
- **Username**: vultradmin
- **Password**: AVNS_mw0W8AXQ0as8lcq4CXk

---

## Quick Command to Run on Your Vultr Server

### Via SSH (from PowerShell):
```powershell
ssh root@YOUR_VULTR_SERVER_IP
```

### Then run this command on the server:
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk"
psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"
```

---

## Verify the Change

```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk"
psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "SELECT title, is_active FROM payment_gateway WHERE title = 'Razorpay';"
```

Expected output:
```
 title    | is_active 
----------+-----------
 Razorpay | f
```

---

## Copy-Paste Ready Commands

**Disable Razorpay:**
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk" && psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';" && echo "✓ Success"
```

**Verify:**
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk" && psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "SELECT title, is_active FROM payment_gateway WHERE title = 'Razorpay';"
```

---

## Next Steps

1. SSH into your Vultr server
2. Copy and paste the disable command above
3. Run the verify command to confirm
4. Wallet add-money should now work without Razorpay

