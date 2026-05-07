#!/usr/bin/env bash
set -e

echo "=== Fixing nginx gzip settings ==="
# Uncomment gzip directives in nginx.conf http block
sed -i 's|# *gzip_vary on;|    gzip_vary on;|' /etc/nginx/nginx.conf
sed -i 's|# *gzip_proxied any;|    gzip_proxied any;|' /etc/nginx/nginx.conf
sed -i 's|# *gzip_comp_level 6;|    gzip_comp_level 6;|' /etc/nginx/nginx.conf
sed -i 's|# *gzip_buffers 16 8k;|    gzip_buffers 16 8k;|' /etc/nginx/nginx.conf
sed -i 's|# *gzip_http_version 1.1;|    gzip_http_version 1.1;|' /etc/nginx/nginx.conf
sed -i 's|# *gzip_types.*|    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;|' /etc/nginx/nginx.conf

echo "=== Patching site config with direct asset serving ==="
SITE=/etc/nginx/sites-available/gentrx.ph
cp "$SITE" "$SITE.bak"

python3 - <<'PYEOF'
cfg = open('/etc/nginx/sites-available/gentrx.ph').read()

if 'location ^~ /assets/' in cfg:
    print("Assets block already present, skipping.")
else:
    assets_block = '''    # Serve hashed assets directly - bypass PM2, immutable cache
    location ^~ /assets/ {
        root /var/www/gentrx-user-web/dist;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
    }

    # Named proxy fallback for public files
    location @proxy {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

'''
    cfg = cfg.replace('    location / {', assets_block + '    location / {')
    open('/etc/nginx/sites-available/gentrx.ph', 'w').write(cfg)
    print("Assets block injected.")
PYEOF

echo "=== Testing nginx config ==="
nginx -t

echo "=== Reloading nginx ==="
nginx -s reload

echo "=== Verifying Cache-Control on an asset ==="
ASSET=$(ls /var/www/gentrx-user-web/dist/assets/*.js 2>/dev/null | head -1 | xargs basename)
if [ -n "$ASSET" ]; then
    curl -sI "https://gentrx.ph/assets/$ASSET" | grep -i "cache-control\|content-encoding\|content-type"
fi

echo "DONE"
