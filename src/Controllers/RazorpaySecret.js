// Only the publishable key ID belongs in frontend code.
// Set VITE_RAZORPAY_KEY_ID in your Vercel environment variables.
// NEVER put the Razorpay secret key here — it must only exist on the server.
export const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID ?? "";
