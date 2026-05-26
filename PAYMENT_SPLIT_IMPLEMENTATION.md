# Payment Split Implementation Guide

This document describes the implemented split-credit flow for appointment payments.

## Updated Backend Files

- [artifacts/hotfix_api/AppointmentController.php](artifacts/hotfix_api/AppointmentController.php)
- [artifacts/hotfix_api/PaymentController.php](artifacts/hotfix_api/PaymentController.php)

## What is Implemented

1. Atomic split crediting on paid flows:
- Doctor fee -> doctor wallet
- Clinic fee -> clinic wallet
- Pipe fee -> pipe wallet

2. Split credit transaction rows are stored in `wallet_transactions`.

3. Optional compatibility audit rows are stored in `all_transaction` when table/columns are present.

4. Idempotency guard prevents duplicate split-credit rows for the same appointment-leg.

## Flows Covered

### A) Appointment create flow (`add_appointment`) in AppointmentController

- Recomputes distribution server-side:
  - doctor fee
  - clinic fee
  - pipe fee
- Applies split credits when `payment_status` is `Paid`.

### B) Status update to paid (`updateStatusToPaid`) in AppointmentController

- Recomputes distribution from appointment type + doctor/clinic pricing.
- Applies split credits when status transitions to paid.

### C) Direct payment create (`add_payment`) in PaymentController

- Accepts split fields in payload.
- Applies split credits when `payment_status` is `Paid`.

### D) Wallet-first confirm flow (`confirm_schedule_wallet_payment`) in PaymentController

- Deducts patient wallet.
- Applies split credits in same DB transaction.

## Payload Fields for Split Credits

The following request fields are used by split logic:

- `doctor_fee`
- `clinic_fee`
- `pipe_fee`
- `doctor_wallet_owner_id`
- `clinic_wallet_owner_id`
- `pipe_wallet_owner_id`
- `payment_transaction_id` (reference for traceability)

Fallback owner resolution used:

- Doctor owner: `doctor_wallet_owner_id` then doctor id field
- Clinic owner: `clinic_wallet_owner_id` then clinic id field
- Pipe owner: `pipe_wallet_owner_id` then configuration lookup (`pipe_user_id`, `pipe_wallet_user_id`, `pipe_owner_user_id`, `pipe_owner_id`)

If Pipe owner config keys are missing, split logic now falls back to the most recent Pipe wallet owner discovered from historical Pipe split transactions/wallet rows.

Wallet owner_type mapping used by split credits:

- Doctor split -> `owner_type=doctor` with `owner_id=doctors.user_id`
- Clinic split -> `owner_type=clinic` with `owner_id=clinics.id`
- Pipe split -> `owner_type=user` with `owner_id=users.id` (resolved from pipe_* configuration)

## Database Prerequisites

`wallets` should support owner wallets:

- `owner_id` (required by split logic)
- `owner_type` (recommended)

`wallet_transactions` should have at least:

- `wallet_id`
- `amount`
- `type`
- `description`
- timestamps

Recommended additional columns for richer tracing:

- `appointment_id`
- `patient_id`
- `patient_code`
- `clinic_id`
- `user_id`
- `payment_transaction_id`

## Suggested Data Rules

1. Keep amounts non-negative.
2. Require owner id when split amount > 0.
3. Keep split sums aligned with your charged fee policy.

## Rollout Checklist

1. Deploy updated controller files to API server.
2. Ensure DB columns exist (see SQL in [scripts/sql/payment_split_verification.sql](scripts/sql/payment_split_verification.sql)).
3. Run one paid OPD booking in staging.
4. Verify balances and split transaction rows.
5. Run one unpaid->paid status update test.
6. Verify no duplicate split credits on retries.

## Notes

- Split operations are executed inside DB transactions in updated flows.
- If a split owner id is missing for a non-zero amount, the request fails fast with explicit error.
