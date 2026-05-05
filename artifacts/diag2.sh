#!/bin/bash
export PGPASSWORD='AVNS_mw0W8AXQ0as8lcq4CXk'
PG="psql -h vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com -p 16751 -U vultradmin -d defaultdb --no-password"

echo "=== CITIES (active=1, smallint) ==="
$PG -c "SELECT id, title, latitude, longitude FROM cities WHERE active=1 ORDER BY id;"

echo ""
echo "=== CITY -> CLINIC mapping (active=1 smallint) ==="
$PG -c "SELECT c.id as city_id, c.title as city_name, cl.id as clinic_id, cl.title as clinic_name, cl.latitude, cl.longitude FROM cities c LEFT JOIN clinics cl ON cl.city_id = c.id WHERE c.active=1 ORDER BY c.id, cl.id;"

echo ""
echo "=== ALL ACTIVE CLINICS with city info ==="
$PG -c "SELECT cl.id, cl.title as clinic_name, cl.city_id, c.title as city_name, cl.latitude, cl.longitude, cl.active, cl.is_active FROM clinics cl LEFT JOIN cities c ON c.id = cl.city_id WHERE cl.active=true AND cl.is_active=true ORDER BY cl.id;"

echo ""
echo "=== GLOBAL_DEFAULT_CLINIC_ID from env ==="
grep GLOBAL_DEFAULT_CLINIC_ID /var/www/gentrx-api/.env 2>/dev/null || echo "NOT SET"

echo ""
echo "=== gentrx-emr-backend: what port and app? ==="
pm2 show 3 2>/dev/null | grep -E "script path|port|exec mode|pm_exec_path|cwd" | head -20

echo ""
echo "=== What port does emr-backend listen on? ==="
ss -tlnp 2>/dev/null | grep -E "3000|8000|8080|9000|3001|5000" | head -20

echo ""
echo "=== Test emr-backend get_doctor endpoint ==="
curl -sk http://localhost:3000/api/v1/get_doctor?active=1 2>/dev/null | head -c 300 || echo "port 3000 failed"
curl -sk http://localhost:8000/api/v1/get_doctor?active=1 2>/dev/null | head -c 300 || echo "port 8000 failed"

echo ""
echo "=== Check emr-backend .env for port ==="
find /var/www -name ".env" 2>/dev/null | grep -v gentrx-api | head -5 | while read f; do
  echo "--- $f ---"
  grep -E "^APP_URL|^PORT" "$f" 2>/dev/null | head -5
done

echo ""
echo "=== Sample doctors from DB: what fields? ==="
$PG -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='doctors' ORDER BY ordinal_position LIMIT 20;"

echo ""
echo "=== Count doctors per clinic ==="
$PG -c "SELECT d.clinic_id, cl.title as clinic_name, cl.city_id, COUNT(d.id) as doctor_count FROM doctors d LEFT JOIN clinics cl ON cl.id = d.clinic_id GROUP BY d.clinic_id, cl.title, cl.city_id ORDER BY d.clinic_id;"
