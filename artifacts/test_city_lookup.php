<?php
// Quick test: run from /var/www/gentrx-api as: php artisan tinker --execute="require '/tmp/test_city_lookup.php';"
use Illuminate\Support\Facades\DB;

echo "=== Testing city_id=7 lookup ===\n";
$rows = DB::table('clinics AS c')
    ->leftJoin('cities AS ci', 'ci.id', '=', 'c.city_id')
    ->where('c.city_id', 7)
    ->where('c.active', true)
    ->where('c.is_active', true)
    ->select(['c.id AS clinic_id', 'c.title AS clinic_title', 'c.city_id'])
    ->get();
echo "Rows found: " . count($rows) . "\n";
foreach ($rows as $r) {
    echo "  clinic_id={$r->clinic_id}, title={$r->clinic_title}, city_id={$r->city_id}\n";
}

echo "\n=== Testing with doctor count (groupBy) ===\n";
$result = DB::table('clinics AS c')
    ->leftJoin('cities AS ci', 'ci.id', '=', 'c.city_id')
    ->leftJoin('doctors AS d', function ($join) {
        $join->on('d.clinic_id', '=', 'c.id')
             ->where('d.active', true);
    })
    ->select([
        'c.id AS clinic_id',
        'c.title AS clinic_title',
        'c.city_id',
        DB::raw("ci.title AS city_title"),
        DB::raw("COUNT(d.id) AS doctor_count"),
    ])
    ->where('c.city_id', 7)
    ->where('c.active', true)
    ->where('c.is_active', true)
    ->groupBy('c.id', 'c.title', 'c.city_id', 'ci.title')
    ->orderByDesc('doctor_count')
    ->orderBy('c.id')
    ->first();
echo "Best clinic: " . json_encode($result) . "\n";

echo "\n=== Testing city_id=1 (Manila) ===\n";
$result1 = DB::table('clinics AS c')
    ->where('c.city_id', 1)
    ->where('c.active', true)
    ->where('c.is_active', true)
    ->select(['c.id AS clinic_id', 'c.title AS clinic_title'])
    ->get();
foreach ($result1 as $r) {
    echo "  clinic_id={$r->clinic_id}, title={$r->clinic_title}\n";
}

echo "\n=== Check validator passes city_id=7 as integer ===\n";
$val = \Illuminate\Support\Facades\Validator::make(['city_id' => '7'], ['city_id' => ['nullable', 'integer', 'min:1']]);
echo "Validator fails: " . ($val->fails() ? 'YES - ' . json_encode($val->errors()->all()) : 'NO') . "\n";
echo "(int)'7' = " . ((int)'7') . "\n";
echo "null check: " . ('7' !== null ? 'not null' : 'null') . "\n";
echo "branch condition: city_id=7, > 0: " . (7 > 0 ? 'true' : 'false') . "\n";
