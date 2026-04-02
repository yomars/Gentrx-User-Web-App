-- PostgreSQL: Disable Razorpay Payment Gateway
-- This script disables Razorpay so wallet add money can proceed with other payment methods

UPDATE payment_gateway SET is_active = FALSE WHERE title = 'Razorpay';

-- Verify the change
SELECT id, title, is_active, updated_at FROM payment_gateway WHERE title = 'Razorpay';

-- Alternative: If you need to re-enable Razorpay later, run:
-- UPDATE payment_gateway SET is_active = TRUE WHERE title = 'Razorpay';
