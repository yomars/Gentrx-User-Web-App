# Gentrx Dev Replica Deployment - Final Report
## VPS: 121.127.11.237

---

## ✅ DEPLOYMENT COMPLETE

### URL Mapping
- **User App:** `http://121.127.11.237/` (root path)
- **Admin App:** `http://121.127.11.237/admin` → `http://121.127.11.237/admin/` (SPA)

---

## 📁 Deployed Paths

### Web Roots
| App | Path | Size | Files |
|-----|------|------|-------|
| User App (Gentrx-User-Web-App) | `/var/www/gentrx-user/dist` | 95M | 178 |
| Admin App (Gentrx-Admin-Web-App-Vultr) | `/var/www/gentrx-admin/dist` | 9.9M | 181 |

### Source Repositories
| App | Path | Status |
|-----|------|--------|
| User App Source | `/var/www/Gentrx-User-Web-App` | ✅ Cloned, built |
| Admin App Source | `/var/www/Gentrx-Admin-Web-App-Vultr` | ✅ Pre-existing, rebuilt |

### Nginx Configuration
| File | Status | Notes |
|------|--------|-------|
| `/etc/nginx/sites-available/gentrx-dev-unified.conf` | ✅ Active | Unified vhost for both apps |
| `/etc/nginx/sites-available/gentrx-dev-unified.conf.bak.*` | ✅ Backup | Old config backed up |
| `/etc/nginx/sites-enabled/gentrx-dev-unified.conf` | ✅ Symlink | Enabled in Nginx |

---

## 🧪 Validation Results

### HTTP Status Tests
```
GET  http://121.127.11.237/           → HTTP 200 ✅
GET  http://121.127.11.237/admin      → HTTP 301 ✅ (redirects to /admin/)
GET  http://121.127.11.237/admin/     → HTTP 200 ✅
GET  http://121.127.11.237/assets/index-C-NutG4q.js          → HTTP 200 ✅
GET  http://121.127.11.237/admin/assets/index-BQE6yPrF.js    → HTTP 200 ✅
GET  http://121.127.11.237/assets/vendor-react-core-*.js     → HTTP 200 ✅
```

### SPA Routing
- ✅ User app SPA fallback working (try_files $uri $uri/ /index.html)
- ✅ Admin app SPA fallback working (try_files $uri $uri/ /index.html)
- ✅ Static assets served with 1-year cache headers
- ✅ Hidden files (/.git, /.*) denied

### Build Information
| App | Build Time | Node Heap | Status |
|-----|------------|-----------|--------|
| User App | 2m 45s | Default | ✅ Success |
| Admin App | 1m 17s | 4GB (--max-old-space-size=4096) | ✅ Success |

---

## 🔧 Nginx Configuration Details

### Server Block Structure
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 121.127.11.237;
    root /var/www/gentrx-user/dist;

    # Location blocks (in priority order):
    # 1. / → user app at root with SPA fallback
    # 2. = /admin → redirect to /admin/
    # 3. ^~ /admin/ → admin app with SPA fallback
    # 4. /api → Laravel backend proxy (preserved)
    # 5. Static assets → 1-year cache
    # 6. Hidden files → deny all
}
```

### Key Features
- **HTTP Only**: No SSL (as requested)
- **SPA Routing**: Both apps use `try_files $uri $uri/ /index.html`
- **Asset Caching**: 1 year expiration for JS/CSS/images
- **API Passthrough**: `/api` still proxies to `api-gentrx-dev` (backend intact)
- **Security**: `.git` and hidden files denied
- **IPv6**: Both IPv4 and IPv6 listeners enabled

---

## 🔄 Build Summary

### Gentrx-User-Web-App
- **Repository**: https://github.com/yomars/Gentrx-User-Web-App.git
- **Built**: May 9, 2026 19:41 UTC
- **Build Time**: 2 minutes 45 seconds
- **Output**: `/var/www/gentrx-user/dist` (95M, 178 files)
- **Build Metadata**: `dist/version.json`, `dist/version-live.json`

### Gentrx-Admin-Web-App-Vultr
- **Repository**: Local at `/var/www/Gentrx-Admin-Web-App-Vultr`
- **Built**: May 9, 2026 19:42 UTC (with NODE_OPTIONS=--max-old-space-size=4096)
- **Build Time**: 1 minute 17 seconds
- **Output**: `/var/www/gentrx-admin/dist` (9.9M, 181 files)

---

## 🔙 Rollback Instructions

### Option 1: Restore Previous Nginx Config
If you need to revert to the old unified config:
```bash
# On VPS (121.127.11.237):
ssh root@121.127.11.237

# List available backups
ls -la /etc/nginx/sites-available/gentrx-dev-unified.conf.bak.*

# Restore old config (use latest timestamp)
cp /etc/nginx/sites-available/gentrx-dev-unified.conf.bak.TIMESTAMP \
   /etc/nginx/sites-available/gentrx-dev-unified.conf

# Validate and reload
nginx -t && systemctl reload nginx
```

### Option 2: Restore from Git
If you want to rebuild from source with the old admin repo version:
```bash
# Rebuild admin app from current repo
cd /var/www/Gentrx-Admin-Web-App-Vultr
git status  # Check current branch/state
npm install
NODE_OPTIONS=--max-old-space-size=4096 npm run build
rm -rf /var/www/gentrx-admin/dist
cp -r /var/www/Gentrx-Admin-Web-App-Vultr/dist /var/www/gentrx-admin/dist

# Restart Nginx (config unchanged)
systemctl reload nginx
```

### Option 3: Full Rollback to Previous State
If the entire deployment needs reversal:
```bash
# Restore admin dist from backup
rm -rf /var/www/gentrx-admin/dist
cp -r /var/www/gentrx-admin/dist.bak /var/www/gentrx-admin/dist

# Restore Nginx config (see Option 1)
cp /etc/nginx/sites-available/gentrx-dev-unified.conf.bak.TIMESTAMP \
   /etc/nginx/sites-available/gentrx-dev-unified.conf

# Validate and reload
nginx -t && systemctl reload nginx

# Verify
curl -s http://121.127.11.237/admin/ | head -5
```

---

## 📊 Space Usage Summary

### Before Deployment
- `/var/www/gentrx-patient/` (old user app root): ~2.8M images
- `/var/www/gentrx-admin/dist` (old admin dist): ~2.8M

### After Deployment
- `/var/www/gentrx-user/dist`: 95M
- `/var/www/gentrx-admin/dist`: 9.9M
- Backups:
  - `/var/www/gentrx-admin/dist.bak`: 2.8M
  - Nginx backups: negligible (~1KB each)

### Total Additional Space Used
Approximately **105M** (main deployments) + **3M** (backups) = **~108M**

---

## 🐛 Troubleshooting

### If Admin App Doesn't Load at /admin/
1. Verify dist exists: `ls -la /var/www/gentrx-admin/dist/index.html`
2. Check Nginx syntax: `nginx -t`
3. Reload Nginx: `systemctl reload nginx`
4. Test: `curl http://121.127.11.237/admin/`

### If Assets Return 404
1. Check file exists: `ls /var/www/gentrx-user/dist/assets/` 
2. Check permissions: `ls -la /var/www/gentrx-user/dist/` (should be readable by www-data)
3. Check Nginx logs: `tail -20 /var/log/nginx/error.log`
4. Verify asset cache rules in config

### If /api Requests Fail
1. Verify backend is running on `127.0.0.1` 
2. Check if port is correct (currently no port specified = default 80)
3. Review: `/etc/nginx/sites-available/gentrx-dev-unified.conf` line ~31
4. Nginx logs: `tail -20 /var/log/nginx/error.log`

### If SPA Routes Don't Work
1. Verify `try_files $uri $uri/ /index.html` is in both location blocks
2. Ensure `index index.html` is set
3. Reload Nginx: `systemctl reload nginx`
4. Test with curl: `curl http://121.127.11.237/any-random-path`

---

## 📋 Files Changed/Created

### Nginx Configuration Files
- **Created**: `/etc/nginx/sites-available/gentrx-dev-unified-new.conf` (temp staging)
- **Modified**: `/etc/nginx/sites-available/gentrx-dev-unified.conf` (active vhost)
- **Backed Up**: `/etc/nginx/sites-available/gentrx-dev-unified.conf.bak.TIMESTAMP` (previous config)

### Directory Structure
```
/var/www/
├── Gentrx-User-Web-App/          (cloned source)
│   ├── dist/                      (built output, 95M)
│   └── package.json
├── Gentrx-Admin-Web-App-Vultr/    (existing source)
│   ├── dist/                      (rebuilt output, 9.9M)
│   └── package.json
├── gentrx-user/
│   └── dist/                      (deployed, symlink to build)
├── gentrx-admin/
│   ├── dist/                      (deployed, symlink to build)
│   └── dist.bak/                  (old backup, 2.8M)
└── gentrx-patient/                (old user root, unused but preserved)
```

---

## ✅ Pre-Flight Checks for Production Use

Before using this for real traffic, verify:

- [ ] Both apps load completely in a browser
- [ ] User app form submissions work
- [ ] Admin app can navigate without 404s
- [ ] Static images load correctly
- [ ] API calls to backend are functional
- [ ] Session cookies are preserved across app transitions
- [ ] Mobile responsiveness is intact
- [ ] No CORS errors in browser console
- [ ] Nginx error log is clean: `tail /var/log/nginx/error.log`
- [ ] Access log shows 200s (not 404s): `tail /var/log/nginx/access.log`

---

## 📞 Support Commands

### Quick Status Check
```bash
# SSH to VPS
ssh root@121.127.11.237

# Check Nginx status
systemctl status nginx

# View recent errors
tail -20 /var/log/nginx/error.log

# View recent access
tail -20 /var/log/nginx/access.log

# Test endpoints
curl -I http://121.127.11.237/
curl -I http://121.127.11.237/admin/
curl -I http://121.127.11.237/assets/index-*.js
```

### Rebuild Without Redeploy
```bash
# If you only need to rebuild admin app:
cd /var/www/Gentrx-Admin-Web-App-Vultr
git pull origin main  # if needed
npm install
NODE_OPTIONS=--max-old-space-size=4096 npm run build
cp -r dist /var/www/gentrx-admin/dist.new
rm -rf /var/www/gentrx-admin/dist
mv /var/www/gentrx-admin/dist.new /var/www/gentrx-admin/dist
# No Nginx reload needed for dist changes
```

---

## 📝 Final Checklist

- [x] User app cloned and built
- [x] Admin app built with proper heap size
- [x] Both dists deployed to `/var/www/gentrx-{user,admin}/dist`
- [x] Nginx config unified and deployed
- [x] Old config backed up with timestamp
- [x] Nginx syntax validated
- [x] Nginx reloaded
- [x] Root endpoint (/) tested → HTTP 200
- [x] Admin endpoint (/admin/) tested → HTTP 200
- [x] Asset loading tested → HTTP 200
- [x] SPA fallback verified
- [x] Rollback procedures documented
- [x] No breaking changes to `/api` proxy
- [x] HTTP-only (no SSL)

---

**Deployment Date**: May 9, 2026 19:45 UTC  
**Deployed By**: Copilot  
**Status**: ✅ READY FOR TESTING
