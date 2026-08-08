set -e
cd /var/www/gentrx-admin/vultr-backend
stamp=$(date +%Y%m%d-%H%M%S)
cp src/server.js src/server.js.bak.readsafe-$stamp
perl -0pi -e 's/async function listCountries\(\) \{\s*await ensureLocationSchema\(\);/async function listCountries() {/; s/async function listStates\(\) \{\s*await ensureLocationSchema\(\);/async function listStates() {/; s/async function listCities\(\) \{\s*await ensureLocationSchema\(\);/async function listCities() {/;' src/server.js
grep -nE 'async function listCountries|async function listStates|async function listCities|await ensureLocationSchema\(\);' src/server.js | head -n 20
pm2 restart gentrx-admin-backend --update-env