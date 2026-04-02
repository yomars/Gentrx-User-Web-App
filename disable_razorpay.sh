#!/bin/bash

# PostgreSQL Razorpay Disable Script for VultrDB
# Usage: ./disable_razorpay.sh -h "your-db.vultrdb.com" -d "your_db" -u "postgres" -p "password"

set -e

HOST=""
PORT="5432"
DATABASE=""
USER=""
PASSWORD=""

while getopts "h:P:d:u:p:" opt; do
  case $opt in
    h) HOST="$OPTARG" ;;
    P) PORT="$OPTARG" ;;
    d) DATABASE="$OPTARG" ;;
    u) USER="$OPTARG" ;;
    p) PASSWORD="$OPTARG" ;;
    *) echo "Usage: $0 -h HOST -d DATABASE -u USER -p PASSWORD [-P PORT]"; exit 1 ;;
  esac
done

if [ -z "$HOST" ] || [ -z "$DATABASE" ] || [ -z "$USER" ] || [ -z "$PASSWORD" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 -h HOST -d DATABASE -u USER -p PASSWORD [-P PORT]"
  exit 1
fi

echo "=== PostgreSQL Razorpay Disable Script ==="
echo "Connecting to: $HOST:$PORT / $DATABASE"
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
