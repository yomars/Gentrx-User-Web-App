-- Payment split verification and schema checks
-- Run on PostgreSQL

-- 1) Table availability
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'wallets',
    'wallet_transactions',
    'all_transaction',
    'appointments',
    'payments',
    'invoices',
    'transactions'
  )
ORDER BY table_name;

-- 2) wallets columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'wallets'
ORDER BY ordinal_position;

-- 2b) owner_type distribution (doctor/clinic/user are expected for split owners)
SELECT owner_type, COUNT(*) AS wallets_count
FROM wallets
GROUP BY owner_type
ORDER BY owner_type;

-- 3) wallet_transactions columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'wallet_transactions'
ORDER BY ordinal_position;

-- 4) Optional indexes (recommended)
-- CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(owner_type, owner_id);
-- CREATE INDEX IF NOT EXISTS idx_wallet_txn_appointment ON wallet_transactions(appointment_id);

-- 5) Verify split rows for one appointment
-- Replace :appointment_id with the real id
-- Example: WHERE appointment_id = 12345
SELECT id, wallet_id, appointment_id, amount, type, description, payment_transaction_id, created_at
FROM wallet_transactions
WHERE appointment_id = :appointment_id
  AND type = 'credit'
  AND description IN (
    'Split: Doctor fee credit',
    'Split: Clinic fee credit',
    'Split: Pipe fee credit'
  )
ORDER BY id;

-- 6) Verify owner wallet balances for that appointment via tx joins
SELECT
  wt.id,
  wt.wallet_id,
  w.owner_type,
  w.owner_id,
  wt.appointment_id,
  wt.amount,
  wt.description,
  w.balance AS current_balance,
  wt.created_at
FROM wallet_transactions wt
JOIN wallets w ON w.id = wt.wallet_id
WHERE wt.appointment_id = :appointment_id
  AND wt.type = 'credit'
  AND wt.description IN (
    'Split: Doctor fee credit',
    'Split: Clinic fee credit',
    'Split: Pipe fee credit'
  )
ORDER BY wt.id;

-- 7) Optional compatibility ledger checks
SELECT id, appointment_id, amount, transaction_type, notes, payment_transaction_id, created_at
FROM all_transaction
WHERE appointment_id = :appointment_id
  AND transaction_type = 'Credited'
ORDER BY id;

-- 8) Duplicate detection safety check (should be 0 rows ideally)
SELECT appointment_id, wallet_id, description, COUNT(*) AS cnt
FROM wallet_transactions
WHERE type = 'credit'
  AND description IN (
    'Split: Doctor fee credit',
    'Split: Clinic fee credit',
    'Split: Pipe fee credit'
  )
GROUP BY appointment_id, wallet_id, description
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
