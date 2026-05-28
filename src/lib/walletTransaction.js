/**
 * Wallet transaction helpers — mobile parity for GentRx web.
 *
 * These are pure functions so they can be unit-tested without any DOM or
 * React context.
 */

// ─── Type normalization ──────────────────────────────────────────────────────

const CREDIT_ALIASES = new Set([
  "credited",
  "credit",
  "topup",
  "top_up",
  "cash_in",
  "cashin",
]);

const DEBIT_ALIASES = new Set([
  "debited",
  "debit",
  "spent",
  "cash_out",
  "cashout",
  "balance_transfer",
  "appointment_charge",
  "appointment_payment",
  "deduction",
  "withdrawal",
]);

/**
 * Normalise a raw `type` or `transaction_type` string from the API to one of
 * the canonical values: `"Credited"` | `"Debited"` | `"Unknown"`.
 */
export function normalizeType(raw) {
  if (!raw) return "Unknown";
  const key = String(raw).toLowerCase().trim();
  if (CREDIT_ALIASES.has(key)) return "Credited";
  if (DEBIT_ALIASES.has(key)) return "Debited";
  return "Unknown";
}

// ─── Received balance-transfer override ────────────────────────────────────

/**
 * Returns true when a `balance_transfer` row is an *incoming* transfer to this
 * patient (should be Credited). The backend emits `type=balance_transfer` for
 * BOTH sender and receiver, so we detect direction from the notes text:
 * the backend prefixes received-transfer notes with "Transfer from …".
 */
export function isReceivedBalanceTransfer(rawTypeStr, raw) {
  if (rawTypeStr !== "balance_transfer") return false;
  const text = [
    raw.notes,
    raw.description,
    raw.reason,
    raw.invoice_description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return text.startsWith("transfer from") || /\breceived\b/.test(text);
}

// ─── Fee-row override ────────────────────────────────────────────────────────

const FEE_PRINCIPALS = ["doctor", "clinic", "pipe"];

/**
 * Returns `true` when a row that the backend has labelled "Credited" should
 * actually be treated as "Debited" because it is an outgoing fee charge
 * (Doctors Fee, Clinics Fee, Pipe Fee).
 *
 * Rule: type is Credited AND appointment_id > 0 AND the combined text of
 * notes / description / invoice_description / reason contains the word "fee"
 * AND one of "doctor" | "clinic" | "pipe".
 */
export function isMislabelledFeeRow(normalizedType, appointmentId, raw) {
  if (normalizedType !== "Credited") return false;
  if (!appointmentId || appointmentId <= 0) return false;

  const text = [
    raw.notes,
    raw.description,
    raw.invoice_description,
    raw.reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text.includes("fee")) return false;
  return FEE_PRINCIPALS.some((p) => text.includes(p));
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

/**
 * Map a raw API transaction row to the canonical wallet transaction model used
 * by the web UI.
 *
 * @param {object} raw - Raw row from `get_all_transaction` API response.
 * @returns {WalletTransaction}
 */
export function mapTransactionRow(raw) {
  if (!raw || typeof raw !== "object") return null;

  const amount = parseFloat(raw.amount) || 0;
  const appointmentId = parseInt(raw.appointment_id, 10) || 0;

  const rawType = raw.transaction_type || raw.type || "";
  const rawTypeStr = rawType.toLowerCase().trim();
  let type = normalizeType(rawType);

  // Received balance transfers arrive as type=balance_transfer but are credits
  if (type === "Debited" && isReceivedBalanceTransfer(rawTypeStr, raw)) {
    type = "Credited";
  }

  if (isMislabelledFeeRow(type, appointmentId, raw)) {
    type = "Debited";
  }

  const notes =
    raw.notes ||
    raw.description ||
    raw.reason ||
    raw.invoice_description ||
    null;

  const paymentTransactionId =
    raw.payment_transaction_id ||
    raw.transaction_id ||
    raw.reference ||
    null;

  return {
    id: raw.id ?? null,
    patientId: raw.patient_id ?? null,
    appointmentId,
    patientCode: raw.patient_code ?? null,
    ownerId: raw.owner_id ?? null,
    ownerType: raw.owner_type ?? null,
    amount,
    type,
    createdAt: raw.created_at ?? null,
    notes,
    paymentTransactionId,
  };
}

// ─── Display helpers ─────────────────────────────────────────────────────────

/**
 * Return the human-readable description for a mapped transaction row.
 */
export function getTransactionDescription(tx) {
  if (tx.notes) return tx.notes;
  if (tx.type === "Credited") return "Amount credited to your wallet";
  if (tx.appointmentId > 0) return "Appointment payment debited from your wallet";
  return "Amount debited from your wallet";
}

/**
 * Format an amount as a peso string with 2 decimal places.
 * e.g.  1234.5  →  "₱ 1,234.50"
 */
export function formatPesoAmount(value) {
  const n = parseFloat(value) || 0;
  return `₱ ${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date string/value using the mobile display intent:
 *   dd MMM yy hh:mm a  →  e.g. "14 Apr 26 02:30 pm"
 * Returns "--" for null / undefined / invalid dates.
 */
export function formatTransactionDate(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--";

  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-PH", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  const hour = d.getHours() % 12 || 12;
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() < 12 ? "AM" : "PM";

  return `${day} ${month} ${year} ${String(hour).padStart(2, "0")}:${minute} ${ampm}`;
}
