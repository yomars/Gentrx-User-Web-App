#!/usr/bin/env bash
set -euo pipefail

# Sync legacy Laravel public storage to block storage layout.
# Safe by default: non-destructive copy, keeps source files untouched.
#
# Usage:
#   sudo bash scripts/backend/sync_legacy_to_block_storage.sh
#   DRY_RUN=1 sudo bash scripts/backend/sync_legacy_to_block_storage.sh

LEGACY_ROOT="/opt/gentrx-api/storage/app/public"
BLOCK_ROOT="/mnt/gentrx/uploads"
APP_USER="www-data"
APP_GROUP="www-data"

DRY_RUN="${DRY_RUN:-0}"
RSYNC_FLAGS="-a --ignore-existing"
if [[ "$DRY_RUN" == "1" ]]; then
  RSYNC_FLAGS="-anv --ignore-existing"
fi

declare -A MAP=(
  ["users"]="users"
  ["doctors/signatures"]="doctors/signatures"
  ["clinics"]="clinics"
  ["department"]="department"
  ["specialization"]="specialization"
)

# Optional mirrors for future canonical prefixes; kept non-destructive.
declare -A MIRROR_MAP=(
  ["users"]="clients"
  ["doctors/signatures"]="doctors"
  ["clinics"]="system"
  ["department"]="system"
  ["specialization"]="system"
)

require_dir() {
  local d="$1"
  if [[ ! -d "$d" ]]; then
    echo "ERROR: Missing directory: $d" >&2
    exit 1
  fi
}

echo "=== Legacy -> Block Storage Sync ==="
echo "LEGACY_ROOT=$LEGACY_ROOT"
echo "BLOCK_ROOT=$BLOCK_ROOT"
echo "DRY_RUN=$DRY_RUN"

require_dir "$LEGACY_ROOT"
require_dir "/mnt/gentrx"

mkdir -p \
  "$BLOCK_ROOT/doctors/signatures" \
  "$BLOCK_ROOT/users" \
  "$BLOCK_ROOT/clinics" \
  "$BLOCK_ROOT/department" \
  "$BLOCK_ROOT/specialization" \
  "$BLOCK_ROOT/clients" \
  "$BLOCK_ROOT/system" \
  "$BLOCK_ROOT/patients" \
  "$BLOCK_ROOT/tmp"

SYNCED=0
SKIPPED=0

for SRC_REL in "${!MAP[@]}"; do
  SRC="$LEGACY_ROOT/$SRC_REL"
  DEST="$BLOCK_ROOT/${MAP[$SRC_REL]}"

  if [[ ! -d "$SRC" ]]; then
    echo "[SKIP] Missing source: $SRC"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "[SYNC] $SRC -> $DEST"
  rsync $RSYNC_FLAGS "$SRC/" "$DEST/"

  # Also mirror into canonical folders for eventual DB prefix normalization.
  MIRROR_DEST="$BLOCK_ROOT/${MIRROR_MAP[$SRC_REL]}"
  if [[ "$MIRROR_DEST" != "$DEST" ]]; then
    echo "[MIRROR] $SRC -> $MIRROR_DEST"
    rsync $RSYNC_FLAGS "$SRC/" "$MIRROR_DEST/"
  fi

  SYNCED=$((SYNCED + 1))
done

if [[ "$DRY_RUN" != "1" ]]; then
  chown -R "$APP_USER:$APP_GROUP" /mnt/gentrx
  chmod -R 750 "$BLOCK_ROOT"
  chmod 700 /mnt/gentrx/quarantine 2>/dev/null || true
fi

echo ""
echo "Summary: synced=$SYNCED skipped=$SKIPPED dry_run=$DRY_RUN"
echo "Counts:"
for dir in users clinics department specialization doctors/signatures clients system; do
  count=$(find "$BLOCK_ROOT/$dir" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "  $dir: $count files"
done

echo "Done."
