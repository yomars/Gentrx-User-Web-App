#!/bin/bash
# Full city→clinic→doctor chain verification
PGPASSWORD='AVNS_mw0W8AXQ0as8lcq4CXk'
PSQL="psql -h vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com -p 16751 -U vultradmin -d defaultdb -t"

echo "=== ALL CITIES (any active value) ==="
$PSQL -c "SELECT id, title, active, latitude, longitude FROM cities ORDER BY id;"

echo ""
echo "=== CITIES active=1 (smallint) ==="
$PSQL -c "SELECT id, title FROM cities WHERE active=1 ORDER BY id;"

echo ""
echo "=== CITIES active=0 (inactive) - may need to be activated ==="
$PSQL -c "SELECT id, title, active FROM cities WHERE active!=1 ORDER BY id;"

echo ""
echo "=== FULL CITY -> CLINIC -> DOCTOR COUNT chain ==="
$PSQL -c "
SELECT 
  ci.id AS city_id,
  ci.title AS city_name,
  ci.active AS city_active,
  cl.id AS clinic_id,
  cl.title AS clinic_name,
  cl.active AS clinic_active,
  cl.is_active AS clinic_is_active,
  COUNT(d.id) AS doctor_count
FROM cities ci
LEFT JOIN clinics cl ON cl.city_id = ci.id
LEFT JOIN doctors d ON d.clinic_id = cl.id AND d.active = true
GROUP BY ci.id, ci.title, ci.active, cl.id, cl.title, cl.active, cl.is_active
ORDER BY ci.id, cl.id;
"

echo ""
echo "=== DOCTORS: how many total, per clinic_id ==="
$PSQL -c "
SELECT 
  d.clinic_id,
  cl.title AS clinic_name,
  cl.city_id,
  ci.title AS city_name,
  COUNT(d.id) AS total_doctors,
  SUM(CASE WHEN d.active = true THEN 1 ELSE 0 END) AS active_doctors
FROM doctors d
LEFT JOIN clinics cl ON cl.id = d.clinic_id
LEFT JOIN cities ci ON ci.id = cl.city_id
GROUP BY d.clinic_id, cl.title, cl.city_id, ci.title
ORDER BY d.clinic_id;
"

echo ""
echo "=== TEST get_doctor API per clinic_id (via api.gentrx.ph) ==="
for clinic_id in 3 4 5 6 7 8 17; do
  result=$(curl -sk "https://api.gentrx.ph/api/v1/get_doctor?active=1&clinic_id=${clinic_id}" 2>/dev/null)
  total=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d.get('doctors',[]))))" 2>/dev/null || echo "parse_error")
  echo "  clinic_id=${clinic_id}: doctors_returned=${total} | raw_keys=$(echo $result | python3 -c 'import sys,json; d=json.load(sys.stdin); print(list(d.keys()))' 2>/dev/null)"
done

echo ""
echo "=== TEST resolve_clinic per active city_id ==="
for city_id in $(psql -h vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com -p 16751 -U vultradmin -d defaultdb -t -c "SELECT id FROM cities ORDER BY id;" 2>/dev/null); do
  city_id=$(echo $city_id | tr -d ' |')
  [ -z "$city_id" ] && continue
  result=$(curl -sk "https://api.gentrx.ph/api/v1/resolve_clinic?city_id=${city_id}&guest=1")
  echo "  city_id=${city_id}: $result"
done

echo ""
echo "=== DONE ==="
