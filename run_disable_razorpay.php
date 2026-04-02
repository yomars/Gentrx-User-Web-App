<?php
try {
    $pdo = new PDO(
        'pgsql:host=vultr-prod-e642864a-28ad-481e-bd7c-1a6ae8d5e3f5-vultr-prod-da27.vultrdb.com;port=16751;dbname=defaultdb;sslmode=require',
        'vultradmin',
        'AVNS_mw0W8AXQ0as8lcq4CXk',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "[OK] Connected to VultrDB\n";

    $rows = $pdo->exec("UPDATE payment_gateway SET is_active = 0 WHERE title = 'Razorpay'");
    echo "[OK] Rows updated: " . $rows . "\n";

    $stmt = $pdo->query("SELECT id, title, is_active FROM payment_gateway WHERE title = 'Razorpay'");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "[VERIFY] id={$row['id']} title={$row['title']} is_active={$row['is_active']}\n";

    if ((int)$row['is_active'] === 0) {
        echo "[SUCCESS] Razorpay is now DISABLED\n";
    } else {
        echo "[WARN] is_active is still {$row['is_active']} — check manually\n";
    }
} catch (Exception $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
    exit(1);
}
