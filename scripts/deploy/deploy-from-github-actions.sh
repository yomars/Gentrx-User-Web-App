#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-yomars/Gentrx-User-Web-App}"
WORKFLOW_FILE="${WORKFLOW_FILE:-dist-artifact.yml}"
ARTIFACT_NAME="${ARTIFACT_NAME:-gentrx-user-web-dist}"
BRANCH="${BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/gentrx-user-web}"
PM2_APP_NAME="${PM2_APP_NAME:-gentrx-user-web}"
SITE_NAME="${SITE_NAME:-gentrx-user-web}"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN is required (must have actions:read and contents:read)."
  exit 1
fi

log() {
  printf '[deploy-from-github-actions] %s\n' "$1"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

install_prereqs_if_possible() {
  local missing=()
  for cmd in curl jq unzip tar pm2 nginx systemctl; do
    if ! need_cmd "$cmd"; then
      missing+=("$cmd")
    fi
  done

  if [[ ${#missing[@]} -eq 0 ]]; then
    return
  fi

  log "Missing commands: ${missing[*]}"

  if need_cmd apt-get && [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    log "Installing missing prerequisites via apt-get"
    apt-get update
    apt-get install -y curl jq unzip tar nginx
    return
  fi

  echo "ERROR: Missing required commands and unable to auto-install."
  echo "Install these first: ${missing[*]}"
  exit 1
}

api_get() {
  local url="$1"
  curl -fsSL \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "$url"
}

install_prereqs_if_possible

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "Resolving latest successful workflow run"
RUNS_JSON="$(api_get "https://api.github.com/repos/$REPO/actions/workflows/$WORKFLOW_FILE/runs?branch=$BRANCH&status=success&per_page=1")"
RUN_ID="$(echo "$RUNS_JSON" | jq -r '.workflow_runs[0].id // empty')"

if [[ -z "$RUN_ID" ]]; then
  echo "ERROR: Could not find a successful run for workflow $WORKFLOW_FILE on branch $BRANCH"
  exit 1
fi

log "Found run id: $RUN_ID"

ARTIFACTS_JSON="$(api_get "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts")"
ARTIFACT_URL="$(echo "$ARTIFACTS_JSON" | jq -r --arg NAME "$ARTIFACT_NAME" '.artifacts[] | select(.name == $NAME and .expired == false) | .archive_download_url' | head -n 1)"

if [[ -z "$ARTIFACT_URL" ]]; then
  echo "ERROR: Artifact $ARTIFACT_NAME not found (or expired) in run $RUN_ID"
  exit 1
fi

ZIP_PATH="$TMP_DIR/artifact.zip"
EXTRACT_DIR="$TMP_DIR/extracted"
mkdir -p "$EXTRACT_DIR"

log "Downloading artifact: $ARTIFACT_NAME"
curl -fsSL -L \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "$ARTIFACT_URL" \
  -o "$ZIP_PATH"

log "Extracting artifact zip"
unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"

BUNDLE_PATH="$(find "$EXTRACT_DIR" -type f -name '*.tar.gz' | head -n 1)"
if [[ -z "$BUNDLE_PATH" ]]; then
  echo "ERROR: No .tar.gz bundle found inside downloaded artifact"
  exit 1
fi

log "Deploying bundle: $(basename "$BUNDLE_PATH")"
mkdir -p "$DEPLOY_DIR"
tar -xzf "$BUNDLE_PATH" -C "$DEPLOY_DIR"

if [[ ! -f "$DEPLOY_DIR/scripts/deploy/ecosystem.user-web.cjs" ]]; then
  echo "ERROR: Missing PM2 ecosystem file after extract"
  exit 1
fi

if [[ ! -f "$DEPLOY_DIR/scripts/deploy/gentrx-user-web.nginx.conf" ]]; then
  echo "ERROR: Missing Nginx config after extract"
  exit 1
fi

log "Restarting PM2 app"
pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1 || pm2 start "$DEPLOY_DIR/scripts/deploy/ecosystem.user-web.cjs"
pm2 restart "$PM2_APP_NAME"
pm2 save

NGINX_TARGET="/etc/nginx/sites-available/${SITE_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}.conf"

log "Updating Nginx site config"
cp "$DEPLOY_DIR/scripts/deploy/gentrx-user-web.nginx.conf" "$NGINX_TARGET"
ln -sfn "$NGINX_TARGET" "$NGINX_ENABLED"

log "Validating and reloading Nginx"
nginx -t
systemctl reload nginx

log "Deployment completed successfully"
log "Health checks:"
log "- curl -I http://127.0.0.1:4000/"
log "- curl -I https://www.gentrx.ph/"
