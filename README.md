# GentRx User Web App

This project is a Vite + React frontend that builds into a portable `dist` bundle.
It deploys directly to the production Vultr server using PM2 + Nginx.

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

## Deployment (Vultr/Ubuntu)

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

	mkdir -p /var/www/gentrx-user-web-app
	cd /var/www/gentrx-user-web-app
	tar -xzf /tmp/gentrx-user-web-dist-<timestamp>.tar.gz

	pm2 describe gentrx-main >/dev/null 2>&1 || pm2 start serve --name gentrx-main --cwd /var/www/gentrx-user-web-app -- -s dist -l 3000
	pm2 restart gentrx-main
	pm2 save

3. Keep existing production Nginx site (`gentrx-user`) and only validate/reload:

	nginx -t
	systemctl reload nginx

### 4) Verify deployment

- `curl -I http://127.0.0.1:3000/`
- `curl -I https://www.gentrx.ph/`
- `curl https://www.gentrx.ph/version-live.json`

### 5) One-command Ubuntu bootstrap

On a fresh Ubuntu/Vultr server, run:

	sudo bash scripts/deploy/bootstrap-user-web-on-ubuntu.sh /var/www/gentrx-user-web-app

This installs Node + PM2 + Nginx, builds the app, starts PM2 process `gentrx-main` on `:3000`, and validates Nginx.

### 6) Fully automated production deploy command

From this repository root:

	.\scripts\deploy\deploy_prod_149.ps1 -UsePasswordAuth 1 -SshPassword "<SERVER_PASSWORD>" -AutoBuildIfMissing 1

This command builds (if needed), packages, uploads, extracts, restarts PM2, reloads Nginx, and runs post-deploy checks.

Hash safety guard (enabled by default):
- compares deployed `dist/index.html` hash with Nginx host-route hash on server
- fails deployment when hashes differ

Optional flags:
- `-VerifyHost "gentrx.ph"`
- `-EnforceLocalHashMatch 1`
- `-CheckPublicHash 1`

## CI artifact build

GitHub Actions workflow [Build Dist Artifact](.github/workflows/dist-artifact.yml) now builds and uploads:
- Deployable tarball: `artifacts/gentrx-user-web-dist-*.tar.gz`
- Metadata files: `dist/version.json`, `dist/version-live.json`

Trigger via:
- push to `main`
- manual `workflow_dispatch`

## Release workflow (tag -> GitHub Release assets)

Workflow [Release Dist Bundle](.github/workflows/release-dist-bundle.yml) runs on tags matching `v*`.

Example:

git tag v1.0.0
git push origin v1.0.0

Release assets include:
- dist tarball (`artifacts/*.tar.gz`)
- SHA256 checksum (`artifacts/*.tar.gz.sha256`)
- metadata (`dist/version.json`, `dist/version-live.json`)

## One-command server deploy from GitHub Actions artifact

Script: [scripts/deploy/deploy-from-github-actions.sh](scripts/deploy/deploy-from-github-actions.sh)

Required token scope:
- `actions:read`
- `contents:read`

Example on server:

export GITHUB_TOKEN=<github_pat_with_actions_read>
sudo REPO=yomars/Gentrx-User-Web-App \
	WORKFLOW_FILE=dist-artifact.yml \
	ARTIFACT_NAME=gentrx-user-web-dist \
	BRANCH=main \
	DEPLOY_DIR=/var/www/gentrx-user-web-app \
	PM2_APP_NAME=gentrx-main \
	APP_PORT=3000 \
	bash scripts/deploy/deploy-from-github-actions.sh

The script performs in one run:
- download latest successful workflow artifact
- extract bundle to deployment directory
- PM2 restart
- Nginx config update + reload

