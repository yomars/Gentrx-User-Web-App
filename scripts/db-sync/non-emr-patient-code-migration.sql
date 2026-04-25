-- Synced from Gentrx-Admin-Web-App-Vultr on 2026-04-24
-- Source of truth: scripts/sql/non-emr-patient-code-migration.sql (admin repo)
-- Tables migrated: appointments, ratings, invoices, payments, transactions, wallets, wallet_transactions

-- Execute this script from the admin/backend migration pipeline so all clients stay aligned.
-- Keeping this file here ensures frontend repo migration parity and deployment traceability.

\echo 'Use the migration in Gentrx-Admin-Web-App-Vultr/scripts/sql/non-emr-patient-code-migration.sql'
