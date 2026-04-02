#!/usr/bin/env bash
set -euo pipefail

SRC="/mnt/gentrx/uploads/department/2024-01-11-65a01d934267d.png"
TARGET_DIR="/mnt/gentrx/uploads/department"

FILES=(
  "2026-02-01-697f02004615d.png"
  "2026-02-01-697f0220e374c.png"
  "2026-02-01-697f02309b756.png"
  "2026-02-01-697f023d9cb7a.png"
  "2026-02-01-697f024c24d54.png"
)

if [[ ! -f "$SRC" ]]; then
  echo "Missing source fallback image: $SRC"
  exit 1
fi

for f in "${FILES[@]}"; do
  dst="$TARGET_DIR/$f"
  if [[ -f "$dst" ]]; then
    echo "exists $dst"
  else
    cp "$SRC" "$dst"
    chown www-data:www-data "$dst"
    chmod 750 "$dst"
    echo "created $dst"
  fi
done

echo "Done."
