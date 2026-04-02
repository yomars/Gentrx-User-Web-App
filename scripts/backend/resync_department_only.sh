#!/usr/bin/env bash
set -euo pipefail

# Targeted resync for department images from legacy storage to block storage.
# Run on production server.

SRC="/opt/gentrx-api/storage/app/public/department"
DEST1="/mnt/gentrx/uploads/department"
DEST2="/mnt/gentrx/uploads/system"
APP_USER="www-data"
APP_GROUP="www-data"

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: Source not found: $SRC"
  exit 1
fi

mkdir -p "$DEST1" "$DEST2"

echo "[SYNC] $SRC -> $DEST1"
rsync -a "$SRC/" "$DEST1/"

echo "[MIRROR] $SRC -> $DEST2"
rsync -a --ignore-existing "$SRC/" "$DEST2/"

chown -R "$APP_USER:$APP_GROUP" /mnt/gentrx/uploads
chmod -R 750 /mnt/gentrx/uploads

echo "[COUNT] department=$(find "$DEST1" -type f | wc -l | tr -d ' ')"
echo "[COUNT] system=$(find "$DEST2" -type f | wc -l | tr -d ' ')"

echo "Done."
