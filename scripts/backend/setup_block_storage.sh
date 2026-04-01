#!/usr/bin/env bash
# =============================================================================
# Gentrx Production Block Storage Setup
# Run as root (or sudo) on production server: 149.28.145.80
# Block storage is already mounted at /mnt/
#
# Usage:
#   chmod +x setup_block_storage.sh
#   sudo ./setup_block_storage.sh
# =============================================================================
set -euo pipefail

MOUNT_POINT="/mnt"
STORAGE_ROOT="${MOUNT_POINT}/gentrx"
APP_USER="www-data"
APP_GROUP="www-data"

# ---------------------------------------------------------------------------
# 1. Verify block volume is mounted
# ---------------------------------------------------------------------------
echo "[1/6] Verifying block storage mount at ${MOUNT_POINT}..."

if ! mountpoint -q "${MOUNT_POINT}"; then
    echo "ERROR: ${MOUNT_POINT} is not a mounted volume."
    echo "       Attach the block volume in Vultr console and mount it first."
    echo "       Then add to /etc/fstab:  /dev/vdb  /mnt  ext4  defaults,nofail,noatime  0  2"
    exit 1
fi

BLOCK_DEVICE=$(df -h "${MOUNT_POINT}" | awk 'NR==2{print $1}')
AVAILABLE=$(df -h "${MOUNT_POINT}" | awk 'NR==2{print $4}')
echo "    Device  : ${BLOCK_DEVICE}"
echo "    Available: ${AVAILABLE}"

# ---------------------------------------------------------------------------
# 2. Ensure fstab entry has nofail (warn only, don't break if already set)
# ---------------------------------------------------------------------------
echo "[2/6] Checking /etc/fstab for nofail option..."

if grep -q "${MOUNT_POINT}" /etc/fstab; then
    if ! grep "${MOUNT_POINT}" /etc/fstab | grep -q "nofail"; then
        echo "    WARNING: fstab entry for ${MOUNT_POINT} does not have 'nofail'."
        echo "             Edit /etc/fstab manually to add: defaults,nofail,noatime"
    else
        echo "    OK: fstab entry has nofail."
    fi
else
    echo "    WARNING: No fstab entry found for ${MOUNT_POINT}."
    echo "             Add:  ${BLOCK_DEVICE}  ${MOUNT_POINT}  ext4  defaults,nofail,noatime  0  2"
fi

# ---------------------------------------------------------------------------
# 3. Create directory structure
# ---------------------------------------------------------------------------
echo "[3/6] Creating directory structure under ${STORAGE_ROOT}..."

declare -a DIRS=(
    "${STORAGE_ROOT}/uploads/doctors"
    "${STORAGE_ROOT}/uploads/clients"
    "${STORAGE_ROOT}/uploads/patients"
    "${STORAGE_ROOT}/uploads/system"
    "${STORAGE_ROOT}/uploads/tmp"
    "${STORAGE_ROOT}/quarantine"
)

for DIR in "${DIRS[@]}"; do
    if [ ! -d "${DIR}" ]; then
        mkdir -p "${DIR}"
        echo "    Created: ${DIR}"
    else
        echo "    Exists:  ${DIR}"
    fi
done

# ---------------------------------------------------------------------------
# 4. Set ownership and permissions
# ---------------------------------------------------------------------------
echo "[4/6] Setting ownership (${APP_USER}:${APP_GROUP}) and permissions..."

chown -R "${APP_USER}:${APP_GROUP}" "${STORAGE_ROOT}"

# Uploads: owner full, group read/exec, others none
chmod -R 750 "${STORAGE_ROOT}/uploads"

# Quarantine: owner only (no group read)
chmod 700 "${STORAGE_ROOT}/quarantine"

# Tmp: owner full
chmod 750 "${STORAGE_ROOT}/uploads/tmp"

echo "    Done."

# ---------------------------------------------------------------------------
# 5. Migrate existing Laravel storage files (non-destructive copy)
# ---------------------------------------------------------------------------
LARAVEL_STORAGE="/opt/gentrx-api/storage/app/public"
echo "[5/6] Checking for existing Laravel storage files to migrate..."

declare -A LEGACY_MAP=(
    ["users"]="clients"
    ["doctors/signatures"]="doctors"
    ["clinics"]="system"
    ["department"]="system"
    ["specialization"]="system"
)

MIGRATED=0

if [ -d "${LARAVEL_STORAGE}" ]; then
    for SRC_REL in "${!LEGACY_MAP[@]}"; do
        SRC="${LARAVEL_STORAGE}/${SRC_REL}"
        DEST_SUBDIR="${LEGACY_MAP[$SRC_REL]}"
        DEST="${STORAGE_ROOT}/uploads/${DEST_SUBDIR}"

        if [ -d "${SRC}" ]; then
            echo "    Migrating: ${SRC} -> ${DEST}/"
            # rsync preserves timestamps, skips unchanged files
            rsync -a --ignore-existing "${SRC}/" "${DEST}/" && MIGRATED=$((MIGRATED + 1))
        fi
    done

    if [ "${MIGRATED}" -eq 0 ]; then
        echo "    No existing files found to migrate."
    else
        echo "    Migration complete (${MIGRATED} directories synced)."
        echo "    NOTE: Original files in ${LARAVEL_STORAGE} were NOT deleted."
        echo "          Verify new paths serve correctly before removing old files."
    fi
else
    echo "    ${LARAVEL_STORAGE} not found — skipping legacy migration."
fi

# ---------------------------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------------------------
echo ""
echo "[6/6] Final layout:"
find "${STORAGE_ROOT}" -maxdepth 3 -type d | sort | sed 's|'"${STORAGE_ROOT}"'|  /mnt/gentrx|'

echo ""
echo "================================================================"
echo "Block storage setup complete."
echo ""
echo "Next steps:"
echo "  1. Copy scripts/backend/nginx/storage.conf to:"
echo "       /etc/nginx/conf.d/gentrx-storage.conf"
echo "     then: nginx -t && systemctl reload nginx"
echo ""
echo "  2. Add env vars to /opt/gentrx-api/.env:"
echo "       FILESYSTEM_DISK=block_storage"
echo "       BLOCK_STORAGE_ROOT=/mnt/gentrx/uploads"
echo "       BLOCK_STORAGE_URL=https://api.gentrx.ph/storage"
echo ""
echo "  3. Deploy FileUploadService to /opt/gentrx-api/app/Services/"
echo ""
echo "  4. Run DB migration:"
echo "       cd /opt/gentrx-api && php artisan migrate"
echo "================================================================"
