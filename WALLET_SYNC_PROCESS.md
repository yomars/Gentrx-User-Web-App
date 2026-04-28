# Wallet Sync Process (User Web)

## Required Payload Contract

All wallet-related requests must send:

- patient_code
- owner_id
- owner_type = patient
- transaction_reference (for idempotent mutation calls)

## Read Path

- Prefer patient_code-based transaction lookup.
- Fall back to legacy user_id lookup only for compatibility.

## Mutation Paths Covered

- Add wallet money (manual and payment-return finalization)
- Balance transfer payloads include patient ownership identity

## Stripe Return Finalization

- Use pending topup state from storage.
- Finalization request must include patient_code, owner_id, owner_type, transaction_reference.
- On success: invalidate wallet/user queries and clear pending state.

## Smoke Checklist

1. Top up wallet once -> balance increases once.
2. Retry same transaction_reference -> no duplicate credit.
3. Wallet history loads by patient_code path.
4. Balance transfer request includes owner mapping fields.
