#!/bin/bash

# PostgreSQL Razorpay Disable Script for VultrDB
# Pre-filled with your credentials
# Usage: ./disable_razorpay_custom.sh

set -e

# Your VultrDB Credentials (CUSTOMIZED)
HOST="vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com"
PORT="16751"
DATABASE="defaultdb"
USER="vultradmin"
PASSWORD="AVNS_mw0W8AXQ0as8lcq4CXk"

echo "=== PostgreSQL Razorpay Disable Script ==="
echo "Connecting to: $HOST:$PORT / $DATABASE"
echo "User: $USER"
echo ""

# Set PostgreSQL password variable
export PGPASSWORD="$PASSWORD"

# Disable Razorpay
echo "[ACTION] Disabling Razorpay..."
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DATABASE" -c "UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';"

# Verify the change
echo ""
echo "[VERIFY] Current Razorpay status:"
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DATABASE" -c "SELECT id, title, is_active, updated_at FROM payment_gateway WHERE title = 'Razorpay';"

echo ""
echo "[SUCCESS] Razorpay has been disabled"
