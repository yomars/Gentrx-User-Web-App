# GentRx User Web App

This project is a Vite + React frontend that builds into a portable `dist` bundle.
It can be deployed without Vercel using PM2 + Nginx (same deployment style used in the Vultr-oriented admin repo).

## Local development

1. Install dependencies:

	npm ci

2. Run development server:

	npm run dev

3. Build production bundle:

	npm run build

4. Preview local production build:

	npm run preview

## Build output

- Static app output: `dist/`
- Build metadata files generated after build:
  - `dist/version.json`
  - `dist/version-live.json`

## Non-Vercel deployment (Vultr/Ubuntu)

### 1) Build and package on your local machine

1. Build:

	npm ci
	npm run build

2. Create deployment tarball:

	npm run package:dist

Windows-only alternative:

	npm run package:dist:ps1

This creates a timestamped bundle in `artifacts/` containing:
- `dist/`
- `scripts/deploy/ecosystem.user-web.cjs`
- `scripts/deploy/gentrx-user-web.nginx.conf`

### 2) Upload to server

Example:

scp artifacts/gentrx-user-web-dist-<timestamp>.tar.gz root@api.gentrx.ph:/tmp/

### 3) Extract and run on server

1. Install runtime tools once:

	npm install -g pm2 serve

2. Extract bundle and start app:

	mkdir -p /var/www/gentrx-user-web
	cd /var/www/gentrx-user-web
	tar -xzf /tmp/gentrx-user-web-dist-<timestamp>.tar.gz

	pm2 describe gentrx-user-web >/dev/null 2>&1 || pm2 start scripts/deploy/ecosystem.user-web.cjs
	pm2 restart gentrx-user-web
	pm2 save

3. Install Nginx site config:

	cp scripts/deploy/gentrx-user-web.nginx.conf /etc/nginx/sites-available/gentrx-user-web.conf
	ln -sfn /etc/nginx/sites-available/gentrx-user-web.conf /etc/nginx/sites-enabled/gentrx-user-web.conf
	nginx -t
	systemctl reload nginx

### 4) Verify deployment

- `curl -I http://127.0.0.1:4000/`
- `curl -I https://www.gentrx.ph/`
- `curl https://www.gentrx.ph/version-live.json`

### 5) One-command Ubuntu bootstrap

On a fresh Ubuntu/Vultr server, run:

	sudo bash scripts/deploy/bootstrap-user-web-on-ubuntu.sh /var/www/gentrx-user-web

This installs Node + PM2 + Nginx, builds the app, starts PM2 process `gentrx-user-web`, and wires the Nginx site.

## CI artifact build

GitHub Actions workflow [Build Dist Artifact](.github/workflows/dist-artifact.yml) now builds and uploads:
- Deployable tarball: `artifacts/gentrx-user-web-dist-*.tar.gz`
- Metadata files: `dist/version.json`, `dist/version-live.json`

Trigger via:
- push to `main`
- manual `workflow_dispatch`

## Optional Vercel support

Vercel deployment is optional. The app now has a first-class portable build/deploy path that does not require Vercel.
