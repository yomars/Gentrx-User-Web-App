#!/bin/bash
export PGPASSWORD='AVNS_mw0W8AXQ0as8lcq4CXk'
PG="psql -h vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com -p 16751 -U vultradmin -d defaultdb --no-password"

echo "=== CITIES (active) ==="
$PG -c "SELECT id, title FROM cities WHERE active=true ORDER BY id;"

echo ""
echo "=== CITY -> CLINIC mapping ==="
$PG -c "SELECT c.id as city_id, c.title as city_name, cl.id as clinic_id, cl.title as clinic_name, cl.active, cl.is_active FROM cities c LEFT JOIN clinics cl ON cl.city_id = c.id WHERE c.active=true ORDER BY c.id;"

echo ""
echo "=== CLINICS with no city_id ==="
$PG -c "SELECT id, title, city_id, active, is_active FROM clinics WHERE city_id IS NULL ORDER BY id;"

echo ""
echo "=== CLINICS columns ==="
$PG -c "\d clinics" 2>/dev/null || $PG -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='clinics' ORDER BY ordinal_position;"

echo ""
echo "=== resolve_clinic test: what clinic_id resolves for each active city? ==="
$PG -c "SELECT c.id as city_id, c.title as city_name, cl.id as resolved_clinic_id, cl.title as clinic_name FROM cities c JOIN clinics cl ON cl.city_id = c.id WHERE c.active=true AND cl.active=true AND cl.is_active=true ORDER BY c.id;"

echo ""
echo "=== Check if get_doctor proxies to hs-mcgi.org and what clinic_id param it uses ==="
echo "Testing resolve_clinic API endpoint for first 3 active cities:"
# Get city IDs
CITY_IDS=$($PG -t -c "SELECT id FROM cities WHERE active=true ORDER BY id LIMIT 3;")
for cid in $CITY_IDS; do
  cid=$(echo $cid | tr -d ' ')
  echo ""
  echo "--- City ID: $cid ---"
  curl -sk "http://localhost:3000/api/v1/resolve_clinic?guest=1&latitude=0&longitude=0" 2>/dev/null | head -200 || true
done

echo ""
echo "=== Test resolve_clinic with actual city coordinates ==="
$PG -c "SELECT c.id as city_id, c.title, c.latitude, c.longitude FROM cities c WHERE c.active=true AND c.latitude IS NOT NULL LIMIT 5;"

echo ""
echo "=== Clinics table: do clinics have lat/lng for nearest resolution? ==="
$PG -c "SELECT id, title, city_id, latitude, longitude, active, is_active FROM clinics WHERE active=true AND is_active=true ORDER BY id LIMIT 20;"
