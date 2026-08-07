set -eu
artifact=/tmp/gentrx-user-web-dist-20260808-023502.tar.gz
deploy_dir=/var/www/gentrx-user-web-app
mkdir -p "$deploy_dir"
tar -xzf "$artifact" -C "$deploy_dir"
if ! command -v pm2 >/dev/null 2>&1; then npm install -g pm2 serve; fi
serve_bin=$(command -v serve)
if [ -z "$serve_bin" ]; then
  npm install -g serve
  serve_bin=$(command -v serve)
fi
pm2 delete gentrx-main >/dev/null 2>&1 || true
pm2 delete ecosystem.user-web >/dev/null 2>&1 || true
pm2 delete gentrx-user-web >/dev/null 2>&1 || true
pm2 start "$serve_bin" --name gentrx-main --interpreter none -- -s dist -l 3000
pm2 save
nginx -t
systemctl reload nginx
curl -fsS -H "Host: gentrx.ph" http://127.0.0.1/ >/dev/null
curl -fsS https://gentrx.ph/ >/dev/null
echo OK
