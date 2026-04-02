# How to SSH into Vultr Server from PowerShell

## Prerequisite: Get Your Server IP

1. Log into **Vultr Dashboard** (vultr.com)
2. Go to **Products** → **Compute**
3. Click your server instance
4. Copy the **IPv4 address** (e.g., `203.xxx.xxx.xxx`)

## Step 1: Open PowerShell

On your Windows machine:
- Press `Win + X`, then select **PowerShell** or **Windows Terminal**
- Or search for **PowerShell** and open it

## Step 2: Connect via SSH

Run this command in PowerShell:

```powershell
ssh root@YOUR_SERVER_IP
```

**Example:**
```powershell
ssh root@203.xxx.xxx.xxx
```

### First Time Connection Only

On first connection, you'll see:
```
The authenticity of host '203.xxx.xxx.xxx' can't be established.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Type `yes` and press Enter.

## Step 3: Enter Your Password

You'll be prompted:
```
root@203.xxx.xxx.xxx's password:
```

Enter your Vultr server root password (characters won't display as you type - this is normal).

If successful, you'll see:
```
Last login: ...
root@vultr:~#
```

---

## Step 4: Now You're Connected - Disable Razorpay

### Option A: Direct PostgreSQL Command
```bash
export PGPASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk"
psql -h "vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com" -p 16751 -U vultradmin -d defaultdb -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"
```

### Option B: Laravel Tinker (Recommended)
```bash
cd /opt/gentrx-api
php artisan tinker
```

Then in the tinker shell:
```
DB::table('payment_gateway')->where('title', 'Razorpay')->update(['is_active' => false])
exit
```

---

## Step 5: Verify Success

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

## Finding Your Database Password

Run this on your server:
```bash
cat /opt/gentrx-api/.env | grep DB_PASSWORD
```

This will show:
```
DB_PASSWORD=your_actual_password_here
```

---

## Common Issues

### "ssh is not recognized"
Windows 10+ has SSH built-in. If it doesn't work:
- Use **Windows Terminal** instead of PowerShell
- Or install OpenSSH: https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_configure

### "Permission denied"
- Wrong password
- Wrong username (try `ssh ubuntu@ip` if not root)

### "Connection timed out"
- Server IP is wrong
- Firewall is blocking SSH port 22
- Server is offline

---

## Exit SSH Connection

```bash
exit
```

Or press `Ctrl + D`

