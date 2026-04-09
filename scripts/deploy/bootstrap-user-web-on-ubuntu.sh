#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-/var/www/gentrx-user-web-app}"
SITE_NAME="gentrx-user"
NGINX_SOURCE="$REPO_DIR/scripts/deploy/gentrx-user-web.nginx.conf"
NGINX_TARGET="/etc/nginx/sites-available/${SITE_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}.conf"

if [[ ! -f "$REPO_DIR/package.json" ]]; then
  echo "Error: package.json not found in $REPO_DIR"
  echo "Usage: sudo bash scripts/deploy/bootstrap-user-web-on-ubuntu.sh /var/www/gentrx-user-web-app"
  exit 1
fi

if [[ ! -f "$NGINX_SOURCE" ]]; then
  echo "Error: Nginx config not found at $NGINX_SOURCE"
  exit 1
fi

echo "==> Installing system packages"
apt update
apt install -y nginx curl

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo "==> Installing global Node tools"
npm install -g pm2 serve

echo "==> Building user web app"
cd "$REPO_DIR"
npm ci
npm run build

echo "==> Starting user web app on port 3000"
pm2 delete gentrx-main >/dev/null 2>&1 || true
pm2 delete ecosystem.user-web >/dev/null 2>&1 || true
pm2 start serve --name gentrx-main --cwd "$REPO_DIR" -- -s dist -l 3000
pm2 save

echo "==> Installing Nginx site config"
cp "$NGINX_SOURCE" "$NGINX_TARGET"
ln -sfn "$NGINX_TARGET" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

echo "==> Validating Nginx configuration"
nginx -t
systemctl reload nginx

echo "==> Done"
echo "Local app check: curl -I http://127.0.0.1:3000/"
echo "Public check:   curl -I https://www.gentrx.ph/"
